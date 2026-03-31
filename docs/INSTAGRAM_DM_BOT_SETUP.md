# Instagram DM Bot Setup Guide

This guide explains how to set up and configure the Instagram Direct Message bot for your ecommerce engine.

## Architecture Overview

The Instagram DM bot uses the same conversational state machine and order creation logic as the WhatsApp bot, but communicates through Instagram Direct Messages via Meta's Graph API. The bot:

- Receives incoming DMs from customers
- Manages conversation state per sender
- Allows customers to browse products, add to cart, and checkout
- Creates orders in the same backend as the website and WhatsApp bot
- Sends payment links via Razorpay

## Prerequisites

- An Instagram Business Account
- A connected Facebook Page
- Meta Developer App with Instagram product added
- Same app can be used for WhatsApp (or create a separate one)
- Permanent Page Access Token from Meta Business Suite
- Your Facebook Page ID (not the Instagram Account ID)

## Step 1: Create or Set Up Meta Developer App

If you don't already have a Meta app set up:

1. Go to [Meta Developers](https://developers.facebook.com/apps)
2. Create a new app or use an existing one
3. Choose **Business** as the app type
4. In the app dashboard, click **Add Product**
5. Find **Instagram** and click **Add**
6. Repeat for **WhatsApp** if also setting up WhatsApp bot (or if already set up, both products can share one app)

## Step 2: Connect Your Instagram Business Account

1. In your Meta app dashboard, go to **Instagram** → **Settings**
2. Click **Add Instagram Business Account**
3. Search and select your Instagram Business Account
4. Grant necessary permissions

## Step 3: Generate Access Tokens

### Permanent Page Access Token

1. Go to **Settings** → **Access Tokens**
2. Generate a new **Page Access Token** (this is permanent)
3. Copy this token to your env file as `INSTAGRAM_PAGE_ACCESS_TOKEN`

### Find Your Page ID

1. Go to your Facebook Page
2. From the URL: `facebook.com/your-page-id/` → copy the numeric ID
3. Copy this to your env file as `INSTAGRAM_PAGE_ID` and `NEXT_PUBLIC_INSTAGRAM_PAGE_ID`

## Step 4: Set Up Webhook

### Create Verify Token

Choose any secure string (e.g., a random 32-character secret) to use as your verify token.

### Configure Webhook in Meta Console

1. In your Meta app, go to **Instagram** → **Settings** → **Webhooks**
2. Under **Webhooks**, click **Edit Subscription**
3. Enter your webhook details:
   - **Callback URL**: `https://yourdomain.com/api/instagram/webhook`
   - **Verify Token**: Enter the verify token you created above
4. Click **Verify and Save**

### Subscribe to Messages Field

1. In the same **Webhooks** section, find **Instagram** webhooks
2. Under **Subscriptions**, ensure these fields are subscribed:
   - `messages` (for incoming DMs)
   - `message_echoes` (optional, for sent message tracking)
3. Click **Add** to subscribe to any missing fields

### Update Environment Variables

```env
INSTAGRAM_PAGE_ACCESS_TOKEN=your_permanent_page_access_token
INSTAGRAM_PAGE_ID=your_facebook_page_id
INSTAGRAM_VERIFY_TOKEN=your_verify_token
NEXT_PUBLIC_INSTAGRAM_PAGE_ID=your_facebook_page_id
NEXT_PUBLIC_FEATURE_INSTAGRAM_DM_BOT=true
```

## Step 5: Deploy to Production

In your Vercel (or deployment platform) environment:

1. Add all Instagram env vars (see above)
2. Make sure `NEXT_PUBLIC_FEATURE_INSTAGRAM_DM_BOT=true`
3. Redeploy your app

## Testing the Bot

1. Using a secondary Instagram account (not the business account), visit your business Instagram profile
2. Send a Direct Message to your business account
3. Expected: Bot responds automatically with the welcome menu:
   ```
   Welcome to [Your Store]!
   
   Please choose an option:
   1. Browse products
   2. View my cart
   3. Help
   ```

### Troubleshooting

If the bot doesn't respond:

1. **Check bot is enabled**: Verify `NEXT_PUBLIC_FEATURE_INSTAGRAM_DM_BOT=true` in env
2. **Check webhook URL**: Confirm it's accessible at `https://yourdomain.com/api/instagram/webhook`
3. **Check Meta app subscriptions**: Go to Meta console and verify `messages` field is subscribed
4. **Check session table**: Verify `chat_sessions` table exists in Supabase and has `channel` column
5. **Review logs**: Check application logs for `[instagram]` errors

### Test Conversation Flow

1. Send message: `1` (Browse products)
   - Bot should list available products
2. Send message: `1` (Select first product)
   - Bot should list variants
3. Send message: `1` (Select first variant)
   - Bot asks for quantity
4. Send message: `2` (Select 2 units)
   - Bot adds to cart and shows post-add menu
5. Send message: `2` (View cart)
   - Bot shows cart contents
6. Send message: `1` (Checkout)
   - Bot asks for name
7. Enter your name (e.g., `John Doe`)
   - Bot asks for address
8. Enter address (e.g., `123 Main St, City, 12345`)
   - Bot shows order summary, asks YES/NO
9. Send message: `YES`
   - Bot creates order and sends payment link
10. Click payment link and complete test payment (test mode)
    - Order status updates, customer receives confirmation

## Implementation Details

### Session Storage

Customer sessions are stored in the `chat_sessions` Supabase table with:
- `phone`: The Instagram sender ID (numeric PSID)
- `channel`: Set to `'instagram'` for all Instagram conversations
- `step`: Current step in conversation (menu, browsing, checkout_name, etc.)
- `cart`: JSON array of selected products
- `customer_name`: Name entered during checkout
- `customer_address`: Address entered during checkout

### Order Creation

When a customer completes checkout:
1. Order is created in the `orders` table with:
   - `source: 'instagram'` (for analytics)
   - `customer_phone: sender_id` (the Instagram PSID)
   - `razorpay_order_id` and `razorpay_payment_id` for payment tracking
2. Payment link is generated via Razorpay
3. Customer receives payment link in Instagram DM

### Differences from WhatsApp Bot

| Aspect | WhatsApp | Instagram |
|--------|----------|-----------|
| **Sender ID Type** | Phone number (string) | PSID (numeric ID) |
| **Message Format** | Text messages via Twilio/WATI/Gupshup | Text via Meta Graph API |
| **24-Hour Window** | No restrictions | Meta enforces: can only reply within 24h of customer's last message |
| **Media Sharing** | Supports images, documents | Text and basic links |
| **Payment Link** | Can embed in message | Send as plain text URL |
| **Webhook Endpoint** | `/api/whatsapp/webhook` | `/api/instagram/webhook` |
| **Payload Format** | WhatsApp Cloud API format | Instagram/Messenger format |

### 24-Hour Messaging Policy

Meta enforces a 24-hour messaging window on Instagram:

- Bot can only send messages **within 24 hours of the customer's last message**
- After 24 hours, further bot-initiated messages will fail
- Workaround: Use sponsored ads or website notifications to re-engage customers after 24h
- This is an Instagram/Meta platform policy, not configurable in the bot

## Advanced Configuration

### Using Separate Meta Apps

If you prefer separate apps for WhatsApp and Instagram:

1. Create a second Meta app for Instagram
2. Set up Instagram product and webhook separately
3. Use different access tokens and page IDs
4. The bot logic handles both via the `channel` parameter

### Supporting Additional Channels

To add another channel (e.g., Facebook Messenger, TikTok):

1. Create `lib/{channel}/meta.ts` with a `send{Channel}Message()` function
2. Add channel to `export type Channel` in `lib/chat/sender.ts`
3. Add case to the `sendMessage()` function in `lib/chat/sender.ts`
4. Create webhook at `app/api/{channel}/webhook/route.ts`
5. Call `handleIncomingMessage(senderId, text, '{channel}')` from webhook
6. Test thoroughly with proper session isolation per sender + channel

## Monitoring and Analytics

### View Sessions

Check active conversations in Supabase:

```sql
SELECT 
  channel, 
  phone, 
  step, 
  created_at, 
  updated_at 
FROM chat_sessions 
WHERE channel = 'instagram' 
ORDER BY updated_at DESC;
```

### View Orders by Channel

```sql
SELECT 
  id, 
  source, 
  status, 
  total_amount, 
  created_at 
FROM orders 
WHERE source = 'instagram' 
ORDER BY created_at DESC;
```

## Support and Troubleshooting

### Common Issues

**Q: Bot responds to some messages but not others**
- Check Meta's 24-hour messaging window (described above)
- Manually reply to the customer first, this resets the 24-hour window

**Q: Payment link doesn't work**
- Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are correct
- Check Razorpay account is in live mode (not test mode)

**Q: Webhook keeps failing verification**
- Verify `INSTAGRAM_VERIFY_TOKEN` matches what you entered in Meta console exactly
- Callback URL must be HTTPS and publicly accessible
- Test with: `curl https://yourdomain.com/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test_challenge`

**Q: Customer sees old cart/wrong session**
- Session is identified by: `channel + sender_id`
- If sender ID changes or channel is wrong, creates new session
- Check `chat_sessions` table to verify session exists with correct channel

### Debug Logging

Enable debug logs by temporarily adding to `lib/instagram/meta.ts`:

```typescript
console.log('[instagram] sending:', { to, message })
console.log('[instagram] response:', { status, data })
```

Then check application logs after sending test message.

## Next Steps

1. ✅ Complete Meta Developer Console setup
2. ✅ Deploy code with Instagram env vars
3. ✅ Test webhook verification
4. ✅ Send first test message
5. ✅ Monitor logs and sessions
6. ✅ Promote bot to customers via Instagram bio or ads
7. ✅ Track conversion metrics in `orders` table where `source = 'instagram'`

## Resources

- [Meta Developer Docs: Instagram APIs](https://developers.facebook.com/docs/instagram)
- [Meta Developer Docs: Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [Webhook Reference](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Send API Reference](https://developers.facebook.com/docs/messenger-platform/reference/send-api)
