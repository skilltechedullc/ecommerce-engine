-- Transactional product write helpers.

create or replace function public.create_product_with_relations(
  p_product jsonb,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_product_id uuid;
  product_images jsonb := coalesce(p_product->'images', '[]'::jsonb);
  variant_item jsonb;
  current_variant_id uuid;
  variant_images jsonb;
  image_url text;
  image_index integer;
begin
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception 'At least one variant is required';
  end if;

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
  values (
    p_product->>'name',
    p_product->>'slug',
    nullif(p_product->>'description', ''),
    nullif(p_product->>'image', ''),
    nullif(p_product->>'category', ''),
    nullif(p_product->>'subcategory', ''),
    (
      select min((item->>'price')::numeric)
      from jsonb_array_elements(p_variants) as item
    ),
    (
      select coalesce(sum((item->>'stock')::integer), 0)
      from jsonb_array_elements(p_variants) as item
    ),
    coalesce((p_product->>'is_active')::boolean, true)
  )
  returning id into new_product_id;

  image_index := 0;
  for image_url in select jsonb_array_elements_text(product_images)
  loop
    insert into public.product_images (product_id, image_url, sort_order)
    values (new_product_id, image_url, image_index);
    image_index := image_index + 1;
  end loop;

  for variant_item in select * from jsonb_array_elements(p_variants)
  loop
    variant_images := coalesce(variant_item->'images', '[]'::jsonb);

    insert into public.product_variants (
      product_id,
      weight,
      price,
      compare_at_price,
      stock,
      sku,
      image
    )
    values (
      new_product_id,
      variant_item->>'name',
      (variant_item->>'price')::numeric,
      nullif(variant_item->>'compare_at_price', '')::numeric,
      (variant_item->>'stock')::integer,
      nullif(variant_item->>'sku', ''),
      variant_images
    )
    returning id into current_variant_id;

    image_index := 0;
    for image_url in select jsonb_array_elements_text(variant_images)
    loop
      insert into public.variant_images (variant_id, image_url, sort_order)
      values (current_variant_id, image_url, image_index);
      image_index := image_index + 1;
    end loop;
  end loop;

  return new_product_id;
end;
$$;

create or replace function public.update_product_with_relations(
  p_product_id uuid,
  p_product jsonb,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product_images jsonb := coalesce(p_product->'images', '[]'::jsonb);
  variant_item jsonb;
  current_variant_id uuid;
  variant_images jsonb;
  image_url text;
  image_index integer;
  keep_variant_ids uuid[] := array[]::uuid[];
begin
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception 'At least one variant is required';
  end if;

  update public.products
  set
    name = p_product->>'name',
    slug = p_product->>'slug',
    description = nullif(p_product->>'description', ''),
    image = nullif(p_product->>'image', ''),
    category = nullif(p_product->>'category', ''),
    subcategory = nullif(p_product->>'subcategory', ''),
    price = (
      select min((item->>'price')::numeric)
      from jsonb_array_elements(p_variants) as item
    ),
    stock = (
      select coalesce(sum((item->>'stock')::integer), 0)
      from jsonb_array_elements(p_variants) as item
    ),
    is_active = coalesce((p_product->>'is_active')::boolean, true)
  where id = p_product_id;

  if not found then
    raise exception 'Product not found';
  end if;

  delete from public.product_images
  where product_id = p_product_id;

  image_index := 0;
  for image_url in select jsonb_array_elements_text(product_images)
  loop
    insert into public.product_images (product_id, image_url, sort_order)
    values (p_product_id, image_url, image_index);
    image_index := image_index + 1;
  end loop;

  for variant_item in select * from jsonb_array_elements(p_variants)
  loop
    variant_images := coalesce(variant_item->'images', '[]'::jsonb);
    current_variant_id := nullif(variant_item->>'id', '')::uuid;

    if current_variant_id is not null and exists (
      select 1
      from public.product_variants
      where id = current_variant_id
        and product_id = p_product_id
    ) then
      update public.product_variants
      set
        weight = variant_item->>'name',
        price = (variant_item->>'price')::numeric,
        compare_at_price = nullif(variant_item->>'compare_at_price', '')::numeric,
        stock = (variant_item->>'stock')::integer,
        sku = nullif(variant_item->>'sku', ''),
        image = variant_images
      where id = current_variant_id;
    else
      insert into public.product_variants (
        product_id,
        weight,
        price,
        compare_at_price,
        stock,
        sku,
        image
      )
      values (
        p_product_id,
        variant_item->>'name',
        (variant_item->>'price')::numeric,
        nullif(variant_item->>'compare_at_price', '')::numeric,
        (variant_item->>'stock')::integer,
        nullif(variant_item->>'sku', ''),
        variant_images
      )
      returning id into current_variant_id;
    end if;

    keep_variant_ids := array_append(keep_variant_ids, current_variant_id);

    delete from public.variant_images
    where variant_images.variant_id = current_variant_id;

    image_index := 0;
    for image_url in select jsonb_array_elements_text(variant_images)
    loop
      insert into public.variant_images (variant_id, image_url, sort_order)
      values (current_variant_id, image_url, image_index);
      image_index := image_index + 1;
    end loop;
  end loop;

  delete from public.product_variants
  where product_id = p_product_id
    and not (id = any(keep_variant_ids));

  return p_product_id;
end;
$$;

grant execute on function public.create_product_with_relations(jsonb, jsonb) to service_role;
grant execute on function public.update_product_with_relations(uuid, jsonb, jsonb) to service_role;
