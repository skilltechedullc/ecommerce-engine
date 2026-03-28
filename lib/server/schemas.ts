import { z } from 'zod'

// ── Shared ──────────────────────────────────────────────────────────────────

const optionalUrl = z
  .string()
  .url('Must be a valid URL')
  .optional()
  .nullable()

const imageGallerySchema = z.array(
  z.string().url('Every gallery image must be a valid URL')
).max(12, 'Maximum 12 images allowed').optional().default([])

// ── Variant ──────────────────────────────────────────────────────────────────

export const variantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  price: z.number().positive('Price must be greater than 0'),
  compare_at_price: z.number().positive('Real price must be greater than 0').optional().nullable(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  sku: z.string().optional().nullable(),
  image: optionalUrl,
  images: imageGallerySchema,
}).refine(
  (variant) => variant.compare_at_price == null || variant.compare_at_price > variant.price,
  {
    message: 'Real price must be higher than the offer price',
    path: ['compare_at_price'],
  }
)

export type VariantSchemaInput = z.infer<typeof variantSchema>

// ── Product ──────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional().nullable(),
  image: optionalUrl,
  images: imageGallerySchema,
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
})

export type ProductSchemaInput = z.infer<typeof productSchema>

// ── Product Create ────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  product: productSchema,
  variants: z.array(variantSchema).min(1, 'At least one variant is required'),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

// ── Product Update ────────────────────────────────────────────────────────────

export const updateProductSchema = z.object({
  id: z.string().uuid('Product ID must be a valid UUID'),
  product: productSchema,
  variants: z.array(variantSchema).min(1, 'At least one variant is required'),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>

// ── Product Delete ────────────────────────────────────────────────────────────

export const deleteProductSchema = z.object({
  id: z.string().uuid('Product ID must be a valid UUID'),
})

// ── Order Status ──────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const orderStatusSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  newStatus: z.enum(ORDER_STATUSES),
})

// ── Admin Login ───────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

// ── Zod parse helper ─────────────────────────────────────────────────────────

import { HttpError } from '@/lib/server/api'

export function parseSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    throw new HttpError(
      400,
      firstIssue?.message ?? 'Validation failed',
      'VALIDATION_ERROR',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    )
  }
  return result.data
}
