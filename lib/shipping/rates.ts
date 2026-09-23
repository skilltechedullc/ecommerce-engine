import { tenantConfig } from '@/lib/tenant.config'

export type ShippingRateRules = {
  flatRate: number
  freeShippingThreshold: number
  zones?: ShippingZoneRateRule[]
}

export type ShippingAddressInput = {
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
}

export type ShippingZoneRateRule = {
  name?: string
  minSubtotal?: number
  maxSubtotal?: number
  flatRate?: number
  freeShippingThreshold?: number
  pincodePrefix?: string
  city?: string
  state?: string
}

export type ShippingQuote = {
  subtotal: number
  shippingAmount: number
  total: number
  freeShippingApplied: boolean
  matchedRule?: string
}

function normalizeAmount(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateShippingRate(
  subtotal: number,
  rules: ShippingRateRules = tenantConfig.shipping.rateRules,
  address: ShippingAddressInput = {}
): ShippingQuote {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error('subtotal must be a valid non-negative number')
  }

  const matchedZone = findMatchingZoneRule(subtotal, rules.zones ?? [], address)
  const flatRate = Math.max(0, Number(matchedZone?.flatRate ?? rules.flatRate) || 0)
  const freeShippingThreshold = Math.max(0, Number(matchedZone?.freeShippingThreshold ?? rules.freeShippingThreshold) || 0)
  const freeShippingApplied = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold
  const shippingAmount = freeShippingApplied ? 0 : flatRate

  const quote: ShippingQuote = {
    subtotal: normalizeAmount(subtotal),
    shippingAmount: normalizeAmount(shippingAmount),
    total: normalizeAmount(subtotal + shippingAmount),
    freeShippingApplied,
  }
  if (matchedZone?.name) quote.matchedRule = matchedZone.name
  return quote
}

export function parseShippingZones(value: string): ShippingZoneRateRule[] {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ShippingZoneRateRule => Boolean(item && typeof item === 'object'))
  } catch {
    return []
  }
}

function findMatchingZoneRule(
  subtotal: number,
  zones: ShippingZoneRateRule[],
  address: ShippingAddressInput
): ShippingZoneRateRule | undefined {
  const haystack = `${address.address ?? ''} ${address.city ?? ''} ${address.state ?? ''} ${address.pincode ?? ''}`.toLowerCase()
  const pincode = address.pincode ?? address.address?.match(/\b\d{5,6}\b/)?.[0] ?? ''

  return zones.find((zone) => {
    if (zone.minSubtotal !== undefined && subtotal < Number(zone.minSubtotal)) return false
    if (zone.maxSubtotal !== undefined && subtotal > Number(zone.maxSubtotal)) return false
    if (zone.pincodePrefix && !pincode.startsWith(zone.pincodePrefix)) return false
    if (zone.city && !haystack.includes(zone.city.toLowerCase())) return false
    if (zone.state && !haystack.includes(zone.state.toLowerCase())) return false
    return true
  })
}
