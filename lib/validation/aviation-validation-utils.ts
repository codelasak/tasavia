/**
 * Enhanced Aviation Validation Utilities
 * Reusable validation functions with business rules and performance monitoring
 */

// Performance monitoring for validation
const validationTimes = new Map<string, number[]>()

/**
 * Performance tracker for validation functions
 */
function trackValidationPerformance<T>(
  validationType: string, 
  validationFn: () => T
): T {
  const startTime = performance.now()
  const result = validationFn()
  const endTime = performance.now()
  const duration = endTime - startTime

  // Store performance metrics
  if (!validationTimes.has(validationType)) {
    validationTimes.set(validationType, [])
  }
  const times = validationTimes.get(validationType)!
  times.push(duration)
  
  // Keep only last 100 measurements
  if (times.length > 100) {
    times.shift()
  }

  // Warn if validation takes longer than 100ms
  if (duration > 100) {
    console.warn(`Validation ${validationType} took ${duration.toFixed(2)}ms (>100ms threshold)`)
  }

  return result
}

/**
 * Get validation performance statistics
 */
export function getValidationStats(): Record<string, { avg: number; max: number; count: number }> {
  const stats: Record<string, { avg: number; max: number; count: number }> = {}
  
  for (const [type, times] of validationTimes.entries()) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const max = Math.max(...times)
    stats[type] = { avg, max, count: times.length }
  }
  
  return stats
}

/**
 * Enhanced AWB number validation with airline-specific rules
 */
export function validateAWBNumber(awbNumber: string, carrier?: string): {
  isValid: boolean
  message: string
  suggestions?: string[]
} {
  return trackValidationPerformance('awb_validation', () => {
    if (!awbNumber || awbNumber.trim().length === 0) {
      return { isValid: true, message: '' } // Optional field
    }

    const trimmed = awbNumber.trim().toUpperCase()

    // Basic format validation
    const basicPattern = /^[0-9]{3}-?[0-9]{8}$/
    if (!basicPattern.test(trimmed)) {
      return {
        isValid: false,
        message: 'AWB format should be: 3-digit airline code + 8-digit number (e.g., 020-12345678)',
        suggestions: ['020-12345678', '176-87654321']
      }
    }

    // Carrier-specific validation
    if (carrier) {
      const suggestions: string[] = []
      switch (carrier.toUpperCase()) {
        case 'FEDEX':
          if (!trimmed.startsWith('006')) {
            suggestions.push('006-12345678')
            return {
              isValid: false,
              message: 'FedEx AWB numbers should start with 006',
              suggestions
            }
          }
          break
        case 'DHL':
          if (!trimmed.startsWith('057')) {
            suggestions.push('057-12345678')
            return {
              isValid: false,
              message: 'DHL AWB numbers should start with 057',
              suggestions
            }
          }
          break
        case 'TURKISH_AIRLINES':
          if (!trimmed.startsWith('235')) {
            suggestions.push('235-12345678')
            return {
              isValid: false,
              message: 'Turkish Airlines AWB numbers should start with 235',
              suggestions
            }
          }
          break
        case 'LUFTHANSA':
          if (!trimmed.startsWith('020')) {
            suggestions.push('020-12345678')
            return {
              isValid: false,
              message: 'Lufthansa AWB numbers should start with 020',
              suggestions
            }
          }
          break
      }
    }

    return {
      isValid: true,
      message: '✓ Valid AWB format'
    }
  })
}

/**
 * Enhanced dimension validation with standard formats
 */
export function validateDimensions(dimensions: string): {
  isValid: boolean
  message: string
  parsedDimensions?: {
    quantity: number
    unit: string
    type: string
    length?: number
    width?: number
    height?: number
    unitOfMeasure?: string
  }
} {
  return trackValidationPerformance('dimensions_validation', () => {
    if (!dimensions || dimensions.trim().length === 0) {
      return { isValid: true, message: '' } // Optional field
    }

    const trimmed = dimensions.trim().toUpperCase()

    // Standard aviation packaging formats
    const patterns = [
      // "1 EA BOX 12x8x6 inches"
      /^(\d+)\s+(EA|EACH|PCS?|PIECES?)\s+(BOX|CRATE|PALLET|BAG|CONTAINER)\s+(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\s+(IN|INCHES?|CM|CENTIMETERS?|MM|MILLIMETERS?)$/,
      // "2 BOXES 10x10x10 CM"
      /^(\d+)\s+(BOXES?|CRATES?|PALLETS?|BAGS?|CONTAINERS?)\s+(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\s+(IN|INCHES?|CM|CENTIMETERS?|MM|MILLIMETERS?)$/,
      // "1 EA 12x8x6"
      /^(\d+)\s+(EA|EACH|PCS?|PIECES?)\s+(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/,
    ]

    for (const pattern of patterns) {
      const match = trimmed.match(pattern)
      if (match) {
        const [, quantity, unit, lengthOrType, widthOrLength, heightOrWidth, unitOfMeasureOrHeight, unitOfMeasure] = match
        
        // Determine if it's format 1 or 2
        const isFormat1 = match.length === 8 // Has type (BOX, CRATE, etc.)
        
        const parsed = {
          quantity: parseInt(quantity),
          unit: unit.toLowerCase(),
          type: isFormat1 ? lengthOrType.toLowerCase() : 'package',
          length: parseFloat(isFormat1 ? widthOrLength : lengthOrType),
          width: parseFloat(isFormat1 ? heightOrWidth : widthOrLength),
          height: parseFloat(isFormat1 ? unitOfMeasureOrHeight : heightOrWidth),
          unitOfMeasure: isFormat1 ? unitOfMeasure?.toLowerCase() : unitOfMeasureOrHeight?.toLowerCase()
        }

        return {
          isValid: true,
          message: `✓ Valid format: ${parsed.quantity} ${parsed.unit} ${parsed.type}${parsed.unitOfMeasure ? ` (${parsed.length}x${parsed.width}x${parsed.height} ${parsed.unitOfMeasure})` : ''}`,
          parsedDimensions: parsed
        }
      }
    }

    return {
      isValid: false,
      message: 'Use format: "1 EA BOX 12x8x6 inches" or "2 BOXES 10x10x10 CM"',
    }
  })
}

/**
 * Weight consistency validation
 */
export function validateWeightConsistency(
  weightLbs?: number, 
  weightKgs?: number
): {
  isValid: boolean
  message: string
  suggestedConversion?: string
} {
  return trackValidationPerformance('weight_consistency', () => {
    if (!weightLbs && !weightKgs) {
      return { isValid: true, message: '' } // Both optional
    }

    if (weightLbs && weightKgs) {
      // Check if conversion is approximately correct (1 lb = 0.453592 kg)
      const convertedKgs = weightLbs * 0.453592
      const tolerance = 0.1 // 10% tolerance for rounding
      const difference = Math.abs(convertedKgs - weightKgs)
      const percentDiff = (difference / weightKgs) * 100

      if (percentDiff > tolerance * 100) {
        const suggestedKgs = convertedKgs.toFixed(2)
        const suggestedLbs = (weightKgs / 0.453592).toFixed(2)
        
        return {
          isValid: false,
          message: `Weight conversion mismatch. ${weightLbs} lbs ≈ ${suggestedKgs} kg`,
          suggestedConversion: `Use ${weightLbs} lbs / ${suggestedKgs} kg OR ${suggestedLbs} lbs / ${weightKgs} kg`
        }
      }

      return {
        isValid: true,
        message: '✓ Weight conversion is consistent'
      }
    }

    // Only one weight provided - suggest conversion
    if (weightLbs) {
      const suggestedKgs = (weightLbs * 0.453592).toFixed(2)
      return {
        isValid: true,
        message: 'Consider adding weight in kg',
        suggestedConversion: `${weightLbs} lbs = ${suggestedKgs} kg`
      }
    }

    if (weightKgs) {
      const suggestedLbs = (weightKgs / 0.453592).toFixed(2)
      return {
        isValid: true,
        message: 'Consider adding weight in lbs',
        suggestedConversion: `${weightKgs} kg = ${suggestedLbs} lbs`
      }
    }

    return { isValid: true, message: '' }
  })
}

/**
 * Aviation compliance business rules
 */
export function validateAviationBusinessRules(data: {
  last_certificate?: string
  obtained_from?: string
  certificate_reference_number?: string
  traceable_to_airline?: string
  traceable_to_msn?: string
  airworthiness_status?: string
}): {
  isValid: boolean
  messages: string[]
  warnings: string[]
} {
  return trackValidationPerformance('aviation_business_rules', () => {
    const messages: string[] = []
    const warnings: string[] = []

    // Rule 1: If any certificate field is filled, others should be too
    const certificateFields = [data.last_certificate, data.obtained_from, data.certificate_reference_number]
    const filledCertFields = certificateFields.filter(field => field && field.trim().length > 0)
    
    if (filledCertFields.length > 0 && filledCertFields.length < certificateFields.length) {
      warnings.push('For complete compliance, provide all certificate information (type, source, reference)')
    }

    // Rule 2: If traceability is provided, both airline and MSN should be present
    const hasAirline = data.traceable_to_airline && data.traceable_to_airline.trim().length > 0
    const hasMSN = data.traceable_to_msn && data.traceable_to_msn.trim().length > 0
    
    if (hasAirline && !hasMSN) {
      warnings.push('Consider adding MSN for complete traceability when airline is specified')
    }
    if (hasMSN && !hasAirline) {
      warnings.push('Consider adding airline for complete traceability when MSN is specified')
    }

    // Rule 3: Airworthiness status validation
    if (data.airworthiness_status === 'NON-AIRWORTHY' && filledCertFields.length > 0) {
      warnings.push('Non-airworthy parts typically don\'t have active certificates')
    }

    // Rule 4: MSN format validation
    if (hasMSN) {
      const msnPattern = /^[A-Z0-9\-]{3,20}$/i
      if (!msnPattern.test(data.traceable_to_msn!)) {
        messages.push('MSN format appears invalid - should be alphanumeric with dashes only')
      }
    }

    return {
      isValid: messages.length === 0,
      messages,
      warnings
    }
  })
}

/**
 * Form field highlighting helper
 */
export function getFieldValidationStyle(
  isValid: boolean | null,
  isRequired: boolean,
  hasValue: boolean
): string {
  if (isValid === false) {
    return 'border-red-500 focus:border-red-600'
  }
  if (isValid === true) {
    return 'border-green-500 focus:border-green-600'
  }
  if (isRequired && !hasValue) {
    return 'border-yellow-400 focus:border-yellow-500'
  }
  return ''
}

/**
 * Clear validation performance data
 */
export function clearValidationStats(): void {
  validationTimes.clear()
}

// Export types
export interface ValidationResult {
  isValid: boolean
  message: string
  suggestions?: string[]
}

export interface ValidationStats {
  avg: number
  max: number
  count: number
}