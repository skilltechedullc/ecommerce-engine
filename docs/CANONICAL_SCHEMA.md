# Canonical Schema Notes

This file records the current application-facing schema contract. It is not a complete database reference; it highlights the columns that must stay aligned with app code and migrations.

## Product Variants

Canonical table: `public.product_variants`

Canonical variant label column: `weight`

The admin UI and API validation still use the word `name` for the human-facing variant label. Database writes must store that value in `product_variants.weight`.

Required app-facing columns:

- `id`
- `product_id`
- `weight`
- `price`
- `compare_at_price`
- `stock`
- `sku`
- `image`
- `created_at`
- `updated_at`

Compatibility note:

- Older databases may still have a nullable `name` column.
- The app should not depend on `product_variants.name`.

## Chat Sessions

Canonical table: `public.chat_sessions`

WhatsApp sessions use:

- `channel = 'whatsapp'`
- unique key: `(channel, phone)`

Required app-facing columns:

- `id`
- `channel`
- `phone`
- `step`
- `cart`
- `customer_name`
- `customer_address`
- `created_at`
- `updated_at`

Compatibility note:

- Older databases may have started with `public.whatsapp_sessions`.
- The migration path renames that table to `public.chat_sessions`.
- App code should use `chat_sessions`, not `whatsapp_sessions`.

## Shipments

Canonical table: `public.shipments`

The `updated_at` trigger should use `public.set_updated_at()`, matching the core migration helper. Do not rely on `extensions.moddatetime` because extension schema placement can differ between local and hosted Supabase projects.

Required app-facing columns:

- `id`
- `order_id`
- `provider`
- `provider_shipment_id`
- `awb_number`
- `tracking_url`
- `status`
- `pickup_scheduled_at`
- `shipped_at`
- `delivered_at`
- `estimated_delivery`
- `pickup_address`
- `delivery_address`
- `weight_grams`
- `metadata`
- `created_at`
- `updated_at`

## Orders Source

Canonical table: `public.orders`

`source` tracks order origin and should be used for channel analytics and fulfillment hints.

`payment_method` tracks the payment flow used for the order.

`confirmation_token` is a customer-safe secret used with `order_id` before the success page reads order details.

Allowed values:

- `web`
- `whatsapp`
- `instagram`
- `other`

Allowed payment methods:

- `razorpay`
- `cod`
- `manual`
- `whatsapp_cod`
