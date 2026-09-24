import crypto from 'node:crypto'
import { HttpError } from '@/lib/server/api'

export async function redisCommand(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('WhatsApp inbox storage is not configured')
  const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error('WhatsApp inbox storage unavailable')
  const body = await response.json() as { result?: unknown; error?: unknown }
  if (body.error) throw new Error('WhatsApp inbox storage rejected request')
  return body.result
}
type InboxDependencies = {
  command: (args: unknown[]) => Promise<unknown>
  prepare: (phone: string, text: string) => Promise<string[]>
  send: (phone: string, text: string) => Promise<void>
}
type Receipt = { replies: string[]; next: number }
export async function processMessage(message: { id: string; phone: string; text: string }, deps: InboxDependencies): Promise<void> {
  const prefix = 'wa:' + (process.env.WHATSAPP_PHONE_NUMBER_ID || 'test') + ':'
  const key = prefix + 'message:' + crypto.createHash('sha256').update(message.id).digest('hex')
  const lock = prefix + 'sender:' + crypto.createHash('sha256').update(message.phone).digest('hex')
  const owner = crypto.randomUUID()
  if (await deps.command(['SET', lock, owner, 'NX', 'EX', 120]) !== 'OK') throw new HttpError(503, 'Sender busy; retry later', 'WHATSAPP_BUSY')
  try {
    const stored = await deps.command(['GET', key])
    let receipt: Receipt
    if (typeof stored === 'string') receipt = JSON.parse(stored) as Receipt
    else {
      const count = await deps.command(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60); end; return n", 1, lock + ':rate'])
      if (typeof count !== 'number' || count > 20) throw new HttpError(429, 'Message limit reached', 'WHATSAPP_RATE_LIMIT')
      receipt = { replies: await deps.prepare(message.phone, message.text), next: 0 }
      await deps.command(['SET', key, JSON.stringify(receipt), 'EX', 604800])
    }
    for (; receipt.next < receipt.replies.length;) {
      await deps.send(message.phone, receipt.replies[receipt.next])
      receipt.next += 1
      await deps.command(['SET', key, JSON.stringify(receipt), 'EX', 604800])
    }
  } finally {
    await deps.command(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, lock, owner])
  }
}
