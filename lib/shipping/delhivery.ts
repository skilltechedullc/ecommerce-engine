import type {
  ShippingProviderInterface,
  CreateShipmentInput,
  ShipmentResult,
  TrackingUpdate,
} from './types'

export class DelhiveryProvider implements ShippingProviderInterface {
  private readonly baseUrl = 'https://track.delhivery.com/api'

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    void input
    void this.baseUrl
    return {
      success: false,
      error: 'Delhivery provider not yet configured',
    }
  }

  async cancelShipment(providerShipmentId: string): Promise<boolean> {
    void providerShipmentId
    return false
  }

  async getTracking(awbNumber: string): Promise<TrackingUpdate[]> {
    void awbNumber
    return []
  }

  async schedulePickup(providerShipmentId: string, date: Date): Promise<boolean> {
    void providerShipmentId
    void date
    return false
  }
}
