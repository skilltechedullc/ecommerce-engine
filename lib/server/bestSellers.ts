import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const QUALIFIED_STATUSES = ['Paid', 'Processing', 'Shipped', 'Delivered']

export async function getBestSellerProductIds(limit = 8): Promise<string[]> {
  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .in('status', QUALIFIED_STATUSES)
    .gte('created_at', since)

  if (ordersError || !orders || orders.length === 0) return []

  const orderIds = orders.map((order) => order.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .in('order_id', orderIds)

  if (itemsError || !items || items.length === 0) return []

  const counts = new Map<string, number>()

  for (const item of items) {
    const productId = String(item.product_id ?? '').trim()
    if (!productId) continue
    const quantity = Number(item.quantity ?? 0)
    if (!Number.isFinite(quantity) || quantity <= 0) continue
    counts.set(productId, (counts.get(productId) ?? 0) + quantity)
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([productId]) => productId)
}
