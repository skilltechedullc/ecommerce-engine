import { storeConfig } from '@/lib/config'
import { tenantConfig } from '@/lib/tenant.config'

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(tenantConfig.region.numberLocale, {
    style: 'currency',
    currency: storeConfig.currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function moneyWithSymbol(amount: number): string {
  return `${storeConfig.currencySymbol}${amount.toLocaleString(tenantConfig.region.numberLocale, { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`
}
