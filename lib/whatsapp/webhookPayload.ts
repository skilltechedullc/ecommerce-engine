export type IncomingMessage = { id: string; phone: string; text: string }
export function parseMessages(body: unknown, phoneNumberId: string): IncomingMessage[] {
  if (!body || typeof body !== 'object') return []
  const root = body as { object?: string; entry?: Array<{ changes?: Array<{ value?: {
    metadata?: { phone_number_id?: string }; messages?: Array<{ id?: string; from?: string; type?: string; text?: { body?: string } }>
  } }> }> }
  if (root.object !== 'whatsapp_business_account') return []
  const result: IncomingMessage[] = []
  for (const entry of root.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.value?.metadata?.phone_number_id !== phoneNumberId) continue
    for (const message of change.value.messages ?? []) {
      if (message.type !== 'text' || typeof message.id !== 'string' || message.id.length > 256 || !message.id
        || typeof message.from !== 'string' || !/^[1-9]\d{7,14}$/.test(message.from)
        || typeof message.text?.body !== 'string' || !message.text.body.trim()) continue
      result.push({ id: message.id, phone: message.from, text: message.text.body.trim().slice(0, 1000) })
    }
  }
  return result
}
