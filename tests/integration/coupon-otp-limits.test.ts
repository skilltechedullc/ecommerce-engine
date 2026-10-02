import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'

test('OTP spending limits and resend invalidation remain atomic across concurrent requests',async()=>{
 const e=parseEnv(readFileSync('.env.local-test','utf8'));assert.ok(['localhost','127.0.0.1'].includes(new URL(e.NEXT_PUBLIC_SUPABASE_URL!).hostname))
 const db=createClient(e.NEXT_PUBLIC_SUPABASE_URL!,e.SUPABASE_SERVICE_ROLE_KEY!),coupon=crypto.randomUUID(),phone='919000022222',browser='d'.repeat(64)
 const make=(nextPhone=phone,nextBrowser=browser)=>({id:crypto.randomUUID(),coupon_id:coupon,phone:nextPhone,email:'quota@example.invalid',browser_hash:nextBrowser,code_hash:'a'.repeat(64)})
 try{
  assert.equal((await db.from('coupons').insert({id:coupon,code:'QUOTA_'+coupon.slice(0,8).toUpperCase(),discount_type:'percentage',discount_value:10})).error,null)
  const first=make();assert.equal((await db.rpc('begin_coupon_otp',{p_challenge:first})).data,'ok')
  assert.equal((await db.rpc('begin_coupon_otp',{p_challenge:make()})).data,'cooldown')
  await db.from('coupon_otp_challenges').update({created_at:new Date(Date.now()-61000).toISOString()}).eq('id',first.id)
  const second=make();assert.equal((await db.rpc('begin_coupon_otp',{p_challenge:second})).data,'ok')
  assert.equal((await db.from('coupon_otp_challenges').select('invalidated').eq('id',first.id).single()).data?.invalidated,true)
  await db.from('coupon_otp_challenges').update({created_at:new Date(Date.now()-61000).toISOString()}).eq('id',second.id)
  for(let i=0;i<3;i++)assert.equal((await db.from('coupon_otp_challenges').insert({...make(),created_at:new Date(Date.now()-120000).toISOString()})).error,null)
  assert.equal((await db.rpc('begin_coupon_otp',{p_challenge:make()})).data,'phone_limit')
  const before=await db.from('coupon_otp_challenges').select('id',{count:'exact',head:true}).gt('created_at',new Date(Date.now()-86400000).toISOString())
  assert.equal(before.error,null)
  const result=await Promise.all([1,2,3].map(n=>db.rpc('begin_coupon_otp',{p_challenge:make('91900003333'+n,'e'.repeat(63)+n),p_daily_limit:(before.count ?? 0)+1})))
  assert.equal(result.filter(r=>r.data==='ok').length,1)
  assert.equal(result.filter(r=>r.data==='daily_limit').length,2)
 }finally{await db.from('coupon_otp_challenges').delete().eq('coupon_id',coupon);await db.from('coupons').delete().eq('id',coupon)}
})
