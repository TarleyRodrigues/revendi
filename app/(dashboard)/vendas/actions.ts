// app/(dashboard)/vendas/actions.ts
'use server'

import { createClient }   from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { NewSalePayload } from '@/lib/types/vendas'

// ── CRIAR VENDA ───────────────────────────────────────────────────────────────
export async function createSaleAction(payload: NewSalePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return { error: 'Perfil não encontrado.' }

  if (payload.items.length === 0) return { error: 'Adicione pelo menos um produto.' }

  // Calcula total considerando descontos
  const total = payload.items.reduce((acc, item) => {
    const discounted = item.unit_price * (1 - item.discount_pct / 100)
    return acc + discounted * item.qty
  }, 0)

  const isCredit = payload.payment_method === 'credit'

  // 1. Inserir venda
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      org_id:         profile.org_id,
      seller_id:      user.id,
      customer_id:    payload.customer_id || null,
      total:          Math.round(total * 100) / 100,
      payment_method: payload.payment_method,
      status:         isCredit ? 'pending' : 'paid',
      paid_at:        isCredit ? null : new Date().toISOString(),
    })
    .select('id')
    .single()

  if (saleError || !sale) {
    console.error('[createSale] saleError:', saleError?.code, saleError?.message)
    return { error: `Erro ao registrar venda (${saleError?.code}).` }
  }

  // 2. Inserir itens
  const { error: itemsError } = await supabase.from('sale_items').insert(
    payload.items.map((item) => ({
      sale_id:      sale.id,
      product_id:   item.product_id,
      qty:          item.qty,
      unit_price:   item.unit_price,
      unit_cost:    item.unit_cost,
      discount_pct: item.discount_pct,
    }))
  )

  if (itemsError) {
    console.error('[createSale] itemsError:', itemsError.code, itemsError.message)
    await supabase.from('sales').delete().eq('id', sale.id)
    return { error: `Erro ao salvar itens (${itemsError.code}).` }
  }

  // 3. Decrementar estoque de cada produto
  for (const item of payload.items) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('id', item.product_id)
      .single()

    if (product) {
      const novoEstoque = Math.max(0, product.stock_qty - item.qty)
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_qty: novoEstoque })
        .eq('id', item.product_id)

      if (stockError) {
        console.warn('[createSale] Falha ao atualizar estoque:', item.product_id, stockError.message)
        // Não cancela a venda por falha de estoque — apenas loga
      }
    }
  }

  revalidatePath('/vendas')
  revalidatePath('/produtos')
  revalidatePath('/')
  return { success: true, saleId: sale.id }
}

// ── REGISTRAR PAGAMENTO DE FIADO ──────────────────────────────────────────────
export async function registerCreditPaymentAction(saleId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (amount <= 0) return { error: 'Valor inválido.' }

  const { data: sale } = await supabase
    .from('sales').select('total, status').eq('id', saleId).single()
  if (!sale)                  return { error: 'Venda não encontrada.' }
  if (sale.status === 'paid') return { error: 'Esta venda já está quitada.' }

  const { data: payments } = await supabase
    .from('credit_payments').select('amount').eq('sale_id', saleId)
  const totalPaid = payments?.reduce((acc, p) => acc + Number(p.amount), 0) ?? 0
  const remaining = Number(sale.total) - totalPaid

  if (amount > remaining + 0.01) {
    return { error: `Valor maior que o saldo devedor (${formatBRL(remaining)}).` }
  }

  const { error: payError } = await supabase.from('credit_payments').insert({
    sale_id: saleId,
    amount,
    user_id: user.id,
  })

  if (payError) {
    console.error('[creditPayment]', payError.code, payError.message)
    return { error: `Erro ao registrar pagamento (${payError.code}).` }
  }

  // Se quitou tudo, marca como pago
  if (amount >= remaining - 0.01) {
    await supabase.from('sales')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', saleId)
  }

  revalidatePath('/vendas')
  revalidatePath('/')
  return { success: true }
}

// ── CANCELAR VENDA ────────────────────────────────────────────────────────────
export async function cancelSaleAction(saleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('sales').delete().eq('id', saleId)

  if (error) {
    console.error('[cancelSale]', error.code, error.message)
    return { error: `Erro ao cancelar venda (${error.code}).` }
  }

  revalidatePath('/vendas')
  revalidatePath('/')
  return { success: true }
}

// ── Helper interno ────────────────────────────────────────────────────────────
function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}