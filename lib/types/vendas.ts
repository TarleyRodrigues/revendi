// lib/types/vendas.ts

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'credit'
export type SaleStatus    = 'paid' | 'pending'

export type SaleItem = {
  id:          string
  sale_id:     string
  product_id:  string
  qty:         number
  unit_price:  number
  unit_cost:   number
  discount_pct: number
  product_name?: string
}

export type Sale = {
  id:             string
  org_id:         string
  customer_id:    string | null
  seller_id:      string
  total:          number
  payment_method: PaymentMethod
  status:         SaleStatus
  paid_at:        string | null
  created_at:     string
  customer_name?: string | null
  seller_name?:   string | null
  items?:         SaleItem[]
}

export type CreditPayment = {
  id:         string
  sale_id:    string
  amount:     number
  user_id:    string
  created_at: string
}

export type Customer = {
  id:    string
  name:  string
  phone: string | null
}

export type CartItem = {
  product_id:   string
  product_name: string
  qty:          number
  unit_price:   number
  unit_cost:    number
  discount_pct: number
  sale_price:   number      // preço original do produto
  max_discount_pct: number  // limite de desconto
}

export type NewSalePayload = {
  customer_id:    string | null
  payment_method: PaymentMethod
  items:          Omit<CartItem, 'product_name' | 'sale_price' | 'max_discount_pct'>[]
}