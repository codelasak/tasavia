export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          allowed_login_methods: string | null
          created_at: string | null
          created_by_admin_id: string | null
          id: string
          name: string | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          picture_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_login_methods?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          id: string
          name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          picture_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_login_methods?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          picture_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          category: string
          content: string
          date: string
          id: string
          title: string
          views: number
        }
        Insert: {
          category?: string
          content: string
          date?: string
          id?: string
          title: string
          views?: number
        }
        Update: {
          category?: string
          content?: string
          date?: string
          id?: string
          title?: string
          views?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_code: string | null
          company_id: string
          company_name: string
          company_type: string | null
          created_at: string | null
          customer_number: string | null
          updated_at: string | null
        }
        Insert: {
          company_code?: string | null
          company_id?: string
          company_name: string
          company_type?: string | null
          created_at?: string | null
          customer_number?: string | null
          updated_at?: string | null
        }
        Update: {
          company_code?: string | null
          company_id?: string
          company_name?: string
          company_type?: string | null
          created_at?: string | null
          customer_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_addresses: {
        Row: {
          address_id: string
          address_line1: string
          address_line2: string | null
          city: string | null
          company_id: string
          company_ref_type: string
          country: string | null
          created_at: string | null
          is_primary: boolean
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_id?: string
          address_line1: string
          address_line2?: string | null
          city?: string | null
          company_id: string
          company_ref_type?: string
          country?: string | null
          created_at?: string | null
          is_primary?: boolean
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_id?: string
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          company_id?: string
          company_ref_type?: string
          country?: string | null
          created_at?: string | null
          is_primary?: boolean
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          company_ref_type: string
          contact_id: string
          contact_name: string
          created_at: string | null
          email: string | null
          is_primary: boolean
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          company_ref_type?: string
          contact_id?: string
          contact_name: string
          created_at?: string | null
          email?: string | null
          is_primary?: boolean
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          company_ref_type?: string
          contact_id?: string
          contact_name?: string
          created_at?: string | null
          email?: string | null
          is_primary?: boolean
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_ship_via: {
        Row: {
          account_no: string
          company_id: string
          company_ref_type: string | null
          custom_company_name: string | null
          owner: string | null
          predefined_company:
            | Database["public"]["Enums"]["shipping_company_enum"]
            | null
          ship_company_name: string
          ship_model: Database["public"]["Enums"]["ship_model_enum"] | null
          ship_via_id: string
        }
        Insert: {
          account_no: string
          company_id: string
          company_ref_type?: string | null
          custom_company_name?: string | null
          owner?: string | null
          predefined_company?:
            | Database["public"]["Enums"]["shipping_company_enum"]
            | null
          ship_company_name: string
          ship_model?: Database["public"]["Enums"]["ship_model_enum"] | null
          ship_via_id?: string
        }
        Update: {
          account_no?: string
          company_id?: string
          company_ref_type?: string | null
          custom_company_name?: string | null
          owner?: string | null
          predefined_company?:
            | Database["public"]["Enums"]["shipping_company_enum"]
            | null
          ship_company_name?: string
          ship_model?: Database["public"]["Enums"]["ship_model_enum"] | null
          ship_via_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_ship_via_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      inventory: {
        Row: {
          certificate_date: string | null
          certificate_reference: string | null
          condition: string | null
          created_at: string | null
          inventory_id: string
          last_certified_agency: string | null
          last_updated: string | null
          location: string | null
          notes: string | null
          part_status_certification: string | null
          pn_id: string
          po_id_original: string | null
          po_number_original: string | null
          po_price: number | null
          quantity: number | null
          remarks: string | null
          serial_number: string | null
          status: string | null
          total_value: number | null
          traceability_source: string | null
          traceable_to: string | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          certificate_date?: string | null
          certificate_reference?: string | null
          condition?: string | null
          created_at?: string | null
          inventory_id?: string
          last_certified_agency?: string | null
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          part_status_certification?: string | null
          pn_id: string
          po_id_original?: string | null
          po_number_original?: string | null
          po_price?: number | null
          quantity?: number | null
          remarks?: string | null
          serial_number?: string | null
          status?: string | null
          total_value?: number | null
          traceability_source?: string | null
          traceable_to?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          certificate_date?: string | null
          certificate_reference?: string | null
          condition?: string | null
          created_at?: string | null
          inventory_id?: string
          last_certified_agency?: string | null
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          part_status_certification?: string | null
          pn_id?: string
          po_id_original?: string | null
          po_number_original?: string | null
          po_price?: number | null
          quantity?: number | null
          remarks?: string | null
          serial_number?: string | null
          status?: string | null
          total_value?: number | null
          traceability_source?: string | null
          traceable_to?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_pn_id_fkey"
            columns: ["pn_id"]
            isOneToOne: false
            referencedRelation: "pn_master_table"
            referencedColumns: ["pn_id"]
          },
          {
            foreignKeyName: "inventory_po_id_original_fkey"
            columns: ["po_id_original"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["po_id"]
          },
        ]
      }
      my_companies: {
        Row: {
          bank_details: Json | null
          created_at: string | null
          default_payment_terms: string | null
          my_company_code: string
          my_company_id: string
          my_company_name: string
          updated_at: string | null
        }
        Insert: {
          bank_details?: Json | null
          created_at?: string | null
          default_payment_terms?: string | null
          my_company_code: string
          my_company_id?: string
          my_company_name: string
          updated_at?: string | null
        }
        Update: {
          bank_details?: Json | null
          created_at?: string | null
          default_payment_terms?: string | null
          my_company_code?: string
          my_company_id?: string
          my_company_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pn_master_table: {
        Row: {
          created_at: string | null
          description: string | null
          pn: string
          pn_id: string
          remarks: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          pn: string
          pn_id?: string
          remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          pn?: string
          pn_id?: string
          remarks?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      po_items: {
        Row: {
          condition: string | null
          created_at: string | null
          description: string | null
          line_number: number
          line_total: number | null
          pn_id: string
          po_id: string
          po_item_id: string
          quantity: number
          sn: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          line_number: number
          line_total?: number | null
          pn_id: string
          po_id: string
          po_item_id?: string
          quantity: number
          sn?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          line_number?: number
          line_total?: number | null
          pn_id?: string
          po_id?: string
          po_item_id?: string
          quantity?: number
          sn?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_items_pn_id_fkey"
            columns: ["pn_id"]
            isOneToOne: false
            referencedRelation: "pn_master_table"
            referencedColumns: ["pn_id"]
          },
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["po_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          awb_no: string | null
          created_at: string | null
          currency: string
          freight_charge: number | null
          misc_charge: number | null
          my_company_id: string
          payment_term: string | null
          po_date: string
          po_id: string
          po_number: string
          prepared_by_name: string | null
          prepared_by_user_id: string | null
          remarks_1: string | null
          remarks_2: string | null
          ship_account_no_override: string | null
          ship_to_address_details: string | null
          ship_to_company_name: string | null
          ship_to_contact_email: string | null
          ship_to_contact_name: string | null
          ship_to_contact_phone: string | null
          ship_via_id: string | null
          status: string
          subtotal: number | null
          total_amount: number | null
          updated_at: string | null
          vat_percentage: number | null
          vendor_company_id: string
        }
        Insert: {
          awb_no?: string | null
          created_at?: string | null
          currency?: string
          freight_charge?: number | null
          misc_charge?: number | null
          my_company_id: string
          payment_term?: string | null
          po_date?: string
          po_id?: string
          po_number?: string
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          remarks_1?: string | null
          remarks_2?: string | null
          ship_account_no_override?: string | null
          ship_to_address_details?: string | null
          ship_to_company_name?: string | null
          ship_to_contact_email?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_via_id?: string | null
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vat_percentage?: number | null
          vendor_company_id: string
        }
        Update: {
          awb_no?: string | null
          created_at?: string | null
          currency?: string
          freight_charge?: number | null
          misc_charge?: number | null
          my_company_id?: string
          payment_term?: string | null
          po_date?: string
          po_id?: string
          po_number?: string
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          remarks_1?: string | null
          remarks_2?: string | null
          ship_account_no_override?: string | null
          ship_to_address_details?: string | null
          ship_to_company_name?: string | null
          ship_to_contact_email?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_via_id?: string | null
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vat_percentage?: number | null
          vendor_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_my_company_id_fkey"
            columns: ["my_company_id"]
            isOneToOne: false
            referencedRelation: "my_companies"
            referencedColumns: ["my_company_id"]
          },
          {
            foreignKeyName: "purchase_orders_ship_via_id_fkey"
            columns: ["ship_via_id"]
            isOneToOne: false
            referencedRelation: "company_ship_via"
            referencedColumns: ["ship_via_id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_company_id_fkey"
            columns: ["vendor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      repair_order_items: {
        Row: {
          actual_cost: number | null
          created_at: string | null
          estimated_cost: number | null
          inventory_id: string
          line_number: number
          notes: string | null
          repair_order_id: string
          repair_order_item_id: string
          workscope: string
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          inventory_id: string
          line_number: number
          notes?: string | null
          repair_order_id: string
          repair_order_item_id?: string
          workscope: string
        }
        Update: {
          actual_cost?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          inventory_id?: string
          line_number?: number
          notes?: string | null
          repair_order_id?: string
          repair_order_item_id?: string
          workscope?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["inventory_id"]
          },
          {
            foreignKeyName: "repair_order_items_repair_order_id_fkey"
            columns: ["repair_order_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["repair_order_id"]
          },
        ]
      }
      repair_orders: {
        Row: {
          actual_return_date: string | null
          created_at: string | null
          currency: string | null
          expected_return_date: string | null
          prepared_by_name: string | null
          prepared_by_user_id: string | null
          remarks: string | null
          repair_order_id: string
          repair_order_number: string
          return_address: string | null
          status: string | null
          total_cost: number | null
          updated_at: string | null
          vendor_company_id: string
        }
        Insert: {
          actual_return_date?: string | null
          created_at?: string | null
          currency?: string | null
          expected_return_date?: string | null
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          remarks?: string | null
          repair_order_id?: string
          repair_order_number?: string
          return_address?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vendor_company_id: string
        }
        Update: {
          actual_return_date?: string | null
          created_at?: string | null
          currency?: string | null
          expected_return_date?: string | null
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          remarks?: string | null
          repair_order_id?: string
          repair_order_number?: string
          return_address?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vendor_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_orders_vendor_company_id_fkey"
            columns: ["vendor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          role_id: string
          role_name: string
        }
        Insert: {
          description?: string | null
          role_id?: string
          role_name: string
        }
        Update: {
          description?: string | null
          role_id?: string
          role_name?: string
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          created_at: string | null
          inventory_id: string
          line_number: number
          line_total: number | null
          sales_order_id: string
          sales_order_item_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          inventory_id: string
          line_number: number
          line_total?: number | null
          sales_order_id: string
          sales_order_item_id?: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          inventory_id?: string
          line_number?: number
          line_total?: number | null
          sales_order_id?: string
          sales_order_item_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["inventory_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["sales_order_id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_company_id: string
          customer_po_number: string | null
          invoice_number: string
          my_company_id: string
          payment_terms: string | null
          prepared_by_name: string | null
          prepared_by_user_id: string | null
          remarks: string | null
          sales_date: string | null
          sales_order_id: string
          status: string | null
          sub_total: number | null
          terms_and_conditions_id: string | null
          total_net: number | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_company_id: string
          customer_po_number?: string | null
          invoice_number?: string
          my_company_id: string
          payment_terms?: string | null
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          remarks?: string | null
          sales_date?: string | null
          sales_order_id?: string
          status?: string | null
          sub_total?: number | null
          terms_and_conditions_id?: string | null
          total_net?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_company_id?: string
          customer_po_number?: string | null
          invoice_number?: string
          my_company_id?: string
          payment_terms?: string | null
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          remarks?: string | null
          sales_date?: string | null
          sales_order_id?: string
          status?: string | null
          sub_total?: number | null
          terms_and_conditions_id?: string | null
          total_net?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_company_id_fkey"
            columns: ["customer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sales_orders_my_company_id_fkey"
            columns: ["my_company_id"]
            isOneToOne: false
            referencedRelation: "my_companies"
            referencedColumns: ["my_company_id"]
          },
          {
            foreignKeyName: "sales_orders_terms_and_conditions_id_fkey"
            columns: ["terms_and_conditions_id"]
            isOneToOne: false
            referencedRelation: "terms_and_conditions"
            referencedColumns: ["terms_id"]
          },
        ]
      }
      terms_and_conditions: {
        Row: {
          content: string
          created_at: string | null
          is_active: boolean | null
          terms_id: string
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          is_active?: boolean | null
          terms_id?: string
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          is_active?: boolean | null
          terms_id?: string
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_inventory_from_po_completion: {
        Args: { input_po_id: string }
        Returns: {
          inventory_ids: string[]
          created_count: number
          success: boolean
          error_message: string
        }[]
      }
      generate_company_code: {
        Args: { company_name: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_po_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_repair_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_company_operations: {
        Args: {
          p_operation: string
          p_company_id?: string
          p_company_data?: Json
          p_contacts?: Json
          p_addresses?: Json
        }
        Returns: Json
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      keepalive: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      ship_model_enum:
        | "IMPORT"
        | "THIRD_PARTY_EXPORT"
        | "GROUND"
        | "SEA"
        | "AIRLINE"
      shipping_company_enum:
        | "DHL"
        | "FEDEX"
        | "UPS"
        | "TNT"
        | "ARAMEX"
        | "DPD"
        | "SCHENKER"
        | "KUEHNE_NAGEL"
        | "EXPEDITORS"
        | "PANALPINA"
        | "CUSTOM"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ship_model_enum: [
        "IMPORT",
        "THIRD_PARTY_EXPORT",
        "GROUND",
        "SEA",
        "AIRLINE",
      ],
      shipping_company_enum: [
        "DHL",
        "FEDEX",
        "UPS",
        "TNT",
        "ARAMEX",
        "DPD",
        "SCHENKER",
        "KUEHNE_NAGEL",
        "EXPEDITORS",
        "PANALPINA",
        "CUSTOM",
      ],
    },
  },
} as const