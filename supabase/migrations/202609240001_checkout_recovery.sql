-- Store checkout contact details before opening payment, so captured webhooks can recover orders.
-- checkout_sessions already has service-role-only RLS; no public read policy is added.
alter table public.checkout_sessions add column if not exists customer jsonb;
comment on column public.checkout_sessions.customer is 'Private delivery/contact snapshot for captured payment recovery';
