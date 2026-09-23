import { NextRequest, NextResponse } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, withApiHandler } from '@/lib/server/api'
import { hasPermission } from '@/lib/server/permissions'
import { toCsv } from '@/lib/server/csv'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'exports:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { data, error } = await getSupabaseAdmin()
      .from('products')
      .select('id, name, slug, category, subcategory, price, stock, is_active, product_variants(id, weight, price, compare_at_price, stock, sku)')
      .order('created_at', { ascending: false })

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    const rows = (data ?? []).flatMap((product) => {
      const variants = product.product_variants ?? []
      if (variants.length === 0) {
        return [[product.id, product.name, product.slug, product.category, product.subcategory, product.price, product.stock, product.is_active, '', '', '', '', '']]
      }

      return variants.map((variant) => [
        product.id,
        product.name,
        product.slug,
        product.category,
        product.subcategory,
        product.price,
        product.stock,
        product.is_active,
        variant.id,
        variant.weight,
        variant.price,
        variant.compare_at_price,
        variant.stock,
        variant.sku,
      ])
    })

    return new NextResponse(toCsv([
      'product_id',
      'name',
      'slug',
      'category',
      'subcategory',
      'product_price',
      'product_stock',
      'is_active',
      'variant_id',
      'variant_name',
      'variant_price',
      'variant_compare_at_price',
      'variant_stock',
      'variant_sku',
    ], rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="products-export.csv"',
      },
    })
  })
}
