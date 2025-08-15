'use client'

import { supabase as supabaseClient } from '@/lib/supabase/client'

export interface PartNumberModification {
  id: string
  currentPartNumber: string
  newPartNumber: string
  newDescription?: string
  reason: string
  effectiveDate: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requestedBy: string
  requestedAt: string
  approvedBy?: string
  approvedAt?: string
  completedAt?: string
  notes?: string
}

export interface InventoryImpactAnalysis {
  totalRecords: number
  recordsAffected: {
    id: string
    serial_number: string
    quantity: number
    condition: string
    location?: string
    status: string
    last_updated: string
  }[]
  relatedOrders: {
    type: 'purchase' | 'sales' | 'repair'
    orderId: string
    orderNumber: string
    status: string
    lineItems: number
  }[]
  estimatedUpdateTime: number // in seconds
  potentialConflicts: {
    type: 'duplicate_part_number' | 'active_orders' | 'reserved_inventory'
    description: string
    severity: 'low' | 'medium' | 'high'
    affectedRecords: number
  }[]
}

export interface BatchModificationRequest {
  modifications: {
    currentPartNumber: string
    newPartNumber: string
    newDescription?: string
    reason: string
  }[]
  effectiveDate: string
  requestedBy: string
  batchNotes?: string
}

export interface PartNumberUpdateResult {
  success: boolean
  modificationId: string
  recordsUpdated: {
    inventory: number
    purchaseOrders: number
    salesOrders: number
    repairOrders: number
  }
  errors?: {
    table: string
    recordId: string
    error: string
  }[]
  completedAt: string
}

/**
 * Service class for advanced part number modification with automatic inventory updates
 */
export class PartNumberModificationService {
  private supabase = supabaseClient

  /**
   * Analyze the impact of changing a part number
   */
  async analyzeImpact(currentPartNumber: string, newPartNumber: string): Promise<InventoryImpactAnalysis> {
    try {
      // Check for existing part number conflicts
      const { data: existingPart } = await this.supabase
        .from('pn_master_table')
        .select('pn, description')
        .eq('pn', newPartNumber)
        .single()

      const conflicts: InventoryImpactAnalysis['potentialConflicts'] = []
      
      if (existingPart) {
        conflicts.push({
          type: 'duplicate_part_number',
          description: `Part number ${newPartNumber} already exists in the system`,
          severity: 'high',
          affectedRecords: 1
        })
      }

      // Analyze inventory records
      const { data: inventoryRecords, error: inventoryError } = await this.supabase
        .from('inventory')
        .select(`
          inventory_id,
          serial_number,
          quantity,
          condition,
          location,
          business_status,
          physical_status,
          updated_at,
          pn_master_table!inner (pn)
        `)
        .eq('pn_master_table.pn', currentPartNumber)

      if (inventoryError) {
        throw new Error(`Failed to analyze inventory: ${inventoryError.message}`)
      }

      // Check for reserved or sold inventory
      const reservedCount = inventoryRecords?.filter(record => 
        record.business_status === 'reserved' || record.business_status === 'sold'
      ).length || 0

      if (reservedCount > 0) {
        conflicts.push({
          type: 'reserved_inventory',
          description: `${reservedCount} inventory records are reserved or sold`,
          severity: 'medium',
          affectedRecords: reservedCount
        })
      }

      // Analyze related orders
      const relatedOrders: InventoryImpactAnalysis['relatedOrders'] = []

      // Check purchase orders
      const { data: purchaseOrders } = await this.supabase
        .from('po_items')
        .select(`
          purchase_orders (
            po_id,
            po_number,
            status
          ),
          inventory!inner (
            pn_master_table!inner (pn)
          )
        `)
        .eq('inventory.pn_master_table.pn', currentPartNumber)
        .in('purchase_orders.status', ['pending', 'confirmed', 'partial'])

      purchaseOrders?.forEach(item => {
        if (item.purchase_orders) {
          relatedOrders.push({
            type: 'purchase',
            orderId: item.purchase_orders.po_id,
            orderNumber: item.purchase_orders.po_number,
            status: item.purchase_orders.status || 'unknown',
            lineItems: 1
          })
        }
      })

      // Check sales orders
      const { data: salesOrders } = await this.supabase
        .from('sales_order_items')
        .select(`
          sales_orders (
            sales_order_id,
            invoice_number,
            status
          ),
          inventory!inner (
            pn_master_table!inner (pn)
          )
        `)
        .eq('inventory.pn_master_table.pn', currentPartNumber)
        .in('sales_orders.status', ['pending', 'confirmed', 'partial'])

      salesOrders?.forEach(item => {
        if (item.sales_orders) {
          relatedOrders.push({
            type: 'sales',
            orderId: item.sales_orders.sales_order_id,
            orderNumber: item.sales_orders.invoice_number,
            status: item.sales_orders.status || 'unknown',
            lineItems: 1
          })
        }
      })

      // Check for active orders
      if (relatedOrders.length > 0) {
        conflicts.push({
          type: 'active_orders',
          description: `${relatedOrders.length} active orders reference this part number`,
          severity: 'high',
          affectedRecords: relatedOrders.length
        })
      }

      // Estimate update time (rough calculation)
      const totalRecords = (inventoryRecords?.length || 0) + relatedOrders.length
      const estimatedUpdateTime = Math.max(5, totalRecords * 0.5) // Minimum 5 seconds

      return {
        totalRecords: inventoryRecords?.length || 0,
        recordsAffected: inventoryRecords?.map(record => ({
          id: record.inventory_id,
          serial_number: record.serial_number || 'N/A',
          quantity: record.quantity || 0,
          condition: record.condition || 'Unknown',
          location: record.location || undefined,
          status: `${record.business_status}/${record.physical_status}`,
          last_updated: record.updated_at || 'Unknown'
        })) || [],
        relatedOrders,
        estimatedUpdateTime,
        potentialConflicts: conflicts
      }

    } catch (error) {
      console.error('Impact analysis error:', error)
      throw new Error(`Failed to analyze impact: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a new part number modification request
   */
  async createModificationRequest(
    currentPartNumber: string,
    newPartNumber: string,
    newDescription: string | undefined,
    reason: string,
    effectiveDate: string,
    requestedBy: string,
    notes?: string
  ): Promise<PartNumberModification> {
    try {
      // First, run impact analysis to validate the request
      const impact = await this.analyzeImpact(currentPartNumber, newPartNumber)
      
      // Check for high-severity conflicts
      const highSeverityConflicts = impact.potentialConflicts.filter(c => c.severity === 'high')
      if (highSeverityConflicts.length > 0) {
        throw new Error(`Cannot create modification due to conflicts: ${highSeverityConflicts.map(c => c.description).join(', ')}`)
      }

      // First, we need to get or create part number IDs for the mapping
      // Since this requires inventory_id and proper pn_ids, and the current
      // implementation appears to be a placeholder, we'll throw an error
      // indicating this feature needs proper implementation
      throw new Error('Part number modification feature requires proper database schema implementation. Please implement the necessary tables and relationships first.')

    } catch (error) {
      console.error('Modification request creation error:', error)
      throw error
    }
  }

  /**
   * Approve a part number modification request
   */
  async approveModification(
    modificationId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<PartNumberModification> {
    try {
      // Update the part_number_history record with approval
      const { data, error } = await this.supabase
        .from('part_number_history')
        .update({
          approved_by_user_id: approvedBy,
          approval_date: new Date().toISOString(),
          traceability_notes: approvalNotes
        })
        .eq('history_id', modificationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to approve modification: ${error.message}`)
      }

      if (!data) {
        throw new Error('No modification record found to approve')
      }

      return {
        id: data.history_id,
        currentPartNumber: data.original_pn_id || '',
        newPartNumber: data.modified_pn_id || '',
        newDescription: '',
        reason: data.modification_reason,
        effectiveDate: data.modification_date,
        status: 'approved',
        requestedBy: data.modified_by_user_id || '',
        requestedAt: data.created_at || '',
        approvedBy: data.approved_by_user_id || undefined,
        approvedAt: data.approval_date || undefined,
        notes: data.traceability_notes || undefined
      }

    } catch (error) {
      console.error('Modification approval error:', error)
      throw error
    }
  }

  /**
   * Execute approved part number modification with automatic inventory updates
   */
  async executeModification(modificationId: string): Promise<PartNumberUpdateResult> {
    try {
      // Get the approved modification from part_number_history
      const { data: modification, error: modError } = await this.supabase
        .from('part_number_history')
        .select('*')
        .eq('history_id', modificationId)
        .not('approved_by_user_id', 'is', null)
        .single()

      if (modError || !modification) {
        throw new Error('Modification not found or not approved')
      }

      const result: PartNumberUpdateResult = {
        success: false,
        modificationId,
        recordsUpdated: {
          inventory: 0,
          purchaseOrders: 0,
          salesOrders: 0,
          repairOrders: 0
        },
        errors: [],
        completedAt: new Date().toISOString()
      }

      // This function requires a more complete implementation
      // as the current schema doesn't fully support the required operations
      throw new Error('Part number modification execution requires additional database schema implementation.')

    } catch (error) {
      console.error('Modification execution error:', error)
      throw error
    }
  }

  /**
   * Process batch modifications
   */
  async processBatchModifications(batchRequest: BatchModificationRequest): Promise<{
    batchId: string
    individualResults: PartNumberModification[]
    summary: {
      total: number
      successful: number
      failed: number
      errors: string[]
    }
  }> {
    try {
      const batchId = `batch-${Date.now()}`
      const results: PartNumberModification[] = []
      const errors: string[] = []

      // Create individual modification requests
      for (const mod of batchRequest.modifications) {
        try {
          const result = await this.createModificationRequest(
            mod.currentPartNumber,
            mod.newPartNumber,
            mod.newDescription,
            mod.reason,
            batchRequest.effectiveDate,
            batchRequest.requestedBy,
            `Batch: ${batchId}`
          )
          
          results.push(result)
        } catch (error) {
          const errorMsg = `Failed to create modification for ${mod.currentPartNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
        }
      }

      // Batch record creation requires additional database schema implementation

      return {
        batchId,
        individualResults: results,
        summary: {
          total: batchRequest.modifications.length,
          successful: results.length,
          failed: errors.length,
          errors
        }
      }

    } catch (error) {
      console.error('Batch processing error:', error)
      throw error
    }
  }

  /**
   * Get modification history for a part number
   */
  async getModificationHistory(partNumber: string): Promise<PartNumberModification[]> {
    try {
      // Getting modification history requires proper field mapping
      // The current part_number_history schema doesn't match the expected interface
      throw new Error('Modification history retrieval requires proper schema mapping implementation.')

    } catch (error) {
      console.error('History retrieval error:', error)
      throw error
    }
  }

  /**
   * Search for parts that need modification (based on various criteria)
   */
  async searchPartsForModification(criteria: {
    partNumberPattern?: string
    descriptionPattern?: string
    hasInventory?: boolean
    hasActiveOrders?: boolean
    lastModifiedBefore?: string
    limit?: number
  }): Promise<{
    partNumber: string
    description: string
    inventoryCount: number
    lastModified: string
    activeOrders: number
    modificationHistory: number
  }[]> {
    try {
      let query = this.supabase
        .from('pn_master_table')
        .select(`
          pn,
          description,
          updated_at,
          inventory (count),
          part_number_modifications!current_part_number (count)
        `)

      if (criteria.partNumberPattern) {
        query = query.ilike('pn', `%${criteria.partNumberPattern}%`)
      }

      if (criteria.descriptionPattern) {
        query = query.ilike('description', `%${criteria.descriptionPattern}%`)
      }

      if (criteria.lastModifiedBefore) {
        query = query.lt('updated_at', criteria.lastModifiedBefore)
      }

      query = query.limit(criteria.limit || 50)

      const { data, error } = await query

      if (error) {
        throw new Error(`Search failed: ${error.message}`)
      }

      // This is a simplified version - in practice, you'd need more complex queries
      // to get accurate counts for active orders and other related data
      return data?.map(item => ({
        partNumber: item.pn,
        description: item.description || '',
        inventoryCount: Array.isArray(item.inventory) ? item.inventory.length : 0,
        lastModified: item.updated_at || '',
        activeOrders: 0, // Would need separate query
        modificationHistory: Array.isArray(item.part_number_modifications) ? item.part_number_modifications.length : 0
      })) || []

    } catch (error) {
      console.error('Part search error:', error)
      throw error
    }
  }
}