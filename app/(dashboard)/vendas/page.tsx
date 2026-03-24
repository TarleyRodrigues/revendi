// app/(dashboard)/vendas/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { VendasClient } from '@/components/vendas/vendas-client'

export default async function VendasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role, name').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id

  // Início do mês atual
  const now           = new Date()
  const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Vendas do mês com nome do cliente e vendedor
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id, org_id, customer_id, seller_id,
      total, payment_method, status, paid_at, created_at,
      customers(name),
      profiles(name)
    `)
    .eq('org_id', orgId)
    .gte('created_at', startOfMonth)
    .order('created_at', { ascending: false })

  // Produtos disponíveis para montar carrinho
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sale_price, cost_price, stock_qty, max_discount_pct')
    .eq('org_id', orgId)
    .gt('stock_qty', 0)
    .order('name')

  // Clientes para seleção
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('org_id', orgId)
    .order('name')

  // Normaliza os dados vindos do Supabase (joins retornam objeto ou null)
  const normalizedSales = (sales ?? []).map((s) => ({
    ...s,
    customer_name: (s.customers as { name: string } | null)?.name ?? null,
    seller_name:   (s.profiles  as { name: string } | null)?.name ?? null,
  }))

  return (
    <VendasClient
      sales={normalizedSales}
      products={products ?? []}
      customers={customers ?? []}
      isAdmin={profile.role === 'admin'}
      currentUserId={user.id}
    />
  )
}