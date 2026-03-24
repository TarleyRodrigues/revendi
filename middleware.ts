// middleware.ts (raiz do projeto)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/registro', '/convite']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Diagnóstico: loga cada requisição que passa pelo middleware ───────────
  console.log(`[middleware] ${request.method} ${pathname}`)

  // ─── Variáveis de ambiente ─────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Se as variáveis não estão definidas, não tenta autenticar.
    // Deixa a rota passar — o erro vai aparecer claro no console.
    console.error(
      '[middleware] ERRO FATAL: variáveis de ambiente não definidas.\n' +
      `  NEXT_PUBLIC_SUPABASE_URL     → ${supabaseUrl ? 'OK' : 'AUSENTE'}\n` +
      `  NEXT_PUBLIC_SUPABASE_ANON_KEY → ${supabaseKey ? 'OK' : 'AUSENTE'}\n` +
      '  Verifique seu arquivo .env.local'
    )
    return NextResponse.next({ request })
  }

  // ─── Inicializa cliente Supabase ───────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // ─── Busca usuário autenticado ─────────────────────────────────────────────
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      // Erro de sessão expirada é normal — trata sem travar
      console.warn(`[middleware] supabase.auth.getUser() retornou erro: ${error.message}`)
      // user continua null → será tratado como não autenticado
    } else {
      user = data.user
    }
  } catch (err) {
    // Erro de rede ou timeout
    console.error('[middleware] EXCEÇÃO ao chamar supabase.auth.getUser():', err)
    // Deixa passar — melhor que travar toda a aplicação
    return NextResponse.next({ request })
  }

  // ─── Lógica de redirecionamento ────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  console.log(
    `[middleware] user=${user?.email ?? 'anônimo'} | rota=${pathname} | pública=${isPublicRoute}`
  )

  // Não autenticado tentando acessar rota protegida → vai para /login
  // FIX: removida a exceção "pathname !== '/'" que causava o loop infinito
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    console.log(`[middleware] → redirect: ${pathname} → /login (não autenticado)`)
    return NextResponse.redirect(url)
  }

  // Autenticado tentando acessar login/registro → vai para dashboard
  if (user && (pathname === '/login' || pathname === '/registro')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    console.log(`[middleware] → redirect: ${pathname} → / (já autenticado)`)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas EXCETO:
     * - _next/static  → arquivos estáticos do Next.js
     * - _next/image   → otimização de imagens
     * - favicon.ico   → ícone do browser
     * - arquivos com extensão de imagem/fonte
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf)$).*)',
  ],
}