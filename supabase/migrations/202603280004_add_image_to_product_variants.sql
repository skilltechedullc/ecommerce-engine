-- Add image column to product_variants table
ALTER TABLE product_variants
ADD COLUMN image jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN product_variants.image IS 'Array of variant-level images (JSON array of image URLs)';
