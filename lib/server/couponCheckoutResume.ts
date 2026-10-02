import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError } from './api'
import { couponIdentity } from './couponIdentity'
import { aggregateCheckoutItems } from './checkoutHardening'
import type { OtpContext } from './couponOtp'
const itemsSchema=z.array(z.object({variant_id:z.string().uuid(),quantity:z.number().int().positive()})).min(1).max(100)
export async function reservedCouponCheckout(context: OtpContext, code: unknown, rawItems: unknown, rawCustomer: unknown) {
 if(!context.browserHash || !z.string().uuid().safeParse(context.challengeId).success)return null
 const db=getSupabaseAdmin()
 const proof=await db.from('coupon_otp_challenges').select('checkout_id').eq('id',context.challengeId!).eq('browser_hash',context.browserHash).maybeSingle()
 if(proof.error)throw new HttpError(503,'Unable to recover checkout. Please retry.','CHECKOUT_LOOKUP_FAILED')
 if(!proof.data?.checkout_id)return null
 const {data:session,error}=await db.from('checkout_sessions').select('*').eq('id',proof.data.checkout_id).single()
 if(error)throw new HttpError(503,'Unable to recover checkout. Please retry.','CHECKOUT_LOOKUP_FAILED')
 const customer=z.object({name:z.string(),phone:z.string(),email:z.string(),address:z.string()}).safeParse(rawCustomer)
 const items=itemsSchema.safeParse(rawItems)
 if(!customer.success || !items.success)throw new HttpError(409,'Restore your original cart and contact details to retry this payment.','RESERVED_CHECKOUT_CHANGED')
 const identity=couponIdentity(customer.data), savedIdentity=couponIdentity(session.customer)
 const sorted=(list: Array<{variant_id:string;quantity:number}>)=>JSON.stringify(aggregateCheckoutItems(list).sort((a,b)=>a.variant_id.localeCompare(b.variant_id)).map(i=>[i.variant_id,i.quantity]))
 if(typeof code!=='string' || code.trim().toUpperCase()!==session.coupon_code || identity.phone!==savedIdentity.phone || identity.email!==savedIdentity.email || customer.data.name.trim()!==session.customer.name || customer.data.address.trim()!==session.customer.address || sorted(items.data)!==sorted(session.items))throw new HttpError(409,'This coupon is reserved for your earlier checkout. Restore that cart and contact details, or contact the store for help.','RESERVED_CHECKOUT_CHANGED')
 if(session.status==='order_saved' || session.status==='payment_verified' || session.status==='order_save_failed')throw new HttpError(409,'Payment was already received for this checkout. Do not pay again; check your order confirmation or contact the store.','CHECKOUT_ALREADY_PAID')
 return session
}
