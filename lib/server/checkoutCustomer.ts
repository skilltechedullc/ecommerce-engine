import { z } from 'zod'
export const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(25).regex(/^[+\d ()-]+$/),
  address: z.string().trim().min(1).max(1500),
})
