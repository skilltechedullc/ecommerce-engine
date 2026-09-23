#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { normalize } from 'node:path'

const filePath = normalize(process.argv[2] || 'docs/catalog-import-template.csv')
const requiredHeaders = [
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
]

if (!existsSync(filePath)) {
  console.error(`CSV file not found: ${filePath}`)
  process.exit(1)
}

const content = readFileSync(filePath, 'utf8').trim()
const [headerLine, ...rows] = content.split(/\r?\n/)
const headers = headerLine.split(',').map((header) => header.trim())
const missing = requiredHeaders.filter((header) => !headers.includes(header))

if (missing.length > 0) {
  console.error(`Missing required headers: ${missing.join(', ')}`)
  process.exit(1)
}

if (rows.length === 0) {
  console.error('CSV must include at least one product row')
  process.exit(1)
}

const priceIndex = headers.indexOf('price')
const stockIndex = headers.indexOf('stock')
const invalidRows = rows.flatMap((row, index) => {
  const columns = row.split(',')
  const issues = []
  const price = Number(columns[priceIndex])
  const stock = Number(columns[stockIndex])

  if (!Number.isFinite(price) || price <= 0) issues.push('price must be positive')
  if (!Number.isInteger(stock) || stock < 0) issues.push('stock must be a non-negative integer')

  return issues.length > 0 ? [`row ${index + 2}: ${issues.join('; ')}`] : []
})

if (invalidRows.length > 0) {
  console.error(invalidRows.join('\n'))
  process.exit(1)
}

console.log(`Product import CSV looks valid: ${filePath}`)
