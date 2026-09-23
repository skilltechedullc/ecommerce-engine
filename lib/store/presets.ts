export type StorePreset = {
  id: string
  branding: {
    name: string
    shortName: string
    description: string
    logoUrl: string
    siteUrl: string
    businessSiteUrl: string
  }
  contact: {
    supportEmail: string
    supportPhone: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    postalCode: string
    country: string
    socialLinks: {
      instagram: string
      facebook: string
      youtube: string
      x: string
      linkedin: string
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
    phoneCountryCode: string
    phoneNationalNumberLength: number
    phoneTrunkPrefix: string
    phoneValidationPattern: string
    phoneValidationMessage: string
  }
  legal: {
    operatorName: string
    websiteLabel: string
    supportEmail: string
    businessDescription: string
    jurisdictionCountry: string
  }
}

const genericPreset: StorePreset = {
  id: 'generic',
  branding: {
    name: 'Client Store',
    shortName: 'Store',
    description: 'Online store.',
    logoUrl: '/logo.svg',
    siteUrl: 'http://localhost:3000',
    businessSiteUrl: 'http://localhost:3000',
  },
  contact: {
    supportEmail: 'support@example.com',
    supportPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    socialLinks: {
      instagram: '',
      facebook: '',
      youtube: '',
      x: '',
      linkedin: '',
    },
  },
  region: {
    locale: 'en_IN',
    numberLocale: 'en-IN',
    currency: 'INR',
    currencySymbol: 'Rs.',
    countryCode: 'IN',
    countryName: 'India',
    shippingCoverageLabel: 'Configured delivery areas',
    phoneCountryCode: '+91',
    phoneNationalNumberLength: 10,
    phoneTrunkPrefix: '0',
    phoneValidationPattern: '^[6-9]\\d{9}$',
    phoneValidationMessage: 'Enter a valid mobile number',
  },
  legal: {
    operatorName: 'Client Store',
    websiteLabel: 'this website',
    supportEmail: 'support@example.com',
    businessDescription: 'the sale of products to customers in configured delivery areas',
    jurisdictionCountry: 'India',
  },
}

const millcoPreset: StorePreset = {
  id: 'millco',
  branding: {
    name: 'Millco Organic & Fresh Food Products',
    shortName: 'Millco',
    description: 'Millco Organic & Fresh Food Products online store.',
    logoUrl: '/millco-logo.svg',
    siteUrl: 'https://millco.in',
    businessSiteUrl: 'https://millco.in',
  },
  contact: {
    supportEmail: 'info@millco.in',
    supportPhone: '+91 9048984814',
    addressLine1: 'Thennala, Malappuram',
    addressLine2: 'Kerala 676508, India',
    city: 'Malappuram',
    state: 'Kerala',
    postalCode: '676508',
    country: 'India',
    socialLinks: {
      instagram: '',
      facebook: '',
      youtube: '',
      x: '',
      linkedin: '',
    },
  },
  region: {
    locale: 'en_IN',
    numberLocale: 'en-IN',
    currency: 'INR',
    currencySymbol: 'Rs.',
    countryCode: 'IN',
    countryName: 'India',
    shippingCoverageLabel: 'Across India',
    phoneCountryCode: '+91',
    phoneNationalNumberLength: 10,
    phoneTrunkPrefix: '0',
    phoneValidationPattern: '^[6-9]\\d{9}$',
    phoneValidationMessage: 'Enter a valid 10-digit Indian mobile number',
  },
  legal: {
    operatorName: 'Millco Organic & Fresh Food Products',
    websiteLabel: 'shop.millco.in',
    supportEmail: 'info@millco.in',
    businessDescription: 'the sale of food and related products to customers in India and selected international destinations',
    jurisdictionCountry: 'India',
  },
}

export const STORE_PRESETS = {
  generic: genericPreset,
  millco: millcoPreset,
} as const

export type StorePresetId = keyof typeof STORE_PRESETS

export function getStorePreset(id = process.env.NEXT_PUBLIC_STORE_PRESET): StorePreset {
  if (id && id in STORE_PRESETS) {
    return STORE_PRESETS[id as StorePresetId]
  }

  return genericPreset
}
