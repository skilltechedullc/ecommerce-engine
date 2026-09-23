import { handleIncomingMessage } from '@/lib/whatsapp/bot'
import { HttpError } from '@/lib/server/api'
import { verifyMetaWebhookSignature } from '@/lib/server/metaWebhook'

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: Request): Promise<Response> {
  try {
    const rawBody = await req.text()
    verifyMetaWebhookSignature({
      rawBody,
      signatureHeader: req.headers.get('x-hub-signature-256'),
    })

    const body = JSON.parse(rawBody) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            statuses?: unknown
            messages?: Array<{
              type?: string
              from?: string
              text?: {
                body?: string
              }
            }>
          }
        }>
      }>
    }

    const value = body.entry?.[0]?.changes?.[0]?.value
    if (!value) return new Response('OK', { status: 200 })
    if (value.statuses) return new Response('OK', { status: 200 })
    if (!value.messages || value.messages.length === 0) return new Response('OK', { status: 200 })

    const message = value.messages[0]
    if (message.type !== 'text') return new Response('OK', { status: 200 })

    const phone = message.from
    const text = message.text?.body?.trim()
    if (!phone || !text) return new Response('OK', { status: 200 })

    await handleIncomingMessage(phone, text)
    return new Response('OK', { status: 200 })
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(error.message, { status: error.status })
    }

    console.error('[whatsapp] webhook POST failed', error)
    return new Response('OK', { status: 200 })
  }
}
