# Coupons — Millco release, 2 October 2026

Branch: `codex/millco-production`. Store: https://shop.millco.in.

## Owner guide

Open **Admin → Coupons** to create or edit offers. Codes ignore letter case. Choose a percentage below 100 or a fixed amount in the store currency (INR for Millco), with optional minimum product total, maximum discount, start/expiry dates and usage limit. Dates use the administrator browser's local time and are stored in UTC. Uncheck Enabled to stop new uses. Existing payment checkouts retain their original offer.

`MILLCO10` was the initial test offer and is now **disabled while WhatsApp verification is prepared**: 10% off products, no minimum, no maximum discount, no expiry and unlimited uses. Edit or disable it before real promotions as appropriate. Razorpay remains in test mode.

Customers enter the code at checkout and select Apply. Only one coupon is allowed and coupons apply to online payments, not COD or WhatsApp/manual orders. Changing the cart or delivery address requires applying the coupon again. The product amount after discount must be at least ₹1. Delivery is calculated after discount: ₹1,000 less 10% = ₹900 plus ₹50 delivery; a discounted product total of ₹1,000 or more receives free delivery.

## Limits and payment recovery

A checkout reserves one use before its payment order is returned to the browser. Pending checkouts count toward a limit, including dismissed payment windows. Reservations deliberately do not expire: a Razorpay order may still be paid later. The admin table separates completed and pending uses; increase a limit if abandoned checkouts consume it. Cancellation/refund does not restore a use. Contact limits are now available as described below.

The server reads prices and stock from the catalog. A database row lock prevents simultaneous checkouts exceeding a coupon limit. The saved payment session holds the code and discount; customer callbacks and webhook recovery honor that snapshot. Recovery is idempotent and stock decreases only once. Orders, customer receipts, confirmation screens, admin detail and email include the discount and actual total. Coupon data and reservation functions are restricted to the server; management requires owner/super-admin permission and same-origin requests.

Migration: `supabase/migrations/202610020001_coupons.sql`. Apply it before deploying the application. It is additive and leaves existing orders unchanged (zero discount). No secrets belong in this document or repository.

## Verification

- Lint, TypeScript, 80 unit/regression checks and Millco production build passed.
- Local database integration: concurrent final use, forged discount rejection, private table/RPC permissions, incorrect captured amount rejection, recovery after disabling/editing a coupon, idempotency and one stock decrement passed. Existing no-coupon recovery also passed.
- Local browser: admin create/edit/disable, unauthorized/cross-origin rejection, invalid coupon message, apply/remove, address-change invalidation, desktop/mobile layouts and no browser errors passed.
- Millco Razorpay test API verified a ₹499 product less ₹49.90 discount plus ₹50 delivery creates a ₹499.10 payment order. No payment submitted; one pending test checkout retained. Live deployment verification follows release.

## WhatsApp verification — step 1 history, 2 October 2026

Admin → Coupons now has Require WhatsApp OTP, One use per phone and Block reuse of email controls. New coupons default to all three controls checked and Disabled. Existing unrestricted offers retain their prior flags. MILLCO10 is explicitly disabled with all three protections selected.

Phone numbers are compared using the server tenant country code, national length and trunk prefix. Email comparison trims whitespace and ignores case; aliases and different inboxes are not treated as the same address. Either enabled contact rule blocks a new checkout if an earlier session for that coupon matches. Pending payment sessions count, including sessions created before rules were enabled. The database coupon-row lock prevents simultaneous checkouts bypassing these checks. Changes to cart, email, phone or address invalidate the displayed coupon quote.

**OTP delivery is not implemented in step 1.** The admin API rejects activation of an OTP-required offer, the quote API rejects it, and the database refuses reservations even if a caller submits a forged verified flag. Existing paid sessions remain recoverable. Ordinary purchases and unrestricted coupons still work. With OTP off, contact matching is explicitly described as unverified and can be bypassed by entering different details; email is only a duplicate check.

Migration: 202610020002_coupon_contact_rules.sql. Checks: 82 unit/regression tests, three isolated database integrations (including simultaneous phone reuse, email reuse, number formatting, historical sessions, forged OTP and payment recovery), admin browser save/activation checks, lint, TypeScript and production build.

Step 1 left the code-entry and delivery implementation for step 2. See the current state below.


## WhatsApp verification — step 2, 2 October 2026

OTP entry, explicit code request, resend cooldown, verification, browser/contact binding, secure server-side challenges and same-checkout payment retry are implemented. Sender configuration defaults to disabled. MILLCO10 remains disabled with its three protections selected. No real Meta delivery has been attempted or verified.

See [COUPON_WHATSAPP_OTP.md](COUPON_WHATSAPP_OTP.md) for the exact credentials/template requirements, activation procedure, sending caps and recovery limitations. Migration: 202610020003_coupon_otp.sql. No plaintext codes are stored or returned. The final order preserves its pre-payment contact snapshot. Ordinary checkout remains available without OTP or a coupon.

Validation: 85 unit/regression checks, five local integration tests across OTP, rate caps, contact rules, atomic coupon use and payment recovery; local browser flow with simulated delivery and actual verification routes; lint, TypeScript and Millco production build. Real WhatsApp receipt and provider approval still require the account setup and controlled test.
