-- Shipping support schema

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'manual',
  provider_shipment_id text,
  awb_number text,
  tracking_url text,
  status text not null default 'pending',
  pickup_scheduled_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery timestamptz,
  pickup_address jsonb,
  delivery_address jsonb,
  weight_grams integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_status_allowed check (
    status in (
      'pending',
      'pickup_scheduled',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled'
    )
  )
);

alter table public.shipments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shipments'
      and policyname = 'Service role full access shipments'
  ) then
    create policy "Service role full access shipments"
      on public.shipments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

create index if not exists shipments_order_id_idx on public.shipments(order_id);
create index if not exists shipments_status_idx on public.shipments(status);
create index if not exists shipments_awb_idx on public.shipments(awb_number);
create index if not exists shipments_provider_idx on public.shipments(provider);

-- updated_at trigger
DROP TRIGGER IF EXISTS shipments_set_updated_at ON public.shipments;
create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

-- Verification
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'shipments';
