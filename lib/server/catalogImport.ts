import { HttpError } from '@/lib/server/api'

const REQUIRED_HEADERS = [
  'name',
  'slug',
  'description',
  'category',
  'subcategory',
  'variant_name',
  'price',
  'compare_at_price',
  'stock',
  'sku',
  'image_urls',
  'is_active',
] as const

export type CatalogImportProduct = {
  product: {
    name: string
    slug: string
    description: string | null
    image: string | null
    images: string[]
    category: string | null
    subcategory: string | null
    is_active: boolean
  }
  variants: Array<{
    name: string
    price: number
    compare_at_price: number | null
    stock: number
    sku: string | null
    image: string | null
    images: string[]
  }>
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function parseBoolean(value: string): boolean {
  if (!value) return true
  return ['1', 'true', 'yes', 'active', 'published'].includes(value.toLowerCase())
}

function parsePositiveNumber(value: string, field: string, row: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(400, `row ${row}: ${field} must be positive`, 'VALIDATION_ERROR')
  }
  return parsed
}

function parseNonNegativeInteger(value: string, field: string, row: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new HttpError(400, `row ${row}: ${field} must be a non-negative integer`, 'VALIDATION_ERROR')
  }
  return parsed
}

function parseOptionalNumber(value: string, field: string, row: number): number | null {
  if (!value) return null
  return parsePositiveNumber(value, field, row)
}

function imageList(value: string): string[] {
  return value
    .split('|')
    .map((url) => url.trim())
    .filter(Boolean)
}

export function parseCatalogImportCsv(csv: string): CatalogImportProduct[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new HttpError(400, 'CSV must include headers and at least one product row', 'VALIDATION_ERROR')
  }

  const headers = parseCsvLine(lines[0])
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length > 0) {
    throw new HttpError(400, `Missing required headers: ${missing.join(', ')}`, 'VALIDATION_ERROR')
  }

  const indexByHeader = new Map(headers.map((header, index) => [header, index]))
  const valueAt = (columns: string[], header: string) => columns[indexByHeader.get(header) ?? -1]?.trim() ?? ''
  const productsBySlug = new Map<string, CatalogImportProduct>()

  for (const [lineIndex, line] of lines.slice(1).entries()) {
    const rowNumber = lineIndex + 2
    const columns = parseCsvLine(line)
    const name = valueAt(columns, 'name')
    const slug = valueAt(columns, 'slug')
    const variantName = valueAt(columns, 'variant_name')

    if (!name) throw new HttpError(400, `row ${rowNumber}: name is required`, 'VALIDATION_ERROR')
    if (!slug) throw new HttpError(400, `row ${rowNumber}: slug is required`, 'VALIDATION_ERROR')
    if (!variantName) throw new HttpError(400, `row ${rowNumber}: variant_name is required`, 'VALIDATION_ERROR')

    const images = imageList(valueAt(columns, 'image_urls'))
    const existing = productsBySlug.get(slug)
    const product = existing ?? {
      product: {
        name,
        slug,
        description: valueAt(columns, 'description') || null,
        image: images[0] ?? null,
        images,
        category: valueAt(columns, 'category') || null,
        subcategory: valueAt(columns, 'subcategory') || null,
        is_active: parseBoolean(valueAt(columns, 'is_active')),
      },
      variants: [],
    }

    product.variants.push({
      name: variantName,
      price: parsePositiveNumber(valueAt(columns, 'price'), 'price', rowNumber),
      compare_at_price: parseOptionalNumber(valueAt(columns, 'compare_at_price'), 'compare_at_price', rowNumber),
      stock: parseNonNegativeInteger(valueAt(columns, 'stock'), 'stock', rowNumber),
      sku: valueAt(columns, 'sku') || null,
      image: images[0] ?? null,
      images,
    })

    productsBySlug.set(slug, product)
  }

  return Array.from(productsBySlug.values())
}
