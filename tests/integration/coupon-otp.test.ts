import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'

test('WhatsApp OTP challenges enforce expiry, guesses, browser/contact binding, atomic use and payment resume',async()=>{
 const env=parseEnv(readFileSync('.env.local-test','utf8'))
 assert.ok(['127.0.0.1','localhost'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname))
 Object.assign(process.env,env,{COUPON_OTP_SECRET:'isolated-local-test-secret-'.repeat(3)})
 const {issueCouponOtp,verifyCouponOtp,browserDigest,loadCouponProof}=await import('../../lib/server/couponOtp')
 const {reservedCouponCheckout}=await import('../../lib/server/couponCheckoutResume')
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!)
 const coupon=crypto.randomUUID(),product=crypto.randomUUID(),variant=crypto.randomUUID(),browser='a'.repeat(64),otherBrowser='b'.repeat(64)
 const code='OTP_'+coupon.slice(0,8).toUpperCase(),email=coupon+'@example.invalid',phone='9'+Math.floor(100000000+Math.random()*899999999).toString()
 const customer={name:'OTP test',email,phone,address:'Local test only'}
 const item={variant_id:variant,product_id:product,product_name:'OTP fixture',quantity:1,price:1000}
 let orderId:string|undefined;const sessions:string[]=[]
 const ok=(r:{error:unknown})=>assert.equal(r.error,null)
 try{
  ok(await db.from('coupons').insert({id:coupon,code,discount_type:'percentage',discount_value:10,require_whatsapp_otp:true,one_per_phone:true,one_per_email:true}))
  ok(await db.from('products').insert({id:product,name:'OTP fixture',slug:'otp-'+product,is_active:true}))
  ok(await db.from('product_variants').insert({id:variant,product_id:product,weight:'Test',price:1000,stock:5}))
  let otpCode='';const sender=async(_phone:string,c:string)=>{otpCode=c}
  const challenge=await issueCouponOtp(coupon,customer,browser,sender)
  assert.match(otpCode,/^\d{6}$/);assert.equal(JSON.stringify(challenge).includes(otpCode),false)
  const saved=await db.from('coupon_otp_challenges').select('*').eq('id',challenge.challengeId).single();ok(saved);assert.notEqual(saved.data.code_hash,otpCode)
  await assert.rejects(issueCouponOtp(coupon,customer,browser,sender),/wait 60 seconds/)
  await assert.rejects(verifyCouponOtp(challenge.challengeId,otpCode,otherBrowser),/incorrect or no longer valid/)
  const wrong=otpCode==='000000'?'111111':'000000'
  await assert.rejects(verifyCouponOtp(challenge.challengeId,wrong,browser),/incorrect/)
  const verified=await verifyCouponOtp(challenge.challengeId,otpCode,browser);assert.equal(verified.verified,true)
  await assert.rejects(verifyCouponOtp(challenge.challengeId,otpCode,browser),/already been verified/)
  const context={challengeId:challenge.challengeId,browserHash:browserDigest(browser)}
  assert.ok(await loadCouponProof(context,coupon,customer))
  assert.equal(await loadCouponProof(context,coupon,{...customer,email:'different@example.invalid'}),null)
  assert.equal(await loadCouponProof({...context,browserHash:browserDigest(otherBrowser)},coupon,customer),null)
  const make=()=>{const id=crypto.randomUUID();sessions.push(id);return {id,razorpay_order_id:'order_otp_'+id,amount_paise:95000,subtotal_amount:1000,shipping_amount:50,currency:'INR',items:[item],customer,coupon_id:coupon,coupon_code:code,discount_amount:100,phone_rules:{country_code:'91',national_length:10,trunk_prefix:'0'},otp_challenge_id:challenge.challengeId,otp_browser_hash:context.browserHash}}
  assert.ok((await db.rpc('reserve_coupon_checkout',{p_session:{...make(),customer:{...customer,email:'changed@example.invalid'}}})).error)
  const first=make(),second=make();const concurrent=await Promise.all([first,second].map(p_session=>db.rpc('reserve_coupon_checkout',{p_session})))
  assert.equal(concurrent.filter(r=>!r.error).length,1)
  const winner=concurrent[0].error?second:first
  const resumed=await reservedCouponCheckout(context,code,[item],customer);assert.equal(resumed.id,winner.id)
  await assert.rejects(reservedCouponCheckout(context,code,[{...item,quantity:2}],customer),/reserved for your earlier checkout/)
  ok(await db.from('coupon_otp_challenges').update({verified_until:new Date(Date.now()-1000).toISOString()}).eq('id',challenge.challengeId))
  assert.equal((await reservedCouponCheckout(context,code,[item],customer)).id,winner.id,'Existing payment can resume after grant expiry')
  ok(await db.from('checkout_sessions').update({status:'payment_verified',razorpay_payment_id:'pay_'+winner.id}).eq('id',winner.id))
  const completed=await db.rpc('complete_checkout',{p_order:{customer_name:'Changed',customer_email:'hijack@example.invalid',customer_phone:'9000011111',customer_address:'Changed',total_amount:950,shipping_amount:50,payment_method:'razorpay',razorpay_order_id:winner.razorpay_order_id,razorpay_payment_id:'pay_'+winner.id},p_items:[item]});ok(completed);orderId=completed.data.order_id
  const order=await db.from('orders').select('customer_email,customer_phone').eq('id',orderId!).single();assert.equal(order.data?.customer_email,email);assert.equal(order.data?.customer_phone,phone)
  await assert.rejects(reservedCouponCheckout(context,code,[item],customer),/already received/)
  // Independent challenges cover expiry, five wrong guesses, and failed delivery.
  for(const scenario of ['expiry','attempts','delivery']){
   const nextCustomer={...customer,phone:'9'+Math.floor(100000000+Math.random()*899999999).toString()}
   if(scenario==='delivery'){await assert.rejects(issueCouponOtp(coupon,nextCustomer,browser,async()=>{throw new Error('Simulated provider failure')}),/Could not send/);continue}
   const next=await issueCouponOtp(coupon,nextCustomer,browser,sender)
   if(scenario==='expiry') {ok(await db.from('coupon_otp_challenges').update({expires_at:new Date(Date.now()-1000).toISOString()}).eq('id',next.challengeId));await assert.rejects(verifyCouponOtp(next.challengeId,otpCode,browser),/expired/)}
   else {const incorrect=otpCode==='000000'?'111111':'000000';for(let i=0;i<5;i++)await assert.rejects(verifyCouponOtp(next.challengeId,incorrect,browser));await assert.rejects(verifyCouponOtp(next.challengeId,otpCode,browser),/Too many incorrect/)}
  }
  const failed=await db.from('coupon_otp_challenges').select('invalidated').eq('coupon_id',coupon).eq('delivery_state','failed');assert.equal(failed.data?.length,1);assert.equal(failed.data?.[0].invalidated,true)
  const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL!,env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  assert.ok((await anon.rpc('verify_coupon_otp',{p_id:challenge.challengeId,p_browser_hash:context.browserHash,p_code_hash:'0'.repeat(64)})).error)
 }finally{
  await db.from('coupon_otp_challenges').delete().eq('coupon_id',coupon)
  await db.from('checkout_sessions').delete().in('id',sessions)
  if(orderId){await db.from('order_items').delete().eq('order_id',orderId);await db.from('orders').delete().eq('id',orderId)}
  await db.from('product_variants').delete().eq('id',variant);await db.from('products').delete().eq('id',product);await db.from('coupons').delete().eq('id',coupon);await db.from('customers').delete().eq('email',email)
 }
})
