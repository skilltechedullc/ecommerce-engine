import { z } from 'zod'
export const manualTrackingSchema = z.object({
  orderId: z.string().uuid(),
  awb: z.string().trim().min(1, 'Enter a tracking reference').max(100),
  trackingUrl: z.string().trim().max(2048).refine(value => {
    if (!value) return true
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
  }, 'Use a full HTTPS courier tracking link'),
  status: z.enum(['pending','pickup_scheduled','picked_up','in_transit','out_for_delivery','delivered','failed','cancelled']),
})