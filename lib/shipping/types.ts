export type ShippingProvider = 'manual' | 'shiprocket' | 'delhivery'

export type ShipmentStatus =
  | 'pending'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled'

export type Address = {
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  country: string
}

export type CreateShipmentInput = {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  deliveryAddress: Address
  pickupAddress: Address
  items: {
    name: string
    quantity: number
    price: number
    weightGrams?: number
  }[]
  totalAmount: number
  paymentMethod: 'prepaid' | 'cod'
  weightGrams?: number
}

export type ShipmentResult = {
  success: boolean
  providerShipmentId?: string
  awbNumber?: string
  trackingUrl?: string
  pickupScheduledAt?: Date
  estimatedDelivery?: Date
  error?: string
  metadata?: Record<string, unknown>
}

export type TrackingUpdate = {
  status: ShipmentStatus
  location?: string
  timestamp: Date
  description: string
}

export interface ShippingProviderInterface {
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>
  cancelShipment(providerShipmentId: string): Promise<boolean>
  getTracking(awbNumber: string): Promise<TrackingUpdate[]>
  schedulePickup(providerShipmentId: string, date: Date): Promise<boolean>
}
