import { z } from 'zod'
export const importedCartSchema = z.array(z.object({
  variant_id: z.string().uuid(), quantity: z.number().int().min(1).max(20),
})).min(1).max(30).refine(items => new Set(items.map(item => item.variant_id)).size === items.length, 'Duplicate variants')
