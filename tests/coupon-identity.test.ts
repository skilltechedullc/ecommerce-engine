import test from 'node:test'
import assert from 'node:assert/strict'
import { couponIdentity } from '../lib/server/couponIdentity'
import { couponWriteSchema } from '../lib/coupons'

test('coupon identity normalizes national/international phone and email case',()=>{
 const email='  Customer@Example.com  '
 const first=couponIdentity({phone:'9000088888',email})
 assert.deepEqual(first,{phone:'919000088888',email:'customer@example.com'})
 assert.deepEqual(couponIdentity({phone:'+91 90000 88888',email}),first)
 assert.throws(()=>couponIdentity({phone:'bad',email}))
 assert.throws(()=>couponIdentity({phone:'9000088888',email:'invalid'}))
 assert.throws(()=>couponIdentity(undefined))
})
test('coupon schema preserves explicit protection flags and rejects non-boolean bypasses',()=>{
 const coupon={code:'WELCOME',discount_type:'percentage',discount_value:10,min_order_amount:0,max_discount_amount:null,starts_at:null,expires_at:null,usage_limit:null,is_active:false,require_whatsapp_otp:true,one_per_phone:true,one_per_email:true}
 const parsed=couponWriteSchema.parse(coupon)
 assert.equal(parsed.require_whatsapp_otp,true);assert.equal(parsed.one_per_phone,true);assert.equal(parsed.one_per_email,true)
 assert.equal(couponWriteSchema.safeParse({...coupon,require_whatsapp_otp:'false'}).success,false)
})