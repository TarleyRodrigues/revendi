// app/(dashboard)/produtos/actions.ts
'use server'

import { createClient }   from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProductPayload } from '@/lib/types/produtos'

export type { ProductPayload }

export async function createProductAction(payload: ProductPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return { error: 'Perfil não encontrado.' }

  const { error } = await supabase.from('products').insert({
    org_id:           profile.org_id,
    name:             payload.name,
    brand:            payload.brand            || null,
    barcode:          payload.barcode          || null,
    cost_price:       payload.cost_price,
    sale_price:       payload.sale_price,
    max_discount_pct: payload.max_discount_pct ?? 0,
    stock_qty:        payload.stock_qty,
    expires_at:       payload.expires_at       || null,
    notes:            payload.notes            || null,
  })

  if (error) {
    console.error('[createProduct]', error.code, error.message)
    return { error: `Erro ao criar produto (${error.code}).` }
  }
  revalidatePath('/produtos')
  return { success: true }
}

export async function updateProductAction(id: string, payload: ProductPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('products').update({
    name:             payload.name,
    brand:            payload.brand            || null,
    barcode:          payload.barcode          || null,
    cost_price:       payload.cost_price,
    sale_price:       payload.sale_price,
    max_discount_pct: payload.max_discount_pct ?? 0,
    stock_qty:        payload.stock_qty,
    expires_at:       payload.expires_at       || null,
    notes:            payload.notes            || null,
  }).eq('id', id)

  if (error) {
    console.error('[updateProduct]', error.code, error.message)
    return { error: `Erro ao atualizar produto (${error.code}).` }
  }
  revalidatePath('/produtos')
  return { success: true }
}

export async function deleteProductAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) {
    console.error('[deleteProduct]', error.code, error.message)
    return { error: `Erro ao excluir produto (${error.code}).` }
  }
  revalidatePath('/produtos')
  return { success: true }
}