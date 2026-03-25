// components/layout/header.tsx
'use client'

import Link    from 'next/link'
import { Settings } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface HeaderProps {
  userName:  string
  orgName:   string
  avatarUrl?: string | null
}

export function Header({ userName, orgName, avatarUrl }: HeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-100 px-4 h-14 flex items-center justify-between">
      {/* Logo mobile */}
      <span className="text-lg font-bold text-emerald-600 md:hidden">Revendi</span>

      {/* Nome da org desktop */}
      <span className="hidden md:block text-sm text-zinc-500 font-medium">{orgName}</span>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {/* Botão configurações desktop */}
        <Link
          href="/configuracoes"
          className="hidden md:flex w-9 h-9 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
          title="Configurações"
        >
          <Settings size={17} />
        </Link>

        {/* Avatar → configurações */}
        <Link
          href="/configuracoes"
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-zinc-50 transition-colors"
          title="Configurações"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium text-zinc-700 max-w-[120px] truncate">
            {userName}
          </span>
        </Link>
      </div>
    </header>
  )
}