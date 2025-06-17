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
          id: string
          name: string | null
          picture_url: string | null
        }
        Insert: {
          id: string
          name?: string | null
          picture_url?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          picture_url?: string | null
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
          default_ship_account_no: string | null
          default_ship_via_company_name: string | null
          updated_at: string | null
        }
        Insert: {
          company_code?: string | null
          company_id?: string
          company_name: string
          company_type?: string | null
          created_at?: string | null
          default_ship_account_no?: string | null
          default_ship_via_company_name?: string | null
          updated_at?: string | null
        }
        Update: {
          company_code?: string | null
          company_id?: string
          company_name?: string
          company_type?: string | null
          created_at?: string | null
          default_ship_account_no?: string | null
          default_ship_via_company_name?: string | null
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
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "my_companies"
            referencedColumns: ["my_company_id"]
          },
          {
            foreignKeyName: "fk_company_companies"
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
            foreignKeyName: "fk_company_contact"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "my_companies"
            referencedColumns: ["my_company_id"]
          },
          {
            foreignKeyName: "fk_company_contacts_companies"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      inventory: {
        Row: {
          condition: string | null
          created_at: string | null
          inventory_id: string
          last_updated: string | null
          location: string | null
          notes: string | null
          pn_id: string
          po_id_original: string | null
          po_number_original: string | null
          po_price: number | null
          quantity: number | null
          remarks: string | null
          serial_number: string | null
          status: string | null
          total_value: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          inventory_id?: string
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          pn_id: string
          po_id_original?: string | null
          po_number_original?: string | null
          po_price?: number | null
          quantity?: number | null
          remarks?: string | null
          serial_number?: string | null
          status?: string | null
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          inventory_id?: string
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          pn_id?: string
          po_id_original?: string | null
          po_number_original?: string | null
          po_price?: number | null
          quantity?: number | null
          remarks?: string | null
          serial_number?: string | null
          status?: string | null
          total_value?: number | null
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
          created_at: string | null
          my_company_code: string
          my_company_id: string
          my_company_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          my_company_code: string
          my_company_id?: string
          my_company_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          my_company_code?: string
          my_company_id?: string
          my_company_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      my_ship_via: {
        Row: {
          account_no: string
          created_at: string | null
          owner: string | null
          ship_company_name: string
          ship_model: string | null
          ship_via_id: string
          updated_at: string | null
        }
        Insert: {
          account_no: string
          created_at?: string | null
          owner?: string | null
          ship_company_name: string
          ship_model?: string | null
          ship_via_id?: string
          updated_at?: string | null
        }
        Update: {
          account_no?: string
          created_at?: string | null
          owner?: string | null
          ship_company_name?: string
          ship_model?: string | null
          ship_via_id?: string
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
            referencedRelation: "my_ship_via"
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
      generate_po_number: {
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
