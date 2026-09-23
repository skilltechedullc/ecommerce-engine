import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('admin CSV export routes exist for products and orders', () => {
  const productExport = readFileSync('app/api/admin/exports/products/route.ts', 'utf8')
  const orderExport = readFileSync('app/api/admin/exports/orders/route.ts', 'utf8')
  const csvHelper = readFileSync('lib/server/csv.ts', 'utf8')

  assert.match(csvHelper, /csvEscape/)
  assert.match(productExport, /products-export\.csv/)
  assert.match(productExport, /product_variants/)
  assert.match(orderExport, /orders-export\.csv/)
  assert.match(orderExport, /order_items/)
  assert.match(orderExport, /payment_method/)
  assert.match(orderExport, /exports:read/)
})

test('admin pages link to CSV exports', () => {
  const productsPage = readFileSync('app/admin/(protected)/products/ProductsClient.tsx', 'utf8')
  const ordersPage = readFileSync('app/admin/(protected)/orders/page.tsx', 'utf8')

  assert.match(productsPage, /\/api\/admin\/exports\/products/)
  assert.match(productsPage, /\/api\/admin\/import\/products/)
  assert.match(productsPage, /Import CSV/)
  assert.match(ordersPage, /\/api\/admin\/exports\/orders/)
  assert.match(ordersPage, /formatPaymentMethod/)
})

test('catalog import template and validator exist', () => {
  const template = readFileSync('docs/catalog-import-template.csv', 'utf8')
  const validator = readFileSync('scripts/validate-product-import.mjs', 'utf8')
  const packageJson = readFileSync('package.json', 'utf8')
  const parser = readFileSync('lib/server/catalogImport.ts', 'utf8')
  const route = readFileSync('app/api/admin/import/products/route.ts', 'utf8')

  assert.match(template, /variant_name/)
  assert.match(template, /image_urls/)
  assert.match(validator, /requiredHeaders/)
  assert.match(validator, /price must be positive/)
  assert.match(packageJson, /catalog:validate-import/)
  assert.match(parser, /parseCatalogImportCsv/)
  assert.match(route, /create_product_with_relations/)
  assert.match(route, /product.import_csv/)
  assert.match(route, /products:create/)
})

test('product image cleanup maintenance script exists', () => {
  const packageJson = readFileSync('package.json', 'utf8')
  const script = readFileSync('scripts/cleanup-product-images.mjs', 'utf8')
  const report = readFileSync('docs/PHASE11_CATALOG_TOOLS.md', 'utf8')

  assert.match(packageJson, /storage:cleanup-products/)
  assert.match(script, /Dry run only/)
  assert.match(script, /product_images/)
  assert.match(script, /variant_images/)
  assert.match(report, /storage:cleanup-products/)
})

test('local catalog admin foundations cover bulk edits categories inventory media and xlsx', () => {
  const migration = readFileSync('supabase/migrations/20260331000014_local_admin_catalog_foundations.sql', 'utf8')
  const packageJson = readFileSync('package.json', 'utf8')
  const importRoute = readFileSync('app/api/admin/import/products/route.ts', 'utf8')
  const bulkRoute = readFileSync('app/api/admin/products/bulk-update/route.ts', 'utf8')
  const categoriesPage = readFileSync('app/admin/(protected)/categories/page.tsx', 'utf8')
  const inventoryPage = readFileSync('app/admin/(protected)/inventory/page.tsx', 'utf8')
  const mediaPage = readFileSync('app/admin/(protected)/media/page.tsx', 'utf8')

  assert.match(packageJson, /"read-excel-file"/)
  assert.match(importRoute, /readSheet/)
  assert.match(bulkRoute, /catalog:bulk-update/)
  assert.match(migration, /create table if not exists public\.product_categories/)
  assert.match(migration, /create table if not exists public\.inventory_events/)
  assert.match(migration, /create table if not exists public\.media_assets/)
  assert.match(categoriesPage, /CategoriesClient/)
  assert.match(inventoryPage, /Inventory/)
  assert.match(mediaPage, /MediaClient/)
})
