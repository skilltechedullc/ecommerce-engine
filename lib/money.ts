import { storeConfig } from '@/lib/config'

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: storeConfig.currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function moneyWithSymbol(amount: number): string {
  return `${storeConfig.currencySymbol}${amount.toLocaleString('en-IN')}`
}
