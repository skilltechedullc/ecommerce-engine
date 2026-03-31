import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { notifyOrderStatusChanged } from '@/lib/server/notifications'
import { tenantConfig } from '@/lib/tenant.config'
import { sendMessage, type Channel } from '@/lib/chat/sender'
import { getShippingProvider } from './index'
import type { CreateShipmentInput, ShipmentStatus } from './types'

const supabaseAdmin = getSupabaseAdmin()

export async function createShipmentForOrder(
  input: CreateShipmentInput,
  customerChannel?: Channel,
  customerChannelId?: string
): Promise<{ success: boolean; shipmentId?: string; error?: string }> {
  try {
    const provider = getShippingProvider()
    const result = await provider.createShipment(input)

    if (!result.success) {
      return { success: false, error: result.error ?? 'Shipment creation failed' }
    }

    const { data: shipment, error: dbError } = await supabaseAdmin
      .from('shipments')
      .insert({
        order_id: input.orderId,
        provider: process.env.SHIPPING_PROVIDER ?? 'manual',
        provider_shipment_id: result.providerShipmentId,
        awb_number: result.awbNumber,
        tracking_url: result.trackingUrl,
        status: 'pickup_scheduled',
        pickup_scheduled_at: result.pickupScheduledAt?.toISOString(),
        estimated_delivery: result.estimatedDelivery?.toISOString(),
        pickup_address: input.pickupAddress,
        delivery_address: input.deliveryAddress,
        weight_grams: input.weightGrams,
        metadata: result.metadata ?? {},
      })
      .select('id')
      .single<{ id: string }>()

    if (dbError) throw dbError

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'Processing' })
      .eq('id', input.orderId)

    if (updateError) {
      console.error('[shipping] failed to update order status to Processing', updateError)
    } else {
      void notifyOrderStatusChanged({ orderId: input.orderId, newStatus: 'Processing' }).catch(() => undefined)
    }

    if (customerChannel && customerChannelId) {
      const trackingMessage = [
        'Your order has been confirmed for pickup!',
        '',
        `Order: ${input.orderNumber}`,
        result.awbNumber ? `Tracking reference: ${result.awbNumber}` : null,
        result.trackingUrl ? `Track your delivery: ${result.trackingUrl}` : null,
        '',
        `Estimated delivery: ${result.estimatedDelivery ? result.estimatedDelivery.toLocaleDateString() : '2-5 business days'}`,
        '',
        `Thank you for shopping with ${tenantConfig.branding.name}!`,
      ].filter((line): line is string => Boolean(line)).join('\n')

      await sendMessage(customerChannelId, trackingMessage, customerChannel)
    }

    return { success: true, shipmentId: shipment.id }
  } catch (error) {
    console.error('[shipping] createShipmentForOrder error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateShipmentStatus(
  awbNumber: string,
  status: ShipmentStatus
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = { status }

    if (status === 'picked_up' || status === 'in_transit' || status === 'out_for_delivery') {
      updateData.shipped_at = new Date().toISOString()
    }
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .update(updateData)
      .eq('awb_number', awbNumber)
      .select('order_id')
      .single<{ order_id: string }>()

    if (shipmentError || !shipment) return

    if (status === 'delivered') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'Delivered' })
        .eq('id', shipment.order_id)
      void notifyOrderStatusChanged({ orderId: shipment.order_id, newStatus: 'Delivered' }).catch(() => undefined)
    } else if (status === 'in_transit' || status === 'picked_up' || status === 'out_for_delivery') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'Shipped' })
        .eq('id', shipment.order_id)
      void notifyOrderStatusChanged({ orderId: shipment.order_id, newStatus: 'Shipped' }).catch(() => undefined)
    }
  } catch (error) {
    console.error('[shipping] updateShipmentStatus error:', error)
  }
}
