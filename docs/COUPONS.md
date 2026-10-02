# Coupons — Millco release, 2 October 2026

Branch: `codex/millco-production`. Store: https://shop.millco.in.

## Owner guide

Open **Admin → Coupons** to create or edit offers. Codes ignore letter case. Choose a percentage below 100 or a fixed amount in the store currency (INR for Millco), with optional minimum product total, maximum discount, start/expiry dates and usage limit. Dates use the administrator browser's local time and are stored in UTC. Uncheck Enabled to stop new uses. Existing payment checkouts retain their original offer.

`MILLCO10` is the initial active test offer: 10% off products, no minimum, no maximum discount, no expiry and unlimited uses. Edit or disable it before real promotions as appropriate. Razorpay remains in test mode.

Customers enter the code at checkout and select Apply. Only one coupon is allowed and coupons apply to online payments, not COD or WhatsApp/manual orders. Changing the cart or delivery address requires applying the coupon again. The product amount after discount must be at least ₹1. Delivery is calculated after discount: ₹1,000 less 10% = ₹900 plus ₹50 delivery; a discounted product total of ₹1,000 or more receives free delivery.

## Limits and payment recovery

A checkout reserves one use before its payment order is returned to the browser. Pending checkouts count toward a limit, including dismissed payment windows. Reservations deliberately do not expire: a Razorpay order may still be paid later. The admin table separates completed and pending uses; increase a limit if abandoned checkouts consume it. Cancellation/refund does not restore a use. There is no per-customer limit in this release.

The server reads prices and stock from the catalog. A database row lock prevents simultaneous checkouts exceeding a coupon limit. The saved payment session holds the code and discount; customer callbacks and webhook recovery honor that snapshot. Recovery is idempotent and stock decreases only once. Orders, customer receipts, confirmation screens, admin detail and email include the discount and actual total. Coupon data and reservation functions are restricted to the server; management requires owner/super-admin permission and same-origin requests.

Migration: `supabase/migrations/202610020001_coupons.sql`. Apply it before deploying the application. It is additive and leaves existing orders unchanged (zero discount). No secrets belong in this document or repository.

## Verification

- Lint, TypeScript, 80 unit/regression checks and Millco production build passed.
- Local database integration: concurrent final use, forged discount rejection, private table/RPC permissions, incorrect captured amount rejection, recovery after disabling/editing a coupon, idempotency and one stock decrement passed. Existing no-coupon recovery also passed.
- Local browser: admin create/edit/disable, unauthorized/cross-origin rejection, invalid coupon message, apply/remove, address-change invalidation, desktop/mobile layouts and no browser errors passed.
- Millco Razorpay test API verified a ₹499 product less ₹49.90 discount plus ₹50 delivery creates a ₹499.10 payment order. No payment submitted; one pending test checkout retained. Live deployment verification follows release.