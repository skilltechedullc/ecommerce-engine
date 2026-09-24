# WhatsApp activation and verification

The code is prepared; real Meta and AI-provider verification is deferred until credentials and a number are supplied. Keep WHATSAPP_ENABLED, NEXT_PUBLIC_FEATURE_WHATSAPP_BOT and WHATSAPP_AI_ENABLED false until then.

## Customer flow

- MENU opens product browsing, cart, support and order tracking.
- Customers browse available variants and add quantities to a WhatsApp cart.
- Checkout sends a link to the website cart review. The link contains only variant IDs and quantities. The server loads current prices/stock, and the customer explicitly accepts replacing their website cart.
- Address collection and payment happen in the normal website checkout. The former independent WhatsApp payment-link/order insertion flow has been removed.
- TRACK asks for the full order ID from confirmation/status emails. The signed webhook sender must match the checkout phone after country-aware normalization. Another phone gets the same response as an unknown order. No customer address/email or order list is returned.
- Optional AI classifies free-form messages at the main menu into approved actions. Order replies are built from database data, never AI-generated. AI is not given order records or permission to choose customer identity. Unavailable/invalid AI falls back to the menu and explicit commands.

## Private deployment settings

Configure these privately when activating, not in Git:

- WHATSAPP_ENABLED=true
- NEXT_PUBLIC_FEATURE_WHATSAPP_BOT=true (requires rebuild)
- WHATSAPP_PROVIDER=meta
- WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN
- WHATSAPP_APP_SECRET (signature verification is mandatory, including local simulation)
- WHATSAPP_VERIFY_TOKEN (choose a unique value for the Meta verification handshake)
- WHATSAPP_GRAPH_API_VERSION (choose a currently supported version for the Meta app, in vNN.0 form)
- NEXT_PUBLIC_WHATSAPP_NUMBER (business number with country code)
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (standard write-capable token)
- Optional WHATSAPP_AI_ENABLED=true, ANTHROPIC_API_KEY and WHATSAPP_AI_MODEL; the default model is claude-haiku-4-5-20251001. Verify model access when activating. Website AI has its own NEXT_PUBLIC_FEATURE_AI_CHAT flag.

Webhook: /api/whatsapp/webhook, subscribe to messages in Meta. The handler checks the configured phone-number ID as well as the request signature. Status callbacks do not run the shopping bot.

Outbound order notifications use the existing template adapter. Configure approved templates for WHATSAPP_TEMPLATE_ORDER_CONFIRMED, WHATSAPP_TEMPLATE_ORDER_PROCESSING, WHATSAPP_TEMPLATE_ORDER_SHIPPED and WHATSAPP_TEMPLATE_ORDER_DELIVERED, plus WHATSAPP_META_TEMPLATE_LANGUAGE. The current Meta template body expects four text parameters, in order: customer name, full order ID, total amount, order status. Confirm template approval, opt-in and delivery with the actual account before enabling notifications.

## Reliability and limits

Redis serializes messages per sender and keeps prepared replies/progress for seven days to avoid reapplying cart changes on ordinary webhook retries. Provider/network failures return retryable errors. A network interruption after Meta accepts a message but before acknowledgement can still cause a repeated reply. There is also a crash window between session mutation and writing the reply receipt; this is not an exactly-once message system. No payment or order is created by the conversation itself.

Tracking currently requires a full order UUID; short legacy references are not accepted. Older emails may need the full ID supplied by support after verification. Sender normalization uses the configured store country rules; test international numbers for each client. Replies remain in English; broad multilingual conversation is outside this release.

## Verification before activation

1. Run unit checks, local conversation integration and browser cart-import checks.
2. Verify the Meta challenge and a valid signed incoming message for the configured business number.
3. Verify tampered signatures and another phone-number ID do not process messages.
4. Test browse/cart/checkout with the real test number; replay the same message ID.
5. Test TRACK for the sender's own order and a different customer's order. Confirm no private fields leak.
6. Test provider outage/retry, AI unavailable, AI free-form routing and menu fallback.
7. Test all approved outbound templates and inspect notification logs.
8. Only then enable the relevant flags for the intended store.

API references: [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api) and [Anthropic tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools).
