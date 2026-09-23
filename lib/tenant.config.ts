import { getStorePreset } from '@/lib/store/presets'
import { genericMarketingDefaults, millcoMarketingDefaults } from '@/lib/store/marketingDefaults'
import { getStoreThemePreset } from '@/lib/store/themePresets'

type ShippingZoneRateRule = {
  name?: string
  minSubtotal?: number
  maxSubtotal?: number
  flatRate?: number
  freeShippingThreshold?: number
  pincodePrefix?: string
  city?: string
  state?: string
}

function env(name: string, fallback: string): string {
  const value = publicRuntimeEnv(name) ?? process.env[name]
  if (!value || !value.trim()) return fallback
  return value.trim()
}

function publicRuntimeEnv(name: string): string | undefined {
  // Static references let Next.js inline public values into browser bundles.
  switch (name) {
    case 'NEXT_PUBLIC_ADD_TO_CART_TRUST_BADGES': return process.env.NEXT_PUBLIC_ADD_TO_CART_TRUST_BADGES
    case 'NEXT_PUBLIC_ADDRESS_CITY': return process.env.NEXT_PUBLIC_ADDRESS_CITY
    case 'NEXT_PUBLIC_ADDRESS_COUNTRY': return process.env.NEXT_PUBLIC_ADDRESS_COUNTRY
    case 'NEXT_PUBLIC_ADDRESS_LINE_1': return process.env.NEXT_PUBLIC_ADDRESS_LINE_1
    case 'NEXT_PUBLIC_ADDRESS_LINE_2': return process.env.NEXT_PUBLIC_ADDRESS_LINE_2
    case 'NEXT_PUBLIC_ADDRESS_POSTAL_CODE': return process.env.NEXT_PUBLIC_ADDRESS_POSTAL_CODE
    case 'NEXT_PUBLIC_ADDRESS_STATE': return process.env.NEXT_PUBLIC_ADDRESS_STATE
    case 'NEXT_PUBLIC_ADMIN_ACCENT_COLOR': return process.env.NEXT_PUBLIC_ADMIN_ACCENT_COLOR
    case 'NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_END': return process.env.NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_END
    case 'NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_START': return process.env.NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_START
    case 'NEXT_PUBLIC_ANALYTICS_NAMESPACE': return process.env.NEXT_PUBLIC_ANALYTICS_NAMESPACE
    case 'NEXT_PUBLIC_BRAND_ACCENT_COLOR': return process.env.NEXT_PUBLIC_BRAND_ACCENT_COLOR
    case 'NEXT_PUBLIC_BRAND_BACKGROUND_COLOR': return process.env.NEXT_PUBLIC_BRAND_BACKGROUND_COLOR
    case 'NEXT_PUBLIC_BRAND_DESCRIPTION': return process.env.NEXT_PUBLIC_BRAND_DESCRIPTION
    case 'NEXT_PUBLIC_BRAND_FOREGROUND_COLOR': return process.env.NEXT_PUBLIC_BRAND_FOREGROUND_COLOR
    case 'NEXT_PUBLIC_BRAND_NAME': return process.env.NEXT_PUBLIC_BRAND_NAME
    case 'NEXT_PUBLIC_BRAND_PRIMARY_COLOR': return process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR
    case 'NEXT_PUBLIC_BRAND_PRIMARY_DARK_COLOR': return process.env.NEXT_PUBLIC_BRAND_PRIMARY_DARK_COLOR
    case 'NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_END': return process.env.NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_END
    case 'NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_START': return process.env.NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_START
    case 'NEXT_PUBLIC_BRAND_SHORT_NAME': return process.env.NEXT_PUBLIC_BRAND_SHORT_NAME
    case 'NEXT_PUBLIC_BRAND_STORY_BODY': return process.env.NEXT_PUBLIC_BRAND_STORY_BODY
    case 'NEXT_PUBLIC_BRAND_STORY_HEADING': return process.env.NEXT_PUBLIC_BRAND_STORY_HEADING
    case 'NEXT_PUBLIC_BRAND_SURFACE_COLOR': return process.env.NEXT_PUBLIC_BRAND_SURFACE_COLOR
    case 'NEXT_PUBLIC_BUSINESS_GATEWAY_BODY': return process.env.NEXT_PUBLIC_BUSINESS_GATEWAY_BODY
    case 'NEXT_PUBLIC_BUSINESS_GATEWAY_CTA': return process.env.NEXT_PUBLIC_BUSINESS_GATEWAY_CTA
    case 'NEXT_PUBLIC_BUSINESS_GATEWAY_EYEBROW': return process.env.NEXT_PUBLIC_BUSINESS_GATEWAY_EYEBROW
    case 'NEXT_PUBLIC_BUSINESS_SITE_ARIA_LABEL': return process.env.NEXT_PUBLIC_BUSINESS_SITE_ARIA_LABEL
    case 'NEXT_PUBLIC_BUSINESS_SITE_LABEL': return process.env.NEXT_PUBLIC_BUSINESS_SITE_LABEL
    case 'NEXT_PUBLIC_BUSINESS_SITE_URL': return process.env.NEXT_PUBLIC_BUSINESS_SITE_URL
    case 'NEXT_PUBLIC_CART_FULFILMENT_LABEL': return process.env.NEXT_PUBLIC_CART_FULFILMENT_LABEL
    case 'NEXT_PUBLIC_CART_FULFILMENT_VALUE': return process.env.NEXT_PUBLIC_CART_FULFILMENT_VALUE
    case 'NEXT_PUBLIC_CART_MINI_BRAND_BODY': return process.env.NEXT_PUBLIC_CART_MINI_BRAND_BODY
    case 'NEXT_PUBLIC_CART_MINI_BRAND_PILLS': return process.env.NEXT_PUBLIC_CART_MINI_BRAND_PILLS
    case 'NEXT_PUBLIC_CART_MINI_BRAND_TITLE': return process.env.NEXT_PUBLIC_CART_MINI_BRAND_TITLE
    case 'NEXT_PUBLIC_CART_SHIPPING_LABEL': return process.env.NEXT_PUBLIC_CART_SHIPPING_LABEL
    case 'NEXT_PUBLIC_CART_SUMMARY_NOTE': return process.env.NEXT_PUBLIC_CART_SUMMARY_NOTE
    case 'NEXT_PUBLIC_CHECKOUT_BRAND_CARD_BODY': return process.env.NEXT_PUBLIC_CHECKOUT_BRAND_CARD_BODY
    case 'NEXT_PUBLIC_CHECKOUT_BRAND_CARD_TITLE': return process.env.NEXT_PUBLIC_CHECKOUT_BRAND_CARD_TITLE
    case 'NEXT_PUBLIC_CHECKOUT_HERO_CHECKPOINTS': return process.env.NEXT_PUBLIC_CHECKOUT_HERO_CHECKPOINTS
    case 'NEXT_PUBLIC_CHECKOUT_HERO_DESCRIPTION': return process.env.NEXT_PUBLIC_CHECKOUT_HERO_DESCRIPTION
    case 'NEXT_PUBLIC_CHECKOUT_HERO_TITLE': return process.env.NEXT_PUBLIC_CHECKOUT_HERO_TITLE
    case 'NEXT_PUBLIC_CHECKOUT_TRUST_POINTS': return process.env.NEXT_PUBLIC_CHECKOUT_TRUST_POINTS
    case 'NEXT_PUBLIC_CHOOSE_US_POINTS': return process.env.NEXT_PUBLIC_CHOOSE_US_POINTS
    case 'NEXT_PUBLIC_CONTACT_EMAIL': return process.env.NEXT_PUBLIC_CONTACT_EMAIL
    case 'NEXT_PUBLIC_CONTACT_PHONE': return process.env.NEXT_PUBLIC_CONTACT_PHONE
    case 'NEXT_PUBLIC_COUNTRY_CODE': return process.env.NEXT_PUBLIC_COUNTRY_CODE
    case 'NEXT_PUBLIC_COUNTRY_NAME': return process.env.NEXT_PUBLIC_COUNTRY_NAME
    case 'NEXT_PUBLIC_CURRENCY': return process.env.NEXT_PUBLIC_CURRENCY
    case 'NEXT_PUBLIC_CURRENCY_SYMBOL': return process.env.NEXT_PUBLIC_CURRENCY_SYMBOL
    case 'NEXT_PUBLIC_EMAIL_HEADER_EYEBROW': return process.env.NEXT_PUBLIC_EMAIL_HEADER_EYEBROW
    case 'NEXT_PUBLIC_EMAIL_SUPPORT_REPLY_TEXT': return process.env.NEXT_PUBLIC_EMAIL_SUPPORT_REPLY_TEXT
    case 'NEXT_PUBLIC_EMAIL_TEAM_SIGNATURE_LABEL': return process.env.NEXT_PUBLIC_EMAIL_TEAM_SIGNATURE_LABEL
    case 'NEXT_PUBLIC_EXPORT_CERTIFICATIONS': return process.env.NEXT_PUBLIC_EXPORT_CERTIFICATIONS
    case 'NEXT_PUBLIC_FEATURE_ABANDONED_CART_RECOVERY': return process.env.NEXT_PUBLIC_FEATURE_ABANDONED_CART_RECOVERY
    case 'NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS': return process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS
    case 'NEXT_PUBLIC_FEATURE_AI_CHAT': return process.env.NEXT_PUBLIC_FEATURE_AI_CHAT
    case 'NEXT_PUBLIC_FEATURE_INSTAGRAM_SYNC': return process.env.NEXT_PUBLIC_FEATURE_INSTAGRAM_SYNC
    case 'NEXT_PUBLIC_FEATURE_LOYALTY_POINTS': return process.env.NEXT_PUBLIC_FEATURE_LOYALTY_POINTS
    case 'NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS': return process.env.NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS
    case 'NEXT_PUBLIC_FEATURE_MULTI_CURRENCY': return process.env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY
    case 'NEXT_PUBLIC_FEATURE_MULTI_LANGUAGE': return process.env.NEXT_PUBLIC_FEATURE_MULTI_LANGUAGE
    case 'NEXT_PUBLIC_FEATURE_PRODUCT_REVIEWS': return process.env.NEXT_PUBLIC_FEATURE_PRODUCT_REVIEWS
    case 'NEXT_PUBLIC_FEATURE_SHIPPING_INTEGRATIONS': return process.env.NEXT_PUBLIC_FEATURE_SHIPPING_INTEGRATIONS
    case 'NEXT_PUBLIC_FEATURE_WHATSAPP_BOT': return process.env.NEXT_PUBLIC_FEATURE_WHATSAPP_BOT
    case 'NEXT_PUBLIC_FINAL_CTA_BODY': return process.env.NEXT_PUBLIC_FINAL_CTA_BODY
    case 'NEXT_PUBLIC_FINAL_CTA_HEADING': return process.env.NEXT_PUBLIC_FINAL_CTA_HEADING
    case 'NEXT_PUBLIC_FOOTER_CERTIFICATION_LABELS': return process.env.NEXT_PUBLIC_FOOTER_CERTIFICATION_LABELS
    case 'NEXT_PUBLIC_FOOTER_DESCRIPTION': return process.env.NEXT_PUBLIC_FOOTER_DESCRIPTION
    case 'NEXT_PUBLIC_FOOTER_LEGAL_BYLINE': return process.env.NEXT_PUBLIC_FOOTER_LEGAL_BYLINE
    case 'NEXT_PUBLIC_FOOTER_SECURE_CHECKOUT_NOTE': return process.env.NEXT_PUBLIC_FOOTER_SECURE_CHECKOUT_NOTE
    case 'NEXT_PUBLIC_FOOTER_TAGLINE': return process.env.NEXT_PUBLIC_FOOTER_TAGLINE
    case 'NEXT_PUBLIC_FOOTER_TRUST_BADGES': return process.env.NEXT_PUBLIC_FOOTER_TRUST_BADGES
    case 'NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD': return process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD
    case 'NEXT_PUBLIC_HEADER_MOBILE_FOOTER': return process.env.NEXT_PUBLIC_HEADER_MOBILE_FOOTER
    case 'NEXT_PUBLIC_HEADER_MOBILE_SUBTITLE': return process.env.NEXT_PUBLIC_HEADER_MOBILE_SUBTITLE
    case 'NEXT_PUBLIC_HERO_DESCRIPTION': return process.env.NEXT_PUBLIC_HERO_DESCRIPTION
    case 'NEXT_PUBLIC_HERO_KICKER': return process.env.NEXT_PUBLIC_HERO_KICKER
    case 'NEXT_PUBLIC_HERO_PLACEHOLDER_PRODUCT': return process.env.NEXT_PUBLIC_HERO_PLACEHOLDER_PRODUCT
    case 'NEXT_PUBLIC_HERO_TITLE': return process.env.NEXT_PUBLIC_HERO_TITLE
    case 'NEXT_PUBLIC_HOME_BEST_SELLERS_HEADING': return process.env.NEXT_PUBLIC_HOME_BEST_SELLERS_HEADING
    case 'NEXT_PUBLIC_HOME_CERTIFICATIONS_DESCRIPTION': return process.env.NEXT_PUBLIC_HOME_CERTIFICATIONS_DESCRIPTION
    case 'NEXT_PUBLIC_HOME_CERTIFICATIONS_HEADING': return process.env.NEXT_PUBLIC_HOME_CERTIFICATIONS_HEADING
    case 'NEXT_PUBLIC_HOME_COLLECTIONS_HEADING': return process.env.NEXT_PUBLIC_HOME_COLLECTIONS_HEADING
    case 'NEXT_PUBLIC_HOME_FEATURED_HEADING': return process.env.NEXT_PUBLIC_HOME_FEATURED_HEADING
    case 'NEXT_PUBLIC_HOME_META_DESCRIPTION': return process.env.NEXT_PUBLIC_HOME_META_DESCRIPTION
    case 'NEXT_PUBLIC_HOME_META_TITLE_SUFFIX': return process.env.NEXT_PUBLIC_HOME_META_TITLE_SUFFIX
    case 'NEXT_PUBLIC_HOME_TRUST_BADGES': return process.env.NEXT_PUBLIC_HOME_TRUST_BADGES
    case 'NEXT_PUBLIC_HOME_WHY_CHOOSE_HEADING': return process.env.NEXT_PUBLIC_HOME_WHY_CHOOSE_HEADING
    case 'NEXT_PUBLIC_LEGAL_BUSINESS_DESCRIPTION': return process.env.NEXT_PUBLIC_LEGAL_BUSINESS_DESCRIPTION
    case 'NEXT_PUBLIC_LEGAL_JURISDICTION_COUNTRY': return process.env.NEXT_PUBLIC_LEGAL_JURISDICTION_COUNTRY
    case 'NEXT_PUBLIC_LEGAL_OPERATOR_NAME': return process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME
    case 'NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL': return process.env.NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL
    case 'NEXT_PUBLIC_LEGAL_WEBSITE_LABEL': return process.env.NEXT_PUBLIC_LEGAL_WEBSITE_LABEL
    case 'NEXT_PUBLIC_LOCALE': return process.env.NEXT_PUBLIC_LOCALE
    case 'NEXT_PUBLIC_LOGO_URL': return process.env.NEXT_PUBLIC_LOGO_URL
    case 'NEXT_PUBLIC_MINI_CART_SHIPPING_NOTE': return process.env.NEXT_PUBLIC_MINI_CART_SHIPPING_NOTE
    case 'NEXT_PUBLIC_MINI_CART_TRUST_BADGES': return process.env.NEXT_PUBLIC_MINI_CART_TRUST_BADGES
    case 'NEXT_PUBLIC_NATURAL_CERTIFICATIONS': return process.env.NEXT_PUBLIC_NATURAL_CERTIFICATIONS
    case 'NEXT_PUBLIC_NUMBER_LOCALE': return process.env.NEXT_PUBLIC_NUMBER_LOCALE
    case 'NEXT_PUBLIC_PHONE_COUNTRY_CODE': return process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE
    case 'NEXT_PUBLIC_PHONE_NATIONAL_LENGTH': return process.env.NEXT_PUBLIC_PHONE_NATIONAL_LENGTH
    case 'NEXT_PUBLIC_PHONE_TRUNK_PREFIX': return process.env.NEXT_PUBLIC_PHONE_TRUNK_PREFIX
    case 'NEXT_PUBLIC_PHONE_VALIDATION_MESSAGE': return process.env.NEXT_PUBLIC_PHONE_VALIDATION_MESSAGE
    case 'NEXT_PUBLIC_PHONE_VALIDATION_PATTERN': return process.env.NEXT_PUBLIC_PHONE_VALIDATION_PATTERN
    case 'NEXT_PUBLIC_PRODUCT_DESCRIPTOR': return process.env.NEXT_PUBLIC_PRODUCT_DESCRIPTOR
    case 'NEXT_PUBLIC_PRODUCT_DETAIL_BENEFITS': return process.env.NEXT_PUBLIC_PRODUCT_DETAIL_BENEFITS
    case 'NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_HEADING': return process.env.NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_HEADING
    case 'NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_ITEMS': return process.env.NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_ITEMS
    case 'NEXT_PUBLIC_PRODUCTS_HERO_KICKER': return process.env.NEXT_PUBLIC_PRODUCTS_HERO_KICKER
    case 'NEXT_PUBLIC_PRODUCTS_META_DESCRIPTION': return process.env.NEXT_PUBLIC_PRODUCTS_META_DESCRIPTION
    case 'NEXT_PUBLIC_PRODUCTS_POPULAR_HEADING': return process.env.NEXT_PUBLIC_PRODUCTS_POPULAR_HEADING
    case 'NEXT_PUBLIC_QUALITY_CERTIFICATIONS': return process.env.NEXT_PUBLIC_QUALITY_CERTIFICATIONS
    case 'NEXT_PUBLIC_SHIPPING_COVERAGE_LABEL': return process.env.NEXT_PUBLIC_SHIPPING_COVERAGE_LABEL
    case 'NEXT_PUBLIC_SHIPPING_FLAT_RATE': return process.env.NEXT_PUBLIC_SHIPPING_FLAT_RATE
    case 'NEXT_PUBLIC_SHIPPING_RATE_RULES_JSON': return process.env.NEXT_PUBLIC_SHIPPING_RATE_RULES_JSON
    case 'NEXT_PUBLIC_SITE_URL': return process.env.NEXT_PUBLIC_SITE_URL
    case 'NEXT_PUBLIC_SOCIAL_FACEBOOK_URL': return process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL
    case 'NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL': return process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL
    case 'NEXT_PUBLIC_SOCIAL_LINKEDIN_URL': return process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL
    case 'NEXT_PUBLIC_SOCIAL_X_URL': return process.env.NEXT_PUBLIC_SOCIAL_X_URL
    case 'NEXT_PUBLIC_SOCIAL_YOUTUBE_URL': return process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL
    case 'NEXT_PUBLIC_SUCCESS_DISPATCH_COPY': return process.env.NEXT_PUBLIC_SUCCESS_DISPATCH_COPY
    case 'NEXT_PUBLIC_SUCCESS_LEAD': return process.env.NEXT_PUBLIC_SUCCESS_LEAD
    case 'NEXT_PUBLIC_SUCCESS_PROCESSING_COPY': return process.env.NEXT_PUBLIC_SUCCESS_PROCESSING_COPY
    case 'NEXT_PUBLIC_WHATSAPP_BRAND_COLOR': return process.env.NEXT_PUBLIC_WHATSAPP_BRAND_COLOR
    case 'NEXT_PUBLIC_WHATSAPP_CART_HELP_MESSAGE': return process.env.NEXT_PUBLIC_WHATSAPP_CART_HELP_MESSAGE
    case 'NEXT_PUBLIC_WHATSAPP_CHECKOUT_INTRO_MESSAGE': return process.env.NEXT_PUBLIC_WHATSAPP_CHECKOUT_INTRO_MESSAGE
    case 'NEXT_PUBLIC_WHATSAPP_FLOATING_LABEL': return process.env.NEXT_PUBLIC_WHATSAPP_FLOATING_LABEL
    case 'NEXT_PUBLIC_WHATSAPP_NUMBER': return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    case 'NEXT_PUBLIC_WHATSAPP_ORDER_HELP_MESSAGE': return process.env.NEXT_PUBLIC_WHATSAPP_ORDER_HELP_MESSAGE
    case 'NEXT_PUBLIC_WHATSAPP_PRODUCT_QUESTION_MESSAGE': return process.env.NEXT_PUBLIC_WHATSAPP_PRODUCT_QUESTION_MESSAGE
    default: return undefined
  }
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = publicRuntimeEnv(name) ?? process.env[name]
  if (!value || !value.trim()) return fallback

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false
    default:
      return fallback
  }
}

function envNumber(name: string, fallback: number): number {
  const value = publicRuntimeEnv(name) ?? process.env[name]
  if (!value || !value.trim()) return fallback

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function envList(name: string, fallback: string[]): string[] {
  const value = publicRuntimeEnv(name) ?? process.env[name]
  if (!value || !value.trim()) return fallback

  const parsed = value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : fallback
}

function safeRegex(pattern: string, fallback: RegExp): RegExp {
  try {
    return new RegExp(pattern)
  } catch {
    return fallback
  }
}

const storePreset = getStorePreset()
const themePreset = getStoreThemePreset()
const brandName = env('NEXT_PUBLIC_BRAND_NAME', storePreset.branding.name)
const brandShortName = env('NEXT_PUBLIC_BRAND_SHORT_NAME', storePreset.branding.shortName)
const siteUrl = env('NEXT_PUBLIC_SITE_URL', storePreset.branding.siteUrl)
const businessSiteUrl = env('NEXT_PUBLIC_BUSINESS_SITE_URL', storePreset.branding.businessSiteUrl)
const currency = env('NEXT_PUBLIC_CURRENCY', storePreset.region.currency)
const currencySymbol = env('NEXT_PUBLIC_CURRENCY_SYMBOL', storePreset.region.currencySymbol)
const phoneValidationPattern = env('NEXT_PUBLIC_PHONE_VALIDATION_PATTERN', storePreset.region.phoneValidationPattern)
const marketingDefaults = storePreset.id === 'millco'
  ? millcoMarketingDefaults(brandName, brandShortName)
  : genericMarketingDefaults(brandName, brandShortName)

export type TenantConfig = {
  whatsappBotWelcome: string
  branding: {
    name: string
    shortName: string
    description: string
    logoUrl: string
    siteUrl: string
    businessSiteUrl: string
    businessSiteLabel: string
    businessSiteAriaLabel: string
    themePreset: string
    colors: {
      primary: string
      primaryDark: string
      primaryGradientStart: string
      primaryGradientEnd: string
      accent: string
      background: string
      foreground: string
      surface: string
      whatsApp: string
      adminAccent: string
      adminSidebarGradientStart: string
      adminSidebarGradientEnd: string
    }
  }
  contact: {
    supportEmail: string
    supportPhone: string
    whatsappNumber: string
    address: {
      line1: string
      line2: string
      city: string
      state: string
      postalCode: string
      country: string
      lines: string[]
    }
    socialLinks: {
      instagram: string
      facebook: string
      youtube: string
      x: string
      linkedin: string
    }
  }
  legal: {
    operatorName: string
    websiteLabel: string
    supportEmail: string
    businessDescription: string
    jurisdictionCountry: string
  }
  region: {
    locale: string
    numberLocale: string
    currency: string
    currencySymbol: string
    countryCode: string
    countryName: string
    shippingCoverageLabel: string
    phone: {
      countryCode: string
      nationalNumberLength: number
      trunkPrefix: string
      validationPattern: string
      validationMessage: string
    }
  }
  features: {
    whatsappBot: boolean
    aiChat: boolean
    instagramSync: boolean
    loyaltyPoints: boolean
    abandonedCartRecovery: boolean
    productReviews: boolean
    advancedAnalytics: boolean
    multiLanguage: boolean
    multiCurrency: boolean
    shippingIntegrations: boolean
    manualPayments: boolean
  }
  shipping: {
    provider: string
    autoCreate: boolean
    rateRules: {
      flatRate: number
      freeShippingThreshold: number
      zones: ShippingZoneRateRule[]
    }
    pickupAddress: {
      name: string
      phone: string
      addressLine1: string
      addressLine2?: string
      city: string
      state: string
      pincode: string
      country: string
    }
  }
  marketing: {
    header: {
      mobileSubtitle: string
      mobileFooter: string
    }
    home: {
      metaTitleSuffix: string
      metaDescription: string
      heroKicker: string
      heroTitle: string
      heroDescription: string
      heroPlaceholderProduct: string
      trustRow: string[]
      qualityCertifications: string[]
      naturalCertifications: string[]
      exportCertifications: string[]
      chooseUsPoints: string[]
      featuredHeading: string
      certificationsHeading: string
      certificationsDescription: string
      whyChooseHeading: string
      collectionsHeading: string
      bestSellersHeading: string
      brandStoryHeading: string
      brandStoryBody: string
      finalCtaHeading: string
      finalCtaBody: string
    }
    products: {
      metaDescription: string
      heroKicker: string
      popularHeading: string
    }
    footer: {
      description: string
      tagline: string
      certificationLabels: string[]
      trustBadges: string[]
      businessGatewayEyebrow: string
      businessGatewayBody: string
      businessGatewayCta: string
      legalByline: string
      secureCheckoutNote: string
    }
    cart: {
      shippingLabel: string
      miniBrandTitle: string
      miniBrandBody: string
      miniBrandPills: string[]
      fulfilmentLabel: string
      fulfilmentValue: string
      summaryNote: string
    }
    checkout: {
      trustPoints: string[]
      heroTitle: string
      heroDescription: string
      heroCheckpoints: string[]
      brandCardTitle: string
      brandCardBody: string
    }
    success: {
      lead: string
      processingCopy: string
      dispatchCopy: string
    }
    productDetail: {
      benefits: string[]
      trustHeading: string
      trustItems: string[]
      productDescriptor: string
    }
    addToCart: {
      trustBadges: string[]
    }
    miniCart: {
      shippingNote: string
      trustBadges: string[]
    }
    whatsapp: {
      floatingLabel: string
      productQuestionMessage: string
      cartHelpMessage: string
      checkoutIntroMessage: string
      orderHelpMessage: string
    }
    email: {
      headerEyebrow: string
      supportReplyText: string
      teamSignatureLabel: string
    }
  }
  analytics: {
    eventNamespace: string
  }
}

export const tenantConfig: TenantConfig = {
  whatsappBotWelcome: `${brandName} WhatsApp Store`,
  branding: {
    name: brandName,
    shortName: brandShortName,
    description: env('NEXT_PUBLIC_BRAND_DESCRIPTION', storePreset.branding.description),
    logoUrl: env('NEXT_PUBLIC_LOGO_URL', storePreset.branding.logoUrl),
    siteUrl,
    businessSiteUrl,
    businessSiteLabel: env('NEXT_PUBLIC_BUSINESS_SITE_LABEL', `${brandShortName} Business Site`),
    businessSiteAriaLabel: env('NEXT_PUBLIC_BUSINESS_SITE_ARIA_LABEL', `Open ${brandShortName} business website in a new tab`),
    themePreset: themePreset.id,
    colors: {
      primary: env('NEXT_PUBLIC_BRAND_PRIMARY_COLOR', themePreset.colors.primary),
      primaryDark: env('NEXT_PUBLIC_BRAND_PRIMARY_DARK_COLOR', themePreset.colors.primaryDark),
      primaryGradientStart: env('NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_START', themePreset.colors.primaryGradientStart),
      primaryGradientEnd: env('NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_END', themePreset.colors.primaryGradientEnd),
      accent: env('NEXT_PUBLIC_BRAND_ACCENT_COLOR', themePreset.colors.accent),
      background: env('NEXT_PUBLIC_BRAND_BACKGROUND_COLOR', themePreset.colors.background),
      foreground: env('NEXT_PUBLIC_BRAND_FOREGROUND_COLOR', themePreset.colors.foreground),
      surface: env('NEXT_PUBLIC_BRAND_SURFACE_COLOR', themePreset.colors.surface),
      whatsApp: env('NEXT_PUBLIC_WHATSAPP_BRAND_COLOR', themePreset.colors.whatsApp),
      adminAccent: env('NEXT_PUBLIC_ADMIN_ACCENT_COLOR', themePreset.colors.adminAccent),
      adminSidebarGradientStart: env('NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_START', themePreset.colors.adminSidebarGradientStart),
      adminSidebarGradientEnd: env('NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_END', themePreset.colors.adminSidebarGradientEnd),
    },
  },
  contact: {
    supportEmail: env('NEXT_PUBLIC_CONTACT_EMAIL', storePreset.contact.supportEmail),
    supportPhone: env('NEXT_PUBLIC_CONTACT_PHONE', storePreset.contact.supportPhone),
    whatsappNumber: env('NEXT_PUBLIC_WHATSAPP_NUMBER', ''),
    address: {
      line1: env('NEXT_PUBLIC_ADDRESS_LINE_1', storePreset.contact.addressLine1),
      line2: env('NEXT_PUBLIC_ADDRESS_LINE_2', storePreset.contact.addressLine2),
      city: env('NEXT_PUBLIC_ADDRESS_CITY', storePreset.contact.city),
      state: env('NEXT_PUBLIC_ADDRESS_STATE', storePreset.contact.state),
      postalCode: env('NEXT_PUBLIC_ADDRESS_POSTAL_CODE', storePreset.contact.postalCode),
      country: env('NEXT_PUBLIC_ADDRESS_COUNTRY', storePreset.contact.country),
      lines: [
        env('NEXT_PUBLIC_ADDRESS_LINE_1', storePreset.contact.addressLine1),
        env('NEXT_PUBLIC_ADDRESS_LINE_2', storePreset.contact.addressLine2),
      ].filter(Boolean),
    },
    socialLinks: {
      instagram: env('NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL', storePreset.contact.socialLinks.instagram),
      facebook: env('NEXT_PUBLIC_SOCIAL_FACEBOOK_URL', storePreset.contact.socialLinks.facebook),
      youtube: env('NEXT_PUBLIC_SOCIAL_YOUTUBE_URL', storePreset.contact.socialLinks.youtube),
      x: env('NEXT_PUBLIC_SOCIAL_X_URL', storePreset.contact.socialLinks.x),
      linkedin: env('NEXT_PUBLIC_SOCIAL_LINKEDIN_URL', storePreset.contact.socialLinks.linkedin),
    },
  },
  legal: {
    operatorName: env('NEXT_PUBLIC_LEGAL_OPERATOR_NAME', storePreset.legal.operatorName),
    websiteLabel: env('NEXT_PUBLIC_LEGAL_WEBSITE_LABEL', storePreset.legal.websiteLabel),
    supportEmail: env('NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL', storePreset.legal.supportEmail),
    businessDescription: env('NEXT_PUBLIC_LEGAL_BUSINESS_DESCRIPTION', storePreset.legal.businessDescription),
    jurisdictionCountry: env('NEXT_PUBLIC_LEGAL_JURISDICTION_COUNTRY', storePreset.legal.jurisdictionCountry),
  },
  region: {
    locale: env('NEXT_PUBLIC_LOCALE', storePreset.region.locale),
    numberLocale: env('NEXT_PUBLIC_NUMBER_LOCALE', storePreset.region.numberLocale),
    currency,
    currencySymbol,
    countryCode: env('NEXT_PUBLIC_COUNTRY_CODE', storePreset.region.countryCode),
    countryName: env('NEXT_PUBLIC_COUNTRY_NAME', storePreset.region.countryName),
    shippingCoverageLabel: env('NEXT_PUBLIC_SHIPPING_COVERAGE_LABEL', storePreset.region.shippingCoverageLabel),
    phone: {
      countryCode: env('NEXT_PUBLIC_PHONE_COUNTRY_CODE', storePreset.region.phoneCountryCode),
      nationalNumberLength: envNumber('NEXT_PUBLIC_PHONE_NATIONAL_LENGTH', storePreset.region.phoneNationalNumberLength),
      trunkPrefix: env('NEXT_PUBLIC_PHONE_TRUNK_PREFIX', storePreset.region.phoneTrunkPrefix),
      validationPattern: phoneValidationPattern,
      validationMessage: env('NEXT_PUBLIC_PHONE_VALIDATION_MESSAGE', storePreset.region.phoneValidationMessage),
    },
  },
  features: {
    whatsappBot: envBoolean('NEXT_PUBLIC_FEATURE_WHATSAPP_BOT', false),
    aiChat: envBoolean('NEXT_PUBLIC_FEATURE_AI_CHAT', true),
    instagramSync: envBoolean('NEXT_PUBLIC_FEATURE_INSTAGRAM_SYNC', false),
    loyaltyPoints: envBoolean('NEXT_PUBLIC_FEATURE_LOYALTY_POINTS', false),
    abandonedCartRecovery: envBoolean('NEXT_PUBLIC_FEATURE_ABANDONED_CART_RECOVERY', false),
    productReviews: envBoolean('NEXT_PUBLIC_FEATURE_PRODUCT_REVIEWS', false),
    advancedAnalytics: envBoolean('NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS', false),
    multiLanguage: envBoolean('NEXT_PUBLIC_FEATURE_MULTI_LANGUAGE', false),
    multiCurrency: envBoolean('NEXT_PUBLIC_FEATURE_MULTI_CURRENCY', false),
    shippingIntegrations: envBoolean('NEXT_PUBLIC_FEATURE_SHIPPING_INTEGRATIONS', false),
    manualPayments: envBoolean('NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS', false),
  },
  shipping: {
    provider: env('SHIPPING_PROVIDER', 'manual'),
    autoCreate: envBoolean('SHIPPING_AUTO_CREATE', false),
    rateRules: {
      flatRate: envNumber('NEXT_PUBLIC_SHIPPING_FLAT_RATE', 0),
      freeShippingThreshold: envNumber('NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD', 0),
      zones: parseShippingZones(env('NEXT_PUBLIC_SHIPPING_RATE_RULES_JSON', '')),
    },
    pickupAddress: {
      name: env('SHIPPING_PICKUP_NAME', brandName),
      phone: env('SHIPPING_PICKUP_PHONE', env('NEXT_PUBLIC_WHATSAPP_NUMBER', '')),
      addressLine1: env('SHIPPING_PICKUP_ADDRESS_LINE1', ''),
      addressLine2: env('SHIPPING_PICKUP_ADDRESS_LINE2', ''),
      city: env('SHIPPING_PICKUP_CITY', ''),
      state: env('SHIPPING_PICKUP_STATE', ''),
      pincode: env('SHIPPING_PICKUP_PINCODE', ''),
      country: env('SHIPPING_PICKUP_COUNTRY', storePreset.contact.country),
    },
  },
  marketing: {
    header: {
      mobileSubtitle: env('NEXT_PUBLIC_HEADER_MOBILE_SUBTITLE', marketingDefaults.header.mobileSubtitle),
      mobileFooter: env('NEXT_PUBLIC_HEADER_MOBILE_FOOTER', marketingDefaults.header.mobileFooter),
    },
    home: {
      metaTitleSuffix: env('NEXT_PUBLIC_HOME_META_TITLE_SUFFIX', marketingDefaults.home.metaTitleSuffix),
      metaDescription: env('NEXT_PUBLIC_HOME_META_DESCRIPTION', marketingDefaults.home.metaDescription),
      heroKicker: env('NEXT_PUBLIC_HERO_KICKER', marketingDefaults.home.heroKicker),
      heroTitle: env('NEXT_PUBLIC_HERO_TITLE', marketingDefaults.home.heroTitle),
      heroDescription: env('NEXT_PUBLIC_HERO_DESCRIPTION', marketingDefaults.home.heroDescription),
      heroPlaceholderProduct: env('NEXT_PUBLIC_HERO_PLACEHOLDER_PRODUCT', marketingDefaults.home.heroPlaceholderProduct),
      trustRow: envList('NEXT_PUBLIC_HOME_TRUST_BADGES', marketingDefaults.home.trustRow),
      qualityCertifications: envList('NEXT_PUBLIC_QUALITY_CERTIFICATIONS', marketingDefaults.home.qualityCertifications),
      naturalCertifications: envList('NEXT_PUBLIC_NATURAL_CERTIFICATIONS', marketingDefaults.home.naturalCertifications),
      exportCertifications: envList('NEXT_PUBLIC_EXPORT_CERTIFICATIONS', marketingDefaults.home.exportCertifications),
      chooseUsPoints: envList('NEXT_PUBLIC_CHOOSE_US_POINTS', marketingDefaults.home.chooseUsPoints),
      featuredHeading: env('NEXT_PUBLIC_HOME_FEATURED_HEADING', marketingDefaults.home.featuredHeading),
      certificationsHeading: env('NEXT_PUBLIC_HOME_CERTIFICATIONS_HEADING', marketingDefaults.home.certificationsHeading),
      certificationsDescription: env('NEXT_PUBLIC_HOME_CERTIFICATIONS_DESCRIPTION', marketingDefaults.home.certificationsDescription),
      whyChooseHeading: env('NEXT_PUBLIC_HOME_WHY_CHOOSE_HEADING', marketingDefaults.home.whyChooseHeading),
      collectionsHeading: env('NEXT_PUBLIC_HOME_COLLECTIONS_HEADING', marketingDefaults.home.collectionsHeading),
      bestSellersHeading: env('NEXT_PUBLIC_HOME_BEST_SELLERS_HEADING', marketingDefaults.home.bestSellersHeading),
      brandStoryHeading: env('NEXT_PUBLIC_BRAND_STORY_HEADING', marketingDefaults.home.brandStoryHeading),
      brandStoryBody: env('NEXT_PUBLIC_BRAND_STORY_BODY', marketingDefaults.home.brandStoryBody),
      finalCtaHeading: env('NEXT_PUBLIC_FINAL_CTA_HEADING', marketingDefaults.home.finalCtaHeading),
      finalCtaBody: env('NEXT_PUBLIC_FINAL_CTA_BODY', marketingDefaults.home.finalCtaBody),
    },
    products: {
      metaDescription: env('NEXT_PUBLIC_PRODUCTS_META_DESCRIPTION', marketingDefaults.products.metaDescription),
      heroKicker: env('NEXT_PUBLIC_PRODUCTS_HERO_KICKER', marketingDefaults.products.heroKicker),
      popularHeading: env('NEXT_PUBLIC_PRODUCTS_POPULAR_HEADING', marketingDefaults.products.popularHeading),
    },
    footer: {
      description: env('NEXT_PUBLIC_FOOTER_DESCRIPTION', marketingDefaults.footer.description),
      tagline: env('NEXT_PUBLIC_FOOTER_TAGLINE', marketingDefaults.footer.tagline),
      certificationLabels: envList('NEXT_PUBLIC_FOOTER_CERTIFICATION_LABELS', marketingDefaults.footer.certificationLabels),
      trustBadges: envList('NEXT_PUBLIC_FOOTER_TRUST_BADGES', marketingDefaults.footer.trustBadges),
      businessGatewayEyebrow: env('NEXT_PUBLIC_BUSINESS_GATEWAY_EYEBROW', marketingDefaults.footer.businessGatewayEyebrow),
      businessGatewayBody: env('NEXT_PUBLIC_BUSINESS_GATEWAY_BODY', marketingDefaults.footer.businessGatewayBody),
      businessGatewayCta: env('NEXT_PUBLIC_BUSINESS_GATEWAY_CTA', marketingDefaults.footer.businessGatewayCta),
      legalByline: env('NEXT_PUBLIC_FOOTER_LEGAL_BYLINE', marketingDefaults.footer.legalByline),
      secureCheckoutNote: env('NEXT_PUBLIC_FOOTER_SECURE_CHECKOUT_NOTE', marketingDefaults.footer.secureCheckoutNote),
    },
    cart: {
      shippingLabel: env('NEXT_PUBLIC_CART_SHIPPING_LABEL', marketingDefaults.cart.shippingLabel),
      miniBrandTitle: env('NEXT_PUBLIC_CART_MINI_BRAND_TITLE', marketingDefaults.cart.miniBrandTitle),
      miniBrandBody: env('NEXT_PUBLIC_CART_MINI_BRAND_BODY', marketingDefaults.cart.miniBrandBody),
      miniBrandPills: envList('NEXT_PUBLIC_CART_MINI_BRAND_PILLS', marketingDefaults.cart.miniBrandPills),
      fulfilmentLabel: env('NEXT_PUBLIC_CART_FULFILMENT_LABEL', marketingDefaults.cart.fulfilmentLabel),
      fulfilmentValue: env('NEXT_PUBLIC_CART_FULFILMENT_VALUE', marketingDefaults.cart.fulfilmentValue),
      summaryNote: env('NEXT_PUBLIC_CART_SUMMARY_NOTE', marketingDefaults.cart.summaryNote),
    },
    checkout: {
      trustPoints: envList('NEXT_PUBLIC_CHECKOUT_TRUST_POINTS', marketingDefaults.checkout.trustPoints),
      heroTitle: env('NEXT_PUBLIC_CHECKOUT_HERO_TITLE', marketingDefaults.checkout.heroTitle),
      heroDescription: env('NEXT_PUBLIC_CHECKOUT_HERO_DESCRIPTION', marketingDefaults.checkout.heroDescription),
      heroCheckpoints: envList('NEXT_PUBLIC_CHECKOUT_HERO_CHECKPOINTS', marketingDefaults.checkout.heroCheckpoints),
      brandCardTitle: env('NEXT_PUBLIC_CHECKOUT_BRAND_CARD_TITLE', marketingDefaults.checkout.brandCardTitle),
      brandCardBody: env('NEXT_PUBLIC_CHECKOUT_BRAND_CARD_BODY', marketingDefaults.checkout.brandCardBody),
    },
    success: {
      lead: env('NEXT_PUBLIC_SUCCESS_LEAD', marketingDefaults.success.lead),
      processingCopy: env('NEXT_PUBLIC_SUCCESS_PROCESSING_COPY', marketingDefaults.success.processingCopy),
      dispatchCopy: env('NEXT_PUBLIC_SUCCESS_DISPATCH_COPY', marketingDefaults.success.dispatchCopy),
    },
    productDetail: {
      benefits: envList('NEXT_PUBLIC_PRODUCT_DETAIL_BENEFITS', marketingDefaults.productDetail.benefits),
      trustHeading: env('NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_HEADING', marketingDefaults.productDetail.trustHeading),
      trustItems: envList('NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_ITEMS', marketingDefaults.productDetail.trustItems),
      productDescriptor: env('NEXT_PUBLIC_PRODUCT_DESCRIPTOR', marketingDefaults.productDetail.productDescriptor),
    },
    addToCart: {
      trustBadges: envList('NEXT_PUBLIC_ADD_TO_CART_TRUST_BADGES', marketingDefaults.addToCart.trustBadges),
    },
    miniCart: {
      shippingNote: env('NEXT_PUBLIC_MINI_CART_SHIPPING_NOTE', marketingDefaults.miniCart.shippingNote),
      trustBadges: envList('NEXT_PUBLIC_MINI_CART_TRUST_BADGES', marketingDefaults.miniCart.trustBadges),
    },
    whatsapp: {
      floatingLabel: env('NEXT_PUBLIC_WHATSAPP_FLOATING_LABEL', marketingDefaults.whatsapp.floatingLabel),
      productQuestionMessage: env('NEXT_PUBLIC_WHATSAPP_PRODUCT_QUESTION_MESSAGE', marketingDefaults.whatsapp.productQuestionMessage),
      cartHelpMessage: env('NEXT_PUBLIC_WHATSAPP_CART_HELP_MESSAGE', marketingDefaults.whatsapp.cartHelpMessage),
      checkoutIntroMessage: env('NEXT_PUBLIC_WHATSAPP_CHECKOUT_INTRO_MESSAGE', marketingDefaults.whatsapp.checkoutIntroMessage),
      orderHelpMessage: env('NEXT_PUBLIC_WHATSAPP_ORDER_HELP_MESSAGE', marketingDefaults.whatsapp.orderHelpMessage),
    },
    email: {
      headerEyebrow: env('NEXT_PUBLIC_EMAIL_HEADER_EYEBROW', marketingDefaults.email.headerEyebrow),
      supportReplyText: env('NEXT_PUBLIC_EMAIL_SUPPORT_REPLY_TEXT', marketingDefaults.email.supportReplyText),
      teamSignatureLabel: env('NEXT_PUBLIC_EMAIL_TEAM_SIGNATURE_LABEL', marketingDefaults.email.teamSignatureLabel),
    },
  },
  analytics: {
    eventNamespace: env('NEXT_PUBLIC_ANALYTICS_NAMESPACE', `${brandShortName.toLowerCase()}-analytics`),
  },
}

export function getTenantPhoneValidationRegex(): RegExp {
  return safeRegex(tenantConfig.region.phone.validationPattern, /^[6-9]\d{9}$/)
}

export function isValidTenantPhone(input: string): boolean {
  return getTenantPhoneValidationRegex().test(input.trim())
}

export function normalizeTenantPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''

  const countryCodeDigits = tenantConfig.region.phone.countryCode.replace(/\D/g, '')
  const trunkPrefixDigits = tenantConfig.region.phone.trunkPrefix.replace(/\D/g, '')
  const localLength = tenantConfig.region.phone.nationalNumberLength

  if (digits.startsWith(countryCodeDigits) && digits.length === countryCodeDigits.length + localLength) {
    return `+${digits}`
  }

  if (digits.length === localLength) {
    return `+${countryCodeDigits}${digits}`
  }

  if (trunkPrefixDigits && digits.startsWith(trunkPrefixDigits) && digits.length === trunkPrefixDigits.length + localLength) {
    return `+${countryCodeDigits}${digits.slice(trunkPrefixDigits.length)}`
  }

  return input.startsWith('+') ? input : `+${digits}`
}

export function buildTenantWhatsAppUrl(message: string): string {
  const number = tenantConfig.contact.whatsappNumber.trim()
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function parseShippingZones(value: string): ShippingZoneRateRule[] {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ShippingZoneRateRule => Boolean(item && typeof item === 'object'))
  } catch {
    return []
  }
}


