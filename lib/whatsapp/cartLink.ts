import { storeConfig } from '@/lib/config'
import type { CartItem } from './session'
export function buildCheckoutLink(cart: CartItem[]): string {
  const items = cart.slice(0, 30).map(item => ({ variant_id: item.variantId, quantity: item.quantity }))
  const url = new URL('/cart/import', storeConfig.siteUrl)
  // No customer details, prices or payment authorisation travel in this link.
  url.hash = new URLSearchParams({ items: JSON.stringify(items) }).toString()
  return url.toString()
}
