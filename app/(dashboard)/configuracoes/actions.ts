// app/(dashboard)/configuracoes/actions.ts
'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath }    from 'next/cache'

// ── ATUALIZAR PERFIL ──────────────────────────────────────────────────────────
export async function updateProfileAction(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('profiles').update({ name }).eq('id', user.id)

  if (error) {
    console.error('[updateProfile]', error.code, error.message)
    return { error: `Erro ao atualizar perfil (${error.code}).` }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// ── UPLOAD DE AVATAR ──────────────────────────────────────────────────────────
export async function updateAvatarAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'Nenhuma imagem selecionada.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Imagem muito grande. Máximo 2MB.' }

  const ext  = file.name.split('.').pop()?.toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp']
  if (!ext || !allowed.includes(ext)) return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }

  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[updateAvatar] upload:', uploadError.message)
    return { error: `Erro ao fazer upload (${uploadError.message}).` }
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  const { error: profileError } = await supabase
    .from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)

  if (profileError) {
    console.error('[updateAvatar] profile:', profileError.message)
    return { error: `Erro ao salvar avatar (${profileError.code}).` }
  }

  revalidatePath('/configuracoes')
  revalidatePath('/')
  return { success: true, avatarUrl: publicUrl }
}

// ── ALTERAR SENHA ─────────────────────────────────────────────────────────────
export async function updatePasswordAction(password: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (password.length < 6) return { error: 'Senha deve ter pelo menos 6 caracteres.' }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[updatePassword]', error.message)
    return { error: `Erro ao alterar senha (${error.message}).` }
  }

  return { success: true }
}

// ── ATUALIZAR DADOS DA EMPRESA (admin) ────────────────────────────────────────
export async function updateOrganizationAction(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile)              return { error: 'Perfil não encontrado.' }
  if (profile.role !== 'admin') return { error: 'Apenas admins podem editar a empresa.' }

  const { error } = await supabase
    .from('organizations').update({ name }).eq('id', profile.org_id)

  if (error) {
    console.error('[updateOrg]', error.code, error.message)
    return { error: `Erro ao atualizar empresa (${error.code}).` }
  }

  revalidatePath('/configuracoes')
  revalidatePath('/')
  return { success: true }
}

// ── CONVIDAR MEMBRO (admin) ───────────────────────────────────────────────────
export async function inviteMemberAction(email: string, role: 'admin' | 'seller') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile)                 return { error: 'Perfil não encontrado.' }
  if (profile.role !== 'admin') return { error: 'Apenas admins podem convidar.' }

  // Token único
  const token     = crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Verifica se já existe convite pendente para este e-mail
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('org_id', profile.org_id)
    .eq('email', email)
    .is('accepted_at', null)
    .single()

  if (existing) return { error: 'Já existe um convite pendente para este e-mail.' }

  const { error } = await supabase.from('invitations').insert({
    org_id:     profile.org_id,
    email,
    role,
    token,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('[inviteMember]', error.code, error.message)
    return { error: `Erro ao criar convite (${error.code}).` }
  }

  // URL do convite para copiar
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/convite/${token}`

  revalidatePath('/configuracoes')
  return { success: true, inviteUrl }
}

// ── REMOVER MEMBRO (admin) ────────────────────────────────────────────────────
export async function removeMemberAction(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile)                 return { error: 'Perfil não encontrado.' }
  if (profile.role !== 'admin') return { error: 'Apenas admins podem remover membros.' }
  if (memberId === user.id)     return { error: 'Você não pode remover a si mesmo.' }

  const admin = createAdminClient()

  // Remove profile e auth user
  const { error: profileError } = await supabase
    .from('profiles').delete().eq('id', memberId).eq('org_id', profile.org_id)

  if (profileError) {
    console.error('[removeMember] profile:', profileError.message)
    return { error: `Erro ao remover membro (${profileError.code}).` }
  }

  await admin.auth.admin.deleteUser(memberId)

  revalidatePath('/configuracoes')
  return { success: true }
}

// ── ALTERAR ROLE DO MEMBRO (admin) ────────────────────────────────────────────
export async function updateMemberRoleAction(memberId: string, role: 'admin' | 'seller') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile)                 return { error: 'Perfil não encontrado.' }
  if (profile.role !== 'admin') return { error: 'Apenas admins podem alterar permissões.' }
  if (memberId === user.id)     return { error: 'Você não pode alterar seu próprio cargo.' }

  const { error } = await supabase
    .from('profiles').update({ role }).eq('id', memberId).eq('org_id', profile.org_id)

  if (error) {
    console.error('[updateMemberRole]', error.code, error.message)
    return { error: `Erro ao alterar cargo (${error.code}).` }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}

// ── CANCELAR CONVITE (admin) ──────────────────────────────────────────────────
export async function cancelInviteAction(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('invitations').delete().eq('id', inviteId)

  if (error) {
    console.error('[cancelInvite]', error.code, error.message)
    return { error: `Erro ao cancelar convite (${error.code}).` }
  }

  revalidatePath('/configuracoes')
  return { success: true }
}