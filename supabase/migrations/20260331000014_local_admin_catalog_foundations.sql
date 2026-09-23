create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.product_categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_categories_name_not_blank check (length(trim(name)) > 0),
  constraint product_categories_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  event_type text not null default 'adjustment',
  quantity_before integer,
  quantity_after integer,
  quantity_delta integer,
  note text,
  actor_type text not null default 'system',
  actor_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  first_order_at timestamptz,
  last_order_at timestamptz,
  order_count integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_contact_unique unique(email, phone)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'product-images',
  path text not null,
  public_url text not null,
  content_type text,
  size_bytes integer,
  alt_text text,
  usage_scope text not null default 'product',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_path_unique unique(bucket, path),
  constraint media_assets_scope_check check (usage_scope in ('product', 'banner', 'homepage', 'brand', 'misc'))
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'owner',
  status text not null default 'invited',
  password_hash text,
  password_reset_token_hash text,
  password_reset_expires_at timestamptz,
  two_factor_enabled boolean not null default false,
  invited_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_status_check check (status in ('invited', 'active', 'disabled')),
  constraint admin_users_role_check check (role in ('super_admin', 'owner', 'product_manager', 'order_manager', 'support', 'developer'))
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.admin_users(id) on delete cascade,
  session_label text,
  ip_address text,
  user_agent text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.shipping_rate_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_subtotal numeric(12,2) not null default 0,
  max_subtotal numeric(12,2),
  flat_rate numeric(12,2) not null default 0,
  free_shipping_threshold numeric(12,2) not null default 0,
  pincode_prefix text,
  city text,
  state text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_rate_rules_amounts_non_negative check (
    min_subtotal >= 0 and flat_rate >= 0 and free_shipping_threshold >= 0 and (max_subtotal is null or max_subtotal >= min_subtotal)
  )
);

alter table public.product_categories enable row level security;
alter table public.inventory_events enable row level security;
alter table public.customers enable row level security;
alter table public.media_assets enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.shipping_rate_rules enable row level security;

drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at
  before update on public.product_categories
  for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

drop trigger if exists shipping_rate_rules_set_updated_at on public.shipping_rate_rules;
create trigger shipping_rate_rules_set_updated_at
  before update on public.shipping_rate_rules
  for each row execute function public.set_updated_at();

create or replace function public.log_product_variant_inventory_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.stock is distinct from new.stock then
    insert into public.inventory_events (
      product_id,
      variant_id,
      event_type,
      quantity_before,
      quantity_after,
      quantity_delta,
      note
    ) values (
      new.product_id,
      new.id,
      'stock_update',
      old.stock,
      new.stock,
      new.stock - old.stock,
      'Recorded automatically from product variant stock change'
    );
  end if;

  return new;
end;
$$;

create or replace function public.upsert_customer_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (
    name,
    email,
    phone,
    address,
    first_order_at,
    last_order_at,
    order_count,
    total_spent
  ) values (
    new.customer_name,
    nullif(new.customer_email, ''),
    nullif(new.customer_phone, ''),
    new.customer_address,
    new.created_at,
    new.created_at,
    1,
    new.total_amount
  )
  on conflict (email, phone) do update set
    name = excluded.name,
    address = excluded.address,
    last_order_at = greatest(public.customers.last_order_at, excluded.last_order_at),
    order_count = public.customers.order_count + 1,
    total_spent = public.customers.total_spent + excluded.total_spent;

  return new;
end;
$$;

drop trigger if exists product_variants_inventory_event on public.product_variants;
create trigger product_variants_inventory_event
  after update of stock on public.product_variants
  for each row execute function public.log_product_variant_inventory_event();

drop trigger if exists orders_customer_rollup on public.orders;
create trigger orders_customer_rollup
  after insert on public.orders
  for each row execute function public.upsert_customer_from_order();

create index if not exists product_categories_parent_idx on public.product_categories(parent_id);
create index if not exists customers_last_order_idx on public.customers(last_order_at desc);
create index if not exists inventory_events_variant_created_idx on public.inventory_events(variant_id, created_at desc);
create index if not exists inventory_events_product_created_idx on public.inventory_events(product_id, created_at desc);
create index if not exists media_assets_scope_created_idx on public.media_assets(usage_scope, created_at desc);
create index if not exists admin_sessions_user_idx on public.admin_sessions(admin_user_id, created_at desc);
create index if not exists shipping_rate_rules_active_idx on public.shipping_rate_rules(is_active, sort_order);
