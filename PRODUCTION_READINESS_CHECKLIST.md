# Production Readiness Checklist

Project: Millco Shop
Environment: Production
Target launch date: __________
Owner: __________

## 1. Secrets And Environment Variables

- [ ] All required environment variables are set in production hosting.
- [ ] No placeholder values remain (for example ADMIN_PASSWORD, RAZORPAY_WEBHOOK_SECRET).
- [ ] NEXT_PUBLIC_SITE_URL is set to the real production domain.
- [ ] NEXT_PUBLIC_SUPABASE_URL points to the production Supabase project.
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY points to production and is valid.
- [ ] SUPABASE_SERVICE_ROLE_KEY is set only on server-side environments.
- [ ] RAZORPAY_KEY_SECRET is set and not exposed to client-side code.
- [ ] RESEND_API_KEY is set and verified.
- [ ] NEXT_PUBLIC_WHATSAPP_NUMBER is set and tested.
- [ ] Local .env.local is excluded from git and not committed.
- [ ] Any previously exposed keys have been rotated.

## 2. Supabase Security And Data Access

- [x] RLS enabled on public.product_images.
- [x] RLS enabled on public.variant_images.
- [x] Read policy for active product images exists.
- [x] Read policy for active variant images exists.
- [ ] Security Advisor warnings reviewed and resolved (or accepted with documented reason).
- [ ] Service-role usage is limited to server routes only.
- [ ] Public anon policies allow only intended read access.
- [ ] Database backups/snapshots policy confirmed.

## 3. Payments And Webhooks

- [ ] Razorpay production keys configured.
- [ ] Razorpay webhook endpoint configured to production URL.
- [ ] RAZORPAY_WEBHOOK_SECRET matches dashboard value.
- [ ] Successful payment flow tested end to end in production mode.
- [ ] Failed payment and retry behavior tested.
- [ ] Duplicate webhook/idempotency behavior validated.
- [ ] Order save and status transitions validated after payment.
- [ ] Webhook events enabled: order.paid, payment.captured, payment.failed, payment.dispute.created, refund.processed.

## 4. Authentication And Admin Safety

- [ ] ADMIN_PASSWORD is strong and unique.
- [ ] Admin access tested from clean browser session.
- [ ] Unauthorized admin route access is blocked.
- [ ] Admin product create/edit/delete flows tested.
- [ ] Admin order status update flow tested.

## 5. Email And Notifications

- [ ] RESEND_API_KEY and EMAIL_FROM_ADDRESS configured.
- [ ] Test email deliverability verified.
- [ ] SPF, DKIM, and DMARC configured for sending domain.
- [ ] Order-related email content checked for correctness.
- [ ] WHATSAPP_ENABLED, WHATSAPP_PROVIDER, and template IDs configured (if WhatsApp is enabled).
- [ ] Provider credentials configured (Twilio / WATI / Gupshup based on choice).
- [ ] notification_logs table exists and receives events.
- [ ] Failed-notification retry action validated from admin order details.

## 6. Frontend Quality And UX

- [ ] Homepage, product listing, product detail, cart, and checkout flows tested on desktop.
- [ ] Homepage, product listing, product detail, cart, and checkout flows tested on mobile.
- [ ] Sticky CTAs do not overlap critical UI on mobile.
- [ ] WhatsApp CTA is visible and non-intrusive.
- [ ] Empty states are clean and actionable.
- [ ] Navigation anchors and section jumps behave correctly.

## 7. Performance, Build, And Runtime

- [ ] npm run lint passes.
- [ ] npm run build passes.
- [ ] Production server starts with no missing env errors.
- [ ] No critical errors in browser console on key pages.
- [ ] Image loading is acceptable on slower mobile networks.

## 8. SEO, Domain, And Metadata

- [ ] Production domain DNS is configured.
- [ ] robots.txt and sitemap.xml are reachable on production.
- [ ] Canonical URLs and metadata render correctly.
- [ ] Open Graph preview validated for key pages.

## 9. Observability And Operations

- [ ] Error monitoring is enabled (platform logs at minimum).
- [ ] Deployment rollback plan is documented.
- [ ] Incident contact and escalation owner assigned.
- [ ] Post-launch monitoring window scheduled (first 24 to 72 hours).

## 10. Final Go/No-Go

- [ ] Smoke test complete: browse, cart, checkout, payment, success page.
- [ ] Smoke test complete: admin login, product update, order update.
- [ ] Security review complete.
- [ ] Stakeholder sign-off complete.
- [ ] Launch approved.

## Post-Launch Follow-Up

- [ ] Verify first successful live order in dashboard.
- [ ] Verify webhook events and order status sync.
- [ ] Verify delivery of transactional emails.
- [ ] Review conversion funnel and drop-off points.
- [ ] Open issues list created for phase-2 improvements.
