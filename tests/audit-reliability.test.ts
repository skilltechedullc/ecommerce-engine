import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('audit log migration is service-role only', () => {
  const migration = readFileSync('supabase/migrations/20260331000006_audit_logs.sql', 'utf8')

  assert.match(migration, /create table if not exists public\.audit_logs/)
  assert.match(migration, /alter table public\.audit_logs enable row level security/)
  assert.match(migration, /to service_role/)
  assert.doesNotMatch(migration, /to anon/)
  assert.doesNotMatch(migration, /to authenticated/)
})

test('product and order mutations write audit logs', () => {
  const files = [
    'app/api/products/create/route.ts',
    'app/api/products/update/route.ts',
    'app/api/products/delete/route.ts',
    'app/api/admin/update-order-status/route.ts',
    'app/api/admin/shipping/create/route.ts',
    'app/api/save-order/route.ts',
  ]

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /writeAuditLog/, `${file} should write audit logs`)
  }
})

test('product writes use transactional database RPC helpers', () => {
  const createRoute = readFileSync('app/api/products/create/route.ts', 'utf8')
  const updateRoute = readFileSync('app/api/products/update/route.ts', 'utf8')
  const migration = readFileSync('supabase/migrations/20260331000007_product_write_rpc.sql', 'utf8')

  assert.match(createRoute, /create_product_with_relations/)
  assert.match(updateRoute, /update_product_with_relations/)
  assert.match(migration, /create or replace function public\.create_product_with_relations/)
  assert.match(migration, /create or replace function public\.update_product_with_relations/)
  assert.match(migration, /keep_variant_ids/)
})

test('channel analytics uses orders.source instead of address heuristics', () => {
  const dashboard = readFileSync('app/admin/(protected)/page.tsx', 'utf8')
  const analyticsRoute = readFileSync('app/api/admin/analytics/channels/route.ts', 'utf8')

  assert.match(dashboard, /\.select\('source, total_amount'\)/)
  assert.match(analyticsRoute, /\.select\('source, total_amount'\)/)
  assert.doesNotMatch(dashboard, /customer_address, total_amount/)
  assert.doesNotMatch(analyticsRoute, /customer_address, total_amount/)
  assert.doesNotMatch(dashboard, /isLikelyWhatsAppOrder/)
  assert.doesNotMatch(analyticsRoute, /isLikelyWhatsAppOrder/)
})

test('order lifecycle includes failure, cancellation, refund, and return states', () => {
  const statusModel = readFileSync('lib/orderStatus.ts', 'utf8')
  const schema = readFileSync('lib/server/schemas.ts', 'utf8')
  const statusUpdater = readFileSync('app/admin/(protected)/orders/[id]/StatusUpdater.tsx', 'utf8')
  const statusRoute = readFileSync('app/api/admin/update-order-status/route.ts', 'utf8')
  const migration = readFileSync('supabase/migrations/20260331000008_order_lifecycle_statuses.sql', 'utf8')

  for (const status of ['Payment Failed', 'Cancelled', 'Refunded', 'Return Requested', 'Returned']) {
    assert.match(statusModel, new RegExp(status))
    assert.match(schema, new RegExp(status))
    assert.match(migration, new RegExp(status))
  }

  assert.match(statusModel, /Pending: \['Paid', 'Payment Failed', 'Cancelled'\]/)
  assert.match(statusModel, /'Return Requested': \['Returned', 'Refunded'\]/)
  assert.match(statusModel, /ORDER_STATUSES_REQUIRING_REASON/)
  assert.match(schema, /reason: z\.string\(\)\.trim\(\)\.max\(500/)
  assert.match(statusUpdater, /Add a short reason/)
  assert.match(statusRoute, /reason: reason \|\| undefined/)
})

test('admin first-run product guidance is present', () => {
  const productsClient = readFileSync('app/admin/(protected)/products/ProductsClient.tsx', 'utf8')
  const productForm = readFileSync('app/admin/(protected)/products/ProductForm.tsx', 'utf8')

  assert.match(productsClient, /No products yet/)
  assert.match(productsClient, /Add First Product/)
  assert.match(productForm, /First Product Checklist/)
  assert.match(productForm, /Ready-to-sell basics/)
})

test('server uses structured logger for high-value failures', () => {
  const loggerSource = readFileSync('lib/server/logger.ts', 'utf8')
  const apiHandler = readFileSync('lib/server/api.ts', 'utf8')
  const auditSource = readFileSync('lib/server/audit.ts', 'utf8')
  const dashboard = readFileSync('app/admin/(protected)/page.tsx', 'utf8')

  assert.match(loggerSource, /JSON\.stringify\(payload\)/)
  assert.match(apiHandler, /logger\.error\('api\.unhandled_error'/)
  assert.match(auditSource, /logger\.error\('audit\.write_failed'/)
  assert.match(dashboard, /logger\.warn\('admin\.dashboard\.orders_fetch_failed'/)
})
