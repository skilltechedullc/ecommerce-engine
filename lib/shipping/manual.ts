import type {
  ShippingProviderInterface,
  CreateShipmentInput,
  ShipmentResult,
  TrackingUpdate,
} from './types'

export class ManualShippingProvider implements ShippingProviderInterface {
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    void input
    const reference = 'MAN-' + Date.now().toString(36).toUpperCase()
    return {
      success: true,
      providerShipmentId: reference,
      awbNumber: reference,
      trackingUrl: undefined,
      pickupScheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: { provider: 'manual', note: 'Manual fulfillment' },
    }
  }

  async cancelShipment(providerShipmentId: string): Promise<boolean> {
    void providerShipmentId
    return true
  }

  async getTracking(awbNumber: string): Promise<TrackingUpdate[]> {
    void awbNumber
    return [
      {
        status: 'pending',
        timestamp: new Date(),
        description: 'Manual shipment - contact seller for updates',
      },
    ]
  }

  async schedulePickup(providerShipmentId: string, date: Date): Promise<boolean> {
    void providerShipmentId
    void date
    return true
  }
}
