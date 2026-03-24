// src/app/(auth)/actions.ts
// Server Actions para login, registro e convite
'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'E-mail ou senha incorretos.' }
  }

  redirect('/')
}

// ─────────────────────────────────────────
// REGISTRO (cria conta + organização)
// ─────────────────────────────────────────
export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string
  const orgName = formData.get('orgName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Erro ao criar conta.' }
  }

  const userId = authData.user.id
  const slug = generateSlug(orgName)

  // 2. Criar organização
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single()

  if (orgError || !org) {
    return { error: 'Erro ao criar organização. Tente um nome diferente.' }
  }

  // 3. Criar perfil do admin
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    org_id: org.id,
    name,
    role: 'admin',
  })

  if (profileError) {
    return { error: 'Erro ao criar perfil de usuário.' }
  }

  redirect('/')
}

// ─────────────────────────────────────────
// ACEITAR CONVITE
// ─────────────────────────────────────────
export async function acceptInviteAction(formData: FormData) {
  const name = formData.get('name') as string
  const password = formData.get('password') as string
  const token = formData.get('token') as string

  const supabase = await createClient()

  // 1. Validar token do convite (usa service role via supabase server)
  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invite) {
    return { error: 'Convite inválido ou expirado.' }
  }

  // 2. Criar usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invite.email ?? `${token.slice(0, 8)}@revendi.app`,
    password,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Erro ao criar conta.' }
  }

  const userId = authData.user.id

  // 3. Criar perfil como vendedor
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    org_id: invite.org_id,
    name,
    role: invite.role,
  })

  if (profileError) {
    return { error: 'Erro ao criar perfil.' }
  }

  // 4. Marcar convite como aceito
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  redirect('/')
}

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}