import Razorpay from 'razorpay'
import { storeConfig } from '@/lib/config'
import { formatMoney } from '@/lib/money'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { tenantConfig } from '@/lib/tenant.config'
import { env } from '@/lib/server/env'
import { sendMessage, type Channel } from '@/lib/chat/sender'
import { clearSession, getSession, updateSession, type CartItem } from '@/lib/chat/session'

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
const razorpay = new Razorpay({
  key_id: env('RAZORPAY_KEY_ID'),
  key_secret: env('RAZORPAY_KEY_SECRET'),
})

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

async function sendMenu(phone: string, channel: Channel): Promise<void> {
  await sendMessage(phone, buildWelcomeMenu(), channel)
  await updateSession(phone, channel, { step: 'menu' })
}

async function sendProductsAndSetBrowsing(phone: string, channel: Channel): Promise<void> {
  const products = await fetchActiveProducts()
  if (products.length === 0) {
    await sendMessage(phone, 'No products are available right now. Please try again later.', channel)
    await updateSession(phone, channel, { step: 'menu' })
    return
  }

  await sendMessage(phone, buildProductList(products), channel)
  await updateSession(phone, channel, { step: 'browsing' })
}

async function startCheckout(phone: string, channel: Channel, cart: CartItem[]): Promise<void> {
  if (cart.length === 0) {
    await sendMessage(phone, 'Your cart is empty. Send anything to start again.', channel)
    await updateSession(phone, channel, { step: 'idle' })
    return
  }

  await sendMessage(phone, 'Please share your full name for delivery', channel)
  await updateSession(phone, channel, { step: 'checkout_name' })
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

async function createChannelOrder(
  phone: string,
  cart: CartItem[],
  customerName: string,
  customerAddress: string,
  channel: Channel
): Promise<{ displayOrderId: string; paymentUrl: string }> {
  const totalAmount = cartTotal(cart)
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  const basePayload: Record<string, unknown> = {
    customer_name: customerName,
    customer_phone: phone,
    customer_email: '',
    customer_address: customerAddress,
    total_amount: totalAmount,
    status: 'Pending',
    razorpay_order_id: `${channel}_pending_order_${nonce}`,
    razorpay_payment_id: `${channel}_pending_payment_${nonce}`,
  }

  if (await hasOrdersColumn('payment_method')) {
    basePayload.payment_method = `${channel}_cod`
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
    basePayload.source = channel
  }

  if (!(await hasOrdersColumn('razorpay_order_id'))) {
    delete basePayload.razorpay_order_id
  }

  if (!(await hasOrdersColumn('razorpay_payment_id'))) {
    delete basePayload.razorpay_payment_id
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert(basePayload)
    .select('id')
    .single<{ id: string }>()

  if (error) throw error

  const normalizedId = data.id.replace(/-/g, '')
  const displayOrderId = `ORD-${normalizedId.slice(-6).toUpperCase()}`
  const amountPaise = Math.round(totalAmount * 100)

  const paymentLink = await (razorpay as unknown as {
    paymentLink: {
      create: (payload: Record<string, unknown>) => Promise<{ short_url?: string | null }>
    }
  }).paymentLink.create({
    amount: amountPaise,
    currency: storeConfig.currency,
    accept_partial: false,
    description: `Payment for ${displayOrderId}`,
    customer: {
      name: customerName,
      email: 'orders@millco.in',
      contact: phone.replace(/\D/g, ''),
    },
    notify: {
      sms: true,
      email: false,
    },
    reminder_enable: true,
    notes: {
      db_order_id: data.id,
      channel,
      customer_phone: phone,
    },
  })

  const paymentUrl = paymentLink.short_url?.trim()
  if (!paymentUrl) {
    throw new Error('Failed to generate payment link')
  }

  return { displayOrderId, paymentUrl }
}

export async function handleIncomingMessage(
  phone: string,
  text: string,
  channel: Channel = 'whatsapp'
): Promise<void> {
  const input = normalizeInput(text)

  try {
    const session = await getSession(phone, channel)

    const featureKey = channel === 'whatsapp' ? 'whatsappBot' : 'instagramDmBot'
    if (!tenantConfig.features[featureKey as keyof typeof tenantConfig.features]) {
      await sendMessage(phone, `${channel} ordering is currently unavailable. Please try again later.`, channel)
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
      await sendMenu(phone, channel)
      return
    }

    if (session.step === 'menu') {
      if (input === '1') {
        await sendProductsAndSetBrowsing(phone, channel)
        return
      }

      if (input === '2') {
        await sendMessage(phone, buildCartMessage(session.cart), channel)
        await updateSession(phone, channel, { step: session.cart.length > 0 ? 'cart_review' : 'menu' })
        return
      }

      if (input === '3') {
        await sendMessage(phone, ['Need help?', getStoreContactLine()].join('\n'), channel)
        await updateSession(phone, channel, { step: 'idle' })
        return
      }

      await sendMenu(phone, channel)
      return
    }

    if (session.step === 'browsing') {
      const products = await fetchActiveProducts()
      if (products.length === 0) {
        await sendMessage(phone, 'No products are available right now. Please try again later.', channel)
        await updateSession(phone, channel, { step: 'idle' })
        return
      }

      const choice = parseChoice(input)
      if (!choice || choice < 1 || choice > products.length) {
        await sendMessage(phone, buildProductList(products), channel)
        return
      }

      const selectedProduct = products[choice - 1]
      const variants = await fetchVariantsForProduct(selectedProduct.id)
      if (variants.length === 0) {
        await sendMessage(phone, 'This product is currently unavailable. Please choose another product.', channel)
        await sendMessage(phone, buildProductList(products), channel)
        await updateSession(phone, channel, { step: 'browsing' })
        return
      }

      await sendMessage(phone, buildVariantList(selectedProduct.name, variants), channel)
      await updateSession(phone, channel, { step: selectingVariantStep(selectedProduct.id) })
      return
    }

    if (variantProductId) {
      const variants = await fetchVariantsForProduct(variantProductId)
      if (variants.length === 0) {
        await sendMessage(phone, 'This product is currently unavailable. Please select a different product.', channel)
        await sendProductsAndSetBrowsing(phone, channel)
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
        await sendMessage(phone, buildVariantList(productName, variants), channel)
        return
      }

      const selectedVariant = variants[choice - 1]
      await sendMessage(phone, 'How many would you like? (reply with a number)', channel)
      await updateSession(phone, channel, { step: selectingQuantityStep(variantProductId, selectedVariant.id) })
      return
    }

    if (quantityContext) {
      const quantity = Number.parseInt(input, 10)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        await sendMessage(phone, 'Please enter a valid quantity between 1 and 20.', channel)
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

      await updateSession(phone, channel, { cart: nextCart, step: 'post_add' })
      await sendMessage(phone, `Added ${quantity} x ${productData.name} (${variantName}) to your cart`, channel)
      await sendMessage(phone, buildPostAddOptions(), channel)
      return
    }

    if (session.step === 'post_add') {
      if (input === '1') {
        await sendProductsAndSetBrowsing(phone, channel)
        return
      }

      if (input === '2') {
        await sendMessage(phone, buildCartMessage(session.cart), channel)
        await updateSession(phone, channel, { step: session.cart.length > 0 ? 'cart_review' : 'menu' })
        return
      }

      if (input === '3') {
        await startCheckout(phone, channel, session.cart)
        return
      }

      await sendMessage(phone, buildPostAddOptions(), channel)
      return
    }

    if (session.step === 'cart_review') {
      if (input === '1') {
        await startCheckout(phone, channel, session.cart)
        return
      }

      if (input === '2') {
        await clearSession(phone, channel)
        await sendMessage(phone, 'Cart cleared. Send anything to start again.', channel)
        return
      }

      if (input === '3') {
        await sendProductsAndSetBrowsing(phone, channel)
        return
      }

      await sendMessage(phone, buildCartMessage(session.cart), channel)
      return
    }

    if (session.step === 'checkout_name') {
      if (!input) {
        await sendMessage(phone, 'Please share your full name for delivery', channel)
        return
      }

      await updateSession(phone, channel, {
        customerName: input,
        step: 'checkout_address',
      })

      await sendMessage(phone, 'Please share your delivery address (include city and pincode)', channel)
      return
    }

    if (session.step === 'checkout_address') {
      if (!input) {
        await sendMessage(phone, 'Please share your delivery address (include city and pincode)', channel)
        return
      }

      const customerName = session.customerName?.trim() || 'Customer'

      await updateSession(phone, channel, {
        customerAddress: input,
        step: 'checkout_confirm',
      })

      await sendMessage(phone, buildOrderSummary(session.cart, customerName, input), channel)
      return
    }

    if (session.step === 'checkout_confirm') {
      if (input.toUpperCase() === 'YES') {
        const customerName = session.customerName?.trim() || 'Customer'
        const customerAddress = session.customerAddress?.trim() || ''

        const { displayOrderId, paymentUrl } = await createChannelOrder(phone, session.cart, customerName, customerAddress, channel)

        await sendMessage(
          phone,
          [
            `Order ${displayOrderId} is created and pending payment.`,
            'Please complete payment using this secure link:',
            paymentUrl,
            '',
            'You will receive final confirmation after successful payment.',
          ].join('\n'),
          channel
        )
        await clearSession(phone, channel)
        return
      }

      if (input.toUpperCase() === 'NO') {
        await sendMessage(phone, 'Order cancelled. Send anything to start again.', channel)
        await clearSession(phone, channel)
        return
      }

      await sendMessage(phone, 'Please reply YES to confirm or NO to cancel.', channel)
      return
    }

    await sendMenu(phone, channel)
  } catch (error) {
    console.error(`[${channel}] handleIncomingMessage failed`, error)
    await sendMessage(phone, 'Something went wrong, please try again', channel)
  }
}
