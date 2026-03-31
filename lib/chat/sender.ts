import { sendWhatsAppMessage } from '@/lib/whatsapp/meta'

export type Channel = 'whatsapp' | 'instagram'

export async function sendMessage(
  to: string,
  message: string,
  channel: Channel
): Promise<void> {
  if (channel === 'whatsapp') {
    await sendWhatsAppMessage(to, message)
    return
  }

  // Instagram sender can be plugged in later without changing callers.
  console.log('[chat] instagram sender not configured yet; skipping outbound message')
  void to
  void message
}
