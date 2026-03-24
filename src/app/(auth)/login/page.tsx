// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
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

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError('E-mail ou senha incorretos.')
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
        <p className="text-sm text-zinc-400">Entre na sua conta</p>
      </div>

      {/* Card do formulário */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              autoComplete="current-password"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
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
              'Entrar'
            )}
          </Button>
        </form>
      </div>

      {/* Link para registro */}
      <p className="text-center text-sm text-zinc-500">
        Não tem uma conta?{' '}
        <Link
          href="/registro"
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Criar conta
        </Link>
      </p>
    </div>
  )
}