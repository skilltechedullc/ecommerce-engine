import { OTP_COOKIE } from '@/lib/server/couponOtpCrypto'
import { browserDigest } from '@/lib/server/couponOtp'
import { reservedCouponCheckout } from '@/lib/server/couponCheckoutResume'
import { NextRequest } from 'next/server'
import { jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { checkoutQuote } from '@/lib/server/checkoutQuote'
import { enforceRateLimit } from '@/lib/server/rateLimit'
export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'coupon-quote', windowMs: 60000, maxRequests: 30 })
    const body = await parseJson<{ items?: unknown; couponCode?: unknown; address?: string; customer?: unknown; challengeId?: string }>(req)
    const otp={challengeId:body.challengeId,browserHash:browserDigest(req.cookies.get(OTP_COOKIE)?.value)}
    const reserved=await reservedCouponCheckout(otp,body.couponCode,body.items,body.customer)
    if(reserved)return jsonOk({code:reserved.coupon_code,subtotal:Number(reserved.subtotal_amount),discount:Number(reserved.discount_amount),shippingAmount:Number(reserved.shipping_amount),total:Number(reserved.amount_paise)/100},{requestId})
    const q = await checkoutQuote(body.items, body.couponCode, typeof body.address === 'string' ? body.address.slice(0, 2000) : '', body.customer, otp)
    return jsonOk({ code: q.coupon?.code ?? null, subtotal: q.subtotal, discount: q.discount, shippingAmount: q.shippingAmount, total: q.total }, { requestId })
  })
}
