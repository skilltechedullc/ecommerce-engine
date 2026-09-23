# Phase 2 Schema Alignment Report

Status: local schema/code alignment is complete.

## What Changed

- Chose `product_variants.weight` as the canonical database column for the variant label.
- Kept admin/API wording as `name` where it describes the human-facing variant label.
- Updated the core product variant migration so fresh local databases create `weight` and JSON image storage directly.
- Updated the schema sync migration so older databases can copy `name` into `weight`, make `weight` required, and relax the old `name` column if it exists.
- Updated WhatsApp session code to read/write `chat_sessions` with `channel = 'whatsapp'`.
- Updated the session migration to use schema-qualified `public.chat_sessions` references.
- Updated WhatsApp and shipping `updated_at` triggers to use the project helper `public.set_updated_at()`.
- Added canonical schema notes in `docs/CANONICAL_SCHEMA.md`.

## Canonical Decisions

- Variant label: `product_variants.weight`.
- Chat/session table: `chat_sessions`.
- WhatsApp session uniqueness: `(channel, phone)`.
- Shipment timestamp trigger: `public.set_updated_at()`.
- Order channel analytics: `orders.source`.

## Local Migration Notes

- Production migrations were not applied.
- The schema sync migration was converted from UTF-16LE to UTF-8 while editing so future code review and patches work normally.
- Fresh local databases should no longer require `product_variants.name` for product creation.
- Existing databases with `product_variants.name` can keep it as a compatibility column, but app code should not depend on it.

## Verification Result

Passed after the changes:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd audit --audit-level=low`
- `npx.cmd supabase db lint --local`
- `npx.cmd supabase db reset`
- `docker cp supabase\verify_phase2_schema.sql supabase_db_ecommerce-engine:/tmp/verify_phase2_schema.sql`
- `docker exec supabase_db_ecommerce-engine psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/verify_phase2_schema.sql`

Fresh Supabase local migration execution passes with Docker. The schema verification result was `phase2 schema verification passed`.

The local Supabase Docker stack was stopped after verification. Local data were backed up to the Supabase Docker volume.
