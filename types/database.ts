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
        Row: { id: string; name: string; slug: string; created_at: string }
        Insert: { id?: string; name: string; slug: string; created_at?: string }
        Update: { id?: string; name?: string; slug?: string; created_at?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; org_id: string; name: string; role: UserRole; avatar_url: string | null; created_at: string }
        Insert: { id: string; org_id: string; name: string; role?: UserRole; avatar_url?: string | null; created_at?: string }
        Update: { id?: string; org_id?: string; name?: string; role?: UserRole; avatar_url?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: 'profiles_org_id_fkey'; columns: ['org_id']; referencedRelation: 'organizations'; referencedColumns: ['id'] }]
      }
      products: {
        Row: { id: string; org_id: string; barcode: string | null; name: string; brand: string | null; cost_price: number; sale_price: number; max_discount_pct: number; stock_qty: number; expires_at: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; org_id: string; barcode?: string | null; name: string; brand?: string | null; cost_price?: number; sale_price?: number; max_discount_pct?: number; stock_qty?: number; expires_at?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; org_id?: string; barcode?: string | null; name?: string; brand?: string | null; cost_price?: number; sale_price?: number; max_discount_pct?: number; stock_qty?: number; expires_at?: string | null; notes?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: 'products_org_id_fkey'; columns: ['org_id']; referencedRelation: 'organizations'; referencedColumns: ['id'] }]
      }
      stock_entries: {
        Row: { id: string; product_id: string; qty: number; unit_cost: number; user_id: string; created_at: string }
        Insert: { id?: string; product_id: string; qty: number; unit_cost: number; user_id: string; created_at?: string }
        Update: { id?: string; product_id?: string; qty?: number; unit_cost?: number; user_id?: string; created_at?: string }
        Relationships: [{ foreignKeyName: 'stock_entries_product_id_fkey'; columns: ['product_id']; referencedRelation: 'products'; referencedColumns: ['id'] }]
      }
      customers: {
        Row: { id: string; org_id: string; name: string; email: string | null; phone: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; org_id: string; name: string; email?: string | null; phone?: string | null; notes?: string | null; created_at?: string }
        Update: { id?: string; org_id?: string; name?: string; email?: string | null; phone?: string | null; notes?: string | null }
        Relationships: [{ foreignKeyName: 'customers_org_id_fkey'; columns: ['org_id']; referencedRelation: 'organizations'; referencedColumns: ['id'] }]
      }
      sales: {
        Row: { id: string; org_id: string; customer_id: string | null; seller_id: string; total: number; payment_method: PaymentMethod; status: SaleStatus; paid_at: string | null; created_at: string }
        Insert: { id?: string; org_id: string; customer_id?: string | null; seller_id: string; total: number; payment_method: PaymentMethod; status?: SaleStatus; paid_at?: string | null; created_at?: string }
        Update: { id?: string; org_id?: string; customer_id?: string | null; seller_id?: string; total?: number; payment_method?: PaymentMethod; status?: SaleStatus; paid_at?: string | null }
        Relationships: [{ foreignKeyName: 'sales_org_id_fkey'; columns: ['org_id']; referencedRelation: 'organizations'; referencedColumns: ['id'] }, { foreignKeyName: 'sales_customer_id_fkey'; columns: ['customer_id']; referencedRelation: 'customers'; referencedColumns: ['id'] }, { foreignKeyName: 'sales_seller_id_fkey'; columns: ['seller_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      sale_items: {
        Row: { id: string; sale_id: string; product_id: string; qty: number; unit_price: number; unit_cost: number; discount_pct: number }
        Insert: { id?: string; sale_id: string; product_id: string; qty: number; unit_price: number; unit_cost: number; discount_pct?: number }
        Update: { id?: string; sale_id?: string; product_id?: string; qty?: number; unit_price?: number; unit_cost?: number; discount_pct?: number }
        Relationships: [{ foreignKeyName: 'sale_items_sale_id_fkey'; columns: ['sale_id']; referencedRelation: 'sales'; referencedColumns: ['id'] }, { foreignKeyName: 'sale_items_product_id_fkey'; columns: ['product_id']; referencedRelation: 'products'; referencedColumns: ['id'] }]
      }
      credit_payments: {
        Row: { id: string; sale_id: string; amount: number; user_id: string; created_at: string }
        Insert: { id?: string; sale_id: string; amount: number; user_id: string; created_at?: string }
        Update: { id?: string; sale_id?: string; amount?: number; user_id?: string; created_at?: string }
        Relationships: [{ foreignKeyName: 'credit_payments_sale_id_fkey'; columns: ['sale_id']; referencedRelation: 'sales'; referencedColumns: ['id'] }]
      }
      invitations: {
        Row: { id: string; org_id: string; email: string | null; role: UserRole; token: string; expires_at: string; accepted_at: string | null; created_at: string }
        Insert: { id?: string; org_id: string; email?: string | null; role?: UserRole; token?: string; expires_at?: string; created_at?: string }
        Update: { id?: string; org_id?: string; email?: string | null; role?: UserRole; token?: string; expires_at?: string; accepted_at?: string | null }
        Relationships: [{ foreignKeyName: 'invitations_org_id_fkey'; columns: ['org_id']; referencedRelation: 'organizations'; referencedColumns: ['id'] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      my_org_id: { Args: Record<PropertyKey, never>; Returns: string }
      my_role: { Args: Record<PropertyKey, never>; Returns: UserRole }
    }
    Enums: {
      user_role: UserRole
      payment_method: PaymentMethod
      sale_status: SaleStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}