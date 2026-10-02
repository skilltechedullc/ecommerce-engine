-- Coupon rules are private. Checkout reservations and order snapshots preserve paid discounts.
create table public.coupons (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
 discount_type text not null check (discount_type in ('percentage','fixed')),
 discount_value numeric(12,2) not null check (discount_value > 0 and (discount_type <> 'percentage' or discount_value < 100)),
 min_order_amount numeric(12,2) not null default 0 check (min_order_amount >= 0),
 max_discount_amount numeric(12,2) check (max_discount_amount > 0),
 starts_at timestamptz, expires_at timestamptz,
 usage_limit integer check (usage_limit > 0), is_active boolean not null default true,
 created_at timestamptz not null default now(),
 check (starts_at is null or expires_at is null or starts_at < expires_at)
);
alter table public.coupons enable row level security;
revoke all on public.coupons from anon, authenticated;
grant all on public.coupons to service_role;
alter table public.checkout_sessions add column coupon_id uuid references public.coupons(id), add column coupon_code text,
 add column discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);
create index checkout_sessions_coupon_id_idx on public.checkout_sessions(coupon_id);
alter table public.orders add column coupon_code text, add column discount_amount numeric(12,2) not null default 0 check(discount_amount >= 0);

-- Slots remain reserved for pending payments: Razorpay orders can still be paid later.
-- Row locking makes the limit safe even when the last slot is requested concurrently.
create or replace function public.reserve_coupon_checkout(p_session jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare c public.coupons%rowtype; claimed integer; discount numeric := 0;
 subtotal numeric := (p_session->>'subtotal_amount')::numeric;
begin
 if p_session->>'coupon_id' is not null then
   select * into c from public.coupons where id=(p_session->>'coupon_id')::uuid for update;
   if not found or not c.is_active or (c.starts_at is not null and c.starts_at > now()) or (c.expires_at is not null and c.expires_at <= now()) then raise exception 'Coupon is not active'; end if;
   select count(*) into claimed from public.checkout_sessions where coupon_id=c.id;
   if c.usage_limit is not null and claimed >= c.usage_limit then raise exception 'Coupon limit reached'; end if;
   if subtotal < c.min_order_amount then raise exception 'Coupon minimum not met'; end if;
   discount := case when c.discount_type='percentage' then subtotal*c.discount_value/100 else c.discount_value end;
   if c.max_discount_amount is not null then discount := least(discount,c.max_discount_amount); end if;
   discount := round(discount,2);
   if discount <= 0 or subtotal-discount < 1 or c.code is distinct from p_session->>'coupon_code' then raise exception 'Invalid coupon amount'; end if;
 end if;
 if discount is distinct from (p_session->>'discount_amount')::numeric or round((subtotal-discount+(p_session->>'shipping_amount')::numeric)*100) is distinct from (p_session->>'amount_paise')::integer then raise exception 'Checkout total mismatch'; end if;
 insert into public.checkout_sessions(id,razorpay_order_id,amount_paise,subtotal_amount,shipping_amount,currency,items,customer,status,coupon_id,coupon_code,discount_amount)
 values ((p_session->>'id')::uuid,p_session->>'razorpay_order_id',(p_session->>'amount_paise')::integer,subtotal,(p_session->>'shipping_amount')::numeric,p_session->>'currency',p_session->'items',p_session->'customer','created',c.id,c.code,discount);
end; $$;
revoke all on function public.reserve_coupon_checkout(jsonb) from public,anon,authenticated;
grant execute on function public.reserve_coupon_checkout(jsonb) to service_role;

-- Atomically persist stock, order, line items and payment recovery state.
-- Only the trusted server can call this function after verifying Razorpay.
create or replace function public.complete_checkout(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.orders%rowtype;
  checkout public.checkout_sessions%rowtype;
  item jsonb;
  variant public.product_variants%rowtype;
  total numeric := 0;
  discount numeric := 0;
  coupon text;
  shipping numeric := (p_order->>'shipping_amount')::numeric;
  payment_method text := p_order->>'payment_method';
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if payment_method not in ('razorpay', 'cod') or payment_method is null then
    raise exception 'Invalid payment method';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 100 then raise exception 'Invalid checkout items'; end if;
  if shipping is null or shipping < 0 then raise exception 'Invalid shipping amount'; end if;

  if payment_method = 'razorpay' then
    select * into checkout from public.checkout_sessions
      where razorpay_order_id = p_order->>'razorpay_order_id' for update;
    if not found then raise exception 'Checkout session not found'; end if;
    discount := checkout.discount_amount;
    coupon := checkout.coupon_code;
    select * into saved from public.orders where razorpay_order_id = checkout.razorpay_order_id;
    if found then
      if saved.razorpay_payment_id <> p_order->>'razorpay_payment_id' then
        raise exception 'Payment/order mismatch';
      end if;
      return jsonb_build_object('order_id', saved.id, 'confirmation_token', saved.confirmation_token, 'idempotent', true);
    end if;
    if checkout.status <> 'payment_verified' or checkout.razorpay_payment_id <> p_order->>'razorpay_payment_id' then
      raise exception 'Payment has not been verified';
    end if;
    if exists (
      (select x->>'variant_id', (x->>'quantity')::integer, (x->>'price')::numeric from jsonb_array_elements(checkout.items) x
       except
       select x->>'variant_id', (x->>'quantity')::integer, (x->>'price')::numeric from jsonb_array_elements(p_items) x)
      union all
      (select x->>'variant_id', (x->>'quantity')::integer, (x->>'price')::numeric from jsonb_array_elements(p_items) x
       except
       select x->>'variant_id', (x->>'quantity')::integer, (x->>'price')::numeric from jsonb_array_elements(checkout.items) x)
    ) then raise exception 'Checkout items changed'; end if;
  end if;

  if (select count(*) from jsonb_array_elements(p_items)) <>
     (select count(distinct x->>'variant_id') from jsonb_array_elements(p_items) x) then
    raise exception 'Duplicate checkout variants';
  end if;

  -- Stable lock order avoids deadlocks between carts containing the same variants.
  for item in select x from jsonb_array_elements(p_items) x order by x->>'variant_id' loop
    if (item->>'quantity')::integer <= 0 or (item->>'quantity') is null then raise exception 'Invalid quantity'; end if;
    select * into variant from public.product_variants where id = (item->>'variant_id')::uuid for update;
    if not found then raise exception 'Variant not found'; end if;
    if variant.product_id <> (item->>'product_id')::uuid or variant.price <> (item->>'price')::numeric then
      raise exception 'Checkout price changed';
    end if;
    if not exists (select 1 from public.products where id = variant.product_id and is_active) then
      raise exception 'Product is inactive';
    end if;
    if variant.stock < (item->>'quantity')::integer then raise exception 'Insufficient stock'; end if;
    total := total + variant.price * (item->>'quantity')::integer;
    update public.product_variants set stock = stock - (item->>'quantity')::integer where id = variant.id;
  end loop;

  if discount < 0 or discount >= total then raise exception 'Invalid discount'; end if;
  if total - discount + shipping <> (p_order->>'total_amount')::numeric then raise exception 'Order total mismatch'; end if;
  if payment_method = 'razorpay' and (
    round((total - discount + shipping) * 100) <> checkout.amount_paise or shipping <> checkout.shipping_amount
  ) then raise exception 'Payment amount mismatch'; end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, customer_address, total_amount, shipping_amount, discount_amount, coupon_code,
    status, source, payment_method, razorpay_order_id, razorpay_payment_id, confirmation_token
  ) values (
    p_order->>'customer_name', p_order->>'customer_email', p_order->>'customer_phone',
    p_order->>'customer_address', total - discount + shipping, shipping, discount, coupon,
    case when payment_method = 'razorpay' then 'Paid' else 'Pending' end,
    'web', payment_method, p_order->>'razorpay_order_id', p_order->>'razorpay_payment_id', token
  ) returning * into saved;

  insert into public.order_items(order_id, product_id, product_name, price, quantity)
  select saved.id, (x->>'product_id')::uuid, x->>'product_name', (x->>'price')::numeric, (x->>'quantity')::integer
  from jsonb_array_elements(p_items) x;

  if payment_method = 'razorpay' then
    update public.checkout_sessions set status = 'order_saved', order_id = saved.id, failure_reason = null
      where id = checkout.id;
  end if;
  return jsonb_build_object('order_id', saved.id, 'confirmation_token', token, 'idempotent', false);
end;
$$;

revoke all on function public.complete_checkout(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.complete_checkout(jsonb, jsonb) to service_role;
