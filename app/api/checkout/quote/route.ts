import { NextRequest } from 'next/server'
import { jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { checkoutQuote } from '@/lib/server/checkoutQuote'
import { enforceRateLimit } from '@/lib/server/rateLimit'
export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'coupon-quote', windowMs: 60000, maxRequests: 30 })
    const body = await parseJson<{ items?: unknown; couponCode?: unknown; address?: string }>(req)
    const q = await checkoutQuote(body.items, body.couponCode, typeof body.address === 'string' ? body.address.slice(0, 2000) : '')
    return jsonOk({ code: q.coupon?.code ?? null, subtotal: q.subtotal, discount: q.discount, shippingAmount: q.shippingAmount, total: q.total }, { requestId })
  })
}
