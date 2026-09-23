-- Store configuration drafts and published snapshots.

create table if not exists public.store_settings (
  id text primary key default 'default',
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.store_settings enable row level security;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
before update on public.store_settings
for each row
execute function public.set_updated_at();
