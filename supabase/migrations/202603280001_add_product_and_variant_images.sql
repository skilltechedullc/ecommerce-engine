create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_images_sort_nonnegative check (sort_order >= 0)
);

create index if not exists product_images_product_id_idx
  on public.product_images(product_id, sort_order);

create table if not exists public.variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint variant_images_sort_nonnegative check (sort_order >= 0)
);

create index if not exists variant_images_variant_id_idx
  on public.variant_images(variant_id, sort_order);
