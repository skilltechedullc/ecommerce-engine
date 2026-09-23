-- Core commerce RLS policies.

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.variant_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Public read active products'
  ) then
    create policy "Public read active products"
      on public.products
      for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_variants'
      and policyname = 'Public read active product variants'
  ) then
    create policy "Public read active product variants"
      on public.product_variants
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.products
          where products.id = product_variants.product_id
            and products.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_images'
      and policyname = 'Public read active product images'
  ) then
    create policy "Public read active product images"
      on public.product_images
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.products
          where products.id = product_images.product_id
            and products.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'variant_images'
      and policyname = 'Public read active variant images'
  ) then
    create policy "Public read active variant images"
      on public.variant_images
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.product_variants
          join public.products on products.id = product_variants.product_id
          where product_variants.id = variant_images.variant_id
            and products.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Service role full access products'
  ) then
    create policy "Service role full access products"
      on public.products
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_variants'
      and policyname = 'Service role full access product variants'
  ) then
    create policy "Service role full access product variants"
      on public.product_variants
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_images'
      and policyname = 'Service role full access product images'
  ) then
    create policy "Service role full access product images"
      on public.product_images
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'variant_images'
      and policyname = 'Service role full access variant images'
  ) then
    create policy "Service role full access variant images"
      on public.variant_images
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Service role full access orders'
  ) then
    create policy "Service role full access orders"
      on public.orders
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Service role full access order items'
  ) then
    create policy "Service role full access order items"
      on public.order_items
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;
