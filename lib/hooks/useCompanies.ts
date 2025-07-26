'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export interface Company {
  company_id: string
  company_name: string
  company_code: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  phone: string | null
  email: string | null
}

export interface MyCompany {
  my_company_id: string
  my_company_name: string
  my_company_code: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  phone: string | null
  email: string | null
}

// Fetch external companies
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          company_id,
          company_name,
          company_code,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country,
          phone,
          email
        `)
        .order('company_name')

      if (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`)
      }

      return (data as any) || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - companies don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Fetch my companies
export function useMyCompanies() {
  return useQuery({
    queryKey: ['my-companies'],
    queryFn: async (): Promise<MyCompany[]> => {
      const { data, error } = await supabase
        .from('my_companies')
        .select(`
          my_company_id,
          my_company_name,
          my_company_code,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country,
          phone,
          email
        `)
        .order('my_company_name')

      if (error) {
        throw new Error(`Failed to fetch my companies: ${error.message}`)
      }

      return (data as any) || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Get single company by ID
export function useCompany(companyId: string | null) {
  return useQuery({
    queryKey: ['companies', companyId],
    queryFn: async (): Promise<Company | null> => {
      if (!companyId) return null

      const { data, error } = await supabase
        .from('companies')
        .select(`
          company_id,
          company_name,
          company_code,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country,
          phone,
          email
        `)
        .eq('company_id', companyId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Company not found
        }
        throw new Error(`Failed to fetch company: ${error.message}`)
      }

      return data as any
    },
    enabled: !!companyId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Get single my company by ID
export function useMyCompany(myCompanyId: string | null) {
  return useQuery({
    queryKey: ['my-companies', myCompanyId],
    queryFn: async (): Promise<MyCompany | null> => {
      if (!myCompanyId) return null

      const { data, error } = await supabase
        .from('my_companies')
        .select(`
          my_company_id,
          my_company_name,
          my_company_code,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country,
          phone,
          email
        `)
        .eq('my_company_id', myCompanyId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // My company not found
        }
        throw new Error(`Failed to fetch my company: ${error.message}`)
      }

      return data as any
    },
    enabled: !!myCompanyId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}