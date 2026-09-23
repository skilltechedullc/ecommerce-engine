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
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, total_amount, status, source, payment_method, razorpay_order_id, razorpay_payment_id, created_at, order_items(product_name, quantity, price)')
      .order('created_at', { ascending: false })

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    const rows = (data ?? []).flatMap((order) => {
      const items = order.order_items ?? []
      if (items.length === 0) {
        return [[order.id, order.created_at, order.customer_name, order.customer_email, order.customer_phone, order.total_amount, order.status, order.source, order.payment_method, order.razorpay_order_id, order.razorpay_payment_id, '', '', '']]
      }

      return items.map((item) => [
        order.id,
        order.created_at,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.total_amount,
        order.status,
        order.source,
        order.payment_method,
        order.razorpay_order_id,
        order.razorpay_payment_id,
        item.product_name,
        item.quantity,
        item.price,
      ])
    })

    return new NextResponse(toCsv([
      'order_id',
      'created_at',
      'customer_name',
      'customer_email',
      'customer_phone',
      'total_amount',
      'status',
      'source',
      'payment_method',
      'razorpay_order_id',
      'razorpay_payment_id',
      'item_name',
      'item_quantity',
      'item_price',
    ], rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="orders-export.csv"',
      },
    })
  })
}
