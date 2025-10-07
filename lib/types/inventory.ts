// Enhanced inventory types for dual status system

export type PhysicalStatus = 'depot' | 'in_repair' | 'in_transit'
export type BusinessStatus = 'available' | 'reserved' | 'sold' | 'cancelled'

// Legacy status values for backward compatibility
export type LegacyStatus = 'Available' | 'Reserved' | 'Sold' | 'Damaged' | 'Under Repair' | 'Cancelled'

export interface InventoryItemBase {
  inventory_id: string
  pn_id: string
  serial_number: string | null
  condition: string | null
  location: string | null
  quantity: number | null
  unit_cost: number | null
  total_value: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  
  // Legacy status field (maintained for backward compatibility)
  status: string
  
  // New dual status fields
  physical_status: PhysicalStatus
  business_status: BusinessStatus
  status_updated_at: string | null
  status_updated_by: string | null
  
  // Aviation compliance fields
  application_code: string | null
  certificate_date: string | null
  certificate_reference: string | null
  country_of_origin: string | null
  dimensions: string | null
  last_certified_agency: string | null
  last_updated: string | null
  obtained_from: string | null
  part_status_certification: string | null
  po_id_original: string | null
  po_number_original: string | null
  po_price: number | null
  remarks: string | null
  traceability_source: string | null
  traceable_to: string | null
  weight: number | null
}

export interface InventoryItemWithRelations extends InventoryItemBase {
  pn_master_table: {
    pn: string
    description: string | null
  }
  accounts?: {
    name: string | null
  }
}

export interface PartNumberHistory {
  history_id: string
  inventory_id: string
  original_pn_id: string
  modified_pn_id: string
  modification_reason: string
  modification_date: string
  traceability_notes: string | null
  business_value_adjustment: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  modified_by_user_id: string | null
  approved_by_user_id: string | null
  approval_date: string | null
  repair_order_id: string | null
}

export interface PartNumberHistoryWithRelations extends PartNumberHistory {
  modified_by?: {
    name: string | null
  }
  approved_by?: {
    name: string | null
  }
  original_pn?: {
    pn: string
    description: string | null
  }
  modified_pn?: {
    pn: string
    description: string | null
  }
  repair_orders?: {
    repair_order_number: string
    status: string | null
  }
}

// API Response types
export interface DualStatusResponse {
  success: boolean
  data: InventoryItemWithRelations[]
  count: number
}

export interface StatusUpdateResponse {
  success: boolean
  message: string
  data: InventoryItemWithRelations
  changes: {
    physical_status_changed: boolean
    business_status_changed: boolean
    previous_physical_status: PhysicalStatus
    previous_business_status: BusinessStatus
    new_physical_status: PhysicalStatus
    new_business_status: BusinessStatus
  }
}

export interface BulkStatusUpdateResponse {
  success: boolean
  message: string
  data: {
    updated_items: InventoryItemWithRelations[]
    update_summary: {
      total_requested: number
      total_updated: number
      physical_status_applied?: PhysicalStatus
      business_status_applied?: BusinessStatus
      updated_by?: string
      timestamp: string
    }
  }
}

export interface StatusHistoryResponse {
  success: boolean
  current_item: InventoryItemWithRelations
  status_history: PartNumberHistoryWithRelations[]
  pagination: {
    limit: number
    offset: number
    total: number
    has_more: boolean
  }
}

// Status update request types
export interface StatusUpdateRequest {
  inventory_id: string
  physical_status?: PhysicalStatus
  business_status?: BusinessStatus
  status_updated_by?: string
  notes?: string
}

export interface BulkStatusUpdateRequest {
  inventory_ids: string[]
  physical_status?: PhysicalStatus
  business_status?: BusinessStatus
  status_updated_by?: string
  notes?: string
}

export interface PartNumberModificationRequest {
  inventory_id: string
  original_pn_id: string
  modified_pn_id: string
  modification_reason: string
  traceability_notes?: string
  business_value_adjustment?: number
  modified_by_user_id?: string
  repair_order_id?: string
}

// Validation types
export interface StatusTransitionValidation {
  valid: boolean
  reason?: string
}

export interface ValidationError {
  inventory_id: string
  part_number: string
  error: string
}

// Filter types for API queries
export interface InventoryFilters {
  inventory_id?: string
  physical_status?: PhysicalStatus
  business_status?: BusinessStatus
  condition?: string
  location?: string
  pn?: string
  serial_number?: string
  search?: string
  limit?: number
  offset?: number
}

// Utility types for status combinations
export interface StatusCombination {
  physical_status: PhysicalStatus
  business_status: BusinessStatus
  legacy_status?: LegacyStatus
  display_label?: string
  color_class?: string
}

// Common status combinations
export const COMMON_STATUS_COMBINATIONS: StatusCombination[] = [
  {
    physical_status: 'depot',
    business_status: 'available',
    legacy_status: 'Available',
    display_label: 'In Stock',
    color_class: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    physical_status: 'depot',
    business_status: 'reserved',
    legacy_status: 'Reserved',
    display_label: 'Reserved - In Stock',
    color_class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    physical_status: 'in_transit',
    business_status: 'sold',
    legacy_status: 'Sold',
    display_label: 'Sold - In Transit',
    color_class: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    physical_status: 'in_repair',
    business_status: 'available',
    legacy_status: 'Under Repair',
    display_label: 'In Repair - Available',
    color_class: 'bg-purple-100 text-purple-800 border-purple-200'
  }
]

// Helper functions
export function getStatusDisplayInfo(
  physicalStatus: PhysicalStatus,
  businessStatus: BusinessStatus
): StatusCombination {
  const found = COMMON_STATUS_COMBINATIONS.find(
    combo => combo.physical_status === physicalStatus && combo.business_status === businessStatus
  )
  
  if (found) {
    return found
  }
  
  // Return default combination
  return {
    physical_status: physicalStatus,
    business_status: businessStatus,
    display_label: `${businessStatus} - ${physicalStatus}`,
    color_class: 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function isValidStatusTransition(
  currentPhysical: PhysicalStatus,
  currentBusiness: BusinessStatus,
  newPhysical: PhysicalStatus,
  newBusiness: BusinessStatus
): StatusTransitionValidation {
  // Business rule: Can't sell items that are in repair
  if (newBusiness === 'sold' && newPhysical === 'in_repair') {
    return {
      valid: false,
      reason: 'Cannot mark items as sold while they are in repair'
    }
  }

  // Business rule: Can't move sold items physically
  if (currentBusiness === 'sold' && newPhysical !== currentPhysical) {
    return {
      valid: false,
      reason: 'Cannot change physical status of sold items'
    }
  }

  // Business rule: Reserved items should generally be at depot or in transit
  if (newBusiness === 'reserved' && newPhysical === 'in_repair') {
    return {
      valid: false,
      reason: 'Reserved items should not be in repair status'
    }
  }

  // Business rule: Can't transition from cancelled to other statuses (requires manual intervention)
  if (currentBusiness === 'cancelled' && newBusiness !== 'cancelled') {
    return {
      valid: false,
      reason: 'Cannot change status of cancelled items (requires manual intervention)'
    }
  }

  // Business rule: Can't cancel items that are sold or in transit
  if (newBusiness === 'cancelled' && (currentBusiness === 'sold' || currentPhysical === 'in_transit')) {
    return {
      valid: false,
      reason: 'Cannot cancel items that are sold or in transit'
    }
  }

  // Business rule: Can't cancel reserved items directly (must be unreserved first)
  if (newBusiness === 'cancelled' && currentBusiness === 'reserved') {
    return {
      valid: false,
      reason: 'Cannot cancel reserved items (must unreserve first)'
    }
  }

  return { valid: true }
}

// Helper function to check if an item can be cancelled
export function canCancelInventoryItem(
  physicalStatus: PhysicalStatus,
  businessStatus: BusinessStatus,
  legacyStatus?: string
): boolean {
  // Can cancel if: available + depot, or legacy status is 'Available'
  const isInStock = (businessStatus === 'available' && physicalStatus === 'depot') ||
                    legacyStatus === 'Available';

  // Cannot cancel if sold, reserved, in transit, or already cancelled
  const cannotCancel = businessStatus === 'sold' ||
                       businessStatus === 'reserved' ||
                       businessStatus === 'cancelled' ||
                       physicalStatus === 'in_transit' ||
                       legacyStatus === 'Cancelled';

  return isInStock && !cannotCancel;
}

// Helper function to check if an item can be deleted
export function canDeleteInventoryItem(
  physicalStatus: PhysicalStatus,
  businessStatus: BusinessStatus,
  legacyStatus?: string
): boolean {
  // Can delete ONLY if item is cancelled
  const canDelete = businessStatus === 'cancelled' ||
                    legacyStatus === 'Cancelled';

  // Cannot delete if sold, reserved, available, or in transit
  const cannotDelete = businessStatus === 'sold' ||
                      businessStatus === 'reserved' ||
                      businessStatus === 'available' ||
                      physicalStatus === 'in_transit' ||
                      legacyStatus === 'Available';

  return canDelete && !cannotDelete;
}
