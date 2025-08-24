/**
 * Server-side Company Service
 * Works with both current and future unified database structures
 * For use in Server Components only
 */

import { createSupabaseServer } from '@/lib/supabase/server'
import { UnifiedCompany } from './company-service'

/**
 * Checks if the database has been migrated to the unified structure
 */
async function isDatabaseMigrated(): Promise<boolean> {
  try {
    const supabase = createSupabaseServer()
    // Check if companies table has is_self column
    const { data, error } = await supabase
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
 * Get internal companies (my companies) - Server-side
 */
export async function getInternalCompaniesServer(): Promise<UnifiedCompany[]> {
  const supabase = createSupabaseServer()
  const migrated = await isDatabaseMigrated()
  
  if (migrated) {
    // Use unified structure
    return getUnifiedCompaniesServer(true)
  } else {
    // Use legacy structure
    return getLegacyMyCompaniesServer()
  }
}

/**
 * Get external companies - Server-side
 */
export async function getExternalCompaniesServer(): Promise<UnifiedCompany[]> {
  const supabase = createSupabaseServer()
  const migrated = await isDatabaseMigrated()
  
  if (migrated) {
    // Use unified structure
    return getUnifiedCompaniesServer(false)
  } else {
    // Use legacy structure
    return getLegacyExternalCompaniesServer()
  }
}

/**
 * Get companies from unified structure (post-migration) - Server-side
 */
async function getUnifiedCompaniesServer(isInternal: boolean): Promise<UnifiedCompany[]> {
  try {
    const supabase = createSupabaseServer()
    
    // Fetch companies
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('is_self', isInternal)
      .order('company_name')

    if (companiesError) throw companiesError

    // Fetch related data
    const [addressData, contactData, shipViaData] = await Promise.all([
      supabase.from('company_addresses').select('*'),
      supabase.from('company_contacts').select('*'),
      supabase.from('company_ship_via').select('*')
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
 * Get my companies from legacy structure (pre-migration) - Server-side
 */
async function getLegacyMyCompaniesServer(): Promise<UnifiedCompany[]> {
  try {
    const supabase = createSupabaseServer()
    
    // Fetch my companies
    const { data: companiesData, error: companiesError } = await supabase
      .from('my_companies')
      .select('*')
      .order('my_company_name')

    if (companiesError) throw companiesError

    // Fetch related data
    const [addressData, contactData, shipViaData] = await Promise.all([
      supabase.from('company_addresses').select('*').eq('company_ref_type', 'my_companies'),
      supabase.from('company_contacts').select('*').eq('company_ref_type', 'my_companies'),
      supabase.from('company_ship_via').select('*').eq('company_ref_type', 'my_companies')
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
 * Get external companies from legacy structure (pre-migration) - Server-side
 */
async function getLegacyExternalCompaniesServer(): Promise<UnifiedCompany[]> {
  try {
    const supabase = createSupabaseServer()
    
    // Fetch companies
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('company_name')

    if (companiesError) throw companiesError

    // Fetch related data
    const [addressData, contactData, shipViaData] = await Promise.all([
      supabase.from('company_addresses').select('*').eq('company_ref_type', 'companies'),
      supabase.from('company_contacts').select('*').eq('company_ref_type', 'companies'),
      supabase.from('company_ship_via').select('*').eq('company_ref_type', 'companies')
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