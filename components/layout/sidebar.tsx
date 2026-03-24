// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/configuracoes', icon: Settings, label: 'Config.' },
]

// ─── Bottom nav para mobile ───────────────────────────────
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100 safe-area-pb md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[52px]',
                active
                  ? 'text-emerald-600'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ─── Sidebar para desktop ─────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-zinc-100 px-3 py-6">
      {/* Logo */}
      <div className="px-3 mb-8">
        <span className="text-xl font-bold text-emerald-600 tracking-tight">
          Revendi
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}