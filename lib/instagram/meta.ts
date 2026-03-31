import { optionalEnv } from '@/lib/server/env'

export async function sendInstagramMessage(to: string, message: string): Promise<void> {
  const instagramPageAccessToken = optionalEnv('INSTAGRAM_PAGE_ACCESS_TOKEN')
  const instagramPageId = optionalEnv('INSTAGRAM_PAGE_ID')
  if (!instagramPageAccessToken || !instagramPageId) {
    console.error(
      '[instagram] missing env: INSTAGRAM_PAGE_ACCESS_TOKEN or INSTAGRAM_PAGE_ID'
    )
    return
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${instagramPageId}/messages`
    const payload = {
      recipient: { id: to },
      message: { text: message },
      messaging_type: 'RESPONSE',
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${instagramPageAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      const errorMessage =
        (data.error as Record<string, unknown>)?.message ||
        `HTTP ${response.status}`
      console.error(`[instagram] failed to send message to ${to}:`, errorMessage)
      return
    }

    console.log(`[instagram] message sent to ${to}: ${(data.message_id as string) || 'no id'}`)
  } catch (error) {
    console.error(`[instagram] exception sending message to ${to}:`, error)
  }
}
