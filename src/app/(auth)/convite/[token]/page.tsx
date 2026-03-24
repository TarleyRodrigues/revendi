// src/app/(auth)/convite/[token]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()

    // 1. Validar token
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      setServerError('Convite inválido ou expirado.')
      return
    }

    // 2. Criar usuário
    const email = invite.email ?? `${token.slice(0, 8)}@revendi.app`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: data.password,
    })

    if (authError || !authData.user) {
      setServerError(authError?.message ?? 'Erro ao criar conta.')
      return
    }

    // 3. Criar perfil
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      org_id: invite.org_id,
      name: data.name,
      role: invite.role,
    })

    if (profileError) {
      setServerError('Erro ao criar perfil.')
      return
    }

    // 4. Marcar convite como aceito
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Revendi
        </h1>
        <p className="text-sm text-zinc-400">Você foi convidado para uma equipe</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-zinc-300 text-sm">
              Seu nome
            </Label>
            <Input
              id="name"
              placeholder="João Silva"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300 text-sm">
              Crie uma senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm">
              Confirmar senha
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
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
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Entrar na equipe'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}