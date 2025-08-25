/**
 * Server-side Company Service
 * Uses unified database structure with companies table
 * For use in Server Components only
 */

import { createSupabaseServer } from '@/lib/supabase/server'
import { UnifiedCompany } from './company-service'

// Migration state cache to avoid repeated database checks
let migrationStateCache: boolean | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Checks if the database has been migrated to the unified structure
 * Uses caching to avoid repeated database queries
 */
async function isDatabaseMigrated(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached result if still valid
  if (migrationStateCache !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return migrationStateCache
  }
  
  try {
    const supabase = createSupabaseServer()
    // Check if companies table has is_self column
    const { data, error } = await supabase
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
 * Get internal companies (my companies) - Server-side
 */
export async function getInternalCompaniesServer(): Promise<UnifiedCompany[]> {
  return getCompaniesServer(true)
}

/**
 * Get external companies - Server-side
 */
export async function getExternalCompaniesServer(): Promise<UnifiedCompany[]> {
  return getCompaniesServer(false)
}

/**
 * Get companies from unified structure - Server-side
 */
async function getCompaniesServer(isInternal: boolean): Promise<UnifiedCompany[]> {
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

