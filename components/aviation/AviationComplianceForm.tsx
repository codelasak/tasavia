'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle, Search, Plane, MapPin, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { 
  fetchAirlines, 
  fetchCountries, 
  validateMSN, 
  AirlineData,
  type AircraftData 
} from '@/lib/external-apis'

interface AviationComplianceData {
  // Certificate information
  lastCertificate?: string
  certificateAuthority?: string
  certificateNumber?: string
  certificateExpiry?: string
  
  // Traceability
  obtainedFrom: string
  traceableToAirline?: string
  traceableToAirlineIATA?: string
  traceableToAirlineICAO?: string
  traceableToMSN?: string
  traceableToRegistration?: string
  
  // Origin and compliance
  originCountry: string
  originCountryName?: string
  endUse?: string
  intendedUse?: string
  
  // Part condition
  partCondition?: 'new' | 'used' | 'refurbished' | 'ar' | 'serviceable' | 'unserviceable'
  qualitySystemStandard?: 'AS9100' | 'AS9110' | 'AS9120' | 'ISO9001' | 'other'
}

interface AviationComplianceFormProps {
  data?: Partial<AviationComplianceData>
  onChange: (data: Partial<AviationComplianceData>) => void
  showAdvanced?: boolean
  compact?: boolean
}

export default function AviationComplianceForm({
  data = {},
  onChange,
  showAdvanced = false,
  compact = false
}: AviationComplianceFormProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<AviationComplianceData>>(data)
  
  // Loading states
  const [loadingAirlines, setLoadingAirlines] = useState(false)
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [validatingMSN, setValidatingMSN] = useState(false)
  
  // Data states
  const [airlines, setAirlines] = useState<AirlineData[]>([])
  const [countries, setCountries] = useState<{ name: string; code: string }[]>([])
  const [msnValidation, setMsnValidation] = useState<{ valid: boolean; message: string } | null>(null)
  
  // UI states
  const [airlineSearchOpen, setAirlineSearchOpen] = useState(false)
  const [countrySearchOpen, setCountrySearchOpen] = useState(false)
  const [airlineSearch, setAirlineSearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load initial data
  useEffect(() => {
    loadCountries()
  }, [])

  // Update parent when form data changes
  useEffect(() => {
    onChange(formData)
  }, [formData, onChange])

  // Load countries
  const loadCountries = async () => {
    setLoadingCountries(true)
    try {
      const countriesData = await fetchCountries()
      setCountries(countriesData)
    } catch (error) {
      console.error('Error loading countries:', error)
      toast.error('Failed to load countries data')
    } finally {
      setLoadingCountries(false)
    }
  }

  // Search airlines with debouncing
  const searchAirlines = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAirlines([])
      return
    }

    setLoadingAirlines(true)
    try {
      const airlinesData = await fetchAirlines(query, 20)
      setAirlines(airlinesData)
    } catch (error) {
      console.error('Error searching airlines:', error)
      toast.error('Failed to search airlines')
      setAirlines([])
    } finally {
      setLoadingAirlines(false)
    }
  }, [])

  // Debounced airline search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (airlineSearch) {
        searchAirlines(airlineSearch)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [airlineSearch, searchAirlines])

  // Validate MSN
  const handleMSNValidation = async (msn: string) => {
    if (!msn || msn.length < 3) {
      setMsnValidation(null)
      return
    }

    setValidatingMSN(true)
    try {
      const result = await validateMSN(msn)
      setMsnValidation({
        valid: result.success,
        message: result.success 
          ? `✓ Valid MSN${result.data?.source ? ` (verified via ${result.data.source})` : ''}` 
          : result.error || 'Invalid MSN format'
      })
    } catch (error) {
      setMsnValidation({
        valid: false,
        message: 'MSN validation failed'
      })
    } finally {
      setValidatingMSN(false)
    }
  }

  // Form field update handler
  const updateField = (field: keyof AviationComplianceData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Validate required fields
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.obtainedFrom?.trim()) {
      errors.obtainedFrom = 'Source is required for aviation compliance'
    }

    if (!formData.originCountry) {
      errors.originCountry = 'Origin country is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Select airline handler
  const selectAirline = (airline: AirlineData) => {
    updateField('traceableToAirline', airline.airline_name)
    updateField('traceableToAirlineIATA', airline.iata_code)
    updateField('traceableToAirlineICAO', airline.icao_code)
    setAirlineSearchOpen(false)
    setAirlineSearch('')
  }

  // Select country handler
  const selectCountry = (country: { name: string; code: string }) => {
    updateField('originCountry', country.code)
    updateField('originCountryName', country.name)
    setCountrySearchOpen(false)
    setCountrySearch('')
  }

  // Filter countries for search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  ).slice(0, 10)

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Aviation Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Essential fields only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="obtainedFrom" className="text-xs">Source *</Label>
              <Input
                id="obtainedFrom"
                value={formData.obtainedFrom || ''}
                onChange={(e) => updateField('obtainedFrom', e.target.value)}
                placeholder="e.g., Delta Airlines, Boeing, etc."
                className={cn(
                  "h-8 text-xs",
                  validationErrors.obtainedFrom && "border-red-500"
                )}
              />
              {validationErrors.obtainedFrom && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.obtainedFrom}</p>
              )}
            </div>

            <div>
              <Label htmlFor="originCountry" className="text-xs">Origin Country *</Label>
              <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countrySearchOpen}
                    className={cn(
                      "w-full justify-between h-8 text-xs",
                      !formData.originCountry && "text-muted-foreground",
                      validationErrors.originCountry && "border-red-500"
                    )}
                  >
                    {formData.originCountryName || formData.originCountry || "Select country..."}
                    <MapPin className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search countries..." 
                      value={countrySearch}
                      onValueChange={setCountrySearch}
                    />
                    <CommandEmpty>
                      {loadingCountries ? (
                        <div className="flex items-center gap-2 p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading countries...
                        </div>
                      ) : (
                        "No countries found."
                      )}
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {filteredCountries.map((country) => (
                        <CommandItem
                          key={country.code}
                          value={country.name}
                          onSelect={() => selectCountry(country)}
                        >
                          <CheckCircle
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.originCountry === country.code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{country.name}</span>
                          <Badge variant="outline" className="text-xs">{country.code}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {validationErrors.originCountry && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.originCountry}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Basic Compliance Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Aviation Compliance Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source and Origin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="obtainedFrom">Obtained From *</Label>
              <Input
                id="obtainedFrom"
                value={formData.obtainedFrom || ''}
                onChange={(e) => updateField('obtainedFrom', e.target.value)}
                placeholder="e.g., Delta Airlines, Boeing, Lufthansa Technik"
                className={cn(
                  validationErrors.obtainedFrom && "border-red-500"
                )}
              />
              {validationErrors.obtainedFrom && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.obtainedFrom}</p>
              )}
            </div>

            <div>
              <Label htmlFor="originCountry">Origin Country *</Label>
              <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countrySearchOpen}
                    className={cn(
                      "w-full justify-between",
                      !formData.originCountry && "text-muted-foreground",
                      validationErrors.originCountry && "border-red-500"
                    )}
                  >
                    {formData.originCountryName || formData.originCountry || "Select country..."}
                    <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search countries..." 
                      value={countrySearch}
                      onValueChange={setCountrySearch}
                    />
                    <CommandEmpty>
                      {loadingCountries ? (
                        <div className="flex items-center gap-2 p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading countries...
                        </div>
                      ) : (
                        "No countries found."
                      )}
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {filteredCountries.map((country) => (
                        <CommandItem
                          key={country.code}
                          value={country.name}
                          onSelect={() => selectCountry(country)}
                        >
                          <CheckCircle
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.originCountry === country.code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{country.name}</span>
                          <Badge variant="outline">{country.code}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {validationErrors.originCountry && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.originCountry}</p>
              )}
            </div>
          </div>

          {/* End Use and Intended Use */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endUse">End Use</Label>
              <Input
                id="endUse"
                value={formData.endUse || ''}
                onChange={(e) => updateField('endUse', e.target.value)}
                placeholder="e.g., Commercial aviation, Military, General aviation"
              />
            </div>

            <div>
              <Label htmlFor="intendedUse">Intended Use</Label>
              <Select
                value={formData.intendedUse || ''}
                onValueChange={(value) => updateField('intendedUse', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select intended use..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="overhaul">Overhaul</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traceability Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Traceability Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Airline Selection */}
          <div>
            <Label>Traceable to Airline</Label>
            <Popover open={airlineSearchOpen} onOpenChange={setAirlineSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={airlineSearchOpen}
                  className={cn(
                    "w-full justify-between",
                    !formData.traceableToAirline && "text-muted-foreground"
                  )}
                >
                  {formData.traceableToAirline || "Search airlines..."}
                  <Plane className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search airlines by name or code..." 
                    value={airlineSearch}
                    onValueChange={setAirlineSearch}
                  />
                  <CommandEmpty>
                    {loadingAirlines ? (
                      <div className="flex items-center gap-2 p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching airlines...
                      </div>
                    ) : (
                      "No airlines found. Try searching with airline name or code."
                    )}
                  </CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {airlines.map((airline) => (
                      <CommandItem
                        key={airline.airline_id}
                        value={airline.airline_name}
                        onSelect={() => selectAirline(airline)}
                      >
                        <CheckCircle
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.traceableToAirline === airline.airline_name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{airline.airline_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {airline.country_name}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline">{airline.iata_code}</Badge>
                          <Badge variant="outline">{airline.icao_code}</Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            {/* Show selected airline details */}
            {formData.traceableToAirline && (
              <div className="mt-2 flex gap-2">
                {formData.traceableToAirlineIATA && (
                  <Badge variant="secondary">IATA: {formData.traceableToAirlineIATA}</Badge>
                )}
                {formData.traceableToAirlineICAO && (
                  <Badge variant="secondary">ICAO: {formData.traceableToAirlineICAO}</Badge>
                )}
              </div>
            )}
          </div>

          {/* MSN and Registration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="traceableToMSN">Manufacturer Serial Number (MSN)</Label>
              <div className="relative">
                <Input
                  id="traceableToMSN"
                  value={formData.traceableToMSN || ''}
                  onChange={(e) => {
                    updateField('traceableToMSN', e.target.value)
                    handleMSNValidation(e.target.value)
                  }}
                  placeholder="e.g., MSN123456, B1234, A380001"
                  className={cn(
                    validatingMSN && "pr-8",
                    msnValidation?.valid === false && "border-red-500",
                    msnValidation?.valid === true && "border-green-500"
                  )}
                />
                {validatingMSN && (
                  <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />
                )}
              </div>
              {msnValidation && (
                <div className={cn(
                  "mt-1 text-sm flex items-center gap-1",
                  msnValidation.valid ? "text-green-600" : "text-red-600"
                )}>
                  {msnValidation.valid ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {msnValidation.message}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="traceableToRegistration">Aircraft Registration</Label>
              <Input
                id="traceableToRegistration"
                value={formData.traceableToRegistration || ''}
                onChange={(e) => updateField('traceableToRegistration', e.target.value)}
                placeholder="e.g., N123AB, D-ABCD, G-ABCD"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificate Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastCertificate">Last Certificate Type</Label>
              <Input
                id="lastCertificate"
                value={formData.lastCertificate || ''}
                onChange={(e) => updateField('lastCertificate', e.target.value)}
                placeholder="e.g., FAA 8130-3, EASA Form One"
              />
            </div>

            <div>
              <Label htmlFor="certificateAuthority">Certificate Authority</Label>
              <Input
                id="certificateAuthority"
                value={formData.certificateAuthority || ''}
                onChange={(e) => updateField('certificateAuthority', e.target.value)}
                placeholder="e.g., FAA, EASA, CAA"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="certificateNumber">Certificate Number</Label>
              <Input
                id="certificateNumber"
                value={formData.certificateNumber || ''}
                onChange={(e) => updateField('certificateNumber', e.target.value)}
                placeholder="Certificate reference number"
              />
            </div>

            <div>
              <Label htmlFor="certificateExpiry">Certificate Expiry</Label>
              <Input
                id="certificateExpiry"
                type="date"
                value={formData.certificateExpiry || ''}
                onChange={(e) => updateField('certificateExpiry', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Fields */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partCondition">Part Condition</Label>
                <Select
                  value={formData.partCondition || ''}
                  onValueChange={(value) => updateField('partCondition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                    <SelectItem value="ar">As Removed (AR)</SelectItem>
                    <SelectItem value="serviceable">Serviceable</SelectItem>
                    <SelectItem value="unserviceable">Unserviceable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="qualitySystemStandard">Quality System Standard</Label>
                <Select
                  value={formData.qualitySystemStandard || ''}
                  onValueChange={(value) => updateField('qualitySystemStandard', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select standard..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AS9100">AS9100</SelectItem>
                    <SelectItem value="AS9110">AS9110</SelectItem>
                    <SelectItem value="AS9120">AS9120</SelectItem>
                    <SelectItem value="ISO9001">ISO 9001</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors:
            <ul className="mt-2 list-disc list-inside">
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}