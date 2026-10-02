import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { createClient } from '@supabase/supabase-js'

test('contact rules reject phone OR email reuse, serialize concurrent uses, and cannot bypass pending OTP setup', async () => {
 const env=parseEnv(readFileSync('.env.local-test','utf8'))
 assert.ok(['localhost','127.0.0.1'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname))
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!)
 const id=crypto.randomUUID(),code='POLICY_'+id.slice(0,8).toUpperCase(),sessions:string[]=[]
 const rules={country_code:'91',national_length:10,trunk_prefix:'0'}
 const make=(phone:string,email:string)=>{
  const session=crypto.randomUUID();sessions.push(session)
  return {id:session,razorpay_order_id:'order_policy_'+session,amount_paise:95000,subtotal_amount:1000,shipping_amount:50,currency:'INR',items:[{variant_id:crypto.randomUUID(),quantity:1,price:1000}],customer:{name:'Policy fixture',phone,email,address:'Local test only'},phone_rules:rules,coupon_id:id,coupon_code:code,discount_amount:100}
 }
 const reserve=(phone:string,email:string)=>db.rpc('reserve_coupon_checkout',{p_session:make(phone,email)})
 try {
  assert.equal((await db.from('coupons').insert({id,code,discount_type:'percentage',discount_value:10,one_per_phone:true,one_per_email:true})).error,null)
  const [a,b]=await Promise.all([reserve('9000088888','First@Example.invalid'),reserve('+91 90000 88888','new@example.invalid')])
  assert.equal([a,b].filter(r=>!r.error).length,1)
  assert.ok((await reserve('09000088888','third@example.invalid')).error)
  const winnerEmail=a.error?'new@example.invalid':'first@example.invalid'
  assert.ok((await reserve('9000077777',' '+winnerEmail.toUpperCase()+' ')).error)
  assert.equal((await reserve('9000066666','fresh@example.invalid')).error,null)
  // Policy changes still count checkouts made before restrictions were enabled.
  assert.equal((await db.from('coupons').update({one_per_phone:false,one_per_email:false}).eq('id',id)).error,null)
  assert.equal((await reserve('9000055555','legacy@example.invalid')).error,null)
  assert.equal((await db.from('coupons').update({one_per_phone:true,one_per_email:true}).eq('id',id)).error,null)
  assert.ok((await reserve('+919000055555','different@example.invalid')).error)
  assert.equal((await db.from('coupons').update({require_whatsapp_otp:true}).eq('id',id)).error,null)
  const forged={...make('9000044444','otp@example.invalid'),otp_verified:true,verified_phone:'+919000044444'}
  assert.ok((await db.rpc('reserve_coupon_checkout',{p_session:forged})).error,'Client verification claims must never be accepted')
  const missingRules=make('9000033333','missing@example.invalid') as Record<string,unknown>
  await db.from('coupons').update({require_whatsapp_otp:false}).eq('id',id)
  delete missingRules.phone_rules
  assert.ok((await db.rpc('reserve_coupon_checkout',{p_session:missingRules})).error)
 } finally {
  await db.from('checkout_sessions').delete().in('id',sessions)
  await db.from('coupons').delete().eq('id',id)
 }
})