create extension if not exists pgcrypto;
create extension if not exists moddatetime;

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  step text not null default 'idle',
  cart jsonb not null default '[]'::jsonb,
  customer_name text,
  customer_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_sessions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_sessions'
      and policyname = 'Service role full access whatsapp sessions'
  ) then
    create policy "Service role full access whatsapp sessions"
      on public.whatsapp_sessions
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists whatsapp_sessions_set_updated_at on public.whatsapp_sessions;

create trigger whatsapp_sessions_set_updated_at
  before update on public.whatsapp_sessions
  for each row
  execute function moddatetime(updated_at);