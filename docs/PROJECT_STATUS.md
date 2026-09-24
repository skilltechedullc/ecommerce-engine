# Project status and next steps

Last updated: 2026-09-24 (Asia/Dubai).

Status: agreed test-mode demo baseline verified and deployed. Baseline tag: `demo-v0.1.0`. See [Release verification](DEMO_RELEASE.md). Real WhatsApp/AI activation is deferred.

Start here when resuming work. This is the current status record; older phase reports and checked boxes describe historical work and may include unfinished scaffolding. Use [Fresh deployment](FRESH_DEPLOYMENT.md) for operational instructions. Update this file after each completed milestone, recording what was actually tested separately from what is planned.

## Current branch and deployment

| Item | Current value |
| --- | --- |
| Repository | https://github.com/skilltechedullc/ecommerce-engine |
| Active engine/demo branch | `codex/fresh-deployment` |
| Latest verified application commit | `d40aa8f1e76a2099da384ba7ab1ece2aaa43a64e` — final shipping-notification lifecycle fix |
| Demo | https://ecommerce-engine-demo.vercel.app |
| Demo admin | https://ecommerce-engine-demo.vercel.app/admin |
| Vercel project | `ecommerce-engine-demo` |
| Vercel production branch | `codex/fresh-deployment` |
| Verified deployment | `dpl_qAVtNfraR1iDc27P32PPMTj1bBrN` — READY |
| Payment mode | Razorpay test mode |
| Admin mode | Single password; no username in this mode |

The application commit above is the last verified functional release, not necessarily the newest documentation commit. Check Git and Vercel before starting another deployment. Do not assume `main` contains this work.

The old `shop.millco.in` deployment is outside this rollout. Its branch/settings have not been verified here. Do not redirect it to this branch or reuse its database for tests.

## Completed and verified

- Prepared a neutral demo on separate Vercel, Supabase and Upstash resources. Applied database migrations and seeded three demo products.
- Hardened checkout with an atomic database operation for orders and stock, duplicate-payment protection, payment validation, and retrying order save without charging again.
- Hardened admin sessions, permission checks, request-origin checks and production rate limiting.
- Tested a Razorpay test payment through checkout: payment captured, one order created, stock reduced once. Repeated save callbacks and signed simulated webhook deliveries did not duplicate the order; invalid webhook signatures were rejected.
- Tested confirmation email delivery. The owner also confirmed receiving a shipping-status email from the admin workflow.
- Verified desktop/mobile shopping flows and simplified storefront typography, layout, product illustrations, footer and admin styling.
- Removed the agency Launch menu, page and web setup endpoint. Local setup commands remain. Verified admin login and product access, missing Launch navigation, and 404 responses from `/admin/launch` and `/api/admin/launch/client-setup`, including authenticated access on the live demo.

Final baseline: lint, TypeScript, production build, 70 unit checks, two local database integration tests and four browser tests passed. Dependency audit reported zero vulnerabilities. Live desktop/mobile, real Razorpay webhook recovery, duplicate protection and confirmation/shipping email logs passed. No real Meta message or Anthropic API call was tested.

Verification history: the initial demo and visual update passed lint, TypeScript/build, 60 unit tests and three local browser tests. The Launch removal passed lint, build/type checking and the focused admin browser test, followed by live verification. The entire test suite was not rerun for that removal. Local browser verification used `localhost:3001` after the development server blocked the numeric loopback browser origin.

## Known limits and pending external checks

- This is a working test-mode demo, not a sign-off for real-money commerce or every historical roadmap feature.
- Actual Razorpay test webhook delivery is verified: it saved a captured test payment while the browser save request was deliberately blocked. Browser retry and duplicate signed webhook deliveries reused that order without further stock movement.
- Resend uses its demo sender, with delivery tested to the account email. Verify a sender domain and customer delivery before real customer use.
- WhatsApp and AI remain disabled. Sender-bound tracking, optional constrained AI intent routing and website checkout handoff are implemented and locally tested. Real Meta messages, approved notification templates and AI-provider calls still await configuration/testing. See WHATSAPP_ACTIVATION.md.
- Guest order tracking exists. Customer accounts are deferred.
- Shipping uses the manual workflow. Shipping-provider stubs are not completed integrations.
- Store settings snapshots do not update deployed storefront configuration; active branding/configuration still requires environment changes and redeployment.
- Admin invitation/reset email delivery and two-factor enrollment are not implemented. Do not advertise them as available.
- New checkout sessions store a private contact snapshot for captured-payment webhook recovery when browser callbacks are lost. Stock/price conflicts and legacy sessions without that snapshot still require operator review. Orders exposes unresolved verified/failed-save checkouts.
- Advertised module flags and historical phase checkmarks are not evidence that every add-on works.

## Agreed next steps, in order

1. [x] Remove Launch from client admin and disable its web setup endpoint; retain local setup tools.
2. [x] Complete WhatsApp order lookup using verified incoming sender identity and stored order/shipping records. Protect other customers' orders; never let AI invent status or grant access. Connect AI interpretation only with controlled tools and a deterministic fallback. Keep integrations disabled until configured.
3. [ ] Test WhatsApp with a Meta test number or customer number when supplied. Record code/simulation checks separately from real provider delivery tests. The owner has deferred number configuration.
4. [x] Run a final ecommerce review: checkout, payment retries/webhooks, stock, admin permissions, shipping notifications and customer tracking. Resolve or explicitly record remaining release blockers and untested integrations.
5. [x] Record a versioned engine baseline and handover instructions after the agreed scope passes. Completion means that scope is verified, not that every possible niche or future feature has been built.
6. [ ] Prepare Millco after the completed engine review: its own branding, catalog, configuration, credentials and deployment. Do not silently modify the old live site. Disabled WhatsApp may remain pending external testing, but must not be called complete.

## Confirmed Millco setup

- Domain: `shop.millco.in`.
- Selling country: India.
- Currency: INR.
- Hosting and maintenance: agency-managed; billing and suspension are manual.
- WhatsApp number: owner will provide later; keep disabled.
- Open decision: start fresh, migrate existing products only, or preserve existing products and orders. Do not assume a migration scope or modify existing Millco data before this is resolved.

## Product direction and deferred work

Focus now on product-based ecommerce: finish the demo, then Millco and similar stores. Cosmetics and general retail can reuse the commerce foundation with suitable presentation and catalog configuration. Tyre fitment, wholesale pricing/quotes and advanced variant needs require an assessment and possibly additional work; they are not promised built-in features.

Service businesses such as AC maintenance are outside this release. A self-service store builder, private agency dashboard, customer accounts and a multi-tenant platform are deferred. The owner chose agency-managed hosting: clients receive store-admin access; the agency manages infrastructure and maintenance. Clients retain their domain, payments, business identity and business data. Billing and suspension will be manual; no automation is planned now. Theme differences do not require duplicating the whole engine by default; determine a client's actual needs before choosing configuration, extensions or a separate application.

## Git and record-keeping decisions

- Leave existing branches, forks and history in place at the owner's request. No cleanup/deletion is planned.
- Continue current engine work on `codex/fresh-deployment`; do not overwrite `main` or create Millco branches implicitly.
- Keep meaningful commits as the detailed change history. Use this document for current state and next actions, rather than reproducing every commit here.
- Do not copy credentials, admin passwords, customer records or private environment contents into documentation or Git. Private `.env.fresh` and access/setup files remain ignored.
- Retaining old branches is fine for continuity, but it does not guarantee that historical content is free of secrets. No full historical secret audit is claimed here.

## Milestone record

| Application commit | Outcome |
| --- | --- |
| `37f86c8` | Neutral demo deployment, checkout/admin hardening, isolated provider setup and validation |
| `bd8f5bb` | Storefront typography, layout and demo product presentation polish |
| `6abab31` | Removed agency Launch UI and setup endpoint; verified live |
| `b7b3c79` | WhatsApp tracking/AI routing, website cart handoff and captured-payment recovery |
| `d40aa8f` | Shipping email lifecycle and concurrent status protection; verified application baseline |

For each future milestone, update the date, verified application commit/deployment, evidence, outstanding limits and next unchecked task. Keep this file free of credentials.
