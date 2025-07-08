/**
 * Snapshot tests for UI consistency
 * These tests ensure that component UIs remain consistent across changes
 */

import React from 'react'
import { render, act } from '@testing-library/react'
import { CompanyDialog } from '../../components/companies/CompanyDialog'
import { PartNumberDialog } from '../../components/part-numbers/PartNumberDialog'
import CompaniesList from '../../app/portal/companies/companies-list'
import MyCompaniesList from '../../app/portal/my-companies/my-companies-list'
import PartNumbersList from '../../app/portal/part-numbers/part-numbers-list'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Sample data for consistent testing
const sampleExternalCompany = {
  company_id: '1',
  company_name: 'Acme Corporation',
  company_code: 'ACM001',
  company_type: 'vendor' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  company_contacts: [
    {
      contact_id: 'c1',
      contact_name: 'John Doe',
      email: 'john@acme.com',
      phone: '+1234567890',
      role: 'Manager',
      is_primary: true,
      company_id: '1',
      company_ref_type: 'companies' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  company_addresses: [
    {
      address_id: 'a1',
      address_line1: '123 Main St',
      address_line2: 'Suite 100',
      city: 'New York',
      country: 'USA',
      zip_code: '10001',
      is_primary: true,
      company_id: '1',
      company_ref_type: 'companies' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  company_ship_via: [
    {
      ship_via_id: 's1',
      ship_company_name: 'DHL',
      predefined_company: 'DHL' as const,
      custom_company_name: null,
      account_no: '123456789',
      owner: 'Acme Corp',
      ship_model: 'GROUND' as const,
      company_id: '1',
      company_ref_type: 'companies' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
}

const sampleMyCompany = {
  my_company_id: '1',
  my_company_name: 'My Test Company',
  my_company_code: 'MTC001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  company_contacts: [
    {
      contact_id: 'c1',
      contact_name: 'Jane Smith',
      email: 'jane@mytestcompany.com',
      phone: '+1987654321',
      role: 'CEO',
      is_primary: true,
      company_id: '1',
      company_ref_type: 'my_companies' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  company_addresses: [
    {
      address_id: 'a1',
      address_line1: '456 Business Ave',
      address_line2: 'Floor 5',
      city: 'San Francisco',
      country: 'USA',
      zip_code: '94105',
      is_primary: true,
      company_id: '1',
      company_ref_type: 'my_companies' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  company_ship_via: [
    {
      ship_via_id: 's1',
      ship_company_name: 'FedEx',
      predefined_company: 'FEDEX' as const,
      custom_company_name: null,
      account_no: '987654321',
      owner: 'My Test Company',
      ship_model: 'GROUND' as const,
      company_id: '1',
      company_ref_type: 'my_companies' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
}

const samplePartNumbers = [
  {
    pn_id: '1',
    pn: 'PN-001',
    description: 'High-quality bearing assembly',
    remarks: 'Compatible with models X100-X200',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    pn_id: '2',
    pn: 'GASKET-301',
    description: 'Rubber gasket seal',
    remarks: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

describe('UI Consistency Snapshots', () => {
  describe('Company Dialog Snapshots', () => {
    it('should match snapshot for new external company dialog', () => {
      let component
      act(() => {
        component = render(
          <CompanyDialog
            open={true}
            onClose={() => {}}
            company={null}
            type="external_company"
          />
        )
      })
      expect(component.container.firstChild).toMatchSnapshot('external-company-dialog-new')
    })

    it('should match snapshot for editing external company dialog', () => {
      let component
      act(() => {
        component = render(
          <CompanyDialog
            open={true}
            onClose={() => {}}
            company={sampleExternalCompany}
            type="external_company"
          />
        )
      })
      expect(component.container.firstChild).toMatchSnapshot('external-company-dialog-edit')
    })

    it('should match snapshot for new my company dialog', () => {
      let component
      act(() => {
        component = render(
          <CompanyDialog
            open={true}
            onClose={() => {}}
            company={null}
            type="my_company"
          />
        )
      })
      expect(component.container.firstChild).toMatchSnapshot('my-company-dialog-new')
    })

    it('should match snapshot for editing my company dialog', () => {
      let component
      act(() => {
        component = render(
          <CompanyDialog
            open={true}
            onClose={() => {}}
            company={sampleMyCompany}
            type="my_company"
          />
        )
      })
      expect(component.container.firstChild).toMatchSnapshot('my-company-dialog-edit')
    })

    it('should match snapshot for closed dialog', () => {
      let component
      act(() => {
        component = render(
          <CompanyDialog
            open={false}
            onClose={() => {}}
            company={null}
            type="external_company"
          />
        )
      })
      expect(component.container.firstChild).toMatchSnapshot('company-dialog-closed')
    })
  })

  describe('Part Number Dialog Snapshots', () => {
    it('should match snapshot for new part number dialog', () => {
      const { container } = render(
        <PartNumberDialog
          open={true}
          onClose={() => {}}
          partNumber={null}
        />
      )
      expect(container.firstChild).toMatchSnapshot('part-number-dialog-new')
    })

    it('should match snapshot for editing part number dialog', () => {
      const { container } = render(
        <PartNumberDialog
          open={true}
          onClose={() => {}}
          partNumber={samplePartNumbers[0]}
        />
      )
      expect(container.firstChild).toMatchSnapshot('part-number-dialog-edit')
    })

    it('should match snapshot for closed part number dialog', () => {
      const { container } = render(
        <PartNumberDialog
          open={false}
          onClose={() => {}}
          partNumber={null}
        />
      )
      expect(container.firstChild).toMatchSnapshot('part-number-dialog-closed')
    })
  })

  describe('Companies List Snapshots', () => {
    it('should match snapshot for external companies list with data', () => {
      const { container } = render(
        <CompaniesList initialCompanies={[sampleExternalCompany]} />
      )
      expect(container.firstChild).toMatchSnapshot('external-companies-list-with-data')
    })

    it('should match snapshot for external companies list empty', () => {
      const { container } = render(
        <CompaniesList initialCompanies={[]} />
      )
      expect(container.firstChild).toMatchSnapshot('external-companies-list-empty')
    })

    it('should match snapshot for my companies list with data', () => {
      const { container } = render(
        <MyCompaniesList initialCompanies={[sampleMyCompany]} />
      )
      expect(container.firstChild).toMatchSnapshot('my-companies-list-with-data')
    })

    it('should match snapshot for my companies list empty', () => {
      const { container } = render(
        <MyCompaniesList initialCompanies={[]} />
      )
      expect(container.firstChild).toMatchSnapshot('my-companies-list-empty')
    })
  })

  describe('Part Numbers List Snapshots', () => {
    it('should match snapshot for part numbers list with data', () => {
      const { container } = render(
        <PartNumbersList initialPartNumbers={samplePartNumbers} />
      )
      expect(container.firstChild).toMatchSnapshot('part-numbers-list-with-data')
    })

    it('should match snapshot for part numbers list empty', () => {
      const { container } = render(
        <PartNumbersList initialPartNumbers={[]} />
      )
      expect(container.firstChild).toMatchSnapshot('part-numbers-list-empty')
    })

    it('should match snapshot for part numbers with long descriptions', () => {
      const longDescriptionPartNumbers = [
        {
          ...samplePartNumbers[0],
          description: 'This is a very long description that should test how the component handles text wrapping and truncation in the UI layout',
          remarks: 'This is also a very long remark that should test the text handling capabilities of the component when dealing with extensive textual content',
        },
      ]

      const { container } = render(
        <PartNumbersList initialPartNumbers={longDescriptionPartNumbers} />
      )
      expect(container.firstChild).toMatchSnapshot('part-numbers-list-long-text')
    })
  })

  describe('Component States Snapshots', () => {
    it('should match snapshot for companies list with multiple shipping methods', () => {
      const companyWithMultipleShipping = {
        ...sampleExternalCompany,
        company_ship_via: [
          ...sampleExternalCompany.company_ship_via,
          {
            ship_via_id: 's2',
            ship_company_name: 'Custom Courier',
            predefined_company: 'CUSTOM' as const,
            custom_company_name: 'Custom Courier',
            account_no: 'CC-12345',
            owner: 'Acme Corp',
            ship_model: 'SEA' as const,
            company_id: '1',
            company_ref_type: 'companies' as const,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      }

      const { container } = render(
        <CompaniesList initialCompanies={[companyWithMultipleShipping]} />
      )
      expect(container.firstChild).toMatchSnapshot('companies-list-multiple-shipping')
    })

    it('should match snapshot for company with no contacts or addresses', () => {
      const minimalCompany = {
        ...sampleExternalCompany,
        company_contacts: [],
        company_addresses: [],
        company_ship_via: [],
      }

      const { container } = render(
        <CompaniesList initialCompanies={[minimalCompany]} />
      )
      expect(container.firstChild).toMatchSnapshot('companies-list-minimal-data')
    })

    it('should match snapshot for mixed company types', () => {
      const mixedCompanies = [
        sampleExternalCompany,
        {
          ...sampleExternalCompany,
          company_id: '2',
          company_name: 'Beta Industries',
          company_type: 'customer' as const,
          company_contacts: [],
          company_addresses: [],
          company_ship_via: [],
        },
        {
          ...sampleExternalCompany,
          company_id: '3',
          company_name: 'Gamma Corp',
          company_type: 'both' as const,
        },
      ]

      const { container } = render(
        <CompaniesList initialCompanies={mixedCompanies} />
      )
      expect(container.firstChild).toMatchSnapshot('companies-list-mixed-types')
    })
  })

  describe('Responsive Layout Snapshots', () => {
    it('should match snapshot for wide screen layout', () => {
      // Mock window width for testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      const { container } = render(
        <CompaniesList initialCompanies={[sampleExternalCompany]} />
      )
      expect(container.firstChild).toMatchSnapshot('companies-list-wide-screen')
    })

    it('should match snapshot for mobile layout', () => {
      // Mock window width for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const { container } = render(
        <PartNumbersList initialPartNumbers={samplePartNumbers} />
      )
      expect(container.firstChild).toMatchSnapshot('part-numbers-list-mobile')
    })
  })

  describe('Edge Cases Snapshots', () => {
    it('should match snapshot for very long company names', () => {
      const longNameCompany = {
        ...sampleExternalCompany,
        company_name: 'This Is A Very Long Company Name That Should Test Text Wrapping And Layout Handling',
        company_code: 'VERY-LONG-CODE-123456789',
      }

      const { container } = render(
        <CompaniesList initialCompanies={[longNameCompany]} />
      )
      expect(container.firstChild).toMatchSnapshot('companies-list-long-names')
    })

    it('should match snapshot for special characters in part numbers', () => {
      const specialCharPartNumbers = [
        {
          pn_id: '1',
          pn: 'PN-001/A-B_C.D',
          description: 'Part with special chars: @#$%^&*()',
          remarks: 'Remarks with émojis 🔧⚙️ and ñ special chars',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const { container } = render(
        <PartNumbersList initialPartNumbers={specialCharPartNumbers} />
      )
      expect(container.firstChild).toMatchSnapshot('part-numbers-list-special-chars')
    })
  })
})

// Custom snapshot serializer for consistent formatting
expect.addSnapshotSerializer({
  test: (val) => val && val.hasAttribute && val.hasAttribute('class'),
  print: (val) => {
    const element = val as Element
    const tagName = element.tagName.toLowerCase()
    const className = element.getAttribute('class') || ''
    const textContent = element.textContent?.slice(0, 50) || ''
    
    return `<${tagName}${className ? ` class="${className}"` : ''}>${textContent}${textContent.length > 50 ? '...' : ''}</${tagName}>`
  },
})