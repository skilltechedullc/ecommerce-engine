export type StoreThemePreset = {
  id: string
  label: string
  description: string
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

export const STORE_THEME_PRESETS = {
  natural: {
    id: 'natural',
    label: 'Natural',
    description: 'Warm grocery and organic-store styling with earthy greens and a muted gold accent.',
    colors: {
      primary: '#0F3D2E',
      primaryDark: '#0C2B21',
      primaryGradientStart: '#0F3D2E',
      primaryGradientEnd: '#15875F',
      accent: '#C8A951',
      background: '#F7F5F0',
      foreground: '#1E1E1E',
      surface: '#FFFFFF',
      whatsApp: '#25D366',
      adminAccent: '#0F766E',
      adminSidebarGradientStart: '#0F3D2E',
      adminSidebarGradientEnd: '#0C2B21',
    },
  },
  market: {
    id: 'market',
    label: 'Market',
    description: 'Clean, bright layout for supermarkets, grocery stores, and daily essentials.',
    colors: {
      primary: '#1E5B4B',
      primaryDark: '#123C34',
      primaryGradientStart: '#1E5B4B',
      primaryGradientEnd: '#2F8F6B',
      accent: '#E0A82E',
      background: '#FAFAF7',
      foreground: '#17211D',
      surface: '#FFFFFF',
      whatsApp: '#25D366',
      adminAccent: '#1E5B4B',
      adminSidebarGradientStart: '#173D35',
      adminSidebarGradientEnd: '#0C2D27',
    },
  },
  fastCommerce: {
    id: 'fastCommerce',
    label: 'Fast Commerce',
    description: 'Product-first theme preset for groceries, supermarkets, and quick-buy catalogs.',
    colors: {
      primary: '#14532D',
      primaryDark: '#0B3420',
      primaryGradientStart: '#14532D',
      primaryGradientEnd: '#2F855A',
      accent: '#F2B705',
      background: '#F6F8F5',
      foreground: '#17211B',
      surface: '#FFFFFF',
      whatsApp: '#25D366',
      adminAccent: '#2563EB',
      adminSidebarGradientStart: '#143A2A',
      adminSidebarGradientEnd: '#10251E',
    },
  },
  boutique: {
    id: 'boutique',
    label: 'Boutique',
    description: 'Polished neutral palette for lifestyle, fashion, gifting, and premium catalogs.',
    colors: {
      primary: '#2E4057',
      primaryDark: '#1E2B3C',
      primaryGradientStart: '#2E4057',
      primaryGradientEnd: '#52677F',
      accent: '#C98B5F',
      background: '#F8F7F4',
      foreground: '#1F2933',
      surface: '#FFFFFF',
      whatsApp: '#25D366',
      adminAccent: '#2E4057',
      adminSidebarGradientStart: '#243447',
      adminSidebarGradientEnd: '#182332',
    },
  },
} as const satisfies Record<string, StoreThemePreset>

export type StoreThemePresetId = keyof typeof STORE_THEME_PRESETS

export function getStoreThemePreset(id = process.env.NEXT_PUBLIC_THEME_PRESET): StoreThemePreset {
  if (id && id in STORE_THEME_PRESETS) {
    return STORE_THEME_PRESETS[id as StoreThemePresetId]
  }

  return STORE_THEME_PRESETS.natural
}
