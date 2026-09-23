import { requireAdminPermission } from '@/lib/adminAuth'
import NotificationTemplateEditor from './NotificationTemplateEditor'

const starterTemplates = [
  {
    template_key: 'order_placed_email',
    channel: 'email',
    subject: 'Order confirmation',
    body: 'Hi {{customer_name}}, your order {{order_id}} has been received.',
    variables: ['customer_name', 'order_id'],
    is_active: true,
  },
  {
    template_key: 'order_status_whatsapp',
    channel: 'whatsapp',
    subject: '',
    body: 'Order {{order_id}} status updated to {{status}}.',
    variables: ['order_id', 'status'],
    is_active: true,
  },
]

export default async function NotificationTemplatesPage() {
  await requireAdminPermission('settings:update')
  return (
    <div className="admin-stack">
      <section className="admin-surface admin-pageLead">
        <div>
          <p className="admin-sectionEyebrow">Notifications</p>
          <h2 className="admin-sectionTitle">Template editor</h2>
          <p className="admin-sectionText">
            Draft reusable email and WhatsApp copy for order confirmations, status updates, and future automations.
          </p>
        </div>
        <a href="/admin/settings" className="admin-button admin-button--secondary">
          Back to Settings
        </a>
      </section>

      <NotificationTemplateEditor starterTemplates={starterTemplates} />
    </div>
  )
}
