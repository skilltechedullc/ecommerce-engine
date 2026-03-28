-- Transactional notification logs for idempotency, retries, and delivery visibility.

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  event_key text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  recipient text,
  provider text,
  provider_message_id text,
  attempt_count int not null default 0,
  last_error text,
  payload jsonb,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notification_logs_event_channel_unique
  on public.notification_logs (event_key, channel);

create index if not exists notification_logs_order_id_idx
  on public.notification_logs (order_id);

create index if not exists notification_logs_status_idx
  on public.notification_logs (status, next_retry_at);
