import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonError, jsonOk } from '@/lib/server/api'
import { env } from '@/lib/server/env'
import { sendWhatsAppMessage } from '@/lib/whatsapp/meta'
import { tenantConfig } from '@/lib/tenant.config'
import { createShipmentForOrder } from '@/lib/shipping/service'
import type { Address, CreateShipmentInput } from '@/lib/shipping/types'

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

type ShipmentOrderItemRow = {
  product_name: string | null
  quantity: number | null
  price: number | null
}

function parseDeliveryAddress(rawAddress: string, fallbackName: string, fallbackPhone: string): Address {
  const trimmed = rawAddress.trim()
  const [line1, line2] = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return {
    name: fallbackName,
    phone: fallbackPhone,
    addressLine1: line1 || trimmed || 'Address not provided',
    addressLine2: line2,
    city: tenantConfig.contact.address.city,
    state: tenantConfig.contact.address.state,
    pincode: tenantConfig.contact.address.postalCode,
    country: tenantConfig.contact.address.country,
  }
}

function getPickupAddress(): Address {
  const pickup = tenantConfig.shipping.pickupAddress
  return {
    name: pickup.name,
    phone: pickup.phone,
    addressLine1: pickup.addressLine1,
    addressLine2: pickup.addressLine2,
    city: pickup.city,
    state: pickup.state,
    pincode: pickup.pincode,
    country: pickup.country,
  }
}

function extractRefs(event: RazorpayWebhookEvent): {
  orderId?: string
  paymentId?: string
  dbOrderId?: string
} {
  const paymentEntity = event.payload?.payment?.entity
  const orderEntity = event.payload?.order?.entity
  const refundEntity = event.payload?.refund?.entity
  const notes = paymentEntity?.notes ?? orderEntity?.notes

  return {
    orderId: paymentEntity?.order_id ?? orderEntity?.id ?? refundEntity?.order_id,
    paymentId: paymentEntity?.id ?? refundEntity?.payment_id,
    dbOrderId: typeof notes?.db_order_id === 'string' ? notes.db_order_id : undefined,
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
    const { orderId: razorpayOrderId, paymentId: razorpayPaymentId, dbOrderId } = extractRefs(event)

    // For non-paid events, we acknowledge and log for operational visibility.
    // This prevents accidental auto-fulfillment state changes from risk events.
    if (RISK_EVENTS.has(event.event)) {
      return jsonOk({ received: true }, { requestId })
    }

    if (!razorpayOrderId && !dbOrderId) {
      return jsonOk({ received: true }, { requestId })
    }

    const supabase = getSupabaseAdmin()

    // 6. Fetch the order (idempotency: skip if already Paid or beyond)
    let order: Record<string, unknown> | null = null

    if (razorpayOrderId) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle()
      order = data as Record<string, unknown> | null
    }

    if (!order && dbOrderId) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', dbOrderId)
        .maybeSingle()
      order = data as Record<string, unknown> | null
    }

    if (!order) {
      throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
    }

    const ALREADY_HANDLED = new Set(['Paid', 'Processing', 'Shipped', 'Delivered'])
    const currentStatus = String(order.status ?? '')
    if (ALREADY_HANDLED.has(currentStatus as 'Paid' | 'Processing' | 'Shipped' | 'Delivered')) {
      // Already processed — acknowledge without doing anything
      return jsonOk({ received: true }, { requestId })
    }

    // 7. Update order status to Paid and stamp the payment id if missing
    const updatePayload: Record<string, string> = { status: 'Paid' }
    const existingPaymentId = String(order.razorpay_payment_id ?? '')
    if (razorpayPaymentId && (!existingPaymentId || existingPaymentId.startsWith('wa_pending_') || existingPaymentId !== razorpayPaymentId)) {
      updatePayload.razorpay_payment_id = razorpayPaymentId
    }

    if (razorpayOrderId) {
      const existingOrderId = String(order.razorpay_order_id ?? '')
      if (!existingOrderId || existingOrderId.startsWith('wa_pending_') || existingOrderId !== razorpayOrderId) {
        updatePayload.razorpay_order_id = razorpayOrderId
      }
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', String(order.id))
      .in('status', ['Pending', 'pending'])
      .select('id, customer_phone')
      .maybeSingle()

    if (updateError) {
      throw new HttpError(500, 'DB update failed', 'DB_UPDATE_FAILED', updateError)
    }

    // Another webhook event may have already moved the status to Paid.
    // In that case, skip outbound confirmations to avoid duplicate messages.
    if (!updatedOrder) {
      return jsonOk({ received: true }, { requestId })
    }

    const customerPhone = String(updatedOrder.customer_phone ?? order.customer_phone ?? '').trim()
    if (customerPhone) {
      const normalizedId = String(order.id ?? '').replace(/-/g, '')
      const displayOrderId = `ORD-${normalizedId.slice(-6).toUpperCase()}`
      await sendWhatsAppMessage(customerPhone, `Thank you! Your payment is successful. Order confirmed: ${displayOrderId}`)

      const whatsapp = tenantConfig.contact.whatsappNumber.trim()
      if (whatsapp) {
        await sendWhatsAppMessage(customerPhone, `For help, contact us on WhatsApp: ${whatsapp}`)
      }
    }

    if (tenantConfig.shipping.autoCreate) {
      try {
        const source = String(order.source ?? '').toLowerCase()
        const customerChannel = source === 'whatsapp' || source === 'instagram'
          ? source
          : undefined

        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_name, quantity, price')
          .eq('order_id', String(order.id))
          .returns<ShipmentOrderItemRow[]>()

        if (itemsError) {
          console.error('[shipping] failed to fetch order_items for auto-create', itemsError)
        } else {
          const orderId = String(order.id)
          const orderNumber = `ORD-${orderId.replace(/-/g, '').slice(-6).toUpperCase()}`
          const customerName = String(order.customer_name ?? 'Customer').trim() || 'Customer'
          const deliveryAddress = parseDeliveryAddress(String(order.customer_address ?? ''), customerName, customerPhone)

          const shipmentInput: CreateShipmentInput = {
            orderId,
            orderNumber,
            customerName,
            customerPhone,
            deliveryAddress,
            pickupAddress: getPickupAddress(),
            items: (orderItems ?? []).map((item) => ({
              name: String(item.product_name ?? 'Product'),
              quantity: Math.max(1, Number(item.quantity ?? 1)),
              price: Number(item.price ?? 0),
            })),
            totalAmount: Number(order.total_amount ?? 0),
            paymentMethod: 'prepaid',
          }

          const shipmentResult = await createShipmentForOrder(
            shipmentInput,
            customerChannel,
            customerPhone || undefined
          )

          if (!shipmentResult.success) {
            console.error('[shipping] auto-create shipment failed', shipmentResult.error)
          }
        }
      } catch (shippingError) {
        console.error('[shipping] auto-create shipment threw error', shippingError)
      }
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
  notes?: Record<string, string>
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
        notes?: Record<string, string>
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
