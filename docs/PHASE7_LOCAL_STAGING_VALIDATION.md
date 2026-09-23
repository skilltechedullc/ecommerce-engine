# Phase 7 Local And Staging Validation

Status: validation planning and disposable seed artifacts are ready. Local Supabase replay is pending because Docker escalation was blocked by the app usage-limit gate during this run.

## Verification

Passed:

- `npm.cmd run test:phase7`
- `npm.cmd run test:config`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`

## Disposable Local Seed

Use `supabase/seed.client-demo.sql` only for local or staging validation. It creates a tiny grocery-style demo catalog:

- Demo Coconut Oil
- Demo Honey
- Demo Rice Pack

The seed is separate from `supabase/seed.sql` so normal database resets can remain clean.

## Local Fresh Setup Checklist

1. Copy `env.local.phase0.example` to `.env.local` only when intentionally switching to local/test services.
2. Start local Supabase.
3. Run `npx.cmd supabase db reset`.
4. Optionally apply `supabase/seed.client-demo.sql` to load demo products.
5. Run the schema verification SQL.
6. Run `npm.cmd run verify`.
7. Open the storefront and admin locally.
8. Verify homepage, product listing, product detail, cart, checkout, admin products, admin orders, and admin settings.

## Staging Checklist

- Create staging Supabase only after local migrations replay cleanly.
- Apply migrations to staging.
- Verify RLS and schema checks.
- Use Razorpay test credentials only.
- Use Resend test/dev sender only.
- Keep WhatsApp disabled unless test credentials are configured.
- Run manual shipping/order status checks.
- Run Millco visual QA against preview/staging before production.

## Blocked Verification

Pending once Docker approval is available:

- `npx.cmd supabase start`
- `npx.cmd supabase db reset`
- `npx.cmd supabase db lint --local`
- schema verification SQL
- optional demo seed replay
