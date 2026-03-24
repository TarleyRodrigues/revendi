// components/layout/header.tsx
'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface HeaderProps {
  userName: string
  orgName: string
  avatarUrl?: string | null
}

export function Header({ userName, orgName, avatarUrl }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-100 px-4 h-14 flex items-center justify-between">
      {/* Logo — só aparece no mobile (desktop tem sidebar) */}
      <span className="text-lg font-bold text-emerald-600 md:hidden">
        Revendi
      </span>

      {/* Nome da org — desktop */}
      <span className="hidden md:block text-sm text-zinc-500 font-medium">
        {orgName}
      </span>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium text-zinc-700 max-w-[120px] truncate">
            {userName}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}