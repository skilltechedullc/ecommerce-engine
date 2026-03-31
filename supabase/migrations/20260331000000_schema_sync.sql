-- Bring current migrations in line with how the application uses these tables.

-- WhatsApp sessions: app code persists customer_name but the initial migration omitted it.
alter table if exists public.whatsapp_sessions
  add column if not exists customer_name text;

-- Product variants: app code uses weight while the base schema created name.
alter table if exists public.product_variants
  add column if not exists weight text;

update public.product_variants
set weight = coalesce(weight, name)
where weight is null;

-- Product variants: app code stores image collections, but the base schema created image as text.
do $$
declare
  image_data_type text;
begin
  select data_type
  into image_data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'product_variants'
    and column_name = 'image';

  if image_data_type is null then
    alter table public.product_variants
      add column image jsonb not null default '[]'::jsonb;
  elsif image_data_type <> 'jsonb' then
    alter table public.product_variants
      alter column image drop default;

    alter table public.product_variants
      alter column image type jsonb
      using case
        when image is null or btrim(image) = '' then '[]'::jsonb
        when left(btrim(image), 1) = '[' then image::jsonb
        else jsonb_build_array(image)
      end;

    alter table public.product_variants
      alter column image set default '[]'::jsonb;
  else
    alter table public.product_variants
      alter column image set default '[]'::jsonb;
  end if;
end
$$;

comment on column public.product_variants.image is 'Array of variant-level images (JSON array of image URLs)';