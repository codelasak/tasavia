import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CompletePackageClientPage from './CompletePackageClientPage'

interface PageProps {
  params: {
    id: string
  }
}

export default async function CompletePackagePage({ params }: PageProps) {
  const supabase = createSupabaseServer()

  // Fetch sales order data with direct relationships
  const { data: salesOrder, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      my_companies (
        my_company_name,
        my_company_code,
        my_company_id
      ),
      companies (
        company_name,
        company_code,
        company_id
      ),
      sales_order_items (
        line_number,
        unit_price,
        line_total,
        inventory (
          serial_number,
          condition,
          quantity,
          traceability_source,
          traceable_to,
          last_certified_agency,
          part_status_certification,
          pn_master_table (
            pn,
            description
          )
        )
      ),
      terms_and_conditions (
        title,
        version,
        content
      )
    `)
    .eq('sales_order_id', params.id)
    .single()

  if (error || !salesOrder) {
    notFound()
  }

  // Fetch related company data separately based on the existing pattern
  let companyAddresses: any[] = []
  let companyContacts: any[] = []
  let companyBankDetails: any[] = []

  if (salesOrder.my_companies) {
    // Fetch addresses
    const { data: addresses } = await supabase
      .from('company_addresses')
      .select('address_line1, address_line2, city, country')
      .eq('company_ref_type', 'my_companies')
      .eq('company_id', salesOrder.my_companies.my_company_id)

    // Fetch contacts
    const { data: contacts } = await supabase
      .from('company_contacts')
      .select('contact_name, phone, email')
      .eq('company_ref_type', 'my_companies')
      .eq('company_id', salesOrder.my_companies.my_company_id)

    // Fetch bank details
    const { data: bankDetails } = await supabase
      .from('company_bank_details')
      .select('account_holder_name, bank_name, account_number, swift_code, iban, bank_address, branch_code, branch_address, is_primary')
      .eq('company_ref_type', 'my_companies')
      .eq('company_id', salesOrder.my_companies.my_company_id)

    companyAddresses = addresses || []
    companyContacts = contacts || []
    companyBankDetails = bankDetails || []
  }

  // Add the related data to the sales order
  const salesOrderWithRelations = {
    ...salesOrder,
    my_companies: {
      ...salesOrder.my_companies,
      company_addresses: companyAddresses,
      company_contacts: companyContacts,
      company_bank_details: companyBankDetails
    }
  }

  return <CompletePackageClientPage salesOrder={salesOrderWithRelations} />
}