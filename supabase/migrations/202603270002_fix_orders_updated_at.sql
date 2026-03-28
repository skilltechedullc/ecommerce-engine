alter table if exists public.orders
  add column if not exists updated_at timestamptz;

update public.orders
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table if exists public.orders
  alter column updated_at set default now();

alter table if exists public.orders
  alter column updated_at set not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'orders_set_updated_at'
  ) then
    create trigger orders_set_updated_at
      before update on public.orders
      for each row execute function public.set_updated_at();
  end if;
end
$$;