// components/dashboard/dashboard-tabs.tsx
'use client'

import { useState } from 'react'
import { DonutChart, CHART_COLORS } from '@/components/dashboard/donut-chart'
import { formatCurrency } from '@/lib/utils'

type Product  = { name: string; qty: number }
type Seller   = { name: string; total: number; count: number }
type Sale     = {
  id: string; total: number; payment_method: string
  status: string; created_at: string; seller_name: string | null
}

type Props = {
  topProducts:  Product[]
  topSellers:   Seller[]
  recentSales:  Sale[]
}

const TABS = ['Mais vendidos', 'Top vendedores', 'Movimentações'] as const
type Tab = typeof TABS[number]

const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro', card: 'Cartão', pix: 'Pix', credit: 'Fiado',
}

export function DashboardTabs({ topProducts, topSellers, recentSales }: Props) {
  const [tab, setTab] = useState<Tab>('Mais vendidos')

  const productSegments = topProducts.slice(0, 6).map((p, i) => ({
    label: p.name,
    value: p.qty,
    color: CHART_COLORS[i] ?? '#94a3b8',
  }))

  const sellerSegments = topSellers.slice(0, 6).map((s, i) => ({
    label: s.name,
    value: s.count,
    color: CHART_COLORS[i] ?? '#94a3b8',
  }))

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${
              tab === t
                ? 'text-emerald-600 border-b-2 border-emerald-500 -mb-px'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="p-4">

        {/* Mais vendidos */}
        {tab === 'Mais vendidos' && (
          topProducts.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Nenhuma venda ainda</p>
          ) : (
            <div className="space-y-4">
              <DonutChart
                segments={productSegments}
                centerLabel="vendas"
                size={120}
                thickness={26}
              />
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}</span>
                    <p className="flex-1 text-sm font-medium text-zinc-700 truncate">{p.name}</p>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {p.qty} un.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Top vendedores */}
        {tab === 'Top vendedores' && (
          topSellers.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Nenhuma venda ainda</p>
          ) : (
            <div className="space-y-4">
              <DonutChart
                segments={sellerSegments}
                centerLabel="pedidos"
                size={120}
                thickness={26}
              />
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                {topSellers.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-700 truncate">{s.name}</p>
                      <p className="text-xs text-zinc-400">{s.count} venda{s.count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-xs font-semibold text-zinc-800">
                      {formatCurrency(s.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Movimentações */}
        {tab === 'Movimentações' && (
          recentSales.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Nenhuma movimentação ainda</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    sale.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700">
                      <span className="font-medium">{sale.seller_name ?? 'Vendedor'}</span>
                      {' '}vendeu{' '}
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(sale.total)}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      {METHOD_LABEL[sale.payment_method]} ·{' '}
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}