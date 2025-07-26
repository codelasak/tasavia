'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface PurchaseOrder {
  po_id: string
  po_number: string
  po_date: string | null
  status: string | null
  total_amount: number | null
  created_at: string | null
  my_companies: {
    my_company_name: string
    my_company_code: string | null
  }
  companies: {
    company_name: string
    company_code: string | null
  }
}

export interface SalesOrder {
  sales_order_id: string
  invoice_number: string
  customer_company_id: string
  customer_po_number: string | null
  sales_date: string | null
  status: string | null
  sub_total: number | null
  total_net: number | null
  currency: string | null
  tracking_number: string | null
  created_at: string | null
  companies: {
    company_name: string
    company_code: string | null
  }
  my_companies: {
    my_company_name: string
  }
}

// Fetch purchase orders with caching
export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          po_id,
          po_number,
          po_date,
          status,
          total_amount,
          created_at,
          my_companies (
            my_company_name,
            my_company_code
          ),
          companies (
            company_name,
            company_code
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch purchase orders: ${error.message}`)
      }

      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - purchase orders change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch sales orders with caching
export function useSalesOrders() {
  return useQuery({
    queryKey: ['sales-orders'],
    queryFn: async (): Promise<SalesOrder[]> => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          sales_order_id,
          invoice_number,
          customer_company_id,
          customer_po_number,
          sales_date,
          status,
          sub_total,
          total_net,
          currency,
          tracking_number,
          created_at,
          companies (
            company_name,
            company_code
          ),
          my_companies (
            my_company_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch sales orders: ${error.message}`)
      }

      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnMount: true, // Always refetch when component mounts
  })
}

// Delete purchase order with optimistic updates
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('po_id', poId)

      if (error) {
        throw new Error(error.message || 'Failed to delete purchase order')
      }
    },
    onMutate: async (poId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['purchase-orders'] })

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData<PurchaseOrder[]>(['purchase-orders'])

      // Optimistically update the cache
      queryClient.setQueryData<PurchaseOrder[]>(['purchase-orders'], (old) =>
        old ? old.filter(po => po.po_id !== poId) : []
      )

      return { previousOrders }
    },
    onError: (error, poId, context) => {
      // Rollback the optimistic update
      if (context?.previousOrders) {
        queryClient.setQueryData(['purchase-orders'], context.previousOrders)
      }
      toast.error(`Failed to delete purchase order: ${error.message}`)
    },
    onSuccess: () => {
      toast.success('Purchase order deleted successfully')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

// Create sales order with cache invalidation
export function useCreateSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (salesOrderData: any) => {
      const { data: soData, error: soError } = await supabase
        .from('sales_orders')
        .insert(salesOrderData.order)
        .select()
        .single()

      if (soError) {
        throw new Error(soError.message || 'Failed to create sales order')
      }

      // Create line items if provided
      if (salesOrderData.items && salesOrderData.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('sales_order_items')
          .insert(salesOrderData.items.map((item: any, index: number) => ({
            ...item,
            sales_order_id: soData.sales_order_id,
            line_number: index + 1,
          })))

        if (itemsError) {
          throw new Error(itemsError.message || 'Failed to create sales order items')
        }
      }

      return soData
    },
    onSuccess: (data) => {
      toast.success('Sales order created successfully')
      // Invalidate the sales orders cache to show the new order
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create sales order')
    },
  })
}

// Delete sales order with optimistic updates
export function useDeleteSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (salesOrderId: string) => {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('sales_order_id', salesOrderId)

      if (error) {
        throw new Error(error.message || 'Failed to delete sales order')
      }
    },
    onMutate: async (salesOrderId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sales-orders'] })

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData<SalesOrder[]>(['sales-orders'])

      // Optimistically update the cache
      queryClient.setQueryData<SalesOrder[]>(['sales-orders'], (old) =>
        old ? old.filter(so => so.sales_order_id !== salesOrderId) : []
      )

      return { previousOrders }
    },
    onError: (error, salesOrderId, context) => {
      // Rollback the optimistic update
      if (context?.previousOrders) {
        queryClient.setQueryData(['sales-orders'], context.previousOrders)
      }
      toast.error(`Failed to delete sales order: ${error.message}`)
    },
    onSuccess: () => {
      toast.success('Sales order deleted successfully')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
  })
}