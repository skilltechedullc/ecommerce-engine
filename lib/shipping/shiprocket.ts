import type {
  ShippingProviderInterface,
  CreateShipmentInput,
  ShipmentResult,
  TrackingUpdate,
} from './types'

export class ShiprocketProvider implements ShippingProviderInterface {
  private readonly baseUrl = 'https://apiv2.shiprocket.in/v1/external'
  private token: string | null = null

  private async getToken(): Promise<string> {
    if (this.token) {
      return this.token
    }
    void this.baseUrl
    throw new Error('Shiprocket not configured: add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD')
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    void input
    await this.getToken().catch(() => undefined)
    return {
      success: false,
      error: 'Shiprocket provider not yet configured',
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
