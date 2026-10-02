# Millco coupon WhatsApp OTP — connection and activation

## Current state

Implementation is ready for controlled Meta testing. MILLCO10 remains disabled. No production OTP is sent while WHATSAPP_OTP_ENABLED is absent/false or required connection settings are missing. Admin cannot activate an OTP-required coupon in that state. Local tests use injected simulated delivery; there is no HTTP or environment-based mock-code bypass.

The engine provides Apply coupon → Request code on WhatsApp → Enter six digits → Verify → Apply discount. No password or customer signup page is required. Requesting a code explicitly consents to that verification message, not marketing subscriptions. Email is a duplicate check and is not verified.

## Connection information needed

Use the intended Millco WhatsApp Business Platform account. Confirm the number-registration approach before migrating any existing WhatsApp Business app number.

- WHATSAPP_PHONE_NUMBER_ID: Meta's sending phone number ID, not the displayed telephone number.
- WHATSAPP_ACCESS_TOKEN: server-side token with access to send messages from that account.
- WHATSAPP_GRAPH_API_VERSION: supported version for the configured Meta application.
- WHATSAPP_OTP_TEMPLATE: approved AUTHENTICATION template name (suggested: millco_coupon_otp).
- WHATSAPP_OTP_LANGUAGE: exact approved language (for example en_US).
- COUPON_OTP_SECRET: unique cryptographically random secret, at least 32 characters. Generate locally; do not commit or expose in NEXT_PUBLIC variables.
- WHATSAPP_OTP_TEST_RECIPIENTS: comma-separated owner-approved test recipients in international digits without +, for controlled testing.
- WHATSAPP_OTP_DAILY_LIMIT: store-wide attempts per rolling 24 hours, default 100 (maximum 10,000).
- WHATSAPP_OTP_TEMPLATE_APPROVED: true only after confirming the correct authentication template is approved.
- WHATSAPP_OTP_ENABLED: true only when ready for the controlled test; keep the coupon disabled until the test starts.

Billing/payment setup and account eligibility must be confirmed in Meta. The public wa.me chat button does not supply API credentials. Chat automation and order-notification enable flags are independent from OTP sending.

## Template and controlled test

Create an AUTHENTICATION template with a Copy Code button, security recommendation, and a five-minute expiry footer. Do not add promotion text to the authentication message. The sender supplies the same six-digit code to the body text parameter and URL-button parameter at index 0. Meta determines account eligibility and template approval; real delivery is not verified by local tests.

After credentials are saved privately, run `node scripts/check-coupon-otp.mjs .env.millco`. It prints setting names/status only and does not send messages. Upload only to the Millco Vercel project, redeploy, restrict recipients to the approved test number, then temporarily enable a protected test coupon. Check actual receipt, incorrect code, correct code, discount, payment dismissal/retry and captured-payment recovery before enabling MILLCO10 for customers or removing the recipient restriction. Do not use live payment keys for these checks.

Reference: [Meta authentication Copy Code template](https://www.postman.com/meta/whatsapp-business-platform/request/6vkv46u/create-authentication-template-w-otp-copy-code-button).

## Security and costs

- Six-digit codes come from a cryptographic random generator. Only challenge-specific HMAC hashes are stored; no plaintext OTP is stored or returned by the API. Provider errors are redacted.
- Codes expire after five minutes, allow five guesses, and cannot be verified twice. A resend invalidates previous unverified challenges for that browser/coupon. Verification grants last 15 minutes until reserved for one checkout.
- A random HttpOnly, SameSite=Strict browser cookie binds the proof; it lasts 24 hours and is Secure on HTTPS. Session storage keeps only a challenge reference/contact key to restore the same tab after refresh. Client verified flags never authorize payment.
- A proof binds coupon, canonical phone and lowercase/trimmed email. Changes require an appropriate new verification. It is consumed atomically when a checkout is reserved. Either configured contact reuse rule blocks another checkout.
- Send limits: 60-second phone cooldown, five attempts per phone/24h, ten per browser/24h, and the configured store-wide cap. All are enforced atomically in the database. There is also an IP limit of ten send requests/hour and thirty verify requests/ten minutes. Failed/ambiguous send attempts count toward caps. Provider acknowledgement means accepted, not proof of phone delivery.
- Existing paid checkouts can complete after grant expiry or coupon changes. A matching browser/proof can resume the original Razorpay order after dismissal or refresh, without consuming another coupon use. Cart and contact details must match; changed carts or lost-browser reservations require store assistance. Pending coupon reservations are never automatically released because Razorpay orders can be paid later. Paid sessions cannot start another payment.
- Final orders use the saved pre-payment customer snapshot; callbacks cannot replace the verified contact with another phone/email.
- OTP tables/RPCs are service-role only. Never put credentials, OTP hashes, codes, cookie secrets or tokens in application logs.

Retain used challenge references while pending checkout recovery is possible. A maintenance task may delete only unused challenges older than seven days; there is no automatic cleanup job in this release. Such deletion does not affect 24-hour sending caps. Coupon/payment audit records and customer orders must not be deleted as OTP cleanup.

## Verification performed

Unit checks cover secure generation, digest separation, payload shape and disabled-by-default readiness. Local database checks cover wrong/expired codes, five-guess lockout, failed sending, resend invalidation, atomic daily caps, browser/contact binding, single consumption, repeated checkout requests, paid-checkout denial and verified customer snapshot preservation. Local browser tests exercise actual quote/verify routes with simulated sending, mobile display, resend cooldown, errors, verification, changed phone and refresh restoration. No real WhatsApp messages or charges were incurred.
