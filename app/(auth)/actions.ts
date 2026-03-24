// app/(auth)/actions.ts
'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSlug }      from '@/lib/utils'
import { redirect }          from 'next/navigation'
import { revalidatePath }    from 'next/cache'

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'E-mail ou senha incorretos.' }
  }

  redirect('/')
}

// ── REGISTRO ──────────────────────────────────────────────────────────────────
export async function registerAction(formData: FormData) {
  const name     = formData.get('name')     as string
  const orgName  = formData.get('orgName')  as string
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  // ── 1. Criar usuário no Auth ──────────────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    console.error('[registerAction] authError:', authError)
    if (authError?.message?.includes('already registered')) {
      return { error: 'Este e-mail já possui uma conta. Faça login.' }
    }
    return { error: authError?.message ?? 'Erro ao criar conta.' }
  }

  const userId = authData.user.id
  const slug   = generateSlug(orgName)

  console.log('[registerAction] Auth criado:', userId, '| slug:', slug)

  // ── 2. Usar service_role para bypassar RLS ────────────────────────────────
  const admin = createAdminClient()

  // ── 3. Criar organização ──────────────────────────────────────────────────
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single()

  if (orgError || !org) {
    console.error('[registerAction] ERRO org:', orgError?.code, orgError?.message)
    await admin.auth.admin.deleteUser(userId)
    console.warn('[registerAction] Usuário deletado por falha:', userId)

    if (orgError?.code === '23505') {
      return { error: 'Já existe uma empresa com este nome. Tente outro nome.' }
    }
    return { error: `Erro ao criar empresa (${orgError?.code ?? 'desconhecido'}).` }
  }

  console.log('[registerAction] Organização criada:', org.id)

  // ── 4. Criar perfil do admin ──────────────────────────────────────────────
  const { error: profileError } = await admin.from('profiles').insert({
    id:     userId,
    org_id: org.id,
    name,
    role:   'admin',
  })

  if (profileError) {
    console.error('[registerAction] ERRO profile:', profileError.code, profileError.message)
    await admin.from('organizations').delete().eq('id', org.id)
    await admin.auth.admin.deleteUser(userId)
    console.warn('[registerAction] Rollback completo para', userId)
    return { error: `Erro ao criar perfil (${profileError.code}).` }
  }

  console.log('[registerAction] Registro completo para', userId)

  redirect('/')
}

// ── ACEITAR CONVITE ───────────────────────────────────────────────────────────
export async function acceptInviteAction(formData: FormData) {
  const name     = formData.get('name')     as string
  const password = formData.get('password') as string
  const token    = formData.get('token')    as string

  const supabase = await createClient()
  const admin    = createAdminClient()

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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invite.email ?? `${token.slice(0, 8)}@revendi.app`,
    password,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Erro ao criar conta.' }
  }

  const userId = authData.user.id

  const { error: profileError } = await admin.from('profiles').insert({
    id:     userId,
    org_id: invite.org_id,
    name,
    role:   invite.role,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return { error: 'Erro ao criar perfil.' }
  }

  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  redirect('/')
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}