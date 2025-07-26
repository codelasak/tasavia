import { Badge } from '@/components/ui/badge'
import { getStatusColor, type SalesOrderStatus } from '@/lib/constants/sales-order-constants'

interface StatusBadgeProps {
  status: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const displayStatus = status || 'Unknown'
  const statusColor = getStatusColor(displayStatus)

  return (
    <Badge className={`${statusColor} ${className || ''}`}>
      {displayStatus}
    </Badge>
  )
}