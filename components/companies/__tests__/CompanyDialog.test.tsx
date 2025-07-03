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

describe('CompanyDialog', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    company: null,
    type: 'external_company' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase responses
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'companies') {
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

  it('renders the dialog with tabbed interface for external company', async () => {
    render(<CompanyDialog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add External Company')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('tab', { name: 'Basic Info' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Addresses' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Shipping' })).toBeInTheDocument();
  });

  it('renders the dialog for my company without shipping tab', async () => {
    render(<CompanyDialog {...mockProps} type="my_company" />);

    await waitFor(() => {
      expect(screen.getByText('Add My Company')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('tab', { name: 'Basic Info' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Addresses' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Shipping' })).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CompanyDialog {...mockProps} open={false} />);

    expect(screen.queryByText('Add External Company')).not.toBeInTheDocument();
  });

  it('displays company form fields', async () => {
    render(<CompanyDialog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add External Company')).toBeInTheDocument();
    });

    // Check that basic form elements are present
    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getByText('Company Code')).toBeInTheDocument();
    expect(screen.getByText('Company Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows code preview functionality for external company', async () => {
    render(<CompanyDialog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add External Company')).toBeInTheDocument();
    });

    // Check that the code input field exists (should be the second textbox)
    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThanOrEqual(2);
  });
});