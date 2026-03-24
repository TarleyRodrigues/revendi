// app/(dashboard)/clientes/actions.ts
'use server'

import { createClient }   from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CustomerPayload = {
  name:  string
  phone: string | null
  email: string | null
  notes: string | null
}

// ── CRIAR ─────────────────────────────────────────────────────────────────────
export async function createCustomerAction(payload: CustomerPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return { error: 'Perfil não encontrado.' }

  const { error } = await supabase.from('customers').insert({
    org_id: profile.org_id,
    name:   payload.name,
    phone:  payload.phone  || null,
    email:  payload.email  || null,
    notes:  payload.notes  || null,
  })

  if (error) {
    console.error('[createCustomer]', error.code, error.message)
    if (error.code === '23505') return { error: 'Já existe um cliente com esses dados.' }
    return { error: `Erro ao criar cliente (${error.code}).` }
  }

  revalidatePath('/clientes')
  return { success: true }
}

// ── EDITAR ────────────────────────────────────────────────────────────────────
export async function updateCustomerAction(id: string, payload: CustomerPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('customers').update({
    name:  payload.name,
    phone: payload.phone || null,
    email: payload.email || null,
    notes: payload.notes || null,
  }).eq('id', id)

  if (error) {
    console.error('[updateCustomer]', error.code, error.message)
    return { error: `Erro ao atualizar cliente (${error.code}).` }
  }

  revalidatePath('/clientes')
  return { success: true }
}

// ── EXCLUIR ───────────────────────────────────────────────────────────────────
export async function deleteCustomerAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('customers').delete().eq('id', id)

  if (error) {
    console.error('[deleteCustomer]', error.code, error.message)
    // Erro de FK — cliente tem vendas vinculadas
    if (error.code === '23503') return { error: 'Não é possível excluir: cliente possui vendas registradas.' }
    return { error: `Erro ao excluir cliente (${error.code}).` }
  }

  revalidatePath('/clientes')
  return { success: true }
}