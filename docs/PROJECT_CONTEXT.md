# Project Context for Maintainers

This document captures implementation-level context and operational knowledge for future contributors.

Last verified: 2026-03-28

## 1) Purpose and scope

This repository implements a single-tenant ecommerce engine with:

- configurable branding/currency
- variant-aware catalog and cart
- admin product and order operations
- Razorpay-backed checkout
- Supabase persistence
- centralized transactional notifications (email + WhatsApp templates) with delivery logs

It is intentionally a Next.js monolith (UI + API) for faster iteration and simpler deployment.

## 2) Architectural decisions

### 2.1 Monolith over split services

Decision:

- Keep storefront and backend APIs in one Next.js App Router project.

Why:

- Less operational complexity
- Faster local development
- Shared types and utilities reduce drift

Tradeoff:

- Tighter coupling between UI release cadence and API changes

### 2.2 Config-driven tenant identity

Decision:

- Centralize tenant identity and money metadata in lib/config.ts and lib/money.ts.

Why:

- Avoid hardcoded tenant strings
- Make project reusable across merchants

Tradeoff:

- Frontend and email templates still include some opinionated text tone that may need tenant-specific copy refinement

### 2.3 Simple admin auth

Decision:

- Password-based admin login with httpOnly cookie (admin-auth).

Why:

- Minimal setup for single-tenant use

Tradeoff:

- Not suitable for multi-user enterprise admin access
- No user identity, roles, or audit trail

## 3) Runtime flows

### 3.1 Product browse and add-to-cart

Flow:

1. Product page loads product + variants from Supabase.
2. User selects a required variant in VariantSelector.
3. Cart stores variant-aware line item:
   - product_id
   - variant_id
   - variant_name
   - price
4. Mini cart and checkout read from localStorage-backed cart store.

Key files:

- app/products/[slug]/page.tsx
- app/products/[slug]/VariantSelector.tsx
- lib/cart.ts
- components/MiniCartDrawer.tsx

### 3.2 Checkout and order save

Flow:

1. Checkout calls POST /api/create-order with amount.
2. API calculates the total from database variant prices, creates a Razorpay order, and stores a checkout_sessions row.
3. Razorpay modal completes payment.
4. Frontend calls POST /api/save-order with payment signature + customer + items.
5. API verifies signature with RAZORPAY_KEY_SECRET.
6. API fetches Razorpay payment/order server-side and verifies amount, currency, order ID, payment ID, and captured status.
7. API reserves stock, inserts into orders and order_items, and marks checkout_sessions as order_saved.
8. API asynchronously triggers centralized notifications.
9. Notification service sends channel-specific email/WhatsApp messages with idempotency logs.

Key files:

- app/checkout/page.tsx
- app/api/create-order/route.ts
- app/api/save-order/route.ts
- lib/server/notifications.ts
- lib/email.ts

### 3.3 Webhook reconciliation

Flow:

1. Razorpay webhook posts raw payload to /api/razorpay/webhook.
2. API validates x-razorpay-signature using RAZORPAY_WEBHOOK_SECRET.
3. API handles events payment.captured, order.paid, payment.failed, payment.dispute.created, and refund.processed.
4. API marks order status to Paid when appropriate.
5. API does not send notifications directly; notification dispatch is centralized in order/save and status-update flows.

Key file:

- app/api/razorpay/webhook/route.ts

Operational behavior:

- If order is not yet present, endpoint returns 404 so Razorpay retries.
- If order is already Paid or beyond, webhook is idempotently acknowledged.

### 3.4 Admin product management

Flow:

1. Admin login sets admin-auth cookie when password matches ADMIN_PASSWORD.
2. Product APIs require isAdminAuthenticated() check.
3. Create/update endpoints validate payload and write products + product_variants.
4. Update currently replaces all variants (delete then insert) for simplicity.

Key files:

- app/api/admin-login/route.ts
- lib/adminAuth.ts
- app/api/products/create/route.ts
- app/api/products/update/route.ts
- app/api/products/delete/route.ts
- app/api/products/list/route.ts
- app/admin/(protected)/products/*

## 4) Data contracts and assumptions

### 4.1 Required tables

- products
- product_variants
- orders
- order_items

### 4.2 Required columns in active code paths

products:

- id, name, slug, description, image, category, subcategory, price, stock, is_active, created_at

product_variants:

- id, product_id, weight, price, stock, sku, compare_at_price, image

`weight` is the canonical database column for the customer-facing variant label. Admin/API payloads may still call this field `name` for UX wording, but database writes should persist it to `product_variants.weight`.

orders:

- id, customer_name, customer_email, customer_phone, customer_address, total_amount, razorpay_order_id, razorpay_payment_id, status, created_at

checkout_sessions:

- id, razorpay_order_id, amount_paise, currency, items, status, failure_reason, order_id, razorpay_payment_id, created_at, updated_at

order_items:

- id, order_id, product_id, product_name, price, quantity

chat_sessions:

- id, channel, phone, step, cart, customer_name, customer_address, created_at, updated_at

`chat_sessions` is the canonical session table. WhatsApp sessions use `channel = 'whatsapp'`.

### 4.3 Order item representation

Current implementation persists variant context in product_name text (for readability) rather than separate variant_id column in order_items.

Implication:

- Historical records are human-readable but less normalized.
- Add explicit variant_id to order_items in a future migration if strict relational analytics are needed.

## 5) Known risks and technical debt

### High priority

1. Admin auth model is simplistic (single shared password, no RBAC).
2. API payload validation is manual and scattered; no shared schema library.
3. No automated test suite yet for checkout, webhook, notifications, and admin CRUD.

### Medium priority

1. Header/footer use img tags and trigger Next lint warnings.
2. Product update strategy deletes and recreates all variants (no partial update semantics).
3. Mixed presentation strings in UI/email may need full i18n/copy externalization.

### Low priority

1. package.json name still reflects historical tenant branding.
2. Additional observability and structured logging can be improved.

## 6) Operational runbook

### 6.1 Before every release

1. Run npm run lint.
2. Run npm run build.
3. Verify env vars in target environment.
4. Smoke test:
   - admin login
   - product create/update/delete
   - storefront add-to-cart with variant
   - checkout payment
   - order visible in admin
   - emails received

### 6.2 If payment succeeds but order is missing

1. Re-run checkout with the same cart and confirm /api/save-order response payload.
2. Confirm RAZORPAY_KEY_SECRET.
3. Confirm Supabase service role key permissions.

### 6.3 If webhook does not update status

1. Confirm webhook endpoint URL and event subscriptions in Razorpay dashboard.
2. Confirm RAZORPAY_WEBHOOK_SECRET value.
3. Confirm x-razorpay-signature is present and valid.

### 6.4 If notifications fail

1. Confirm RESEND_API_KEY and EMAIL_FROM_ADDRESS.
2. Check sender domain status in Resend.
3. Confirm WHATSAPP_ENABLED, provider credentials, and approved template IDs.
4. Open admin order details and inspect notification_logs entries.
5. Use "Resend Failed Notifications" action in admin.

## 7) Recommended next improvements (priority order)

1. Replace admin password auth with proper identity/RBAC.
2. Introduce shared validation schemas for API payloads.
3. Add integration tests for checkout + save-order + webhook + notification retries.
4. Add migration(s) for stricter order_items normalization if needed.
5. Add periodic worker/cron for retrying failed notifications automatically.
6. Add structured logging and request correlation IDs via a sink (not console).

## 8) Ownership guidance

When modifying payment or order flows, treat these files as one change unit:

- app/checkout/page.tsx
- app/api/create-order/route.ts
- app/api/save-order/route.ts
- app/api/razorpay/webhook/route.ts
- lib/server/notifications.ts
- lib/email.ts

When modifying variant behavior, treat these as one change unit:

- app/products/[slug]/VariantSelector.tsx
- lib/cart.ts
- app/checkout/page.tsx
- app/api/save-order/route.ts
- app/api/products/*

This reduces drift between frontend payloads and backend persistence expectations.
