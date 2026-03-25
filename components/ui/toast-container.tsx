// components/ui/toast-container.tsx
'use client'

import { useToasts, type ToastType } from '@/lib/hooks/use-toast'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const CONFIG: Record<ToastType, { icon: React.ElementType; cls: string }> = {
  success: { icon: CheckCircle2,  cls: 'bg-emerald-600 text-white' },
  error:   { icon: XCircle,       cls: 'bg-red-600 text-white'     },
  info:    { icon: Info,          cls: 'bg-zinc-800 text-white'    },
  warning: { icon: AlertTriangle, cls: 'bg-amber-500 text-white'   },
}

export function ToastContainer() {
  const toasts = useToasts()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const { icon: Icon, cls } = CONFIG[t.type]
        return (
          <div
            key={t.id}
            className={`
              ${cls}
              flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg
              pointer-events-auto
              animate-in slide-in-from-top-2 fade-in duration-200
            `}
          >
            <Icon size={16} className="flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{t.message}</p>
          </div>
        )
      })}
    </div>
  )
}