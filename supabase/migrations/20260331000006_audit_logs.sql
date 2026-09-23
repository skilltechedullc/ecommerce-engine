-- Audit logs for admin and critical commerce events.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null default 'system',
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_actor_type_check check (actor_type in ('admin', 'customer', 'system', 'webhook')),
  constraint audit_logs_action_required check (btrim(action) <> ''),
  constraint audit_logs_entity_type_required check (btrim(entity_type) <> '')
);

alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'Service role full access audit logs'
  ) then
    create policy "Service role full access audit logs"
      on public.audit_logs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
