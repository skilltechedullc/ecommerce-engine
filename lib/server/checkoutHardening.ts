export type CheckoutInputItem = {
  variant_id: string
  quantity: number
  variant_name?: string
}

export type RazorpayPaymentSnapshot = {
  id: string
  order_id: string
  amount: number | string
  currency: string
  status: string
}

export type RazorpayOrderSnapshot = {
  id: string
  amount: number | string
  currency: string
  status: string
}

export class CheckoutHardeningError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function aggregateCheckoutItems<T extends CheckoutInputItem>(items: T[]): T[] {
  const quantityByVariant = new Map<string, T>()

  for (const item of items) {
    const existing = quantityByVariant.get(item.variant_id)
    if (existing) {
      quantityByVariant.set(item.variant_id, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      })
      continue
    }

    quantityByVariant.set(item.variant_id, { ...item })
  }

  return Array.from(quantityByVariant.values())
}

export function amountToPaise(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new CheckoutHardeningError(400, 'Order total is invalid', 'VALIDATION_ERROR')
  }

  return Math.round(amount * 100)
}

export function assertRazorpayPaymentMatches(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  expectedAmountPaise: number
  expectedCurrency: string
  payment: RazorpayPaymentSnapshot
  order: RazorpayOrderSnapshot
}) {
  if (input.payment.id !== input.razorpayPaymentId) {
    throw new CheckoutHardeningError(400, 'Payment verification failed', 'PAYMENT_VERIFICATION_FAILED')
  }

  if (input.payment.order_id !== input.razorpayOrderId || input.order.id !== input.razorpayOrderId) {
    throw new CheckoutHardeningError(400, 'Payment/order mismatch', 'PAYMENT_ORDER_MISMATCH')
  }

  const paymentAmount = Number(input.payment.amount)
  const orderAmount = Number(input.order.amount)

  if (
    !Number.isFinite(paymentAmount) ||
    !Number.isFinite(orderAmount) ||
    paymentAmount !== input.expectedAmountPaise ||
    orderAmount !== input.expectedAmountPaise
  ) {
    throw new CheckoutHardeningError(400, 'Payment amount mismatch', 'PAYMENT_AMOUNT_MISMATCH')
  }

  if (input.payment.currency !== input.expectedCurrency || input.order.currency !== input.expectedCurrency) {
    throw new CheckoutHardeningError(400, 'Payment currency mismatch', 'PAYMENT_CURRENCY_MISMATCH')
  }

  if (input.payment.status !== 'captured') {
    throw new CheckoutHardeningError(402, 'Payment is not captured yet', 'PAYMENT_NOT_CAPTURED', {
      paymentStatus: input.payment.status,
      orderStatus: input.order.status,
    })
  }
}
