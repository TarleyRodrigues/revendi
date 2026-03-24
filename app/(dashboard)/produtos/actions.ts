// app/(dashboard)/produtos/actions.ts
'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath }    from 'next/cache'

export type ProductPayload = {
  name:        string
  description: string
  price:       number
  cost_price:  number
  stock_qty:   number
  expires_at:  string | null
}

// ── CRIAR ─────────────────────────────────────────────────────────────────────
export async function createProductAction(payload: ProductPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil não encontrado.' }

  const { error } = await supabase.from('products').insert({
    ...payload,
    org_id:     profile.org_id,
    expires_at: payload.expires_at || null,
  })

  if (error) {
    console.error('[createProductAction]', error.code, error.message)
    return { error: `Erro ao criar produto (${error.code}).` }
  }

  revalidatePath('/produtos')
  return { success: true }
}

// ── EDITAR ────────────────────────────────────────────────────────────────────
export async function updateProductAction(id: string, payload: ProductPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('products')
    .update({
      ...payload,
      expires_at: payload.expires_at || null,
    })
    .eq('id', id)

  if (error) {
    console.error('[updateProductAction]', error.code, error.message)
    return { error: `Erro ao atualizar produto (${error.code}).` }
  }

  revalidatePath('/produtos')
  return { success: true }
}

// ── EXCLUIR ───────────────────────────────────────────────────────────────────
export async function deleteProductAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteProductAction]', error.code, error.message)
    return { error: `Erro ao excluir produto (${error.code}).` }
  }

  revalidatePath('/produtos')
  return { success: true }
}