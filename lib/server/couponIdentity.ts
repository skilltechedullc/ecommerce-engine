import { z } from 'zod'
import { normalizeTenantPhone, isValidTenantPhone, tenantConfig } from '@/lib/tenant.config'
import { HttpError } from '@/lib/server/api'

export function couponIdentity(value: unknown) {
 const parsed = z.object({ phone: z.string().trim().min(1).max(25), email: z.string().trim().email().max(254) }).safeParse(value)
 if (!parsed.success) throw new HttpError(400, 'Enter your email and phone number before applying this coupon.', 'COUPON_CONTACT_REQUIRED')
 const phone = normalizeTenantPhone(parsed.data.phone).replace(/\D/g, '')
 const country = tenantConfig.region.phone.countryCode.replace(/\D/g, '')
 const national = phone.slice(country.length)
 if (!phone.startsWith(country) || national.length !== tenantConfig.region.phone.nationalNumberLength || !isValidTenantPhone(national)) throw new HttpError(400, 'Enter a valid phone number before applying this coupon.', 'COUPON_CONTACT_REQUIRED')
 return { phone, email: parsed.data.email.toLowerCase() }
}
export function couponPhoneRules() {
 return { country_code: tenantConfig.region.phone.countryCode.replace(/\D/g,''), national_length: tenantConfig.region.phone.nationalNumberLength, trunk_prefix: tenantConfig.region.phone.trunkPrefix.replace(/\D/g,'') }
}
