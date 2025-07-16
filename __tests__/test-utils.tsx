import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { PurchaseOrdersProvider } from '../hooks/usePurchaseOrdersContext'

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test',
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  MockLink.displayName = 'MockLink'
  return MockLink
})

// Mock Next.js headers and cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    entries: jest.fn(() => []),
  })),
}))

// Mock Supabase
jest.mock('../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  Search: () => <svg data-testid="search-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  Edit: () => <svg data-testid="edit-icon" />,
  FileText: () => <svg data-testid="file-text-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  Save: () => <svg data-testid="save-icon" />,
  X: () => <svg data-testid="x-icon" />,
  ChevronDown: () => <svg data-testid="chevron-down-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))

// Default mock purchase orders
export const mockPurchaseOrders = [
  {
    po_id: '1',
    po_number: 'PO-001',
    po_date: new Date().toISOString(),
    status: 'Draft',
    total_amount: 1000,
    my_companies: { my_company_name: 'My Company', my_company_code: 'MC-01' },
    companies: { company_name: 'Vendor A', company_code: 'V-A' },
    created_at: new Date().toISOString(),
  },
  {
    po_id: '2',
    po_number: 'PO-002',
    po_date: new Date().toISOString(),
    status: 'Sent',
    total_amount: 2500,
    my_companies: { my_company_name: 'My Company', my_company_code: 'MC-01' },
    companies: { company_name: 'Vendor B', company_code: 'V-B' },
    created_at: new Date().toISOString(),
  },
]

// Custom render function with providers
interface AllTheProvidersProps {
  children: React.ReactNode
  initialPurchaseOrders?: typeof mockPurchaseOrders
}

const AllTheProviders = ({ children, initialPurchaseOrders = mockPurchaseOrders }: AllTheProvidersProps) => {
  return (
    <PurchaseOrdersProvider initialPurchaseOrders={initialPurchaseOrders}>
      {children}
    </PurchaseOrdersProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialPurchaseOrders?: typeof mockPurchaseOrders
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { initialPurchaseOrders, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialPurchaseOrders={initialPurchaseOrders}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }