// src/app/(auth)/registro/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  orgName: z.string().min(2, 'Nome da empresa muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
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

    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError || !authData.user) {
      setServerError(authError?.message ?? 'Erro ao criar conta.')
      return
    }

    const userId = authData.user.id
    const slug = generateSlug(data.orgName)

    // 2. Criar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: data.orgName, slug })
      .select('id')
      .single()

    if (orgError || !org) {
      setServerError('Erro ao criar organização. Tente um nome diferente.')
      return
    }

    // 3. Criar perfil do admin
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      org_id: org.id,
      name: data.name,
      role: 'admin',
    })

    if (profileError) {
      setServerError('Erro ao criar perfil.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Logo / marca */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Revendi
        </h1>
        <p className="text-sm text-zinc-400">Crie sua conta e sua empresa</p>
      </div>

      {/* Card do formulário */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Separador visual: dados pessoais */}
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Seus dados
          </p>

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
            <Label htmlFor="email" className="text-zinc-300 text-sm">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@email.com"
              autoComplete="email"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300 text-sm">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
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
              autoComplete="new-password"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Separador visual: dados da empresa */}
          <div className="pt-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Sua empresa
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="orgName" className="text-zinc-300 text-sm">
              Nome da empresa / loja
            </Label>
            <Input
              id="orgName"
              placeholder="Minha Revenda"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('orgName')}
            />
            {errors.orgName && (
              <p className="text-xs text-red-400">{errors.orgName.message}</p>
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
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Criar conta'
            )}
          </Button>
        </form>
      </div>

      {/* Link para login */}
      <p className="text-center text-sm text-zinc-500">
        Já tem uma conta?{' '}
        <Link
          href="/login"
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}