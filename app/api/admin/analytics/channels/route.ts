import { NextRequest } from 'next/server'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { isAdminSessionAuthenticated } from '@/lib/server/adminSession'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type ChannelOrderRow = {
  source: string | null
  total_amount: number | null
}

function orderSource(row: ChannelOrderRow): 'whatsapp' | 'web' {
  return row.source === 'whatsapp' ? 'whatsapp' : 'web'
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
      .select('source, total_amount')

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    const rows = (data ?? []) as ChannelOrderRow[]
    const whatsappRows = rows.filter((row) => orderSource(row) === 'whatsapp')
    const webRows = rows.filter((row) => orderSource(row) === 'web')

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
