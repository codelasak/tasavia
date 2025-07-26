import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAYMENT_TERMS } from '@/lib/constants/sales-order-constants'

interface PaymentTermsSelectProps {
  value: string
  onValueChange: (value: string) => void
  error?: string
  required?: boolean
}

export function PaymentTermsSelect({ value, onValueChange, error, required }: PaymentTermsSelectProps) {
  return (
    <div>
      <Label htmlFor="payment_terms">
        Payment Terms {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="payment_terms" className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder="Select payment terms" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_TERMS.map((term) => (
            <SelectItem key={term.value} value={term.value}>
              {term.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  )
}