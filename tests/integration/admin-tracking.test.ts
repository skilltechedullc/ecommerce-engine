import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'
import {request} from '@playwright/test'

test('manual tracking writes require access, reject unsafe links and are repeatable without changing order status', async () => {
  const env=parseEnv(readFileSync('.env.local-test','utf8'))
  assert.ok(['localhost','127.0.0.1'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname))
  const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!)
  const base='http://localhost:3004'
  const admin=await request.newContext({baseURL:base}),guest=await request.newContext({baseURL:base})
  const {data:order,error}=await db.from('orders').insert({customer_name:'Admin tracking regression',customer_email:'test@example.invalid',customer_phone:'9000099998',customer_address:'Local test only',status:'Paid',razorpay_order_id:'local_tracking_'+crypto.randomUUID(),razorpay_payment_id:'local_payment_'+crypto.randomUUID(),total_amount:100,payment_method:'manual',source:'web'}).select('id').single()
  assert.ifError(error)
  assert.ok(order)
  const body={orderId:order.id,awb:'LOCAL-TEST-TRACK',trackingUrl:'https://courier.example/track/LOCAL-TEST-TRACK',status:'in_transit'}
  try {
    assert.equal((await guest.post('/api/admin/shipping/manual',{headers:{origin:base},data:body})).status(),403)
    assert.equal((await admin.post('/api/admin-login',{headers:{origin:base},data:{password:env.ADMIN_PASSWORD}})).status(),200)
    assert.equal((await admin.post('/api/admin/shipping/manual',{headers:{origin:'https://untrusted.example'},data:body})).status(),403)
    assert.equal((await admin.post('/api/admin/shipping/manual',{headers:{origin:base},data:{...body,trackingUrl:'javascript:alert(1)'}})).status(),400)
    for(let i=0;i<2;i++) assert.equal((await admin.post('/api/admin/shipping/manual',{headers:{origin:base},data:body})).status(),200)
    const {data:rows,error:readError}=await db.from('shipments').select('id,awb_number,status').eq('order_id',order.id)
    assert.ifError(readError);assert.equal(rows?.length,1);assert.equal(rows?.[0].awb_number,body.awb)
    const {data:updated}=await db.from('orders').select('status').eq('id',order.id).single()
    assert.equal(updated?.status,'Paid')
    const {count}=await db.from('notification_logs').select('id',{count:'exact',head:true}).eq('order_id',order.id)
    assert.equal(count,0)
    const detail=await admin.get('/admin/orders/'+order.id)
    assert.equal(detail.status(),200);assert.match(await detail.text(),/Manual courier tracking/)
  } finally {
    await db.from('orders').delete().eq('id',order.id)
    await admin.dispose();await guest.dispose()
  }
})