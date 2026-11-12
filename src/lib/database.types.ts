// Generated from the live `galmee` schema (Supabase generate_typescript_types),
// core objects and this app's `cl_` objects only. Regenerate after any migration; do not edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          row_id: string | null
          table_name: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          row_id?: string | null
          table_name?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          row_id?: string | null
          table_name?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_id: string | null
          ends_at: string
          id: string
          notes: string | null
          resource_id: string
          resource_type: string
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          resource_id: string
          resource_type: string
          starts_at: string
          status?: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          resource_type?: string
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cl_attachments: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          patient_id: string
          storage_path: string
          tenant_id: string
          title: string
          uploaded_by: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          patient_id: string
          storage_path: string
          tenant_id?: string
          title: string
          uploaded_by?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          patient_id?: string
          storage_path?: string
          tenant_id?: string
          title?: string
          uploaded_by?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cl_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_attachments_tenant_id_patient_id_fkey"
            columns: ["tenant_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "cl_patients"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cl_attachments_tenant_id_visit_id_fkey"
            columns: ["tenant_id", "visit_id"]
            isOneToOne: false
            referencedRelation: "cl_visits"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      cl_card_views: {
        Row: {
          id: number
          patient_id: string
          tenant_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: never
          patient_id: string
          tenant_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Update: {
          id?: never
          patient_id?: string
          tenant_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_card_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_card_views_tenant_id_patient_id_fkey"
            columns: ["tenant_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "cl_patients"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      cl_lab_orders: {
        Row: {
          completed_at: string | null
          id: string
          note: string | null
          patient_id: string
          requested_at: string
          requested_by: string | null
          status: string
          tenant_id: string
          test_name: string
          visit_id: string
          visit_service_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          note?: string | null
          patient_id: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
          test_name: string
          visit_id: string
          visit_service_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          note?: string | null
          patient_id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
          test_name?: string
          visit_id?: string
          visit_service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_lab_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_lab_orders_tenant_id_patient_id_fkey"
            columns: ["tenant_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "cl_patients"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cl_lab_orders_tenant_id_visit_id_fkey"
            columns: ["tenant_id", "visit_id"]
            isOneToOne: false
            referencedRelation: "cl_visits"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cl_lab_orders_tenant_id_visit_service_id_fkey"
            columns: ["tenant_id", "visit_service_id"]
            isOneToOne: false
            referencedRelation: "cl_visit_services"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      cl_lab_results: {
        Row: {
          analyte: string
          entered_at: string
          entered_by: string | null
          flag: string | null
          id: string
          order_id: string
          reference_range: string | null
          tenant_id: string
          unit: string | null
          value: string
        }
        Insert: {
          analyte: string
          entered_at?: string
          entered_by?: string | null
          flag?: string | null
          id?: string
          order_id: string
          reference_range?: string | null
          tenant_id?: string
          unit?: string | null
          value: string
        }
        Update: {
          analyte?: string
          entered_at?: string
          entered_by?: string | null
          flag?: string | null
          id?: string
          order_id?: string
          reference_range?: string | null
          tenant_id?: string
          unit?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_lab_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_lab_results_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "cl_lab_orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      cl_patients: {
        Row: {
          address: string | null
          birth_date: string | null
          card_no: number
          client_ref: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          full_name: string
          id: string
          phone: string | null
          sex: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          card_no: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          full_name: string
          id?: string
          phone?: string | null
          sex?: string | null
          tenant_id?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          card_no?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          full_name?: string
          id?: string
          phone?: string | null
          sex?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_patients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "cl_patients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cl_services: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          price: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name: string
          price: number
          tenant_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          price?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cl_staff_roles: {
        Row: {
          clinical_role: string
          created_at: string
          display_name: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          clinical_role: string
          created_at?: string
          display_name?: string | null
          tenant_id?: string
          user_id: string
        }
        Update: {
          clinical_role?: string
          created_at?: string
          display_name?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_staff_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cl_visit_notes: {
        Row: {
          author_id: string | null
          complaint: string | null
          diagnosis: string | null
          findings: string | null
          tenant_id: string
          treatment: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          author_id?: string | null
          complaint?: string | null
          diagnosis?: string | null
          findings?: string | null
          tenant_id?: string
          treatment?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          author_id?: string | null
          complaint?: string | null
          diagnosis?: string | null
          findings?: string | null
          tenant_id?: string
          treatment?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_visit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_visit_notes_tenant_id_visit_id_fkey"
            columns: ["tenant_id", "visit_id"]
            isOneToOne: false
            referencedRelation: "cl_visits"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      cl_visit_services: {
        Row: {
          client_ref: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          line_total: number | null
          qty: number
          reversed_at: string | null
          reversed_by: string | null
          service_id: string
          service_name: string
          tenant_id: string
          unit_price: number
          visit_id: string
        }
        Insert: {
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          line_total?: number | null
          qty?: number
          reversed_at?: string | null
          reversed_by?: string | null
          service_id: string
          service_name: string
          tenant_id?: string
          unit_price: number
          visit_id: string
        }
        Update: {
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          line_total?: number | null
          qty?: number
          reversed_at?: string | null
          reversed_by?: string | null
          service_id?: string
          service_name?: string
          tenant_id?: string
          unit_price?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_visit_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_visit_services_tenant_id_service_id_fkey"
            columns: ["tenant_id", "service_id"]
            isOneToOne: false
            referencedRelation: "cl_services"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cl_visit_services_tenant_id_visit_id_fkey"
            columns: ["tenant_id", "visit_id"]
            isOneToOne: false
            referencedRelation: "cl_visits"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      cl_visits: {
        Row: {
          client_ref: string | null
          close_ref: string | null
          closed_at: string | null
          created_by: string | null
          debt_posted: number
          doctor_id: string | null
          id: string
          opened_at: string
          paid_total: number
          patient_id: string
          queue_no: number
          services_total: number
          status: string
          tenant_id: string
          visit_date: string
        }
        Insert: {
          client_ref?: string | null
          close_ref?: string | null
          closed_at?: string | null
          created_by?: string | null
          debt_posted?: number
          doctor_id?: string | null
          id?: string
          opened_at?: string
          paid_total?: number
          patient_id: string
          queue_no: number
          services_total?: number
          status?: string
          tenant_id?: string
          visit_date?: string
        }
        Update: {
          client_ref?: string | null
          close_ref?: string | null
          closed_at?: string | null
          created_by?: string | null
          debt_posted?: number
          doctor_id?: string | null
          id?: string
          opened_at?: string
          paid_total?: number
          patient_id?: string
          queue_no?: number
          services_total?: number
          status?: string
          tenant_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cl_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_visits_tenant_id_patient_id_fkey"
            columns: ["tenant_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "cl_patients"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          note: string | null
          ref_id: string | null
          ref_table: string | null
          tenant_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          credit_limit: number | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          telegram_chat_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          telegram_chat_id?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          telegram_chat_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          category: string | null
          cost: number
          created_at: string
          id: string
          name_am: string | null
          name_en: string
          name_om: string | null
          price: number
          reorder_level: number
          sku: string | null
          tenant_id: string
          tracks_expiry: boolean
          unit: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          name_am?: string | null
          name_en: string
          name_om?: string | null
          price?: number
          reorder_level?: number
          sku?: string | null
          tenant_id?: string
          tracks_expiry?: boolean
          unit?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          name_am?: string | null
          name_en?: string
          name_om?: string | null
          price?: number
          reorder_level?: number
          sku?: string | null
          tenant_id?: string
          tracks_expiry?: boolean
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          body: string
          channel: string
          created_at: string
          id: string
          sent_at: string | null
          status: string
          tenant_id: string
          to_addr: string
        }
        Insert: {
          attempts?: number
          body: string
          channel: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_addr: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          to_addr?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          method: Database["public"]["Enums"]["pay_method"]
          ref_id: string | null
          ref_table: string | null
          reference: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
          ref_id?: string | null
          ref_table?: string | null
          reference?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"]
          ref_id?: string | null
          ref_table?: string | null
          reference?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          id: string
          item_id: string
          price: number
          qty: number
          sale_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          item_id: string
          price: number
          qty: number
          sale_id: string
          tenant_id?: string
        }
        Update: {
          id?: string
          item_id?: string
          price?: number
          qty?: number
          sale_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ph_item_expiry"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_ref: string | null
          created_at: string
          customer_id: string | null
          id: string
          method: Database["public"]["Enums"]["pay_method"] | null
          paid: number
          staff_id: string | null
          tenant_id: string
          total: number
        }
        Insert: {
          client_ref?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"] | null
          paid?: number
          staff_id?: string | null
          tenant_id?: string
          total?: number
        }
        Update: {
          client_ref?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["pay_method"] | null
          paid?: number
          staff_id?: string | null
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_balances"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          batch_no: string | null
          cost: number
          expiry_date: string | null
          id: string
          item_id: string
          qty: number
          received_at: string
          tenant_id: string
        }
        Insert: {
          batch_no?: string | null
          cost?: number
          expiry_date?: string | null
          id?: string
          item_id: string
          qty?: number
          received_at?: string
          tenant_id?: string
        }
        Update: {
          batch_no?: string | null
          cost?: number
          expiry_date?: string | null
          id?: string
          item_id?: string
          qty?: number
          received_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ph_item_expiry"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          qty: number
          reason: string | null
          ref_id: string | null
          ref_table: string | null
          tenant_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          qty: number
          reason?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          qty?: number
          reason?: string | null
          ref_id?: string | null
          ref_table?: string | null
          tenant_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ph_item_expiry"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          monthly_fee: number | null
          paid_until: string | null
          plan: string
          setup_fee: number | null
          tenant_id: string
        }
        Insert: {
          monthly_fee?: number | null
          paid_until?: string | null
          plan?: string
          setup_fee?: number | null
          tenant_id: string
        }
        Update: {
          monthly_fee?: number | null
          paid_until?: string | null
          plan?: string
          setup_fee?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          default_lang: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          status: string
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_lang?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string
          vertical: Database["public"]["Enums"]["vertical"]
        }
        Update: {
          address?: string | null
          created_at?: string
          default_lang?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          vertical?: Database["public"]["Enums"]["vertical"]
        }
        Relationships: []
      }
    }
    Views: {
      customer_balances: {
        Row: {
          balance: number | null
          credit_limit: number | null
          customer_id: string | null
          name: string | null
          oldest_debt_at: string | null
          phone: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_stock: {
        Row: {
          item_id: string | null
          name_am: string | null
          name_en: string | null
          name_om: string | null
          next_expiry: string | null
          qty_on_hand: number | null
          reorder_level: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_stock: {
        Args: { p_batch: string; p_new_qty: number; p_reason: string }
        Returns: undefined
      }
      cl_add_service: {
        Args: {
          p_client_ref?: string
          p_qty?: number
          p_service: string
          p_unit_price?: number
          p_visit: string
        }
        Returns: string
      }
      cl_close_visit_and_bill: {
        Args: {
          p_close_ref?: string
          p_due?: string
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_paid: number
          p_reference?: string
          p_visit: string
        }
        Returns: undefined
      }
      cl_enter_lab_results: {
        Args: { p_order: string; p_results: Json }
        Returns: undefined
      }
      cl_log_card_view: { Args: { p_patient: string }; Returns: undefined }
      cl_open_visit: {
        Args: { p_client_ref?: string; p_doctor?: string; p_patient: string }
        Returns: string
      }
      cl_register_patient: {
        Args: {
          p_address?: string
          p_birth_date?: string
          p_client_ref?: string
          p_full_name: string
          p_phone?: string
          p_sex?: string
        }
        Returns: string
      }
      cl_request_lab: {
        Args: {
          p_client_ref?: string
          p_note?: string
          p_service: string
          p_visit: string
        }
        Returns: string
      }
      cl_reverse_service: { Args: { p_line: string }; Returns: undefined }
      cl_set_visit_status: {
        Args: { p_status: string; p_visit: string }
        Returns: undefined
      }
      cl_update_patient: {
        Args: {
          p_address?: string
          p_birth_date?: string
          p_full_name: string
          p_patient: string
          p_phone?: string
          p_sex?: string
        }
        Returns: undefined
      }
      create_tenant: {
        Args: {
          p_full_name: string
          p_lang?: string
          p_name: string
          p_phone: string
          p_vertical: Database["public"]["Enums"]["vertical"]
        }
        Returns: string
      }
      receive_stock: {
        Args: {
          p_batch?: string
          p_cost: number
          p_expiry?: string
          p_item: string
          p_qty: number
        }
        Returns: string
      }
      record_repayment: {
        Args: {
          p_amount: number
          p_customer: string
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_reference?: string
        }
        Returns: string
      }
      record_sale: {
        Args: {
          p_client_ref?: string
          p_customer?: string
          p_due?: string
          p_lines: Json
          p_method?: Database["public"]["Enums"]["pay_method"]
          p_paid?: number
        }
        Returns: string
      }
    }
    Enums: {
      pay_method: "cash" | "telebirr" | "cbe_birr" | "chapa" | "bank" | "other"
      user_role: "owner" | "manager" | "staff"
      vertical:
        | "clinic"
        | "pharmacy"
        | "school"
        | "hotel"
        | "garage"
        | "wholesale"
        | "transport"
        | "coffee"
        | "driving"
        | "rentals"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      pay_method: ["cash", "telebirr", "cbe_birr", "chapa", "bank", "other"],
      user_role: ["owner", "manager", "staff"],
      vertical: [
        "clinic",
        "pharmacy",
        "school",
        "hotel",
        "garage",
        "wholesale",
        "transport",
        "coffee",
        "driving",
        "rentals",
      ],
    },
  },
} as const
