-- Add payment method tracking for online and offline payment modes.

alter table public.orders
  add column if not exists payment_method text not null default 'razorpay';

alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check check (
    payment_method in ('razorpay', 'cod', 'manual', 'whatsapp_cod')
  );

create index if not exists orders_payment_method_idx
  on public.orders(payment_method);
