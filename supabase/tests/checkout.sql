begin;
do $$
declare
  product uuid := gen_random_uuid();
  variant_a uuid := '00000000-0000-4000-8000-000000000001';
  variant_b uuid := '00000000-0000-4000-8000-000000000002';
  order_payload jsonb;
  items jsonb;
  saved jsonb;
  retried jsonb;
  before_stock integer;
begin
  if has_function_privilege('anon', 'public.complete_checkout(jsonb,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.complete_checkout(jsonb,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: checkout RPC is accessible to public clients';
  end if;
  insert into products(id,name,slug,is_active) values(product,'Transactional test','transaction-test-'||product,true);
  insert into product_variants(id,product_id,weight,price,stock) values
    (variant_a,product,'A',100,5),(variant_b,product,'B',100,0);
  items := jsonb_build_array(jsonb_build_object('variant_id',variant_a,'product_id',product,'product_name','Test A','price',100,'quantity',2));
  order_payload := jsonb_build_object(
    'customer_name','Test','customer_email','checkout-test@example.invalid','customer_phone','9999999999',
    'customer_address','Test address','total_amount',200,'shipping_amount',0,
    'payment_method','razorpay','razorpay_order_id','order_atomic_test','razorpay_payment_id','pay_atomic_test'
  );
  insert into checkout_sessions(razorpay_order_id,amount_paise,currency,items,status,razorpay_payment_id,subtotal_amount,shipping_amount)
    values('order_atomic_test',20000,'INR',items,'payment_verified','pay_atomic_test',200,0);
  saved := complete_checkout(order_payload,items);
  if (select stock from product_variants where id=variant_a) <> 3 then raise exception 'FAIL: stock not decremented'; end if;
  if (select status from orders where id=(saved->>'order_id')::uuid) <> 'Paid' then raise exception 'FAIL: paid status missing'; end if;
  if (select count(*) from order_items where order_id=(saved->>'order_id')::uuid) <> 1 then raise exception 'FAIL: line items missing'; end if;
  retried := complete_checkout(order_payload,items);
  if retried->>'order_id' <> saved->>'order_id' or retried->>'confirmation_token' <> saved->>'confirmation_token'
    or (retried->>'idempotent')::boolean is not true then raise exception 'FAIL: idempotency or confirmation token'; end if;
  if (select stock from product_variants where id=variant_a) <> 3 then raise exception 'FAIL: duplicate stock decrement'; end if;

  order_payload := order_payload || '{"payment_method":"cod","razorpay_order_id":"manual_atomic_test","razorpay_payment_id":"manual_atomic_test"}';
  before_stock := (select stock from product_variants where id=variant_a);
  items := jsonb_build_array(
    jsonb_build_object('variant_id',variant_a,'product_id',product,'product_name','Test A','price',100,'quantity',1),
    jsonb_build_object('variant_id',variant_b,'product_id',product,'product_name','Test B','price',100,'quantity',1)
  );
  begin
    perform complete_checkout(order_payload,items);
    raise exception 'FAIL: accepted insufficient stock';
  exception when others then
    if sqlerrm <> 'Insufficient stock' then raise; end if;
  end;
  if (select stock from product_variants where id=variant_a) <> before_stock then raise exception 'FAIL: partial stock reservation leaked'; end if;
  if exists(select 1 from orders where razorpay_order_id='manual_atomic_test') then raise exception 'FAIL: partial order persisted'; end if;

  -- A failure AFTER inserting the order must also roll back stock and customer aggregates.
  items := jsonb_build_array(jsonb_build_object('variant_id',variant_a,'product_id',product,'price',100,'quantity',2));
  begin
    perform complete_checkout(order_payload,items);
    raise exception 'FAIL: accepted missing product name';
  exception when not_null_violation then null;
  end;
  if (select stock from product_variants where id=variant_a) <> before_stock then raise exception 'FAIL: late failure leaked stock'; end if;
  if exists(select 1 from orders where razorpay_order_id='manual_atomic_test') then raise exception 'FAIL: late failure leaked order'; end if;
  raise notice 'PASS: transactional checkout, idempotency, permissions, stock rollback and late-failure rollback';
end;
$$;
rollback;
