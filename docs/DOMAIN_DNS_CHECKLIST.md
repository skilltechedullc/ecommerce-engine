# Domain And DNS Checklist

Use this for each client-owned launch.

## Before DNS Change

- Confirm final domain and `www` preference.
- Confirm hosting target and preview URL.
- Confirm client has registrar access.
- Lower TTL if the registrar allows it.
- Confirm email DNS records will not be overwritten.

## Records

- Root/apex record points to hosting provider.
- `www` record points to hosting provider.
- Any required verification TXT records are added.
- Email SPF/DKIM/DMARC records remain intact.
- WhatsApp/Meta verification records are added only if needed.

## After DNS Change

- Homepage opens on root domain.
- `www` redirects or opens as intended.
- HTTPS certificate is active.
- `NEXT_PUBLIC_SITE_URL` matches the live URL.
- Sitemap and robots URLs are correct.
- Checkout return/success URLs work.
- Razorpay webhook URL matches the live API route.
