import { sendWhatsAppMessage } from '@/lib/whatsapp/meta'
import { sendInstagramMessage } from '@/lib/instagram/meta'

export type Channel = 'whatsapp' | 'instagram'

export async function sendMessage(
  to: string,
  message: string,
  channel: Channel
): Promise<void> {
  if (channel === 'whatsapp') {
    await sendWhatsAppMessage(to, message)
  } else if (channel === 'instagram') {
    await sendInstagramMessage(to, message)
  }
}
