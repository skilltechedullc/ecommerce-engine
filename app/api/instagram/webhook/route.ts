import { handleIncomingMessage } from '@/lib/whatsapp/bot'

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && verifyToken === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      object?: string
      entry?: Array<{
        messaging?: Array<{
          sender?: { id: string }
          recipient?: { id: string }
          message?: { text?: string }
        }>
      }>
    }

    const messaging = body.entry?.[0]?.messaging?.[0]
    if (!messaging) return new Response('OK', { status: 200 })

    const senderId = messaging.sender?.id
    const text = messaging.message?.text?.trim()

    if (!senderId || !text) return new Response('OK', { status: 200 })

    // Ignore messages from the page itself
    const instagramPageId = process.env.INSTAGRAM_PAGE_ID
    if (instagramPageId && senderId === instagramPageId) {
      return new Response('OK', { status: 200 })
    }

    await handleIncomingMessage(senderId, text, 'instagram')
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[instagram] webhook POST failed', error)
    return new Response('OK', { status: 200 })
  }
}
