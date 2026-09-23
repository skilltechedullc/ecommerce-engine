import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'
import { parseCatalogImportCsv } from '@/lib/server/catalogImport'
import { writeAuditLog } from '@/lib/server/audit'
import { readSheet } from 'read-excel-file/browser'

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (!/[",\r\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

async function fileToCsv(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (name.endsWith('.xlsx') || type.includes('spreadsheetml')) {
    const rows = await readSheet(file) as unknown[][]
    if (rows.length === 0) {
      throw new HttpError(400, 'XLSX file does not contain a worksheet', 'VALIDATION_ERROR')
    }
    return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  }

  return file.text()
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'catalog-import', windowMs: 60_000, maxRequests: 10 })
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'products:create')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const formData = await req.formData().catch(() => {
      throw new HttpError(400, 'Expected multipart/form-data', 'INVALID_REQUEST')
    })
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new HttpError(400, 'Missing file field in form data', 'VALIDATION_ERROR')
    }

    const csv = await fileToCsv(file)
    const products = parseCatalogImportCsv(csv)
    const supabase = getSupabaseAdmin()
    const imported: Array<{ id: string; slug: string; variantCount: number }> = []

    for (const entry of products) {
      const { data: productId, error } = await supabase
        .rpc('create_product_with_relations', {
          p_product: entry.product,
          p_variants: entry.variants,
        })

      if (error || !productId) {
        throw new HttpError(500, error?.message ?? `Failed to import ${entry.product.slug}`, 'DB_INSERT_FAILED')
      }

      imported.push({
        id: String(productId),
        slug: entry.product.slug,
        variantCount: entry.variants.length,
      })

      await writeAuditLog({
        actorType: 'admin',
        actorId: role,
        action: 'product.import_csv',
        entityType: 'product',
        entityId: String(productId),
        requestId,
        metadata: {
          slug: entry.product.slug,
          variantCount: entry.variants.length,
        },
      })
    }

    return jsonOk({ imported, importedCount: imported.length }, { requestId })
  })
}
