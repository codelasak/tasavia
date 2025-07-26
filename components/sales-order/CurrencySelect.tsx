import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CURRENCY_OPTIONS } from '@/lib/constants/sales-order-constants'

interface CurrencySelectProps {
  value: string
  onValueChange: (value: string) => void
  error?: string
  required?: boolean
}

export function CurrencySelect({ value, onValueChange, error, required }: CurrencySelectProps) {
  return (
    <div>
      <Label htmlFor="currency">
        Currency {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="currency" className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map((currency) => (
            <SelectItem key={currency.value} value={currency.value}>
              {currency.label}
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