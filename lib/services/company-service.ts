/**
 * Universal Company Service
 * Provides a unified interface for company operations that works with both:
 * 1. Current database structure (my_companies + companies)
 * 2. Future unified structure (single companies table with is_self flag)
 */

import { supabase } from '@/lib/supabase/client'

export interface UnifiedCompany {
  id: string
  name: string
  code: string | null
  is_self: boolean
  company_type?: string | null
  company_contacts: Array<{
    contact_id?: string
    contact_name: string | null
    email?: string | null
    phone?: string | null
    role?: string | null
  }>
  company_addresses: Array<{
    address_id?: string
    address_line1: string
    address_line2?: string | null
    city?: string | null
    country?: string | null
    zip_code?: string | null
    is_primary?: boolean | null
  }>
  company_ship_via: Array<{
    ship_via_id?: string
    ship_company_name: string
    account_no: string
    owner?: string | null
    ship_model?: string | null
  }>
  created_at?: string | null
  updated_at?: string | null
}

/**
 * Checks if the database has been migrated to the unified structure
 */
async function isDatabaseMigrated(supabaseClient: any): Promise<boolean> {
  try {
    // Check if companies table has is_self column
    const { data, error } = await supabaseClient
      .from('companies')
      .select('is_self')
      .limit(1)
      .single()
    
    return !error && data !== null
  } catch {
    return false
  }
}

/**
 * Get internal companies (my companies) - Client-side only
 */
export async function getInternalCompanies(): Promise<UnifiedCompany[]> {
  const supabaseClient = supabase
  const migrated = await isDatabaseMigrated(supabaseClient)
  
  if (migrated) {
    // Use unified structure
    return getUnifiedCompanies(supabaseClient, true)
  } else {
    // Use legacy structure
    return getLegacyMyCompanies(supabaseClient)
  }
}

/**
 * Get external companies - Client-side only
 */
export async function getExternalCompanies(): Promise<UnifiedCompany[]> {
  const supabaseClient = supabase
  const migrated = await isDatabaseMigrated(supabaseClient)
  
  if (migrated) {
    // Use unified structure
    return getUnifiedCompanies(supabaseClient, false)
  } else {
    // Use legacy structure
    return getLegacyExternalCompanies(supabaseClient)
  }
}

/**
 * Get all companies - Client-side only
 */
export async function getAllCompanies(): Promise<UnifiedCompany[]> {
  const internal = await getInternalCompanies()
  const external = await getExternalCompanies()
  return [...internal, ...external]
}

/**
 * Get companies from unified structure (post-migration)
 */
async function getUnifiedCompanies(supabaseClient: any, isInternal: boolean): Promise<UnifiedCompany[]> {
  try {
    // Fetch companies
    const { data: companiesData, error: companiesError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('is_self', isInternal)
      .order('company_name')

    if (companiesError) throw companiesError

    // Fetch related data
    const [addressData, contactData, shipViaData] = await Promise.all([
      supabaseClient.from('company_addresses').select('*'),
      supabaseClient.from('company_contacts').select('*'),
      supabaseClient.from('company_ship_via').select('*')
    ])

    // Combine the data
    return companiesData?.map((company: any) => ({
      id: company.company_id,
      name: company.company_name,
      code: company.company_code,
      is_self: company.is_self,
      company_type: company.company_type,
      company_addresses: addressData.data?.filter((addr: any) => addr.company_id === company.company_id) || [],
      company_contacts: contactData.data?.filter((contact: any) => contact.company_id === company.company_id) || [],
      company_ship_via: shipViaData.data?.filter((ship: any) => ship.company_id === company.company_id) || [],
      created_at: company.created_at,
      updated_at: company.updated_at
    })) || []
  } catch (error) {
    console.error('Error fetching unified companies:', error)
    return []
  }
}

/**
 * Get my companies from legacy structure (pre-migration)
 */
async function getLegacyMyCompanies(supabaseClient: any): Promise<UnifiedCompany[]> {
  try {
    // Fetch my companies
    const { data: companiesData, error: companiesError } = await supabaseClient
      .from('my_companies')
      .select('*')
      .order('my_company_name')

    if (companiesError) throw companiesError

    // Fetch related data
    const [addressData, contactData, shipViaData] = await Promise.all([
      supabaseClient.from('company_addresses').select('*').eq('company_ref_type', 'my_companies'),
      supabaseClient.from('company_contacts').select('*').eq('company_ref_type', 'my_companies'),
      supabaseClient.from('company_ship_via').select('*').eq('company_ref_type', 'my_companies')
    ])

    // Combine the data
    return companiesData?.map((company: any) => ({
      id: company.my_company_id,
      name: company.my_company_name,
      code: company.my_company_code,
      is_self: true,
      company_addresses: addressData.data?.filter((addr: any) => addr.company_id === company.my_company_id) || [],
      company_contacts: contactData.data?.filter((contact: any) => contact.company_id === company.my_company_id) || [],
      company_ship_via: shipViaData.data?.filter((ship: any) => ship.company_id === company.my_company_id) || [],
      created_at: company.created_at,
      updated_at: company.updated_at
    })) || []
  } catch (error) {
    console.error('Error fetching legacy my companies:', error)
    return []
  }
}

/**
 * Get external companies from legacy structure (pre-migration)
 */
async function getLegacyExternalCompanies(supabaseClient: any): Promise<UnifiedCompany[]> {
  try {
    // Fetch companies
    const { data: companiesData, error: companiesError } = await supabaseClient
      .from('companies')
      .select('*')
      .order('company_name')

    if (companiesError) throw companiesError

    // Fetch related data
    const [addressData, contactData, shipViaData] = await Promise.all([
      supabaseClient.from('company_addresses').select('*').eq('company_ref_type', 'companies'),
      supabaseClient.from('company_contacts').select('*').eq('company_ref_type', 'companies'),
      supabaseClient.from('company_ship_via').select('*').eq('company_ref_type', 'companies')
    ])

    // Combine the data
    return companiesData?.map((company: any) => ({
      id: company.company_id,
      name: company.company_name,
      code: company.company_code,
      is_self: false,
      company_type: company.company_type,
      company_addresses: addressData.data?.filter((addr: any) => addr.company_id === company.company_id) || [],
      company_contacts: contactData.data?.filter((contact: any) => contact.company_id === company.company_id) || [],
      company_ship_via: shipViaData.data?.filter((ship: any) => ship.company_id === company.company_id) || [],
      created_at: company.created_at,
      updated_at: company.updated_at
    })) || []
  } catch (error) {
    console.error('Error fetching legacy external companies:', error)
    return []
  }
}

/**
 * Delete a company (works with both structures)
 */
export async function deleteCompany(companyId: string, isInternal: boolean): Promise<void> {
  const supabaseClient = supabase
  const migrated = await isDatabaseMigrated(supabaseClient)
  
  if (migrated) {
    // Use unified structure
    const { error } = await supabaseClient
      .from('companies')
      .delete()
      .eq('company_id', companyId)
    
    if (error) throw error
  } else {
    // Use legacy structure
    const tableName = isInternal ? 'my_companies' : 'companies'
    const idColumn = isInternal ? 'my_company_id' : 'company_id'
    
    const { error } = await supabaseClient
      .from(tableName)
      .delete()
      .eq(idColumn, companyId)
    
    if (error) throw error
  }
}

/**
 * Check if a company is referenced in purchase orders
 */
export async function checkCompanyReferences(companyId: string, isInternal: boolean): Promise<boolean> {
  const supabaseClient = supabase
  const migrated = await isDatabaseMigrated(supabaseClient)
  
  if (migrated) {
    // Check unified structure
    const { data } = await supabaseClient
      .from('purchase_orders')
      .select('po_id')
      .eq('company_id', companyId)
      .limit(1)
    
    return (data?.length || 0) > 0
  } else {
    // Check legacy structure
    const columnName = isInternal ? 'my_company_id' : 'vendor_company_id'
    const { data } = await supabaseClient
      .from('purchase_orders')
      .select('po_id')
      .eq(columnName, companyId)
      .limit(1)
    
    return (data?.length || 0) > 0
  }
}