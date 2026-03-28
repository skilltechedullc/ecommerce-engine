-- Commerce engine core schema and storage setup
-- Safe to run multiple times (idempotent where possible)

create extension if not exists pgcrypto;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  image text,
  category text,
  subcategory text,
  price numeric(12,2),
  stock integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_unique unique (slug),
  constraint products_price_nonnegative check (price is null or price >= 0),
  constraint products_stock_nonnegative check (stock is null or stock >= 0)
);

-- Product variants
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null,
  stock integer not null,
  sku text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_price_positive check (price > 0),
  constraint product_variants_stock_nonnegative check (stock >= 0)
);

create unique index if not exists product_variants_product_sku_uq
  on public.product_variants(product_id, sku)
  where sku is not null;

create index if not exists product_variants_product_id_idx
  on public.product_variants(product_id);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_address text not null,
  total_amount numeric(12,2) not null,
  status text not null default 'Pending',
  razorpay_order_id text not null,
  razorpay_payment_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_positive check (total_amount > 0),
  constraint orders_status_allowed check (
    status in ('Pending', 'Paid', 'Processing', 'Shipped', 'Delivered')
  ),
  constraint orders_payment_id_unique unique (razorpay_payment_id)
);

create index if not exists orders_created_at_idx
  on public.orders(created_at desc);

create index if not exists orders_status_idx
  on public.orders(status);

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric(12,2) not null,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint order_items_price_positive check (price > 0),
  constraint order_items_quantity_positive check (quantity > 0)
);

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

-- Update timestamp helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'products_set_updated_at'
  ) then
    create trigger products_set_updated_at
      before update on public.products
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'product_variants_set_updated_at'
  ) then
    create trigger product_variants_set_updated_at
      before update on public.product_variants
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'orders_set_updated_at'
  ) then
    create trigger orders_set_updated_at
      before update on public.orders
      for each row execute function public.set_updated_at();
  end if;
end
$$;

-- Public storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = excluded.public;

-- Storage policies (safe create)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read product images'
  ) then
    create policy "Public read product images"
      on storage.objects
      for select
      using (bucket_id = 'product-images');
  end if;
end
$$;

-- Optional: if anon uploads are required, create dedicated signed-upload policy instead.
