-- Add source column to track order origin (web or whatsapp)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';

-- Add check constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_source_check'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_source_check
    CHECK (source IN ('web', 'whatsapp', 'instagram', 'other'));
  END IF;
END
$$;

-- Update any existing WhatsApp orders if identifiable
-- (sets all existing to 'web' as we cannot distinguish retroactively)
-- Future orders will be tagged correctly at creation time
UPDATE orders
SET source = 'web'
WHERE source IS NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS orders_source_idx ON orders(source);

-- Add index on created_at if not exists (for month comparisons)
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

-- Add index on status if not exists
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);