-- Add image column to product_variants table
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS image jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.product_variants.image IS 'Array of variant-level images (JSON array of image URLs)';
