import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
const localEnv = parseEnv(readFileSync('.env.local-test', 'utf8'))

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test('storefront and local COD checkout at width ' + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport)
    const browserErrors: string[] = []
    page.on('pageerror', error => browserErrors.push(error.message))
    await page.goto('/products/demo-honey')
    await expect(page.getByRole('heading', { name: 'Demo Honey', exact: true })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Millco')
    await page.getByRole('button', { name: /add.*to cart/i }).first().click()
    await page.goto('/checkout')
    await page.locator('#name').fill('Local Browser Test')
    await page.locator('#email').fill('local-browser@example.invalid')
    await page.locator('#phone').fill('9876543210')
    await page.locator('#address').fill('Local test address, test city')
    await page.getByRole('button', { name: 'Place order and pay on delivery', exact: true }).click()
    await expect(page).toHaveURL(/\/success\?.*token=/, { timeout: 30000 })
    await expect(page.locator('body')).toContainText('Demo Honey')
    expect(browserErrors).toEqual([])
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    expect(overflow).toBe(false)
  })
}

test('admin login, restricted unauthenticated access, and unavailable client setup', async ({ page, request }) => {
  const denied = await request.get('/api/admin/users')
  expect(denied.status()).toBe(401)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.locator('input[type=password]').fill(localEnv.ADMIN_PASSWORD!)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30000 })
  await page.goto('/admin/products')
  await expect(page.locator('body')).toContainText('Demo Honey')
  const setup = await page.request.post('/api/admin/launch/client-setup', {
    headers: { origin: 'http://127.0.0.1:3001' },
    data: { storeName: 'Browser Demo', ownerEmail: 'demo@example.invalid' },
  })
  expect(setup.status()).toBe(404)
  await expect(page.locator('a[href="/admin/launch"]')).toHaveCount(0)
  const launch = await page.request.get('/admin/launch')
  expect(launch.status()).toBe(404)
  const crossSite = await page.request.post('/api/admin/users/sessions', {
    headers: { origin: 'https://attacker.invalid' }, data: { session_id: '00000000-0000-4000-8000-000000000000' },
  })
  expect(crossSite.status()).toBe(403)
})
