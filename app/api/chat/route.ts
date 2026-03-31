import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError } from '@/lib/server/api'
import { tenantConfig } from '@/lib/tenant.config'

export const runtime = 'nodejs'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string
}

type ChatRequestBody = {
  messages: ChatMessage[]
}

type ProductVariantRow = {
  id: string
  weight: string | null
  price: number | null
  stock: number | null
}

type ProductRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  product_variants: ProductVariantRow[] | null
}

type RateLimitBucket = {
  count: number
  windowStart: number
}

declare global {
  var __aiChatRateLimitStore: Map<string, RateLimitBucket> | undefined
}

const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 20
const MAX_MESSAGES = 20
const MAX_CONTENT_LENGTH = 1000

const rateLimitStore = globalThis.__aiChatRateLimitStore ?? new Map<string, RateLimitBucket>()
if (!globalThis.__aiChatRateLimitStore) {
  globalThis.__aiChatRateLimitStore = rateLimitStore
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwardedFor || realIp || 'unknown'
}

function enforceInMemoryRateLimit(ip: string) {
  const now = Date.now()
  const existing = rateLimitStore.get(ip)

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - existing.windowStart)) / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  existing.count += 1
  rateLimitStore.set(ip, existing)
  return { allowed: true, retryAfterSeconds: 0 }
}

function assertChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'messages must be an array', 'VALIDATION_ERROR')
  }

  if (value.length === 0) {
    throw new HttpError(400, 'messages cannot be empty', 'VALIDATION_ERROR')
  }

  if (value.length > MAX_MESSAGES) {
    throw new HttpError(400, `messages can contain at most ${MAX_MESSAGES} entries`, 'VALIDATION_ERROR')
  }

  const parsed: ChatMessage[] = value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError(400, `messages[${index}] must be an object`, 'VALIDATION_ERROR')
    }

    const role = Reflect.get(item, 'role')
    const content = Reflect.get(item, 'content')

    if (role !== 'user' && role !== 'assistant') {
      throw new HttpError(400, `messages[${index}].role must be user or assistant`, 'VALIDATION_ERROR')
    }

    if (typeof content !== 'string' || !content.trim()) {
      throw new HttpError(400, `messages[${index}].content must be a non-empty string`, 'VALIDATION_ERROR')
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      throw new HttpError(
        400,
        `messages[${index}].content exceeds ${MAX_CONTENT_LENGTH} characters`,
        'VALIDATION_ERROR'
      )
    }

    return { role, content: content.trim() }
  })

  if (parsed[parsed.length - 1]?.role !== 'user') {
    throw new HttpError(400, 'last message must be from user', 'VALIDATION_ERROR')
  }

  return parsed
}

function formatPrice(value: number | null, symbol: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${symbol}0`
  }

  return `${symbol}${value.toFixed(2)}`
}

function buildWhatsAppLink(): string {
  const phone = tenantConfig.contact.whatsappNumber.trim()
  if (!phone) return 'WhatsApp currently unavailable'
  return `https://wa.me/${phone}`
}

function formatCatalog(products: ProductRow[]): string {
  if (products.length === 0) {
    return 'No active products are currently listed in the catalog.'
  }

  const currencySymbol = tenantConfig.region.currencySymbol

  return products
    .map((product) => {
      const variants = (product.product_variants ?? []).map((variant, index) => {
        const variantLabel = variant.weight || `Variant ${index + 1}`
        const stock = typeof variant.stock === 'number' && variant.stock > 0
          ? `in stock (${variant.stock})`
          : 'currently unavailable'

        return `  - ${variantLabel}: ${formatPrice(variant.price, currencySymbol)} (${stock})`
      })

      const description = product.description?.trim() || 'No description available.'

      if (variants.length === 0) {
        return `- ${product.name}: ${description}\n  - No variants currently available.`
      }

      return `- ${product.name}: ${description}\n${variants.join('\n')}`
    })
    .join('\n\n')
}

function buildSystemPrompt(catalogText: string): string {
  const tenantName = tenantConfig.branding.name
  const contactPhone = tenantConfig.contact.supportPhone
  const contactEmail = tenantConfig.contact.supportEmail
  const contactAddress = tenantConfig.contact.address.lines.join(', ')
  const whatsappNumber = tenantConfig.contact.whatsappNumber || 'Not configured'
  const whatsappLink = buildWhatsAppLink()
  const shippingCoverage = tenantConfig.region.shippingCoverageLabel
  const policySnippet = tenantConfig.marketing.footer.legalByline

  return [
    `You are a helpful store assistant for ${tenantName}.`,
    'You are knowledgeable, friendly, and concise.',
    'You help customers find the right products, answer questions about ingredients, usage, shelf life, and suitability.',
    'You handle questions about shipping, payment, and returns.',
    'You guide customers toward placing orders.',
    '',
    'STORE INFORMATION:',
    `Name: ${tenantName}`,
    `Contact: ${contactPhone}`,
    `Email: ${contactEmail}`,
    `Address: ${contactAddress}`,
    `WhatsApp: ${whatsappNumber}`,
    `Shipping Coverage: ${shippingCoverage}`,
    `Policy Notes: ${policySnippet}`,
    '',
    'PRODUCT CATALOG:',
    catalogText,
    '',
    'ORDERING OPTIONS:',
    '1. Add products directly to cart on the website',
    `2. Order via WhatsApp: ${whatsappLink}`,
    '',
    'RESPONSE RULES:',
    '- Keep replies concise - 2 to 4 sentences max unless listing products',
    '- Never make up information not in the product catalog',
    '- If asked about a product not in catalog say it is not available',
    '- For complex orders suggest WhatsApp for a smoother experience',
    '- If customer seems ready to buy guide them to the product page or WhatsApp',
    '- Never discuss competitors',
    '- Always be warm and helpful',
    "- If you don't know something say so honestly",
    `- Format prices clearly with the currency symbol ${tenantConfig.region.currencySymbol}`,
    '- For out of stock variants say "currently unavailable"',
  ].join('\n')
}

async function fetchCatalog(): Promise<{ products: ProductRow[]; loadError: boolean }> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, is_active, product_variants(id, weight, price, stock)')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase catalog fetch error:', error)
      return { products: [], loadError: true }
    }

    return { products: (data ?? []) as ProductRow[], loadError: false }
  } catch (err) {
    console.error('Catalog fetch exception:', err)
    return { products: [], loadError: true }
  }
}

function jsonError(message: string, status: number, code: string, details?: unknown) {
  return Response.json(
    {
      success: false,
      error: message,
      code,
      details,
    },
    { status }
  )
}

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const rateLimit = enforceInMemoryRateLimit(ip)

  if (!rateLimit.allowed) {
    return jsonError(
      'Too many chat requests right now. Please try again in a little while.',
      429,
      'RATE_LIMITED',
      { retryAfterSeconds: rateLimit.retryAfterSeconds }
    )
  }

  try {
    const body = (await req.json()) as ChatRequestBody
    const messages = assertChatMessages(body?.messages)

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!anthropicApiKey) {
      return jsonError(
        'Chat is currently unavailable. Please contact us on WhatsApp.',
        503,
        'CHAT_UNAVAILABLE'
      )
    }

    const { products, loadError } = await fetchCatalog()
    const catalogText = loadError
      ? 'Product catalog is temporarily unavailable. Please direct customers to contact us via WhatsApp or email for product availability and pricing information.'
      : formatCatalog(products)
    const systemPrompt = buildSystemPrompt(catalogText)

    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (payload: Record<string, string>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        try {
          const anthropicStream = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            stream: true,
            system: systemPrompt,
            messages,
          })

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              sendEvent({ type: 'text', text: event.delta.text })
            }
          }

          sendEvent({ type: 'done', text: '' })
        } catch (error) {
          console.error('Anthropic streaming error:', error)
          sendEvent({
            type: 'text',
            text: 'I am having trouble answering right now. Please try again, or continue your order on WhatsApp for immediate support.',
          })
          sendEvent({ type: 'done', text: '' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.message, error.status, error.code, error.details)
    }

    console.error('Chat route error:', error)
    return jsonError('Unable to process chat request', 500, 'INTERNAL_ERROR')
  }
}
