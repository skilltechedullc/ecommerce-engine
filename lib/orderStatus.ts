export const ORDER_STATUSES = [
  'Pending',
  'Paid',
  'Payment Failed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Refunded',
  'Return Requested',
  'Returned',
] as const

export type OrderStatus = typeof ORDER_STATUSES[number]

export const ORDER_STATUSES_REQUIRING_REASON: OrderStatus[] = [
  'Payment Failed',
  'Cancelled',
  'Refunded',
  'Return Requested',
  'Returned',
]

// One-way status progression for fulfillment lifecycle.
export const ORDER_STATUS_PROGRESSION: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Paid', 'Payment Failed', 'Cancelled'],
  Paid: ['Processing', 'Cancelled', 'Refunded'],
  'Payment Failed': [],
  Processing: ['Shipped', 'Cancelled', 'Refunded'],
  Shipped: ['Delivered', 'Return Requested'],
  Delivered: ['Return Requested'],
  Cancelled: [],
  Refunded: [],
  'Return Requested': ['Returned', 'Refunded'],
  Returned: ['Refunded'],
}
