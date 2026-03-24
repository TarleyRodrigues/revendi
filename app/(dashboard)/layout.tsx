// app/(dashboard)/layout.tsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // ── 1. Verifica autenticação ──────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.error('[layout] ERRO auth.getUser():', authError.message)
    redirect('/login')
  }

  if (!user) {
    console.warn('[layout] Sem usuário autenticado → /login')
    redirect('/login')
  }

  console.log('[layout] Usuário autenticado:', user.id, user.email)

  // ── 2. Busca perfil ────────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar_url, role, organizations(name)')
    .eq('id', user.id)
    .single()

  // ── DIAGNÓSTICO: loga o resultado completo da query ───────────────────────
  if (profileError) {
    console.error(
      '[layout] ERRO ao buscar profile:\n',
      `  código  : ${profileError.code}\n`,
      `  mensagem: ${profileError.message}\n`,
      `  detalhes: ${profileError.details}\n`,
      `  hint    : ${profileError.hint}\n`,
      '\n  ➜ Causas comuns:\n',
      '    • RLS bloqueando SELECT na tabela profiles\n',
      '    • Não existe linha em profiles para user.id =', user.id, '\n',
      '    • A coluna "org_id" ou o join "organizations" está com nome errado\n',
    )
  } else {
    console.log('[layout] Profile encontrado:', JSON.stringify(profile))
  }

  // ── 3. Se não achou profile, NÃO redireciona para /login (quebraria o loop)
  //       Mostra a UI mesmo assim, com fallback ─────────────────────────────
  if (!profile) {
    console.error(
      '[layout] profile é null — NÃO vai redirecionar para evitar loop.\n',
      '  Verifique se existe uma linha em "profiles" com id =', user.id
    )

    // Renderiza layout com valores padrão para não travar o usuário
    return (
      <div className="min-h-screen bg-zinc-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            userName={user.email ?? 'Usuário'}
            orgName="Revendi"
            avatarUrl={null}
          />
          <main className="flex-1 p-4 pb-24 md:pb-6 md:p-6">
            {/* Aviso de configuração pendente */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 font-medium">
                ⚠ Perfil não encontrado para este usuário.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Verifique o console do servidor para detalhes. User ID: {user.id}
              </p>
            </div>
            {children}
          </main>
        </div>
      </div>
    )
  }

  // ── 4. Layout normal ───────────────────────────────────────────────────────
  const orgName =
    (profile.organizations as { name: string } | null)?.name ?? 'Revendi'

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

      {/* Bottom nav mobile */}
      <div className="md:hidden">
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100">
          <div className="flex items-center justify-around h-16 px-2">
            {[
              { href: '/', icon: '⊞', label: 'Dashboard' },
              { href: '/produtos', icon: '📦', label: 'Produtos' },
              { href: '/vendas', icon: '🛒', label: 'Vendas' },
              { href: '/clientes', icon: '👤', label: 'Clientes' },
              { href: '/configuracoes', icon: '⚙', label: 'Config.' },
            ].map(({ href, icon, label }) => (
              <a
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
              >
                <span className="text-lg leading-none">{icon}</span>
                <span className="text-[10px] font-medium">{label}</span>
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}