import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CompanyDialog } from '../CompanyDialog';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFetch = jest.fn();

describe('CompanyDialog', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    company: null,
    type: 'external_company' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ code: 'KPA716' }) });
    global.fetch = mockFetch as any;

    // Mock Supabase responses
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'companies') {
        const select = jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            neq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { company_id: '1', company_name: 'Test Company', company_code: 'TST123' }, 
                error: null 
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
          select,
        };
      }
      if (tableName === 'company_ship_via') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      if (tableName === 'company_contacts') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      if (tableName === 'company_addresses') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {} as any;
    });
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('renders the dialog for external company', async () => {
    render(<CompanyDialog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add External Company/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('Shipping Methods')).toBeInTheDocument();
  });

  it('renders the dialog for my company with shipping section', async () => {
    render(<CompanyDialog {...mockProps} type="my_company" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add My Company/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('Shipping Methods')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CompanyDialog {...mockProps} open={false} />);

    expect(screen.queryByRole('heading', { name: /Add External Company/i })).not.toBeInTheDocument();
  });

  it('displays company form fields', async () => {
    render(<CompanyDialog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add External Company/i })).toBeInTheDocument();
    });

    // Check that basic form elements are present
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Company/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows code preview functionality for external company', async () => {
    render(<CompanyDialog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add External Company/i })).toBeInTheDocument();
    });

    expect(
      screen.getByText(/auto-generate a company code/i)
    ).toBeInTheDocument();
  });
});
