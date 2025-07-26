import { Button } from '@/components/ui/button'
import { getStatusActions } from '@/lib/constants/sales-order-constants'

interface StatusActionsProps {
  currentStatus: string | null
  onStatusChange: (newStatus: string) => void
  disabled?: boolean
}

export function StatusActions({ currentStatus, onStatusChange, disabled }: StatusActionsProps) {
  const actions = getStatusActions(currentStatus || 'Unknown')

  if (actions.length === 0) return null

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <Button
          key={action.status}
          variant={action.variant as "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"}
          size="sm"
          onClick={() => onStatusChange(action.status)}
          disabled={disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}