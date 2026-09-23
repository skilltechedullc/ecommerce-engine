# Phase 3 Checkout And Payment Hardening Report

Status: local checkout/payment hardening is implemented and locally verified. A real Razorpay test-mode payment still needs manual account-based testing before production rollout.

## What Changed

- Added `public.checkout_sessions` as the pending checkout record.
- `POST /api/create-order` now aggregates duplicate variant quantities before stock checks.
- `POST /api/create-order` calculates the payable amount only from database product variant prices.
- `POST /api/create-order` stores a pending checkout session with:
  - Razorpay order ID
  - server-calculated amount in paise
  - currency
  - canonical cart items
  - checkout status
- `POST /api/save-order` now requires the pending checkout session before order fulfillment.
- `POST /api/save-order` verifies:
  - Razorpay signature
  - Razorpay payment ID
  - Razorpay order ID
  - payment amount
  - order amount
  - currency
  - captured payment status
- Duplicate cart lines are aggregated before final stock validation and reservation.
- Checkout session status is updated through the payment/order lifecycle:
  - `created`
  - `payment_verified`
  - `order_saved`
  - `order_save_failed`
  - `payment_verification_failed`
- If order save fails after payment verification, the checkout session records the failure reason for recovery/debugging.

## Security Improvement

The frontend cart total is no longer trusted for payment fulfillment. The server now binds Razorpay payment verification to the same server-calculated amount that was stored when the Razorpay order was created.

## Local Verification

Passed:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test:phase3`
- `npx.cmd supabase db reset`
- `npx.cmd supabase db lint --local`
- `docker exec supabase_db_ecommerce-engine psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/verify_phase2_schema.sql`

Scripted checkout hardening checks cover:

- duplicate variant aggregation
- invalid totals
- matching captured Razorpay snapshots
- stale/tampered amount mismatch
- replayed or mismatched payment IDs
- uncaptured payments
- order-save failure recovery schema support

Still required before production:

- Run a real Razorpay test-mode checkout.
- Confirm successful payment creates:
  - one `orders` row
  - expected `order_items` rows
  - one `checkout_sessions` row with `status = 'order_saved'`
- Confirm failed/stale payment attempts update `checkout_sessions.status` in a real Razorpay test-mode flow.
- Confirm duplicate variant quantities cannot oversell stock against a real local/test catalog.
