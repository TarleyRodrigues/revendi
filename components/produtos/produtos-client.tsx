// components/produtos/produtos-client.tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import { Package, Plus, Search, Pencil, Trash2, AlertTriangle, X, Loader2, ChevronDown } from 'lucide-react'
import { createProductAction, updateProductAction, deleteProductAction, type ProductPayload } from '@/app/(dashboard)/produtos/actions'
import { formatCurrency } from '@/lib/utils'

type Product = {
  id:          string
  name:        string
  description: string
  price:       number
  cost_price:  number
  stock_qty:   number
  expires_at:  string | null
  created_at:  string
}

type Props = {
  products: Product[]
  isAdmin:  boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntilExpiry(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function expiryBadge(expires_at: string | null) {
  if (!expires_at) return null
  const days = daysUntilExpiry(expires_at)
  if (days < 0)  return { label: 'Vencido',              cls: 'bg-red-100 text-red-700 border-red-200' }
  if (days <= 7)  return { label: `Vence em ${days}d`,    cls: 'bg-red-100 text-red-700 border-red-200' }
  if (days <= 30) return { label: `Vence em ${days}d`,    cls: 'bg-amber-100 text-amber-700 border-amber-200' }
  return { label: new Date(expires_at).toLocaleDateString('pt-BR'), cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
}

function stockBadge(qty: number) {
  if (qty === 0)  return { cls: 'bg-red-100 text-red-700' }
  if (qty < 5)    return { cls: 'bg-amber-100 text-amber-700' }
  return { cls: 'bg-emerald-100 text-emerald-700' }
}

// ── Formulário ────────────────────────────────────────────────────────────────
const EMPTY: ProductPayload = {
  name: '', description: '', price: 0, cost_price: 0, stock_qty: 0, expires_at: null,
}

function ProdutoModal({
  product,
  onClose,
  onSaved,
}: {
  product:  Product | null  // null = novo
  onClose:  () => void
  onSaved:  (p: Product) => void
}) {
  const isEdit = !!product
  const [form, setForm] = useState<ProductPayload>(
    product
      ? {
          name:        product.name,
          description: product.description ?? '',
          price:       product.price,
          cost_price:  product.cost_price,
          stock_qty:   product.stock_qty,
          expires_at:  product.expires_at
            ? product.expires_at.split('T')[0]
            : null,
        }
      : EMPTY
  )
  const [error, setError]   = useState<string | null>(null)
  const [pending, start]    = useTransition()

  function set(k: keyof ProductPayload, v: string | number | null) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    start(async () => {
      const payload: ProductPayload = {
        ...form,
        price:      Number(form.price),
        cost_price: Number(form.cost_price),
        stock_qty:  Number(form.stock_qty),
        expires_at: form.expires_at || null,
      }

      const result = isEdit
        ? await updateProductAction(product!.id, payload)
        : await createProductAction(payload)

      if (result.error) {
        setError(result.error)
        return
      }

      // Optimistic: monta objeto local para atualizar lista sem reload
      onSaved({
        id:         product?.id ?? crypto.randomUUID(),
        created_at: product?.created_at ?? new Date().toISOString(),
        ...payload,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet / Modal */}
      <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">
        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>

        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-zinc-800">
              {isEdit ? 'Editar produto' : 'Novo produto'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Nome do produto *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Detergente 500ml"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Descrição
              </label>
              <input
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Preços */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Preço de venda *
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price || ''}
                    onChange={(e) => set('price', e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Custo
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price || ''}
                    onChange={(e) => set('cost_price', e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Estoque e validade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Estoque *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock_qty || ''}
                  onChange={(e) => set('stock_qty', e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Validade
                </label>
                <input
                  type="date"
                  value={form.expires_at ?? ''}
                  onChange={(e) => set('expires_at', e.target.value || null)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Confirmação de exclusão ───────────────────────────────────────────────────
function ConfirmDelete({
  product,
  onClose,
  onDeleted,
}: {
  product:   Product
  onClose:   () => void
  onDeleted: (id: string) => void
}) {
  const [error, setError]  = useState<string | null>(null)
  const [pending, start]   = useTransition()

  function confirm() {
    start(async () => {
      const result = await deleteProductAction(product.id)
      if (result.error) { setError(result.error); return }
      onDeleted(product.id)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-800">Excluir produto?</h3>
            <p className="text-sm text-zinc-500 mt-1">
              "<span className="font-medium text-zinc-700">{product.name}</span>" será removido permanentemente.
            </p>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            Cancelar
          </button>
          <button onClick={confirm} disabled={pending} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={14} className="animate-spin" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ProdutosClient({ products: initial, isAdmin }: Props) {
  const [products, setProducts] = useState<Product[]>(initial)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<'todos' | 'baixo' | 'vencendo' | 'vencidos'>('todos')
  const [modal,    setModal]    = useState<'new' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)

  // Filtragem
  const filtered = useMemo(() => {
    let list = products
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (filter === 'baixo')    list = list.filter((p) => p.stock_qty < 5)
    if (filter === 'vencendo') list = list.filter((p) => p.expires_at && daysUntilExpiry(p.expires_at) <= 30 && daysUntilExpiry(p.expires_at) >= 0)
    if (filter === 'vencidos') list = list.filter((p) => p.expires_at && daysUntilExpiry(p.expires_at) < 0)
    return list
  }, [products, search, filter])

  // Contadores para badges dos filtros
  const counts = useMemo(() => ({
    baixo:    products.filter((p) => p.stock_qty < 5).length,
    vencendo: products.filter((p) => p.expires_at && daysUntilExpiry(p.expires_at) <= 30 && daysUntilExpiry(p.expires_at) >= 0).length,
    vencidos: products.filter((p) => p.expires_at && daysUntilExpiry(p.expires_at) < 0).length,
  }), [products])

  function handleSaved(p: Product) {
    setProducts((prev) => {
      const exists = prev.find((x) => x.id === p.id)
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    })
  }

  function handleDeleted(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  function openEdit(p: Product) {
    setSelected(p)
    setModal('edit')
  }

  function openDelete(p: Product) {
    setSelected(p)
    setModal('delete')
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
  }

  const FILTERS = [
    { key: 'todos',    label: 'Todos',        count: null },
    { key: 'baixo',    label: 'Estoque baixo', count: counts.baixo },
    { key: 'vencendo', label: 'Vencendo',      count: counts.vencendo },
    { key: 'vencidos', label: 'Vencidos',      count: counts.vencidos },
  ] as const

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Produtos</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{products.length} cadastrados</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo produto</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                filter === key
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {label}
              {count !== null && count > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                  filter === key ? 'bg-white text-zinc-900' : 'bg-red-100 text-red-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
              <Package size={24} className="text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Nenhum produto encontrado</p>
            <p className="text-xs text-zinc-400 mt-1">
              {search ? 'Tente outro termo de busca' : 'Adicione seu primeiro produto'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => {
              const stock  = stockBadge(p.stock_qty)
              const expiry = expiryBadge(p.expires_at)
              const margin = p.cost_price > 0
                ? Math.round(((p.price - p.cost_price) / p.price) * 100)
                : null

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-4 hover:border-zinc-200 transition-colors"
                >
                  {/* Ícone */}
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-zinc-400" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 truncate">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{p.description}</p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-zinc-900 flex-shrink-0">
                        {formatCurrency(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Estoque */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stock.cls}`}>
                        {p.stock_qty} un.
                      </span>

                      {/* Margem */}
                      {margin !== null && (
                        <span className="text-xs text-zinc-400">
                          Margem {margin}%
                        </span>
                      )}

                      {/* Validade */}
                      {expiry && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${expiry.cls}`}>
                          {expiry.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => openDelete(p)}
                        className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {(modal === 'new' || modal === 'edit') && (
        <ProdutoModal
          product={modal === 'edit' ? selected : null}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {modal === 'delete' && selected && (
        <ConfirmDelete
          product={selected}
          onClose={closeModal}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}