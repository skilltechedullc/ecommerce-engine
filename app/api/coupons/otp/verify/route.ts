import { NextRequest } from 'next/server'
import { jsonOk,parseJson,withApiHandler,HttpError } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { verifyCouponOtp } from '@/lib/server/couponOtp'
import { OTP_COOKIE } from '@/lib/server/couponOtpCrypto'
import { requireWhatsappOtpReady } from '@/lib/server/whatsappOtp'
export async function POST(req:NextRequest){return withApiHandler(req,async({requestId})=>{
 enforceSameOriginMutation(req)
 await enforceRateLimit(req,{keyPrefix:'coupon-otp-verify',windowMs:600000,maxRequests:30})
 requireWhatsappOtpReady()
 const body=await parseJson<{challengeId?:unknown;code?:unknown}>(req)
 if(typeof body.challengeId!=='string'||typeof body.code!=='string')throw new HttpError(400,'Enter the six-digit code.','OTP_INVALID')
 const result=await verifyCouponOtp(body.challengeId,body.code,req.cookies.get(OTP_COOKIE)?.value)
 const response=jsonOk(result,{requestId});response.headers.set('Cache-Control','no-store');return response
})}
