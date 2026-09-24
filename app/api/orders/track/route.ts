import { enforceRateLimit } from '@/lib/server/rateLimit'
import { ORDER_ID_PATTERN } from '@/lib/whatsapp/tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'order-tracking', windowMs: 60000, maxRequests: 30 })
    const orderId = req.nextUrl.searchParams.get('orderId')?.trim()
    const phone = req.nextUrl.searchParams.get('phone')?.replace(/\D/g, '')

    if (!orderId || !phone) {
      throw new HttpError(400, 'Order ID and phone are required', 'VALIDATION_ERROR')
    }

    if (orderId.length !== 36 || !ORDER_ID_PATTERN.test(orderId)) throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')

    const { data, error } = await getSupabaseAdmin()
      .from('orders')
      .select('id, customer_name, customer_phone, total_amount, status, source, created_at, order_items(product_name, quantity, price), shipments(provider, awb_number, tracking_url, status, estimated_delivery)')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    if (!data || String(data.customer_phone ?? '').replace(/\D/g, '') !== phone) {
      throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
    }

    return jsonOk({
      order: {
        id: data.id,
        customerName: data.customer_name,
        totalAmount: data.total_amount,
        status: data.status,
        source: data.source,
        createdAt: data.created_at,
        items: data.order_items ?? [],
        shipments: data.shipments ?? [],
      },
    }, { requestId })
  })
}
