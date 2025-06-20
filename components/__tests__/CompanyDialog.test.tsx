import React from 'react';
import { render, screen } from '@testing-library/react';
import { CompanyDialog } from '../companies/CompanyDialog';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the supabase client
jest.mock('@/lib/supabase/client');

describe('CompanyDialog', () => {
  it('renders the add external company dialog when open', () => {
    render(
      <CompanyDialog
        open={true}
        onClose={() => {}}
        company={null}
        type="external_company"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Add External Company/i })).toBeInTheDocument();
  });

  it('renders the add my company dialog when open', () => {
    render(
      <CompanyDialog
        open={true}
        onClose={() => {}}
        company={null}
        type="my_company"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Add My Company/i })).toBeInTheDocument();
  });

  it('renders the edit external company dialog when open', () => {
    const company = { company_id: '1', company_name: 'TestCo' };
    render(
      <CompanyDialog
        open={true}
        onClose={() => {}}
        company={company}
        type="external_company"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Edit External Company/i })).toBeInTheDocument();
  });

  it('renders the edit my company dialog when open', () => {
    const company = { my_company_id: '1', my_company_name: 'MyTestCo', my_company_code: '123' };
    render(
      <CompanyDialog
        open={true}
        onClose={() => {}}
        company={company}
        type="my_company"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Edit My Company/i })).toBeInTheDocument();
  });

  it('does not render the dialog when closed', () => {
    render(
      <CompanyDialog
        open={false}
        onClose={() => {}}
        company={null}
        type="external_company"
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
