import { after, NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { HttpError, jsonError, jsonOk } from '@/lib/server/api'
import { env } from '@/lib/server/env'
import { recoverCapturedCheckout } from '@/lib/server/recoverCheckout'
import { notifyOrderPlaced } from '@/lib/server/notifications'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const rawBody = await req.text()
    const received = req.headers.get('x-razorpay-signature') || ''
    const expected = crypto.createHmac('sha256', env('RAZORPAY_WEBHOOK_SECRET')).update(rawBody).digest('hex')
    if (!/^[a-f0-9]{64}$/i.test(received) || !crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))) {
      throw new HttpError(400, 'Invalid signature', 'INVALID_SIGNATURE')
    }
    let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } }
    try { event = JSON.parse(rawBody) } catch { throw new HttpError(400, 'Invalid JSON', 'INVALID_JSON') }
    if (!['payment.captured', 'order.paid'].includes(event.event || '')) return jsonOk({ received: true }, { requestId })
    const payment = event.payload?.payment?.entity
    if (!payment?.id || !payment.order_id) return jsonOk({ received: true }, { requestId })
    const db = getSupabaseAdmin()
    const { data: existing, error } = await db.from('orders').select('id, razorpay_payment_id')
      .eq('razorpay_order_id', payment.order_id).maybeSingle()
    if (error) throw new Error('Order lookup failed')
    if (existing) {
      if (existing.razorpay_payment_id !== payment.id) throw new HttpError(409, 'Payment reference mismatch', 'PAYMENT_MISMATCH')
      // Retry notifications too: a prior request could have saved the order but lost its after() work.
      after(() => notifyOrderPlaced(existing.id))
      return jsonOk({ received: true }, { requestId })
    }
    const recoveredId = await recoverCapturedCheckout(payment.order_id, payment.id)
    if (recoveredId) after(() => notifyOrderPlaced(recoveredId))
    // Unknown orders can belong to another store sharing a test payment account.
    return jsonOk({ received: true }, { requestId })
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.message, { status: error.status, code: error.code, requestId })
    console.error('[payments] Captured payment recovery needs retry or operator review', { requestId })
    return jsonError('Payment recovery temporarily unavailable', { status: 503, code: 'RECOVERY_RETRY_REQUIRED', requestId })
  }
}
