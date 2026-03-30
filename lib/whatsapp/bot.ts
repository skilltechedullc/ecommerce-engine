import { formatMoney } from '@/lib/money'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { tenantConfig } from '@/lib/tenant.config'
import { sendWhatsAppMessage } from '@/lib/whatsapp/meta'
import { clearSession, getSession, updateSession, type CartItem } from '@/lib/whatsapp/session'

type ProductRow = {
  id: string
  name: string
}

type VariantRow = {
  id: string
  product_id: string
  weight: string | null
  price: number
}

type ProductChoice = {
  id: string
  name: string
  startingPrice: number
}

type VariantChoice = {
  id: string
  name: string
  price: number
}

const SELECTING_VARIANT_PREFIX = 'selecting_variant:'
const SELECTING_QUANTITY_PREFIX = 'selecting_quantity:'

const supabaseAdmin = getSupabaseAdmin()

function normalizeInput(text: string): string {
  return text.trim()
}

function getStoreContactLine(): string {
  const phone = tenantConfig.contact.supportPhone.trim()
  const whatsapp = tenantConfig.contact.whatsappNumber.trim()
  const email = tenantConfig.contact.supportEmail.trim()

  if (whatsapp) return `For help, contact us on WhatsApp: ${whatsapp}`
  if (phone) return `For help, call us: ${phone}`
  if (email) return `For help, email us: ${email}`
  return 'For help, contact our support team.'
}

function buildWelcomeMenu(): string {
  return [
    `Welcome to ${tenantConfig.whatsappBotWelcome}!`,
    '',
    'Please choose an option:',
    '1. Browse products',
    '2. View my cart',
    '3. Help',
  ].join('\n')
}

function moneyLabel(amount: number): string {
  try {
    return formatMoney(amount)
  } catch {
    return `INR ${Math.round(amount).toLocaleString('en-IN')}`
  }
}

function buildProductList(products: ProductChoice[]): string {
  const lines = products.map((product, index) => {
    return `${index + 1}. ${product.name} (from ${moneyLabel(product.startingPrice)})`
  })

  return ['Available products:', ...lines, '', 'Reply with a number to select a product.'].join('\n')
}

function buildVariantList(productName: string, variants: VariantChoice[]): string {
  const lines = variants.map((variant, index) => `${index + 1}. ${variant.name} - ${moneyLabel(variant.price)}`)

  return [
    `Variants for ${productName}:`,
    ...lines,
    '',
    'Reply with the variant number to select.',
  ].join('\n')
}

function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function buildCartMessage(cart: CartItem[]): string {
  if (cart.length === 0) {
    return 'Your cart is empty. Reply 1 to browse products from the menu.'
  }

  const lines = cart.map((item, index) => {
    const lineTotal = item.price * item.quantity
    return `${index + 1}. ${item.productName} (${item.variantName}) x ${item.quantity} = ${moneyLabel(lineTotal)}`
  })

  return [
    'Your cart:',
    ...lines,
    '',
    `Total: ${moneyLabel(cartTotal(cart))}`,
    '',
    '1. Checkout',
    '2. Clear cart',
    '3. Continue shopping',
  ].join('\n')
}

function buildPostAddOptions(): string {
  return ['What would you like to do next?', '1. Continue shopping', '2. View cart', '3. Checkout'].join('\n')
}

function parseChoice(text: string): number | null {
  const value = Number.parseInt(text, 10)
  if (!Number.isInteger(value)) return null
  return value
}

async function fetchActiveProducts(): Promise<ProductChoice[]> {
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .returns<ProductRow[]>()

  if (productsError) throw productsError
  if (!products || products.length === 0) return []

  const productIds = products.map((product) => product.id)
  const { data: variants, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id, product_id, weight, price')
    .in('product_id', productIds)
    .gt('stock', 0)
    .returns<VariantRow[]>()

  if (variantsError) throw variantsError

  const minPriceByProduct = new Map<string, number>()
  for (const variant of variants ?? []) {
    const price = Number(variant.price)
    if (!Number.isFinite(price) || price <= 0) continue
    const current = minPriceByProduct.get(variant.product_id)
    if (current === undefined || price < current) {
      minPriceByProduct.set(variant.product_id, price)
    }
  }

  return products
    .filter((product) => minPriceByProduct.has(product.id))
    .map((product) => ({
      id: product.id,
      name: product.name,
      startingPrice: minPriceByProduct.get(product.id) ?? 0,
    }))
}

async function fetchVariantsForProduct(productId: string): Promise<VariantChoice[]> {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('id, weight, price')
    .eq('product_id', productId)
    .gt('stock', 0)
    .order('price', { ascending: true })

  if (error) throw error

  const variants = (data ?? []).map((variant) => ({
    id: String(variant.id),
    name: variant.weight && String(variant.weight).trim() ? String(variant.weight) : 'Default',
    price: Number(variant.price),
  }))

  return variants.filter((variant) => Number.isFinite(variant.price) && variant.price > 0)
}

function selectingVariantStep(productId: string): string {
  return `${SELECTING_VARIANT_PREFIX}${productId}`
}

function selectingQuantityStep(productId: string, variantId: string): string {
  return `${SELECTING_QUANTITY_PREFIX}${productId}:${variantId}`
}

function parseSelectingVariantStep(step: string): string | null {
  if (!step.startsWith(SELECTING_VARIANT_PREFIX)) return null
  const productId = step.slice(SELECTING_VARIANT_PREFIX.length)
  return productId || null
}

function parseSelectingQuantityStep(step: string): { productId: string; variantId: string } | null {
  if (!step.startsWith(SELECTING_QUANTITY_PREFIX)) return null
  const payload = step.slice(SELECTING_QUANTITY_PREFIX.length)
  const [productId, variantId] = payload.split(':')
  if (!productId || !variantId) return null
  return { productId, variantId }
}

async function sendMenu(phone: string): Promise<void> {
  await sendWhatsAppMessage(phone, buildWelcomeMenu())
  await updateSession(phone, { step: 'menu' })
}

async function sendProductsAndSetBrowsing(phone: string): Promise<void> {
  const products = await fetchActiveProducts()
  if (products.length === 0) {
    await sendWhatsAppMessage(phone, 'No products are available right now. Please try again later.')
    await updateSession(phone, { step: 'menu' })
    return
  }

  await sendWhatsAppMessage(phone, buildProductList(products))
  await updateSession(phone, { step: 'browsing' })
}

async function startCheckout(phone: string, cart: CartItem[]): Promise<void> {
  if (cart.length === 0) {
    await sendWhatsAppMessage(phone, 'Your cart is empty. Send anything to start again.')
    await updateSession(phone, { step: 'idle' })
    return
  }

  await sendWhatsAppMessage(phone, 'Please share your full name for delivery')
  await updateSession(phone, { step: 'checkout_name' })
}

function buildOrderSummary(cart: CartItem[], customerName: string, customerAddress: string): string {
  const lines = cart.map((item, index) => {
    const lineTotal = item.price * item.quantity
    return `${index + 1}. ${item.quantity} x ${item.productName} (${item.variantName}) - ${moneyLabel(lineTotal)}`
  })

  return [
    'Order summary:',
    ...lines,
    '',
    `Total: ${moneyLabel(cartTotal(cart))}`,
    `Name: ${customerName}`,
    `Address: ${customerAddress}`,
    '',
    'Reply YES to confirm or NO to cancel',
  ].join('\n')
}

const ordersColumnCache = new Map<string, boolean>()

async function hasOrdersColumn(column: string): Promise<boolean> {
  const cached = ordersColumnCache.get(column)
  if (cached !== undefined) return cached

  const { error } = await supabaseAdmin.from('orders').select(column).limit(1)
  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('column') && message.includes(column.toLowerCase())) {
      ordersColumnCache.set(column, false)
      return false
    }
  }

  ordersColumnCache.set(column, true)
  return true
}

async function createWhatsappOrder(phone: string, cart: CartItem[], customerName: string, customerAddress: string): Promise<string> {
  const totalAmount = cartTotal(cart)
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  const basePayload: Record<string, unknown> = {
    customer_name: customerName,
    customer_phone: phone,
    customer_email: '',
    customer_address: customerAddress,
    total_amount: totalAmount,
    status: 'Pending',
  }

  if (await hasOrdersColumn('payment_method')) {
    basePayload.payment_method = 'whatsapp_cod'
  }

  if (await hasOrdersColumn('items')) {
    basePayload.items = cart.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      price: item.price,
      quantity: item.quantity,
    }))
  }

  if (await hasOrdersColumn('source')) {
    basePayload.source = 'whatsapp'
  }

  if (await hasOrdersColumn('razorpay_order_id')) {
    basePayload.razorpay_order_id = `wa_order_${nonce}`
  }

  if (await hasOrdersColumn('razorpay_payment_id')) {
    basePayload.razorpay_payment_id = `wa_pending_${nonce}`
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert(basePayload)
    .select('id')
    .single<{ id: string }>()

  if (error) throw error

  const normalizedId = data.id.replace(/-/g, '')
  return `ORD-${normalizedId.slice(-6).toUpperCase()}`
}

export async function handleIncomingMessage(phone: string, text: string): Promise<void> {
  const input = normalizeInput(text)

  try {
    const session = await getSession(phone)

    if (!tenantConfig.features.whatsappBot) {
      await sendWhatsAppMessage(phone, 'WhatsApp ordering is currently unavailable. Please try again later.')
      return
    }

    const variantProductId = parseSelectingVariantStep(session.step)
    const quantityContext = parseSelectingQuantityStep(session.step)

    if (session.step === 'idle' || (!variantProductId && !quantityContext && ![
      'menu',
      'browsing',
      'post_add',
      'cart_review',
      'checkout_name',
      'checkout_address',
      'checkout_confirm',
    ].includes(session.step))) {
      await sendMenu(phone)
      return
    }

    if (session.step === 'menu') {
      if (input === '1') {
        await sendProductsAndSetBrowsing(phone)
        return
      }

      if (input === '2') {
        await sendWhatsAppMessage(phone, buildCartMessage(session.cart))
        await updateSession(phone, { step: session.cart.length > 0 ? 'cart_review' : 'menu' })
        return
      }

      if (input === '3') {
        await sendWhatsAppMessage(phone, ['Need help?', getStoreContactLine()].join('\n'))
        await updateSession(phone, { step: 'idle' })
        return
      }

      await sendMenu(phone)
      return
    }

    if (session.step === 'browsing') {
      const products = await fetchActiveProducts()
      if (products.length === 0) {
        await sendWhatsAppMessage(phone, 'No products are available right now. Please try again later.')
        await updateSession(phone, { step: 'idle' })
        return
      }

      const choice = parseChoice(input)
      if (!choice || choice < 1 || choice > products.length) {
        await sendWhatsAppMessage(phone, buildProductList(products))
        return
      }

      const selectedProduct = products[choice - 1]
      const variants = await fetchVariantsForProduct(selectedProduct.id)
      if (variants.length === 0) {
        await sendWhatsAppMessage(phone, 'This product is currently unavailable. Please choose another product.')
        await sendWhatsAppMessage(phone, buildProductList(products))
        await updateSession(phone, { step: 'browsing' })
        return
      }

      await sendWhatsAppMessage(phone, buildVariantList(selectedProduct.name, variants))
      await updateSession(phone, { step: selectingVariantStep(selectedProduct.id) })
      return
    }

    if (variantProductId) {
      const variants = await fetchVariantsForProduct(variantProductId)
      if (variants.length === 0) {
        await sendWhatsAppMessage(phone, 'This product is currently unavailable. Please select a different product.')
        await sendProductsAndSetBrowsing(phone)
        return
      }

      const choice = parseChoice(input)
      if (!choice || choice < 1 || choice > variants.length) {
        const { data: productData } = await supabaseAdmin
          .from('products')
          .select('name')
          .eq('id', variantProductId)
          .maybeSingle<{ name: string }>()

        const productName = productData?.name ?? 'Selected product'
        await sendWhatsAppMessage(phone, buildVariantList(productName, variants))
        return
      }

      const selectedVariant = variants[choice - 1]
      await sendWhatsAppMessage(phone, 'How many would you like? (reply with a number)')
      await updateSession(phone, { step: selectingQuantityStep(variantProductId, selectedVariant.id) })
      return
    }

    if (quantityContext) {
      const quantity = Number.parseInt(input, 10)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        await sendWhatsAppMessage(phone, 'Please enter a valid quantity between 1 and 20.')
        return
      }

      const { data: productData, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, name')
        .eq('id', quantityContext.productId)
        .maybeSingle<{ id: string; name: string }>()

      if (productError || !productData) {
        throw productError ?? new Error('Product not found')
      }

      const { data: variantData, error: variantError } = await supabaseAdmin
        .from('product_variants')
        .select('id, weight, price')
        .eq('id', quantityContext.variantId)
        .maybeSingle<{ id: string; weight: string | null; price: number }>()

      if (variantError || !variantData) {
        throw variantError ?? new Error('Variant not found')
      }

      const variantName = variantData.weight && variantData.weight.trim() ? variantData.weight : 'Default'
      const price = Number(variantData.price)
      const existingIndex = session.cart.findIndex((item) => item.variantId === variantData.id)
      const nextCart = [...session.cart]

      if (existingIndex >= 0) {
        const existing = nextCart[existingIndex]
        nextCart[existingIndex] = {
          ...existing,
          quantity: Math.min(20, existing.quantity + quantity),
        }
      } else {
        nextCart.push({
          productId: productData.id,
          variantId: variantData.id,
          productName: productData.name,
          variantName,
          price,
          quantity,
        })
      }

      await updateSession(phone, { cart: nextCart, step: 'post_add' })
      await sendWhatsAppMessage(phone, `Added ${quantity} x ${productData.name} (${variantName}) to your cart`)
      await sendWhatsAppMessage(phone, buildPostAddOptions())
      return
    }

    if (session.step === 'post_add') {
      if (input === '1') {
        await sendProductsAndSetBrowsing(phone)
        return
      }

      if (input === '2') {
        await sendWhatsAppMessage(phone, buildCartMessage(session.cart))
        await updateSession(phone, { step: session.cart.length > 0 ? 'cart_review' : 'menu' })
        return
      }

      if (input === '3') {
        await startCheckout(phone, session.cart)
        return
      }

      await sendWhatsAppMessage(phone, buildPostAddOptions())
      return
    }

    if (session.step === 'cart_review') {
      if (input === '1') {
        await startCheckout(phone, session.cart)
        return
      }

      if (input === '2') {
        await clearSession(phone)
        await sendWhatsAppMessage(phone, 'Cart cleared. Send anything to start again.')
        return
      }

      if (input === '3') {
        await sendProductsAndSetBrowsing(phone)
        return
      }

      await sendWhatsAppMessage(phone, buildCartMessage(session.cart))
      return
    }

    if (session.step === 'checkout_name') {
      if (!input) {
        await sendWhatsAppMessage(phone, 'Please share your full name for delivery')
        return
      }

      await updateSession(phone, {
        customerName: input,
        step: 'checkout_address',
      })

      await sendWhatsAppMessage(phone, 'Please share your delivery address (include city and pincode)')
      return
    }

    if (session.step === 'checkout_address') {
      if (!input) {
        await sendWhatsAppMessage(phone, 'Please share your delivery address (include city and pincode)')
        return
      }

      const customerName = session.customerName?.trim() || 'Customer'

      await updateSession(phone, {
        customerAddress: input,
        step: 'checkout_confirm',
      })

      await sendWhatsAppMessage(phone, buildOrderSummary(session.cart, customerName, input))
      return
    }

    if (session.step === 'checkout_confirm') {
      if (input.toUpperCase() === 'YES') {
        const customerName = session.customerName?.trim() || 'Customer'
        const customerAddress = session.customerAddress?.trim() || ''

        const orderId = await createWhatsappOrder(phone, session.cart, customerName, customerAddress)

        await sendWhatsAppMessage(phone, `Thank you! Your order is confirmed. Order ID: ${orderId}`)
        await sendWhatsAppMessage(phone, getStoreContactLine())
        await clearSession(phone)
        return
      }

      if (input.toUpperCase() === 'NO') {
        await sendWhatsAppMessage(phone, 'Order cancelled. Send anything to start again.')
        await clearSession(phone)
        return
      }

      await sendWhatsAppMessage(phone, 'Please reply YES to confirm or NO to cancel.')
      return
    }

    await sendMenu(phone)
  } catch (error) {
    console.error('[whatsapp] handleIncomingMessage failed', error)
    await sendWhatsAppMessage(phone, 'Something went wrong, please try again')
  }
}
