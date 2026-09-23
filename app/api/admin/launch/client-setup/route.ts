import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { hasPermission } from '@/lib/server/permissions'

type LaunchSetupPayload = {
  storeName?: string
  niche?: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  domain?: string
  deploymentTarget?: string
  packageTier?: string
  themePreset?: string
  primaryColor?: string
  accentColor?: string
  currency?: string
  currencySymbol?: string
  locale?: string
  countryCode?: string
  countryName?: string
  contactEmail?: string
  contactPhone?: string
  whatsappNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  addons?: Record<string, boolean>
  providers?: {
    supabase?: string
    payment?: string
    email?: string
    whatsapp?: string
    shipping?: string
  }
  starterCategories?: string
  launchNotes?: string
}

const addonEnvMap: Record<string, string> = {
  whatsappStore: 'NEXT_PUBLIC_FEATURE_WHATSAPP_BOT',
  aiAssistant: 'NEXT_PUBLIC_FEATURE_AI_CHAT',
  reviews: 'NEXT_PUBLIC_FEATURE_PRODUCT_REVIEWS',
  loyalty: 'NEXT_PUBLIC_FEATURE_LOYALTY_POINTS',
  analytics: 'NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS',
  multiLanguage: 'NEXT_PUBLIC_FEATURE_MULTI_LANGUAGE',
  multiCurrency: 'NEXT_PUBLIC_FEATURE_MULTI_CURRENCY',
  shippingIntegrations: 'NEXT_PUBLIC_FEATURE_SHIPPING_INTEGRATIONS',
}

function clean(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'client-store'
}

function envLine(key: string, value: string) {
  return `${key}=${value.replace(/\r?\n/g, ' ').trim()}`
}

function generateSecret(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}

function buildEnv(payload: LaunchSetupPayload, slug: string) {
  const storeName = clean(payload.storeName, 'Client Store')
  const shortName = storeName.split(/\s+/).filter(Boolean)[0] ?? 'Store'
  const domain = clean(payload.domain, `${slug}.example.com`).replace(/^https?:\/\//, '').replace(/\/$/, '')
  const siteUrl = `https://${domain}`
  const currency = clean(payload.currency, 'INR')
  const currencySymbol = clean(payload.currencySymbol, currency === 'AED' ? 'AED' : currency === 'USD' ? '$' : 'Rs.')
  const locale = clean(payload.locale, currency === 'AED' ? 'en-AE' : 'en-IN')
  const countryCode = clean(payload.countryCode, currency === 'AED' ? 'AE' : 'IN')
  const countryName = clean(payload.countryName, currency === 'AED' ? 'United Arab Emirates' : 'India')
  const addons = payload.addons ?? {}
  const providers = payload.providers ?? {}
  const shippingProvider = clean(providers.shipping, 'manual')
  const paymentProvider = clean(providers.payment, 'razorpay')
  const emailProvider = clean(providers.email, 'resend')

  const lines = [
    '# Client-owned ecommerce engine environment template',
    '# Fill this with the client account details only. Do not reuse another client secrets.',
    '',
    envLine('NEXT_PUBLIC_STORE_PRESET', 'generic'),
    envLine('NEXT_PUBLIC_THEME_PRESET', clean(payload.themePreset, 'natural')),
    envLine('NEXT_PUBLIC_BRAND_NAME', storeName),
    envLine('NEXT_PUBLIC_BRAND_SHORT_NAME', shortName),
    envLine('NEXT_PUBLIC_SITE_URL', siteUrl),
    envLine('NEXT_PUBLIC_BUSINESS_SITE_URL', siteUrl),
    'NEXT_PUBLIC_LOGO_URL=/logo.svg',
    envLine('NEXT_PUBLIC_BRAND_DESCRIPTION', `${storeName} online store for ${clean(payload.niche, 'retail products')}.`),
    '',
    envLine('NEXT_PUBLIC_CONTACT_EMAIL', clean(payload.contactEmail || payload.ownerEmail)),
    envLine('NEXT_PUBLIC_CONTACT_PHONE', clean(payload.contactPhone || payload.ownerPhone)),
    envLine('NEXT_PUBLIC_WHATSAPP_NUMBER', clean(payload.whatsappNumber || payload.ownerPhone).replace(/\D/g, '')),
    envLine('NEXT_PUBLIC_ADDRESS_LINE_1', clean(payload.addressLine1)),
    envLine('NEXT_PUBLIC_ADDRESS_LINE_2', clean(payload.addressLine2)),
    envLine('NEXT_PUBLIC_ADDRESS_CITY', clean(payload.city)),
    envLine('NEXT_PUBLIC_ADDRESS_STATE', clean(payload.state)),
    envLine('NEXT_PUBLIC_ADDRESS_POSTAL_CODE', clean(payload.postalCode)),
    envLine('NEXT_PUBLIC_ADDRESS_COUNTRY', countryName),
    '',
    envLine('NEXT_PUBLIC_LEGAL_OPERATOR_NAME', storeName),
    envLine('NEXT_PUBLIC_LEGAL_WEBSITE_LABEL', domain),
    envLine('NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL', clean(payload.contactEmail || payload.ownerEmail)),
    envLine('NEXT_PUBLIC_LEGAL_BUSINESS_DESCRIPTION', `the sale of ${clean(payload.niche, 'products')} through an online store`),
    envLine('NEXT_PUBLIC_LEGAL_JURISDICTION_COUNTRY', countryName),
    '',
    envLine('NEXT_PUBLIC_CURRENCY', currency),
    envLine('NEXT_PUBLIC_CURRENCY_SYMBOL', currencySymbol),
    envLine('NEXT_PUBLIC_LOCALE', locale.replace('-', '_')),
    envLine('NEXT_PUBLIC_NUMBER_LOCALE', locale),
    envLine('NEXT_PUBLIC_COUNTRY_CODE', countryCode),
    envLine('NEXT_PUBLIC_COUNTRY_NAME', countryName),
    'NEXT_PUBLIC_SHIPPING_COVERAGE_LABEL=Configured delivery areas',
    '',
    'NEXT_PUBLIC_SUPABASE_URL=',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=',
    'SUPABASE_SERVICE_ROLE_KEY=',
    '',
    envLine('ADMIN_PASSWORD', generateSecret(18)),
    envLine('ADMIN_SESSION_SECRET', generateSecret(32)),
    envLine('ADMIN_EMAIL', clean(payload.ownerEmail)),
    'ADMIN_AUTH_MODE=single_password',
    'UPSTASH_REDIS_REST_URL=',
    'UPSTASH_REDIS_REST_TOKEN=',
    '',
    paymentProvider === 'razorpay' ? 'RAZORPAY_KEY_ID=' : `PAYMENT_PROVIDER=${paymentProvider}`,
    paymentProvider === 'razorpay' ? 'RAZORPAY_KEY_SECRET=' : '',
    paymentProvider === 'razorpay' ? 'RAZORPAY_WEBHOOK_SECRET=' : '',
    paymentProvider === 'razorpay' ? 'NEXT_PUBLIC_RAZORPAY_KEY_ID=' : '',
    '',
    emailProvider === 'resend' ? 'RESEND_API_KEY=' : `EMAIL_PROVIDER=${emailProvider}`,
    'EMAIL_FROM_ADDRESS=',
    '',
    envLine('WHATSAPP_ENABLED', addons.whatsappStore ? 'true' : 'false'),
    ...Object.entries(addonEnvMap).map(([addon, key]) => envLine(key, addons[addon] ? 'true' : 'false')),
    '',
    envLine('SHIPPING_PROVIDER', shippingProvider),
    envLine('SHIPPING_AUTO_CREATE', addons.shippingIntegrations && shippingProvider !== 'manual' ? 'true' : 'false'),
    'SHIPPING_PICKUP_NAME=',
    'SHIPPING_PICKUP_PHONE=',
    'SHIPPING_PICKUP_ADDRESS_LINE1=',
    'SHIPPING_PICKUP_ADDRESS_LINE2=',
    'SHIPPING_PICKUP_CITY=',
    'SHIPPING_PICKUP_STATE=',
    'SHIPPING_PICKUP_PINCODE=',
    'SHIPPING_PICKUP_COUNTRY=',
  ].filter((line) => line !== '')

  return `${lines.join('\n')}\n`
}

function buildHandover(payload: LaunchSetupPayload, slug: string) {
  const storeName = clean(payload.storeName, 'Client Store')
  const domain = clean(payload.domain, `${slug}.example.com`).replace(/^https?:\/\//, '').replace(/\/$/, '')
  const siteUrl = `https://${domain}`
  const categories = clean(payload.starterCategories, 'Products, Best Sellers, New Arrivals')
  const addons = Object.entries(payload.addons ?? {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join(', ') || 'None selected'

  return [
    `# ${storeName} Launch Handover`,
    '',
    `Store URL: ${siteUrl}`,
    `Admin URL: ${siteUrl}/admin/login`,
    `Owner: ${clean(payload.ownerName, 'Not configured')}`,
    `Owner email: ${clean(payload.ownerEmail, 'Not configured')}`,
    `Niche: ${clean(payload.niche, 'General retail')}`,
    `Package: ${clean(payload.packageTier, 'Basic Store')}`,
    `Deployment target: ${clean(payload.deploymentTarget, 'Vercel')}`,
    '',
    '## Selected Add-ons',
    '',
    addons,
    '',
    '## Starter Catalog Direction',
    '',
    categories,
    '',
    '## Client-Owned Accounts To Connect',
    '',
    `- Supabase: ${clean(payload.providers?.supabase, 'Client Supabase project')}`,
    `- Payment: ${clean(payload.providers?.payment, 'Razorpay or configured provider')}`,
    `- Email: ${clean(payload.providers?.email, 'Resend')}`,
    `- WhatsApp: ${clean(payload.providers?.whatsapp, 'Manual WhatsApp link')}`,
    `- Shipping: ${clean(payload.providers?.shipping, 'Manual shipping')}`,
    '',
    '## Launch Checklist',
    '',
    '- Fill `.env.template` with real client credentials.',
    '- Run Supabase migrations against the client project.',
    '- Verify storage buckets, RLS, and provider health checks.',
    '- Import starter products or seed demo products.',
    '- Test homepage, products, cart, checkout, admin, order status, and notifications.',
    '- Hand over admin URL and temporary login details.',
    '- Ask the client to change temporary admin credentials after handover.',
    '',
    '## Notes',
    '',
    clean(payload.launchNotes, 'No extra notes.'),
  ].join('\n')
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'settings:update')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const payload = await parseJson<LaunchSetupPayload>(req)
    const storeName = clean(payload.storeName)
    if (!storeName) throw new HttpError(400, 'Store name is required', 'VALIDATION_ERROR')

    const slug = slugify(storeName)
    const envTemplate = buildEnv(payload, slug)
    const handover = buildHandover(payload, slug)
    const setupJson = JSON.stringify({ ...payload, slug, generatedAt: new Date().toISOString() }, null, 2)

    return jsonOk({
      slug,
      clientDir: `clients/${slug}`,
      files: ['.env.template', 'handover-notes.md', 'launch-wizard.json'],
      downloads: [
        { name: '.env.template', content: envTemplate },
        { name: 'handover-notes.md', content: handover },
        { name: 'launch-wizard.json', content: setupJson },
      ],
      nextSteps: [
        'Fill the env template with client-owned credentials.',
        'Run migrations against the client Supabase project.',
        'Deploy to the chosen hosting target.',
        'Run final launch checks and hand over admin details.',
      ],
    }, { requestId })
  })
}
