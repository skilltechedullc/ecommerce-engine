import { checkoutCustomerSchema } from '@/lib/server/checkoutCustomer'
import Razorpay from 'razorpay'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { storeConfig } from '@/lib/config'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { amountToPaise } from '@/lib/server/checkoutHardening'
import { env } from '@/lib/server/env'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { checkoutQuote } from '@/lib/server/checkoutQuote'

const razorpay = new Razorpay({
  key_id: env('RAZORPAY_KEY_ID'),
  key_secret: env('RAZORPAY_KEY_SECRET'),
})

type CreateOrderBody = {
  items?: Array<{
    variant_id?: string
    quantity?: number
  }>
  customer?: unknown
  deliveryAddress?: string
  couponCode?: string
  expectedAmount?: number
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, {
      keyPrefix: 'create-order',
      windowMs: 60 * 1000,
      maxRequests: 30,
    })

    const body = await parseJson<CreateOrderBody>(req)
    const parsedCustomer = checkoutCustomerSchema.safeParse(body.customer)
    if (!parsedCustomer.success) throw new HttpError(400, 'Valid customer contact and delivery details are required', 'INVALID_CUSTOMER')
    const customer = parsedCustomer.data

    const supabaseAdmin = getSupabaseAdmin()
    const quote = await checkoutQuote(body.items, body.couponCode, customer.address)
    if (body.expectedAmount !== undefined && body.expectedAmount !== amountToPaise(quote.total)) throw new HttpError(409, 'Your total changed. Reapply the coupon or refresh your cart before paying.', 'TOTAL_CHANGED')
    const amountPaise = amountToPaise(quote.total)
    const checkoutSessionId = crypto.randomUUID()

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: storeConfig.currency,
      receipt: `checkout_${checkoutSessionId.replace(/-/g, '').slice(0, 24)}`,
      notes: {
        checkout_session_id: checkoutSessionId,
      },
    })

    const { error: checkoutError } = await supabaseAdmin
      .rpc('reserve_coupon_checkout', { p_session: {
        id: checkoutSessionId,
        razorpay_order_id: order.id,
        amount_paise: amountPaise,
        subtotal_amount: quote.subtotal,
        shipping_amount: quote.shippingAmount,
        currency: storeConfig.currency,
        items: quote.items,
        coupon_id: quote.coupon?.id ?? null,
        coupon_code: quote.coupon?.code ?? null,
        discount_amount: quote.discount,
        customer,
        status: 'created',
      } })

    if (checkoutError) {
      throw new HttpError(409, 'Checkout could not be started. Reapply your coupon or retry without it.', 'CHECKOUT_RESERVATION_FAILED')
    }

    return jsonOk({
      order_id: order.id,
      amount: order.amount,
      subtotal: quote.subtotal,
      discount_amount: quote.discount,
      coupon_code: quote.coupon?.code ?? null,
      shipping_amount: quote.shippingAmount,
      checkout_session_id: checkoutSessionId,
    }, { requestId })
  })
}

