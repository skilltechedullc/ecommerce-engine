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
  id: z.string().uuid('Variant ID must be a valid UUID').optional(),
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

export const bulkProductUpdateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'Choose at least one product'),
  patch: z.object({
    is_active: z.boolean().optional(),
    category: z.string().trim().optional().nullable(),
    subcategory: z.string().trim().optional().nullable(),
    image: optionalUrl,
    priceMode: z.enum(['none', 'set', 'increase_percent', 'decrease_percent']).optional().default('none'),
    priceValue: z.number().min(0).optional(),
    stockMode: z.enum(['none', 'set', 'increase', 'decrease']).optional().default('none'),
    stockValue: z.number().int().min(0).optional(),
  }),
})

export const categoryWriteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Category name is required'),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
})

export const adminUserWriteSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('Enter a valid email'),
  name: z.string().trim().optional().nullable(),
  role: z.enum(['owner', 'product_manager', 'order_manager', 'support', 'developer']),
  status: z.enum(['invited', 'active', 'disabled']).optional().default('invited'),
  two_factor_enabled: z.literal(false).optional().default(false),
  temporary_password: z.string().min(12, 'Temporary password must be at least 12 characters').optional(),
})

// ── Order Status ──────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  'Pending',
  'Paid',
  'Payment Failed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Refunded',
  'Return Requested',
  'Returned',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const orderStatusSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  newStatus: z.enum(ORDER_STATUSES),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer').optional(),
})

export const createShipmentSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  weightGrams: z.number().int().positive().optional(),
  paymentMethod: z.enum(['prepaid', 'cod']).optional(),
  customerChannel: z.enum(['whatsapp', 'instagram']).optional(),
  customerChannelId: z.string().min(1).optional(),
})

// ── Admin Login ───────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email').optional(),
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
