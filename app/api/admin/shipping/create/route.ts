import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { parseSchema, createShipmentSchema } from '@/lib/server/schemas'
import { tenantConfig } from '@/lib/tenant.config'
import { createShipmentForOrder } from '@/lib/shipping/service'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { writeAuditLog } from '@/lib/server/audit'
import type { Address, CreateShipmentInput } from '@/lib/shipping/types'

type OrderRow = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  total_amount: number | null
  source: string | null
}

type OrderItemRow = {
  id: string
  product_name: string | null
  quantity: number | null
  price: number | null
}

function parseAddress(input: string | null, fallbackName: string, fallbackPhone: string): Address {
  const raw = (input ?? '').trim()
  const [line1, line2] = raw.split(',').map((part) => part.trim()).filter(Boolean)

  return {
    name: fallbackName,
    phone: fallbackPhone,
    addressLine1: line1 ?? raw ?? '',
    addressLine2: line2,
    city: tenantConfig.contact.address.city,
    state: tenantConfig.contact.address.state,
    pincode: tenantConfig.contact.address.postalCode,
    country: tenantConfig.contact.address.country,
  }
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'orders:update-status')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const body = parseSchema(createShipmentSchema, await parseJson<unknown>(req))
    const supabase = getSupabaseAdmin()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, customer_address, total_amount, source')
      .eq('id', body.orderId)
      .single<OrderRow>()

    if (orderError || !order) {
      throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_name, quantity, price')
      .eq('order_id', body.orderId)
      .returns<OrderItemRow[]>()

    if (itemsError) {
      throw new HttpError(500, 'Failed to fetch order items', 'DB_FETCH_FAILED', itemsError)
    }

    const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`
    const customerName = order.customer_name?.trim() || 'Customer'
    const customerPhone = order.customer_phone?.trim() || ''

    const deliveryAddress = parseAddress(order.customer_address, customerName, customerPhone)
    const pickupAddress: Address = {
      ...tenantConfig.shipping.pickupAddress,
      addressLine2: tenantConfig.shipping.pickupAddress.addressLine2 || undefined,
    }

    const shipmentInput: CreateShipmentInput = {
      orderId: order.id,
      orderNumber,
      customerName,
      customerPhone,
      deliveryAddress,
      pickupAddress,
      items: (items ?? []).map((item) => ({
        name: item.product_name?.trim() || 'Product',
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        price: Number(item.price ?? 0),
      })),
      totalAmount: Number(order.total_amount ?? 0),
      paymentMethod: body.paymentMethod ?? 'prepaid',
      weightGrams: body.weightGrams,
    }

    const source = (order.source ?? '').toLowerCase()
    const inferredChannel = source === 'instagram' || source === 'whatsapp' ? source : undefined
    const result = await createShipmentForOrder(
      shipmentInput,
      body.customerChannel ?? inferredChannel,
      body.customerChannelId ?? customerPhone
    )

    if (!result.success) {
      throw new HttpError(500, result.error ?? 'Failed to create shipment', 'SHIPMENT_CREATE_FAILED')
    }

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: 'shipment.create',
      entityType: 'order',
      entityId: order.id,
      requestId,
      metadata: {
        shipmentId: result.shipmentId,
        provider: tenantConfig.shipping.provider,
      },
    })

    return jsonOk({
      shipmentId: result.shipmentId,
      orderId: order.id,
      orderNumber,
      provider: tenantConfig.shipping.provider,
    }, { requestId })
  })
}
