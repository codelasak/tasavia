import { UseFormReturn } from 'react-hook-form'

/**
 * Extracts vendor company name from company data
 * Returns only the company name for Obtained From field
 */
export function extractVendorCompanyName(vendorCompany: { company_name?: string }): string {
  if (!vendorCompany?.company_name) {
    return ''
  }

  return vendorCompany.company_name
}

/**
 * Populates all line items' traceability_source field with vendor company name
 * Only updates empty fields or fields that contain vendor-specific data
 * Preserves manual entries that don't match vendor pattern
 */
export function populateObtainedFromWithVendorName<T extends { items: any[] }>(
  form: UseFormReturn<T>,
  vendorName: string
): void {
  if (!vendorName) return

  const currentItems = form.getValues('items') || []

  currentItems.forEach((item, index) => {
    const currentValue = item.traceability_source || ''

    // Only populate if field is empty
    if (!currentValue) {
      form.setValue(`items.${index}.traceability_source` as any, vendorName, {
        shouldValidate: true,
        shouldDirty: true
      })
    }
  })
}

/**
 * Checks if a traceability_source value appears to be vendor-generated
 * (contains only company name without additional details)
 */
export function isVendorGeneratedTraceability(value: string): boolean {
  return value.length > 0 && !value.includes(' - ') && !value.includes(',')
}