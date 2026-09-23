# Pre-Launch Checklist

Complete this before handing a client their admin login.

- Production environment variables are real and not copied from local/test templates.
- Supabase migrations are applied and verified.
- RLS prevents anon access to orders, order items, shipments, notification logs, checkout sessions, and admin data.
- Admin credentials are unique for the client.
- Payment gateway is tested in test mode, then switched to live only after approval.
- Email sender is verified.
- Domain and SSL are active.
- Store branding, logo, legal pages, contact details, and policies are client-approved.
- Products, pricing, stock, shipping rules, and tax behavior are checked.
- Homepage, product detail, cart, checkout, success page, admin products, admin orders, and order tracking are smoke tested.
- Backup/export plan is documented.
- Client handover guide and training session are complete.
