import { parseEnv } from 'node:util'

export function readEnvironment(content) {
  return parseEnv(content)
}

export function checkReadiness(env, mode = 'test') {
  const errors = []
  const warnings = []
  const value = (key) => (env[key] ?? '').trim()
  const required = [
    'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_BRAND_NAME', 'NEXT_PUBLIC_CONTACT_EMAIL',
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'ADMIN_SESSION_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
    'RAZORPAY_KEY_ID', 'NEXT_PUBLIC_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS',
  ]
  const authMode = value('ADMIN_AUTH_MODE') || 'single_password'
  if (!['single_password', 'database'].includes(authMode)) errors.push('ADMIN_AUTH_MODE must be single_password or database')
  if (authMode === 'single_password') required.push('ADMIN_PASSWORD')
  if (!['test', 'live'].includes(mode)) errors.push('Payment mode must be test or live')
  for (const key of required) {
    if (!value(key)) errors.push(key + ' is missing')
    else if (/^(?:your[-_]|replace[-_]|change[-_]|<)|example\.com|\.invalid/i.test(value(key))) {
      errors.push(key + ' contains a placeholder')
    }
  }
  for (const key of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'UPSTASH_REDIS_REST_URL']) {
    if (!value(key)) continue
    try {
      const url = new URL(value(key))
      if (url.protocol !== 'https:' || /^(localhost|127\.|\[::1\])/.test(url.hostname) || url.username || url.password) {
        errors.push(key + ' must be a public HTTPS URL without embedded credentials')
      }
    } catch { errors.push(key + ' must be a valid URL') }
  }
  for (const key of ['NEXT_PUBLIC_CONTACT_EMAIL', 'EMAIL_FROM_ADDRESS']) {
    if (value(key) && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value(key))) errors.push(key + ' must be an email address')
  }
  if (value('ADMIN_SESSION_SECRET').length < 32) errors.push('ADMIN_SESSION_SECRET must be at least 32 characters')
  if (authMode === 'single_password' && (value('ADMIN_PASSWORD').length < 16 || /change|default|password/i.test(value('ADMIN_PASSWORD')))) {
    errors.push('ADMIN_PASSWORD must be a unique password of at least 16 characters without default/example wording')
  }
  if (value('RAZORPAY_KEY_ID') !== value('NEXT_PUBLIC_RAZORPAY_KEY_ID')) errors.push('Razorpay server and public key IDs must match')
  if (value('RAZORPAY_KEY_ID') && !value('RAZORPAY_KEY_ID').startsWith('rzp_' + mode + '_')) {
    errors.push('Razorpay key does not match the selected ' + mode + ' payment mode')
  }
  if (value('NODE_ENV') && value('NODE_ENV') !== 'production') errors.push('Remove NODE_ENV from hosted settings or set it to production')
  if (value('NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS') === 'true' && mode === 'test') {
    warnings.push('Manual payments are enabled; demo customers could place COD orders')
  }
  if (value('WHATSAPP_ENABLED') === 'true') {
    const providers = {
      meta: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_APP_SECRET', 'WHATSAPP_GRAPH_API_VERSION', 'WHATSAPP_VERIFY_TOKEN'],
      twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'WHATSAPP_FROM'],
      wati: ['WATI_API_BASE_URL', 'WATI_API_TOKEN'],
      gupshup: ['GUPSHUP_APP_NAME', 'GUPSHUP_API_KEY'],
    }
    const keys = providers[value('WHATSAPP_PROVIDER')]
    if (!keys) errors.push('WHATSAPP_PROVIDER is unsupported')
    else for (const key of keys) if (!value(key)) errors.push(key + ' is missing')
  }
  if (value('WHATSAPP_AI_ENABLED') === 'true' && !value('ANTHROPIC_API_KEY')) errors.push('ANTHROPIC_API_KEY is missing for WhatsApp AI')
  if (value('NEXT_PUBLIC_FEATURE_WHATSAPP_BOT') === 'true' && value('WHATSAPP_ENABLED') !== 'true') warnings.push('WhatsApp bot is flagged on but messaging is disabled')
  warnings.push('This checks configuration only. Database migrations, credentials, webhooks, email delivery and checkout still require end-to-end verification.')
  return { errors: [...new Set(errors)], warnings }
}
