import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { GET, PUT } from '@/app/api/inventory/dual-status/route'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase)
}

// Mock the supabase server module
jest.mock('@/lib/supabase/server', () => ({
  supabase: mockSupabase
}))

describe('/api/inventory/dual-status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET endpoint', () => {
    it('should return inventory items with dual status', async () => {
      const mockData = [
        {
          inventory_id: '1',
          pn_id: 'pn1',
          physical_status: 'depot',
          business_status: 'available',
          pn_master_table: { pn: 'ABC123', description: 'Test Part' },
          accounts: { name: 'Test User' }
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null })

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(result.count).toBe(1)
    })

    it('should filter by physical_status when provided', async () => {
      const mockData = [
        {
          inventory_id: '1',
          physical_status: 'depot',
          business_status: 'available'
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null })

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status?physical_status=depot')
      const response = await GET(request)

      expect(mockSupabase.eq).toHaveBeenCalledWith('physical_status', 'depot')
      expect(response.status).toBe(200)
    })

    it('should filter by business_status when provided', async () => {
      const mockData = [
        {
          inventory_id: '1',
          physical_status: 'depot',
          business_status: 'available'
        }
      ]

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null })

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status?business_status=available')
      const response = await GET(request)

      expect(mockSupabase.eq).toHaveBeenCalledWith('business_status', 'available')
      expect(response.status).toBe(200)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to fetch inventory data')
      expect(result.details).toBe('Database connection failed')
    })
  })

  describe('PUT endpoint', () => {
    it('should update physical status successfully', async () => {
      const currentItem = {
        inventory_id: '1',
        physical_status: 'depot',
        business_status: 'available'
      }

      const updatedItem = {
        inventory_id: '1',
        physical_status: 'in_transit',
        business_status: 'available'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: currentItem, error: null })
      mockSupabase.update.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: updatedItem, error: null })

      const requestBody = {
        inventory_id: '1',
        physical_status: 'in_transit',
        status_updated_by: 'test-user'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedItem)
      expect(result.changes.physical_status_changed).toBe(true)
      expect(result.changes.business_status_changed).toBe(false)
    })

    it('should update business status successfully', async () => {
      const currentItem = {
        inventory_id: '1',
        physical_status: 'depot',
        business_status: 'available'
      }

      const updatedItem = {
        inventory_id: '1',
        physical_status: 'depot',
        business_status: 'reserved'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: currentItem, error: null })
      mockSupabase.update.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValueOnce({ data: updatedItem, error: null })

      const requestBody = {
        inventory_id: '1',
        business_status: 'reserved',
        status_updated_by: 'test-user'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.changes.business_status_changed).toBe(true)
      expect(result.changes.physical_status_changed).toBe(false)
    })

    it('should validate required fields', async () => {
      const requestBody = {
        physical_status: 'depot'
        // Missing inventory_id
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('inventory_id is required')
    })

    it('should require at least one status field', async () => {
      const requestBody = {
        inventory_id: '1'
        // Missing both status fields
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('At least one status field (physical_status or business_status) is required')
    })

    it('should validate physical_status enum values', async () => {
      const requestBody = {
        inventory_id: '1',
        physical_status: 'invalid_status'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Invalid physical_status')
    })

    it('should validate business_status enum values', async () => {
      const requestBody = {
        inventory_id: '1',
        business_status: 'invalid_status'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Invalid business_status')
    })

    it('should prevent selling items in repair', async () => {
      const currentItem = {
        inventory_id: '1',
        physical_status: 'in_repair',
        business_status: 'available'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValue({ data: currentItem, error: null })

      const requestBody = {
        inventory_id: '1',
        business_status: 'sold'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid status transition')
      expect(result.details).toBe('Cannot mark items as sold while they are in repair')
    })

    it('should prevent moving sold items physically', async () => {
      const currentItem = {
        inventory_id: '1',
        physical_status: 'depot',
        business_status: 'sold'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValue({ data: currentItem, error: null })

      const requestBody = {
        inventory_id: '1',
        physical_status: 'in_transit'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid status transition')
      expect(result.details).toBe('Cannot change physical status of sold items')
    })

    it('should prevent reserving items in repair', async () => {
      const currentItem = {
        inventory_id: '1',
        physical_status: 'depot',
        business_status: 'available'
      }

      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValue({ data: currentItem, error: null })

      const requestBody = {
        inventory_id: '1',
        physical_status: 'in_repair',
        business_status: 'reserved'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid status transition')
      expect(result.details).toBe('Reserved items should not be in repair status')
    })

    it('should handle inventory item not found', async () => {
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.eq.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Item not found' } 
      })

      const requestBody = {
        inventory_id: 'non-existent',
        physical_status: 'depot'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/dual-status', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Inventory item not found')
    })
  })
})