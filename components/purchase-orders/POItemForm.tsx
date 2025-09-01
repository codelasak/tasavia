'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Plane,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { 
  purchaseOrderItemSchema, 
  type PurchaseOrderItemFormValues,
  ata106TraceabilitySchema,
  type ATA106TraceabilityFormValues
} from '@/lib/validation/purchase-order-schemas'
import { 
  AVIATION_CONDITIONS, 
  CERTIFIED_AGENCIES,
  validateATA106Compliance 
} from '@/lib/validation/ata106-schemas'

interface PartNumber {
  pn_id: string
  pn: string
  description: string | null
  category: string | null
}

interface POItemFormProps {
  item?: PurchaseOrderItemFormValues
  index: number
  onUpdate: (index: number, item: PurchaseOrderItemFormValues) => void
  onRemove: (index: number) => void
  availablePartNumbers: PartNumber[]
  showRemoveButton?: boolean
  className?: string
}

export default function POItemForm({
  item,
  index,
  onUpdate,
  onRemove,
  availablePartNumbers,
  showRemoveButton = true,
  className
}: POItemFormProps) {
  const [showATA106Fields, setShowATA106Fields] = useState(false)
  const [ata106ComplianceStatus, setATA106ComplianceStatus] = useState<'none' | 'partial' | 'complete'>('none')
  const [selectedPartNumber, setSelectedPartNumber] = useState<PartNumber | null>(null)

  const form = useForm<PurchaseOrderItemFormValues>({
    resolver: zodResolver(purchaseOrderItemSchema),
    defaultValues: item || {
      pn_id: '',
      quantity: 1,
      unit_price: 0,
      condition: undefined,
      sn: '',
      description: '',
      traceability_source: '',
      traceable_to: '',
      last_certified_agency: '',
    },
    mode: 'onChange',
  })

  const { 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    formState: { errors, isValid, isDirty },
    trigger
  } = form

  const watchedValues = watch();
  const { pn_id, description, traceability_source, traceable_to, last_certified_agency, quantity, unit_price } = watchedValues;

  // Update parent component when form values change
  useEffect(() => {
    const subscription = watch((value) => {
      if (isDirty && isValid) {
        onUpdate(index, value as PurchaseOrderItemFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty, isValid, index, onUpdate]);

  // Update selected part number when pn_id changes
  useEffect(() => {
    if (pn_id) {
      const partNumber = availablePartNumbers.find(pn => pn.pn_id === pn_id)
      setSelectedPartNumber(partNumber || null)
      
      // Auto-fill description if not already set
      if (partNumber && !description) {
        setValue('description', partNumber.description || '')
      }
    }
  }, [pn_id, availablePartNumbers, setValue, description])

  // Check ATA 106 compliance status
  useEffect(() => {
    const hasAnyField = traceability_source || traceable_to || last_certified_agency
    const hasAllFields = traceability_source && traceable_to && last_certified_agency
    
    if (!hasAnyField) {
      setATA106ComplianceStatus('none')
      setShowATA106Fields(false)
    } else if (hasAllFields) {
      setATA106ComplianceStatus('complete')
    } else {
      setATA106ComplianceStatus('partial')
    }
    
    if (hasAnyField) {
      setShowATA106Fields(true)
    }
  }, [traceability_source, traceable_to, last_certified_agency])

  const getConditionBadgeColor = useCallback((condition: string) => {
    switch (condition) {
      case 'NEW':
      case 'NS':
      case 'NE':
        return 'bg-green-100 text-green-800'
      case 'AR':
      case 'SV':
      case 'SVC':
        return 'bg-blue-100 text-blue-800'
      case 'OH':
      case 'OHC':
        return 'bg-yellow-100 text-yellow-800'
      case 'RP':
      case 'REP':
        return 'bg-orange-100 text-orange-800'
      case 'RB':
        return 'bg-purple-100 text-purple-800'
      case 'AS-IS':
      case 'SCRAP':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getComplianceStatusBadge = useCallback(() => {
    switch (ata106ComplianceStatus) {
      case 'complete':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            ATA 106 Complete
          </Badge>
        )
      case 'partial':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            ATA 106 Partial
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            <Plane className="h-3 w-3 mr-1" />
            Standard Part
          </Badge>
        )
    }
  }, [ata106ComplianceStatus])

  const handleEnableATA106 = () => {
    setShowATA106Fields(true)
    toast.info('ATA 106 traceability fields enabled for this item')
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">Item #{index + 1}</CardTitle>
            {getComplianceStatusBadge()}
          </div>
          <div className="flex items-center space-x-2">
            {!showATA106Fields && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnableATA106}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Shield className="h-4 w-4 mr-1" />
                Enable ATA 106
              </Button>
            )}
            {showRemoveButton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {selectedPartNumber && (
          <CardDescription>
            <span className="font-mono font-medium">{selectedPartNumber.pn}</span>
            {selectedPartNumber.category && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {selectedPartNumber.category}
              </span>
            )}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Item Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Part Number Selection */}
          <div className="space-y-2">
            <Label htmlFor={`pn_id_${index}`}>Part Number *</Label>
            <Controller
              name="pn_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.pn_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select part number..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePartNumbers.map((pn) => (
                      <SelectItem key={pn.pn_id} value={pn.pn_id}>
                        <div className="flex flex-col">
                          <span className="font-mono font-medium">{pn.pn}</span>
                          {pn.description && (
                            <span className="text-sm text-gray-500">{pn.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.pn_id && (
              <p className="text-sm text-red-500">{errors.pn_id.message}</p>
            )}
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor={`condition_${index}`}>Condition</Label>
            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AVIATION_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        <div className="flex items-center space-x-2">
                          <span>{condition}</span>
                          <Badge className={getConditionBadgeColor(condition)} variant="outline">
                            {condition}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.condition && (
              <p className="text-sm text-red-500">{errors.condition.message}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor={`quantity_${index}`}>Quantity *</Label>
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>

          {/* Unit Price */}
          <div className="space-y-2">
            <Label htmlFor={`unit_price_${index}`}>Unit Price ($) *</Label>
            <Controller
              name="unit_price"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0.01"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  className={errors.unit_price ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.unit_price && (
              <p className="text-sm text-red-500">{errors.unit_price.message}</p>
            )}
          </div>

          {/* Serial Number */}
          <div className="space-y-2">
            <Label htmlFor={`sn_${index}`}>Serial Number</Label>
            <Controller
              name="sn"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter serial number..."
                  className={errors.sn ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.sn && (
              <p className="text-sm text-red-500">{errors.sn.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor={`description_${index}`}>Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Enter item description..."
                rows={2}
                className={errors.description ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* ATA 106 Traceability Section */}
        <Collapsible open={showATA106Fields} onOpenChange={setShowATA106Fields}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between p-0"
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium">ATA 106 Aircraft Parts Traceability</span>
                {ata106ComplianceStatus !== 'none' && getComplianceStatusBadge()}
              </div>
              {showATA106Fields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            <Separator />
            
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>ATA 106 Compliance:</strong> Complete all traceability fields below for full 
                aircraft parts traceability compliance. Partial completion will be flagged for review.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4">
              {/* Traceability Source */}
              <div className="space-y-2">
                <Label htmlFor={`traceability_source_${index}`}>
                  Traceability Source *
                  <span className="text-xs text-gray-500 ml-1">(Original manufacturer, supplier, etc.)</span>
                </Label>
                <Controller
                  name="traceability_source"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Boeing, Airbus, Pratt & Whitney..."
                      className={errors.traceability_source ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.traceability_source && (
                  <p className="text-sm text-red-500">{errors.traceability_source.message}</p>
                )}
              </div>

              {/* Traceable To */}
              <div className="space-y-2">
                <Label htmlFor={`traceable_to_${index}`}>
                  Traceable To *
                  <span className="text-xs text-gray-500 ml-1">(Aircraft model, engine type, etc.)</span>
                </Label>
                <Controller
                  name="traceable_to"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Boeing 737-800, Airbus A320, CFM56-7B..."
                      className={errors.traceable_to ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.traceable_to && (
                  <p className="text-sm text-red-500">{errors.traceable_to.message}</p>
                )}
              </div>

              {/* Last Certified Agency */}
              <div className="space-y-2">
                <Label htmlFor={`last_certified_agency_${index}`}>
                  Last Certified Agency *
                  <span className="text-xs text-gray-500 ml-1">(Aviation regulatory authority)</span>
                </Label>
                <Controller
                  name="last_certified_agency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.last_certified_agency ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select certification agency..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFIED_AGENCIES.map((agency) => (
                          <SelectItem key={agency} value={agency}>
                            {agency}
                          </SelectItem>
                        ))}
                        <SelectItem value="OTHER">Other (specify in description)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.last_certified_agency && (
                  <p className="text-sm text-red-500">{errors.last_certified_agency.message}</p>
                )}
              </div>
            </div>

            {/* ATA 106 Compliance Status */}
            {ata106ComplianceStatus === 'partial' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Incomplete ATA 106 Data:</strong> Some traceability fields are missing. 
                  Complete all fields for full compliance or remove all ATA 106 data if not required.
                </AlertDescription>
              </Alert>
            )}

            {ata106ComplianceStatus === 'complete' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>ATA 106 Compliant:</strong> All required traceability fields are complete. 
                  This item meets aircraft parts traceability requirements.
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Line Total Display */}
        {quantity && unit_price && (
          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-gray-600">Line Total</p>
              <p className="text-lg font-semibold">
                ${(quantity * unit_price).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
