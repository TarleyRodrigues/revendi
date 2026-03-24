// app/(dashboard)/produtos/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { ProdutosClient } from '@/components/produtos/produtos-client'

export default async function ProdutosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, price, cost_price, stock_qty, expires_at, created_at')
    .eq('org_id', profile.org_id)
    .order('name', { ascending: true })

  return (
    <ProdutosClient
      products={products ?? []}
      isAdmin={profile.role === 'admin'}
    />
  )
}