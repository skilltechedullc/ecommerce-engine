export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  if (process.env.WHATSAPP_ENABLED !== 'true') return
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const version = process.env.WHATSAPP_GRAPH_API_VERSION
  if (!phoneNumberId || !accessToken || !version || !/^v\d+\.0$/.test(version)) {
    throw new Error('Meta messaging configuration is incomplete')
  }
  const response = await fetch('https://graph.facebook.com/' + version + '/' + phoneNumberId + '/messages', {
    method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message.slice(0, 4096), preview_url: false } }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Meta message delivery failed (' + response.status + ')')
}
