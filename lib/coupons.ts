import { z } from 'zod'

export const couponWriteSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, 'Use 3–32 letters, numbers, hyphens or underscores'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive().max(1000000).multipleOf(0.01),
  min_order_amount: z.number().min(0).max(1000000).multipleOf(0.01),
  max_discount_amount: z.number().positive().max(1000000).multipleOf(0.01).nullable(),
  starts_at: z.string().datetime().nullable(),
  expires_at: z.string().datetime().nullable(),
  usage_limit: z.number().int().positive().max(1000000).nullable(),
  is_active: z.boolean(),
  require_whatsapp_otp: z.boolean().default(false),
  one_per_phone: z.boolean().default(false),
  one_per_email: z.boolean().default(false),
}).superRefine((c, ctx) => {
  if (c.discount_type === 'percentage' && c.discount_value >= 100) ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Percentage must be below 100' })
  if (c.starts_at && c.expires_at && c.starts_at >= c.expires_at) ctx.addIssue({ code: 'custom', path: ['expires_at'], message: 'End date must be after start date' })
})
export type Coupon = Omit<z.infer<typeof couponWriteSchema>, 'require_whatsapp_otp' | 'one_per_phone' | 'one_per_email'> & { require_whatsapp_otp?: boolean; one_per_phone?: boolean; one_per_email?: boolean } & { id: string; used?: number; reserved?: number }
export function normalizeCouponCode(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value !== 'string' || !/^[A-Z0-9_-]{3,32}$/.test(value.trim().toUpperCase())) throw new Error('Enter a valid coupon code')
  return value.trim().toUpperCase()
}
export function couponDiscount(c: Coupon, subtotal: number, claimed = 0, now = Date.now()): number {
  if (!c.is_active || (c.starts_at && Date.parse(c.starts_at) > now) || (c.expires_at && Date.parse(c.expires_at) <= now)) throw new Error('This coupon is not active')
  if (c.usage_limit !== null && claimed >= c.usage_limit) throw new Error('This coupon has reached its usage limit')
  if (subtotal < c.min_order_amount) throw new Error('This coupon requires a minimum product total of ' + c.min_order_amount)
  let discount = c.discount_type === 'percentage' ? subtotal * c.discount_value / 100 : c.discount_value
  if (c.max_discount_amount !== null) discount = Math.min(discount, c.max_discount_amount)
  discount = Math.round((discount + Number.EPSILON) * 100) / 100
  if (discount <= 0 || Math.round(subtotal * 100) - Math.round(discount * 100) < 100) throw new Error('The product total after discount must be at least 1')
  return discount
}
