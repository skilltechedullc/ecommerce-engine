import { escapeEmailText } from '@/lib/emailHtml'
import { Resend } from 'resend'
import { storeConfig } from '@/lib/config'
import { tenantConfig } from '@/lib/tenant.config'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('Email provider is not configured')
  return new Resend(key)
}
const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? 'orders@example.com'
const fromDisplay = `${storeConfig.brandName} <${fromAddress}>`

export interface EmailOrderItem {
  name: string
  weight?: string
  quantity: number
  price: number
}

export interface EmailOrder {
  id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  customer_address?: string
  total_amount: number
  razorpay_payment_id?: string
  created_at?: string
}

export type OrderStatusEmailType = 'processing' | 'shipped' | 'delivered'

// ─── Shared HTML helpers ────────────────────────────────────────────────────

function itemsTable(items: EmailOrderItem[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;color:#111827;font-size:14px;">
          ${escapeEmailText(item.name)}${item.weight ? `<br><span style="font-size:12px;color:#6B7280;">${escapeEmailText(item.weight)}</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;text-align:center;color:#6B7280;font-size:14px;">
          ${item.quantity}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;text-align:right;color:#6B7280;font-size:14px;">
          ${storeConfig.currencySymbol}${item.price.toLocaleString(tenantConfig.region.numberLocale)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600;color:#111827;font-size:14px;">
          ${storeConfig.currencySymbol}${(item.price * item.quantity).toLocaleString(tenantConfig.region.numberLocale)}
        </td>
      </tr>`
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-top:24px;">
      <thead>
        <tr style="background:#F9FAFB;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;">Product</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;">Unit</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#F9FAFB;">
          <td colspan="3" style="padding:12px;text-align:right;font-size:14px;font-weight:600;color:#374151;">Order Total</td>
          <td style="padding:12px;text-align:right;font-size:18px;font-weight:700;color:#1B4332;">
            ${storeConfig.currencySymbol}${items.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString(tenantConfig.region.numberLocale)}
          </td>
        </tr>
      </tfoot>
    </table>`
}

function baseLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#1B4332;border-radius:10px 10px 0 0;padding:28px 36px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">${storeConfig.brandName}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#A7C4B5;letter-spacing:1.5px;text-transform:uppercase;">${tenantConfig.marketing.email.headerEyebrow}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:36px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">${storeConfig.brandName} — ${storeConfig.siteUrl}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF;">${tenantConfig.marketing.email.supportReplyText}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Customer confirmation email ─────────────────────────────────────────────

export async function sendOrderConfirmationEmail(
  order: EmailOrder,
  items: EmailOrderItem[]
): Promise<void> {
  const shortId = order.id.slice(0, 8).toUpperCase()

  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Order Confirmed! 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">
      Hi ${escapeEmailText(order.customer_name)}, thank you for your order. We're preparing it now.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="padding:10px 14px;background:#F0FAF4;border-radius:8px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Order ID</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1B4332;font-family:monospace;">${order.id}</p>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;line-height:1.6;">Use this full order ID and your checkout phone number to <a href="${storeConfig.siteUrl}/orders/track">track your order</a>.</p>
    ${itemsTable(items)}

    ${order.customer_address ? `
    <div style="margin-top:24px;padding:16px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;">Shipping To</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${escapeEmailText(order.customer_address)}</p>
    </div>` : ''}

    <p style="margin-top:28px;font-size:14px;color:#6B7280;line-height:1.6;">
      You'll receive another email once your order ships. If you have any questions, just reply to this email.
    </p>
    <p style="margin:0;font-size:14px;color:#374151;font-weight:500;">— ${tenantConfig.marketing.email.teamSignatureLabel} ${storeConfig.brandName}</p>`

  const { error } = await getResend().emails.send({
    from: fromDisplay,
    to: order.customer_email,
    subject: `Order Confirmed — #${shortId}`,
    html: baseLayout(body),
  })
  if (error) throw new Error(error.message)
}

// ─── Admin new-order notification email ─────────────────────────────────────

export async function sendAdminNewOrderEmail(
  order: EmailOrder,
  items: EmailOrderItem[]
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const shortId = order.id.slice(0, 8).toUpperCase()

  const body = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">New Order Received</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">A new order has been placed on ${storeConfig.brandName}.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#F9FAFB;">
        <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;">Customer Details</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;width:120px;">Name</td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-top:1px solid #F3F4F6;">${escapeEmailText(order.customer_name)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;">Email</td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #F3F4F6;">${escapeEmailText(order.customer_email)}</td>
      </tr>
      ${order.customer_phone ? `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;">Phone</td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #F3F4F6;">${escapeEmailText(order.customer_phone)}</td>
      </tr>` : ''}
      ${order.customer_address ? `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;">Address</td>
        <td style="padding:10px 16px;font-size:13px;color:#374151;border-top:1px solid #F3F4F6;line-height:1.5;">${escapeEmailText(order.customer_address)}</td>
      </tr>` : ''}
      ${order.razorpay_payment_id ? `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-top:1px solid #F3F4F6;">Payment ID</td>
        <td style="padding:10px 16px;font-size:13px;color:#374151;font-family:monospace;border-top:1px solid #F3F4F6;">${order.razorpay_payment_id}</td>
      </tr>` : ''}
    </table>

    <p style="font-size:14px;line-height:1.6;">Use this full order ID and your checkout phone number to <a href="${storeConfig.siteUrl}/orders/track">track your order</a>.</p>
    ${itemsTable(items)}

    <div style="margin-top:24px;text-align:center;">
      <a href="${storeConfig.siteUrl}/admin/orders/${order.id}"
         style="display:inline-block;padding:12px 28px;background:#1B4332;color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        View Order in Admin →
      </a>
    </div>`

  const { error } = await getResend().emails.send({
    from: fromDisplay,
    to: adminEmail,
    subject: `New Order #${shortId} — ${storeConfig.currencySymbol}${order.total_amount.toLocaleString(tenantConfig.region.numberLocale)}`,
    html: baseLayout(body),
  })
  if (error) throw new Error(error.message)
}

function statusCopy(type: OrderStatusEmailType): {
  title: string
  subtitle: string
  subjectPrefix: string
} {
  switch (type) {
    case 'processing':
      return {
        title: 'Your order is now being processed',
        subtitle: 'We have started preparing your order with care.',
        subjectPrefix: 'Order Update',
      }
    case 'shipped':
      return {
        title: 'Your order has been shipped',
        subtitle: 'Your package is on the way. Tracking details will follow shortly.',
        subjectPrefix: 'Order Shipped',
      }
    case 'delivered':
      return {
        title: 'Your order has been delivered',
        subtitle: 'We hope you enjoy your order. Thank you for choosing us.',
        subjectPrefix: 'Order Delivered',
      }
  }
}

export async function sendOrderStatusUpdateEmail(
  order: EmailOrder,
  items: EmailOrderItem[],
  type: OrderStatusEmailType
): Promise<void> {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const copy = statusCopy(type)

  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">${copy.title}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">
      Hi ${escapeEmailText(order.customer_name)}, ${copy.subtitle}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="padding:10px 14px;background:#F0FAF4;border-radius:8px;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Order ID</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1B4332;font-family:monospace;">${order.id}</p>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;line-height:1.6;">Use this full order ID and your checkout phone number to <a href="${storeConfig.siteUrl}/orders/track">track your order</a>.</p>
    ${itemsTable(items)}

    <p style="margin-top:24px;font-size:14px;color:#6B7280;line-height:1.6;">
      Need help with your order? Reply to this email and our team will assist you.
    </p>
    <p style="margin:0;font-size:14px;color:#374151;font-weight:500;">— ${tenantConfig.marketing.email.teamSignatureLabel} ${storeConfig.brandName}</p>`

  const { error } = await getResend().emails.send({
    from: fromDisplay,
    to: order.customer_email,
    subject: `${copy.subjectPrefix} — #${shortId}`,
    html: baseLayout(body),
  })
  if (error) throw new Error(error.message)
}
