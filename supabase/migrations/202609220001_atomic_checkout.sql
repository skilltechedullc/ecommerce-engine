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

  if total + shipping <> (p_order->>'total_amount')::numeric then raise exception 'Order total mismatch'; end if;
  if payment_method = 'razorpay' and (
    round((total + shipping) * 100) <> checkout.amount_paise or shipping <> checkout.shipping_amount
  ) then raise exception 'Payment amount mismatch'; end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, customer_address, total_amount, shipping_amount,
    status, source, payment_method, razorpay_order_id, razorpay_payment_id, confirmation_token
  ) values (
    p_order->>'customer_name', p_order->>'customer_email', p_order->>'customer_phone',
    p_order->>'customer_address', total + shipping, shipping,
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
