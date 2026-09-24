> Current demo branch, deployment and priorities: [PROJECT_STATUS.md](PROJECT_STATUS.md). The record below is historical context; it is not the current demo release sign-off.

# Ecommerce Engine TODO

Current rollout: a fresh neutral demo on new Vercel/Supabase projects. The old Millco deployment is out of scope. Historical checkmarks below include scaffolding and documentation, not always completed integrations; use FRESH_DEPLOYMENT.md for the supported release scope.

This is the priority roadmap for turning the current Millco store codebase into a reusable, client-owned ecommerce launch engine without breaking the working engine.

## Priority Principles

- [x] Keep `shop.millco.in` as Demo Store 001 and use it to visually verify engine changes.
- [x] Prefer small, tested changes over large rewrites.
- [x] Work locally first; do not connect hardening work directly to production Supabase.
- [x] Prepare and test migrations locally early, but apply production migrations only during a controlled rollout.
- [x] Harden the current engine before adding major new features.
- [x] Keep the first production model client-owned: each client gets their own deployment, Supabase, payment account, email account, domain, and integrations.
- [x] Keep SaaS/multi-tenant architecture as a future option, not the current priority.
- [x] Separate reusable engine logic from Millco-specific branding, copy, data, and credentials.

## Phase 0: Local Safety And Baseline Verification

- [x] Create a working branch before fixes begin.
- [ ] Confirm which branch/deployment currently powers `shop.millco.in` in the hosting provider dashboard. This is the only Phase 0 item that cannot be proven from local files.
- [x] Confirm Docker is installed locally.
- [x] Install/check Supabase CLI; available locally with `npx supabase`.
- [x] Decide local database strategy: Supabase local via Docker first, staging Supabase later.
- [x] Create safe local `.env` values before deeper hardening; see `env.local.phase0.example`.
- [x] Keep Razorpay, Resend, WhatsApp, shipping, and AI integrations in test/disabled mode for local hardening unless explicitly testing them.
- [x] Resolve Next.js build warning about inferred workspace root and multiple lockfiles.
- [x] Investigate production build failure: `EPERM` opening `.next/trace`; build passes with elevated filesystem permissions.
- [x] Re-run and record baseline results for `npm run lint`, `tsc --noEmit`, `npm run build`, and `npm audit`.
- [x] Create a Millco visual QA checklist covering homepage, products, product detail, cart, checkout, success page, admin products, admin orders, mobile layout, and notifications.

## Phase 1: Local Build And Tooling Health

- [x] Make local `npm run lint` pass.
- [x] Make local `tsc --noEmit` pass.
- [x] Make local `npm run build` pass.
- [x] Fix/document local build artifacts/permission issues without touching production.
- [x] Add a clear local verification command checklist; see `docs/LOCAL_VERIFICATION.md`.
- [x] Re-run `npm audit` and record vulnerable packages before upgrades.
- [x] Upgrade dependencies locally in small batches and verify after each batch.

## Phase 2: Local Schema And Code Alignment

- [x] Resolve `product_variants.name` vs `product_variants.weight` mismatch in code and local migrations.
- [x] Decide the canonical variant label column and update app code/migrations consistently: use `product_variants.weight`.
- [x] Fix WhatsApp/chat session table mismatch: app code uses `chat_sessions` with `channel = 'whatsapp'`.
- [x] Fix shipping migration trigger to use the project timestamp helper instead of schema-dependent `moddatetime`.
- [x] Prepare migration files for schema alignment, but do not apply them to production yet.
- [x] Test migrations on a fresh local Supabase database.
- [x] Add migration verification steps to confirm all expected columns, constraints, policies, triggers, and indexes exist; see `supabase/verify_phase2_schema.sql`.
- [x] Document the canonical database schema in one place; see `docs/CANONICAL_SCHEMA.md`.

## Phase 3: Local Checkout And Payment Hardening

- [x] Bind Razorpay payments to the exact server-calculated cart total before saving orders.
- [x] Store a pending checkout/order record when creating a Razorpay order.
- [x] Verify Razorpay payment/order server-side before fulfillment: amount, currency, captured/paid status, order ID, and payment ID.
- [x] Aggregate duplicate variant quantities before stock checks in `/api/create-order`.
- [x] Prevent paid checkout from succeeding when duplicate cart lines exceed combined stock.
- [x] Make stock reservation and order creation transactional where possible with compare-and-swap stock updates and rollback on failure.
- [x] Add customer-safe order confirmation token instead of showing order details from only `order_id` query param.
- [x] Add failed/payment-pending recovery tracking for cases where payment succeeds but order save fails.
- [x] Add tests or scripted checks for duplicate variants, stale price, insufficient stock, replayed payment ID, and order-save failure.
- [ ] Test checkout locally using Razorpay test mode only. This requires real Razorpay test credentials and an account-based manual payment run.

## Phase 4: Local Security Hardening

- [x] Enable and verify Supabase RLS for core commerce tables: `products`, `product_variants`, `product_images`, `variant_images`, `orders`, and `order_items`.
- [x] Define public catalog read policies that expose only active storefront-safe product data.
- [x] Ensure order/customer/admin data is never readable through the public anon Supabase key.
- [x] Verify WhatsApp/Meta webhook POST signatures using `x-hub-signature-256`.
- [x] Add CSRF protection for admin mutation routes.
- [x] Add image dimension checks after file-signature validation.
- [x] Add optional image re-encoding/sanitization after upload validation.
- [x] Validate uploaded images using file signatures instead of trusting MIME type alone.
- [x] Move AI chat rate limiting to the shared production rate limiter instead of in-memory limits.
- [x] Review and upgrade vulnerable dependencies reported by `npm audit`.
- [x] Upgrade Next.js after validating compatibility with the current app.
- [x] Upgrade transitive security-sensitive dependencies such as `axios`, `flatted`, `picomatch`, `postcss`, `uuid`, `ws`, and `follow-redirects`.
- [x] Review `@anthropic-ai/sdk` upgrade path because the audit fix is marked breaking.
- [x] Add a repeatable security checklist before launching each client store.
- [x] Test RLS locally before using it on any production database.

## Phase 5: Local Admin And Data Reliability

- [x] Make product create/update operations transactional through database RPC/stored procedure.
- [x] Avoid deleting and recreating variants on every product update unless necessary.
- [x] Use `orders.source` for channel analytics instead of inferring WhatsApp orders from address text.
- [x] Replace ad-hoc `console.log`/`console.error` usage with structured production-safe logging where useful.
- [x] Add audit logs for product, order, shipment, and payment changes.
- [x] Add real-world order states: payment_pending, payment_failed, cancelled, refunded, return_requested, returned where needed.
- [x] Add cancellation/refund flow.
- [x] Improve order lifecycle transitions and validation.
- [x] Add first-run empty states for admin screens so new store owners know what to do next.
- [x] Add simple admin help text/tooltips for product creation, variant setup, stock updates, and order handling.

## Phase 6: Local Engine Configuration Separation

- [x] Move all client-specific values into a clean store configuration model.
- [x] Separate Millco-specific branding, copy, products, contact details, legal pages, and integrations from reusable engine logic.
- [x] Avoid hardcoding Millco assumptions into core engine modules.
- [x] Support branding fields: store name, logo, favicon, colors, fonts, tagline.
- [x] Support contact fields: phone, WhatsApp, email, address, social links.
- [x] Support business fields: currency, locale, tax behavior, shipping zones, legal policy links.
- [x] Add feature flags for paid modules: WhatsApp automation, AI assistant, reviews, loyalty, advanced analytics, multi-language, multi-currency, shipping integrations.
- [x] Move remaining long marketing defaults out of `tenant.config.ts`.
- [x] Add admin UI for reviewing active store configuration.
- [x] Add database-backed draft/publish editing foundation for store configuration.
- [x] Add audit logs for configuration changes when store configuration editing exists.
- [x] Add preview support so config/theme changes can be checked before publishing.
- [ ] Switch runtime config loading to published `store_settings` after staging validation.

## Phase 7: Local And Staging Validation

- [x] Create a disposable local seed store to verify fresh setup.
- [x] Run fresh local setup from empty database to working storefront/admin.
- [x] Document that staging Supabase should be created only after local migrations pass.
- [ ] Create a staging Supabase project only after local migrations pass.
- [x] Document staging migration/RLS verification checklist.
- [ ] Apply migrations to staging Supabase and verify schema/RLS.
- [ ] Test staging checkout with Razorpay test mode.
- [ ] Test staging email with Resend test/dev settings.
- [ ] Test staging WhatsApp only with test credentials or disabled mode.
- [ ] Test staging manual shipping/order status flow.
- [ ] Run Millco visual QA against a preview/staging deployment before production.

## Phase 8: Controlled Production Rollout

- [x] Document production Supabase backup steps before applying any migration.
- [ ] Backup production Supabase before applying any migration.
- [x] Create a rollback plan before deploying high-risk checkout, migration, or security changes.
- [ ] Apply production migrations only after local and staging verification.
- [ ] Deploy code to production only after preview/staging checks pass.
- [x] Document production smoke test for homepage, product detail, cart, checkout, admin login, product edit, order view, and notifications.
- [ ] Smoke test production homepage, product detail, cart, checkout, admin login, product edit, order view, and notifications.
- [x] Document post-deploy monitoring for failed checkouts, failed emails, failed webhooks, and API errors.
- [ ] Monitor failed checkouts, failed emails, failed webhooks, and API errors after deployment.
- [x] Keep a post-deploy checklist for `shop.millco.in` as Demo Store 001.

## Phase 9: Client-Owned Deployment Foundation

- [x] Create a repeatable new-client setup script.
- [x] Generate environment variable templates per client.
- [x] Add safe Supabase migration planning automation.
- [x] Automate Supabase migration application.
- [x] Document Supabase storage bucket/policy setup through migrations.
- [x] Automate Supabase storage bucket/policy verification.
- [x] Add production readiness validation command.
- [x] Add Vercel deployment documentation or automation.
- [x] Add Railway/VPS deployment notes as secondary options.
- [x] Add domain/DNS setup checklist.
- [x] Add backup/export plan for products, orders, customers, and settings.
- [x] Add client offboarding/export checklist in case a client wants to leave or move providers.

## Phase 10: Base Client Store Package

- [x] Storefront with homepage, product listing, product detail, cart, checkout, and success page.
- [x] Custom admin backend so store owners never need to open Supabase directly.
- [x] Admin product management: add, edit, delete, activate/deactivate products, variants, stock, pricing, and images.
- [x] Admin order management: view orders, customer details, order items, payment details, and order status.
- [x] Basic order status workflow: pending, paid, processing, shipped, delivered.
- [x] Razorpay payment support with secure server-side verification.
- [x] Optional COD/manual payment mode for clients who need offline payment handling.
- [x] Basic email order notifications through Resend.
- [x] WhatsApp contact/support link without automation by default.
- [x] Manual shipping/order processing support.
- [x] Basic sales dashboard: revenue, orders, pending orders, low stock, and recent activity.
- [x] Store branding/configuration: logo, colors, contact details, legal pages, homepage copy, and social links.
- [x] Client handover operating guide.
- [x] Client handover flow with generated admin URL/login details.

## Phase 11: Product And Catalog Tools

- [x] Add CSV product import template and validator.
- [x] Add admin CSV product import writer.
- [x] Add admin CSV import UI.
- [x] Add XLSX product import support.
- [x] Add CSV export for products, variants, orders, and order items.
- [x] Add customer export once a dedicated customers table exists.
- [x] Add bulk product editing for price, stock, active status, category, and images.
- [x] Add category/subcategory management UI.
- [x] Add product image cleanup for unused uploads.
- [x] Add low-stock alerts on the admin dashboard.
- [x] Add inventory history.
- [x] Add seed/sample data for new stores so empty stores can be previewed quickly.

## Phase 12: Client-Owned Launch Wizard

- [x] Build an internal "Create New Client Store" wizard skeleton.
- [x] Keep the launch model client-owned: each client can use their own Supabase, Resend, Razorpay, domain, hosting, and shipping accounts.
- [x] Step 1: enter store identity, owner details, business category, logo, colors, and contact information.
- [x] Step 2: choose deployment target: Vercel, Railway, VPS/server, or manual deployment.
- [x] Step 3: connect Supabase using project URL, anon key, and service role key.
- [x] Step 4: run Supabase migrations from the wizard or setup script.
- [x] Step 5: create/verify Supabase storage buckets, policies, and RLS rules.
- [x] Step 6: connect Razorpay credentials and configure webhook secret.
- [x] Step 7: run a payment configuration health check.
- [x] Step 8: connect Resend credentials, sender email, and admin notification email.
- [x] Step 9: send a test email from the setup flow.
- [x] Step 10: configure WhatsApp number, and later optional Meta/Twilio automation credentials.
- [x] Step 11: configure shipping mode: manual first, provider integration later.
- [x] Step 12: configure pickup address and default shipping settings.
- [x] Step 13: create the first admin user and generate handover details.
- [x] Step 14: import products from CSV/XLSX or seed sample products.
- [x] Step 15: run final launch checks for homepage, product pages, cart, checkout, admin, email, and order status updates.
- [x] Step 16: generate a client handover summary with admin URL, login instructions, operating guide, and support notes.
- [x] Reflect package choices in the wizard so optional modules are enabled only when purchased.
- [x] Persist launch wizard state.
- [x] Execute provider checks from admin.

## Phase 13: Theme And Storefront Customization

- [x] Define reusable theme tokens for colors, typography, buttons, cards, and forms through CSS variables and theme presets.
- [x] Create at least 2-3 storefront theme presets.
- [x] Allow a client site to choose a preset through setup/env configuration.
- [x] Make homepage sections configurable: hero, categories, featured products, certifications, collections, best sellers, brand story, and final CTA.
- [x] Add image/media management for banners and homepage assets.
- [x] Ensure mobile layouts are polished for all presets with visual QA.
- [x] Clean mojibake/encoding artifacts in UI copy before client handover.

## Phase 14: Orders, Shipping, And Notifications

- [x] Add customer invoice/receipt generation.
- [x] Add customer order tracking page.
- [ ] Add payment-provider refund API integration once real Razorpay/store credentials are connected.
- [x] Add shipment tracking display for customers.
- [x] Add manual shipping line creation for stores that use local couriers.
- [ ] Add configurable shipping integrations for Shiprocket, Delhivery, and future providers.
- [x] Add a provider adapter pattern so new shipping lines can be added without rewriting order logic.
- [x] Add shipping rate rules by order value/free-shipping threshold and manual flat rate.
- [x] Add advanced shipping rate rules by order value, pincode, city/state, and provider-zone style rules.
- [x] Add notification templates editable from admin.
- [x] Add retry dashboard for failed notifications.
- [x] Add provider health checks for email, WhatsApp, payment, AI, Supabase, and shipping.

## Phase 15: Admin Users And Roles

- [x] Replace single password admin with real users before client-scale launch.
- [x] Add roles: owner, product manager, order manager, support, developer.
- [x] Add role-based permission foundation in APIs.
- [x] Add role-based permissions in the admin UI after real users exist.
- [x] Add password reset or invite flow.
- [x] Add session/device management.
- [x] Add optional 2FA for store owners/admins.
- [x] Create a demo-safe admin account or demo mode for sales presentations.

## Phase 16: Paid Add-On Modules

- [x] Define add-on: WhatsApp store/order automation.
- [x] Define add-on: AI chat/product assistant.
- [x] Define add-on: advanced analytics dashboard.
- [x] Define add-on: loyalty/referral system.
- [x] Define add-on: product reviews and moderation.
- [x] Define add-on: multi-language support.
- [x] Define add-on: multi-currency support.
- [x] Define add-on: shipping provider integration such as Shiprocket, Delhivery, or custom courier APIs.
- [x] Define add-on: product import/export service or bulk catalog setup.
- [x] Define add-on: custom theme/design beyond the standard presets.
- [x] Define add-on: monthly maintenance, updates, backups, and support.

## Phase 17: Grocery And UAE Readiness

- [x] Document grocery-style category requirements such as fruits, vegetables, dairy, bakery, snacks, household, meat/fish, frozen, and personal care.
- [x] Document AED currency and UAE locale defaults.
- [x] Document English/Arabic multi-language mode as a paid add-on.
- [x] Document right-to-left layout checks for Arabic.
- [x] Document local UAE contact/address formats.
- [x] Document delivery zones by emirate, city, area, or pincode/postal code equivalent.
- [x] Document delivery time slots for grocery orders.
- [x] Document minimum order amount rules.
- [x] Document free-delivery threshold rules.
- [x] Document same-day/next-day delivery settings.
- [x] Document COD/manual payment support where needed.
- [x] Document local payment gateway option planning for UAE clients if Razorpay is not suitable.
- [x] Document fast product search and category filtering needs for large grocery catalogs.
- [x] Document bulk product import needs for grocery catalogs.
- [x] Document stock/out-of-stock controls optimized for fast-moving grocery items.
- [x] Document offers/discount modules suitable for grocery promotions.
- [x] Document WhatsApp ordering/store module for grocery clients.
- [x] Document optional delivery staff/driver status workflow as a future module.

## Phase 18: Millco Demo Store Strategy

- [x] Treat `shop.millco.in` as Demo Store 001 for the ecommerce engine.
- [x] Keep Millco live as a real-world visual reference while improving the engine.
- [x] Use Millco to test storefront, cart, checkout, admin, order flow, notifications, and mobile UI after major changes.
- [x] Create a Millco demo data/content guideline so the store remains clean and presentable for sales demos.
- [x] Use Millco as the public sales demo when explaining the engine to future clients.
- [x] Add a "powered by ecommerce engine" internal note/docs reference, not necessarily visible on the storefront.
- [x] Maintain a stable demo admin flow that can be shown safely without exposing real secrets or sensitive customer data.

## Phase 19: Pricing And Sales Packaging

- [x] Define clear setup pricing tiers for India clients.
- [x] Define clear setup pricing tiers for UAE/international clients.
- [x] Basic Store package for small businesses: ecommerce website, product catalog, cart, checkout, admin panel, order management, basic branding, payment setup, and training.
- [x] Suggested Basic Store pricing: India `INR 15,000 - 35,000`; UAE `AED 1,500 - 3,500`.
- [x] Business Store package for local stores/grocery: Basic Store plus WhatsApp order support, product import, categories, coupons/offers, customer order tracking, email notifications, delivery/shipping settings, and improved homepage customization.
- [x] Suggested Business Store pricing: India `INR 40,000 - 85,000`; UAE `AED 4,000 - 8,000`.
- [x] Premium Store package for serious grocery/supermarket clients: Business Store plus WhatsApp automation, AI assistant, advanced analytics, multi-language, multi-currency, delivery zones/time slots, shipping/courier integration, loyalty/referral, and custom design.
- [x] Suggested Premium Store pricing: India `INR 90,000 - 250,000+`; UAE `AED 9,000 - 25,000+`.
- [x] Define monthly maintenance plans.
- [x] Suggested India maintenance: Basic support `INR 2,000 - 5,000/month`; managed support `INR 7,000 - 20,000/month`.
- [x] Suggested UAE maintenance: Basic support `AED 300 - 800/month`; managed support `AED 1,000 - 3,000/month`.
- [x] Create add-on pricing notes for WhatsApp store, AI assistant, shipping integration, multi-language, multi-currency, product upload/import, advanced analytics, custom design, and maintenance.
- [x] Position grocery/supermarket builds as business operations systems, not cheap brochure websites.
- [x] Define which changes are included in monthly maintenance and which are paid change requests.

## Phase 20: Documentation And Operations

- [x] Write "Launch A New Client Store" guide.
- [x] Write "Client Handover" guide.
- [x] Write "Admin User Manual".
- [x] Create a launch checklist for each client.
- [x] Create maintenance checklist after launch.
- [x] Create a pre-launch checklist that must be completed before handing any client their admin login.
- [x] Create a support and maintenance SOP for post-launch client requests.
- [x] Add production monitoring basics for uptime, failed checkouts, failed emails, failed webhooks, and API errors.
- [x] Add privacy/data ownership notes for client-owned deployments.
- [x] Add a full audit checklist covering payments, RLS, admin auth, uploads, webhooks, dependencies, migrations, and deployment.
- [x] Add regression tests for all audit fixes before marking them complete.

## Future Option: SaaS / Shared Multi-Tenant Platform

- [ ] Revisit only after client-owned deployments are stable and repeatable.
- [ ] If shared multi-tenant, add tenant ID isolation to all tables and APIs.
- [ ] Add tenant-aware admin login and store routing.
- [ ] Add per-tenant environment/integration credentials.
- [ ] Add tenant backup/export process.
- [ ] Add billing/subscription management for clients if needed.
