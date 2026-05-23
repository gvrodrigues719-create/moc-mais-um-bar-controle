'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, X, AlertCircle, Loader2, Check, Package, ChevronRight,
} from 'lucide-react'
import { ITEM_TYPE_CONFIG, type ItemType } from '@/lib/types'
import {
  getItemsAction,
  getAreasForAdminAction,
  updateItemAction,
  checkActiveSessionAction,
  type AdminItem,
  type AdminArea,
  type UpdateItemData,
} from '@/app/actions/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface EditForm {
  name: string
  unit: string
  item_type: ItemType
  area_id: string
  sort_order: string
  active: boolean
  unit_observation: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = Object.entries(ITEM_TYPE_CONFIG).map(([key, cfg]) => ({
  value: key as ItemType,
  label: cfg.label,
  color: cfg.color,
}))

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminItemsPage() {
  const router = useRouter()

  // Data state
  const [items, setItems] = useState<AdminItem[]>([])
  const [areas, setAreas] = useState<AdminArea[]>([])
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Filter state
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')

  // Edit modal state
  const [editingItem, setEditingItem] = useState<AdminItem | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')

  // ─── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setLoadError('')
    try {
      const [itemsRes, areasRes, sessionRes] = await Promise.all([
        getItemsAction(),
        getAreasForAdminAction(),
        checkActiveSessionAction(),
      ])
      if (itemsRes.success) {
        setItems(itemsRes.items)
      } else {
        setLoadError(itemsRes.error || 'Erro ao carregar itens.')
      }
      if (areasRes.success) setAreas(areasRes.areas)
      setHasActiveSession(sessionRes.hasActive)
    } catch {
      setLoadError('Erro inesperado ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter(item => {
      const matchSearch = !q || item.name.toLowerCase().includes(q)
      const matchArea = !filterArea || item.area_id === filterArea
      const matchType = !filterType || item.item_type === filterType
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? item.active : !item.active)
      return matchSearch && matchArea && matchType && matchStatus
    })
  }, [items, search, filterArea, filterType, filterStatus])

  // ─── Edit modal ───────────────────────────────────────────────────────────

  function openEdit(item: AdminItem) {
    setEditingItem(item)
    setEditForm({
      name: item.name,
      unit: item.unit,
      item_type: item.item_type,
      area_id: item.area_id || '',
      sort_order: String(item.sort_order),
      active: item.active,
      unit_observation: item.unit_observation || '',
    })
    setSaveState('idle')
    setSaveError('')
  }

  function closeEdit() {
    setEditingItem(null)
    setEditForm(null)
    setSaveState('idle')
    setSaveError('')
  }

  function patchForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleSave() {
    if (!editingItem || !editForm) return

    const nameTrimmed = editForm.name.trim()
    const unitTrimmed = editForm.unit.trim()
    if (!nameTrimmed || !unitTrimmed) {
      setSaveState('error')
      setSaveError('Nome e unidade são obrigatórios.')
      return
    }

    setSaveState('saving')
    setSaveError('')

    const data: UpdateItemData = {
      name: nameTrimmed,
      unit: unitTrimmed,
      item_type: editForm.item_type,
      area_id: editForm.area_id || null,
      sort_order: parseInt(editForm.sort_order, 10) || 0,
      active: editForm.active,
      unit_observation: editForm.unit_observation.trim() || null,
    }

    try {
      const res = await updateItemAction(editingItem.id, data)
      if (res.success) {
        setSaveState('saved')
        // Optimistic update in local list
        const updatedArea = areas.find(a => a.id === data.area_id) ?? null
        setItems(prev =>
          prev.map(item =>
            item.id === editingItem.id
              ? {
                  ...item,
                  ...data,
                  count_areas: updatedArea
                    ? { id: updatedArea.id, name: updatedArea.name, slug: updatedArea.slug }
                    : null,
                }
              : item
          )
        )
        setTimeout(closeEdit, 1200)
      } else {
        setSaveState('error')
        setSaveError(res.error || 'Erro ao salvar.')
      }
    } catch {
      setSaveState('error')
      setSaveError('Erro de conexão. Tente novamente.')
    }
  }

  // ─── Render: Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-xs font-semibold text-gray-500">Carregando itens...</p>
      </div>
    )
  }

  // ─── Render: Main ────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-4 py-5 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition"
            style={{ borderColor: 'var(--border)' }}
            aria-label="Voltar ao admin"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Admin / Itens
            </p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Itens da Contagem
            </h1>
          </div>
        </div>

        {/* Active session warning */}
        {hasActiveSession && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 border border-amber-200 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-800 leading-relaxed">
              <span className="font-black">Contagem em andamento!</span>{' '}
              Edições aqui impactam somente as próximas sessões. A edição será bloqueada se tentar salvar.
            </p>
          </div>
        )}

        {/* Load error */}
        {loadError && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2 border border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-700">{loadError}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="admin-items-search"
            type="text"
            placeholder="Buscar item por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border text-xs font-semibold outline-none bg-white transition-all shadow-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            id="admin-items-filter-area"
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="flex-1 min-w-0 text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white outline-none transition cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <select
            id="admin-items-filter-type"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="flex-1 min-w-0 text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white outline-none transition cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">Todos os tipos</option>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Status pills + count */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_PILLS.map(({ value, label }) => (
            <button
              key={value}
              id={`admin-items-status-${value}`}
              onClick={() => setFilterStatus(value)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer border ${
                filterStatus === value
                  ? 'text-white border-transparent'
                  : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'
              }`}
              style={filterStatus === value ? { backgroundColor: 'var(--brand)', borderColor: 'var(--brand)' } : {}}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-bold text-gray-400">
            {filtered.length} de {items.length}
          </span>
        </div>

        {/* Items list */}
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div
              className="rounded-2xl p-10 border bg-white text-center space-y-2"
              style={{ borderColor: 'var(--border)' }}
            >
              <Package className="w-9 h-9 mx-auto text-gray-200" />
              <p className="text-xs font-bold text-gray-500">Nenhum item encontrado</p>
              <p className="text-[10px] text-gray-400">Ajuste a busca ou os filtros.</p>
            </div>
          ) : (
            filtered.map(item => {
              const typeCfg = ITEM_TYPE_CONFIG[item.item_type] || { color: '#9CA3AF', label: 'Outro' }
              return (
                <button
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="w-full rounded-xl px-3.5 py-3 border bg-white flex items-center gap-3 text-left transition-all duration-150 hover:border-gray-300 active:scale-[0.99] cursor-pointer"
                  style={{
                    borderColor: 'var(--border)',
                    opacity: item.active ? 1 : 0.6,
                  }}
                >
                  {/* Type color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: typeCfg.color }}
                  />

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--foreground)' }}>
                      {item.name}
                    </p>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5 truncate">
                      {item.count_areas?.name ?? 'Sem área'} · {item.unit}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`shrink-0 text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      item.active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {item.active ? 'Ativo' : 'Inativo'}
                  </span>

                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── Edit Bottom Sheet ──────────────────────────────────────────────── */}
      {editingItem && editForm && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Editar Item</p>
                <h2
                  className="text-sm font-extrabold truncate max-w-[240px]"
                  style={{ color: 'var(--foreground)' }}
                >
                  {editingItem.name}
                </h2>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                aria-label="Fechar edição"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

              {/* Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-name"
                  className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
                >
                  Nome *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={e => patchForm('name', e.target.value)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder="Nome do item"
                />
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-unit"
                  className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
                >
                  Unidade *
                </label>
                <input
                  id="edit-unit"
                  type="text"
                  value={editForm.unit}
                  onChange={e => patchForm('unit', e.target.value)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder="Ex: kg, un, L, cx"
                />
              </div>

              {/* Item type */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-type"
                  className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
                >
                  Tipo de Item *
                </label>
                <div className="relative">
                  <select
                    id="edit-type"
                    value={editForm.item_type}
                    onChange={e => patchForm('item_type', e.target.value as ItemType)}
                    className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold cursor-pointer appearance-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {/* Color indicator for selected type */}
                  <div
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                    style={{ backgroundColor: ITEM_TYPE_CONFIG[editForm.item_type]?.color ?? '#9CA3AF' }}
                  />
                </div>
              </div>

              {/* Area */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-area"
                  className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
                >
                  Área da Loja
                </label>
                <select
                  id="edit-area"
                  value={editForm.area_id}
                  onChange={e => patchForm('area_id', e.target.value)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  <option value="">Sem área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* Sort order */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-order"
                  className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
                >
                  Ordem de Exibição
                </label>
                <input
                  id="edit-order"
                  type="number"
                  min={0}
                  value={editForm.sort_order}
                  onChange={e => patchForm('sort_order', e.target.value)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white transition-all font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder="0"
                />
              </div>

              {/* Active toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3.5 border bg-gray-50"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                    Status do Item
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {editForm.active
                      ? 'Ativo — aparece nas próximas contagens'
                      : 'Inativo — não aparece nas contagens'}
                  </p>
                </div>
                <button
                  id="edit-active-toggle"
                  onClick={() => patchForm('active', !editForm.active)}
                  className="relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer shrink-0"
                  style={editForm.active ? { backgroundColor: 'var(--brand)' } : { backgroundColor: '#D1D5DB' }}
                  aria-pressed={editForm.active}
                  aria-label="Ativar/inativar item"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                      editForm.active ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Error feedback */}
              {saveState === 'error' && saveError && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-700">{saveError}</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t space-y-2.5 shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                id="edit-save-btn"
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
                style={{ backgroundColor: saveState === 'saved' ? '#10B981' : 'var(--brand)' }}
              >
                {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {saveState === 'saved' && <Check className="w-4 h-4" />}
                {saveState === 'saving'
                  ? 'Salvando...'
                  : saveState === 'saved'
                  ? 'Salvo!'
                  : 'Salvar Alterações'}
              </button>
              <button
                onClick={closeEdit}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
