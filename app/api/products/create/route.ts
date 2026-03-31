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
import { parseSchema, createProductSchema } from '@/lib/server/schemas'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'products-create', windowMs: 60_000, maxRequests: 30 })

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

    const productPrice = normalizedVariantsWithPrimary.reduce(
      (lowest, variant) => Math.min(lowest, variant.price),
      normalizedVariantsWithPrimary[0].price
    )

    const supabase = getSupabaseAdmin()

    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        name: product.name,
        slug: product.slug,
        description: product.description ?? null,
        image: primaryProductImage,
        category: product.category ?? null,
        subcategory: product.subcategory ?? null,
        price: productPrice,
        stock: normalizedVariantsWithPrimary.reduce((sum, item) => sum + item.stock, 0),
        is_active: product.is_active ?? true,
      })
      .select('*')
      .single()

    if (productError || !newProduct) {
      throw new HttpError(500, productError?.message ?? 'Failed to create product', 'DB_INSERT_FAILED')
    }

    if (normalizedProductImages.length > 0) {
      const { error: galleryError } = await supabase.from('product_images').insert(
        normalizedProductImages.map((url, index) => ({
          product_id: newProduct.id,
          image_url: url,
          sort_order: index,
        }))
      )

      if (galleryError) {
        await supabase.from('products').delete().eq('id', newProduct.id)
        throw new HttpError(500, galleryError.message, 'DB_INSERT_PRODUCT_IMAGES_FAILED')
      }
    }

    for (const variant of normalizedVariantsWithPrimary) {
      const { data: insertedVariant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: newProduct.id,
          name: variant.name,
          weight: variant.name,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          stock: variant.stock,
          sku: variant.sku,
          image: variant.images,
        })
        .select('id')
        .single()

      if (variantError || !insertedVariant) {
        await supabase.from('products').delete().eq('id', newProduct.id)
        throw new HttpError(500, variantError?.message ?? 'Failed to create variant', 'DB_INSERT_VARIANTS_FAILED')
      }

      if (variant.images.length > 0) {
        const { error: variantGalleryError } = await supabase.from('variant_images').insert(
          variant.images.map((url, index) => ({
            variant_id: insertedVariant.id,
            image_url: url,
            sort_order: index,
          }))
        )

        if (variantGalleryError) {
          await supabase.from('products').delete().eq('id', newProduct.id)
          throw new HttpError(500, variantGalleryError.message, 'DB_INSERT_VARIANT_IMAGES_FAILED')
        }
      }
    }

    return jsonOk({ product: newProduct }, { requestId })
  })
}
