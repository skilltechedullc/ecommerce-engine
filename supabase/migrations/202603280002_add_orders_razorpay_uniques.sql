-- Prevent duplicate Razorpay orders/payments from retries or race conditions.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.conname = 'orders_razorpay_order_id_key'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_razorpay_order_id_key UNIQUE (razorpay_order_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.conname = 'orders_razorpay_payment_id_key'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_razorpay_payment_id_key UNIQUE (razorpay_payment_id);
  END IF;
END
$$;
