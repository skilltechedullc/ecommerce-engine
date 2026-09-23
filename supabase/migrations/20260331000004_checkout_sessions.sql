-- Pending checkout records tie server-calculated carts to Razorpay orders.

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  razorpay_order_id text not null unique,
  amount_paise integer not null,
  currency text not null,
  items jsonb not null,
  status text not null default 'created',
  failure_reason text,
  order_id uuid references public.orders(id) on delete set null,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_sessions_amount_positive check (amount_paise > 0),
  constraint checkout_sessions_items_array check (jsonb_typeof(items) = 'array'),
  constraint checkout_sessions_status_allowed check (
    status in (
      'created',
      'payment_verified',
      'order_saved',
      'order_save_failed',
      'payment_verification_failed'
    )
  )
);

alter table public.checkout_sessions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'checkout_sessions'
      and policyname = 'Service role full access checkout sessions'
  ) then
    create policy "Service role full access checkout sessions"
      on public.checkout_sessions
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

create index if not exists checkout_sessions_status_idx on public.checkout_sessions(status);
create index if not exists checkout_sessions_created_at_idx on public.checkout_sessions(created_at desc);
create index if not exists checkout_sessions_order_id_idx on public.checkout_sessions(order_id);

drop trigger if exists checkout_sessions_set_updated_at on public.checkout_sessions;
create trigger checkout_sessions_set_updated_at
  before update on public.checkout_sessions
  for each row execute function public.set_updated_at();
