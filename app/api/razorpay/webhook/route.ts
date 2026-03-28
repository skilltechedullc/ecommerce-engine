import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonError, jsonOk } from '@/lib/server/api'
import { env } from '@/lib/server/env'

// Must be disabled so we can read the raw body for HMAC verification
export const dynamic = 'force-dynamic'

// ─── Razorpay webhook event types we care about ──────────────────────────────
// payment.captured → customer paid, capture confirmed by Razorpay
// order.paid       → order fully paid (also reliable trigger)
// payment.failed   → payment attempt failed
// payment.dispute.created → dispute was raised
// refund.processed → refund was processed
const PAID_EVENTS = new Set(['payment.captured', 'order.paid'])
const RISK_EVENTS = new Set(['payment.failed', 'payment.dispute.created', 'refund.processed'])
const HANDLED_EVENTS = new Set([...PAID_EVENTS, ...RISK_EVENTS])

function extractRefs(event: RazorpayWebhookEvent): {
  orderId?: string
  paymentId?: string
} {
  const paymentEntity = event.payload?.payment?.entity
  const orderEntity = event.payload?.order?.entity
  const refundEntity = event.payload?.refund?.entity

  return {
    orderId: paymentEntity?.order_id ?? orderEntity?.id ?? refundEntity?.order_id,
    paymentId: paymentEntity?.id ?? refundEntity?.payment_id,
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id')?.trim() || crypto.randomUUID()

  // 1. Read raw body — MUST use text(), never json(), for correct HMAC input
  const rawBody = await req.text()

  // 2. Verify Razorpay signature
  try {
    const receivedSig = req.headers.get('x-razorpay-signature') ?? ''
    const expectedSig = crypto
      .createHmac('sha256', env('RAZORPAY_WEBHOOK_SECRET'))
      .update(rawBody)
      .digest('hex')

    const expectedBuf = Buffer.from(expectedSig, 'hex')
    const receivedBuf = Buffer.from(receivedSig, 'hex')

    if (
      !receivedSig ||
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new HttpError(400, 'Invalid signature', 'INVALID_SIGNATURE')
    }

    // 3. Parse verified payload
    let event: RazorpayWebhookEvent
    try {
      event = JSON.parse(rawBody) as RazorpayWebhookEvent
    } catch {
      throw new HttpError(400, 'Invalid JSON', 'INVALID_JSON')
    }

    // 4. Ignore events we don't handle (return 200 so Razorpay stops retrying)
    if (!HANDLED_EVENTS.has(event.event)) {
      return jsonOk({ received: true }, { requestId })
    }

    // 5. Extract order/payment references from payload
    const { orderId: razorpayOrderId, paymentId: razorpayPaymentId } = extractRefs(event)

    // For non-paid events, we acknowledge and log for operational visibility.
    // This prevents accidental auto-fulfillment state changes from risk events.
    if (RISK_EVENTS.has(event.event)) {
      return jsonOk({ received: true }, { requestId })
    }

    if (!razorpayOrderId) {
      return jsonOk({ received: true }, { requestId })
    }

    const supabase = getSupabaseAdmin()

    // 6. Fetch the order (idempotency: skip if already Paid or beyond)
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('razorpay_order_id', razorpayOrderId)
      .single()

    if (fetchError || !order) {
      // Order might not exist yet if the webhook arrives before save-order completes.
      // Razorpay retries webhooks, so returning 404 triggers a retry.
      throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
    }

    const ALREADY_HANDLED = new Set(['Paid', 'Processing', 'Shipped', 'Delivered'])
    if (ALREADY_HANDLED.has(order.status)) {
      // Already processed — acknowledge without doing anything
      return jsonOk({ received: true }, { requestId })
    }

    // 7. Update order status to Paid and stamp the payment id if missing
    const updatePayload: Record<string, string> = { status: 'Paid' }
    if (razorpayPaymentId && !order.razorpay_payment_id) {
      updatePayload.razorpay_payment_id = razorpayPaymentId
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id)

    if (updateError) {
      throw new HttpError(500, 'DB update failed', 'DB_UPDATE_FAILED', updateError)
    }

    return jsonOk({ received: true }, { requestId })
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.message, {
        status: error.status,
        code: error.code,
        details: error.details,
        requestId,
      })
    }
    return jsonError('Internal server error', {
      status: 500,
      code: 'INTERNAL_ERROR',
      requestId,
    })
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RazorpayPaymentEntity {
  id: string
  order_id: string
  status: string
  amount: number
  currency: string
}

interface RazorpayWebhookEvent {
  entity: string
  event: string
  payload: {
    payment?: {
      entity: RazorpayPaymentEntity
    }
    order?: {
      entity: {
        id: string
        status: string
      }
    }
    refund?: {
      entity: {
        id: string
        payment_id?: string
        order_id?: string
        status?: string
      }
    }
  }
}
