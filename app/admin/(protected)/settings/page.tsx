import Link from 'next/link'
import { requireAdminPermission } from '@/lib/adminAuth'
import { tenantConfig as store } from '@/lib/tenant.config'
import { moneyWithSymbol } from '@/lib/money'

export default async function AdminSettingsPage() {
  await requireAdminPermission('settings:read')
  const testPayments = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')
  const whatsappReady = process.env.WHATSAPP_ENABLED === 'true' && store.features.whatsappBot
  const groups: Array<{title:string; rows:Array<[string,string]>}> = [
    {title:'Store details',rows:[['Store name',store.branding.name],['Website',store.branding.siteUrl],['Business name',store.legal.operatorName],['Currency',store.region.currency]]},
    {title:'Contact',rows:[['Email',store.contact.supportEmail],['Phone',store.contact.supportPhone || 'Not set'],['WhatsApp',store.contact.whatsappNumber || 'Not set'],['Address',store.contact.address.lines.join(', ') || 'Not set']]},
    {title:'Payments and delivery',rows:[['Online payments',testPayments ? 'Test mode — no real charges' : 'Live mode'],['Cash on delivery',store.features.manualPayments ? 'Enabled' : 'Disabled'],['Delivery area',store.region.shippingCoverageLabel],['Shipping fee',moneyWithSymbol(store.shipping.rateRules.flatRate)],['Free delivery',store.shipping.rateRules.freeShippingThreshold > 0 ? 'From ' + moneyWithSymbol(store.shipping.rateRules.freeShippingThreshold) : 'No minimum configured']]},
    {title:'Customer support',rows:[['WhatsApp chat button',store.contact.whatsappNumber ? 'Available' : 'Not configured'],['Website AI assistant',store.features.aiChat && process.env.ANTHROPIC_API_KEY ? 'Enabled' : 'Disabled'],['WhatsApp automatic replies',whatsappReady ? 'Enabled' : 'Awaiting Meta setup'],['Admin access',process.env.ADMIN_AUTH_MODE === 'database' ? 'Individual staff accounts' : 'Single administrator password']]},
  ]
  return <div className="admin-stack"><section className="admin-surface"><h2 className="admin-sectionTitle">Your store settings</h2><p className="admin-sectionText">These are the settings currently used by the shop. Contact your store manager to change branding, delivery charges or connected services. Products, prices and stock can be edited in Products.</p></section><div className="admin-detailGrid">{groups.map(group=><section key={group.title} className="admin-surface"><h2 className="admin-sectionTitle">{group.title}</h2><dl className="admin-configList" style={{marginTop:20}}>{group.rows.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></section>)}</div><section className="admin-surface"><h2 className="admin-sectionTitle">Order messages</h2><p className="admin-sectionText">Check which customer messages are enabled and where order alerts are sent.</p><Link href="/admin/settings/notifications" className="admin-button admin-button--secondary" style={{marginTop:16}}>View notification settings</Link></section></div>
}