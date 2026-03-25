// components/vendas/vendas-client.tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  ShoppingCart, Plus, Search, X, Loader2, ChevronRight,
  Minus, Trash2, CreditCard, Banknote, Smartphone, Clock,
  CheckCircle2, AlertCircle, PartyPopper,
} from 'lucide-react'
import {
  createSaleAction,
  registerCreditPaymentAction,
} from '@/app/(dashboard)/vendas/actions'
import { formatCurrency } from '@/lib/utils'
import { toast }          from '@/lib/hooks/use-toast'
import type { Sale, CartItem, PaymentMethod, NewSalePayload } from '@/lib/types/vendas'

// ── Tipos locais ──────────────────────────────────────────────────────────────
type Product  = { id: string; name: string; sale_price: number; cost_price: number; stock_qty: number; max_discount_pct: number }
type Customer = { id: string; name: string; phone: string | null }
type Props    = { sales: Sale[]; products: Product[]; customers: Customer[]; isAdmin: boolean; currentUserId: string }

// ── Constantes ────────────────────────────────────────────────────────────────
const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro', card: 'Cartão', pix: 'Pix', credit: 'Fiado',
}
const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash:   <Banknote   size={16} />,
  card:   <CreditCard size={16} />,
  pix:    <Smartphone size={16} />,
  credit: <Clock      size={16} />,
}

function formatDate(iso: string) {
  const d     = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return `Hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString()
}

// ── Tela de sucesso após venda ────────────────────────────────────────────────
function SaleSuccessScreen({
  total, method, onClose,
}: { total: number; method: PaymentMethod; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          {method === 'credit'
            ? <Clock size={36} className="text-amber-500" />
            : <PartyPopper size={36} className="text-emerald-600" />
          }
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">
          {method === 'credit' ? 'Fiado lançado!' : 'Venda realizada!'}
        </h2>
        <p className="text-3xl font-bold text-emerald-600 my-3">
          {formatCurrency(total)}
        </p>
        <p className="text-sm text-zinc-500 mb-6">
          {METHOD_LABELS[method]}
          {method === 'credit' && ' · aparece nos fiados em aberto'}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

// ── Modal: Nova Venda ─────────────────────────────────────────────────────────
function NovaVendaModal({ products, customers, onClose, onCreated }: {
  products:  Product[]
  customers: Customer[]
  onClose:   () => void
  onCreated: (sale: Sale, total: number, method: PaymentMethod) => void
}) {
  const [cart,       setCart]       = useState<CartItem[]>([])
  const [search,     setSearch]     = useState('')
  const [customerId, setCustomerId] = useState<string>('')
  const [method,     setMethod]     = useState<PaymentMethod>('cash')
  const [step,       setStep]       = useState<'cart' | 'payment'>('cart')
  const [error,      setError]      = useState<string | null>(null)
  const [pending,    start]         = useTransition()

  const filteredProducts = useMemo(() => {
    if (!search) return products.slice(0, 20)
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const total = useMemo(() =>
    cart.reduce((acc, i) => acc + i.unit_price * (1 - i.discount_pct / 100) * i.qty, 0),
    [cart]
  )

  function addToCart(p: Product) {
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === p.id)
      if (exists) return prev.map((i) =>
        i.product_id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock_qty) } : i
      )
      return [...prev, {
        product_id: p.id, product_name: p.name, qty: 1,
        unit_price: p.sale_price, unit_cost: p.cost_price, discount_pct: 0,
        sale_price: p.sale_price, max_discount_pct: p.max_discount_pct,
      }]
    })
    setSearch('')
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { removeItem(productId); return }
    const max = products.find((p) => p.id === productId)?.stock_qty ?? 999
    setCart((prev) => prev.map((i) =>
      i.product_id === productId ? { ...i, qty: Math.min(qty, max) } : i
    ))
  }

  function updateDiscount(productId: string, pct: number) {
    const max = cart.find((i) => i.product_id === productId)?.max_discount_pct ?? 0
    setCart((prev) => prev.map((i) =>
      i.product_id === productId
        ? { ...i, discount_pct: Math.min(Math.max(0, pct), max) }
        : i
    ))
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId))
  }

  async function submit() {
    if (cart.length === 0) { setError('Adicione pelo menos um produto.'); return }
    setError(null)
    start(async () => {
      const payload: NewSalePayload = {
        customer_id: customerId || null,
        payment_method: method,
        items: cart.map((i) => ({
          product_id: i.product_id, qty: i.qty,
          unit_price: i.unit_price, unit_cost: i.unit_cost, discount_pct: i.discount_pct,
        })),
      }
      const res = await createSaleAction(payload)
      if (res.error) { setError(res.error); return }

      const customer = customers.find((c) => c.id === customerId)
      const newSale: Sale = {
        id:             res.saleId!,
        org_id:         '',
        customer_id:    customerId || null,
        seller_id:      '',
        total,
        payment_method: method,
        status:         method === 'credit' ? 'pending' : 'paid',
        paid_at:        method === 'credit' ? null : new Date().toISOString(),
        created_at:     new Date().toISOString(),
        customer_name:  customer?.name ?? null,
        seller_name:    null,
      }
      onCreated(newSale, total, method)
    })
  }

  // ── Fechar com swipe ──────────────────────────────────────────────────────
  let touchStartY = 0
  function onTouchStart(e: React.TouchEvent) { touchStartY = e.touches[0].clientY }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientY - touchStartY > 80) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="md:hidden flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" />
            <h2 className="text-base font-semibold text-zinc-800">Nova venda</h2>
          </div>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <span className="text-sm font-bold text-emerald-600">{formatCurrency(total)}</span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex px-5 py-3 gap-2 flex-shrink-0">
          {(['cart', 'payment'] as const).map((s, i) => (
            <button key={s}
              onClick={() => s === 'payment' && cart.length > 0 && setStep(s)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                step === s ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-400'
              }`}>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                step === s ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-500'
              }`}>{i + 1}</span>
              {s === 'cart' ? 'Produtos' : 'Pagamento'}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {step === 'cart' && (
            <>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>

              {search && (
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-4">Nenhum produto encontrado</p>
                  ) : (
                    filteredProducts.slice(0, 6).map((p) => (
                      <button key={p.id} onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 border-b border-zinc-100 last:border-0 transition-colors text-left">
                        <div>
                          <p className="text-sm font-medium text-zinc-800">{p.name}</p>
                          <p className="text-xs text-zinc-400">{p.stock_qty} em estoque</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-zinc-900">{formatCurrency(p.sale_price)}</p>
                          <Plus size={14} className="text-emerald-600 ml-auto" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShoppingCart size={32} className="text-zinc-300 mb-2" />
                  <p className="text-sm text-zinc-400">Busque produtos para adicionar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Itens ({cart.length})</p>
                  {cart.map((item) => (
                    <div key={item.product_id} className="bg-zinc-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-800 flex-1">{item.product_name}</p>
                        <button onClick={() => removeItem(item.product_id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-zinc-200">
                          <button onClick={() => updateQty(item.product_id, item.qty - 1)}
                            className="p-1.5 hover:bg-zinc-100 rounded-l-lg transition-colors">
                            <Minus size={12} className="text-zinc-600" />
                          </button>
                          <span className="text-sm font-semibold text-zinc-800 px-2 min-w-[2rem] text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.product_id, item.qty + 1)}
                            className="p-1.5 hover:bg-zinc-100 rounded-r-lg transition-colors">
                            <Plus size={12} className="text-zinc-600" />
                          </button>
                        </div>
                        {item.max_discount_pct > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-zinc-400">Desc.</span>
                            <input type="number" min="0" max={item.max_discount_pct}
                              value={item.discount_pct || ''}
                              onChange={(e) => updateDiscount(item.product_id, Number(e.target.value))}
                              className="w-12 text-center text-xs border border-zinc-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                            <span className="text-xs text-zinc-400">%</span>
                          </div>
                        )}
                        <p className="text-sm font-bold text-zinc-900 ml-auto">
                          {formatCurrency(item.unit_price * (1 - item.discount_pct / 100) * item.qty)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 px-1">
                    <span className="text-sm font-semibold text-zinc-600">Total</span>
                    <span className="text-lg font-bold text-zinc-900">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-2">Cliente (opcional)</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">Sem cliente</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-2">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cash', 'card', 'pix', 'credit'] as PaymentMethod[]).map((m) => (
                    <button key={m} onClick={() => setMethod(m)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        method === m
                          ? m === 'credit'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}>
                      {METHOD_ICONS[m]}{METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
                {method === 'credit' && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                    ⚠ A venda ficará como fiado nos pendentes.
                  </p>
                )}
              </div>

              <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Resumo</p>
                {cart.map((i) => (
                  <div key={i.product_id} className="flex justify-between text-sm">
                    <span className="text-zinc-600">{i.qty}× {i.product_name}</span>
                    <span className="text-zinc-800 font-medium">
                      {formatCurrency(i.unit_price * (1 - i.discount_pct / 100) * i.qty)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-zinc-200 pt-2 flex justify-between">
                  <span className="font-semibold text-zinc-700">Total</span>
                  <span className="font-bold text-zinc-900 text-base">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex-shrink-0 space-y-2">
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {step === 'cart' ? (
            <button onClick={() => cart.length > 0 && setStep('payment')}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center gap-2">
              Continuar <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setStep('cart')}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
                Voltar
              </button>
              <button onClick={submit} disabled={pending}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
                {pending && <Loader2 size={14} className="animate-spin" />}
                {method === 'credit' ? 'Lançar fiado' : 'Finalizar venda'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal: Detalhe / Pagamento de Fiado ───────────────────────────────────────
function SaleDetailModal({ sale, onClose, onUpdated }: {
  sale: Sale; onClose: () => void; onUpdated: (id: string, status: 'paid') => void
}) {
  const [amount,  setAmount]  = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [pending, start]      = useTransition()
  const isPending = sale.status === 'pending'

  async function payCredit() {
    const val = parseFloat(amount)
    if (!val || val <= 0) { setError('Informe um valor válido.'); return }
    setError(null)
    start(async () => {
      const res = await registerCreditPaymentAction(sale.id, val)
      if (res.error) { setError(res.error); return }
      toast('Pagamento registrado!', 'success')
      onUpdated(sale.id, 'paid')
      onClose()
    })
  }

  let touchStartY = 0
  function onTouchStart(e: React.TouchEvent) { touchStartY = e.touches[0].clientY }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientY - touchStartY > 80) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[80dvh] overflow-y-auto"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>
        <div className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-800">Detalhe da venda</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
              <X size={18} />
            </button>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
            isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isPending ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {isPending ? 'Fiado em aberto' : 'Pago'}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Data</span>
              <span className="text-zinc-800 font-medium">{formatDate(sale.created_at)}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente</span>
                <span className="text-zinc-800 font-medium">{sale.customer_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Pagamento</span>
              <span className="text-zinc-800 font-medium">{METHOD_LABELS[sale.payment_method]}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-2">
              <span className="font-semibold text-zinc-700">Total</span>
              <span className="font-bold text-zinc-900 text-base">{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {isPending && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Registrar pagamento</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
                  <input type="number" min="0.01" step="0.01"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder={sale.total.toFixed(2)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                </div>
                <button onClick={payCredit} disabled={pending}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-2">
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Pagar
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function VendasClient({ sales: initial, products, customers }: Props) {
  const [sales,    setSales]    = useState<Sale[]>(initial)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<'todos' | 'hoje' | 'pendentes'>('todos')
  const [modal,    setModal]    = useState<'nova' | 'detalhe' | null>(null)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [success,  setSuccess]  = useState<{ total: number; method: PaymentMethod } | null>(null)

  const filtered = useMemo(() => {
    let list = sales
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((s) =>
        s.customer_name?.toLowerCase().includes(q) ||
        formatCurrency(s.total).includes(q)
      )
    }
    if (filter === 'hoje')      list = list.filter((s) => isToday(s.created_at))
    if (filter === 'pendentes') list = list.filter((s) => s.status === 'pending')
    return list
  }, [sales, search, filter])

  const counts = useMemo(() => ({
    hoje:      sales.filter((s) => isToday(s.created_at)).length,
    pendentes: sales.filter((s) => s.status === 'pending').length,
    totalMes:  sales.reduce((acc, s) => acc + Number(s.total), 0),
    totalHoje: sales.filter((s) => isToday(s.created_at)).reduce((acc, s) => acc + Number(s.total), 0),
  }), [sales])

  function handleCreated(sale: Sale, total: number, method: PaymentMethod) {
    setSales((prev) => [sale, ...prev])
    setModal(null)
    setSuccess({ total, method })
  }

  function handleUpdated(id: string, status: 'paid') {
    setSales((prev) => prev.map((s) =>
      s.id === id ? { ...s, status, paid_at: new Date().toISOString() } : s
    ))
  }

  function openDetail(s: Sale) { setSelected(s); setModal('detalhe') }
  function closeModal()        { setModal(null); setSelected(null) }

  const FILTERS = [
    { key: 'todos',     label: 'Este mês', count: sales.length     },
    { key: 'hoje',      label: 'Hoje',     count: counts.hoje      },
    { key: 'pendentes', label: 'Fiado',    count: counts.pendentes },
  ] as const

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Vendas</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Hoje: {formatCurrency(counts.totalHoje)} · Mês: {formatCurrency(counts.totalMes)}
            </p>
          </div>
          <button onClick={() => setModal('nova')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Nova venda</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou valor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                filter === key
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}>
              {label}
              <span className={`inline-flex items-center justify-center px-1.5 h-4 rounded-full text-[10px] font-bold ${
                filter === key ? 'bg-white text-zinc-900' : 'bg-zinc-100 text-zinc-600'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
              <ShoppingCart size={24} className="text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Nenhuma venda encontrada</p>
            <p className="text-xs text-zinc-400 mt-1">
              {search ? 'Tente outro termo' : 'Registre sua primeira venda'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <button key={s.id} onClick={() => openDetail(s)}
                className="w-full bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 hover:border-zinc-200 transition-colors text-left">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  s.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {METHOD_ICONS[s.payment_method]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">
                        {s.customer_name ?? 'Venda avulsa'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {METHOD_LABELS[s.payment_method]} · {formatDate(s.created_at)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-zinc-900">{formatCurrency(s.total)}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.status === 'pending' ? 'Fiado' : 'Pago'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {modal === 'nova' && (
        <NovaVendaModal
          products={products}
          customers={customers}
          onClose={closeModal}
          onCreated={handleCreated}
        />
      )}
      {modal === 'detalhe' && selected && (
        <SaleDetailModal
          sale={selected}
          onClose={closeModal}
          onUpdated={handleUpdated}
        />
      )}

      {/* Tela de sucesso */}
      {success && (
        <SaleSuccessScreen
          total={success.total}
          method={success.method}
          onClose={() => setSuccess(null)}
        />
      )}
    </>
  )
}