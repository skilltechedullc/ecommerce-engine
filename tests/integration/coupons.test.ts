import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { createClient } from '@supabase/supabase-js'

test('coupon reservation is atomic, private, tamper-resistant and recovers exactly once after rule changes', async () => {
 const env = parseEnv(readFileSync('.env.local-test','utf8'))
 assert.ok(['localhost','127.0.0.1'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname))
 Object.assign(process.env,env)
 const { recoverCapturedCheckout } = await import('../../lib/server/recoverCheckout')
 const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!)
 const product=crypto.randomUUID(), variant=crypto.randomUUID(), coupon=crypto.randomUUID()
 const code='TEST_'+coupon.slice(0,8).toUpperCase(), sessionIds=[crypto.randomUUID(),crypto.randomUUID()]
 const customer={name:'Coupon regression',email:product+'@example.invalid',phone:'9000088888',address:'Local test only, Kerala 676508'}
 let orderId: string | null = null
 const ok=(r:{error:unknown})=>assert.equal(r.error,null)
 const items=[{variant_id:variant,product_id:product,product_name:'Coupon fixture',price:1000,quantity:1}]
 const session=(id:string)=>({id,razorpay_order_id:'order_coupon_'+id,amount_paise:95000,subtotal_amount:1000,shipping_amount:50,currency:'INR',items,customer,coupon_id:coupon,coupon_code:code,discount_amount:100})
 try {
  ok(await db.from('products').insert({id:product,name:'Coupon fixture',slug:'coupon-'+product,is_active:true}))
  ok(await db.from('product_variants').insert({id:variant,product_id:product,weight:'Test',price:1000,stock:5}))
  ok(await db.from('coupons').insert({id:coupon,code,discount_type:'percentage',discount_value:10,usage_limit:1}))
  const bad=await db.rpc('reserve_coupon_checkout',{p_session:{...session(crypto.randomUUID()),discount_amount:900}})
  assert.ok(bad.error,'Forged discount rejected')
  const reservations=await Promise.all(sessionIds.map(id=>db.rpc('reserve_coupon_checkout',{p_session:session(id)})))
  assert.equal(reservations.filter(r=>!r.error).length,1,'Only one concurrent checkout receives last slot')
  const winner=sessionIds[reservations.findIndex(r=>!r.error)], ref='order_coupon_'+winner,pay='pay_coupon_'+winner
  ok(await db.from('coupons').update({is_active:false,discount_value:20}).eq('id',coupon))
  const snapshot=async()=>[{id:pay,order_id:ref,amount:95000,currency:'INR',status:'captured'},{id:ref,amount:95000,currency:'INR',status:'paid'}] as unknown as Awaited<ReturnType<NonNullable<Parameters<typeof recoverCapturedCheckout>[2]>>>
  const wrong=async()=>{const s=await snapshot();s[0].amount=100000;return s}
  await assert.rejects(recoverCapturedCheckout(ref,pay,wrong),/amount mismatch/)
  orderId=await recoverCapturedCheckout(ref,pay,snapshot)
  assert.ok(orderId)
  assert.equal(await recoverCapturedCheckout(ref,pay,snapshot),orderId)
  const saved=await db.from('orders').select('total_amount,shipping_amount,discount_amount,coupon_code').eq('id',orderId).single()
  ok(saved);assert.deepEqual(saved.data,{total_amount:950,shipping_amount:50,discount_amount:100,coupon_code:code})
  assert.equal((await db.from('product_variants').select('stock').eq('id',variant).single()).data?.stock,4)
  const publicKey=env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  assert.ok(publicKey)
  const guest=createClient(env.NEXT_PUBLIC_SUPABASE_URL!,publicKey)
  assert.ok((await guest.rpc('reserve_coupon_checkout',{p_session:session(crypto.randomUUID())})).error)
  const publicCoupons=await guest.from('coupons').select('*')
  assert.ok(publicCoupons.error || publicCoupons.data?.length===0)
 } finally {
  await db.from('checkout_sessions').delete().in('id',sessionIds)
  if(orderId){await db.from('order_items').delete().eq('order_id',orderId);await db.from('orders').delete().eq('id',orderId)}
  await db.from('coupons').delete().eq('id',coupon)
  await db.from('product_variants').delete().eq('id',variant)
  await db.from('products').delete().eq('id',product)
  await db.from('customers').delete().eq('email',customer.email)
 }
})