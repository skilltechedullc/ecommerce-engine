import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import {
  sendAdminNewOrderEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  type EmailOrder,
  type EmailOrderItem,
} from '@/lib/email'
import { normalizeTenantPhone } from '@/lib/tenant.config'
import { optionalEnv } from '@/lib/server/env'

type OrderStatus = 'Pending' | 'Paid' | 'Processing' | 'Shipped' | 'Delivered'
type NotificationChannel = 'email' | 'whatsapp'
type NotificationEvent =
  | 'order_confirmed'
  | 'order_processing'
  | 'order_shipped'
  | 'order_delivered'

type ProviderSendResult = {
  provider: string
  providerMessageId?: string
}

type NotificationOrder = EmailOrder & {
  status: OrderStatus
}

const MAX_RETRIES = 3

function processingNotificationEnabled(): boolean {
  return (optionalEnv('SEND_PROCESSING_NOTIFICATIONS') ?? 'false').toLowerCase() === 'true'
}

function whatsappEnabled(): boolean {
  return (optionalEnv('WHATSAPP_ENABLED') ?? 'false').toLowerCase() === 'true'
}

function eventFromStatus(status: OrderStatus): NotificationEvent | null {
  switch (status) {
    case 'Processing':
      return 'order_processing'
    case 'Shipped':
      return 'order_shipped'
    case 'Delivered':
      return 'order_delivered'
    default:
      return null
  }
}

function templateIdForEvent(event: NotificationEvent): string | undefined {
  switch (event) {
    case 'order_confirmed':
      return optionalEnv('WHATSAPP_TEMPLATE_ORDER_CONFIRMED')
    case 'order_processing':
      return optionalEnv('WHATSAPP_TEMPLATE_ORDER_PROCESSING')
    case 'order_shipped':
      return optionalEnv('WHATSAPP_TEMPLATE_ORDER_SHIPPED')
    case 'order_delivered':
      return optionalEnv('WHATSAPP_TEMPLATE_ORDER_DELIVERED')
  }
}

function normalizePhone(input: string): string {
  return normalizeTenantPhone(input)
}

function whatsappVariables(order: NotificationOrder) {
  return {
    customer_name: order.customer_name,
    order_id: order.id,
    total_amount: String(order.total_amount),
    order_status: order.status,
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetries<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T; attempts: number } | { ok: false; error: string; attempts: number }> {
  let attempts = 0
  let lastError = 'Unknown error'

  while (attempts < MAX_RETRIES) {
    attempts += 1
    try {
      const value = await fn()
      return { ok: true, value, attempts }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempts < MAX_RETRIES) {
        await sleep(250 * attempts)
      }
    }
  }

  return { ok: false, error: lastError, attempts }
}

async function fetchOrderWithItems(orderId: string): Promise<{ order: NotificationOrder; items: EmailOrderItem[] } | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, customer_address, total_amount, razorpay_payment_id, status, order_items(product_name, quantity, price)')
    .eq('id', orderId)
    .single()

  if (error || !data) return null

  const order: NotificationOrder = {
    id: String(data.id),
    customer_name: String(data.customer_name ?? ''),
    customer_email: String(data.customer_email ?? ''),
    customer_phone: String(data.customer_phone ?? ''),
    customer_address: String(data.customer_address ?? ''),
    total_amount: Number(data.total_amount ?? 0),
    razorpay_payment_id: data.razorpay_payment_id ? String(data.razorpay_payment_id) : undefined,
    status: String(data.status ?? 'Pending') as OrderStatus,
  }

  const items: EmailOrderItem[] = ((data.order_items ?? []) as Array<{ product_name: string; quantity: number; price: number }>)
    .map((item) => ({
      name: String(item.product_name),
      quantity: Number(item.quantity),
      price: Number(item.price),
    }))

  return { order, items }
}

async function createNotificationLog(input: {
  orderId: string
  event: NotificationEvent
  channel: NotificationChannel
  recipient: string
  payload: Record<string, unknown>
}): Promise<{ logId: string | null; duplicate: boolean }> {
  const supabase = getSupabaseAdmin()
  const eventKey = `${input.orderId}:${input.event}`

  const { data, error } = await supabase
    .from('notification_logs')
    .insert({
      order_id: input.orderId,
      event: input.event,
      channel: input.channel,
      event_key: eventKey,
      status: 'pending',
      recipient: input.recipient,
      payload: input.payload,
      attempt_count: 0,
    })
    .select('id')
    .single()

  if (!error && data?.id) {
    return { logId: String(data.id), duplicate: false }
  }

  if (error && (error.message.includes('duplicate key') || error.message.includes('unique'))) {
    return { logId: null, duplicate: true }
  }

  if (error) {
    void error
  }

  return { logId: null, duplicate: false }
}

async function markNotificationResult(input: {
  logId: string | null
  status: 'sent' | 'failed'
  attempts: number
  provider?: string
  providerMessageId?: string
  error?: string
}) {
  if (!input.logId) return

  const supabase = getSupabaseAdmin()
  const nextRetryAt = input.status === 'failed'
    ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
    : null

  await supabase
    .from('notification_logs')
    .update({
      status: input.status,
      attempt_count: input.attempts,
      provider: input.provider ?? null,
      provider_message_id: input.providerMessageId ?? null,
      last_error: input.error ?? null,
      next_retry_at: nextRetryAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.logId)
}

async function sendWhatsAppViaTwilio(input: {
  toPhone: string
  templateId: string
  variables: Record<string, string>
}): Promise<ProviderSendResult> {
  const sid = optionalEnv('TWILIO_ACCOUNT_SID')
  const authToken = optionalEnv('TWILIO_AUTH_TOKEN')
  const from = optionalEnv('WHATSAPP_FROM')

  if (!sid || !authToken || !from) {
    throw new Error('Twilio WhatsApp config missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, WHATSAPP_FROM)')
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const body = new URLSearchParams({
    To: `whatsapp:${input.toPhone}`,
    From: `whatsapp:${from}`,
    ContentSid: input.templateId,
    ContentVariables: JSON.stringify(input.variables),
  })

  const auth = Buffer.from(`${sid}:${authToken}`).toString('base64')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const json = await response.json().catch(() => ({})) as { sid?: string; message?: string }
  if (!response.ok) {
    throw new Error(`Twilio send failed (${response.status}): ${json.message ?? 'Unknown error'}`)
  }

  return {
    provider: 'twilio',
    providerMessageId: json.sid,
  }
}

async function sendWhatsAppViaWati(input: {
  toPhone: string
  templateId: string
  variables: Record<string, string>
}): Promise<ProviderSendResult> {
  const apiBase = optionalEnv('WATI_API_BASE_URL')
  const token = optionalEnv('WATI_API_TOKEN')
  if (!apiBase || !token) {
    throw new Error('WATI config missing (WATI_API_BASE_URL, WATI_API_TOKEN)')
  }

  const url = `${apiBase.replace(/\/$/, '')}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(input.toPhone.replace('+', ''))}`
  const body = {
    template_name: input.templateId,
    broadcast_name: `order_${Date.now()}`,
    parameters: Object.entries(input.variables).map(([name, value]) => ({ name, value })),
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await response.json().catch(() => ({})) as { result?: { id?: string }; message?: string }
  if (!response.ok) {
    throw new Error(`WATI send failed (${response.status}): ${json.message ?? 'Unknown error'}`)
  }

  return {
    provider: 'wati',
    providerMessageId: json.result?.id,
  }
}

async function sendWhatsAppViaGupshup(input: {
  toPhone: string
  templateId: string
  variables: Record<string, string>
}): Promise<ProviderSendResult> {
  const apiBase = optionalEnv('GUPSHUP_API_BASE_URL') ?? 'https://api.gupshup.io'
  const appName = optionalEnv('GUPSHUP_APP_NAME')
  const token = optionalEnv('GUPSHUP_API_KEY')

  if (!appName || !token) {
    throw new Error('Gupshup config missing (GUPSHUP_APP_NAME, GUPSHUP_API_KEY)')
  }

  const url = `${apiBase.replace(/\/$/, '')}/sm/api/v1/template/msg`
  const body = new URLSearchParams({
    channel: 'whatsapp',
    source: optionalEnv('WHATSAPP_FROM') ?? '',
    destination: input.toPhone.replace('+', ''),
    'src.name': appName,
    template: JSON.stringify({
      id: input.templateId,
      params: Object.values(input.variables),
    }),
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const json = await response.json().catch(() => ({})) as { messageId?: string; message?: string }
  if (!response.ok) {
    throw new Error(`Gupshup send failed (${response.status}): ${json.message ?? 'Unknown error'}`)
  }

  return {
    provider: 'gupshup',
    providerMessageId: json.messageId,
  }
}

async function sendWhatsAppViaMeta(input: {
  toPhone: string
  templateId: string
  variables: Record<string, string>
}): Promise<ProviderSendResult> {
  const accessToken = optionalEnv('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = optionalEnv('WHATSAPP_PHONE_NUMBER_ID')
  const languageCode = optionalEnv('WHATSAPP_META_TEMPLATE_LANGUAGE') ?? 'en'

  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta WhatsApp config missing (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)')
  }

  const to = input.toPhone.replace('+', '')
  const parameterOrder = [
    input.variables.customer_name ?? '',
    input.variables.order_id ?? '',
    input.variables.total_amount ?? '',
    input.variables.order_status ?? '',
  ]

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: input.templateId,
        language: {
          code: languageCode,
        },
        components: [
          {
            type: 'body',
            parameters: parameterOrder.map((value) => ({
              type: 'text',
              text: String(value),
            })),
          },
        ],
      },
    }),
  })

  const json = await response.json().catch(() => ({})) as {
    messages?: Array<{ id?: string }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(`Meta send failed (${response.status}): ${json.error?.message ?? 'Unknown error'}`)
  }

  return {
    provider: 'meta',
    providerMessageId: json.messages?.[0]?.id,
  }
}

async function sendWhatsAppTemplate(input: {
  event: NotificationEvent
  order: NotificationOrder
}): Promise<ProviderSendResult> {
  const templateId = templateIdForEvent(input.event)
  if (!templateId) {
    throw new Error(`Missing WhatsApp template id for event ${input.event}`)
  }

  const toPhone = normalizePhone(input.order.customer_phone ?? '')
  if (!toPhone) {
    throw new Error('Missing customer phone number for WhatsApp notification')
  }

  const provider = (optionalEnv('WHATSAPP_PROVIDER') ?? 'twilio').toLowerCase()
  const vars = whatsappVariables(input.order)

  switch (provider) {
    case 'twilio':
      return sendWhatsAppViaTwilio({ toPhone, templateId, variables: vars })
    case 'wati':
      return sendWhatsAppViaWati({ toPhone, templateId, variables: vars })
    case 'gupshup':
      return sendWhatsAppViaGupshup({ toPhone, templateId, variables: vars })
    case 'meta':
      return sendWhatsAppViaMeta({ toPhone, templateId, variables: vars })
    default:
      throw new Error(`Unsupported WHATSAPP_PROVIDER: ${provider}`)
  }
}

async function dispatchNotification(input: {
  order: NotificationOrder
  items: EmailOrderItem[]
  event: NotificationEvent
  channel: NotificationChannel
}) {
  const recipient = input.channel === 'email' ? input.order.customer_email : input.order.customer_phone ?? ''
  const { logId, duplicate } = await createNotificationLog({
    orderId: input.order.id,
    event: input.event,
    channel: input.channel,
    recipient,
    payload: {
      orderId: input.order.id,
      status: input.order.status,
      totalAmount: input.order.total_amount,
    },
  })

  if (duplicate) return

  if (input.channel === 'email') {
    const result = await withRetries(async () => {
      if (input.event === 'order_confirmed') {
        await sendOrderConfirmationEmail(input.order, input.items)
        await sendAdminNewOrderEmail(input.order, input.items)
        return { provider: 'resend' }
      }

      if (input.event === 'order_processing') {
        await sendOrderStatusUpdateEmail(input.order, input.items, 'processing')
        return { provider: 'resend' }
      }

      if (input.event === 'order_shipped') {
        await sendOrderStatusUpdateEmail(input.order, input.items, 'shipped')
        return { provider: 'resend' }
      }

      await sendOrderStatusUpdateEmail(input.order, input.items, 'delivered')
      return { provider: 'resend' }
    })

    if (result.ok) {
      await markNotificationResult({
        logId,
        status: 'sent',
        attempts: result.attempts,
        provider: result.value.provider,
      })
      return
    }

    await markNotificationResult({
      logId,
      status: 'failed',
      attempts: result.attempts,
      provider: 'resend',
      error: result.error,
    })

    void result
    return
  }

  if (!whatsappEnabled()) return

  const result = await withRetries(async () => sendWhatsAppTemplate({
    event: input.event,
    order: input.order,
  }))

  if (result.ok) {
    await markNotificationResult({
      logId,
      status: 'sent',
      attempts: result.attempts,
      provider: result.value.provider,
      providerMessageId: result.value.providerMessageId,
    })
    return
  }

  await markNotificationResult({
    logId,
    status: 'failed',
    attempts: result.attempts,
    provider: optionalEnv('WHATSAPP_PROVIDER') ?? 'unknown',
    error: result.error,
  })

  void result
}

export async function notifyOrderPlaced(orderId: string) {
  const payload = await fetchOrderWithItems(orderId)
  if (!payload) return

  await dispatchNotification({
    order: payload.order,
    items: payload.items,
    event: 'order_confirmed',
    channel: 'email',
  })

  await dispatchNotification({
    order: payload.order,
    items: payload.items,
    event: 'order_confirmed',
    channel: 'whatsapp',
  })
}

export async function notifyOrderStatusChanged(input: {
  orderId: string
  newStatus: OrderStatus
}) {
  const event = eventFromStatus(input.newStatus)
  if (!event) return
  if (event === 'order_processing' && !processingNotificationEnabled()) return

  const payload = await fetchOrderWithItems(input.orderId)
  if (!payload) return

  await dispatchNotification({
    order: payload.order,
    items: payload.items,
    event,
    channel: 'email',
  })

  await dispatchNotification({
    order: payload.order,
    items: payload.items,
    event,
    channel: 'whatsapp',
  })
}

function isNotificationEvent(value: string): value is NotificationEvent {
  return value === 'order_confirmed'
    || value === 'order_processing'
    || value === 'order_shipped'
    || value === 'order_delivered'
}

function isNotificationChannel(value: string): value is NotificationChannel {
  return value === 'email' || value === 'whatsapp'
}

export async function retryFailedOrderNotifications(orderId: string): Promise<{
  retried: number
  sent: number
  failed: number
  skipped: number
}> {
  const payload = await fetchOrderWithItems(orderId)
  if (!payload) {
    return { retried: 0, sent: 0, failed: 0, skipped: 0 }
  }

  const supabase = getSupabaseAdmin()
  const { data: failedLogs, error } = await supabase
    .from('notification_logs')
    .select('id, event, channel')
    .eq('order_id', orderId)
    .eq('status', 'failed')
    .order('created_at', { ascending: true })

  if (error || !failedLogs?.length) {
    return { retried: 0, sent: 0, failed: 0, skipped: 0 }
  }

  let retried = 0
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of failedLogs) {
    const eventRaw = String(row.event ?? '')
    const channelRaw = String(row.channel ?? '')

    if (!isNotificationEvent(eventRaw) || !isNotificationChannel(channelRaw)) {
      skipped += 1
      continue
    }

    if (eventRaw === 'order_processing' && !processingNotificationEnabled()) {
      skipped += 1
      continue
    }

    retried += 1
    const logId = String(row.id)

    if (channelRaw === 'email') {
      const result = await withRetries(async () => {
        if (eventRaw === 'order_confirmed') {
          await sendOrderConfirmationEmail(payload.order, payload.items)
          await sendAdminNewOrderEmail(payload.order, payload.items)
          return { provider: 'resend' }
        }

        if (eventRaw === 'order_processing') {
          await sendOrderStatusUpdateEmail(payload.order, payload.items, 'processing')
          return { provider: 'resend' }
        }

        if (eventRaw === 'order_shipped') {
          await sendOrderStatusUpdateEmail(payload.order, payload.items, 'shipped')
          return { provider: 'resend' }
        }

        await sendOrderStatusUpdateEmail(payload.order, payload.items, 'delivered')
        return { provider: 'resend' }
      })

      if (result.ok) {
        sent += 1
        await markNotificationResult({
          logId,
          status: 'sent',
          attempts: result.attempts,
          provider: result.value.provider,
        })
      } else {
        failed += 1
        await markNotificationResult({
          logId,
          status: 'failed',
          attempts: result.attempts,
          provider: 'resend',
          error: result.error,
        })
      }
      continue
    }

    if (!whatsappEnabled()) {
      skipped += 1
      continue
    }

    const result = await withRetries(async () => sendWhatsAppTemplate({
      event: eventRaw,
      order: payload.order,
    }))

    if (result.ok) {
      sent += 1
      await markNotificationResult({
        logId,
        status: 'sent',
        attempts: result.attempts,
        provider: result.value.provider,
        providerMessageId: result.value.providerMessageId,
      })
    } else {
      failed += 1
      await markNotificationResult({
        logId,
        status: 'failed',
        attempts: result.attempts,
        provider: optionalEnv('WHATSAPP_PROVIDER') ?? 'unknown',
        error: result.error,
      })
    }
  }

  return { retried, sent, failed, skipped }
}
