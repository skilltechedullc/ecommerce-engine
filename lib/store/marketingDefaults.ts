export type StoreMarketingDefaults = {
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

export function genericMarketingDefaults(brandName: string, brandShortName: string): StoreMarketingDefaults {
  return {
    header: {
      mobileSubtitle: 'Quality products for everyday customers',
      mobileFooter: 'Carefully managed catalog, secure checkout, and reliable fulfillment.',
    },
    home: {
      metaTitleSuffix: 'Online Store',
      metaDescription: 'Shop quality products with secure checkout and reliable delivery.',
      heroKicker: 'Online Store',
      heroTitle: 'Shop trusted products online.',
      heroDescription: 'Browse products, add them to cart, and complete checkout through a clean ecommerce experience built for local businesses.',
      heroPlaceholderProduct: 'Featured Product',
      trustRow: ['Secure Checkout', 'Quality Products', 'Reliable Delivery'],
      qualityCertifications: ['Quality Checked'],
      naturalCertifications: ['Customer Friendly'],
      exportCertifications: ['Ready for Online Orders'],
      chooseUsPoints: ['Simple catalog management', 'Secure payment flow', 'Clear order handling', 'Mobile-friendly storefront'],
      featuredHeading: 'Featured products',
      certificationsHeading: 'Built for customer trust',
      certificationsDescription: 'Store details can be configured for each client.',
      whyChooseHeading: 'Why customers choose us',
      collectionsHeading: 'Product Range',
      bestSellersHeading: 'Popular products',
      brandStoryHeading: 'A store built for modern selling',
      brandStoryBody: `${brandName} brings products, checkout, and order management into one clean online store.`,
      finalCtaHeading: 'Start shopping today',
      finalCtaBody: `Explore ${brandShortName} products and complete your order securely.`,
    },
    products: {
      metaDescription: 'Browse our product collection.',
      heroKicker: `${brandShortName} Collection`,
      popularHeading: `Popular products from ${brandShortName}.`,
    },
    footer: {
      description: 'A clean online store with secure checkout and reliable order handling.',
      tagline: 'Online store for modern local businesses.',
      certificationLabels: ['Secure Checkout', 'Quality Products'],
      trustBadges: ['Secure Checkout', 'Encrypted Payments', 'Trusted Delivery'],
      businessGatewayEyebrow: 'Business',
      businessGatewayBody: 'Contact us for store support and business details.',
      businessGatewayCta: `Visit ${brandShortName} Business Site ->`,
      legalByline: `Online Store by ${brandShortName}`,
      secureCheckoutNote: 'Secure checkout powered for safe online orders.',
    },
    cart: {
      shippingLabel: 'Calculated',
      miniBrandTitle: 'Review your cart before checkout.',
      miniBrandBody: 'Confirm quantities, variants, and totals before moving to payment.',
      miniBrandPills: ['Secure checkout', 'Order review', 'Reliable fulfillment'],
      fulfilmentLabel: 'Fulfilment',
      fulfilmentValue: `${brandShortName} dispatch`,
      summaryNote: 'Secure payment and delivery details are handled in the next step.',
    },
    checkout: {
      trustPoints: ['Secure payment', 'Protected checkout flow', 'Reliable dispatch'],
      heroTitle: 'Finish your order securely.',
      heroDescription: 'Share delivery details, review your basket, and complete payment.',
      heroCheckpoints: ['Verified order', 'Protected payment', 'Reliable dispatch'],
      brandCardTitle: 'Why this feels dependable',
      brandCardBody: 'Your details are captured for fulfilment, communication, and secure payment confirmation.',
    },
    success: {
      lead: 'Your payment is successful and your order is now in our system.',
      processingCopy: 'We verify your order and start processing it soon.',
      dispatchCopy: 'Delivery updates are shared once fulfillment is ready.',
    },
    productDetail: {
      benefits: ['Quality product', 'Clear pricing', 'Reliable fulfillment'],
      trustHeading: 'Why customers trust this product',
      trustItems: ['Secure checkout', 'Clear product details', 'Reliable order handling'],
      productDescriptor: 'product',
    },
    addToCart: {
      trustBadges: ['Secure Checkout', 'Quality Product', 'Reliable Delivery'],
    },
    miniCart: {
      shippingNote: 'Delivery details are confirmed during checkout.',
      trustBadges: ['Secure checkout', 'Order review', 'Verified products'],
    },
    whatsapp: {
      floatingLabel: 'Order via WhatsApp',
      productQuestionMessage: 'I have a question about your products.',
      cartHelpMessage: 'I need help with my cart.',
      checkoutIntroMessage: "Hi, I'd like to place an order:",
      orderHelpMessage: 'Hi, I need help with my recent order.',
    },
    email: {
      headerEyebrow: 'Online Store',
      supportReplyText: 'For support, reply to this email.',
      teamSignatureLabel: 'Team',
    },
  }
}

export function millcoMarketingDefaults(brandName: string, brandShortName: string): StoreMarketingDefaults {
  return {
    header: {
      mobileSubtitle: 'Natural and certified foods',
      mobileFooter: 'Carefully sourced staples, traditional processing, and secure checkout.',
    },
    home: {
      metaTitleSuffix: 'Retail Store for Natural Foods',
      metaDescription: 'Shop sulphur-free coconut oil, sesame oil, honey, and natural foods for everyday home use. Trusted quality, clean processing, and fast delivery across India.',
      heroKicker: 'Clean Natural Foods for Everyday Homes',
      heroTitle: 'Zero Sulphur. Zero Compromise.',
      heroDescription: 'Discover sulphur-free coconut oil, cold-pressed sesame oil, natural honey, and wholesome pantry staples made with clean processing and strict quality checks. Crafted in Kerala, made for modern kitchens and health-conscious families.',
      heroPlaceholderProduct: 'Sulphur-Free Coconut Oil',
      trustRow: ['ISO Certified', 'FSSAI Licensed', '100% Natural'],
      qualityCertifications: ['ISO 22000:2018 Certified', 'HACCP Certified', 'GMP Certified'],
      naturalCertifications: ['Organic Certified', 'Halal Certified'],
      exportCertifications: ['FSSAI Licensed', 'APEDA Registered', 'Coconut RCMC - CDB', 'Spices RCMC - Spices Board', 'Export License Holder'],
      chooseUsPoints: ['Zero Sulphur Policy for cleaner cooking oils', 'Direct coconut sourcing for better freshness and traceability', 'No chemical solvents or artificial additives', 'Certified quality systems and batch-level checks', 'Everyday products curated for family wellness', 'Simple checkout and reliable delivery experience'],
      featuredHeading: 'Clean oils and natural essentials for daily use',
      certificationsHeading: 'Certified Quality You Can Trust',
      certificationsDescription: 'Maintaining international food safety and quality standards.',
      whyChooseHeading: 'Built for families who read every label',
      collectionsHeading: 'Product Range',
      bestSellersHeading: 'Most-loved natural products',
      brandStoryHeading: 'Traditional roots. Modern quality confidence.',
      brandStoryBody: `${brandName} was founded to preserve traditional food preparation with uncompromising quality discipline. Every batch follows heritage-inspired methods, strict quality checks, and clean processing practices designed for everyday family wellbeing.`,
      finalCtaHeading: 'Bring home clean, trusted natural products',
      finalCtaBody: `Shop ${brandShortName} essentials for better cooking, better nutrition, and everyday confidence.`,
    },
    products: {
      metaDescription: 'Browse our certified natural collection from Kerala.',
      heroKicker: `${brandShortName} Collection`,
      popularHeading: `Fast-moving favourites from the ${brandShortName} collection.`,
    },
    footer: {
      description: 'Clean, sulphur-free oils and natural foods crafted with strict quality checks. Made in Kerala and delivered for everyday home use with trusted consistency.',
      tagline: 'Retail-first online store for healthy cooking and natural living.',
      certificationLabels: ['ISO 22000:2018', 'HACCP Certified', 'FSSAI Licensed', 'APEDA Registered'],
      trustBadges: ['Secure Checkout', 'Encrypted Payments', 'Trusted Delivery'],
      businessGatewayEyebrow: 'Business & Bulk',
      businessGatewayBody: 'Explore our manufacturing capabilities, export solutions, and wholesale pricing.',
      businessGatewayCta: `Visit ${brandShortName} Business Site ->`,
      legalByline: `Sulphur-Free Oils | Natural Foods | Retail Store by ${brandShortName}`,
      secureCheckoutNote: 'Secure checkout powered for safe online orders.',
    },
    cart: {
      shippingLabel: 'Free',
      miniBrandTitle: 'Certified ingredients. Clean processing. Honest staples.',
      miniBrandBody: 'Your basket is part of a slower, more intentional food journey built around purity, consistency, and everyday trust.',
      miniBrandPills: ['No rush packing', 'Fresh dispatch', 'Secure checkout'],
      fulfilmentLabel: 'Fulfilment',
      fulfilmentValue: `${brandShortName} dispatch`,
      summaryNote: 'Secure payment, delivery details on the next step, and the same product integrity you saw on every collection page.',
    },
    checkout: {
      trustPoints: ['Secure payment via Razorpay', 'SSL-protected checkout flow', 'Fast dispatch for fresh staples', 'Pan-India delivery coverage'],
      heroTitle: 'Finish your order with a clean, trusted payment flow.',
      heroDescription: 'Share your delivery details, review the basket, and complete payment securely.',
      heroCheckpoints: ['Verified sourcing', 'Protected payment', 'Reliable dispatch'],
      brandCardTitle: 'Why this feels dependable',
      brandCardBody: 'Your details are captured only for fulfilment, communication, and secure payment confirmation.',
    },
    success: {
      lead: 'Your payment is successful and your order is now in our system. Order details have been sent to your email and can also be shared via WhatsApp support if needed.',
      processingCopy: 'We verify your order and start packing within 2 to 6 business hours.',
      dispatchCopy: 'Most orders are dispatched in about 24 hours. Exact delivery ETA is shared once tracking is generated.',
    },
    productDetail: {
      benefits: ['Natural ingredients', 'Traditional processing', 'Certified quality checks'],
      trustHeading: 'Why customers trust this product',
      trustItems: ['FSSAI Certified Quality', 'Natural and chemical-free sourcing', 'Traditional processing methods', 'Export-grade quality controls'],
      productDescriptor: 'natural food product',
    },
    addToCart: {
      trustBadges: ['FSSAI Certified Quality', 'Natural & Sulphur-Free', 'Export Grade Standard', 'Ships in 2-3 Business Days'],
    },
    miniCart: {
      shippingNote: 'Packed within 2 to 6 business hours. Most orders dispatch in about 24 hours. Exact delivery ETA is shared once tracking is generated.',
      trustBadges: ['Secure checkout', 'Fresh dispatch', 'Verified products'],
    },
    whatsapp: {
      floatingLabel: 'Order via WhatsApp',
      productQuestionMessage: 'I have a question about your products.',
      cartHelpMessage: 'I need help with my cart.',
      checkoutIntroMessage: "Hi, I'd like to place an order:",
      orderHelpMessage: 'Hi, I need help with my recent order.',
    },
    email: {
      headerEyebrow: 'Certified Natural - Kerala Origin',
      supportReplyText: 'For support, reply to this email.',
      teamSignatureLabel: 'Team',
    },
  }
}
