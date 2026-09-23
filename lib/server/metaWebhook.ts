import crypto from 'crypto'
import { HttpError } from '@/lib/server/api'
import { isProduction, optionalEnv } from '@/lib/server/env'

export function verifyMetaWebhookSignature(input: {
  rawBody: string
  signatureHeader: string | null
}) {
  const appSecret = optionalEnv('WHATSAPP_APP_SECRET') ?? optionalEnv('META_APP_SECRET')

  if (!appSecret) {
    if (isProduction()) {
      throw new HttpError(500, 'WhatsApp webhook signature verification is not configured', 'WEBHOOK_SIGNATURE_CONFIG_ERROR')
    }
    return
  }

  const signatureHeader = input.signatureHeader ?? ''
  if (!signatureHeader.startsWith('sha256=')) {
    throw new HttpError(401, 'Invalid WhatsApp webhook signature', 'INVALID_WEBHOOK_SIGNATURE')
  }

  const received = signatureHeader.slice('sha256='.length)
  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(input.rawBody)
    .digest('hex')

  const receivedBuffer = Buffer.from(received, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new HttpError(401, 'Invalid WhatsApp webhook signature', 'INVALID_WEBHOOK_SIGNATURE')
  }
}
