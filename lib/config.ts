type StoreConfig = {
  brandName: string
  currency: string
  currencySymbol: string
  primaryColor: string
  logoUrl: string
  siteUrl: string
}

function env(name: string, fallback: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) return fallback
  return value.trim()
}

export const storeConfig: StoreConfig = {
  brandName: env('NEXT_PUBLIC_BRAND_NAME', 'Millco Organic & Fresh Food Products'),
  currency: env('NEXT_PUBLIC_CURRENCY', 'INR'),
  currencySymbol: env('NEXT_PUBLIC_CURRENCY_SYMBOL', '₹'),
  primaryColor: env('NEXT_PUBLIC_PRIMARY_COLOR', '#0F3D2E'),
  logoUrl: env('NEXT_PUBLIC_LOGO_URL', '/millco-logo.svg'),
  siteUrl: env('NEXT_PUBLIC_SITE_URL', 'https://millco.in'),
}

export type { StoreConfig }
