// app/(dashboard)/configuracoes/page.tsx
import { createClient }        from '@/lib/supabase/server'
import { redirect }            from 'next/navigation'
import { ConfiguracoesClient } from '@/components/configuracoes/configuracoes-client'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_url, org_id')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'

  // Organização
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', profile.org_id)
    .single()

  // Membros da equipe (só admin)
  const { data: members } = isAdmin
    ? await supabase
        .from('profiles')
        .select('id, name, role, avatar_url, created_at')
        .eq('org_id', profile.org_id)
        .order('created_at')
    : { data: null }

  // Convites pendentes (só admin)
  const { data: invitations } = isAdmin
    ? await supabase
        .from('invitations')
        .select('id, email, role, token, expires_at, created_at')
        .eq('org_id', profile.org_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
    : { data: null }

  return (
    <ConfiguracoesClient
      profile={{
        id:         profile.id,
        name:       profile.name,
        role:       profile.role as 'admin' | 'seller',
        avatar_url: profile.avatar_url,
        email:      user.email ?? '',
      }}
      org={org ?? { id: '', name: '', slug: '' }}
      members={(members ?? []).map((m) => ({
        id:         m.id,
        name:       m.name,
        role:       m.role as 'admin' | 'seller',
        avatar_url: m.avatar_url,
        created_at: m.created_at,
      }))}
      invitations={(invitations ?? []).map((i) => ({
        id:         i.id,
        email:      i.email ?? '',
        role:       i.role as 'admin' | 'seller',
        token:      i.token,
        expires_at: i.expires_at,
        created_at: i.created_at,
      }))}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  )
}