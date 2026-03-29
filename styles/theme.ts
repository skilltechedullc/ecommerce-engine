import type { CSSProperties } from 'react'
import { tenantConfig } from '@/lib/tenant.config'

// ── Brand Colours ──────────────────────────────────────────────
export const colors = {
  primary:       tenantConfig.branding.colors.primary,
  primaryHover:  tenantConfig.branding.colors.primaryGradientEnd,
  accent:        tenantConfig.branding.colors.accent,
  accentLight:   '#F5EAC5',
  bg:            tenantConfig.branding.colors.background,
  surface:       tenantConfig.branding.colors.surface,
  surfaceAlt:    '#F3EEE6',
  greenLight:    '#EBF4EE',
  greenBorder:   '#B8D8C8',
  text:          tenantConfig.branding.colors.foreground,
  textMuted:     '#6B6B6B',
  textLight:     '#9A9A9A',
  border:        '#EDE8DF',
  borderLight:   '#F5F1EB',
  error:         '#C0392B',
  errorBg:       '#FFF5F5',
} as const

// ── Spacing (8px base scale) ───────────────────────────────────
export const sp = {
  1: '8px',
  2: '16px',
  3: '24px',
  4: '32px',
  5: '48px',
  6: '64px',
  7: '96px',
  8: '128px',
} as const

// ── Border Radius ──────────────────────────────────────────────
export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '16px',
  xl:   '24px',
  full: '9999px',
} as const

// ── Shadows ────────────────────────────────────────────────────
export const shadow = {
  sm: '0 1px 4px rgba(27,67,50,0.06)',
  md: '0 4px 20px rgba(27,67,50,0.08)',
  lg: '0 16px 48px rgba(27,67,50,0.12)',
} as const

// ── Layout ─────────────────────────────────────────────────────
export const MAX_WIDTH = '1200px'

// ── Typography ─────────────────────────────────────────────────
export const fontDisplay = 'var(--font-playfair), Georgia, "Times New Roman", serif'
export const fontBody    = 'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

// ── Reusable Button Styles ─────────────────────────────────────
export const btnPrimary: CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '8px',
  backgroundColor: tenantConfig.branding.colors.primary,
  color:          '#FFFFFF',
  border:         'none',
  borderRadius:   '10px',
  padding:        '15px 36px',
  fontSize:       '15px',
  fontWeight:     '600',
  letterSpacing:  '0.3px',
  cursor:         'pointer',
  textDecoration: 'none',
  transition:     'background 0.2s ease',
}

export const btnOutline: CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '8px',
  backgroundColor: 'transparent',
  color:          '#1B4332',
  border:         '1.5px solid #1B4332',
  borderRadius:   '10px',
  padding:        '15px 36px',
  fontSize:       '15px',
  fontWeight:     '600',
  letterSpacing:  '0.3px',
  cursor:         'pointer',
  textDecoration: 'none',
  transition:     'all 0.2s ease',
}

export const btnAccent: CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '8px',
  backgroundColor: tenantConfig.branding.colors.accent,
  color:          '#FFFFFF',
  border:         'none',
  borderRadius:   '10px',
  padding:        '15px 36px',
  fontSize:       '15px',
  fontWeight:     '600',
  letterSpacing:  '0.3px',
  cursor:         'pointer',
  textDecoration: 'none',
  transition:     'background 0.2s ease',
}

// ── Form Styles ────────────────────────────────────────────────
export const inputStyle: CSSProperties = {
  width:           '100%',
  padding:         '13px 16px',
  fontSize:        '14px',
  border:          '1.5px solid #EDE8DF',
  borderRadius:    '10px',
  outline:         'none',
  backgroundColor: '#FFFFFF',
  color:           '#1C1C1C',
  boxSizing:       'border-box',
  transition:      'border-color 0.15s',
  fontFamily:      'inherit',
}

export const labelStyle: CSSProperties = {
  display:       'block',
  fontSize:      '11px',
  fontWeight:    '600',
  color:         '#6B6B6B',
  marginBottom:  '6px',
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
}

// ── Section Container ──────────────────────────────────────────
export const container: CSSProperties = {
  maxWidth: MAX_WIDTH,
  margin:   '0 auto',
  padding:  '0 40px',
}
