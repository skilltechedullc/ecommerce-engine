# Demo baseline: demo-v0.1.0

Verified on 2026-09-24. Application commit: d40aa8f1e76a2099da384ba7ab1ece2aaa43a64e.

- Site: https://ecommerce-engine-demo.vercel.app
- Branch: codex/fresh-deployment
- Vercel project: ecommerce-engine-demo
- Verified application deployment: dpl_qAVtNfraR1iDc27P32PPMTj1bBrN (READY)

The baseline tag includes the release documentation. Documentation-only commits may trigger an identical application rebuild; the commit above identifies the tested application code.

## Scope

Neutral product-commerce demo with catalog/cart, Razorpay test checkout, atomic stock/order persistence, guest tracking, admin operations, manual shipping and emails. Launch setup remains local-only. WhatsApp code includes shopping/cart, website checkout handoff, sender-bound order tracking, optional constrained AI intent routing and retry handling. WhatsApp and AI stay disabled pending real provider configuration/testing.

## Verification

| Check | Result |
| --- | --- |
| ESLint, TypeScript, production build with fresh demo settings | Passed |
| Unit checks | 70 passed |
| Local database integration | 2 passed: payment recovery and WhatsApp conversation/handoff |
| Transactional checkout SQL | Atomic writes, duplicate protection, access restrictions and rollback passed |
| Local browser suite | 4 passed: desktop/mobile COD, tracking privacy, admin/CSRF/removed Launch, canonical-price cart handoff |
| Dependency audit | 0 reported vulnerabilities at verification time |
| Fresh Supabase and Upstash readiness | Passed |
| Live desktop/mobile | Shopping, tracking and cart/checkout handoff passed at 1440 and 390 pixels; no page errors or horizontal overflow |
| Real Razorpay test recovery | Captured payment recovered through actual provider webhook while browser save was blocked |
| Browser retry | Opened the recovered order confirmation without another payment |
| Duplicate webhooks | Two signed replays left one order and no further stock movement; invalid signature returned 400 |
| Live notifications | Confirmation and shipping email logs report sent, one attempt each |
| Admin | Login and Orders access passed; Launch absent and old page/API return 404 |
| Disabled integrations | Meta webhook returns Disabled; website AI rejects requests while disabled |
| Visual review | Mobile cart handoff page inspected |

A synthetic order named Demo Recovery Test remains in the demo, marked Shipped. It is not a real fulfilment request. Only the approved demo email recipient was used. No production Millco data or deployment was changed.

## Recovery and rollback

Migration 202609240001_checkout_recovery.sql was applied to the local and fresh demo databases before deployment. It adds a private contact snapshot to the service-role-only checkout_sessions table. Future stores must apply every migration before deploying.

New paid checkouts recover from lost browser callbacks. Stock/price conflicts still need operator review; inspect Payments needing review on the Orders page and reconcile with Razorpay. Do not charge again to resolve a captured payment. Legacy sessions without snapshots require manual recovery. Stock is not reserved while payment is open.

The previously ready deployment dpl_5AP1LwvJK28ocTageUUnycNg8zw8 (b7b3c79) is a rollback reference. The additive database column can remain during rollback. Existing branches, deployments and data should not be deleted as routine cleanup.

## Millco handover gates

Confirmed: shop.millco.in, India, INR; agency-managed hosting, manual billing/suspension, WhatsApp number later.

Pending:

- Owner decision on fresh catalog versus migrating products and/or orders.
- Millco-specific branding, delivery rules, policy/contact details and isolated infrastructure/configuration; do not overwrite the old site implicitly.
- Appropriate commercial hosting plan, backups, access and operational monitoring.
- Intended merchant payment account and verified email sender domain; Millco-specific payment, webhook and customer-email tests before real orders.
- Real WhatsApp/AI credentials, approved templates and message tests before activation. See [WhatsApp activation](WHATSAPP_ACTIVATION.md).

Customer accounts, automated billing/suspension, self-service store creation, service-business booking, advanced shipping adapters and historical placeholder modules are outside this baseline.

The agreed demo scope is ready for Millco preparation. This record does not mean Millco is already deployed or that live WhatsApp has been tested.
