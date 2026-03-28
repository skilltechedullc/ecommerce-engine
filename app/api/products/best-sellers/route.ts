import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getBestSellerProductIds } from '@/lib/server/bestSellers'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'

type ProductRow = {
  id: string
  name: string
  slug: string
  image: string | null
  price: number | null
  category: string | null
}

function parseLimit(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get('limit') ?? 8)
  if (!Number.isFinite(raw)) return 8
  return Math.min(20, Math.max(1, Math.floor(raw)))
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'products-best-sellers', windowMs: 60_000, maxRequests: 60 })

    const limit = parseLimit(req)
    const bestSellerIds = await getBestSellerProductIds(limit * 3)

    const productFields = 'id, name, slug, image, price, category'
    let products: ProductRow[] = []

    if (bestSellerIds.length > 0) {
      const { data, error } = await supabase
        .from('products')
        .select(productFields)
        .in('id', bestSellerIds)
        .eq('is_active', true)

      if (error) {
        throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
      }

      const rows = (data ?? []) as ProductRow[]
      const indexById = new Map(bestSellerIds.map((id, index) => [id, index]))
      rows.sort((left, right) => (indexById.get(left.id) ?? 99999) - (indexById.get(right.id) ?? 99999))
      products = rows
    }

    if (products.length < limit) {
      const existing = new Set(products.map((product) => product.id))
      const { data: fallback, error: fallbackError } = await supabase
        .from('products')
        .select(productFields)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit * 2)

      if (fallbackError) {
        throw new HttpError(500, fallbackError.message, 'DB_FETCH_FAILED')
      }

      for (const row of (fallback ?? []) as ProductRow[]) {
        if (existing.has(row.id)) continue
        products.push(row)
        existing.add(row.id)
        if (products.length >= limit) break
      }
    }

    return jsonOk({ products: products.slice(0, limit) }, { requestId })
  })
}
