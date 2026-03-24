// src/types/database.ts
// Tipos gerados a partir do schema do Supabase.
// Depois do setup inicial, substitua este arquivo rodando:
//   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'seller'
export type PaymentMethod = 'cash' | 'card' | 'pix' | 'credit'
export type SaleStatus = 'paid' | 'pending'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          name: string
          role: UserRole
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          org_id: string
          name: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          org_id: string
          barcode: string | null
          name: string
          brand: string | null
          cost_price: number
          sale_price: number
          max_discount_pct: number
          stock_qty: number
          expires_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          barcode?: string | null
          name: string
          brand?: string | null
          cost_price?: number
          sale_price?: number
          max_discount_pct?: number
          stock_qty?: number
          expires_at?: string | null
          notes?: string | null
        }
        Update: {
          barcode?: string | null
          name?: string
          brand?: string | null
          cost_price?: number
          sale_price?: number
          max_discount_pct?: number
          stock_qty?: number
          expires_at?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string | null
          phone: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          email?: string | null
          phone?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          email?: string | null
          phone?: string | null
          notes?: string | null
        }
      }
      sales: {
        Row: {
          id: string
          org_id: string
          customer_id: string | null
          seller_id: string
          total: number
          payment_method: PaymentMethod
          status: SaleStatus
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          customer_id?: string | null
          seller_id: string
          total: number
          payment_method: PaymentMethod
          status?: SaleStatus
          paid_at?: string | null
        }
        Update: {
          status?: SaleStatus
          paid_at?: string | null
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          qty: number
          unit_price: number
          unit_cost: number
          discount_pct: number
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          qty: number
          unit_price: number
          unit_cost: number
          discount_pct?: number
        }
        Update: Record<string, never>
      }
      credit_payments: {
        Row: {
          id: string
          sale_id: string
          amount: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          amount: number
          user_id: string
        }
        Update: Record<string, never>
      }
      stock_entries: {
        Row: {
          id: string
          product_id: string
          qty: number
          unit_cost: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          qty: number
          unit_cost: number
          user_id: string
        }
        Update: Record<string, never>
      }
      invitations: {
        Row: {
          id: string
          org_id: string
          email: string | null
          role: UserRole
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          email?: string | null
          role?: UserRole
          token?: string
          expires_at?: string
        }
        Update: {
          accepted_at?: string | null
        }
      }
    }
    Functions: {
      my_org_id: { Returns: string }
      my_role: { Returns: UserRole }
    }
  }
}