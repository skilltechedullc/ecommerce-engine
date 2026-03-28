export type CartItem = {
  id: string
  product_id: string
  variant_id: string
  variant_name: string
  name: string
  price: number
  quantity: number
  image?: string
}

const CART_UPDATED_EVENT = 'cart-updated'

export function subscribeToCart(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('storage', callback)
  window.addEventListener(CART_UPDATED_EVENT, callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(CART_UPDATED_EVENT, callback)
  }
}

export function emitCartUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  const cart = localStorage.getItem('cart')
  return cart ? JSON.parse(cart) : []
}

// Stable-reference snapshot for useSyncExternalStore.
// Returns the same array reference as long as localStorage hasn't changed,
// preventing useSyncExternalStore from triggering infinite re-renders.
let _cartStr = ''
let _cartCache: CartItem[] = []

export function getCartSnapshot(): CartItem[] {
  if (typeof window === 'undefined') return _cartCache
  const raw = localStorage.getItem('cart') ?? '[]'
  if (raw === _cartStr) return _cartCache
  _cartStr = raw
  _cartCache = JSON.parse(raw)
  return _cartCache
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const incomingQuantity = Number.isFinite(item.quantity) && item.quantity > 0 ? Math.floor(item.quantity) : 1

  const existing = cart.find((p) => p.variant_id === item.variant_id)

  if (existing) {
    existing.quantity += incomingQuantity
  } else {
    cart.push({ ...item, quantity: incomingQuantity })
  }

  localStorage.setItem('cart', JSON.stringify(cart))
}

export function removeFromCart(id: string) {
  const cart = getCart().filter((item) => item.id !== id)
  localStorage.setItem('cart', JSON.stringify(cart))
}

export function updateQuantity(id: string, quantity: number) {
  const cart = getCart().map((item) =>
    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
  )
  localStorage.setItem('cart', JSON.stringify(cart))
}

export function clearCart() {
  localStorage.removeItem('cart')
}