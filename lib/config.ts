import { tenantConfig } from '@/lib/tenant.config'

type StoreConfig = {
  brandName: string
  currency: string
  currencySymbol: string
  primaryColor: string
  logoUrl: string
  siteUrl: string
}

export const storeConfig: StoreConfig = {
  brandName: tenantConfig.branding.name,
  currency: tenantConfig.region.currency,
  currencySymbol: tenantConfig.region.currencySymbol,
  primaryColor: tenantConfig.branding.colors.primary,
  logoUrl: tenantConfig.branding.logoUrl,
  siteUrl: tenantConfig.branding.siteUrl,
}

export type { StoreConfig }
