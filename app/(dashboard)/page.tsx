// app/(dashboard)/page.tsx

import { createClient }    from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { MetricCard }      from '@/components/dashboard/metric-card'
import { DashboardTabs }   from '@/components/dashboard/dashboard-tabs'
import { formatCurrency }  from '@/lib/utils'
import {
  ShoppingCart, TrendingUp, Users, Package, AlertTriangle,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, name, role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfWeek  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const in30days     = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  // ── Todas as queries em paralelo ───────────────────────────────────────────
  const [
    { data: salesMonth },
    { data: salesWeek },
    { data: creditSales },
    { count: totalCustomers },
    { data: lowStock },
    { data: expiringProducts },
    { data: topItems },
    { data: salesWithSellers },
  ] = await Promise.all([
    supabase.from('sales').select('id, total, status')
      .eq('org_id', orgId).gte('created_at', startOfMonth),

    supabase.from('sales').select('id')
      .eq('org_id', orgId).gte('created_at', startOfWeek),

    supabase.from('sales').select('id, total')
      .eq('org_id', orgId).eq('status', 'pending'),

    supabase.from('customers')
      .select('id', { count: 'exact', head: true }).eq('org_id', orgId),

    supabase.from('products')
      .select('id, name, stock_qty')
      .eq('org_id', orgId).lt('stock_qty', 5)
      .order('stock_qty', { ascending: true }),

    supabase.from('products')
      .select('id, name, expires_at, stock_qty')
      .eq('org_id', orgId)
      .not('expires_at', 'is', null)
      .lte('expires_at', in30days)
      .gt('stock_qty', 0)
      .order('expires_at', { ascending: true }),

    supabase.from('sale_items')
      .select('product_id, qty, products(name)')
      .gte('created_at' as never, startOfMonth)
      .limit(100),

    // Query para top vendedores + movimentações recentes
    supabase.from('sales')
      .select('id, seller_id, total, payment_method, status, created_at, profiles(name)')
      .eq('org_id', orgId)
      .gte('created_at', startOfMonth)
      .order('created_at', { ascending: false }),
  ])

  // ── Métricas ───────────────────────────────────────────────────────────────
  const totalSalesMonth = salesMonth?.reduce((acc, s) => acc + Number(s.total), 0) ?? 0
  const countSalesMonth = salesMonth?.length ?? 0
  const countSalesWeek  = salesWeek?.length ?? 0
  const totalCredit     = creditSales?.reduce((acc, s) => acc + Number(s.total), 0) ?? 0
  const countCredit     = creditSales?.length ?? 0

  // ── Top produtos ───────────────────────────────────────────────────────────
  const productMap = new Map<string, { name: string; qty: number }>()
  topItems?.forEach((item) => {
    const name = (item.products as { name: string } | null)?.name ?? 'Produto'
    const prev = productMap.get(item.product_id) ?? { name, qty: 0 }
    productMap.set(item.product_id, { name, qty: prev.qty + item.qty })
  })
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6)

  // ── Top vendedores ─────────────────────────────────────────────────────────
  const sellerMap = new Map<string, { name: string; total: number; count: number }>()
  salesWithSellers?.forEach((s) => {
    const name = (s.profiles as { name: string } | null)?.name ?? 'Vendedor'
    const prev = sellerMap.get(s.seller_id) ?? { name, total: 0, count: 0 }
    sellerMap.set(s.seller_id, {
      name,
      total: prev.total + Number(s.total),
      count: prev.count + 1,
    })
  })
  const topSellers = [...sellerMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  // ── Movimentações recentes normalizadas ────────────────────────────────────
  const recentSales = (salesWithSellers ?? []).slice(0, 10).map((s) => ({
    id:             s.id,
    total:          Number(s.total),
    payment_method: s.payment_method,
    status:         s.status,
    created_at:     s.created_at,
    seller_name:    (s.profiles as { name: string } | null)?.name ?? null,
  }))

  const hasAlerts = (lowStock?.length ?? 0) > 0 || (expiringProducts?.length ?? 0) > 0

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">

      {/* Saudação */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900">
          Olá, {profile.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          {now.toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Vendas no mês"
          value={formatCurrency(totalSalesMonth)}
          subtitle={`${countSalesMonth} pedidos`}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          title="Vendas semana"
          value={String(countSalesWeek)}
          subtitle="pedidos"
          icon={ShoppingCart}
          color="blue"
        />
        <MetricCard
          title="Fiado aberto"
          value={formatCurrency(totalCredit)}
          subtitle={`${countCredit} clientes`}
          icon={AlertTriangle}
          color="amber"
        />
        <MetricCard
          title="Clientes"
          value={String(totalCustomers ?? 0)}
          subtitle="cadastrados"
          icon={Users}
          color="blue"
        />
      </div>

      {/* Alertas */}
      {hasAlerts && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700">⚠ Alertas</h2>
          <div className="space-y-2">
            {lowStock?.slice(0, 3).map((p) => (
              <div key={p.id}
                className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-amber-500" />
                  <span className="text-sm text-amber-800 font-medium">{p.name}</span>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {p.stock_qty} restantes
                </span>
              </div>
            ))}
            {expiringProducts?.slice(0, 2).map((p) => (
              <div key={p.id}
                className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-sm text-red-800 font-medium">{p.name}</span>
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  Vence {new Date(p.expires_at!).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab switcher: Mais vendidos / Top vendedores / Movimentações */}
      <DashboardTabs
        topProducts={topProducts}
        topSellers={topSellers}
        recentSales={recentSales}
      />
    </div>
  )
}