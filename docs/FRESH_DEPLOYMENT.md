# Fresh demo deployment

Target: a neutral Demo Store on a new Vercel project and a new Supabase project.
Payments: Razorpay **test mode only**. Manual/COD checkout is disabled in the hosted template.
The existing shop.millco.in deployment is outside this rollout.

## Private settings

Fill the ignored `.env.fresh` file. It must never be committed.
The setup includes generated admin/session/webhook secrets. Use the webhook secret when configuring Razorpay.
Use the same test key ID for `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
Do not set NODE_ENV in Vercel. Next.js sets the correct mode.
For the first demo, admin authentication uses a strong single password. Database-user mode is available separately.

Required services:
- New Supabase URL, publishable/anon key, and server secret/service-role key.
- New Upstash REST URL and standard token.
- Razorpay test key ID and secret.
- Resend API key, verified sender address and support email.
- Final Vercel URL (used for metadata and public links).

## Local verification on Windows + WSL

Use Node 24 inside WSL, not Windows Node against the WSL folder.
Run `npm ci` after copying the repository; do not reuse copied node_modules.

```sh
npm run verify
npm audit
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
docker exec -i supabase_db_ecommerce-engine psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/verify_phase2_schema.sql
docker exec -i supabase_db_ecommerce-engine psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/checkout.sql
```

The reset command is ONLY for the disposable local database. It removes local data.

For browser checks, seed the local database and generate isolated local credentials:
```sh
docker exec -i supabase_db_ecommerce-engine psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/seed.client-demo.sql
node scripts/prepare-local-test.mjs
node scripts/with-env.mjs .env.local-test dev --webpack --hostname localhost --port 3001
# In a second terminal:
npx playwright test
node --import tsx --test tests/integration/*.test.ts
```

Browser checks use local COD orders and synthetic customer details. No valid external payment/email credentials are loaded.
Razorpay test-mode validation is a separate deployment gate.

## Prepare the hosted database

Confirm the new Supabase project before applying SQL.
Apply every migration in timestamp order using the Supabase CLI, then verify the schema.
The new `202609220001_atomic_checkout.sql` migration is required: paid/manual checkout calls its transaction.
Seed `supabase/seed.client-demo.sql` only for a demo store. Do not seed real customer stores without review.

## Validate settings and deploy

```sh
npm run readiness -- .env.fresh test
node scripts/check-deployment-providers.mjs .env.fresh
```

These commands do not print credentials. A successful configuration check does not prove payment/email delivery.

Use a NEW Vercel project. Do not point the old site's production project at this work.
Build: `npm run build`. Install: `npm ci`. Node: 24.x.
Import the private environment settings into the new project's environments.
Set NEXT_PUBLIC_SITE_URL to the new deployment URL and rebuild; public settings are embedded during the build.
Configure Razorpay's test webhook at `https://NEW_HOST/api/razorpay/webhook`.

Release gates:
- All migrations applied, RLS/schema verified.
- Desktop and mobile storefront, cart and checkout checked.
- Test payment captured, order saved once, stock reduced once, confirmation page works.
- Webhook retry and duplicate payment callback tested.
- Email delivery checked using an explicitly approved test recipient.
- Admin authentication and role restrictions checked.
- Rollback deployment available; no live payment keys present.

## Supported scope and limits

Included: catalog/variants, storefront/cart, Razorpay checkout, optional COD, orders, manual shipping,
customer tracking/receipts, catalog import/export, admin roles and revocable database sessions,
audit logs and local deployment setup tools.

Settings drafts/snapshots are stored in the database, but live storefront configuration is supplied
through deployment environment variables. Saving a snapshot does not change the live storefront.
Email invites/password-reset delivery and two-factor enrollment are not implemented. The API rejects
2FA enrollment and refuses login to accounts marked as requiring it.
Shipping-provider adapters and paid-module flags do not mean every advertised add-on is implemented.
Do not market placeholder integrations as working features.

Apply `202609240001_checkout_recovery.sql` before deploying this release. New checkout sessions retain a private contact snapshot before payment. Captured-payment webhooks independently verify payment with Razorpay and use the atomic checkout operation to recover an order if the browser callback is lost. The browser also offers a save-only retry. Stock/price conflicts still require operator review; the Orders page lists verified or failed-save checkouts without an order. Reconcile captured payments in Razorpay before issuing refunds or fulfilling exceptions. Legacy checkout sessions without a contact snapshot require manual recovery.

## Internal client setup tools

Client store admins do not include the agency Launch wizard. The former `/admin/launch` page
and `/api/admin/launch/client-setup` endpoint are removed and return 404.
Prepare setup files locally with `npm run client:setup -- "Client Store Name"`; this writes
a template and handover notes under `clients/`, not a deployed website. Run readiness and
provider checks above before deployment. Keep credentials out of Git.

## Managed client hosting

The current business model is agency-managed hosting and maintenance. Clients receive store-admin access; the agency operates the deployment and separate client database. Clients retain their domain, payment account, business identity and business data. Billing and suspension remain manual and are outside the demo feature scope. Do not change repository visibility, old branches or the old Millco deployment implicitly.

WhatsApp activation is deferred; see [WhatsApp activation](WHATSAPP_ACTIVATION.md).
