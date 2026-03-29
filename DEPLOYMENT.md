# Deployment Guide

This repository is designed to be deployed per client without code changes. A new tenant should only require new environment variables, a new Supabase project, a new Vercel project, and a new domain.

## Goal

Get a new client live in under 60 minutes by following the steps below.

## 1. Clone And Install

```bash
git clone <your-repo-url> ecommerce-engine
cd ecommerce-engine
npm install
```

## 2. Create The Client Infrastructure

1. Create a new Supabase project for the client.
2. Create a new Vercel project for the client.
3. Decide the client storefront domain and, if needed, a separate business site domain.
4. Create or verify the client Razorpay account and Resend sender domain.

## 3. Provision The Database

Run every SQL migration in the `supabase/migrations` folder against the client's new Supabase project.

Fastest options:

1. Use the Supabase SQL editor and run the files in timestamp order.
2. Or use the Supabase CLI if your team already has it configured:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Verify that these tables exist after migration:

1. `products`
2. `product_variants`
3. `orders`
4. `order_items`
5. `notification_logs`

## 4. Create Tenant Environment Variables

1. Copy `.env.example` to `.env.local` for local validation.
2. Fill in the client-specific values.
3. Copy the same values into the Vercel project environment.

Minimum production set:

1. Supabase URL, anon key, service role key
2. `ADMIN_PASSWORD`
3. Razorpay key ID, public key ID, key secret, webhook secret
4. Resend API key, `EMAIL_FROM_ADDRESS`, `ADMIN_EMAIL`
5. Brand, contact, locale, and color variables
6. `NEXT_PUBLIC_SITE_URL` set to the final client domain

If the client uses WhatsApp notifications, also configure:

1. `WHATSAPP_ENABLED=true`
2. `WHATSAPP_PROVIDER`
3. Template IDs
4. Provider credentials
5. `NEXT_PUBLIC_WHATSAPP_NUMBER`

## 5. Validate Locally Before Deploying

Run:

```bash
npm run lint
npm run build
```

Then start the app locally:

```bash
npm run dev
```

Smoke-check these flows:

1. Home page branding, logo, contact info, and colors
2. Product listing and product detail pages
3. Cart and checkout load correctly
4. Admin login works with `ADMIN_PASSWORD`
5. Order creation works in Razorpay test mode

## 6. Deploy To Vercel

1. Import the repo into the client’s Vercel project.
2. Set the root directory to the repository root.
3. Add all production environment variables from `.env.example`.
4. Trigger a production deployment.

Recommended Vercel environment policy:

1. Keep identical env var keys across all tenants.
2. Change only values, never code.
3. Store secrets only in Vercel and local secure env files.

## 7. Wire Production Integrations

After the first deployment succeeds:

1. Point the client domain to Vercel.
2. Set `NEXT_PUBLIC_SITE_URL` to the final canonical URL.
3. Configure the Razorpay webhook to:

```text
https://CLIENT_DOMAIN/api/razorpay/webhook
```

4. Set the same `RAZORPAY_WEBHOOK_SECRET` in Vercel.
5. Verify the Resend sender domain for `EMAIL_FROM_ADDRESS`.
6. If WhatsApp is enabled, send a test notification through the configured provider.

## 8. Production Smoke Test

Run one full end-to-end test on the live domain:

1. Browse products
2. Add items to cart
3. Reach checkout
4. Complete a Razorpay test payment
5. Confirm the order appears in admin
6. Confirm email delivery
7. Confirm WhatsApp delivery if enabled

## 9. Tenant Rollout Checklist

Use this checklist for every new client:

1. New Supabase project created
2. Migrations applied successfully
3. New Vercel project created
4. All env vars set from `.env.example`
5. Brand, contact, and color config verified visually
6. Razorpay webhook configured
7. Email sender verified
8. Admin access verified
9. End-to-end order flow verified

## 10. Ongoing Operations

For every additional client:

1. Reuse the same repository and branch strategy
2. Create a fresh Supabase project
3. Create a fresh Vercel project
4. Fill a new environment variable set
5. Do not fork or customize code unless the engine itself is changing

That keeps the platform single-codebase and tenant-configured, which is the intended operating model for `ecommerce-engine`.