import crypto from 'node:crypto'
import { HttpError } from '@/lib/server/api'
import { verifyMetaWebhookSignature } from '@/lib/server/metaWebhook'
import { parseMessages } from '@/lib/whatsapp/webhookPayload'
import { processMessage, redisCommand } from '@/lib/whatsapp/inbox'
import { sendWhatsAppMessage } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams
  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  const supplied = params.get('hub.verify_token') || ''
  if (expected && params.get('hub.mode') === 'subscribe' && Buffer.byteLength(expected) === Buffer.byteLength(supplied)
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return new Response(params.get('hub.challenge') || '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}
export async function POST(req: Request): Promise<Response> {
  // Disabled deployments do not read private data, call AI or send messages.
  if (process.env.WHATSAPP_ENABLED !== 'true' || process.env.NEXT_PUBLIC_FEATURE_WHATSAPP_BOT !== 'true') {
    return new Response('Disabled', { status: 200 })
  }
  try {
    const rawBody = await req.text()
    if (Buffer.byteLength(rawBody) > 262144) return new Response('Payload too large', { status: 413 })
    verifyMetaWebhookSignature({ rawBody, signatureHeader: req.headers.get('x-hub-signature-256') })
    let body: unknown
    try { body = JSON.parse(rawBody) } catch { return new Response('Invalid JSON', { status: 400 }) }
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (!phoneId) throw new Error('Missing phone number configuration')
    const messages = parseMessages(body, phoneId)
    const { prepareReplies } = await import('@/lib/whatsapp/bot')
    for (const message of messages) {
      await processMessage(message, { command: redisCommand, prepare: prepareReplies, send: sendWhatsAppMessage })
    }
    return new Response('OK', { status: 200 })
  } catch (error) {
    if (error instanceof HttpError) return new Response(error.message, { status: error.status })
    // No message bodies, credentials or customer details in logs.
    console.error('[whatsapp] Processing failed; provider retry required')
    return new Response('Temporarily unavailable', { status: 503 })
  }
}
