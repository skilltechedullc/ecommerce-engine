# Millco WhatsApp activation handover

Website chat button: +91 9048984814. Direct chat is independent of automated replies. Automation remains disabled until account configuration and real delivery tests pass.

## Prepared in the project

- Signed webhook: https://shop.millco.in/api/whatsapp/webhook
- Unique verification token generated in private .env.millco; never put its value in this document.
- MENU, product/size browsing, quantity selection, cart review and website checkout handoff.
- TRACK plus the full order ID from email. The sender must be the checkout phone; another number cannot retrieve the order. Replies include recorded status and available shipment tracking, not private addresses or emails.
- Optional AI routes a message to an approved menu action only. Tracking results come from the database.
- Sender locks and duplicate-message handling; retryable provider failures.
- Human support via info@millco.in or +91 9048984814.

## Account tasks that must wait for access

1. Configure a Meta app and WhatsApp Business Account with a test number first. Supply the phone number ID, access token, app secret and supported Graph API version. Confirm how the existing business number will be connected before changing its registration.
2. In Meta, register the webhook above with the generated verify token and subscribe to messages for the correct account. The token challenge can be checked while message processing remains disabled.
3. Set WHATSAPP_ENABLED and NEXT_PUBLIC_FEATURE_WHATSAPP_BOT to true for the controlled test, then rebuild. Confirm a signed incoming message from the permitted test recipient. Do not enable on credentials alone without these checks.
4. Test MENU, browsing, variant quantity, cart link, own-order tracking, another customer's order denial, duplicate delivery and a provider failure/retry. Verify both national checkout numbers and international WhatsApp numbers.
5. Enable optional WHATSAPP_AI_ENABLED only with a verified Anthropic key. Test a free-form product request, a tracking request and AI failure fallback.
6. For outbound updates, obtain customer opt-in and approve the templates below. Enter the approved names and language in the private configuration, then test each lifecycle event. Code cannot create Meta approval or verify real delivery without account access.

## Suggested utility templates for Meta review

All use four body parameters in this exact order: customer name, full order ID, formatted total amount, order status. Use text-only bodies with no header or button parameters to match the current adapter. Meta determines approval/category.

- millco_order_confirmed: Hello {{1}}, your Millco order {{2}} has been confirmed. Order total: {{3}}. Current status: {{4}}. Reply TRACK followed by your full order ID for updates.
- millco_order_processing: Hello {{1}}, we are processing your Millco order {{2}}. Order total: {{3}}. Current status: {{4}}. Reply TRACK followed by your full order ID for updates.
- millco_order_shipped: Hello {{1}}, your Millco order {{2}} has been shipped. Order total: {{3}}. Current status: {{4}}. Reply TRACK followed by your full order ID for available shipment details.
- millco_order_delivered: Hello {{1}}, your Millco order {{2}} is marked delivered. Order total: {{3}}. Current status: {{4}}. If you need help, contact info@millco.in.

Use synthetic examples such as Alex, 00000000-0000-4000-8000-000000000011, INR 429.00, Shipped for template review. Processing notifications additionally require SEND_PROCESSING_NOTIFICATIONS=true if desired. Store approved template names in WHATSAPP_TEMPLATE_ORDER_CONFIRMED, WHATSAPP_TEMPLATE_ORDER_PROCESSING, WHATSAPP_TEMPLATE_ORDER_SHIPPED and WHATSAPP_TEMPLATE_ORDER_DELIVERED. Set WHATSAPP_META_TEMPLATE_LANGUAGE to the approved language code.

## Checks and limits

Run `node scripts/check-whatsapp-activation.mjs .env.millco` for a secret-safe list of missing configuration. This is a configuration check, not proof of Meta activation. Existing automated tests cover ownership, tampering, wrong business number, retries, concurrency and cart payload validation. The local conversation simulation covers menu-to-checkout handoff and tracking prompts.

Replies are in English. Legacy short order references are unsupported; full IDs are required. An ambiguous provider acknowledgement can still cause a repeated reply; this is not exactly-once delivery. Courier tracking exists only when shipment details have been recorded. Meta account setup, template approval and actual phone delivery remain unverified until credentials are supplied.

References: [Meta Cloud API documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [Meta template API](https://www.postman.com/meta/whatsapp-business-platform/folder/lczy75a/templates).