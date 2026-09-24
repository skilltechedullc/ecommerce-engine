import Razorpay from 'razorpay'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { env } from './env'
import { assertRazorpayPaymentMatches } from './checkoutHardening'
import { checkoutCustomerSchema } from './checkoutCustomer'

export async function recoverCapturedCheckout(orderId: string, paymentId: string, fetchSnapshots = fetchPaymentSnapshots): Promise<string | null> {
  const db = getSupabaseAdmin()
  const { data: session, error } = await db.from('checkout_sessions').select('*').eq('razorpay_order_id', orderId).maybeSingle()
  if (error) throw new Error('Checkout recovery lookup failed')
  if (!session) return null // Another store may use the same Razorpay account.
  const customer = checkoutCustomerSchema.safeParse(session.customer)
  if (!customer.success) throw new Error('Checkout requires manual recovery: missing contact snapshot')
  const [payment, order] = await fetchSnapshots(orderId, paymentId)
  assertRazorpayPaymentMatches({ razorpayOrderId: orderId, razorpayPaymentId: paymentId,
    expectedAmountPaise: Number(session.amount_paise), expectedCurrency: session.currency,
    payment: { id: payment.id, order_id: payment.order_id, amount: Number(payment.amount), currency: payment.currency, status: payment.status },
    order: { id: order.id, amount: Number(order.amount), currency: order.currency, status: order.status },
  })
  const { error: verifiedError } = await db.from('checkout_sessions').update({ status: 'payment_verified', razorpay_payment_id: paymentId, failure_reason: null })
    .eq('id', session.id).neq('status', 'order_saved')
  if (verifiedError) throw new Error('Could not record payment verification')
  const { data: saved, error: saveError } = await db.rpc('complete_checkout', {
    p_order: { customer_name: customer.data.name, customer_email: customer.data.email, customer_phone: customer.data.phone,
      customer_address: customer.data.address, total_amount: Number(session.amount_paise) / 100,
      shipping_amount: Number(session.shipping_amount), payment_method: 'razorpay', razorpay_order_id: orderId, razorpay_payment_id: paymentId },
    p_items: session.items,
  })
  if (saveError || !saved?.order_id) {
    await db.from('checkout_sessions').update({ status: 'order_save_failed', failure_reason: 'Captured payment requires recovery; check price, stock and order records' })
      .eq('id', session.id).neq('status', 'order_saved')
    throw new Error('Captured payment requires recovery')
  }
  return String(saved.order_id)
}

async function fetchPaymentSnapshots(orderId: string, paymentId: string) {
  const razorpay = new Razorpay({ key_id: env('RAZORPAY_KEY_ID'), key_secret: env('RAZORPAY_KEY_SECRET') })
  const [payment, order] = await Promise.all([razorpay.payments.fetch(paymentId), razorpay.orders.fetch(orderId)])
  return [payment, order] as const
}
