import { storeConfig } from '@/lib/config'
import { tenantConfig } from '@/lib/tenant.config'

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(tenantConfig.region.numberLocale, {
    style: 'currency',
    currency: storeConfig.currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function moneyWithSymbol(amount: number): string {
  return `${storeConfig.currencySymbol}${amount.toLocaleString(tenantConfig.region.numberLocale)}`
}
