import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Integration test for dual status system
// Note: These tests require a test database with the schema applied

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Skip integration tests if environment variables are not set
const skipIntegration = !supabaseUrl || !supabaseServiceKey

describe.skipIf(skipIntegration)('Dual Status Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let testInventoryId: string
  let testPnId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create test part number
    const { data: pnData, error: pnError } = await supabase
      .from('pn_master_table')
      .insert({
        pn: 'TEST-DUAL-STATUS-001',
        description: 'Test part for dual status testing'
      })
      .select('pn_id')
      .single()

    if (pnError) throw pnError
    testPnId = pnData.pn_id
  })

  afterAll(async () => {
    // Cleanup test data
    if (testInventoryId) {
      await supabase.from('inventory').delete().eq('inventory_id', testInventoryId)
    }
    if (testPnId) {
      await supabase.from('pn_master_table').delete().eq('pn_id', testPnId)
    }
  })

  beforeEach(async () => {
    // Create fresh inventory item for each test
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .insert({
        pn_id: testPnId,
        physical_status: 'depot',
        business_status: 'available',
        status: 'Available', // Legacy status
        quantity: 1,
        unit_cost: 100.00,
        total_value: 100.00,
        location: 'Test Location',
        condition: 'New'
      })
      .select('inventory_id')
      .single()

    if (inventoryError) throw inventoryError
    testInventoryId = inventoryData.inventory_id
  })

  describe('Database Schema', () => {
    it('should have dual status columns in inventory table', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('physical_status, business_status, status_updated_at, status_updated_by')
        .eq('inventory_id', testInventoryId)
        .single()

      expect(error).toBeNull()
      expect(data).toHaveProperty('physical_status')
      expect(data).toHaveProperty('business_status')
      expect(data).toHaveProperty('status_updated_at')
      expect(data).toHaveProperty('status_updated_by')
    })

    it('should enforce enum constraints', async () => {
      // Test invalid physical_status
      const { error: physicalError } = await supabase
        .from('inventory')
        .update({ physical_status: 'invalid_status' as any })
        .eq('inventory_id', testInventoryId)

      expect(physicalError).not.toBeNull()
      expect(physicalError?.message).toContain('invalid input value for enum')

      // Test invalid business_status
      const { error: businessError } = await supabase
        .from('inventory')
        .update({ business_status: 'invalid_status' as any })
        .eq('inventory_id', testInventoryId)

      expect(businessError).not.toBeNull()
      expect(businessError?.message).toContain('invalid input value for enum')
    })
  })

  describe('Status Updates', () => {
    it('should update physical status independently', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .update({ 
          physical_status: 'in_transit',
          status_updated_at: new Date().toISOString()
        })
        .eq('inventory_id', testInventoryId)
        .select('physical_status, business_status')
        .single()

      expect(error).toBeNull()
      expect(data.physical_status).toBe('in_transit')
      expect(data.business_status).toBe('available') // Unchanged
    })

    it('should update business status independently', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .update({ 
          business_status: 'reserved',
          status_updated_at: new Date().toISOString()
        })
        .eq('inventory_id', testInventoryId)
        .select('physical_status, business_status')
        .single()

      expect(error).toBeNull()
      expect(data.physical_status).toBe('depot') // Unchanged
      expect(data.business_status).toBe('reserved')
    })

    it('should update both statuses simultaneously', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .update({ 
          physical_status: 'in_transit',
          business_status: 'sold',
          status_updated_at: new Date().toISOString()
        })
        .eq('inventory_id', testInventoryId)
        .select('physical_status, business_status')
        .single()

      expect(error).toBeNull()
      expect(data.physical_status).toBe('in_transit')
      expect(data.business_status).toBe('sold')
    })

    it('should track status update timestamp', async () => {
      const beforeUpdate = new Date()
      
      const { data, error } = await supabase
        .from('inventory')
        .update({ 
          physical_status: 'in_repair',
          status_updated_at: new Date().toISOString()
        })
        .eq('inventory_id', testInventoryId)
        .select('status_updated_at')
        .single()

      expect(error).toBeNull()
      expect(data.status_updated_at).toBeDefined()
      
      const updateTime = new Date(data.status_updated_at!)
      expect(updateTime.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })
  })

  describe('Queries with Dual Status', () => {
    beforeEach(async () => {
      // Create multiple test inventory items with different statuses
      await supabase.from('inventory').insert([
        {
          pn_id: testPnId,
          physical_status: 'depot',
          business_status: 'available',
          status: 'Available',
          serial_number: 'SN001'
        },
        {
          pn_id: testPnId,
          physical_status: 'in_repair',
          business_status: 'available',
          status: 'Under Repair',
          serial_number: 'SN002'
        },
        {
          pn_id: testPnId,
          physical_status: 'in_transit',
          business_status: 'sold',
          status: 'Sold',
          serial_number: 'SN003'
        }
      ])
    })

    it('should query by physical status', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('serial_number, physical_status, business_status')
        .eq('pn_id', testPnId)
        .eq('physical_status', 'depot')

      expect(error).toBeNull()
      expect(data).toHaveLength(2) // Original + one from beforeEach
      expect(data?.every(item => item.physical_status === 'depot')).toBe(true)
    })

    it('should query by business status', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('serial_number, physical_status, business_status')
        .eq('pn_id', testPnId)
        .eq('business_status', 'sold')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0].business_status).toBe('sold')
      expect(data?.[0].serial_number).toBe('SN003')
    })

    it('should query by combined status', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('serial_number, physical_status, business_status')
        .eq('pn_id', testPnId)
        .eq('physical_status', 'in_repair')
        .eq('business_status', 'available')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0].physical_status).toBe('in_repair')
      expect(data?.[0].business_status).toBe('available')
      expect(data?.[0].serial_number).toBe('SN002')
    })

    it('should support complex filtering', async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('serial_number, physical_status, business_status')
        .eq('pn_id', testPnId)
        .in('physical_status', ['depot', 'in_transit'])
        .eq('business_status', 'available')

      expect(error).toBeNull()
      expect(data).toHaveLength(2) // Original + depot from beforeEach
      expect(data?.every(item => 
        ['depot', 'in_transit'].includes(item.physical_status) && 
        item.business_status === 'available'
      )).toBe(true)
    })
  })

  describe('Part Number History', () => {
    let secondPnId: string

    beforeAll(async () => {
      // Create second part number for modification testing
      const { data: pnData, error: pnError } = await supabase
        .from('pn_master_table')
        .insert({
          pn: 'TEST-DUAL-STATUS-002',
          description: 'Modified test part for dual status testing'
        })
        .select('pn_id')
        .single()

      if (pnError) throw pnError
      secondPnId = pnData.pn_id
    })

    afterAll(async () => {
      if (secondPnId) {
        await supabase.from('pn_master_table').delete().eq('pn_id', secondPnId)
      }
    })

    it('should create part number history record', async () => {
      const { data, error } = await supabase
        .from('part_number_history')
        .insert({
          inventory_id: testInventoryId,
          original_pn_id: testPnId,
          modified_pn_id: secondPnId,
          modification_reason: 'Part number changed during testing',
          modification_date: new Date().toISOString(),
          traceability_notes: 'Integration test modification',
          business_value_adjustment: 50.00,
          is_active: true
        })
        .select('*')
        .single()

      expect(error).toBeNull()
      expect(data.inventory_id).toBe(testInventoryId)
      expect(data.original_pn_id).toBe(testPnId)
      expect(data.modified_pn_id).toBe(secondPnId)
      expect(data.modification_reason).toBe('Part number changed during testing')
      expect(data.business_value_adjustment).toBe(50.00)
    })

    it('should query history with relations', async () => {
      // First create a history record
      await supabase
        .from('part_number_history')
        .insert({
          inventory_id: testInventoryId,
          original_pn_id: testPnId,
          modified_pn_id: secondPnId,
          modification_reason: 'Test modification',
          modification_date: new Date().toISOString(),
          is_active: true
        })

      const { data, error } = await supabase
        .from('part_number_history')
        .select(`
          *,
          original_pn:original_pn_id(pn, description),
          modified_pn:modified_pn_id(pn, description),
          inventory(physical_status, business_status)
        `)
        .eq('inventory_id', testInventoryId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0].original_pn?.pn).toBe('TEST-DUAL-STATUS-001')
      expect(data?.[0].modified_pn?.pn).toBe('TEST-DUAL-STATUS-002')
      expect(data?.[0].inventory?.physical_status).toBe('depot')
      expect(data?.[0].inventory?.business_status).toBe('available')
    })
  })

  describe('Performance', () => {
    it('should query dual status efficiently', async () => {
      const startTime = Date.now()
      
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          inventory_id,
          physical_status,
          business_status,
          status_updated_at,
          pn_master_table(pn, description)
        `)
        .eq('physical_status', 'depot')
        .eq('business_status', 'available')
        .limit(100)

      const queryTime = Date.now() - startTime
      
      expect(error).toBeNull()
      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle bulk updates efficiently', async () => {
      // Create multiple test items
      const testItems = Array.from({ length: 10 }, (_, i) => ({
        pn_id: testPnId,
        physical_status: 'depot' as const,
        business_status: 'available' as const,
        status: 'Available',
        serial_number: `BULK-${i}`
      }))

      const { data: insertedItems, error: insertError } = await supabase
        .from('inventory')
        .insert(testItems)
        .select('inventory_id')

      expect(insertError).toBeNull()
      expect(insertedItems).toHaveLength(10)

      const inventoryIds = insertedItems?.map(item => item.inventory_id) || []

      const startTime = Date.now()
      
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ 
          physical_status: 'in_transit',
          status_updated_at: new Date().toISOString()
        })
        .in('inventory_id', inventoryIds)

      const updateTime = Date.now() - startTime
      
      expect(updateError).toBeNull()
      expect(updateTime).toBeLessThan(1000) // Should complete within 1 second

      // Cleanup
      await supabase.from('inventory').delete().in('inventory_id', inventoryIds)
    })
  })

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Try to create inventory with non-existent part number
      const { error } = await supabase
        .from('inventory')
        .insert({
          pn_id: 'non-existent-pn-id',
          physical_status: 'depot',
          business_status: 'available',
          status: 'Available'
        })

      expect(error).not.toBeNull()
      expect(error?.message).toContain('violates foreign key constraint')
    })

    it('should enforce NOT NULL constraints on required status fields', async () => {
      const { error } = await supabase
        .from('inventory')
        .update({ 
          physical_status: null as any
        })
        .eq('inventory_id', testInventoryId)

      expect(error).not.toBeNull()
      expect(error?.message).toContain('null value in column')
    })
  })
})