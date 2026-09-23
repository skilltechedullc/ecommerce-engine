-- Customer-safe confirmation tokens for the success page.

alter table public.orders
  add column if not exists confirmation_token text;

create unique index if not exists orders_confirmation_token_key
  on public.orders(confirmation_token)
  where confirmation_token is not null;
