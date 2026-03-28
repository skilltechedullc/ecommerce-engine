alter table if exists public.products
  add column if not exists updated_at timestamptz;

update public.products
set updated_at = now()
where updated_at is null;

alter table if exists public.products
  alter column updated_at set default now();

alter table if exists public.products
  alter column updated_at set not null;

alter table if exists public.product_variants
  add column if not exists updated_at timestamptz;

update public.product_variants
set updated_at = now()
where updated_at is null;

alter table if exists public.product_variants
  alter column updated_at set default now();

alter table if exists public.product_variants
  alter column updated_at set not null;