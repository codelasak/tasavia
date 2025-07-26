'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export interface ATA106CompletionMetrics {
  total_forms: number
  completed_forms: number
  completion_rate: number
  forms_with_signatures: number
  signature_completion_rate: number
  average_completion_time_hours: number
  forms_by_status: {
    draft: number
    partial: number
    completed: number
  }
  recent_activity: {
    forms_created_last_7_days: number
    forms_completed_last_7_days: number
    signatures_added_last_7_days: number
  }
  top_companies: Array<{
    company_name: string
    form_count: number
    completion_rate: number
  }>
}

export function useATA106Analytics() {
  return useQuery({
    queryKey: ['ata106-analytics'],
    queryFn: async (): Promise<ATA106CompletionMetrics> => {
      // Get all sales orders with traceable items
      const { data: salesOrders, error: soError } = await supabase
        .from('sales_orders')
        .select(`
          sales_order_id,
          invoice_number,
          created_at,
          ata106_completion_status,
          ata106_completed_at,
          companies(company_name),
          sales_order_items(
            inventory(
              traceability_source,
              traceable_to,
              last_certified_agency
            )
          )
        `)

      if (soError) {
        throw new Error(`Failed to fetch sales orders: ${soError.message}`)
      }

      // Filter to only include orders with traceable items
      const traceableOrders = (salesOrders || []).filter((order: any) =>
        order.sales_order_items?.some((item: any) =>
          item.inventory?.traceability_source ||
          item.inventory?.traceable_to ||
          item.inventory?.last_certified_agency
        )
      )

      // Get signature data
      const { data: signatures, error: sigError } = await (supabase as any)
        .from('ata106_signatures')
        .select(`
          sales_order_id,
          signature_type,
          signed_at
        `)

      if (sigError) {
        console.warn('Failed to fetch signatures:', sigError.message)
      }

      // Calculate metrics
      const totalForms = traceableOrders.length
      const completedForms = traceableOrders.filter((order: any) => 
        order.ata106_completion_status === 'completed'
      ).length

      const formsWithSignatures = new Set(
        (signatures || []).map((sig: any) => sig.sales_order_id)
      ).size

      // Calculate completion times
      const completionTimes = traceableOrders
        .filter((order: any) => order.ata106_completed_at && order.created_at)
        .map((order: any) => {
          const created = new Date(order.created_at).getTime()
          const completed = new Date(order.ata106_completed_at).getTime()
          return (completed - created) / (1000 * 60 * 60) // hours
        })

      const averageCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0

      // Status breakdown
      const statusCounts = traceableOrders.reduce((acc: any, order: any) => {
        const status = order.ata106_completion_status || 'draft'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentForms = traceableOrders.filter((order: any) =>
        order.created_at && new Date(order.created_at) >= sevenDaysAgo
      ).length

      const recentCompletions = traceableOrders.filter((order: any) =>
        order.ata106_completed_at && new Date(order.ata106_completed_at) >= sevenDaysAgo
      ).length

      const recentSignatures = (signatures || []).filter((sig: any) =>
        sig.signed_at && new Date(sig.signed_at) >= sevenDaysAgo
      ).length

      // Top companies by form count
      const companyStats = traceableOrders.reduce((acc: any, order: any) => {
        const companyName = order.companies?.company_name || 'Unknown'
        if (!acc[companyName]) {
          acc[companyName] = { total: 0, completed: 0 }
        }
        acc[companyName].total++
        if (order.ata106_completion_status === 'completed') {
          acc[companyName].completed++
        }
        return acc
      }, {} as Record<string, { total: number; completed: number }>)

      const topCompanies = Object.entries(companyStats)
        .map(([company_name, stats]: [string, any]) => ({
          company_name,
          form_count: stats.total,
          completion_rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
        }))
        .sort((a, b) => b.form_count - a.form_count)
        .slice(0, 10)

      return {
        total_forms: totalForms,
        completed_forms: completedForms,
        completion_rate: totalForms > 0 ? (completedForms / totalForms) * 100 : 0,
        forms_with_signatures: formsWithSignatures,
        signature_completion_rate: totalForms > 0 ? (formsWithSignatures / totalForms) * 100 : 0,
        average_completion_time_hours: averageCompletionTime,
        forms_by_status: {
          draft: statusCounts.draft || 0,
          partial: statusCounts.partial || 0,
          completed: statusCounts.completed || 0,
        },
        recent_activity: {
          forms_created_last_7_days: recentForms,
          forms_completed_last_7_days: recentCompletions,
          signatures_added_last_7_days: recentSignatures,
        },
        top_companies: topCompanies,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useATA106FormProgress(salesOrderId: string) {
  return useQuery({
    queryKey: ['ata106-progress', salesOrderId],
    queryFn: async () => {
      // Get form completion status
      const { data: salesOrder, error: soError } = await supabase
        .from('sales_orders')
        .select(`
          sales_order_id,
          invoice_number,
          ata106_completion_status,
          ata106_completed_at,
          created_at
        `)
        .eq('sales_order_id', salesOrderId)
        .single()

      if (soError) {
        throw new Error(`Failed to fetch sales order: ${soError.message}`)
      }

      // Get signatures
      const { data: signatures, error: sigError } = await (supabase as any)
        .from('ata106_signatures')
        .select(`
          signature_type,
          signed_at,
          signer_name
        `)
        .eq('sales_order_id', salesOrderId)

      if (sigError) {
        console.warn('Failed to fetch signatures:', sigError.message)
      }

      const hasTransferorSignature = signatures?.some((s: any) => s.signature_type === 'transferor') || false
      const hasTransfereeSignature = signatures?.some((s: any) => s.signature_type === 'transferee') || false

      // Calculate completion percentage
      let completionPercentage = 0
      if ((salesOrder as any).ata106_completion_status === 'completed') {
        completionPercentage = 100
      } else if (hasTransferorSignature && hasTransfereeSignature) {
        completionPercentage = 90
      } else if (hasTransferorSignature || hasTransfereeSignature) {
        completionPercentage = 60
      } else if ((salesOrder as any).ata106_completion_status === 'partial') {
        completionPercentage = 30
      }

      return {
        sales_order_id: salesOrderId,
        completion_status: (salesOrder as any).ata106_completion_status || 'draft',
        completion_percentage: completionPercentage,
        completed_at: (salesOrder as any).ata106_completed_at,
        created_at: (salesOrder as any).created_at,
        signatures: {
          transferor: hasTransferorSignature,
          transferee: hasTransfereeSignature,
          total_count: signatures?.length || 0
        },
        steps_completed: {
          form_created: true,
          transferor_signed: hasTransferorSignature,
          transferee_signed: hasTransfereeSignature,
          form_completed: (salesOrder as any).ata106_completion_status === 'completed'
        }
      }
    },
    enabled: !!salesOrderId,
    staleTime: 1 * 60 * 1000, // 1 minute - form progress changes more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}