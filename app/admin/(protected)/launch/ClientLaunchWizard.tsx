'use client'

import { useMemo, useState } from 'react'

type WizardState = {
  storeName: string
  niche: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  domain: string
  deploymentTarget: string
  packageTier: string
  themePreset: string
  primaryColor: string
  accentColor: string
  currency: string
  currencySymbol: string
  locale: string
  countryCode: string
  countryName: string
  contactEmail: string
  contactPhone: string
  whatsappNumber: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  starterCategories: string
  launchNotes: string
  addons: Record<string, boolean>
  providers: {
    supabase: string
    payment: string
    email: string
    whatsapp: string
    shipping: string
  }
}

const storageKey = 'ecommerce-engine-client-launch-wizard'

const defaultState: WizardState = {
  storeName: '',
  niche: 'Grocery and daily essentials',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  domain: '',
  deploymentTarget: 'Vercel',
  packageTier: 'Business Store',
  themePreset: 'natural',
  primaryColor: '#0F3D2E',
  accentColor: '#C8A951',
  currency: 'INR',
  currencySymbol: 'Rs.',
  locale: 'en-IN',
  countryCode: 'IN',
  countryName: 'India',
  contactEmail: '',
  contactPhone: '',
  whatsappNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  starterCategories: 'Fresh produce, Grocery staples, Spices and masalas, Oils, Snacks, Household essentials',
  launchNotes: '',
  addons: {
    whatsappStore: true,
    aiAssistant: false,
    reviews: false,
    loyalty: false,
    analytics: true,
    multiLanguage: false,
    multiCurrency: false,
    shippingIntegrations: false,
  },
  providers: {
    supabase: 'Client-owned Supabase',
    payment: 'razorpay',
    email: 'resend',
    whatsapp: 'Manual WhatsApp link',
    shipping: 'manual',
  },
}

const steps = ['Identity', 'Package', 'Providers', 'Handover'] as const

const niches = [
  'Grocery and daily essentials',
  'Fashion boutique',
  'Bakery and cafe',
  'Organic food brand',
  'Electronics accessories',
  'Home decor',
  'Beauty and cosmetics',
  'Pharmacy and wellness',
]

const addons = [
  ['whatsappStore', 'WhatsApp store'],
  ['aiAssistant', 'AI assistant'],
  ['reviews', 'Reviews'],
  ['loyalty', 'Loyalty/referral'],
  ['analytics', 'Advanced analytics'],
  ['multiLanguage', 'Multi-language'],
  ['multiCurrency', 'Multi-currency'],
  ['shippingIntegrations', 'Shipping integration'],
] as const

function loadInitialState(): WizardState {
  if (typeof window === 'undefined') return defaultState
  try {
    const saved = window.localStorage.getItem(storageKey)
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState
  } catch {
    return defaultState
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client-store'
}

export default function ClientLaunchWizard() {
  const [activeStep, setActiveStep] = useState(0)
  const [state, setState] = useState<WizardState>(loadInitialState)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ clientDir: string; files: string[]; downloads: Array<{ name: string; content: string }>; nextSteps: string[] } | null>(null)

  const slug = useMemo(() => slugify(state.storeName), [state.storeName])
  const completion = useMemo(() => {
    const required = [state.storeName, state.niche, state.ownerName, state.ownerEmail, state.domain, state.packageTier]
    return Math.round((required.filter(Boolean).length / required.length) * 100)
  }, [state])

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => {
      const next = { ...current, [key]: value }
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  function updateProvider(key: keyof WizardState['providers'], value: string) {
    setState((current) => {
      const next = { ...current, providers: { ...current.providers, [key]: value } }
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  function updateAddon(key: string, value: boolean) {
    setState((current) => {
      const next = { ...current, addons: { ...current.addons, [key]: value } }
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  async function createStore() {
    setCreating(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/admin/launch/client-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create client setup')
      setResult(data.data ?? data)
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Unable to create client setup')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="admin-surface">
      <div className="admin-formSection__header">
        <div>
          <p className="admin-sectionEyebrow">Build Wizard</p>
          <h2 className="admin-sectionTitle">Create a store for any niche</h2>
          <p className="admin-sectionText">
            Capture the client brief, package, add-ons, providers, and handover details, then generate a client-owned launch pack.
          </p>
        </div>
        <span className="admin-badge admin-badge--success">{completion}% ready</span>
      </div>

      <div className="admin-rowActions" style={{ marginBottom: '18px' }}>
        {steps.map((step, index) => (
          <button
            key={step}
            type="button"
            className={`admin-button ${activeStep === index ? 'admin-button--primary' : 'admin-button--secondary'} admin-button--small`}
            onClick={() => setActiveStep(index)}
          >
            {index + 1}. {step}
          </button>
        ))}
      </div>

      {activeStep === 0 ? (
        <div className="admin-formGrid">
          <Field label="Store name" value={state.storeName} onChange={(value) => update('storeName', value)} placeholder="Fresh Basket UAE" />
          <Select label="Niche" value={state.niche} options={niches} onChange={(value) => update('niche', value)} />
          <Field label="Domain" value={state.domain} onChange={(value) => update('domain', value)} placeholder={`${slug}.com`} />
          <Field label="Owner name" value={state.ownerName} onChange={(value) => update('ownerName', value)} placeholder="Client owner" />
          <Field label="Owner email" value={state.ownerEmail} onChange={(value) => update('ownerEmail', value)} placeholder="owner@example.com" />
          <Field label="Owner phone" value={state.ownerPhone} onChange={(value) => update('ownerPhone', value)} placeholder="+971..." />
        </div>
      ) : null}

      {activeStep === 1 ? (
        <div className="admin-stack">
          <div className="admin-formGrid">
            <Select label="Package" value={state.packageTier} options={['Basic Store', 'Business Store', 'Premium Store']} onChange={(value) => update('packageTier', value)} />
            <Select label="Theme preset" value={state.themePreset} options={['natural', 'minimal', 'premium', 'grocery', 'boutique']} onChange={(value) => update('themePreset', value)} />
            <Select label="Deployment" value={state.deploymentTarget} options={['Vercel', 'Railway', 'VPS/server', 'Manual deployment']} onChange={(value) => update('deploymentTarget', value)} />
            <Field label="Currency" value={state.currency} onChange={(value) => update('currency', value)} placeholder="INR" />
            <Field label="Currency symbol" value={state.currencySymbol} onChange={(value) => update('currencySymbol', value)} placeholder="Rs." />
            <Field label="Locale" value={state.locale} onChange={(value) => update('locale', value)} placeholder="en-IN" />
          </div>
          <div className="admin-listStack">
            {addons.map(([key, label]) => (
              <label key={key} className="admin-listRow" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={Boolean(state.addons[key])} onChange={(event) => updateAddon(key, event.target.checked)} />
                <span className="admin-summaryRow__value">{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {activeStep === 2 ? (
        <div className="admin-formGrid">
          <Select label="Supabase" value={state.providers.supabase} options={['Client-owned Supabase', 'Our staging Supabase', 'Manual later']} onChange={(value) => updateProvider('supabase', value)} />
          <Select label="Payment" value={state.providers.payment} options={['razorpay', 'stripe', 'manual', 'later']} onChange={(value) => updateProvider('payment', value)} />
          <Select label="Email" value={state.providers.email} options={['resend', 'smtp', 'later']} onChange={(value) => updateProvider('email', value)} />
          <Select label="WhatsApp" value={state.providers.whatsapp} options={['Manual WhatsApp link', 'Meta Cloud API', 'Twilio', 'later']} onChange={(value) => updateProvider('whatsapp', value)} />
          <Select label="Shipping" value={state.providers.shipping} options={['manual', 'shiprocket', 'delhivery', 'custom', 'later']} onChange={(value) => updateProvider('shipping', value)} />
          <Field label="Country" value={state.countryName} onChange={(value) => update('countryName', value)} placeholder="India" />
        </div>
      ) : null}

      {activeStep === 3 ? (
        <div className="admin-stack">
          <div className="admin-formGrid">
            <Field label="Contact email" value={state.contactEmail} onChange={(value) => update('contactEmail', value)} placeholder={state.ownerEmail} />
            <Field label="Contact phone" value={state.contactPhone} onChange={(value) => update('contactPhone', value)} placeholder={state.ownerPhone} />
            <Field label="WhatsApp number" value={state.whatsappNumber} onChange={(value) => update('whatsappNumber', value)} placeholder="Country code + number" />
            <Field label="City" value={state.city} onChange={(value) => update('city', value)} placeholder="Dubai / Kochi" />
            <Field label="State" value={state.state} onChange={(value) => update('state', value)} placeholder="Dubai / Kerala" />
            <Field label="Postal code" value={state.postalCode} onChange={(value) => update('postalCode', value)} placeholder="PIN / postal code" />
          </div>
          <TextArea label="Starter categories" value={state.starterCategories} onChange={(value) => update('starterCategories', value)} />
          <TextArea label="Launch notes" value={state.launchNotes} onChange={(value) => update('launchNotes', value)} />
          <div className="admin-listRow" style={{ alignItems: 'flex-start' }}>
            <span className="admin-badge admin-badge--info">Preview</span>
            <div>
              <p className="admin-summaryRow__value">{state.storeName || 'Client Store'} / {state.niche}</p>
              <p className="admin-sectionText" style={{ margin: '4px 0 0' }}>
                Will generate `clients/{slug}` with `.env.template`, `handover-notes.md`, and `launch-wizard.json`.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-rowActions" style={{ marginTop: '20px' }}>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => setActiveStep(Math.max(0, activeStep - 1))}>
          Back
        </button>
        {activeStep < steps.length - 1 ? (
          <button type="button" className="admin-button admin-button--primary" onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}>
            Next
          </button>
        ) : (
          <button type="button" className="admin-button admin-button--primary" onClick={createStore} disabled={creating || !state.storeName}>
            {creating ? 'Creating...' : 'Create Client Store Pack'}
          </button>
        )}
      </div>

      {error ? <p className="admin-inlineMessage admin-inlineMessage--error" style={{ marginTop: '14px' }}>{error}</p> : null}
      {result ? (
        <div className="admin-inlineMessage admin-inlineMessage--success" style={{ marginTop: '14px' }}>
          <strong>Setup files ready to download</strong>
                      <p>These files include generated admin credentials. Store them privately.</p>
            {result.downloads.map((file) => <button type="button" className="admin-button admin-button--secondary" key={file.name} onClick={() => {
              const url = URL.createObjectURL(new Blob([file.content], { type: 'text/plain;charset=utf-8' }))
              const link = document.createElement('a')
              link.href = url
              link.download = file.name
              link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}>Download {file.name}</button>)}
          <p style={{ margin: '6px 0 0' }}>{result.nextSteps[0]}</p>
        </div>
      ) : null}
    </section>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="admin-inputShell">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="admin-inputShell">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="admin-inputShell">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
