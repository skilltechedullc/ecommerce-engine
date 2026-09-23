import { requireAdminPermission } from '@/lib/adminAuth'
import { tenantConfig } from '@/lib/tenant.config'
import SettingsDraftEditor from './SettingsDraftEditor'

type SettingsRow = readonly [string, string, string]
type FeatureFlagRow = readonly [string, boolean]

const identityFields: SettingsRow[] = [
  ['Store name', tenantConfig.branding.name, 'NEXT_PUBLIC_BRAND_NAME'],
  ['Short name', tenantConfig.branding.shortName, 'NEXT_PUBLIC_BRAND_SHORT_NAME'],
  ['Theme preset', tenantConfig.branding.themePreset, 'NEXT_PUBLIC_THEME_PRESET'],
  ['Site URL', tenantConfig.branding.siteUrl, 'NEXT_PUBLIC_SITE_URL'],
  ['Logo URL', tenantConfig.branding.logoUrl, 'NEXT_PUBLIC_LOGO_URL'],
]

const contactFields: SettingsRow[] = [
  ['Support email', tenantConfig.contact.supportEmail, 'NEXT_PUBLIC_CONTACT_EMAIL'],
  ['Support phone', tenantConfig.contact.supportPhone || 'Not configured', 'NEXT_PUBLIC_CONTACT_PHONE'],
  ['WhatsApp number', tenantConfig.contact.whatsappNumber || 'Not configured', 'NEXT_PUBLIC_WHATSAPP_NUMBER'],
  ['Address', tenantConfig.contact.address.lines.join(', ') || 'Not configured', 'NEXT_PUBLIC_ADDRESS_*'],
]

const businessFields: SettingsRow[] = [
  ['Currency', `${tenantConfig.region.currency} (${tenantConfig.region.currencySymbol})`, 'NEXT_PUBLIC_CURRENCY'],
  ['Locale', tenantConfig.region.numberLocale, 'NEXT_PUBLIC_NUMBER_LOCALE'],
  ['Country', tenantConfig.region.countryName, 'NEXT_PUBLIC_COUNTRY_NAME'],
  ['Shipping coverage', tenantConfig.region.shippingCoverageLabel, 'NEXT_PUBLIC_SHIPPING_COVERAGE_LABEL'],
]

const legalFields: SettingsRow[] = [
  ['Operator', tenantConfig.legal.operatorName, 'NEXT_PUBLIC_LEGAL_OPERATOR_NAME'],
  ['Website label', tenantConfig.legal.websiteLabel, 'NEXT_PUBLIC_LEGAL_WEBSITE_LABEL'],
  ['Legal email', tenantConfig.legal.supportEmail, 'NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL'],
  ['Jurisdiction', tenantConfig.legal.jurisdictionCountry, 'NEXT_PUBLIC_LEGAL_JURISDICTION_COUNTRY'],
]

const featureFlags: FeatureFlagRow[] = [
  ['WhatsApp automation', tenantConfig.features.whatsappBot],
  ['AI chat', tenantConfig.features.aiChat],
  ['Product reviews', tenantConfig.features.productReviews],
  ['Loyalty points', tenantConfig.features.loyaltyPoints],
  ['Advanced analytics', tenantConfig.features.advancedAnalytics],
  ['Multi-language', tenantConfig.features.multiLanguage],
  ['Multi-currency', tenantConfig.features.multiCurrency],
  ['Shipping integrations', tenantConfig.features.shippingIntegrations],
]

export default async function AdminSettingsPage() {
  await requireAdminPermission('settings:read')
  const activeDraft = {
    branding: tenantConfig.branding,
    contact: tenantConfig.contact,
    legal: tenantConfig.legal,
    region: tenantConfig.region,
    features: tenantConfig.features,
    shipping: tenantConfig.shipping,
  }

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-pageLead">
        <div>
          <p className="admin-sectionEyebrow">Configuration</p>
          <h2 className="admin-sectionTitle">Store settings</h2>
          <p className="admin-sectionText">
            Review the active configuration that drives storefront branding, legal pages, checkout, and paid modules.
          </p>
        </div>
      </section>

      <div className="admin-detailGrid">
        <SettingsCard title="Identity" rows={identityFields} />
        <SettingsCard title="Contact" rows={contactFields} />
        <SettingsCard title="Business" rows={businessFields} />
        <SettingsCard title="Legal" rows={legalFields} />
      </div>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Packages</p>
        <h2 className="admin-sectionTitle">Paid module flags</h2>
        <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
          {featureFlags.map(([label, enabled]) => (
            <div key={label} className="admin-listRow">
              <span className="admin-summaryRow__value">{label}</span>
              <span className={`admin-badge ${enabled ? 'admin-badge--success' : 'admin-badge--neutral'}`}>
                {enabled ? 'Enabled' : 'Off'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Runtime Note</p>
        <h2 className="admin-sectionTitle">Drafts are saved before runtime rollout</h2>
        <p className="admin-sectionText">
          Drafts and published snapshots are stored in `store_settings` with audit logging. The storefront still reads
          env/preset config until the runtime config loader is switched to published database settings.
        </p>
        <a href="/admin/settings/notifications" className="admin-button admin-button--secondary" style={{ marginTop: '14px' }}>
          Edit Notification Templates
        </a>
      </section>

      <SettingsDraftEditor initialDraft={activeDraft} />
    </div>
  )
}

function SettingsCard({
  title,
  rows,
}: {
  title: string
  rows: SettingsRow[]
}) {
  return (
    <section className="admin-surface">
      <p className="admin-sectionEyebrow">{title}</p>
      <div className="admin-listStack" style={{ marginTop: '12px' }}>
        {rows.map(([label, value, envName]) => (
          <div key={label} className="admin-listRow" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="admin-summaryRow__label">{label}</p>
              <p className="admin-summaryRow__value" style={{ marginTop: '4px', wordBreak: 'break-word' }}>{value}</p>
            </div>
            <span className="admin-orderCode">{envName}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
