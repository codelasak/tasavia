import { describe, it, expect } from '@jest/globals'
import { 
  getStatusDisplayInfo, 
  isValidStatusTransition,
  COMMON_STATUS_COMBINATIONS,
  type PhysicalStatus,
  type BusinessStatus
} from '@/lib/types/inventory'

describe('Inventory Types', () => {
  describe('getStatusDisplayInfo', () => {
    it('should return correct display info for common status combinations', () => {
      const result = getStatusDisplayInfo('depot', 'available')
      
      expect(result.physical_status).toBe('depot')
      expect(result.business_status).toBe('available')
      expect(result.legacy_status).toBe('Available')
      expect(result.display_label).toBe('Available at Depot')
      expect(result.color_class).toBe('bg-green-100 text-green-800 border-green-200')
    })

    it('should return correct display info for reserved items', () => {
      const result = getStatusDisplayInfo('depot', 'reserved')
      
      expect(result.physical_status).toBe('depot')
      expect(result.business_status).toBe('reserved')
      expect(result.legacy_status).toBe('Reserved')
      expect(result.display_label).toBe('Reserved at Depot')
      expect(result.color_class).toBe('bg-yellow-100 text-yellow-800 border-yellow-200')
    })

    it('should return correct display info for sold items in transit', () => {
      const result = getStatusDisplayInfo('in_transit', 'sold')
      
      expect(result.physical_status).toBe('in_transit')
      expect(result.business_status).toBe('sold')
      expect(result.legacy_status).toBe('Sold')
      expect(result.display_label).toBe('Sold - In Transit')
      expect(result.color_class).toBe('bg-blue-100 text-blue-800 border-blue-200')
    })

    it('should return correct display info for items in repair', () => {
      const result = getStatusDisplayInfo('in_repair', 'available')
      
      expect(result.physical_status).toBe('in_repair')
      expect(result.business_status).toBe('available')
      expect(result.legacy_status).toBe('Under Repair')
      expect(result.display_label).toBe('In Repair - Available')
      expect(result.color_class).toBe('bg-purple-100 text-purple-800 border-purple-200')
    })

    it('should return default display info for uncommon combinations', () => {
      const result = getStatusDisplayInfo('in_transit', 'reserved')
      
      expect(result.physical_status).toBe('in_transit')
      expect(result.business_status).toBe('reserved')
      expect(result.legacy_status).toBeUndefined()
      expect(result.display_label).toBe('reserved - in_transit')
      expect(result.color_class).toBe('bg-gray-100 text-gray-800 border-gray-200')
    })
  })

  describe('isValidStatusTransition', () => {
    it('should allow valid transitions', () => {
      // Available to reserved at depot
      const result1 = isValidStatusTransition('depot', 'available', 'depot', 'reserved')
      expect(result1.valid).toBe(true)

      // Moving from depot to in_transit
      const result2 = isValidStatusTransition('depot', 'available', 'in_transit', 'available')
      expect(result2.valid).toBe(true)

      // Available item can go to any physical status
      const result3 = isValidStatusTransition('depot', 'available', 'in_repair', 'available')
      expect(result3.valid).toBe(true)
    })

    it('should prevent selling items in repair', () => {
      const result = isValidStatusTransition('depot', 'available', 'in_repair', 'sold')
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Cannot mark items as sold while they are in repair')
    })

    it('should prevent moving sold items physically', () => {
      const result = isValidStatusTransition('depot', 'sold', 'in_transit', 'sold')
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Cannot change physical status of sold items')
    })

    it('should allow same physical status for sold items', () => {
      const result = isValidStatusTransition('depot', 'sold', 'depot', 'sold')
      
      expect(result.valid).toBe(true)
    })

    it('should prevent reserving items in repair', () => {
      const result = isValidStatusTransition('depot', 'available', 'in_repair', 'reserved')
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Reserved items should not be in repair status')
    })

    it('should allow reserving items at depot or in transit', () => {
      const result1 = isValidStatusTransition('depot', 'available', 'depot', 'reserved')
      expect(result1.valid).toBe(true)

      const result2 = isValidStatusTransition('depot', 'available', 'in_transit', 'reserved')
      expect(result2.valid).toBe(true)
    })

    it('should allow business status changes when physical status stays same', () => {
      // Available to reserved at same location
      const result1 = isValidStatusTransition('depot', 'available', 'depot', 'reserved')
      expect(result1.valid).toBe(true)

      // Reserved to sold at same location (but not in repair)
      const result2 = isValidStatusTransition('depot', 'reserved', 'depot', 'sold')
      expect(result2.valid).toBe(true)
    })

    it('should validate complex transition scenarios', () => {
      // Item in repair becomes available but stays in repair (valid)
      const result1 = isValidStatusTransition('in_repair', 'available', 'in_repair', 'available')
      expect(result1.valid).toBe(true)

      // Item finishes repair and becomes available at depot
      const result2 = isValidStatusTransition('in_repair', 'available', 'depot', 'available')
      expect(result2.valid).toBe(true)

      // Item finishes repair and is immediately sold and ships
      const result3 = isValidStatusTransition('in_repair', 'available', 'in_transit', 'sold')
      expect(result3.valid).toBe(true)
    })
  })

  describe('COMMON_STATUS_COMBINATIONS', () => {
    it('should have correct structure for all combinations', () => {
      COMMON_STATUS_COMBINATIONS.forEach(combo => {
        expect(combo).toHaveProperty('physical_status')
        expect(combo).toHaveProperty('business_status')
        expect(combo).toHaveProperty('display_label')
        expect(combo).toHaveProperty('color_class')
        
        // Physical status should be valid enum
        expect(['depot', 'in_repair', 'in_transit']).toContain(combo.physical_status)
        
        // Business status should be valid enum
        expect(['available', 'reserved', 'sold']).toContain(combo.business_status)
        
        // Color class should be valid CSS classes
        expect(combo.color_class).toMatch(/^bg-\w+-\d+\s+text-\w+-\d+\s+border-\w+-\d+$/)
      })
    })

    it('should have unique combinations', () => {
      const combinations = COMMON_STATUS_COMBINATIONS.map(
        combo => `${combo.physical_status}-${combo.business_status}`
      )
      const uniqueCombinations = [...new Set(combinations)]
      
      expect(combinations).toHaveLength(uniqueCombinations.length)
    })

    it('should include key business scenarios', () => {
      const combinations = COMMON_STATUS_COMBINATIONS.map(
        combo => `${combo.physical_status}-${combo.business_status}`
      )
      
      // Should include typical business scenarios
      expect(combinations).toContain('depot-available') // Available inventory
      expect(combinations).toContain('depot-reserved') // Reserved for customer
      expect(combinations).toContain('in_transit-sold') // Shipped item
      expect(combinations).toContain('in_repair-available') // Under repair
    })
  })

  describe('Type Safety', () => {
    it('should enforce correct enum values', () => {
      const physicalStatuses: PhysicalStatus[] = ['depot', 'in_repair', 'in_transit']
      const businessStatuses: BusinessStatus[] = ['available', 'reserved', 'sold']
      
      physicalStatuses.forEach(ps => {
        businessStatuses.forEach(bs => {
          // These should all compile without TypeScript errors
          const result = getStatusDisplayInfo(ps, bs)
          expect(result.physical_status).toBe(ps)
          expect(result.business_status).toBe(bs)
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle same status transitions', () => {
      const result = isValidStatusTransition('depot', 'available', 'depot', 'available')
      expect(result.valid).toBe(true)
    })

    it('should handle partial status changes', () => {
      // Only physical status changes
      const result1 = isValidStatusTransition('depot', 'available', 'in_transit', 'available')
      expect(result1.valid).toBe(true)

      // Only business status changes
      const result2 = isValidStatusTransition('depot', 'available', 'depot', 'reserved')
      expect(result2.valid).toBe(true)
    })

    it('should validate all enum combinations systematically', () => {
      const physicalStatuses: PhysicalStatus[] = ['depot', 'in_repair', 'in_transit']
      const businessStatuses: BusinessStatus[] = ['available', 'reserved', 'sold']
      
      const invalidTransitions = [
        // Can't sell items in repair
        { from: ['depot', 'available'], to: ['in_repair', 'sold'] },
        { from: ['in_transit', 'available'], to: ['in_repair', 'sold'] },
        
        // Can't move sold items
        { from: ['depot', 'sold'], to: ['in_repair', 'sold'] },
        { from: ['depot', 'sold'], to: ['in_transit', 'sold'] },
        { from: ['in_transit', 'sold'], to: ['depot', 'sold'] },
        { from: ['in_transit', 'sold'], to: ['in_repair', 'sold'] },
        
        // Can't reserve items in repair
        { from: ['depot', 'available'], to: ['in_repair', 'reserved'] },
        { from: ['in_transit', 'available'], to: ['in_repair', 'reserved'] }
      ]
      
      invalidTransitions.forEach(({ from, to }) => {
        const result = isValidStatusTransition(
          from[0] as PhysicalStatus, 
          from[1] as BusinessStatus, 
          to[0] as PhysicalStatus, 
          to[1] as BusinessStatus
        )
        expect(result.valid).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })
  })
})