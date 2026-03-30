# WhatsApp Bot Local Testing Checklist

## SECTION 1 - Prerequisites

- Node 18+ is installed and npm run dev works.
- ngrok is installed (download from https://ngrok.com/download).
- Supabase migration is applied.
- .env.local has all three WhatsApp vars filled.

## SECTION 2 - Meta Developer App Setup

1. Go to https://developers.facebook.com.
2. Click Create App, choose Business type, and name it anything.
3. Add the WhatsApp product from the app dashboard.
4. Go to WhatsApp -> Getting Started.
5. Copy Temporary Access Token and paste it as WHATSAPP_ACCESS_TOKEN in .env.local.
6. Copy Phone Number ID and paste it as WHATSAPP_PHONE_NUMBER_ID in .env.local.
7. Note the test WhatsApp number Meta provides. You will send messages to this number.

## SECTION 3 - Start Local Servers

Terminal 1:

    npm run dev

Terminal 2:

    ngrok http 3000

Copy the https ngrok URL. It looks like https://abc123.ngrok-free.app
Your webhook URL is: https://abc123.ngrok-free.app/api/whatsapp/webhook

## SECTION 4 - Register Webhook with Meta

1. Go to WhatsApp -> Configuration in Meta dashboard.
2. Under Webhook click Edit.
3. Callback URL: paste your ngrok webhook URL.
4. Verify Token: millco_verify_123
5. Click Verify and Save. Meta will call GET on your webhook.
6. You will see a 200 in your ngrok terminal if verification succeeds.
7. Click Manage and subscribe to the messages field.

## SECTION 5 - Send Test Messages

From your personal WhatsApp, send a message to the Meta test number.

Note: Meta requires you to add your number as a test recipient first.
Go to WhatsApp -> Getting Started and add your number under the Send and receive messages section.

Test sequence to verify all bot states work:

1. Message: Hi
   Expected: Welcome message and numbered menu (1. Browse 2. Cart 3. Help)
2. Message: 1
   Expected: Numbered product list with prices
3. Message: 1
   Expected: Variant list for first product
4. Message: 1
   Expected: Quantity prompt
5. Message: 2
   Expected: Added 2x product to cart confirmation and options
6. Message: 3
   Expected: Checkout flow starts and asks for name
7. Message: Your Name
   Expected: Asks for delivery address
8. Message: 123 Test Street, Kochi, Kerala 682001
   Expected: Order summary and YES/NO confirmation
9. Message: YES
   Expected: Order confirmed with ORD-xxxxxx ID

## SECTION 6 - Verify in Supabase

After completing the test flow, run these queries in Supabase SQL editor:

    -- Check session was created and cleared
    select phone, step, cart from whatsapp_sessions;

    -- Check order was created
    select id, customer_name, customer_address, total_amount,
           payment_method, status
    from orders
    order by created_at desc
    limit 5;

## SECTION 7 - Troubleshooting

Problem: Webhook verification fails (403)
Fix: Check WHATSAPP_VERIFY_TOKEN in .env.local matches what you typed in Meta dashboard exactly.
Restart npm run dev after changing .env.local.

Problem: Bot does not reply
Fix: Check ngrok terminal for incoming POST requests.
Check VS Code terminal for logged errors.
Check whatsapp_sessions table to confirm whether a row was created.

Problem: Order not saved
Fix: Check orders table schema matches what bot.ts expects.
Check Supabase logs for any RLS or constraint errors.

Problem: ngrok URL expired
Fix: ngrok free tier URLs expire. Restart ngrok and re-register the new URL in Meta webhook settings.
