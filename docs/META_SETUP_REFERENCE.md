# Meta WhatsApp Setup Reference Card

## What WHATSAPP_PHONE_NUMBER_ID is

WHATSAPP_PHONE_NUMBER_ID is the unique Meta identifier for the WhatsApp business phone number used by your app.
Find it in Meta Developer Dashboard:
WhatsApp -> Getting Started -> Phone Number ID.

## What WHATSAPP_ACCESS_TOKEN is

WHATSAPP_ACCESS_TOKEN is the bearer token used to call Meta Graph API for sending WhatsApp messages.

- Temporary token: Available in WhatsApp -> Getting Started, expires in about 24 hours.
- Permanent token: Required for production. Use a System User access token from Meta Business Manager.

## What WHATSAPP_VERIFY_TOKEN is

WHATSAPP_VERIFY_TOKEN is your own shared secret string. You choose this value and place the same value in:
- .env.local
- Meta webhook configuration Verify Token field

Any string is valid as long as both sides match exactly.

## How webhook verification works

When you click Verify and Save in Meta dashboard, Meta sends a GET request to your webhook with:
- hub.mode
- hub.verify_token
- hub.challenge

Your endpoint must compare hub.verify_token with WHATSAPP_VERIFY_TOKEN.
If valid, return the hub.challenge value with HTTP 200.
If not valid, return HTTP 403.

## How incoming messages arrive

After subscription, Meta sends POST requests with JSON payloads to your webhook URL.
Message text is inside the nested entry -> changes -> value -> messages structure.

## Rate limits and pricing

Meta WhatsApp Cloud API free tier allows up to 1000 service conversations per month.
After that, conversation-based or per-message pricing applies depending on Meta pricing model and region.

## Production permanent token setup summary

1. Create or use a Meta Business Manager account.
2. Create a System User under Business Settings.
3. Assign the app and WhatsApp assets to that System User.
4. Generate a permanent System User access token with required WhatsApp permissions.
5. Replace temporary WHATSAPP_ACCESS_TOKEN with this permanent token in production environment.
6. Rotate and store tokens securely using your hosting provider secrets manager.

## Production webhook URL requirement

Webhook URL must be HTTPS with valid SSL.
If deploying on Vercel, HTTPS and SSL are handled automatically for your deployment URL.
