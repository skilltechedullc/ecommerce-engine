# Ecommerce Engine

Millco branch: see [Millco onboarding](docs/MILLCO_ONBOARDING.md) for this store’s setup and remaining launch steps. The demo release record below remains the engine baseline.

Start here: [Current project status and next steps](docs/PROJECT_STATUS.md) — active branch, verified demo, completed work, limitations and the plan before Millco.

Verified demo baseline: [demo-v0.1.0 release checks](docs/DEMO_RELEASE.md). Real WhatsApp activation remains deferred.

Fresh demo rollout: see [Fresh deployment](docs/FRESH_DEPLOYMENT.md) for current setup, verification commands and known limits. Historical phase reports below are not a current launch sign-off.

## Overview

Single-tenant ecommerce engine built on Next.js App Router with Supabase, Razorpay, and Resend. The current hosted release is a neutral test-mode demo; see the status record for verified scope and outstanding work.

This repository is designed to be tenant-configurable via environment variables, without hardcoding brand/currency/business identity into application logic.

## What this project includes

- Storefront with product listing, product details, variant selection, cart, checkout, and success flow
- Admin area for order operations and full product + variant CRUD
- Razorpay payment order creation and payment verification
- Supabase-backed catalog and order persistence
- Transactional emails for customer confirmation and admin notifications
- Dynamic brand, currency, logo, and site metadata via centralized config

## System architecture

### Application model

- Next.js full-stack monolith (App Router)
- UI routes and API routes live in the same codebase
- BFF-style APIs under app/api for client interactions

### Data and integrations

- Database: Supabase Postgres
- Payments: Razorpay
- Email: Resend

### Core modules

- Configuration: lib/config.ts
- Money formatting: lib/money.ts
- Cart state utilities: lib/cart.ts
- Admin auth guard: lib/adminAuth.ts
- Admin Supabase client: lib/supabaseAdmin.ts

For deep technical reference and future-maintainer notes, see docs/PROJECT_CONTEXT.md.

## Key route map

### Storefront

- /
- /products
- /products/[slug]
- /cart
- /checkout
- /success

### Admin

- /admin/login
- /admin
- /admin/orders
- /admin/orders/[id]
- /admin/products
- /admin/products/new
- /admin/products/[id]

### APIs

- POST /api/admin-login
- POST /api/create-order
- POST /api/save-order
- POST /api/products/create
- POST /api/products/update
- POST /api/products/delete
- GET /api/products/list
- POST /api/admin/update-order-status
- POST /api/razorpay/webhook

## Environment variables

Create .env.local with the following values.

### Required for app boot/runtime

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_PASSWORD
- RAZORPAY_KEY_ID
- NEXT_PUBLIC_RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

### Required for production rate limiting

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

### Required for webhook correctness

- RAZORPAY_WEBHOOK_SECRET

### Required for outbound email

- RESEND_API_KEY
- EMAIL_FROM_ADDRESS

### Required for centralized notifications

- SEND_PROCESSING_NOTIFICATIONS (true|false)
- WHATSAPP_ENABLED (true|false)
- WHATSAPP_PROVIDER (twilio|wati|gupshup)
- WHATSAPP_TEMPLATE_ORDER_CONFIRMED
- WHATSAPP_TEMPLATE_ORDER_PROCESSING
- WHATSAPP_TEMPLATE_ORDER_SHIPPED
- WHATSAPP_TEMPLATE_ORDER_DELIVERED

### Provider credentials (depending on WHATSAPP_PROVIDER)

Twilio:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- WHATSAPP_FROM

WATI:
- WATI_API_BASE_URL
- WATI_API_TOKEN

Gupshup:
- GUPSHUP_API_BASE_URL (optional, defaults to https://api.gupshup.io)
- GUPSHUP_APP_NAME
- GUPSHUP_API_KEY

### Optional but recommended

- ADMIN_EMAIL
- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_BRAND_NAME
- NEXT_PUBLIC_CURRENCY
- NEXT_PUBLIC_CURRENCY_SYMBOL
- NEXT_PUBLIC_PRIMARY_COLOR
- NEXT_PUBLIC_LOGO_URL
- NEXT_PUBLIC_WHATSAPP_NUMBER

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

ADMIN_PASSWORD=<strong-random-password>

RAZORPAY_KEY_ID=rzp_live_xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

RESEND_API_KEY=re_xxx
EMAIL_FROM_ADDRESS=orders@yourdomain.com
ADMIN_EMAIL=ops@yourdomain.com

SEND_PROCESSING_NOTIFICATIONS=false
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=twilio
WHATSAPP_TEMPLATE_ORDER_CONFIRMED=...
WHATSAPP_TEMPLATE_ORDER_PROCESSING=...
WHATSAPP_TEMPLATE_ORDER_SHIPPED=...
WHATSAPP_TEMPLATE_ORDER_DELIVERED=...

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
WHATSAPP_FROM=+14155238886

NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_BRAND_NAME=Demo Store
NEXT_PUBLIC_CURRENCY=INR
NEXT_PUBLIC_CURRENCY_SYMBOL=₹
NEXT_PUBLIC_PRIMARY_COLOR=#0F3D2E
NEXT_PUBLIC_LOGO_URL=/logo.png
NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999
```

## Database requirements

Minimum tables used by this app:

- products
- product_variants
- orders
- order_items

Expected logical relationships:

- product_variants.product_id -> products.id
- order_items.order_id -> orders.id

The app assumes order status workflow values such as Pending, Paid, Processing, Shipped, Delivered.

Operational note:

- Product CRUD writes both product-level and variant-level fields.
- Checkout/save-order persists variant-aware line items (product_id + variant context in product_name).

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality gates

```bash
npm run lint
npm run build
```

Current status:

- Build passes
- Lint passes with no warnings

## Production deployment checklist

1. Configure all required environment variables in target environment.
2. Ensure Supabase schema includes the required tables and constraints.
3. Configure Razorpay webhook endpoint to /api/razorpay/webhook.
4. Set RAZORPAY_WEBHOOK_SECRET to match Razorpay dashboard webhook secret.
5. Verify email sender domain setup for Resend and EMAIL_FROM_ADDRESS.
6. Set secure ADMIN_PASSWORD (do not reuse default/test values).
7. Run npm run build in CI before release.
8. Smoke test admin product CRUD and full checkout payment-save-order flow.

## Security notes

- Service role key is server-side only and must never be exposed to client code.
- Admin auth is password + httpOnly cookie based.
- Current admin model is simple and intended for single-tenant operations.

Hardening recommendations:

- Replace password-only admin auth with proper identity provider/session model.
- Keep distributed rate limiting configured in production (Upstash Redis REST).
- Add stricter payload validation schemas for API routes.

## Troubleshooting

### Payment verification failures

- Confirm RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are correct.
- Confirm webhook payload is not transformed before HMAC verification.

### Order saved but no notifications sent

- Confirm RESEND_API_KEY and EMAIL_FROM_ADDRESS.
- Confirm sender domain verification in Resend.
- Confirm WHATSAPP_ENABLED/WHATSAPP_PROVIDER and template IDs.
- Open admin order details and review notification logs table.
- Use "Resend Failed Notifications" for transient provider failures.

### Admin APIs return 401

- Confirm ADMIN_PASSWORD is set.
- Re-authenticate at /admin/login to refresh admin-auth cookie.

## Future maintenance

Use docs/PROJECT_CONTEXT.md as the canonical technical context for:

- flow-level behavior
- current tradeoffs
- known risks
- prioritized next improvements

