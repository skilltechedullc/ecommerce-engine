import { requireAdminPermission } from '@/lib/adminAuth'
import ProviderHealthPanel from './ProviderHealthPanel'
import LaunchProgressChecklist from './LaunchProgressChecklist'
import ClientLaunchWizard from './ClientLaunchWizard'

const launchSteps = [
  ['Store identity', 'Enter store name, owner details, business category, logo, colors, and contact information.'],
  ['Deployment target', 'Choose Vercel, Railway, VPS/server, or manual deployment.'],
  ['Supabase', 'Connect project URL, anon key, service role key, migrations, storage, policies, and RLS checks.'],
  ['Payments', 'Connect Razorpay credentials, configure webhook secret, and run payment health checks.'],
  ['Email', 'Connect Resend credentials, sender email, admin notification email, and send a test email.'],
  ['WhatsApp', 'Configure WhatsApp number and optional automation provider credentials when purchased.'],
  ['Shipping', 'Choose manual shipping first, then configure pickup address and optional provider integration.'],
  ['Admin handover', 'Create admin credentials, import or seed products, run launch checks, and generate handover notes.'],
] as const

export default async function LaunchPage() {
  await requireAdminPermission('settings:update')
  return (
    <div className="admin-stack">
      <section className="admin-surface admin-pageLead">
        <div>
          <p className="admin-sectionEyebrow">Client-Owned Launch</p>
          <h2 className="admin-sectionTitle">Create new client store</h2>
          <p className="admin-sectionText">
            Build a client-owned store setup pack for grocery, fashion, bakery, wellness, electronics, or any other niche.
          </p>
        </div>
        <a href="/admin/settings" className="admin-button admin-button--secondary">
          Review Settings
        </a>
      </section>

      <ClientLaunchWizard />

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Reference</p>
        <h2 className="admin-sectionTitle">Launch steps</h2>
        <div className="admin-listStack" style={{ marginTop: '14px' }}>
          {launchSteps.map(([title, body], index) => (
            <div key={title} className="admin-listRow" style={{ alignItems: 'flex-start' }}>
              <span className="admin-badge admin-badge--info">Step {index + 1}</span>
              <div style={{ flex: 1 }}>
                <p className="admin-summaryRow__value">{title}</p>
                <p className="admin-sectionText" style={{ margin: '4px 0 0' }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Automation</p>
        <h2 className="admin-sectionTitle">Current local commands</h2>
        <div className="admin-listStack" style={{ marginTop: '12px' }}>
          <CommandRow command={'npm.cmd run client:setup -- "Client Store Name"'} description="Generate env template and handover notes." />
          <CommandRow command="npm.cmd run supabase:plan" description="Print migration rollout plan." />
          <CommandRow command="npm.cmd run readiness -- path/to/.env" description="Validate launch env fields." />
        </div>
      </section>

      <LaunchProgressChecklist steps={launchSteps.map(([title]) => title)} />

      <ProviderHealthPanel />
    </div>
  )
}

function CommandRow({ command, description }: { command: string; description: string }) {
  return (
    <div className="admin-listRow" style={{ alignItems: 'flex-start' }}>
      <span className="admin-orderCode">{command}</span>
      <p className="admin-sectionText" style={{ margin: 0 }}>{description}</p>
    </div>
  )
}
