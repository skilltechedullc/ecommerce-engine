export const ORDER_STATUSES = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered'] as const

export type OrderStatus = typeof ORDER_STATUSES[number]

// One-way status progression for fulfillment lifecycle.
export const ORDER_STATUS_PROGRESSION: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Paid'],
  Paid: ['Processing'],
  Processing: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: [],
}
