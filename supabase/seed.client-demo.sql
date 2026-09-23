-- Disposable local demo store seed.
-- Run only against local/staging databases when you need sample catalog data.

with products_seed as (
  insert into public.products (
    name,
    slug,
    description,
    image,
    category,
    subcategory,
    price,
    stock,
    is_active
  )
  values
    (
      'Demo Coconut Oil',
      'demo-coconut-oil',
      'An everyday cooking staple. Explore our sample 500 ml bottle.',
      '/logo.svg',
      'Grocery',
      'Cooking Oil',
      249.00,
      35,
      true
    ),
    (
      'Demo Honey',
      'demo-honey',
      'A little sweetness for your pantry. Explore our sample 250 g jar.',
      '/logo.svg',
      'Grocery',
      'Honey',
      199.00,
      24,
      true
    ),
    (
      'Demo Rice Pack',
      'demo-rice-pack',
      'A pantry essential for everyday meals. Explore our sample 5 kg pack.',
      '/logo.svg',
      'Grocery',
      'Staples',
      349.00,
      18,
      true
    )
  on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    image = excluded.image,
    category = excluded.category,
    subcategory = excluded.subcategory,
    price = excluded.price,
    stock = excluded.stock,
    is_active = excluded.is_active
  returning id, slug
)
insert into public.product_variants (product_id, weight, price, compare_at_price, stock, sku, image)
select id, '500 ml', 249.00, 299.00, 20, 'DEMO-OIL-500', '["/logo.svg"]'::jsonb
from products_seed
where slug = 'demo-coconut-oil'
on conflict (product_id, sku) where sku is not null do update
set weight = excluded.weight, price = excluded.price, compare_at_price = excluded.compare_at_price, stock = excluded.stock, image = excluded.image;

insert into public.product_variants (product_id, weight, price, compare_at_price, stock, sku, image)
select id, '250 g', 199.00, 249.00, 12, 'DEMO-HONEY-250', '["/logo.svg"]'::jsonb
from public.products
where slug = 'demo-honey'
on conflict (product_id, sku) where sku is not null do update
set weight = excluded.weight, price = excluded.price, compare_at_price = excluded.compare_at_price, stock = excluded.stock, image = excluded.image;

insert into public.product_variants (product_id, weight, price, compare_at_price, stock, sku, image)
select id, '5 kg', 349.00, 399.00, 18, 'DEMO-RICE-5KG', '["/logo.svg"]'::jsonb
from public.products
where slug = 'demo-rice-pack'
on conflict (product_id, sku) where sku is not null do update
set weight = excluded.weight, price = excluded.price, compare_at_price = excluded.compare_at_price, stock = excluded.stock, image = excluded.image;
