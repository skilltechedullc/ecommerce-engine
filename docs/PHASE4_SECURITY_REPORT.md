# Phase 4 Security Hardening Report

Status: local Phase 4 security hardening is implemented and verified.

## What Changed

- Added RLS policies for core commerce tables:
  - public active catalog reads for `products`, `product_variants`, `product_images`, and `variant_images`
  - service-role-only access for private/admin commerce tables
  - no public anon/authenticated policies for `orders` or `order_items`
- Added same-origin CSRF checks for admin mutation routes.
- Added Meta/WhatsApp webhook signature verification using `x-hub-signature-256`.
- Added image upload file-signature validation to catch MIME spoofing.
- Moved AI chat to the shared rate limiter so production requires distributed rate limiting.
- Added security helper tests.
- Added `WHATSAPP_APP_SECRET` to the safe local env template.

## Security Decisions

- Public storefront catalog reads are allowed only for active product data.
- Order/customer/admin data stays service-role-only.
- WhatsApp webhook signature verification is required in production when `WHATSAPP_APP_SECRET` or `META_APP_SECRET` is configured.
- Admin mutation APIs now reject cross-site origins.
- Upload validation now checks declared MIME type plus file magic bytes.

## Verification

Passed:

- `npm.cmd run test:security`
- `npm.cmd run test:phase3`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd audit --audit-level=low`
- `npx.cmd supabase db reset`
- `npx.cmd supabase db lint --local`
- schema/RLS assertion script through local Postgres

## Remaining Security Follow-Ups

- Add optional image dimension checks and re-encoding for uploaded images.
- Add a full real-browser admin mutation smoke test after the CSRF changes.
- Add a real WhatsApp webhook test with Meta test payload and `WHATSAPP_APP_SECRET`.
- Add RLS tests with anon/service keys against seeded data.
