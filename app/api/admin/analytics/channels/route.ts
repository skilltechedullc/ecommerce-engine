import { NextRequest } from 'next/server'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { isAdminSessionAuthenticated } from '@/lib/server/adminSession'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type ChannelOrderRow = {
  payment_method: string | null
  total_amount: number | null
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const isAdmin = await isAdminSessionAuthenticated()
    if (!isAdmin) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('orders')
      .select('payment_method, total_amount')

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    const rows = (data ?? []) as ChannelOrderRow[]
    const whatsappRows = rows.filter((row) => row.payment_method === 'whatsapp_cod')
    const webRows = rows.filter((row) => row.payment_method !== 'whatsapp_cod')

    const whatsapp_orders = whatsappRows.length
    const web_orders = webRows.length
    const whatsapp_revenue = whatsappRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
    const web_revenue = webRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)

    return jsonOk(
      {
        whatsapp_orders,
        web_orders,
        whatsapp_revenue,
        web_revenue,
      },
      { requestId }
    )
  })
}
