import { supabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PackingSlipClientPage from './PackingSlipClientPage'

export const dynamic = 'force-dynamic'

interface PackingSlipPageProps {
  params: {
    id: string
  }
}

async function fetchSalesOrder(id: string) {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        my_companies(
          my_company_name,
          my_company_code,
          bank_details,
          default_payment_terms
        ),
        companies(
          company_name,
          company_code
        ),
        sales_order_items(
          *,
          inventory(
            *,
            pn_master_table(pn, description)
          )
        )
      `)
      .eq('sales_order_id', id)
      .single()

    if (error) throw error

    // Fetch company addresses and contacts separately
    const [myCompanyAddresses, myCompanyContacts, companyAddresses] = await Promise.all([
      supabase
        .from('company_addresses')
        .select('*')
        .eq('company_ref_type', 'my_companies')
        .eq('company_id', data.my_company_id),
      supabase
        .from('company_contacts')
        .select('*')
        .eq('company_ref_type', 'my_companies')
        .eq('company_id', data.my_company_id),
      supabase
        .from('company_addresses')
        .select('*')
        .eq('company_ref_type', 'companies')
        .eq('company_id', data.customer_company_id)
    ])

    // Transform data to match expected interface
    const transformedData = {
      ...data,
      my_companies: {
        my_company_name: data.my_companies.my_company_name,
        my_company_code: data.my_companies.my_company_code,
        address_line_1: myCompanyAddresses.data?.[0]?.address_line1 || null,
        address_line_2: myCompanyAddresses.data?.[0]?.address_line2 || null,
        city: myCompanyAddresses.data?.[0]?.city || null,
        state: null, // Database doesn't have state field
        postal_code: myCompanyAddresses.data?.[0]?.zip_code || null,
        country: myCompanyAddresses.data?.[0]?.country || null,
        phone: myCompanyContacts.data?.[0]?.phone || null,
        email: myCompanyContacts.data?.[0]?.email || null,
      },
      companies: {
        company_name: data.companies.company_name,
        company_code: data.companies.company_code,
        address_line_1: companyAddresses.data?.[0]?.address_line1 || null,
        address_line_2: companyAddresses.data?.[0]?.address_line2 || null,
        city: companyAddresses.data?.[0]?.city || null,
        state: null, // Database doesn't have state field
        postal_code: companyAddresses.data?.[0]?.zip_code || null,
        country: companyAddresses.data?.[0]?.country || null,
      }
    }

    return transformedData
  } catch (error) {
    console.error('Error fetching sales order:', error)
    return null
  }
}

export default async function PackingSlipPage({ params }: PackingSlipPageProps) {
  const salesOrder = await fetchSalesOrder(params.id)

  if (!salesOrder) {
    notFound()
  }

  return <PackingSlipClientPage salesOrder={salesOrder} />
}