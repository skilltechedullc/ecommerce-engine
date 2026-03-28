alter table public.product_variants
add column if not exists compare_at_price numeric(12,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_compare_at_price_valid'
  ) then
    alter table public.product_variants
      add constraint product_variants_compare_at_price_valid
      check (compare_at_price is null or compare_at_price > price);
  end if;
end
$$;