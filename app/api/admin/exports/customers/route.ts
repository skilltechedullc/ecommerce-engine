import { NextResponse } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError } from '@/lib/server/api'
import { hasPermission } from '@/lib/server/permissions'
import { toCsv } from '@/lib/server/csv'

export async function GET() {
  try {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'exports:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { data, error } = await getSupabaseAdmin()
      .from('customers')
      .select('id, name, email, phone, address, first_order_at, last_order_at, order_count, total_spent')
      .order('last_order_at', { ascending: false })

    if (error) throw new HttpError(500, error.message, 'DB_FETCH_CUSTOMERS_FAILED')

    const headers = ['id', 'name', 'email', 'phone', 'address', 'first_order_at', 'last_order_at', 'order_count', 'total_spent']
    const csv = toCsv(headers, (data ?? []).map((row) => headers.map((header) => row[header as keyof typeof row])))

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="customers-export.csv"',
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status })
    }
    return NextResponse.json({ success: false, error: 'Customer export failed' }, { status: 500 })
  }
}
