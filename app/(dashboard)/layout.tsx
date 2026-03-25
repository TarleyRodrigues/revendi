// app/(dashboard)/layout.tsx

import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import { Sidebar, BottomNav } from '@/components/layout/sidebar'
import { Header }          from '@/components/layout/header'
import { ToastContainer }  from '@/components/ui/toast-container'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar_url, role, organizations(name)')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[layout] ERRO ao buscar profile:', profileError.code, profileError.message)
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header userName={user.email ?? 'Usuário'} orgName="Revendi" avatarUrl={null} />
          <main className="flex-1 p-4 pb-24 md:pb-6 md:p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-md">
              <p className="text-sm font-semibold text-amber-800">⚠ Perfil não configurado</p>
              <p className="text-xs text-amber-700 mt-1">
                Insira uma linha na tabela <strong>profiles</strong> com o ID: {user.id}
              </p>
            </div>
          </main>
        </div>
        <BottomNav />
        <ToastContainer />
      </div>
    )
  }

  const orgName = (profile.organizations as { name: string } | null)?.name ?? 'Revendi'

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={profile.name}
          orgName={orgName}
          avatarUrl={profile.avatar_url}
        />
        <main className="flex-1 p-4 pb-24 md:pb-6 md:p-6">
          {children}
        </main>
      </div>

      <BottomNav />
      <ToastContainer />
    </div>
  )
}