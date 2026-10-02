-- Step 1: contact eligibility and closed-by-default WhatsApp verification policy.
alter table public.coupons
 add column require_whatsapp_otp boolean not null default false,
 add column one_per_phone boolean not null default false,
 add column one_per_email boolean not null default false;

-- Rules are supplied by the trusted server's tenant configuration, never browser input.
create or replace function public.coupon_phone_key(p_phone text, p_country text, p_length integer, p_trunk text)
returns text language plpgsql immutable set search_path=public as $$
declare digits text := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
begin
 if digits = '' then return ''; end if;
 if length(digits) = p_length then return p_country || digits; end if;
 if p_trunk <> '' and left(digits,length(p_trunk))=p_trunk and length(digits)=p_length+length(p_trunk) then return p_country || substr(digits,length(p_trunk)+1); end if;
 return digits;
end; $$;

create or replace function public.coupon_contact_available(p_coupon_id uuid, p_phone text, p_email text, p_country text, p_length integer, p_trunk text)
returns boolean language plpgsql security definer set search_path=public as $$
declare c public.coupons%rowtype; phone_key text := public.coupon_phone_key(p_phone,p_country,p_length,p_trunk); email_key text := lower(btrim(coalesce(p_email,'')));
begin
 select * into c from public.coupons where id=p_coupon_id;
 if not found then return false; end if;
 -- No caller or forged browser flag can claim verification in this release.
 if c.require_whatsapp_otp then return false; end if;
 if (c.one_per_phone and phone_key='') or (c.one_per_email and email_key='') then return false; end if;
 return not exists (select 1 from public.checkout_sessions s where s.coupon_id=c.id and (
   (c.one_per_phone and public.coupon_phone_key(s.customer->>'phone',p_country,p_length,p_trunk)=phone_key)
   or (c.one_per_email and lower(btrim(s.customer->>'email'))=email_key)
 ));
end; $$;
revoke all on function public.coupon_phone_key(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.coupon_phone_key(text,text,integer,text) to service_role;
revoke all on function public.coupon_contact_available(uuid,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.coupon_contact_available(uuid,text,text,text,integer,text) to service_role;

create or replace function public.reserve_coupon_checkout(p_session jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare c public.coupons%rowtype; claimed integer; discount numeric := 0;
 subtotal numeric := (p_session->>'subtotal_amount')::numeric;
begin
 if p_session->>'coupon_id' is not null then
   select * into c from public.coupons where id=(p_session->>'coupon_id')::uuid for update;
   if not found or not c.is_active or (c.starts_at is not null and c.starts_at > now()) or (c.expires_at is not null and c.expires_at <= now()) then raise exception 'Coupon is not active'; end if;
   if c.require_whatsapp_otp then raise exception 'WhatsApp verification is not ready'; end if;
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
end; $$;
revoke all on function public.reserve_coupon_checkout(jsonb) from public,anon,authenticated;
grant execute on function public.reserve_coupon_checkout(jsonb) to service_role;
