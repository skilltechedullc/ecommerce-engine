import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import {
  HttpError,
  jsonOk,
  parseJson,
  withApiHandler,
} from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { parseSchema, createProductSchema } from '@/lib/server/schemas'
import { writeAuditLog } from '@/lib/server/audit'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'products-create', windowMs: 60_000, maxRequests: 30 })
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'products:create')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const rawBody = await parseJson<unknown>(req)
    const { product, variants } = parseSchema(createProductSchema, rawBody)

    const normalizedProductImages = (product.images ?? [])
      .map((url) => url.trim())
      .filter(Boolean)

    const normalizedVariants = variants.map((variant) => ({
      galleryImages: (() => {
        const gallery = (variant.images ?? []).map((url) => url.trim()).filter(Boolean)
        if (gallery.length > 0) return gallery
        return variant.image ? [variant.image] : []
      })(),
      name: variant.name,
      price: variant.price,
      compare_at_price: variant.compare_at_price ?? null,
      stock: variant.stock,
      sku: variant.sku ?? null,
    }))

    const normalizedVariantsWithPrimary = normalizedVariants.map((variant) => ({
      ...variant,
      images: variant.galleryImages,
      image: variant.galleryImages[0] ?? null,
    }))

    // Use product image if provided, else fall back to first variant's first image
    const primaryProductImage = normalizedProductImages[0] ?? product.image ?? normalizedVariantsWithPrimary[0]?.image ?? null

    const supabase = getSupabaseAdmin()

    const productPayload = {
      name: product.name,
      slug: product.slug,
      description: product.description ?? null,
      image: primaryProductImage,
      images: normalizedProductImages,
      category: product.category ?? null,
      subcategory: product.subcategory ?? null,
      is_active: product.is_active ?? true,
    }

    const variantPayload = normalizedVariantsWithPrimary.map((variant) => ({
      name: variant.name,
      price: variant.price,
      compare_at_price: variant.compare_at_price,
      stock: variant.stock,
      sku: variant.sku,
      image: variant.image,
      images: variant.images,
    }))

    const { data: productId, error: productError } = await supabase
      .rpc('create_product_with_relations', {
        p_product: productPayload,
        p_variants: variantPayload,
      })

    if (productError || !productId) {
      throw new HttpError(500, productError?.message ?? 'Failed to create product', 'DB_INSERT_FAILED')
    }

    const { data: newProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchError || !newProduct) {
      throw new HttpError(500, fetchError?.message ?? 'Failed to fetch created product', 'DB_FETCH_FAILED')
    }

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: 'product.create',
      entityType: 'product',
      entityId: String(productId),
      requestId,
      metadata: {
        name: product.name,
        slug: product.slug,
        variantCount: normalizedVariantsWithPrimary.length,
      },
    })

    return jsonOk({ product: newProduct }, { requestId })
  })
}
