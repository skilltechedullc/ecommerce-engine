-- Extend order lifecycle statuses for failure, cancellation, refund, and return handling.

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (
    status in (
      'Pending',
      'Paid',
      'Payment Failed',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Refunded',
      'Return Requested',
      'Returned'
    )
  );
