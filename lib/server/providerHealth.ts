import { optionalEnv } from '@/lib/server/env'

export type ProviderHealthStatus = 'ready' | 'disabled' | 'missing'

export type ProviderHealthCheck = {
  provider: string
  status: ProviderHealthStatus
  message: string
  requiredEnv: string[]
}

function hasAll(keys: string[]) {
  return keys.every((key) => Boolean(optionalEnv(key)))
}

function check(provider: string, requiredEnv: string[], enabled = true): ProviderHealthCheck {
  if (!enabled) {
    return {
      provider,
      status: 'disabled',
      message: `${provider} is disabled for this store.`,
      requiredEnv,
    }
  }

  const ready = hasAll(requiredEnv)
  return {
    provider,
    status: ready ? 'ready' : 'missing',
    message: ready
      ? `${provider} configuration is present.`
      : `${provider} is missing one or more required environment values.`,
    requiredEnv,
  }
}

function flag(name: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((optionalEnv(name) ?? '').toLowerCase())
}

export function getProviderHealthChecks(): ProviderHealthCheck[] {
  return [
    check('Supabase', ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']),
    check('Rate limiting', ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']),
    check('Razorpay', ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'NEXT_PUBLIC_RAZORPAY_KEY_ID']),
    check('Resend', ['RESEND_API_KEY', 'EMAIL_FROM_ADDRESS']),
    check('WhatsApp automation', ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'], flag('NEXT_PUBLIC_FEATURE_WHATSAPP_BOT')),
    check('AI assistant', ['ANTHROPIC_API_KEY'], flag('NEXT_PUBLIC_FEATURE_AI_CHAT')),
    check('Shipping provider', ['SHIPPING_PROVIDER'], flag('NEXT_PUBLIC_FEATURE_SHIPPING_INTEGRATIONS')),
  ]
}
