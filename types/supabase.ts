export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_code: string
          company_name: string
          company_type: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_code: string
          company_name: string
          company_type?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_code?: string
          company_name?: string
          company_type?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_addresses: {
        Row: {
          address: string
          address_id: string
          address_type: string
          city: string | null
          company_id: string
          country: string | null
          created_at: string | null
          is_primary: boolean | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          address_id?: string
          address_type?: string
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string | null
          is_primary?: boolean | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          address_id?: string
          address_type?: string
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string | null
          is_primary?: boolean | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          contact_id: string
          contact_name: string
          created_at: string | null
          email: string | null
          is_primary: boolean | null
          phone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          contact_id?: string
          contact_name: string
          created_at?: string | null
          email?: string | null
          is_primary?: boolean | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          contact_name?: string
          created_at?: string | null
          email?: string | null
          is_primary?: boolean | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          condition: string | null
          created_at: string | null
          description: string | null
          id: string
          last_certified_agency: string | null
          last_updated: string | null
          location: string | null
          notes: string | null
          origin_country: string | null
          origin_country_code: string | null
          pn_id: string
          po_id_original: string | null
          po_number_original: string | null
          quantity: number
          serial_number: string | null
          source_of_traceability_documentation: string | null
          status: string | null
          total_value: number | null
          traceability_files_path: string | null
          traceability_source: string | null
          traceable_to: string | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_certified_agency?: string | null
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          origin_country?: string | null
          origin_country_code?: string | null
          pn_id: string
          po_id_original?: string | null
          po_number_original?: string | null
          quantity?: number
          serial_number?: string | null
          source_of_traceability_documentation?: string | null
          status?: string | null
          total_value?: number | null
          traceability_files_path?: string | null
          traceability_source?: string | null
          traceable_to?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_certified_agency?: string | null
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          origin_country?: string | null
          origin_country_code?: string | null
          pn_id?: string
          po_id_original?: string | null
          po_number_original?: string | null
          quantity?: number
          serial_number?: string | null
          source_of_traceability_documentation?: string | null
          status?: string | null
          total_value?: number | null
          traceability_files_path?: string | null
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
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_po_id_original_fkey"
            columns: ["po_id_original"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_status_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          inventory_id: string
          log_id: string
          new_status: string
          old_status: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          inventory_id: string
          log_id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          inventory_id?: string
          log_id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_status_log_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      my_companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          my_company_address: string | null
          my_company_code: string
          my_company_name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          my_company_address?: string | null
          my_company_code: string
          my_company_name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          my_company_address?: string | null
          my_company_code?: string
          my_company_name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      my_ship_via: {
        Row: {
          account_no: string
          created_at: string | null
          id: string
          owner: string | null
          ship_company_name: string
          ship_model: string | null
          updated_at: string | null
        }
        Insert: {
          account_no: string
          created_at?: string | null
          id?: string
          owner?: string | null
          ship_company_name: string
          ship_model?: string | null
          updated_at?: string | null
        }
        Update: {
          account_no?: string
          created_at?: string | null
          id?: string
          owner?: string | null
          ship_company_name?: string
          ship_model?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pn_master_table: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          pn: string
          remarks: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          pn: string
          remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          pn?: string
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
          id: string
          last_certified_agency: string | null
          line_number: number
          line_total: number | null
          origin_country: string | null
          origin_country_code: string | null
          pn_id: string | null
          po_id: string
          quantity: number
          sn: string | null
          source_of_traceability_documentation: string | null
          traceability_files_path: string | null
          traceability_source: string | null
          traceable_to: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_certified_agency?: string | null
          line_number: number
          line_total?: number | null
          origin_country?: string | null
          origin_country_code?: string | null
          pn_id?: string | null
          po_id: string
          quantity?: number
          sn?: string | null
          source_of_traceability_documentation?: string | null
          traceability_files_path?: string | null
          traceability_source?: string | null
          traceable_to?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_certified_agency?: string | null
          line_number?: number
          line_total?: number | null
          origin_country?: string | null
          origin_country_code?: string | null
          pn_id?: string | null
          po_id?: string
          quantity?: number
          sn?: string | null
          source_of_traceability_documentation?: string | null
          traceability_files_path?: string | null
          traceability_source?: string | null
          traceable_to?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_items_pn_id_fkey"
            columns: ["pn_id"]
            isOneToOne: false
            referencedRelation: "pn_master_table"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          currency: string
          freight_charge: number | null
          id: string
          misc_charge: number | null
          my_company_id: string
          payment_term: string | null
          po_date: string
          po_number: string
          prepared_by_name: string
          remarks_1: string | null
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
          created_at?: string | null
          currency?: string
          freight_charge?: number | null
          id?: string
          misc_charge?: number | null
          my_company_id: string
          payment_term?: string | null
          po_date?: string
          po_number?: string
          prepared_by_name: string
          remarks_1?: string | null
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
          created_at?: string | null
          currency?: string
          freight_charge?: number | null
          id?: string
          misc_charge?: number | null
          my_company_id?: string
          payment_term?: string | null
          po_date?: string
          po_number?: string
          prepared_by_name?: string
          remarks_1?: string | null
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
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ship_via_id_fkey"
            columns: ["ship_via_id"]
            isOneToOne: false
            referencedRelation: "my_ship_via"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_company_id_fkey"
            columns: ["vendor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          inventory_id: string
          line_number: number
          line_total?: number | null
          sales_order_id: string
          sales_order_item_id?: string
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          inventory_id?: string
          line_number?: number
          line_total?: number | null
          sales_order_id?: string
          sales_order_item_id?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
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
          currency: string
          customer_company_id: string
          freight_charge: number | null
          misc_charge: number | null
          my_company_id: string
          prepared_by_name: string
          sales_order_id: string
          so_date: string
          so_number: string
          status: string
          sub_total: number | null
          total_net: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          customer_company_id: string
          freight_charge?: number | null
          misc_charge?: number | null
          my_company_id: string
          prepared_by_name: string
          sales_order_id?: string
          so_date?: string
          so_number: string
          status?: string
          sub_total?: number | null
          total_net?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          customer_company_id?: string
          freight_charge?: number | null
          misc_charge?: number | null
          my_company_id?: string
          prepared_by_name?: string
          sales_order_id?: string
          so_date?: string
          so_number?: string
          status?: string
          sub_total?: number | null
          total_net?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_company_id_fkey"
            columns: ["customer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_my_company_id_fkey"
            columns: ["my_company_id"]
            isOneToOne: false
            referencedRelation: "my_companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_sql: {
        Args: { query: string; read_only?: boolean }
        Returns: Json
      }
      generate_po_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

