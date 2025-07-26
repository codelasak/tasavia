import * as z from 'zod'

// Simple sales order validation schema for forms
export const salesOrderItemSchema = z.object({
  inventory_id: z.string().min(1, 'Part is required'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
})

export const salesOrderSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  customer_company_id: z.string().min(1, 'Customer is required'),
  customer_po_number: z.string().optional(),
  reference_number: z.string().optional(),
  contract_number: z.string().optional(),
  country_of_origin: z.string().optional(),
  end_use_country: z.string().optional(),
  sales_date: z.date(),
  payment_terms: z.string().optional(),
  currency: z.string().default('USD'),
  freight_charge: z.number().min(0).default(0),
  misc_charge: z.number().min(0).default(0),
  vat_percentage: z.number().min(0).max(100).default(0),
  terms_and_conditions_id: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
})

export type SalesOrderFormValues = z.infer<typeof salesOrderSchema>