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

  // Fetch company data separately
  const [sellerCompanyResult, customerCompanyResult] = await Promise.all([
    supabase.from('companies').select('company_id, company_name, company_code').eq('company_id', salesOrder.company_id).single(),
    supabase.from('companies').select('company_id, company_name, company_code').eq('company_id', salesOrder.customer_company_id).single()
  ])

  // Attach company data to sales order for compatibility
  const enrichedSalesOrder = {
    ...salesOrder,
    seller_company: sellerCompanyResult.data,
    customer_company: customerCompanyResult.data,
    // Legacy compatibility
    my_companies: sellerCompanyResult.data ? {
      my_company_id: sellerCompanyResult.data.company_id,
      my_company_name: sellerCompanyResult.data.company_name,
      my_company_code: sellerCompanyResult.data.company_code
    } : null,
    companies: customerCompanyResult.data
  }

  // Fetch related company data separately based on the existing pattern
  let companyAddresses: any[] = []
  let companyContacts: any[] = []
  let companyBankDetails: any[] = []

  if (sellerCompanyResult.data) {
    // Fetch addresses (no more company_ref_type filter needed)
    const { data: addresses } = await supabase
      .from('company_addresses')
      .select('address_line1, address_line2, city, country')
      .eq('company_id', sellerCompanyResult.data.company_id)

    // Fetch contacts (no more company_ref_type filter needed)
    const { data: contacts } = await supabase
      .from('company_contacts')
      .select('contact_name, phone, email')
      .eq('company_id', sellerCompanyResult.data.company_id)

    // Fetch bank details (no more company_ref_type filter needed)
    const { data: bankDetails } = await supabase
      .from('company_bank_details')
      .select('account_holder_name, bank_name, account_number, swift_code, iban, bank_address, branch_code, branch_address, is_primary')
      .eq('company_id', sellerCompanyResult.data.company_id)

    companyAddresses = addresses || []
    companyContacts = contacts || []
    companyBankDetails = bankDetails || []
  }

  // Add the related data to the sales order
  const salesOrderWithRelations = {
    ...enrichedSalesOrder,
    my_companies: {
      ...enrichedSalesOrder.my_companies,
      company_addresses: companyAddresses,
      company_contacts: companyContacts,
      company_bank_details: companyBankDetails
    }
  }

  return <CompletePackageClientPage salesOrder={salesOrderWithRelations as any} />
}