# Millco onboarding

Status: deployed to shop.millco.in on 2026-10-01 with Razorpay test payments and a fresh catalog.

## Confirmed

- Store: Millco
- Domain: shop.millco.in
- Country/currency: India / INR
- Managed by the agency; billing and suspension remain manual
- Start with a fresh catalog/database; no old customer orders will be imported by default
- WhatsApp number later; WhatsApp and AI remain disabled
- Baseline: demo-v0.1.0
- Store production branch: codex/millco-production
- Demo branch remains codex/fresh-deployment

## Prepared

Private settings are in the ignored .env.millco file. Brand name, domain, INR, Indian phone defaults and the existing millco-logo.svg asset are selected. Admin/session/webhook secrets were generated separately from the demo. Provider credentials and owner-confirmed contact details are saved privately. Generic defaults avoid inheriting old unverified address, certification and delivery claims. The owner approved the existing Millco logo.

Do not deploy using the current local .vercel link: it belongs to the demo. Create/select a separate Millco Vercel project explicitly once settings are complete. Keep the old Millco site/domain routing unchanged until staging passes.

## Next steps

1. Collect a new Millco Supabase Project URL, publishable key, server key and database connection; apply all migrations and prepare image storage. Do not load the demo seed.
2. Collect separate Upstash settings and the intended Razorpay merchant settings. Test mode first for verification; live settings only for the final merchant launch.
3. Configure Resend with a verified sender domain. Confirm public support email/phone, legal business name/address, delivery areas and charges, and policies.
4. Create an isolated Vercel project and connect this branch; import only Millco settings. Use the temporary deployment URL while testing.
5. Add real products, variants, prices, stock and images through admin; do not invent saleable catalog details.
6. Verify admin access, checkout, payment webhook recovery, customer tracking and customer/admin email delivery.
7. Connect shop.millco.in after reviewing the current domain assignment and completing launch checks. Set the canonical URL and final webhook URLs, then rebuild and verify again.

Secrets stay outside Git. Existing branches and the demo are retained. An empty catalog is a preparation state, not a ready-to-sell store.

## Setup verified — 2026-10-01

- Millco Supabase session-pooler connection works; all 27 engine migrations applied successfully. Product-image storage verified. No demo catalog seed was run.
- Supabase public/server APIs, commerce schema and separate Upstash Redis connection pass connectivity checks.
- Owner authorized reuse of the demo Razorpay test keys; authentication verified. Real payments remain a launch prerequisite.
- Resend confirms millco.in is verified. Sender, public support and admin notification inbox: info@millco.in.
- Public phone: +91 9048984814.
- Legal operator: Millco Organic & Fresh Food Products; 4-313/A, Arakkal, Thennala, Malappuram, Kerala 676508, India.
- Delivery across India; shipping ₹50 for subtotal below ₹1,000 and free at ₹1,000 or above (boundary explicitly confirmed).
- Cash on delivery disabled. Existing Millco logo approved. WhatsApp remains deferred.
- Next: isolated Vercel staging deployment, real catalog entry, payment webhook configuration and end-to-end checks; then live payment settings and final domain cutover. Return/refund and dispatch policies still require owner confirmation.
- Existing demo deployment and shop.millco.in routing were not changed.
## Production-domain deployment — 2026-10-01

Owner approved direct replacement of the existing millco-shop project, with an empty catalog and test payments. Vercel production branch is now codex/millco-production; deployed commit c6aa1b097864f7fee64e5202d1cc7744b8e6f3ec. Deployment dpl_2XT885oWM3EJsNgd5s2kbExREBxo is READY and assigned to shop.millco.in. Node.js 24 and the private Millco production settings are applied. The demo project was not modified.

Live verification passed for homepage, products and order tracking at 1440px and 390px with no browser errors or horizontal overflow. Admin login and products/orders pages passed; WhatsApp remains disabled. Checkout/payment/email end-to-end testing awaits a product and the Millco Razorpay webhook setup. Real selling also requires live payment keys and confirmed policies.

The previous deployments were retained. Local Vercel project metadata and environment metadata backups are under ignored node_modules/.millco-vercel-*.json; credentials remain outside Git. These notes describe later deployment actions and supersede earlier staging plans.