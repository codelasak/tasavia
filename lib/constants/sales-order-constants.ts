// Shared constants for sales order module
// This ensures consistency across all sales order components

export const PAYMENT_TERMS = [
  { value: 'PRE-PAY', label: 'PRE-PAY' },
  { value: 'COD', label: 'COD' },
  { value: 'NET15', label: 'NET 15' },
  { value: 'NET30', label: 'NET 30' },
  { value: 'NET45', label: 'NET 45' },
  { value: 'NET60', label: 'NET 60' },
] as const

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'TL', label: 'TL' },
] as const

export const SALES_ORDER_STATUSES = [
  { value: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'Confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'Shipped', label: 'Shipped', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Invoiced', label: 'Invoiced', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', label: 'Closed', color: 'bg-purple-100 text-purple-800' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
] as const

// Type exports for better TypeScript support
export type PaymentTerm = typeof PAYMENT_TERMS[number]['value']
export type Currency = typeof CURRENCY_OPTIONS[number]['value']
export type SalesOrderStatus = typeof SALES_ORDER_STATUSES[number]['value']

// Helper functions
export const getStatusColor = (status: string): string => {
  const statusConfig = SALES_ORDER_STATUSES.find(s => s.value === status)
  return statusConfig?.color || 'bg-gray-100 text-gray-800'
}

export const getStatusActions = (currentStatus: string) => {
  const actions = []
  
  if (currentStatus === 'Draft') {
    actions.push({ label: 'Confirm Order', status: 'Confirmed', variant: 'default' })
  }
  if (currentStatus === 'Confirmed') {
    actions.push({ label: 'Mark as Shipped', status: 'Shipped', variant: 'default' })
  }
  if (currentStatus === 'Shipped') {
    actions.push({ label: 'Mark as Invoiced', status: 'Invoiced', variant: 'default' })
  }
  if (currentStatus === 'Invoiced') {
    actions.push({ label: 'Close Order', status: 'Closed', variant: 'default' })
  }
  if (!['Closed', 'Cancelled'].includes(currentStatus)) {
    actions.push({ label: 'Cancel Order', status: 'Cancelled', variant: 'destructive' })
  }
  
  return actions
}