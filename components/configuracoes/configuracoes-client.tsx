// components/configuracoes/configuracoes-client.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import {
  User, Building2, Users, Mail, Lock, Camera,
  Plus, Trash2, Loader2, Check, X, Copy,
  ChevronDown, LogOut,
} from 'lucide-react'
import {
  updateProfileAction,
  updateAvatarAction,
  updatePasswordAction,
  updateOrganizationAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  cancelInviteAction,
} from '@/app/(dashboard)/configuracoes/actions'
import { logoutAction } from '@/app/(auth)/actions'

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Profile = {
  id: string; name: string; role: 'admin' | 'seller'
  avatar_url: string | null; email: string
}
type Org         = { id: string; name: string; slug: string }
type Member      = { id: string; name: string; role: 'admin' | 'seller'; avatar_url: string | null; created_at: string }
type Invitation  = { id: string; email: string; role: 'admin' | 'seller'; token: string; expires_at: string; created_at: string }
type Props       = { profile: Profile; org: Org; members: Member[]; invitations: Invitation[]; isAdmin: boolean; currentUserId: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
const inp = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
const lbl = "block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5"

function Feedback({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <p className={`text-xs px-3 py-2 rounded-lg border ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-200'
    }`}>{msg}</p>
  )
}

function AvatarDisplay({ url, name, size = 'md' }: { url: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }[size]
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return (
    <div className={`${sz} rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-emerald-700">{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}

// ── Accordion wrapper ─────────────────────────────────────────────────────────
function AccordionSection({
  icon: Icon, title, subtitle, children, defaultOpen = false,
}: {
  icon:         React.ElementType
  title:        string
  subtitle?:    string
  children:     React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-emerald-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-800">{title}</p>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Seção: Foto ───────────────────────────────────────────────────────────────
function SectionFoto({ profile }: { profile: Profile }) {
  const [avatarUrl, setAvatar]  = useState(profile.avatar_url)
  const [msg,       setMsg]     = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [pending,   start]      = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg(null)
    const fd = new FormData()
    fd.append('avatar', file)
    start(async () => {
      const res = await updateAvatarAction(fd)
      if (res.error) { setMsg({ text: res.error, type: 'error' }); return }
      setAvatar(res.avatarUrl ?? null)
      setMsg({ text: 'Foto atualizada com sucesso!', type: 'success' })
    })
  }

  return (
    <AccordionSection icon={Camera} title="Foto de perfil" subtitle="JPG, PNG ou WebP · máx. 2MB">
      <div className="flex items-center gap-5">
        <AvatarDisplay url={avatarUrl} name={profile.name} size="lg" />
        <div className="space-y-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {pending ? 'Enviando...' : 'Alterar foto'}
          </button>
          <p className="text-xs text-zinc-400">A foto aparece no header e no perfil.</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
      {msg && <Feedback msg={msg.text} type={msg.type} />}
    </AccordionSection>
  )
}

// ── Seção: Nome ───────────────────────────────────────────────────────────────
function SectionNome({ profile }: { profile: Profile }) {
  const [name,    setName]  = useState(profile.name)
  const [msg,     setMsg]   = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [pending, start]    = useTransition()

  function save() {
    if (!name.trim() || name === profile.name) return
    setMsg(null)
    start(async () => {
      const res = await updateProfileAction(name.trim())
      setMsg(res.error
        ? { text: res.error, type: 'error' }
        : { text: 'Nome atualizado!', type: 'success' })
    })
  }

  return (
    <AccordionSection icon={User} title="Nome de exibição" subtitle={profile.name}>
      <div>
        <label className={lbl}>Nome</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className={inp}
        />
      </div>
      <button
        onClick={save}
        disabled={pending || !name.trim() || name === profile.name}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Salvar nome
      </button>
      {msg && <Feedback msg={msg.text} type={msg.type} />}
    </AccordionSection>
  )
}

// ── Seção: Senha ──────────────────────────────────────────────────────────────
function SectionSenha() {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [msg,      setMsg]      = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [pending,  start]       = useTransition()

  function save() {
    if (password !== confirm) { setMsg({ text: 'As senhas não coincidem.', type: 'error' }); return }
    if (password.length < 6)  { setMsg({ text: 'Mínimo 6 caracteres.', type: 'error' }); return }
    setMsg(null)
    start(async () => {
      const res = await updatePasswordAction(password)
      if (res.error) { setMsg({ text: res.error, type: 'error' }); return }
      setMsg({ text: 'Senha alterada com sucesso!', type: 'success' })
      setPassword(''); setConfirm('')
    })
  }

  return (
    <AccordionSection icon={Lock} title="Alterar senha">
      <div>
        <label className={lbl}>Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className={inp}
        />
      </div>
      <div>
        <label className={lbl}>Confirmar nova senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a senha"
          className={inp}
        />
      </div>
      <button
        onClick={save}
        disabled={pending || !password || !confirm}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
        Alterar senha
      </button>
      {msg && <Feedback msg={msg.text} type={msg.type} />}
    </AccordionSection>
  )
}

// ── Seção: Empresa ────────────────────────────────────────────────────────────
function SectionEmpresa({ org }: { org: Org }) {
  const [name,    setName]  = useState(org.name)
  const [msg,     setMsg]   = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [pending, start]    = useTransition()

  function save() {
    if (!name.trim() || name === org.name) return
    setMsg(null)
    start(async () => {
      const res = await updateOrganizationAction(name.trim())
      setMsg(res.error
        ? { text: res.error, type: 'error' }
        : { text: 'Empresa atualizada!', type: 'success' })
    })
  }

  return (
    <AccordionSection icon={Building2} title="Dados da empresa" subtitle={org.name}>
      <div>
        <label className={lbl}>Nome da empresa</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className={inp}
        />
      </div>
      <div>
        <label className={lbl}>Slug (identificador)</label>
        <input
          value={org.slug}
          disabled
          className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm bg-zinc-50 text-zinc-400 cursor-not-allowed"
        />
        <p className="text-xs text-zinc-400 mt-1">O slug não pode ser alterado após a criação.</p>
      </div>
      <button
        onClick={save}
        disabled={pending || !name.trim() || name === org.name}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Salvar
      </button>
      {msg && <Feedback msg={msg.text} type={msg.type} />}
    </AccordionSection>
  )
}

// ── Seção: Equipe ─────────────────────────────────────────────────────────────
function SectionEquipe({ members: initial, invitations: initialInvites, currentUserId }: {
  members: Member[]; invitations: Invitation[]; currentUserId: string
}) {
  const [members,     setMembers]     = useState<Member[]>(initial)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvites)
  const [email,       setEmail]       = useState('')
  const [role,        setRole]        = useState<'seller' | 'admin'>('seller')
  const [inviteUrl,   setInviteUrl]   = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)
  const [msgInvite,   setMsgInvite]   = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [pendInvite,  startInvite]    = useTransition()
  const [pendAction,  startAction]    = useTransition()

  function sendInvite() {
    if (!email.trim()) return
    setMsgInvite(null); setInviteUrl(null)
    startInvite(async () => {
      const res = await inviteMemberAction(email.trim(), role)
      if (res.error) { setMsgInvite({ text: res.error, type: 'error' }); return }
      setInviteUrl(res.inviteUrl ?? null)
      setMsgInvite({ text: 'Convite gerado! Copie e envie o link abaixo.', type: 'success' })
      setEmail('')
      setInvitations((prev) => [{
        id: crypto.randomUUID(), email: email.trim(), role,
        token: '', expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
      }, ...prev])
    })
  }

  function copyUrl() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function removeMember(id: string) {
    startAction(async () => {
      const res = await removeMemberAction(id)
      if (res.error) { alert(res.error); return }
      setMembers((prev) => prev.filter((m) => m.id !== id))
    })
  }

  function changeRole(id: string, newRole: 'admin' | 'seller') {
    startAction(async () => {
      const res = await updateMemberRoleAction(id, newRole)
      if (res.error) { alert(res.error); return }
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: newRole } : m))
    })
  }

  function cancelInvite(id: string) {
    startAction(async () => {
      const res = await cancelInviteAction(id)
      if (res.error) { alert(res.error); return }
      setInvitations((prev) => prev.filter((i) => i.id !== id))
    })
  }

  const subtitle = `${members.length} membro${members.length !== 1 ? 's' : ''}${invitations.length > 0 ? ` · ${invitations.length} convite${invitations.length !== 1 ? 's' : ''} pendente${invitations.length !== 1 ? 's' : ''}` : ''}`

  return (
    <AccordionSection icon={Users} title="Equipe" subtitle={subtitle}>

      {/* Convidar */}
      <div className="space-y-3 pb-4 border-b border-zinc-100">
        <p className={lbl}>Convidar novo membro</p>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
            placeholder="email@exemplo.com"
            type="email"
            className={`flex-1 ${inp}`}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'seller' | 'admin')}
            className="px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="seller">Vendedor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={sendInvite}
          disabled={pendInvite || !email.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {pendInvite ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Gerar link de convite
        </button>
        {msgInvite && <Feedback msg={msgInvite.text} type={msgInvite.type} />}
        {inviteUrl && (
          <div className="flex gap-2 items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5">
            <p className="text-xs text-zinc-600 flex-1 truncate font-mono">{inviteUrl}</p>
            <button onClick={copyUrl}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex-shrink-0 transition-colors">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Membros */}
      <div className="space-y-2">
        <p className={lbl}>Membros ({members.length})</p>
        {members.map((m) => (
          <div key={m.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <AvatarDisplay url={m.avatar_url} name={m.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">
                {m.name}
                {m.id === currentUserId && (
                  <span className="ml-1.5 text-[10px] text-zinc-400 font-normal">(você)</span>
                )}
              </p>
            </div>
            {m.id !== currentUserId ? (
              <select
                value={m.role}
                onChange={(e) => changeRole(m.id, e.target.value as 'admin' | 'seller')}
                disabled={pendAction}
                className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              >
                <option value="seller">Vendedor</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                m.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {m.role === 'admin' ? 'Admin' : 'Vendedor'}
              </span>
            )}
            {m.id !== currentUserId && (
              <button
                onClick={() => removeMember(m.id)}
                disabled={pendAction}
                className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Convites pendentes */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          <p className={lbl}>Convites pendentes ({invitations.length})</p>
          {invitations.map((inv) => (
            <div key={inv.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Mail size={15} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{inv.email}</p>
                <p className="text-xs text-zinc-400">
                  {inv.role === 'admin' ? 'Admin' : 'Vendedor'} ·{' '}
                  Expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => cancelInvite(inv.id)}
                disabled={pendAction}
                className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </AccordionSection>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ConfiguracoesClient({
  profile, org, members, invitations, isAdmin, currentUserId,
}: Props) {
  const [pendLogout, startLogout] = useTransition()

  return (
    <div className="space-y-3 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-zinc-900">Configurações</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          {profile.email} · {isAdmin ? 'Administrador' : 'Vendedor'} · {org.name}
        </p>
      </div>

      {/* Perfil — todos veem */}
      <SectionFoto  profile={profile} />
      <SectionNome  profile={profile} />
      <SectionSenha />

      {/* Empresa + Equipe — só admin */}
      {isAdmin && (
        <>
          <SectionEmpresa org={org} />
          <SectionEquipe
            members={members}
            invitations={invitations}
            currentUserId={currentUserId}
          />
        </>
      )}

      {/* Sair */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-4">
        <button
          onClick={() => startLogout(async () => { await logoutAction() })}
          disabled={pendLogout}
          className="w-full py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pendLogout ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          Sair da conta
        </button>
      </div>
    </div>
  )
}