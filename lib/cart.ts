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
const CART_STORAGE_KEY = 'cart'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function canUseDocument(): boolean {
  return typeof document !== 'undefined'
}

function readCartCookie(): string | null {
  if (!canUseDocument()) return null
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CART_STORAGE_KEY}=`))

  if (!cookie) return null

  try {
    return decodeURIComponent(cookie.slice(CART_STORAGE_KEY.length + 1))
  } catch {
    return null
  }
}

function writeCartCookie(value: string): void {
  if (!canUseDocument()) return
  document.cookie = `${CART_STORAGE_KEY}=${encodeURIComponent(value)}; Max-Age=${CART_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
}

function clearCartCookie(): void {
  if (!canUseDocument()) return
  document.cookie = `${CART_STORAGE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`
}

function readCartRaw(): string {
  if (typeof window === 'undefined') return '[]'

  try {
    const localCart = window.localStorage?.getItem(CART_STORAGE_KEY)
    if (localCart) return localCart
  } catch {
    // Some embedded browsers can block localStorage; cookies keep checkout navigations stable.
  }

  return readCartCookie() ?? '[]'
}

function writeCartRaw(value: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage?.setItem(CART_STORAGE_KEY, value)
  } catch {
    // Cookie fallback below is enough for the app to keep working.
  }

  writeCartCookie(value)
}

function clearCartRaw(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage?.removeItem(CART_STORAGE_KEY)
  } catch {
    // Continue clearing the cookie fallback.
  }

  clearCartCookie()
}

function parseCart(raw: string | null): CartItem[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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
  return parseCart(readCartRaw())
}

// Stable-reference snapshot for useSyncExternalStore.
// Returns the same array reference as long as localStorage hasn't changed,
// preventing useSyncExternalStore from triggering infinite re-renders.
let _cartStr = ''
let _cartCache: CartItem[] = []

export function getCartSnapshot(): CartItem[] {
  if (typeof window === 'undefined') return _cartCache
  const raw = readCartRaw()
  if (raw === _cartStr) return _cartCache
  _cartStr = raw
  _cartCache = parseCart(raw)
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

  writeCartRaw(JSON.stringify(cart))
}

export function removeFromCart(id: string) {
  const cart = getCart().filter((item) => item.id !== id)
  writeCartRaw(JSON.stringify(cart))
}

export function updateQuantity(id: string, quantity: number) {
  const cart = getCart().map((item) =>
    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
  )
  writeCartRaw(JSON.stringify(cart))
}

export function clearCart() {
  clearCartRaw()
}
