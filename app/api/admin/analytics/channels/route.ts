import { NextRequest } from 'next/server'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { isAdminSessionAuthenticated } from '@/lib/server/adminSession'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type ChannelOrderRow = {
  source: string | null
  total_amount: number | null
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const isAdmin = await isAdminSessionAuthenticated()
    if (!isAdmin) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const supabase = getSupabaseAdmin()
    const [{ data: whatsappRows, error: whatsappError }, { data: webRows, error: webError }] = await Promise.all([
      supabase
        .from('orders')
        .select('source, total_amount')
        .eq('source', 'whatsapp'),
      supabase
        .from('orders')
        .select('source, total_amount')
        .or('source.eq.web,source.is.null'),
    ])

    if (whatsappError) {
      if (whatsappError.message.includes('orders.source')) {
        throw new HttpError(
          500,
          'Orders source column is missing. Apply the latest Supabase migration before using channel analytics.',
          'DB_SCHEMA_OUTDATED'
        )
      }
      throw new HttpError(500, whatsappError.message, 'DB_FETCH_FAILED')
    }

    if (webError) {
      if (webError.message.includes('orders.source')) {
        throw new HttpError(
          500,
          'Orders source column is missing. Apply the latest Supabase migration before using channel analytics.',
          'DB_SCHEMA_OUTDATED'
        )
      }
      throw new HttpError(500, webError.message, 'DB_FETCH_FAILED')
    }

    const whatsappData = (whatsappRows ?? []) as ChannelOrderRow[]
    const webData = (webRows ?? []) as ChannelOrderRow[]

    const whatsapp_orders = whatsappData.length
    const web_orders = webData.length
    const whatsapp_revenue = whatsappData.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
    const web_revenue = webData.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)

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
