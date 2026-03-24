// components/dashboard/metric-card.tsx
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'emerald' | 'blue' | 'amber' | 'red'
}

const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'emerald',
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {title}
        </p>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', colorMap[color])}>
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>

      <p className="text-2xl font-bold text-zinc-900 tracking-tight">
        {value}
      </p>

      {subtitle && (
        <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
      )}

      {trendValue && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              'text-xs font-medium',
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-zinc-400'
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
          <span className="text-xs text-zinc-400">vs mês anterior</span>
        </div>
      )}
    </div>
  )
}