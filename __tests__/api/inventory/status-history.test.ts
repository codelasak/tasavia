import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/inventory/status-history/route'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase)
}

// Mock the supabase server module
jest.mock('@/lib/supabase/server', () => ({
  supabase: mockSupabase
}))

describe('/api/inventory/status-history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET endpoint', () => {
    it('should return status history for an inventory item', async () => {
      const mockHistoryData = [
        {
          history_id: '1',
          inventory_id: 'inv-1',
          modification_date: '2024-01-15T10:00:00Z',
          modification_reason: 'Part number changed during repair',
          traceability_notes: 'Updated after maintenance',
          business_value_adjustment: 100.50,
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          modified_by: { name: 'John Doe' },
          approved_by: { name: 'Jane Smith' },
          original_pn: { pn: 'ABC123', description: 'Original Part' },
          modified_pn: { pn: 'ABC124', description: 'Modified Part' },
          repair_orders: { repair_order_number: 'RO001', status: 'completed' }
        }
      ]

      const mockCurrentItem = {
        inventory_id: 'inv-1',
        physical_status: 'depot',
        business_status: 'available',
        status: 'Available',
        status_updated_at: '2024-01-15T10:00:00Z',
        pn_master_table: { pn: 'ABC124', description: 'Current Part' },
        accounts: { name: 'Current User' }
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockResolvedValueOnce({ data: mockHistoryData, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockCurrentItem, error: null })

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history?inventory_id=inv-1')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.current_item).toEqual(mockCurrentItem)
      expect(result.status_history).toEqual(mockHistoryData)
      expect(result.pagination.limit).toBe(50)
      expect(result.pagination.offset).toBe(0)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.has_more).toBe(false)
    })

    it('should handle custom limit and offset parameters', async () => {
      const mockHistoryData = Array.from({ length: 10 }, (_, i) => ({
        history_id: i.toString(),
        inventory_id: 'inv-1',
        modification_date: '2024-01-15T10:00:00Z',
        modification_reason: `Reason ${i}`
      }))

      const mockCurrentItem = {
        inventory_id: 'inv-1',
        physical_status: 'depot',
        business_status: 'available'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockResolvedValueOnce({ data: mockHistoryData, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockCurrentItem, error: null })

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history?inventory_id=inv-1&limit=10&offset=20')
      const response = await GET(request)
      const result = await response.json()

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29) // offset to offset + limit - 1
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.offset).toBe(20)
      expect(result.pagination.has_more).toBe(true) // 10 items means potentially more
    })

    it('should require inventory_id parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/status-history')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('inventory_id parameter is required')
    })

    it('should handle inventory item not found', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockResolvedValueOnce({ data: [], error: null })
      mockSupabase.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Item not found' } 
      })

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history?inventory_id=non-existent')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Inventory item not found')
      expect(result.details).toBe('Item not found')
    })

    it('should handle empty history gracefully', async () => {
      const mockCurrentItem = {
        inventory_id: 'inv-1',
        physical_status: 'depot',
        business_status: 'available'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.order.mockReturnValue(mockSupabase)
      mockSupabase.range.mockResolvedValueOnce({ data: [], error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockCurrentItem, error: null })

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history?inventory_id=inv-1')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.status_history).toEqual([])
      expect(result.pagination.total).toBe(0)
    })
  })

  describe('POST endpoint', () => {
    it('should create part number modification history', async () => {
      const mockInventoryItem = {
        inventory_id: 'inv-1',
        pn_id: 'pn-original'
      }

      const mockPartNumbers = [
        { pn_id: 'pn-original', pn: 'ABC123' },
        { pn_id: 'pn-modified', pn: 'ABC124' }
      ]

      const mockNewHistory = {
        history_id: 'hist-1',
        modification_date: '2024-01-15T10:00:00Z',
        modification_reason: 'Part number changed during repair',
        traceability_notes: 'Updated after maintenance',
        business_value_adjustment: 100.50,
        modified_by: { name: 'John Doe' },
        original_pn: { pn: 'ABC123', description: 'Original Part' },
        modified_pn: { pn: 'ABC124', description: 'Modified Part' }
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: mockInventoryItem, error: null })
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValueOnce({ data: mockPartNumbers, error: null })
      mockSupabase.insert.mockReturnValue(mockSupabase)
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: mockNewHistory, error: null })
      mockSupabase.update.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const requestBody = {
        inventory_id: 'inv-1',
        original_pn_id: 'pn-original',
        modified_pn_id: 'pn-modified',
        modification_reason: 'Part number changed during repair',
        traceability_notes: 'Updated after maintenance',
        business_value_adjustment: 100.50,
        modified_by_user_id: 'user-1',
        repair_order_id: 'ro-1'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Part number modification history created successfully')
      expect(result.data).toEqual(mockNewHistory)
    })

    it('should validate required fields', async () => {
      const requestBody = {
        inventory_id: 'inv-1',
        original_pn_id: 'pn-original'
        // Missing modified_pn_id and modification_reason
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Required fields: inventory_id, original_pn_id, modified_pn_id, modification_reason')
    })

    it('should validate inventory item exists', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Item not found' } 
      })

      const requestBody = {
        inventory_id: 'non-existent',
        original_pn_id: 'pn-original',
        modified_pn_id: 'pn-modified',
        modification_reason: 'Test reason'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Inventory item not found')
      expect(result.details).toBe('Item not found')
    })

    it('should validate part numbers exist', async () => {
      const mockInventoryItem = {
        inventory_id: 'inv-1',
        pn_id: 'pn-original'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: mockInventoryItem, error: null })
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValueOnce({ data: [], error: null }) // No part numbers found

      const requestBody = {
        inventory_id: 'inv-1',
        original_pn_id: 'non-existent-original',
        modified_pn_id: 'non-existent-modified',
        modification_reason: 'Test reason'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid part number IDs provided')
    })

    it('should handle database insert errors', async () => {
      const mockInventoryItem = {
        inventory_id: 'inv-1',
        pn_id: 'pn-original'
      }

      const mockPartNumbers = [
        { pn_id: 'pn-original', pn: 'ABC123' },
        { pn_id: 'pn-modified', pn: 'ABC124' }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: mockInventoryItem, error: null })
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValueOnce({ data: mockPartNumbers, error: null })
      mockSupabase.insert.mockReturnValue(mockSupabase)
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Insert failed' } 
      })

      const requestBody = {
        inventory_id: 'inv-1',
        original_pn_id: 'pn-original',
        modified_pn_id: 'pn-modified',
        modification_reason: 'Test reason'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to create status history record')
      expect(result.details).toBe('Insert failed')
    })

    it('should update inventory part number when current', async () => {
      const mockInventoryItem = {
        inventory_id: 'inv-1',
        pn_id: 'pn-original' // This matches the original_pn_id
      }

      const mockPartNumbers = [
        { pn_id: 'pn-original', pn: 'ABC123' },
        { pn_id: 'pn-modified', pn: 'ABC124' }
      ]

      const mockNewHistory = {
        history_id: 'hist-1',
        modification_date: '2024-01-15T10:00:00Z',
        modification_reason: 'Part number changed during repair'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: mockInventoryItem, error: null })
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValueOnce({ data: mockPartNumbers, error: null })
      mockSupabase.insert.mockReturnValue(mockSupabase)
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: mockNewHistory, error: null })
      mockSupabase.update.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const requestBody = {
        inventory_id: 'inv-1',
        original_pn_id: 'pn-original',
        modified_pn_id: 'pn-modified',
        modification_reason: 'Part number changed during repair'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/status-history', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(mockSupabase.update).toHaveBeenCalledWith({
        pn_id: 'pn-modified',
        updated_at: expect.any(String)
      })
    })
  })
})