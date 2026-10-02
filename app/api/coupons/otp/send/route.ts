import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { jsonOk,parseJson,withApiHandler,HttpError } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { checkoutQuote } from '@/lib/server/checkoutQuote'
import { issueCouponOtp } from '@/lib/server/couponOtp'
import { OTP_COOKIE,validBrowserSecret } from '@/lib/server/couponOtpCrypto'
import { requireWhatsappOtpReady } from '@/lib/server/whatsappOtp'
export async function POST(req:NextRequest){return withApiHandler(req,async({requestId})=>{
 enforceSameOriginMutation(req)
 await enforceRateLimit(req,{keyPrefix:'coupon-otp-send',windowMs:3600000,maxRequests:10})
 requireWhatsappOtpReady()
 const body=await parseJson<{items?:unknown;couponCode?:unknown;customer?:unknown;address?:string}>(req)
 const quote=await checkoutQuote(body.items,body.couponCode,typeof body.address==='string'?body.address.slice(0,1500):'',body.customer,{prepare:true})
 if(!quote.coupon?.require_whatsapp_otp)throw new HttpError(400,'This coupon does not require WhatsApp verification.','OTP_NOT_REQUIRED')
 const existing=req.cookies.get(OTP_COOKIE)?.value
 const browser=validBrowserSecret(existing)?existing:crypto.randomBytes(32).toString('hex')
 const result=await issueCouponOtp(quote.coupon.id,body.customer,browser)
 const response=jsonOk(result,{requestId})
 response.headers.set('Cache-Control','no-store')
 response.cookies.set(OTP_COOKIE,browser,{httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'strict',path:'/',maxAge:86400})
 return response
})}
