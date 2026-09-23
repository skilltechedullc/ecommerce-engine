import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export type CartItem = {
  productId: string
  variantId: string
  productName: string
  variantName: string
  price: number
  quantity: number
}

export type Session = {
  phone: string
  step: string
  cart: CartItem[]
  customerName: string | null
  customerAddress: string | null
}

type SessionRow = {
  phone: string
  channel: string | null
  step: string | null
  cart: unknown
  customer_name: string | null
  customer_address: string | null
}

const WHATSAPP_CHANNEL = 'whatsapp'
const SESSIONS_TABLE = 'chat_sessions'

const defaultSession = (phone: string): Session => ({
  phone,
  step: 'idle',
  cart: [],
  customerName: null,
  customerAddress: null,
})

function toCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  const productId = typeof candidate.productId === 'string' ? candidate.productId : ''
  const variantId = typeof candidate.variantId === 'string' ? candidate.variantId : ''
  const productName = typeof candidate.productName === 'string' ? candidate.productName : ''
  const variantName = typeof candidate.variantName === 'string' ? candidate.variantName : ''
  const price = Number(candidate.price)
  const quantity = Number(candidate.quantity)

  if (!productId || !variantId || !productName || !variantName) return null
  if (!Number.isFinite(price) || price < 0) return null
  if (!Number.isInteger(quantity) || quantity <= 0) return null

  return {
    productId,
    variantId,
    productName,
    variantName,
    price,
    quantity,
  }
}

function normalizeCart(cart: unknown): CartItem[] {
  if (!Array.isArray(cart)) return []
  return cart.map(toCartItem).filter((item): item is CartItem => item !== null)
}

function toSession(phone: string, row: SessionRow | null): Session {
  if (!row) return defaultSession(phone)
  return {
    phone,
    step: row.step && row.step.trim() ? row.step : 'idle',
    cart: normalizeCart(row.cart),
    customerName: row.customer_name,
    customerAddress: row.customer_address,
  }
}

export async function getSession(phone: string): Promise<Session> {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from(SESSIONS_TABLE)
    .select('phone, channel, step, cart, customer_name, customer_address')
    .eq('channel', WHATSAPP_CHANNEL)
    .eq('phone', phone)
    .maybeSingle<SessionRow>()

  if (error) throw error
  if (data) return toSession(phone, data)

  const { error: upsertError } = await supabaseAdmin
    .from(SESSIONS_TABLE)
    .upsert({ channel: WHATSAPP_CHANNEL, phone, step: 'idle', cart: [] }, { onConflict: 'channel,phone' })

  if (upsertError) throw upsertError

  return defaultSession(phone)
}

export async function updateSession(phone: string, updates: Partial<Session>): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin()
  const payload: Record<string, unknown> = { channel: WHATSAPP_CHANNEL, phone }

  if (updates.step !== undefined) payload.step = updates.step
  if (updates.cart !== undefined) payload.cart = updates.cart
  if (Object.prototype.hasOwnProperty.call(updates, 'customerName')) {
    payload.customer_name = updates.customerName ?? null
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'customerAddress')) {
    payload.customer_address = updates.customerAddress ?? null
  }

  const { error } = await supabaseAdmin
    .from(SESSIONS_TABLE)
    .upsert(payload, { onConflict: 'channel,phone' })

  if (error) throw error
}

export async function clearSession(phone: string): Promise<void> {
  await updateSession(phone, {
    step: 'idle',
    cart: [],
    customerName: null,
    customerAddress: null,
  })
}
