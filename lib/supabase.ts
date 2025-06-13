import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      my_companies: {
        Row: {
          my_company_id: string
          my_company_name: string
          my_company_code: string
          my_company_address: string | null
          zip_code: string | null
          city: string | null
          country: string | null
          contact_name: string | null
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          my_company_id?: string
          my_company_name: string
          my_company_code: string
          my_company_address?: string | null
          zip_code?: string | null
          city?: string | null
          country?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          my_company_id?: string
          my_company_name?: string
          my_company_code?: string
          my_company_address?: string | null
          zip_code?: string | null
          city?: string | null
          country?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
      companies: {
        Row: {
          company_id: string
          company_name: string
          company_code: string
          address: string | null
          zip_code: string | null
          city: string | null
          country: string | null
          contact_name: string | null
          email: string | null
          phone: string | null
          default_ship_via_company_name: string | null
          default_ship_account_no: string | null
          company_type?: string
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          company_id?: string
          company_name: string
          company_code: string
          address?: string | null
          zip_code?: string | null
          city?: string | null
          country?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          default_ship_via_company_name?: string | null
          default_ship_account_no?: string | null
          company_type?: string
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          company_code?: string
          address?: string | null
          zip_code?: string | null
          city?: string | null
          country?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          default_ship_via_company_name?: string | null
          default_ship_account_no?: string | null
          company_type?: string
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
      pn_master_table: {
        Row: {
          pn_id: string
          pn: string
          description: string | null
          remarks: string | null
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          pn_id?: string
          pn: string
          description?: string | null
          remarks?: string | null
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          pn_id?: string
          pn?: string
          description?: string | null
          remarks?: string | null
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
      my_ship_via: {
        Row: {
          ship_via_id: string
          ship_company_name: string
          owner: string | null
          account_no: string
          ship_model: string | null
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          ship_via_id?: string
          ship_company_name: string
          owner?: string | null
          account_no: string
          ship_model?: string | null
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          ship_via_id?: string
          ship_company_name?: string
          owner?: string | null
          account_no?: string
          ship_model?: string | null
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
      purchase_orders: {
        Row: {
          po_id: string
          po_number: string
          my_company_id: string
          vendor_company_id: string
          prepared_by_user_id: string | null
          prepared_by_name: string | null
          ship_via_id: string | null
          ship_account_no_override: string | null
          payment_term: string | null
          awb_no: string | null
          remarks_1: string | null
          remarks_2: string | null
          po_date: string
          currency: string
          total_amount: number
          status: string
          ship_to_company_name?: string | null
          ship_to_address_details?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_to_contact_email?: string | null
          freight_charge?: number
          misc_charge?: number
          vat_percentage?: number
          subtotal?: number
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          po_id?: string
          po_number?: string
          my_company_id: string
          vendor_company_id: string
          prepared_by_user_id?: string | null
          prepared_by_name?: string | null
          ship_via_id?: string | null
          ship_account_no_override?: string | null
          payment_term?: string | null
          awb_no?: string | null
          remarks_1?: string | null
          remarks_2?: string | null
          po_date?: string
          currency?: string
          total_amount?: number
          status?: string
          ship_to_company_name?: string | null
          ship_to_address_details?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_to_contact_email?: string | null
          freight_charge?: number
          misc_charge?: number
          vat_percentage?: number
          subtotal?: number
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          po_id?: string
          po_number?: string
          my_company_id?: string
          vendor_company_id?: string
          prepared_by_user_id?: string | null
          prepared_by_name?: string | null
          ship_via_id?: string | null
          ship_account_no_override?: string | null
          payment_term?: string | null
          awb_no?: string | null
          remarks_1?: string | null
          remarks_2?: string | null
          po_date?: string
          currency?: string
          total_amount?: number
          status?: string
          ship_to_company_name?: string | null
          ship_to_address_details?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_to_contact_email?: string | null
          freight_charge?: number
          misc_charge?: number
          vat_percentage?: number
          subtotal?: number
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
      po_items: {
        Row: {
          po_item_id: string
          po_id: string
          pn_id: string
          description: string | null
          sn: string | null
          quantity: number
          unit_price: number
          condition: string | null
          line_total: number
          line_number?: number
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          po_item_id?: string
          po_id: string
          pn_id: string
          description?: string | null
          sn?: string | null
          quantity?: number
          unit_price?: number
          condition?: string | null
          line_number?: number
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          po_item_id?: string
          po_id?: string
          pn_id?: string
          description?: string | null
          sn?: string | null
          quantity?: number
          unit_price?: number
          condition?: string | null
          line_number?: number
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
      inventory: {
        Row: {
          inventory_id: string
          pn_id: string
          serial_number: string | null
          po_price: number | null
          po_id_original: string | null
          po_number_original: string | null
          remarks: string | null
          status: string | null
          location: string | null
          condition?: string
          quantity?: number
          unit_cost?: number
          total_value?: number
          notes?: string | null
          last_updated?: string
          created_at: string
          updated_at: string
          id?: string
        }
        Insert: {
          inventory_id?: string
          pn_id: string
          serial_number?: string | null
          po_price?: number | null
          po_id_original?: string | null
          po_number_original?: string | null
          remarks?: string | null
          status?: string | null
          location?: string | null
          condition?: string
          quantity?: number
          unit_cost?: number
          notes?: string | null
          last_updated?: string
          created_at?: string
          updated_at?: string
          id?: string
        }
        Update: {
          inventory_id?: string
          pn_id?: string
          serial_number?: string | null
          po_price?: number | null
          po_id_original?: string | null
          po_number_original?: string | null
          remarks?: string | null
          status?: string | null
          location?: string | null
          condition?: string
          quantity?: number
          unit_cost?: number
          notes?: string | null
          last_updated?: string
          created_at?: string
          updated_at?: string
          id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}