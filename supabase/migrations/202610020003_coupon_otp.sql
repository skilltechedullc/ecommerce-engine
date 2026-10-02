-- Private, browser-bound OTP challenges. No plaintext codes are stored.
create table public.coupon_otp_challenges (
 id uuid primary key,
 coupon_id uuid not null references public.coupons(id),
 phone text not null, email text not null,
 browser_hash text not null check (browser_hash ~ '^[a-f0-9]{64}$'),
 code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '5 minutes'),
 delivery_state text not null default 'pending' check(delivery_state in ('pending','sent','failed')),
 attempts integer not null default 0,
 verified_until timestamptz,
 invalidated boolean not null default false,
 checkout_id uuid references public.checkout_sessions(id)
);
alter table public.coupon_otp_challenges enable row level security;
revoke all on public.coupon_otp_challenges from anon,authenticated;
grant all on public.coupon_otp_challenges to service_role;
create index coupon_otp_phone_time on public.coupon_otp_challenges(phone,created_at);
create index coupon_otp_browser_time on public.coupon_otp_challenges(browser_hash,created_at);
create index coupon_otp_time on public.coupon_otp_challenges(created_at);

create or replace function public.begin_coupon_otp(p_challenge jsonb, p_daily_limit integer default 100)
returns text language plpgsql security definer set search_path=public as $$
begin
 -- Store-wide lock makes spending caps and cooldowns atomic across server instances.
 perform pg_advisory_xact_lock(hashtextextended('coupon-otp-send',0));
 if exists(select 1 from public.coupon_otp_challenges where phone=p_challenge->>'phone' and created_at>now()-interval '60 seconds') then return 'cooldown'; end if;
 if (select count(*) from public.coupon_otp_challenges where phone=p_challenge->>'phone' and created_at>now()-interval '24 hours')>=5 then return 'phone_limit'; end if;
 if (select count(*) from public.coupon_otp_challenges where browser_hash=p_challenge->>'browser_hash' and created_at>now()-interval '24 hours')>=10 then return 'browser_limit'; end if;
 if (select count(*) from public.coupon_otp_challenges where created_at>now()-interval '24 hours')>=least(greatest(coalesce(p_daily_limit,100),1),10000) then return 'daily_limit'; end if;
 update public.coupon_otp_challenges set invalidated=true where browser_hash=p_challenge->>'browser_hash' and coupon_id=(p_challenge->>'coupon_id')::uuid and checkout_id is null and verified_until is null;
 insert into public.coupon_otp_challenges(id,coupon_id,phone,email,browser_hash,code_hash)
 values ((p_challenge->>'id')::uuid,(p_challenge->>'coupon_id')::uuid,p_challenge->>'phone',p_challenge->>'email',p_challenge->>'browser_hash',p_challenge->>'code_hash');
 return 'ok';
end; $$;

create or replace function public.verify_coupon_otp(p_id uuid,p_browser_hash text,p_code_hash text)
returns text language plpgsql security definer set search_path=public as $$
declare challenge public.coupon_otp_challenges%rowtype;
begin
 select * into challenge from public.coupon_otp_challenges where id=p_id for update;
 if not found or challenge.browser_hash<>p_browser_hash or challenge.invalidated or challenge.delivery_state<>'sent' then return 'invalid'; end if;
 if challenge.verified_until is not null or challenge.checkout_id is not null then return 'used'; end if;
 if challenge.expires_at<=now() then return 'expired'; end if;
 if challenge.attempts>=5 then return 'locked'; end if;
 update public.coupon_otp_challenges set attempts=attempts+1 where id=p_id;
 if challenge.code_hash<>p_code_hash then return 'incorrect'; end if;
 update public.coupon_otp_challenges set verified_until=now()+interval '15 minutes' where id=p_id;
 return 'ok';
end; $$;
revoke all on function public.begin_coupon_otp(jsonb,integer) from public,anon,authenticated;
grant execute on function public.begin_coupon_otp(jsonb,integer) to service_role;
revoke all on function public.verify_coupon_otp(uuid,text,text) from public,anon,authenticated;
grant execute on function public.verify_coupon_otp(uuid,text,text) to service_role;

create or replace function public.coupon_contact_available(p_coupon_id uuid, p_phone text, p_email text, p_country text, p_length integer, p_trunk text)
returns boolean language plpgsql security definer set search_path=public as $$
declare c public.coupons%rowtype; phone_key text := public.coupon_phone_key(p_phone,p_country,p_length,p_trunk); email_key text := lower(btrim(coalesce(p_email,'')));
begin
 select * into c from public.coupons where id=p_coupon_id;
 if not found then return false; end if;
 if (c.one_per_phone and phone_key='') or (c.one_per_email and email_key='') then return false; end if;
 return not exists (select 1 from public.checkout_sessions s where s.coupon_id=c.id and (
   (c.one_per_phone and public.coupon_phone_key(s.customer->>'phone',p_country,p_length,p_trunk)=phone_key)
   or (c.one_per_email and lower(btrim(s.customer->>'email'))=email_key)
 ));
end; $$;

create or replace function public.reserve_coupon_checkout(p_session jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare proof public.coupon_otp_challenges%rowtype; c public.coupons%rowtype; claimed integer; discount numeric := 0;
 subtotal numeric := (p_session->>'subtotal_amount')::numeric;
begin
 if p_session->>'coupon_id' is not null then
   select * into c from public.coupons where id=(p_session->>'coupon_id')::uuid for update;
   if not found or not c.is_active or (c.starts_at is not null and c.starts_at > now()) or (c.expires_at is not null and c.expires_at <= now()) then raise exception 'Coupon is not active'; end if;
   if c.require_whatsapp_otp then
     select * into proof from public.coupon_otp_challenges where id=(p_session->>'otp_challenge_id')::uuid for update;
     if not found or proof.coupon_id<>c.id or proof.browser_hash is distinct from p_session->>'otp_browser_hash'
       or proof.verified_until is null or proof.verified_until<=now() or proof.invalidated or proof.delivery_state<>'sent' or proof.checkout_id is not null
       or proof.phone is distinct from public.coupon_phone_key(p_session->'customer'->>'phone',p_session->'phone_rules'->>'country_code',(p_session->'phone_rules'->>'national_length')::integer,coalesce(p_session->'phone_rules'->>'trunk_prefix',''))
       or proof.email is distinct from lower(btrim(p_session->'customer'->>'email')) then raise exception 'Valid WhatsApp verification required'; end if;
   end if;
   if (c.one_per_phone or c.one_per_email) and not public.coupon_contact_available(c.id,p_session->'customer'->>'phone',p_session->'customer'->>'email',p_session->'phone_rules'->>'country_code',(p_session->'phone_rules'->>'national_length')::integer,coalesce(p_session->'phone_rules'->>'trunk_prefix','')) then raise exception 'Coupon already used or reserved'; end if;
   if (c.one_per_phone or c.one_per_email) and (p_session->'phone_rules'->>'country_code' is null or p_session->'phone_rules'->>'national_length' is null) then raise exception 'Phone rules required'; end if;
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
 if c.require_whatsapp_otp then update public.coupon_otp_challenges set checkout_id=(p_session->>'id')::uuid where id=proof.id; end if;
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
    -- Payment callbacks cannot replace the contact identity verified before payment.
    p_order := p_order || jsonb_build_object('customer_name',checkout.customer->>'name','customer_email',checkout.customer->>'email','customer_phone',checkout.customer->>'phone','customer_address',checkout.customer->>'address');
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
