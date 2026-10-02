import crypto from 'node:crypto'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError } from '@/lib/server/api'
import { couponIdentity } from './couponIdentity'
import { generateOtp, otpDigest, validBrowserSecret } from './couponOtpCrypto'
import { sendWhatsappOtp } from './whatsappOtp'
export type OtpContext = { challengeId?: string; browserHash?: string; prepare?: boolean }
export function browserDigest(value: unknown) {
 return (process.env.COUPON_OTP_SECRET?.length ?? 0)>=32 && validBrowserSecret(value) ? otpDigest(process.env.COUPON_OTP_SECRET ?? '', 'browser', value) : undefined
}
export async function loadCouponProof(context: OtpContext, couponId: string, contact: unknown) {
 if (!z.string().uuid().safeParse(context.challengeId).success || !context.browserHash) return null
 const identity=couponIdentity(contact)
 const {data,error}=await getSupabaseAdmin().from('coupon_otp_challenges').select('id,coupon_id,phone,email,verified_until,checkout_id,invalidated,delivery_state').eq('id',context.challengeId!).eq('browser_hash',context.browserHash).eq('coupon_id',couponId).eq('phone',identity.phone).eq('email',identity.email).maybeSingle()
 if(error)throw new HttpError(503,'Unable to check verification. Please try again.','OTP_LOOKUP_FAILED')
 if(!data || data.invalidated || data.delivery_state!=='sent' || !data.verified_until || (!data.checkout_id && Date.parse(data.verified_until)<=Date.now()))return null
 return data
}
// Injectable sender is used only by isolated tests, never selected by HTTP input or an environment bypass.
export async function issueCouponOtp(couponId: string, contact: unknown, browserSecret: string, send=sendWhatsappOtp) {
 const identity=couponIdentity(contact), secret=process.env.COUPON_OTP_SECRET ?? ''
 const id=crypto.randomUUID(), code=generateOtp(), browserHash=browserDigest(browserSecret)
 if(!browserHash)throw new HttpError(400,'Invalid verification session','OTP_SESSION_INVALID')
 const db=getSupabaseAdmin()
 const daily=Number(process.env.WHATSAPP_OTP_DAILY_LIMIT ?? '100')
 const {data,error}=await db.rpc('begin_coupon_otp',{p_challenge:{id,coupon_id:couponId,...identity,browser_hash:browserHash,code_hash:otpDigest(secret,'code',id+':'+code)},p_daily_limit:Number.isInteger(daily)&&daily>0?Math.min(daily,10000):100})
 if(error)throw new HttpError(503,'Unable to start verification. Please try again.','OTP_START_FAILED')
 if(data!=='ok')throw new HttpError(429,data==='cooldown'?'Please wait 60 seconds before requesting another code.':'The verification sending limit has been reached. Please try later or continue without a coupon.','OTP_SEND_LIMIT')
 try {
  await send(identity.phone,code)
  const result=await db.from('coupon_otp_challenges').update({delivery_state:'sent'}).eq('id',id)
  if(result.error)throw new Error('Could not record delivery')
 } catch (error) {
  await db.from('coupon_otp_challenges').update({delivery_state:'failed',invalidated:true}).eq('id',id)
  if(error instanceof HttpError)throw error
  throw new HttpError(503,'Could not send a verification code. Please try again later.','OTP_DELIVERY_FAILED')
 }
 return {challengeId:id,expiresIn:300,resendAfter:60,phoneHint:'••••••'+identity.phone.slice(-4)}
}
export async function verifyCouponOtp(challengeId: string, code: string, browserSecret: unknown) {
 const browserHash=browserDigest(browserSecret)
 if(!browserHash || !z.string().uuid().safeParse(challengeId).success || !/^\d{6}$/.test(code))throw new HttpError(400,'Enter the six-digit code sent to your WhatsApp.','OTP_INVALID')
 const {data,error}=await getSupabaseAdmin().rpc('verify_coupon_otp',{p_id:challengeId,p_browser_hash:browserHash,p_code_hash:otpDigest(process.env.COUPON_OTP_SECRET ?? '','code',challengeId+':'+code)})
 if(error)throw new HttpError(503,'Unable to verify code. Please try again.','OTP_VERIFY_FAILED')
 if(data!=='ok')throw new HttpError(400,data==='expired'?'This code has expired. Request a new code.':data==='locked'?'Too many incorrect attempts. Request a new code after the cooldown.':data==='used'?'This code has already been verified. Apply your coupon to continue.':'The code is incorrect or no longer valid.','OTP_INVALID')
 return {verified:true,challengeId,validFor:900}
}
