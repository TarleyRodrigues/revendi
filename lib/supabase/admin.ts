// lib/supabase/admin.ts
// ⚠ NUNCA importe este arquivo em Client Components ('use client')
// Usar apenas em Server Actions e Route Handlers

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      '[createAdminClient] Variáveis ausentes:\n' +
      `  NEXT_PUBLIC_SUPABASE_URL     → ${url ? 'OK' : 'AUSENTE'}\n` +
      `  SUPABASE_SERVICE_ROLE_KEY    → ${key ? 'OK' : 'AUSENTE'}\n` +
      '  Verifique seu .env.local'
    )
  }

  // service_role bypassa RLS — usar apenas para operações privilegiadas
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}