export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('[whatsapp] Missing Meta Cloud API credentials')
    return
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message,
          preview_url: false,
        },
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[whatsapp] Meta send failed', {
        status: response.status,
        statusText: response.statusText,
        body,
      })
    }
  } catch (error) {
    console.error('[whatsapp] Meta send error', error)
  }
}
