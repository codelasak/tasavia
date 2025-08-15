import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/inventory/bulk-status/route'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase)
}

// Mock the supabase server module
jest.mock('@/lib/supabase/server', () => ({
  supabase: mockSupabase
}))

describe('/api/inventory/bulk-status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('PUT endpoint', () => {
    it('should update multiple inventory items successfully', async () => {
      const currentItems = [
        {
          inventory_id: '1',
          physical_status: 'depot',
          business_status: 'available',
          pn_master_table: { pn: 'ABC123' }
        },
        {
          inventory_id: '2',
          physical_status: 'depot',
          business_status: 'available',
          pn_master_table: { pn: 'DEF456' }
        }
      ]

      const updatedItems = [
        {
          inventory_id: '1',
          physical_status: 'in_transit',
          business_status: 'available',
          pn_master_table: { pn: 'ABC123' }
        },
        {
          inventory_id: '2',
          physical_status: 'in_transit',
          business_status: 'available',
          pn_master_table: { pn: 'DEF456' }
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValueOnce({ data: currentItems, error: null })
      mockSupabase.update.mockReturnValue(mockSupabase)
      mockSupabase.select.mockResolvedValueOnce({ data: updatedItems, error: null })

      const requestBody = {
        inventory_ids: ['1', '2'],
        physical_status: 'in_transit',
        status_updated_by: 'test-user'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Successfully updated 2 inventory items')
      expect(result.data.updated_items).toEqual(updatedItems)
      expect(result.data.update_summary.total_requested).toBe(2)
      expect(result.data.update_summary.total_updated).toBe(2)
      expect(result.data.update_summary.physical_status_applied).toBe('in_transit')
    })

    it('should validate required fields', async () => {
      const requestBody = {
        physical_status: 'depot'
        // Missing inventory_ids
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('inventory_ids array is required and cannot be empty')
    })

    it('should require inventory_ids to be a non-empty array', async () => {
      const requestBody = {
        inventory_ids: [],
        physical_status: 'depot'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('inventory_ids array is required and cannot be empty')
    })

    it('should require at least one status field', async () => {
      const requestBody = {
        inventory_ids: ['1', '2']
        // Missing both status fields
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('At least one status field (physical_status or business_status) is required')
    })

    it('should limit bulk operations to 100 items', async () => {
      const inventory_ids = Array.from({ length: 101 }, (_, i) => i.toString())
      
      const requestBody = {
        inventory_ids,
        physical_status: 'depot'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Bulk operations are limited to 100 items at a time')
    })

    it('should validate enum values', async () => {
      const requestBody = {
        inventory_ids: ['1'],
        physical_status: 'invalid_status'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Invalid physical_status')
    })

    it('should handle validation errors for some items', async () => {
      const currentItems = [
        {
          inventory_id: '1',
          physical_status: 'depot',
          business_status: 'available',
          pn_master_table: { pn: 'ABC123' }
        },
        {
          inventory_id: '2',
          physical_status: 'in_repair',
          business_status: 'available',
          pn_master_table: { pn: 'DEF456' }
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValue({ data: currentItems, error: null })

      const requestBody = {
        inventory_ids: ['1', '2'],
        business_status: 'sold' // This will fail for item 2 which is in_repair
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Status transition validation failed for some items')
      expect(result.validation_errors).toHaveLength(1)
      expect(result.validation_errors[0].inventory_id).toBe('2')
      expect(result.validation_errors[0].part_number).toBe('DEF456')
      expect(result.validation_errors[0].error).toBe('Cannot mark items as sold while they are in repair')
      expect(result.valid_items).toBe(1)
      expect(result.total_items).toBe(2)
    })

    it('should handle items not found', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValue({ data: [], error: null })

      const requestBody = {
        inventory_ids: ['non-existent-1', 'non-existent-2'],
        physical_status: 'depot'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('No inventory items found with provided IDs')
    })

    it('should handle database fetch errors', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })

      const requestBody = {
        inventory_ids: ['1', '2'],
        physical_status: 'depot'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to fetch inventory items')
      expect(result.details).toBe('Database connection failed')
    })

    it('should handle database update errors', async () => {
      const currentItems = [
        {
          inventory_id: '1',
          physical_status: 'depot',
          business_status: 'available',
          pn_master_table: { pn: 'ABC123' }
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValueOnce({ data: currentItems, error: null })
      mockSupabase.update.mockReturnValue(mockSupabase)
      mockSupabase.select.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Update failed' } 
      })

      const requestBody = {
        inventory_ids: ['1'],
        physical_status: 'in_transit'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to update inventory status')
      expect(result.details).toBe('Update failed')
    })

    it('should validate all business rules for each item', async () => {
      const currentItems = [
        {
          inventory_id: '1',
          physical_status: 'depot',
          business_status: 'sold', // This will fail physical status change
          pn_master_table: { pn: 'ABC123' }
        },
        {
          inventory_id: '2',
          physical_status: 'depot',
          business_status: 'available', // This one is valid
          pn_master_table: { pn: 'DEF456' }
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.in.mockReturnValue(mockSupabase)
      mockSupabase.in.mockResolvedValue({ data: currentItems, error: null })

      const requestBody = {
        inventory_ids: ['1', '2'],
        physical_status: 'in_transit' // This will fail for sold item
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/bulk-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Status transition validation failed for some items')
      expect(result.validation_errors).toHaveLength(1)
      expect(result.validation_errors[0].inventory_id).toBe('1')
      expect(result.validation_errors[0].error).toBe('Cannot change physical status of sold items')
    })
  })
})