// components/auth/convite-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useForm }                 from 'react-hook-form'
import { zodResolver }             from '@hookform/resolvers/zod'
import { z }                       from 'zod'
import { Loader2, Building2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { acceptInviteAction }      from '@/app/(auth)/actions'
import { Button }                  from '@/components/ui/button'
import { Input }                   from '@/components/ui/input'
import { Label }                   from '@/components/ui/label'

type Props = {
  token:   string
  email:   string
  orgName: string
  role:    'admin' | 'seller'
}

const schema = z.object({
  name:            z.string().min(2, 'Nome muito curto'),
  password:        z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path:    ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const ROLE_LABEL = { admin: 'Administrador', seller: 'Vendedor' }
const ROLE_ICON  = { admin: ShieldCheck,     seller: ShieldAlert }

export function ConviteClient({ token, email, orgName, role }: Props) {
  const router                = useRouter()
  const [serverError, setErr] = useState<string | null>(null)
  const [pending, start]      = useTransition()

  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setErr(null)
    const fd = new FormData()
    fd.append('name',     data.name)
    fd.append('password', data.password)
    fd.append('token',    token)

    start(async () => {
      const res = await acceptInviteAction(fd)
      if (res?.error) { setErr(res.error); return }
      router.push('/')
      router.refresh()
    })
  }

  const RoleIcon = ROLE_ICON[role]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Revendi</h1>
        <p className="text-sm text-zinc-400">Você foi convidado para uma equipe</p>
      </div>

      {/* Card de info do convite */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center flex-shrink-0">
          <Building2 size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{orgName}</p>
          {email && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">{email}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 flex-shrink-0">
          <RoleIcon size={12} className="text-emerald-400" />
          <span className="text-xs font-medium text-zinc-300">{ROLE_LABEL[role]}</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Crie sua conta
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-zinc-300 text-sm">Seu nome</Label>
            <Input
              id="name"
              placeholder="João Silva"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300 text-sm">Crie uma senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="bg-red-950/60 border border-red-800 rounded-lg px-3 py-2">
              <p className="text-xs text-red-400">{serverError}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2"
          >
            {pending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Entrar na equipe'
            }
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Ao entrar, você concorda em fazer parte da equipe da <strong className="text-zinc-400">{orgName}</strong>.
      </p>
    </div>
  )
}