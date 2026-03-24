// components/clientes/clientes-client.tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  Users, Plus, Search, Pencil, Trash2, X,
  Loader2, ChevronRight, Phone, Mail, ShoppingBag,
  AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
  type CustomerPayload,
} from '@/app/(dashboard)/clientes/actions'
import { formatCurrency } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Sale = {
  id: string; total: number; status: string;
  payment_method: string; created_at: string
}

type Customer = {
  id:           string
  name:         string
  email:        string | null
  phone:        string | null
  notes:        string | null
  created_at:   string
  totalCompras: number
  totalFiado:   number
  qtdCompras:   number
  ultimaCompra: string | null
  sales:        Sale[]
}

type Props = {
  customers: Customer[]
  isAdmin:   boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro', card: 'Cartão', pix: 'Pix', credit: 'Fiado',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return phone
}

// ── Modal: Formulário ─────────────────────────────────────────────────────────
const EMPTY: CustomerPayload = { name: '', phone: null, email: null, notes: null }

function ClienteModal({ customer, onClose, onSaved }: {
  customer: Customer | null
  onClose:  () => void
  onSaved:  (c: Customer) => void
}) {
  const isEdit = !!customer
  const [form, setForm] = useState<CustomerPayload>(
    customer ? {
      name:  customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    } : EMPTY
  )
  const [error,   setError]  = useState<string | null>(null)
  const [pending, start]     = useTransition()

  function f<K extends keyof CustomerPayload>(k: K, v: CustomerPayload[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const payload: CustomerPayload = {
        name:  form.name,
        phone: form.phone  || null,
        email: form.email  || null,
        notes: form.notes  || null,
      }
      const res = isEdit
        ? await updateCustomerAction(customer!.id, payload)
        : await createCustomerAction(payload)

      if (res.error) { setError(res.error); return }

      onSaved({
        id:           customer?.id           ?? crypto.randomUUID(),
        created_at:   customer?.created_at   ?? new Date().toISOString(),
        totalCompras: customer?.totalCompras ?? 0,
        totalFiado:   customer?.totalFiado   ?? 0,
        qtdCompras:   customer?.qtdCompras   ?? 0,
        ultimaCompra: customer?.ultimaCompra ?? null,
        sales:        customer?.sales        ?? [],
        ...payload,
      })
      onClose()
    })
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
  const lbl = "block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-zinc-800">
              {isEdit ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={lbl}>Nome *</label>
              <input required value={form.name}
                onChange={(e) => f('name', e.target.value)}
                placeholder="Ex: João Silva"
                className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Telefone</label>
                <input value={form.phone ?? ''}
                  onChange={(e) => f('phone', e.target.value || null)}
                  placeholder="(99) 99999-9999"
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>E-mail</label>
                <input type="email" value={form.email ?? ''}
                  onChange={(e) => f('email', e.target.value || null)}
                  placeholder="email@exemplo.com"
                  className={inp} />
              </div>
            </div>

            <div>
              <label className={lbl}>Observações</label>
              <textarea rows={2} value={form.notes ?? ''}
                onChange={(e) => f('notes', e.target.value || null)}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
                {pending && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Perfil do cliente ──────────────────────────────────────────────────
function ClientePerfilModal({ customer, onClose, onEdit }: {
  customer: Customer
  onClose:  () => void
  onEdit:   () => void
}) {
  const pendentes = customer.sales.filter((s) => s.status === 'pending')
  const pagas     = customer.sales.filter((s) => s.status === 'paid')
  const historico = [...customer.sales].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>
        <div className="p-5 md:p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-emerald-700">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-800">{customer.name}</h2>
                {customer.phone && (
                  <p className="text-xs text-zinc-400 mt-0.5">{formatPhone(customer.phone)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onEdit}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                <Pencil size={16} />
              </button>
              <button onClick={onClose}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Contato */}
          {(customer.phone || customer.email) && (
            <div className="flex gap-2 flex-wrap">
              {customer.phone && (
                <a href={`tel:${customer.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-medium hover:bg-zinc-200 transition-colors">
                  <Phone size={12} />
                  {formatPhone(customer.phone)}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-medium hover:bg-zinc-200 transition-colors">
                  <Mail size={12} />
                  {customer.email}
                </a>
              )}
            </div>
          )}

          {/* Resumo financeiro */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-zinc-900">{customer.qtdCompras}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Compras</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-emerald-700 truncate">
                {formatCurrency(customer.totalCompras)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Total gasto</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${customer.totalFiado > 0 ? 'bg-amber-50' : 'bg-zinc-50'}`}>
              <p className={`text-sm font-bold truncate ${customer.totalFiado > 0 ? 'text-amber-700' : 'text-zinc-400'}`}>
                {formatCurrency(customer.totalFiado)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Fiado</p>
            </div>
          </div>

          {/* Fiado em aberto */}
          {pendentes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500" />
                Fiado em aberto ({pendentes.length})
              </p>
              {pendentes.map((s) => (
                <div key={s.id}
                  className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span className="text-sm text-amber-800">{formatDate(s.created_at)}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-700">{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Histórico de compras */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
              <ShoppingBag size={12} />
              Histórico ({customer.qtdCompras})
            </p>
            {historico.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">Nenhuma compra ainda</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {historico.map((s) => (
                  <div key={s.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-2">
                      {s.status === 'paid'
                        ? <CheckCircle2 size={14} className="text-emerald-500" />
                        : <Clock       size={14} className="text-amber-500" />
                      }
                      <div>
                        <p className="text-xs font-medium text-zinc-700">
                          {METHOD_LABELS[s.payment_method] ?? s.payment_method}
                        </p>
                        <p className="text-[10px] text-zinc-400">{formatDate(s.created_at)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${s.status === 'pending' ? 'text-amber-700' : 'text-zinc-800'}`}>
                      {formatCurrency(s.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {customer.notes && (
            <div className="bg-zinc-50 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500 font-medium mb-1">Observações</p>
              <p className="text-sm text-zinc-700">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal: Confirmar exclusão ─────────────────────────────────────────────────
function ConfirmDelete({ customer, onClose, onDeleted }: {
  customer:  Customer
  onClose:   () => void
  onDeleted: (id: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start]  = useTransition()

  function confirm() {
    start(async () => {
      const res = await deleteCustomerAction(customer.id)
      if (res.error) { setError(res.error); return }
      onDeleted(customer.id)
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
            <h3 className="font-semibold text-zinc-800">Excluir cliente?</h3>
            <p className="text-sm text-zinc-500 mt-1">
              "<span className="font-medium text-zinc-700">{customer.name}</span>" será removido.
              {customer.qtdCompras > 0 && (
                <span className="block text-xs text-amber-600 mt-1">
                  ⚠ Este cliente possui {customer.qtdCompras} venda(s) registrada(s).
                </span>
              )}
            </p>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            Cancelar
          </button>
          <button onClick={confirm} disabled={pending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={14} className="animate-spin" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ClientesClient({ customers: initial, isAdmin }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initial)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<'todos' | 'fiado' | 'sem_compras'>('todos')
  const [modal,     setModal]     = useState<'new' | 'edit' | 'delete' | 'perfil' | null>(null)
  const [selected,  setSelected]  = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    let list = customers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      )
    }
    if (filter === 'fiado')       list = list.filter((c) => c.totalFiado > 0)
    if (filter === 'sem_compras') list = list.filter((c) => c.qtdCompras === 0)
    return list
  }, [customers, search, filter])

  const counts = useMemo(() => ({
    fiado:      customers.filter((c) => c.totalFiado > 0).length,
    semCompras: customers.filter((c) => c.qtdCompras === 0).length,
    totalFiado: customers.reduce((acc, c) => acc + c.totalFiado, 0),
  }), [customers])

  function handleSaved(c: Customer) {
    setCustomers((prev) => {
      const exists = prev.find((x) => x.id === c.id)
      return exists ? prev.map((x) => x.id === c.id ? c : x) : [c, ...prev]
    })
  }

  function openPerfil(c: Customer) { setSelected(c); setModal('perfil') }
  function openEdit(c: Customer)   { setSelected(c); setModal('edit')   }
  function openDelete(c: Customer) { setSelected(c); setModal('delete') }
  function closeModal()            { setModal(null); setSelected(null)  }

  const FILTERS = [
    { key: 'todos',      label: 'Todos',       count: customers.length },
    { key: 'fiado',      label: 'Com fiado',   count: counts.fiado     },
    { key: 'sem_compras', label: 'Sem compras', count: counts.semCompras },
  ] as const

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Clientes</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {customers.length} cadastrados
              {counts.totalFiado > 0 && (
                <span className="text-amber-600 font-medium">
                  {' '}· {formatCurrency(counts.totalFiado)} em fiado
                </span>
              )}
            </p>
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Novo cliente</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
        </div>

        {/* Filtros */}
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

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
              <Users size={24} className="text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Nenhum cliente encontrado</p>
            <p className="text-xs text-zinc-400 mt-1">
              {search ? 'Tente outro termo de busca' : 'Cadastre seu primeiro cliente'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id}
                className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 hover:border-zinc-200 transition-colors">

                {/* Avatar */}
                <button onClick={() => openPerfil(c)}
                  className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 hover:bg-emerald-200 transition-colors">
                  <span className="text-sm font-bold text-emerald-700">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </button>

                {/* Info */}
                <button onClick={() => openPerfil(c)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{c.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {c.phone ? formatPhone(c.phone) : c.email ?? 'Sem contato'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {c.totalFiado > 0 ? (
                        <p className="text-xs font-bold text-amber-600">
                          {formatCurrency(c.totalFiado)} fiado
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400">
                          {c.qtdCompras > 0 ? `${c.qtdCompras} compra(s)` : 'Sem compras'}
                        </p>
                      )}
                      {c.ultimaCompra && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Últ. {formatDate(c.ultimaCompra)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(c)}
                    className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => openDelete(c)}
                    className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {(modal === 'new' || modal === 'edit') && (
        <ClienteModal
          customer={modal === 'edit' ? selected : null}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
      {modal === 'perfil' && selected && (
        <ClientePerfilModal
          customer={selected}
          onClose={closeModal}
          onEdit={() => { setModal('edit') }}
        />
      )}
      {modal === 'delete' && selected && (
        <ConfirmDelete
          customer={selected}
          onClose={closeModal}
          onDeleted={(id) => {
            setCustomers((prev) => prev.filter((c) => c.id !== id))
            closeModal()
          }}
        />
      )}
    </>
  )
}