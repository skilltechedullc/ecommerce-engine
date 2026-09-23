-- Phase 2 schema verification.
-- Run against local Supabase after `npx supabase db reset`.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'weight'
      and is_nullable = 'NO'
  ) then
    raise exception 'product_variants.weight is missing or nullable';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'name'
      and is_nullable = 'NO'
  ) then
    raise exception 'product_variants.name must not be required';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'image'
      and data_type = 'jsonb'
  ) then
    raise exception 'product_variants.image must be jsonb';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'chat_sessions'
  ) then
    raise exception 'chat_sessions table is missing';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'whatsapp_sessions'
  ) then
    raise exception 'whatsapp_sessions should have been renamed to chat_sessions';
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'chat_sessions'
      and constraint_name = 'chat_sessions_channel_phone_unique'
  ) then
    raise exception 'chat_sessions channel/phone unique constraint is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'source'
  ) then
    raise exception 'orders.source is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'orders'
      and c.conname = 'orders_status_check'
      and pg_get_constraintdef(c.oid) like '%Payment Failed%'
      and pg_get_constraintdef(c.oid) like '%Refunded%'
      and pg_get_constraintdef(c.oid) like '%Return Requested%'
  ) then
    raise exception 'orders status constraint is missing extended lifecycle states';
  end if;

  if not exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'shipments'
      and trigger_name = 'shipments_set_updated_at'
  ) then
    raise exception 'shipments updated_at trigger is missing';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'checkout_sessions'
  ) then
    raise exception 'checkout_sessions table is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'checkout_sessions'
      and column_name = 'razorpay_order_id'
  ) then
    raise exception 'checkout_sessions.razorpay_order_id is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Public read active products'
  ) then
    raise exception 'products public active read RLS policy is missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and roles && array['anon'::name, 'authenticated'::name]
  ) then
    raise exception 'orders must not have anon/authenticated RLS policies';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'audit_logs'
  ) then
    raise exception 'audit_logs table is missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and roles && array['anon'::name, 'authenticated'::name]
  ) then
    raise exception 'audit_logs must not have anon/authenticated RLS policies';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_product_with_relations'
  ) then
    raise exception 'create_product_with_relations RPC is missing';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_product_with_relations'
  ) then
    raise exception 'update_product_with_relations RPC is missing';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'store_settings'
  ) then
    raise exception 'store_settings table is missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'store_settings'
      and roles && array['anon'::name, 'authenticated'::name]
  ) then
    raise exception 'store_settings must not have anon/authenticated RLS policies';
  end if;
end
$$;

select 'phase2 schema verification passed' as result;
