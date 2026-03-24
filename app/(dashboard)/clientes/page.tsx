// app/(dashboard)/clientes/page.tsx
import { createClient }    from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { ClientesClient }  from '@/components/clientes/clientes-client'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id

  // Clientes com totais calculados via join
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, name, email, phone, notes, created_at,
      sales(id, total, status, payment_method, created_at)
    `)
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  // Normaliza dados e calcula totais por cliente
  const normalized = (customers ?? []).map((c) => {
    const sales = (c.sales as {
      id: string; total: number; status: string;
      payment_method: string; created_at: string
    }[] | null) ?? []

    const totalCompras   = sales.reduce((acc, s) => acc + Number(s.total), 0)
    const totalFiado     = sales
      .filter((s) => s.status === 'pending')
      .reduce((acc, s) => acc + Number(s.total), 0)
    const qtdCompras     = sales.length
    const ultimaCompra   = sales.length > 0
      ? sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : null

    return {
      id:           c.id,
      name:         c.name,
      email:        c.email,
      phone:        c.phone,
      notes:        c.notes,
      created_at:   c.created_at,
      totalCompras,
      totalFiado,
      qtdCompras,
      ultimaCompra,
      sales,
    }
  })

  return (
    <ClientesClient
      customers={normalized}
      isAdmin={profile.role === 'admin'}
    />
  )
}