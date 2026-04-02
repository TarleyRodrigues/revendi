// app/(auth)/convite/[token]/page.tsx
import { ConviteClient } from '@/components/auth/convite-client'
import { createClient }  from '@/lib/supabase/server'

type Props = { params: { token: string } }

// ── Server component: valida o token antes de renderizar ──────────────────────
// Se o token for inválido ou expirado, mostra erro direto sem precisar submeter
export default async function ConvitePage({ params }: Props) {
  const { token } = params
  const supabase  = await createClient()

  // Busca convite + nome da organização
  const { data: invite, error } = await supabase
    .from('invitations')
    .select('id, email, role, expires_at, accepted_at, organizations(name)')
    .eq('token', token)
    .single()

  // Token não encontrado
  if (error || !invite) {
    return <ConviteError message="Convite não encontrado." />
  }

  // Já aceito
  if (invite.accepted_at) {
    return <ConviteError message="Este convite já foi utilizado." />
  }

  // Expirado
  if (new Date(invite.expires_at) < new Date()) {
    return <ConviteError message="Este convite expirou. Solicite um novo ao administrador." />
  }

  const orgName = (invite.organizations as { name: string } | null)?.name ?? 'sua equipe'
  const role    = invite.role as 'admin' | 'seller'

  return (
    <ConviteClient
      token={token}
      email={invite.email ?? ''}
      orgName={orgName}
      role={role}
    />
  )
}

// ── Tela de erro de convite ────────────────────────────────────────────────────
function ConviteError({ message }: { message: string }) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Revendi</h1>
        <p className="text-sm text-zinc-400">Convite inválido</p>
      </div>
      <div className="bg-zinc-900 border border-red-800/50 rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-red-950/60 flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠</span>
        </div>
        <p className="text-sm text-red-400 font-medium">{message}</p>
        <a
          href="/login"
          className="inline-block text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
        >
          Ir para o login →
        </a>
      </div>
    </div>
  )
}