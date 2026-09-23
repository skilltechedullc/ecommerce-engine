-- Editable notification templates for email, WhatsApp, and future channels.

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  channel text not null,
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_channel_check check (channel in ('email', 'whatsapp', 'sms', 'internal'))
);

drop trigger if exists notification_templates_set_updated_at on public.notification_templates;
create trigger notification_templates_set_updated_at
  before update on public.notification_templates
  for each row
  execute function public.set_updated_at();

alter table public.notification_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_templates'
      and policyname = 'notification templates service role only'
  ) then
    create policy "notification templates service role only"
      on public.notification_templates
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
