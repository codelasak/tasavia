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
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_code: string | null
          company_id: string
          company_name: string
          company_type: string | null
          created_at: string | null
          customer_number: string | null
          is_self: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_code?: string | null
          company_id?: string
          company_name: string
          company_type?: string | null
          created_at?: string | null
          customer_number?: string | null
          is_self?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_code?: string | null
          company_id?: string
          company_name?: string
          company_type?: string | null
          created_at?: string | null
          customer_number?: string | null
          is_self?: boolean | null
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
      company_bank_details: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_address: string | null
          bank_detail_id: string
          bank_name: string
          branch_address: string | null
          branch_code: string | null
          company_id: string
          company_ref_type: string
          created_at: string | null
          iban: string | null
          is_active: boolean | null
          is_primary: boolean | null
          routing_number: string | null
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_address?: string | null
          bank_detail_id?: string
          bank_name: string
          branch_address?: string | null
          branch_code?: string | null
          company_id: string
          company_ref_type: string
          created_at?: string | null
          iban?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_address?: string | null
          bank_detail_id?: string
          bank_name?: string
          branch_address?: string | null
          branch_code?: string | null
          company_id?: string
          company_ref_type?: string
          created_at?: string | null
          iban?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_bank_details_company_id_fkey"
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
          company_ref_type: string
          owner: string | null
          ship_company_name: string
          ship_model: string | null
          ship_via_id: string
        }
        Insert: {
          account_no: string
          company_id: string
          company_ref_type?: string
          owner?: string | null
          ship_company_name: string
          ship_model?: string | null
          ship_via_id?: string
        }
        Update: {
          account_no?: string
          company_id?: string
          company_ref_type?: string
          owner?: string | null
          ship_company_name?: string
          ship_model?: string | null
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
          application_code: string | null
          business_status: Database["public"]["Enums"]["business_status_enum"]
          certificate_date: string | null
          certificate_reference: string | null
          country_of_origin: string | null
          created_at: string | null
          dimensions: string | null
          inventory_id: string
          last_certified_agency: string | null
          location: string | null
          obtained_from: string | null
          origin_country: string | null
          origin_country_code: string | null
          part_status_certification: string | null
          physical_status: Database["public"]["Enums"]["physical_status_enum"]
          pn_id: string
          po_id_original: string | null
          po_number_original: string | null
          po_price: number | null
          remarks: string | null
          sn: string | null
          source_of_traceability_documentation: string | null
          status: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          traceability_files_path: string | null
          traceability_source: string | null
          traceable_to: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          application_code?: string | null
          business_status: Database["public"]["Enums"]["business_status_enum"]
          certificate_date?: string | null
          certificate_reference?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          dimensions?: string | null
          inventory_id?: string
          last_certified_agency?: string | null
          location?: string | null
          obtained_from?: string | null
          origin_country?: string | null
          origin_country_code?: string | null
          part_status_certification?: string | null
          physical_status: Database["public"]["Enums"]["physical_status_enum"]
          pn_id: string
          po_id_original?: string | null
          po_number_original?: string | null
          po_price?: number | null
          remarks?: string | null
          sn?: string | null
          source_of_traceability_documentation?: string | null
          status?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          traceability_files_path?: string | null
          traceability_source?: string | null
          traceable_to?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          application_code?: string | null
          business_status?: Database["public"]["Enums"]["business_status_enum"]
          certificate_date?: string | null
          certificate_reference?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          dimensions?: string | null
          inventory_id?: string
          last_certified_agency?: string | null
          location?: string | null
          obtained_from?: string | null
          origin_country?: string | null
          origin_country_code?: string | null
          part_status_certification?: string | null
          physical_status?: Database["public"]["Enums"]["physical_status_enum"]
          pn_id?: string
          po_id_original?: string | null
          po_number_original?: string | null
          po_price?: number | null
          remarks?: string | null
          sn?: string | null
          source_of_traceability_documentation?: string | null
          status?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          traceability_files_path?: string | null
          traceability_source?: string | null
          traceable_to?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_pn_id"
            columns: ["pn_id"]
            isOneToOne: false
            referencedRelation: "pn_master_table"
            referencedColumns: ["pn_id"]
          },
          {
            foreignKeyName: "inventory_po_id_original_cascade_fkey"
            columns: ["po_id_original"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "inventory_status_updated_by_fkey"
            columns: ["status_updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
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
            referencedColumns: ["inventory_id"]
          },
        ]
      }
      part_number_history: {
        Row: {
          approval_date: string | null
          approved_by_user_id: string | null
          business_value_adjustment: number | null
          created_at: string | null
          history_id: string
          inventory_id: string
          is_active: boolean | null
          modification_date: string
          modification_reason: string
          modified_by_user_id: string | null
          modified_pn_id: string
          original_pn_id: string
          repair_order_id: string | null
          traceability_notes: string | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_by_user_id?: string | null
          business_value_adjustment?: number | null
          created_at?: string | null
          history_id?: string
          inventory_id: string
          is_active?: boolean | null
          modification_date?: string
          modification_reason: string
          modified_by_user_id?: string | null
          modified_pn_id: string
          original_pn_id: string
          repair_order_id?: string | null
          traceability_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_by_user_id?: string | null
          business_value_adjustment?: number | null
          created_at?: string | null
          history_id?: string
          inventory_id?: string
          is_active?: boolean | null
          modification_date?: string
          modification_reason?: string
          modified_by_user_id?: string | null
          modified_pn_id?: string
          original_pn_id?: string
          repair_order_id?: string | null
          traceability_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_number_history_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_number_history_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["inventory_id"]
          },
          {
            foreignKeyName: "part_number_history_modified_by_user_id_fkey"
            columns: ["modified_by_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_number_history_modified_pn_id_fkey"
            columns: ["modified_pn_id"]
            isOneToOne: false
            referencedRelation: "pn_master_table"
            referencedColumns: ["pn_id"]
          },
          {
            foreignKeyName: "part_number_history_original_pn_id_fkey"
            columns: ["original_pn_id"]
            isOneToOne: false
            referencedRelation: "pn_master_table"
            referencedColumns: ["pn_id"]
          },
          {
            foreignKeyName: "part_number_history_repair_order_id_fkey"
            columns: ["repair_order_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["repair_order_id"]
          },
        ]
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
          description_override: string | null
          last_certified_agency: string | null
          line_number: number | null
          line_total: number | null
          origin_country: string | null
          origin_country_code: string | null
          pn_id: string
          po_id: string
          po_item_id: string
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
          description_override?: string | null
          last_certified_agency?: string | null
          line_number?: number | null
          line_total?: number | null
          origin_country?: string | null
          origin_country_code?: string | null
          pn_id: string
          po_id: string
          po_item_id?: string
          quantity: number
          sn?: string | null
          source_of_traceability_documentation?: string | null
          traceability_files_path?: string | null
          traceability_source?: string | null
          traceable_to?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          description_override?: string | null
          last_certified_agency?: string | null
          line_number?: number | null
          line_total?: number | null
          origin_country?: string | null
          origin_country_code?: string | null
          pn_id?: string
          po_id?: string
          po_item_id?: string
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
      po_sequence: {
        Row: {
          created_at: string | null
          next_sequence_number: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          next_sequence_number?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          next_sequence_number?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          aviation_compliance_notes: string | null
          aviation_compliance_updated_at: string | null
          aviation_compliance_updated_by: string | null
          awb_no: string | null
          certificate_expiry_date: string | null
          company_id: string
          created_at: string | null
          currency: string
          end_use_country_code: string | null
          freight_charge: number | null
          last_certificate: string | null
          last_certificate_url: string | null
          misc_charge: number | null
          obtained_from: string | null
          origin_country_code: string | null
          payment_term: string | null
          po_date: string
          po_id: string
          po_number: string
          prepared_by_name: string | null
          prepared_by_user_id: string | null
          regulatory_authority: string | null
          remarks_1: string | null
          remarks_2: string | null
          ship_account_no_override: string | null
          ship_to_address_details: string | null
          ship_to_company_name: string | null
          ship_to_contact_email: string | null
          ship_to_contact_name: string | null
          ship_to_contact_phone: string | null
          ship_via_id: string | null
          status: Database["public"]["Enums"]["po_status_enum"]
          subtotal: number | null
          total_amount: number | null
          traceable_to_airline: string | null
          traceable_to_msn: string | null
          updated_at: string | null
          vat_percentage: number | null
          vendor_company_id: string
        }
        Insert: {
          aviation_compliance_notes?: string | null
          aviation_compliance_updated_at?: string | null
          aviation_compliance_updated_by?: string | null
          awb_no?: string | null
          certificate_expiry_date?: string | null
          company_id: string
          created_at?: string | null
          currency?: string
          end_use_country_code?: string | null
          freight_charge?: number | null
          last_certificate?: string | null
          last_certificate_url?: string | null
          misc_charge?: number | null
          obtained_from?: string | null
          origin_country_code?: string | null
          payment_term?: string | null
          po_date?: string
          po_id?: string
          po_number: string
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          regulatory_authority?: string | null
          remarks_1?: string | null
          remarks_2?: string | null
          ship_account_no_override?: string | null
          ship_to_address_details?: string | null
          ship_to_company_name?: string | null
          ship_to_contact_email?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_via_id?: string | null
          status?: Database["public"]["Enums"]["po_status_enum"]
          subtotal?: number | null
          total_amount?: number | null
          traceable_to_airline?: string | null
          traceable_to_msn?: string | null
          updated_at?: string | null
          vat_percentage?: number | null
          vendor_company_id: string
        }
        Update: {
          aviation_compliance_notes?: string | null
          aviation_compliance_updated_at?: string | null
          aviation_compliance_updated_by?: string | null
          awb_no?: string | null
          certificate_expiry_date?: string | null
          company_id?: string
          created_at?: string | null
          currency?: string
          end_use_country_code?: string | null
          freight_charge?: number | null
          last_certificate?: string | null
          last_certificate_url?: string | null
          misc_charge?: number | null
          obtained_from?: string | null
          origin_country_code?: string | null
          payment_term?: string | null
          po_date?: string
          po_id?: string
          po_number?: string
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          regulatory_authority?: string | null
          remarks_1?: string | null
          remarks_2?: string | null
          ship_account_no_override?: string | null
          ship_to_address_details?: string | null
          ship_to_company_name?: string | null
          ship_to_contact_email?: string | null
          ship_to_contact_name?: string | null
          ship_to_contact_phone?: string | null
          ship_via_id?: string | null
          status?: Database["public"]["Enums"]["po_status_enum"]
          subtotal?: number | null
          total_amount?: number | null
          traceable_to_airline?: string | null
          traceable_to_msn?: string | null
          updated_at?: string | null
          vat_percentage?: number | null
          vendor_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_aviation_compliance_updated_by_fkey"
            columns: ["aviation_compliance_updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
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
      repair_order_sequence: {
        Row: {
          created_at: string | null
          next_sequence_number: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          next_sequence_number?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          next_sequence_number?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
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
          source_po_id: string | null
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
          source_po_id?: string | null
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
          source_po_id?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vendor_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_orders_source_po_id_fkey"
            columns: ["source_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["po_id"]
          },
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
          quantity: number
          sales_order_id: string
          sales_order_item_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          inventory_id: string
          line_number: number
          line_total?: number | null
          quantity?: number
          sales_order_id: string
          sales_order_item_id?: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          inventory_id?: string
          line_number?: number
          line_total?: number | null
          quantity?: number
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
          actual_delivery_date: string | null
          awb_number: string | null
          company_id: string
          contract_number: string | null
          country_of_origin: string | null
          created_at: string | null
          currency: string | null
          customer_company_id: string
          customer_po_number: string | null
          end_use_country: string | null
          estimated_delivery_date: string | null
          fedex_account_number: string | null
          freight_charge: number | null
          gross_weight_kgs: number | null
          invoice_number: string
          misc_charge: number | null
          package_dimensions: string | null
          payment_terms: string | null
          prepared_by_name: string | null
          prepared_by_user_id: string | null
          reference_number: string | null
          remarks: string | null
          sales_date: string | null
          sales_order_id: string
          shipping_carrier: string | null
          shipping_cost: number | null
          shipping_method: string | null
          shipping_notes: string | null
          shipping_service_type: string | null
          shipping_tracking_number: string | null
          source_purchase_order_id: string | null
          source_repair_order_id: string | null
          status: string | null
          sub_total: number | null
          terms_and_conditions_id: string | null
          total_net: number | null
          tracking_number: string | null
          updated_at: string | null
          vat_amount: number | null
          vat_percentage: number | null
        }
        Insert: {
          actual_delivery_date?: string | null
          awb_number?: string | null
          company_id: string
          contract_number?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          currency?: string | null
          customer_company_id: string
          customer_po_number?: string | null
          end_use_country?: string | null
          estimated_delivery_date?: string | null
          fedex_account_number?: string | null
          freight_charge?: number | null
          gross_weight_kgs?: number | null
          invoice_number?: string
          misc_charge?: number | null
          package_dimensions?: string | null
          payment_terms?: string | null
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          reference_number?: string | null
          remarks?: string | null
          sales_date?: string | null
          sales_order_id?: string
          shipping_carrier?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_notes?: string | null
          shipping_service_type?: string | null
          shipping_tracking_number?: string | null
          source_purchase_order_id?: string | null
          source_repair_order_id?: string | null
          status?: string | null
          sub_total?: number | null
          terms_and_conditions_id?: string | null
          total_net?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_percentage?: number | null
        }
        Update: {
          actual_delivery_date?: string | null
          awb_number?: string | null
          company_id?: string
          contract_number?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          currency?: string | null
          customer_company_id?: string
          customer_po_number?: string | null
          end_use_country?: string | null
          estimated_delivery_date?: string | null
          fedex_account_number?: string | null
          freight_charge?: number | null
          gross_weight_kgs?: number | null
          invoice_number?: string
          misc_charge?: number | null
          package_dimensions?: string | null
          payment_terms?: string | null
          prepared_by_name?: string | null
          prepared_by_user_id?: string | null
          reference_number?: string | null
          remarks?: string | null
          sales_date?: string | null
          sales_order_id?: string
          shipping_carrier?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_notes?: string | null
          shipping_service_type?: string | null
          shipping_tracking_number?: string | null
          source_purchase_order_id?: string | null
          source_repair_order_id?: string | null
          status?: string | null
          sub_total?: number | null
          terms_and_conditions_id?: string | null
          total_net?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_company_id_fkey"
            columns: ["customer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sales_orders_source_purchase_order_id_fkey"
            columns: ["source_purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "sales_orders_source_repair_order_id_fkey"
            columns: ["source_repair_order_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["repair_order_id"]
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_entity_addresses: {
        Row: {
          address_id: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          entity_id: string | null
          entity_kind: string | null
          is_primary: boolean | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_kind?: never
          is_primary?: boolean | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_kind?: never
          is_primary?: boolean | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addresses_company_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_entity_contacts: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          entity_id: string | null
          entity_kind: string | null
          is_primary: boolean | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          entity_kind?: never
          is_primary?: never
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          entity_kind?: never
          is_primary?: never
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Functions: {
      check_user_admin_status: {
        Args: { user_id: string }
        Returns: boolean
      }
      create_inventory_from_po_completion: {
        Args: { po_id_param: string }
        Returns: {
          created_count: number
          error_message: string
          inventory_ids: string[]
          success: boolean
        }[]
      }
      execute_sql: {
        Args: { query: string; read_only?: boolean }
        Returns: Json
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
      get_inventory_with_parts: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_status: string
          created_at: string
          inventory_id: string
          location: string
          physical_status: string
          pn_id: string
          pn_master_table: Json
          po_id_original: string
          po_number_original: string
          po_price: number
          remarks: string
          sn: string
          status: string
          status_updated_at: string
          status_updated_by: string
          updated_at: string
        }[]
      }
      handle_company_operations: {
        Args: {
          p_addresses: Json
          p_company_data: Json
          p_company_id: string
          p_contacts: Json
          p_operation: string
        }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
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
      manual_inherit_aviation_data: {
        Args: { target_table?: string }
        Returns: Json
      }
      validate_company_reference: {
        Args: { company_id: string; company_ref_type: string }
        Returns: boolean
      }
    }
    Enums: {
      business_status_enum: "available" | "reserved" | "sold"
      physical_status_enum: "depot" | "in_repair" | "in_transit"
      po_status_enum:
        | "Draft"
        | "Sent"
        | "Acknowledged"
        | "Completed"
        | "Cancelled"
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
  public: {
    Enums: {
      business_status_enum: ["available", "reserved", "sold"],
      physical_status_enum: ["depot", "in_repair", "in_transit"],
      po_status_enum: [
        "Draft",
        "Sent",
        "Acknowledged",
        "Completed",
        "Cancelled",
      ],
    },
  },
} as const

