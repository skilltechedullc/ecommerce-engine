function env(name: string, fallback: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) return fallback
  return value.trim()
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]
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
  const value = process.env[name]
  if (!value || !value.trim()) return fallback

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function envList(name: string, fallback: string[]): string[] {
  const value = process.env[name]
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

const brandName = env('NEXT_PUBLIC_BRAND_NAME', 'Millco Organic & Fresh Food Products')
const brandShortName = env('NEXT_PUBLIC_BRAND_SHORT_NAME', 'Millco')
const siteUrl = env('NEXT_PUBLIC_SITE_URL', 'https://millco.in')
const businessSiteUrl = env('NEXT_PUBLIC_BUSINESS_SITE_URL', 'https://millco.in')
const currency = env('NEXT_PUBLIC_CURRENCY', 'INR')
const currencySymbol = env('NEXT_PUBLIC_CURRENCY_SYMBOL', '₹')
const phoneValidationPattern = env('NEXT_PUBLIC_PHONE_VALIDATION_PATTERN', '^[6-9]\\d{9}$')

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
    description: env('NEXT_PUBLIC_BRAND_DESCRIPTION', `${brandName} online store.`),
    logoUrl: env('NEXT_PUBLIC_LOGO_URL', '/millco-logo.svg'),
    siteUrl,
    businessSiteUrl,
    businessSiteLabel: env('NEXT_PUBLIC_BUSINESS_SITE_LABEL', `${brandShortName} Business Site`),
    businessSiteAriaLabel: env('NEXT_PUBLIC_BUSINESS_SITE_ARIA_LABEL', `Open ${brandShortName} business website in a new tab`),
    colors: {
      primary: env('NEXT_PUBLIC_BRAND_PRIMARY_COLOR', '#0F3D2E'),
      primaryDark: env('NEXT_PUBLIC_BRAND_PRIMARY_DARK_COLOR', '#0C2B21'),
      primaryGradientStart: env('NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_START', '#0F3D2E'),
      primaryGradientEnd: env('NEXT_PUBLIC_BRAND_PRIMARY_GRADIENT_END', '#15875F'),
      accent: env('NEXT_PUBLIC_BRAND_ACCENT_COLOR', '#C8A951'),
      background: env('NEXT_PUBLIC_BRAND_BACKGROUND_COLOR', '#F7F5F0'),
      foreground: env('NEXT_PUBLIC_BRAND_FOREGROUND_COLOR', '#1E1E1E'),
      surface: env('NEXT_PUBLIC_BRAND_SURFACE_COLOR', '#FFFFFF'),
      whatsApp: env('NEXT_PUBLIC_WHATSAPP_BRAND_COLOR', '#25D366'),
      adminAccent: env('NEXT_PUBLIC_ADMIN_ACCENT_COLOR', '#0F766E'),
      adminSidebarGradientStart: env('NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_START', '#0F3D2E'),
      adminSidebarGradientEnd: env('NEXT_PUBLIC_ADMIN_SIDEBAR_GRADIENT_END', '#0C2B21'),
    },
  },
  contact: {
    supportEmail: env('NEXT_PUBLIC_CONTACT_EMAIL', 'info@millco.in'),
    supportPhone: env('NEXT_PUBLIC_CONTACT_PHONE', '+91 9048984814'),
    whatsappNumber: env('NEXT_PUBLIC_WHATSAPP_NUMBER', ''),
    address: {
      line1: env('NEXT_PUBLIC_ADDRESS_LINE_1', 'Thennala, Malappuram'),
      line2: env('NEXT_PUBLIC_ADDRESS_LINE_2', 'Kerala 676508, India'),
      city: env('NEXT_PUBLIC_ADDRESS_CITY', 'Malappuram'),
      state: env('NEXT_PUBLIC_ADDRESS_STATE', 'Kerala'),
      postalCode: env('NEXT_PUBLIC_ADDRESS_POSTAL_CODE', '676508'),
      country: env('NEXT_PUBLIC_ADDRESS_COUNTRY', 'India'),
      lines: [
        env('NEXT_PUBLIC_ADDRESS_LINE_1', 'Thennala, Malappuram'),
        env('NEXT_PUBLIC_ADDRESS_LINE_2', 'Kerala 676508, India'),
      ].filter(Boolean),
    },
  },
  region: {
    locale: env('NEXT_PUBLIC_LOCALE', 'en_IN'),
    numberLocale: env('NEXT_PUBLIC_NUMBER_LOCALE', 'en-IN'),
    currency,
    currencySymbol,
    countryCode: env('NEXT_PUBLIC_COUNTRY_CODE', 'IN'),
    countryName: env('NEXT_PUBLIC_COUNTRY_NAME', 'India'),
    shippingCoverageLabel: env('NEXT_PUBLIC_SHIPPING_COVERAGE_LABEL', 'Across India'),
    phone: {
      countryCode: env('NEXT_PUBLIC_PHONE_COUNTRY_CODE', '+91'),
      nationalNumberLength: envNumber('NEXT_PUBLIC_PHONE_NATIONAL_LENGTH', 10),
      trunkPrefix: env('NEXT_PUBLIC_PHONE_TRUNK_PREFIX', '0'),
      validationPattern: phoneValidationPattern,
      validationMessage: env('NEXT_PUBLIC_PHONE_VALIDATION_MESSAGE', 'Enter a valid 10-digit Indian mobile number'),
    },
  },
  features: {
    whatsappBot: envBoolean('NEXT_PUBLIC_FEATURE_WHATSAPP_BOT', false),
    aiChat: envBoolean('NEXT_PUBLIC_FEATURE_AI_CHAT', false),
    instagramSync: envBoolean('NEXT_PUBLIC_FEATURE_INSTAGRAM_SYNC', false),
    loyaltyPoints: envBoolean('NEXT_PUBLIC_FEATURE_LOYALTY_POINTS', false),
    abandonedCartRecovery: envBoolean('NEXT_PUBLIC_FEATURE_ABANDONED_CART_RECOVERY', false),
  },
  marketing: {
    header: {
      mobileSubtitle: env('NEXT_PUBLIC_HEADER_MOBILE_SUBTITLE', 'Natural and certified foods'),
      mobileFooter: env('NEXT_PUBLIC_HEADER_MOBILE_FOOTER', 'Carefully sourced staples, traditional processing, and secure checkout.'),
    },
    home: {
      metaTitleSuffix: env('NEXT_PUBLIC_HOME_META_TITLE_SUFFIX', 'Retail Store for Natural Foods'),
      metaDescription: env('NEXT_PUBLIC_HOME_META_DESCRIPTION', 'Shop sulphur-free coconut oil, sesame oil, honey, and natural foods for everyday home use. Trusted quality, clean processing, and fast delivery across India.'),
      heroKicker: env('NEXT_PUBLIC_HERO_KICKER', 'Clean Natural Foods for Everyday Homes'),
      heroTitle: env('NEXT_PUBLIC_HERO_TITLE', 'Zero Sulphur. Zero Compromise.'),
      heroDescription: env('NEXT_PUBLIC_HERO_DESCRIPTION', 'Discover sulphur-free coconut oil, cold-pressed sesame oil, natural honey, and wholesome pantry staples made with clean processing and strict quality checks. Crafted in Kerala, made for modern kitchens and health-conscious families.'),
      heroPlaceholderProduct: env('NEXT_PUBLIC_HERO_PLACEHOLDER_PRODUCT', 'Sulphur-Free Coconut Oil'),
      trustRow: envList('NEXT_PUBLIC_HOME_TRUST_BADGES', ['ISO Certified', 'FSSAI Licensed', '100% Natural']),
      qualityCertifications: envList('NEXT_PUBLIC_QUALITY_CERTIFICATIONS', ['ISO 22000:2018 Certified', 'HACCP Certified', 'GMP Certified']),
      naturalCertifications: envList('NEXT_PUBLIC_NATURAL_CERTIFICATIONS', ['Organic Certified', 'Halal Certified']),
      exportCertifications: envList('NEXT_PUBLIC_EXPORT_CERTIFICATIONS', ['FSSAI Licensed', 'APEDA Registered', 'Coconut RCMC - CDB', 'Spices RCMC - Spices Board', 'Export License Holder']),
      chooseUsPoints: envList('NEXT_PUBLIC_CHOOSE_US_POINTS', ['Zero Sulphur Policy for cleaner cooking oils', 'Direct coconut sourcing for better freshness and traceability', 'No chemical solvents or artificial additives', 'Certified quality systems and batch-level checks', 'Everyday products curated for family wellness', 'Simple checkout and reliable delivery experience']),
      featuredHeading: env('NEXT_PUBLIC_HOME_FEATURED_HEADING', 'Clean oils and natural essentials for daily use'),
      certificationsHeading: env('NEXT_PUBLIC_HOME_CERTIFICATIONS_HEADING', 'Certified Quality You Can Trust'),
      certificationsDescription: env('NEXT_PUBLIC_HOME_CERTIFICATIONS_DESCRIPTION', 'Maintaining international food safety and quality standards.'),
      whyChooseHeading: env('NEXT_PUBLIC_HOME_WHY_CHOOSE_HEADING', 'Built for families who read every label'),
      collectionsHeading: env('NEXT_PUBLIC_HOME_COLLECTIONS_HEADING', 'Product Range'),
      bestSellersHeading: env('NEXT_PUBLIC_HOME_BEST_SELLERS_HEADING', 'Most-loved natural products'),
      brandStoryHeading: env('NEXT_PUBLIC_BRAND_STORY_HEADING', 'Traditional roots. Modern quality confidence.'),
      brandStoryBody: env('NEXT_PUBLIC_BRAND_STORY_BODY', `${brandName} was founded to preserve traditional food preparation with uncompromising quality discipline. Every batch follows heritage-inspired methods, strict quality checks, and clean processing practices designed for everyday family wellbeing.`),
      finalCtaHeading: env('NEXT_PUBLIC_FINAL_CTA_HEADING', 'Bring home clean, trusted natural products'),
      finalCtaBody: env('NEXT_PUBLIC_FINAL_CTA_BODY', `Shop ${brandShortName} essentials for better cooking, better nutrition, and everyday confidence.`),
    },
    products: {
      metaDescription: env('NEXT_PUBLIC_PRODUCTS_META_DESCRIPTION', 'Browse our certified natural collection from Kerala.'),
      heroKicker: env('NEXT_PUBLIC_PRODUCTS_HERO_KICKER', `${brandShortName} Collection`),
      popularHeading: env('NEXT_PUBLIC_PRODUCTS_POPULAR_HEADING', `Fast-moving favourites from the ${brandShortName} collection.`),
    },
    footer: {
      description: env('NEXT_PUBLIC_FOOTER_DESCRIPTION', 'Clean, sulphur-free oils and natural foods crafted with strict quality checks. Made in Kerala and delivered for everyday home use with trusted consistency.'),
      tagline: env('NEXT_PUBLIC_FOOTER_TAGLINE', 'Retail-first online store for healthy cooking and natural living.'),
      certificationLabels: envList('NEXT_PUBLIC_FOOTER_CERTIFICATION_LABELS', ['ISO 22000:2018', 'HACCP Certified', 'FSSAI Licensed', 'APEDA Registered']),
      trustBadges: envList('NEXT_PUBLIC_FOOTER_TRUST_BADGES', ['Secure Checkout', 'Encrypted Payments', 'Trusted Delivery']),
      businessGatewayEyebrow: env('NEXT_PUBLIC_BUSINESS_GATEWAY_EYEBROW', 'Business & Bulk'),
      businessGatewayBody: env('NEXT_PUBLIC_BUSINESS_GATEWAY_BODY', 'Explore our manufacturing capabilities, export solutions, and wholesale pricing.'),
      businessGatewayCta: env('NEXT_PUBLIC_BUSINESS_GATEWAY_CTA', `Visit ${brandShortName} Business Site ->`),
      legalByline: env('NEXT_PUBLIC_FOOTER_LEGAL_BYLINE', `Sulphur-Free Oils | Natural Foods | Retail Store by ${brandShortName}`),
      secureCheckoutNote: env('NEXT_PUBLIC_FOOTER_SECURE_CHECKOUT_NOTE', 'Secure checkout powered for safe online orders.'),
    },
    cart: {
      shippingLabel: env('NEXT_PUBLIC_CART_SHIPPING_LABEL', 'Free'),
      miniBrandTitle: env('NEXT_PUBLIC_CART_MINI_BRAND_TITLE', 'Certified ingredients. Clean processing. Honest staples.'),
      miniBrandBody: env('NEXT_PUBLIC_CART_MINI_BRAND_BODY', 'Your basket is part of a slower, more intentional food journey built around purity, consistency, and everyday trust.'),
      miniBrandPills: envList('NEXT_PUBLIC_CART_MINI_BRAND_PILLS', ['No rush packing', 'Fresh dispatch', 'Secure checkout']),
      fulfilmentLabel: env('NEXT_PUBLIC_CART_FULFILMENT_LABEL', 'Fulfilment'),
      fulfilmentValue: env('NEXT_PUBLIC_CART_FULFILMENT_VALUE', `${brandShortName} dispatch`),
      summaryNote: env('NEXT_PUBLIC_CART_SUMMARY_NOTE', 'Secure payment, delivery details on the next step, and the same product integrity you saw on every collection page.'),
    },
    checkout: {
      trustPoints: envList('NEXT_PUBLIC_CHECKOUT_TRUST_POINTS', ['Secure payment via Razorpay', 'SSL-protected checkout flow', 'Fast dispatch for fresh staples', 'Pan-India delivery coverage']),
      heroTitle: env('NEXT_PUBLIC_CHECKOUT_HERO_TITLE', 'Finish your order with a clean, trusted payment flow.'),
      heroDescription: env('NEXT_PUBLIC_CHECKOUT_HERO_DESCRIPTION', 'Share your delivery details, review the basket, and complete payment securely.'),
      heroCheckpoints: envList('NEXT_PUBLIC_CHECKOUT_HERO_CHECKPOINTS', ['Verified sourcing', 'Protected payment', 'Reliable dispatch']),
      brandCardTitle: env('NEXT_PUBLIC_CHECKOUT_BRAND_CARD_TITLE', 'Why this feels dependable'),
      brandCardBody: env('NEXT_PUBLIC_CHECKOUT_BRAND_CARD_BODY', 'Your details are captured only for fulfilment, communication, and secure payment confirmation.'),
    },
    success: {
      lead: env('NEXT_PUBLIC_SUCCESS_LEAD', 'Your payment is successful and your order is now in our system. Order details have been sent to your email and can also be shared via WhatsApp support if needed.'),
      processingCopy: env('NEXT_PUBLIC_SUCCESS_PROCESSING_COPY', 'We verify your order and start packing within 2 to 6 business hours.'),
      dispatchCopy: env('NEXT_PUBLIC_SUCCESS_DISPATCH_COPY', 'Most orders are dispatched in about 24 hours. Exact delivery ETA is shared once tracking is generated.'),
    },
    productDetail: {
      benefits: envList('NEXT_PUBLIC_PRODUCT_DETAIL_BENEFITS', ['Natural ingredients', 'Traditional processing', 'Certified quality checks']),
      trustHeading: env('NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_HEADING', 'Why customers trust this product'),
      trustItems: envList('NEXT_PUBLIC_PRODUCT_DETAIL_TRUST_ITEMS', ['FSSAI Certified Quality', 'Natural and chemical-free sourcing', 'Traditional processing methods', 'Export-grade quality controls']),
      productDescriptor: env('NEXT_PUBLIC_PRODUCT_DESCRIPTOR', 'natural food product'),
    },
    addToCart: {
      trustBadges: envList('NEXT_PUBLIC_ADD_TO_CART_TRUST_BADGES', ['FSSAI Certified Quality', 'Natural & Sulphur-Free', 'Export Grade Standard', 'Ships in 2–3 Business Days']),
    },
    miniCart: {
      shippingNote: env('NEXT_PUBLIC_MINI_CART_SHIPPING_NOTE', 'Packed within 2 to 6 business hours. Most orders dispatch in about 24 hours. Exact delivery ETA is shared once tracking is generated.'),
      trustBadges: envList('NEXT_PUBLIC_MINI_CART_TRUST_BADGES', ['Secure checkout', 'Fresh dispatch', 'Verified products']),
    },
    whatsapp: {
      floatingLabel: env('NEXT_PUBLIC_WHATSAPP_FLOATING_LABEL', 'Order via WhatsApp'),
      productQuestionMessage: env('NEXT_PUBLIC_WHATSAPP_PRODUCT_QUESTION_MESSAGE', 'I have a question about your products.'),
      cartHelpMessage: env('NEXT_PUBLIC_WHATSAPP_CART_HELP_MESSAGE', 'I need help with my cart.'),
      checkoutIntroMessage: env('NEXT_PUBLIC_WHATSAPP_CHECKOUT_INTRO_MESSAGE', `Hi, I'd like to place an order:`),
      orderHelpMessage: env('NEXT_PUBLIC_WHATSAPP_ORDER_HELP_MESSAGE', 'Hi, I need help with my recent order.'),
    },
    email: {
      headerEyebrow: env('NEXT_PUBLIC_EMAIL_HEADER_EYEBROW', 'Certified Natural · Kerala Origin'),
      supportReplyText: env('NEXT_PUBLIC_EMAIL_SUPPORT_REPLY_TEXT', 'For support, reply to this email.'),
      teamSignatureLabel: env('NEXT_PUBLIC_EMAIL_TEAM_SIGNATURE_LABEL', 'Team'),
    },
  },
  analytics: {
    eventNamespace: env('NEXT_PUBLIC_ANALYTICS_NAMESPACE', 'millco-analytics'),
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