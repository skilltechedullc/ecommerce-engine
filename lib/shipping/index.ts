import { ManualShippingProvider } from './manual'
import { ShiprocketProvider } from './shiprocket'
import { DelhiveryProvider } from './delhivery'
import type { ShippingProviderInterface, ShippingProvider } from './types'

export function getShippingProvider(): ShippingProviderInterface {
  const provider = (process.env.SHIPPING_PROVIDER ?? 'manual') as ShippingProvider

  switch (provider) {
    case 'shiprocket':
      return new ShiprocketProvider()
    case 'delhivery':
      return new DelhiveryProvider()
    case 'manual':
    default:
      return new ManualShippingProvider()
  }
}

export * from './types'
