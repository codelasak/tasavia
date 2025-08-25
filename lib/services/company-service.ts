/**
 * Universal Company Service
 * Unified interface for company operations using the companies table with is_self flag
 * Migration completed - uses single unified structure
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

// Migration state cache to avoid repeated database checks
let migrationStateCache: boolean | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Checks if the database has been migrated to the unified structure
 * Uses caching to avoid repeated database queries
 */
async function isDatabaseMigrated(supabaseClient: any): Promise<boolean> {
  const now = Date.now()
  
  // Return cached result if still valid
  if (migrationStateCache !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return migrationStateCache
  }
  
  try {
    // Check if companies table has is_self column
    const { data, error } = await supabaseClient
      .from('companies')
      .select('is_self')
      .limit(1)
      .single()
    
    const isMigrated = !error && data !== null
    
    // Cache the result
    migrationStateCache = isMigrated
    cacheTimestamp = now
    
    return isMigrated
  } catch {
    // Cache negative result as well
    migrationStateCache = false
    cacheTimestamp = now
    return false
  }
}

/**
 * Get internal companies (my companies) - Client-side only
 */
export async function getInternalCompanies(): Promise<UnifiedCompany[]> {
  return getCompanies(true)
}

/**
 * Get external companies - Client-side only
 */
export async function getExternalCompanies(): Promise<UnifiedCompany[]> {
  return getCompanies(false)
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
 * Get companies from unified structure
 */
async function getCompanies(isInternal: boolean): Promise<UnifiedCompany[]> {
  const supabaseClient = supabase
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
 * Delete a company
 */
export async function deleteCompany(companyId: string, isInternal: boolean): Promise<void> {
  const supabaseClient = supabase
  
  const { error } = await supabaseClient
    .from('companies')
    .delete()
    .eq('company_id', companyId)
  
  if (error) throw error
}

/**
 * Check if a company is referenced in purchase orders
 */
export async function checkCompanyReferences(companyId: string, isInternal: boolean): Promise<boolean> {
  const supabaseClient = supabase
  
  // Check purchase orders
  const { data: poData } = await supabaseClient
    .from('purchase_orders')
    .select('po_id')
    .eq('company_id', companyId)
    .limit(1)
    
  // Check sales orders
  const { data: soData } = await supabaseClient
    .from('sales_orders')
    .select('so_id')
    .eq('company_id', companyId)
    .limit(1)
  
  return (poData?.length || 0) > 0 || (soData?.length || 0) > 0
}