import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'

test('local WhatsApp menu, cart, checkout handoff and tracking prompt never create a separate payment order', async () => {
  const env = parseEnv(readFileSync('.env.local-test', 'utf8'))
  assert.ok(['127.0.0.1','localhost'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname))
  Object.assign(process.env, env, { WHATSAPP_ENABLED: 'true', NEXT_PUBLIC_FEATURE_WHATSAPP_BOT: 'true', WHATSAPP_AI_ENABLED: 'false' })
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)
  const {prepareReplies} = await import('../../lib/whatsapp/bot')
  const phone = '919000099998'
  await db.from('chat_sessions').delete().eq('channel','whatsapp').eq('phone',phone)
  try {
    assert.match((await prepareReplies(phone,'hello')).join('\n'), /Track my order/)
    assert.match((await prepareReplies(phone,'1')).join('\n'), /Available products/)
    assert.match((await prepareReplies(phone,'1')).join('\n'), /Variants for/)
    assert.match((await prepareReplies(phone,'1')).join('\n'), /How many/)
    assert.match((await prepareReplies(phone,'2')).join('\n'), /Added 2/)
    const reply = (await prepareReplies(phone,'3')).join('\n')
    assert.match(reply, /\/cart\/import#/)
    assert.doesNotMatch(reply, /pending payment|rzp\.io|orders@millco/)
    const orders = await db.from('orders').select('id').eq('customer_phone',phone)
    assert.equal(orders.data?.length,0)
    assert.match((await prepareReplies(phone,'track my order')).join('\n'), /full order ID/)
    assert.match((await prepareReplies(phone,'MENU')).join('\n'), /Browse products/)
  } finally {
    await db.from('chat_sessions').delete().eq('channel','whatsapp').eq('phone',phone)
  }
})
