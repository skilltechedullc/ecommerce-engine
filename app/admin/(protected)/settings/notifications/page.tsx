import Link from 'next/link'
import { requireAdminPermission } from '@/lib/adminAuth'
import { tenantConfig } from '@/lib/tenant.config'

export default async function NotificationSettingsPage() {
  await requireAdminPermission('settings:read')
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS)
  const whatsappReady = process.env.WHATSAPP_ENABLED === 'true' && tenantConfig.features.whatsappBot
  const events = [
    ['Order confirmed','WHATSAPP_TEMPLATE_ORDER_CONFIRMED',true],
    ['Processing','WHATSAPP_TEMPLATE_ORDER_PROCESSING',process.env.SEND_PROCESSING_NOTIFICATIONS === 'true'],
    ['Shipped','WHATSAPP_TEMPLATE_ORDER_SHIPPED',true],
    ['Delivered','WHATSAPP_TEMPLATE_ORDER_DELIVERED',true],
  ] as const
  return <div className="admin-stack"><section className="admin-surface"><Link href="/admin/settings" className="admin-backLink">← Store settings</Link><h2 className="admin-sectionTitle">Customer notifications</h2><p className="admin-sectionText">Messages follow order updates. Check delivery results and retry failed messages from an individual order.</p><dl className="admin-configList" style={{marginTop:20}}><div><dt>Sender email</dt><dd>{process.env.EMAIL_FROM_ADDRESS || 'Not configured'}</dd></div><div><dt>Store order alerts</dt><dd>{process.env.ADMIN_EMAIL || 'Not configured'}</dd></div></dl></section><section className="admin-surface admin-tableCard"><div className="admin-tableWrap"><table className="admin-table"><thead><tr><th>Order event</th><th>Email</th><th>WhatsApp</th></tr></thead><tbody>{events.map(([name,key,enabled])=><tr key={key}><td>{name}</td><td>{!enabled ? 'Off' : emailReady ? 'Configured' : 'Not configured'}</td><td>{!enabled ? 'Off' : whatsappReady && process.env[key] ? 'Configured — check delivery on orders' : 'Awaiting Meta setup / approved template'}</td></tr>)}</tbody></table></div><p className="admin-sectionText">Email wording is managed with the site. WhatsApp templates must be approved in Meta before use. Configuration does not guarantee delivery; inspect the order notification history.</p></section></div>
}