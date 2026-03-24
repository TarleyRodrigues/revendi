// lib/types/produtos.ts

export type Product = {
  id:               string
  name:             string
  brand:            string | null
  barcode:          string | null
  cost_price:       number
  sale_price:       number
  max_discount_pct: number
  stock_qty:        number
  expires_at:       string | null
  notes:            string | null
  created_at:       string
}

export type ProductPayload = {
  name:             string
  brand:            string | null
  barcode:          string | null
  cost_price:       number
  sale_price:       number
  max_discount_pct: number
  stock_qty:        number
  expires_at:       string | null
  notes:            string | null
}