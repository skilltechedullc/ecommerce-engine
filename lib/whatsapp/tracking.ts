import { normalizeTenantPhone } from '@/lib/tenant.config'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const ORDER_ID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
export function extractOrderId(text: string): string | null {
  return text.match(ORDER_ID_PATTERN)?.[0].toLowerCase() ?? null
}
export function senderOwnsOrder(sender: string, orderPhone: string): boolean {
  // Meta supplies an international sender number. Never use a number supplied in message text.
  if (!/^[1-9]\d{7,14}$/.test(sender)) return false
  return normalizeTenantPhone(orderPhone).replace(/\D/g, '') === sender
}
export function safeTrackingUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
type TrackingOrder = { id: string; customer_phone: string; status: string; shipments: Array<{ status?: string; awb_number?: string; tracking_url?: string; estimated_delivery?: string }> }
async function loadOrder(id: string): Promise<TrackingOrder | null> {
  const { data, error } = await getSupabaseAdmin().from('orders')
    .select('id, customer_phone, status, shipments(provider, awb_number, tracking_url, status, estimated_delivery)')
    .eq('id', id).maybeSingle()
  if (error) throw new Error('Order lookup unavailable')
  return data as TrackingOrder | null
}
export async function trackWhatsAppOrder(sender: string, text: string, lookup = loadOrder): Promise<string> {
  const id = extractOrderId(text)
  if (!id) return 'Please send the full order ID from your confirmation email. Use the same WhatsApp number you entered at checkout. Reply MENU to return to shopping.'
  const data = await lookup(id)
  if (!data || !senderOwnsOrder(sender, String(data.customer_phone ?? ''))) {
    return 'I could not find that order for this WhatsApp number. Check the full order ID and use the number entered at checkout, or contact store support.'
  }
  const lines = ['Order: ' + data.id, 'Status: ' + data.status]
  for (const shipment of (data.shipments ?? []).slice(0, 3)) {
    if (shipment.status) lines.push('Shipment: ' + shipment.status)
    if (shipment.awb_number) lines.push('Tracking reference: ' + shipment.awb_number)
    const url = safeTrackingUrl(shipment.tracking_url)
    if (url) lines.push('Track shipment: ' + url)
    if (shipment.estimated_delivery) lines.push('Estimated delivery: ' + shipment.estimated_delivery)
  }
  lines.push('Reply MENU to return to shopping.')
  return lines.join('\n')
}
