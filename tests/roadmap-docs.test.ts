import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const requiredDocs = [
  'docs/PHASE13_THEME_CUSTOMIZATION.md',
  'docs/PHASE15_ADMIN_USERS_ROLES.md',
  'docs/PHASE16_PAID_ADDON_MODULES.md',
  'docs/PHASE17_GROCERY_UAE_READINESS.md',
  'docs/PHASE18_MILLCO_DEMO_STORE_STRATEGY.md',
  'docs/PHASE19_PRICING_AND_SALES_PACKAGING.md',
  'docs/LAUNCH_NEW_CLIENT_STORE.md',
  'docs/ADMIN_USER_MANUAL.md',
  'docs/PRE_LAUNCH_CHECKLIST.md',
  'docs/SUPPORT_MAINTENANCE_SOP.md',
  'docs/FULL_AUDIT_CHECKLIST.md',
]

test('roadmap documentation exists for client launch operations', () => {
  for (const path of requiredDocs) {
    assert.equal(existsSync(path), true, `${path} is missing`)
  }
})

test('pricing and add-on docs cover client-owned grocery positioning', () => {
  const pricing = readFileSync('docs/PHASE19_PRICING_AND_SALES_PACKAGING.md', 'utf8')
  const addons = readFileSync('docs/PHASE16_PAID_ADDON_MODULES.md', 'utf8')
  const grocery = readFileSync('docs/PHASE17_GROCERY_UAE_READINESS.md', 'utf8')

  assert.match(pricing, /Basic Store/)
  assert.match(pricing, /Business Store/)
  assert.match(pricing, /Premium Store/)
  assert.match(addons, /WhatsApp store\/order automation/)
  assert.match(addons, /Shipping provider integration/)
  assert.match(grocery, /UAE/)
  assert.match(grocery, /AED/)

  const millco = readFileSync('docs/PHASE18_MILLCO_DEMO_STORE_STRATEGY.md', 'utf8')
  assert.match(millco, /Demo Store 001/)
  assert.match(millco, /shop\.millco\.in/)
})
