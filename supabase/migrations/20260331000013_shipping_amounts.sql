alter table public.orders
  add column if not exists shipping_amount numeric(12,2) not null default 0;

alter table public.checkout_sessions
  add column if not exists subtotal_amount numeric(12,2) not null default 0,
  add column if not exists shipping_amount numeric(12,2) not null default 0;

alter table public.orders
  drop constraint if exists orders_shipping_amount_non_negative;

alter table public.orders
  add constraint orders_shipping_amount_non_negative check (shipping_amount >= 0);

alter table public.checkout_sessions
  drop constraint if exists checkout_sessions_subtotal_amount_non_negative;

alter table public.checkout_sessions
  add constraint checkout_sessions_subtotal_amount_non_negative check (subtotal_amount >= 0);

alter table public.checkout_sessions
  drop constraint if exists checkout_sessions_shipping_amount_non_negative;

alter table public.checkout_sessions
  add constraint checkout_sessions_shipping_amount_non_negative check (shipping_amount >= 0);
