// lib/hooks/use-toast.ts
// Sistema de toast sem Context — funciona em qualquer Client Component
// Uso: import { toast } from '@/lib/hooks/use-toast'
//      toast('Produto salvo!', 'success')

'use client'

import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type Toast = {
  id:      string
  message: string
  type:    ToastType
}

// ── Store singleton ───────────────────────────────────────────────────────────
const listeners = new Set<(toasts: Toast[]) => void>()
let store: Toast[] = []

function emit() {
  listeners.forEach((l) => l([...store]))
}

// ── Função pública para disparar toasts ───────────────────────────────────────
export function toast(message: string, type: ToastType = 'success', duration = 3500) {
  const id = crypto.randomUUID()
  store = [...store, { id, message, type }]
  emit()
  setTimeout(() => {
    store = store.filter((t) => t.id !== id)
    emit()
  }, duration)
}

// ── Hook para o container de toasts ──────────────────────────────────────────
export function useToasts() {
  const [state, setState] = useState<Toast[]>([])

  useEffect(() => {
    setState([...store])
    listeners.add(setState)
    return () => { listeners.delete(setState) }
  }, [])

  return state
}