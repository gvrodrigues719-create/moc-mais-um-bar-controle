'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, X, AlertCircle, Loader2, Check, MapPin, ChevronRight, Layers, SlidersHorizontal, Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getAreasAction,
  updateAreaAction,
  type AdminAreaWithCounts,
} from '@/app/actions/admin'

type StatusFilter = 'all' | 'active' | 'inactive'
type ActionState = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminAreasPage() {
  const router = useRouter()

  // Context & Access Control
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Data States
  const [areas, setAreas] = useState<AdminAreaWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  // Edit State
  const [editingArea, setEditingArea] = useState<AdminAreaWithCounts | null>(null)
  const [editForm, setEditForm] = useState<{
    name: string
    description: string
    sort_order: number
    active: boolean
  } | null>(null)
  const [editState, setEditState] = useState<ActionState>('idle')
  const [editError, setEditError] = useState('')

  // Load and Check Permissions
  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  async function checkAccessAndLoad() {
    setLoading(true)
    setLoadError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role === 'operator') {
        // Redireciona operadores (sem acesso ao admin)
        router.push('/dashboard')
        return
      }

      setCurrentUserRole(profile.role)
      setCurrentUserId(user.id)

      // Fetch areas
      const res = await getAreasAction()
      if (res.success) {
        setAreas(res.areas)
      } else {
        setLoadError(res.error || 'Erro ao carregar as áreas.')
      }
    } catch (err) {
      console.error(err)
      setLoadError('Erro ao estabelecer conexão.')
    } finally {
      setLoading(false)
    }
  }

  // Load areas function for refreshing
  async function refreshAreas() {
    try {
      const res = await getAreasAction()
      if (res.success) {
        setAreas(res.areas)
      }
    } catch (err) {
      console.error('Erro ao recarregar áreas:', err)
    }
  }

  // Filtering
  const filteredAreas = useMemo(() => {
    const query = search.toLowerCase().trim()
    return areas.filter(a => {
      const matchSearch = !query || a.name.toLowerCase().includes(query)
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? a.active : !a.active)
      return matchSearch && matchStatus
    })
  }, [areas, search, filterStatus])

  // Summary counts
  const summary = useMemo(() => {
    return {
      total: areas.length,
      active: areas.filter(a => a.active).length,
      inactive: areas.filter(a => !a.active).length,
    }
  }, [areas])

  // Edit Actions
  function openEdit(area: AdminAreaWithCounts) {
    setEditingArea(area)
    setEditForm({
      name: area.name,
      description: area.description || '',
      sort_order: area.sort_order,
      active: area.active,
    })
    setEditState('idle')
    setEditError('')
  }

  function closeEdit() {
    setEditingArea(null)
    setEditForm(null)
    setEditState('idle')
    setEditError('')
  }

  async function handleSaveEdit() {
    if (!editingArea || !editForm) return

    const nameTrimmed = editForm.name.trim()
    if (!nameTrimmed) {
      setEditState('error')
      setEditError('O nome da área é obrigatório.')
      return
    }

    setEditState('saving')
    setEditError('')

    try {
      const res = await updateAreaAction(editingArea.id, {
        name: nameTrimmed,
        description: editForm.description.trim() || null,
        sort_order: Number(editForm.sort_order),
        active: editForm.active,
      })

      if (res.success) {
        setEditState('saved')
        
        // Optimistic UI updates
        setAreas(prev =>
          prev.map(a =>
            a.id === editingArea.id
              ? {
                  ...a,
                  name: nameTrimmed,
                  description: editForm.description.trim() || null,
                  sort_order: Number(editForm.sort_order),
                  active: editForm.active,
                }
              : a
          )
        )
        
        // Wait 1.2s before closing modal, then refresh completely
        setTimeout(() => {
          closeEdit()
          refreshAreas()
        }, 1200)
      } else {
        setEditState('error')
        setEditError(res.error || 'Erro ao atualizar a área.')
      }
    } catch (err) {
      console.error(err)
      setEditState('error')
      setEditError('Erro de conexão ao salvar alterações.')
    }
  }

  const isAdmin = currentUserRole === 'admin'
  const isManager = currentUserRole === 'manager'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin animate-duration-1000" style={{ color: 'var(--brand)' }} />
        <p className="text-xs font-semibold text-gray-500">Carregando áreas...</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 py-5 max-w-lg mx-auto px-4">
        
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Admin
            </p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Áreas da Loja
            </h1>
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: summary.total, bg: '#F7F6F3', text: 'var(--foreground)' },
            { label: 'Ativas', value: summary.active, bg: '#F0FDF4', text: '#16A34A' },
            { label: 'Inativas', value: summary.inactive, bg: '#FEF2F2', text: '#DC2626' },
          ].map(({ label, value, bg, text }) => (
            <div
              key={label}
              className="rounded-xl p-2.5 text-center border bg-white flex flex-col justify-center shadow-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-lg font-black tracking-tight" style={{ color: text }}>
                {value}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Load errors */}
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
            id="admin-areas-search"
            type="text"
            placeholder="Buscar por nome da área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border text-xs font-semibold outline-none bg-white transition-all shadow-sm focus:border-gray-400"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer animate-fade-in"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Filter */}
        <div className="flex bg-gray-100 p-1 rounded-xl border shadow-inner" style={{ borderColor: 'var(--border)' }}>
          {([
            { value: 'all', label: 'Todas' },
            { value: 'active', label: 'Ativas' },
            { value: 'inactive', label: 'Inativas' }
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === opt.value
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Areas List */}
        <div className="space-y-2">
          {filteredAreas.length === 0 ? (
            <div
              className="rounded-2xl p-10 border bg-white text-center space-y-2"
              style={{ borderColor: 'var(--border)' }}
            >
              <MapPin className="w-9 h-9 mx-auto text-gray-200" />
              <p className="text-xs font-bold text-gray-500">Nenhuma área encontrada</p>
              <p className="text-[10px] text-gray-400">Tente buscar por outro termo.</p>
            </div>
          ) : (
            filteredAreas.map(area => (
              <button
                key={area.id}
                onClick={() => openEdit(area)}
                className="w-full rounded-xl p-4 border bg-white flex items-center justify-between text-left transition-all duration-150 hover:border-gray-300 active:scale-[0.99] cursor-pointer shadow-sm"
                style={{
                  borderColor: 'var(--border)',
                  opacity: area.active ? 1 : 0.65,
                }}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <p className="text-sm font-extrabold truncate" style={{ color: 'var(--foreground)' }}>
                      {area.name}
                    </p>
                    <span className="text-[9px] font-mono text-gray-400 shrink-0 font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      #{area.slug}
                    </span>
                  </div>

                  {area.description && (
                    <p className="text-[11px] text-gray-400 truncate mt-1">
                      {area.description}
                    </p>
                  )}

                  {/* Item Stats */}
                  <div className="text-[11px] font-semibold text-gray-500 mt-2 flex items-center gap-1.5">
                    <span>
                      {area.active_items} {area.active_items === 1 ? 'item ativo' : 'itens ativos'}
                    </span>
                    {area.total_items !== area.active_items && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-400">
                          {area.total_items} total
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                        area.active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {area.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                      Ordem: {area.sort_order}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Modal Editar Área (Bottom Sheet) ────────────────────────────────── */}
      {editingArea && editForm && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Editar Área</p>
                <h2 className="text-sm font-extrabold truncate max-w-[240px]" style={{ color: 'var(--foreground)' }}>
                  {editingArea.name}
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

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Nome da Área *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  disabled={!isAdmin}
                  value={editForm.name}
                  onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white focus:border-gray-400 transition-all font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Slug (Technical Information) */}
              <div className="space-y-1.5">
                <label htmlFor="edit-slug-readonly" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Slug (Não editável)
                </label>
                <input
                  id="edit-slug-readonly"
                  type="text"
                  readOnly
                  disabled
                  value={editingArea.slug}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-100 font-semibold text-gray-400 cursor-not-allowed font-mono"
                  style={{ borderColor: 'var(--border)' }}
                />
                <div className="flex items-start gap-1.5 text-[9px] text-gray-400 font-semibold mt-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <span>Slug técnico. Não editar para evitar quebrar vínculos.</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="edit-description" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Descrição
                </label>
                <textarea
                  id="edit-description"
                  rows={2}
                  disabled={!isAdmin}
                  value={editForm.description}
                  onChange={e => setEditForm(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="Ex: Balcão e prateleiras de bebidas frias"
                  className="w-full text-sm px-3.5 py-2.5 border rounded-xl outline-none bg-gray-50 focus:bg-white focus:border-gray-400 transition-all font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed resize-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Sort Order */}
              <div className="space-y-1.5">
                <label htmlFor="edit-sort-order" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Ordem de Exibição
                </label>
                <input
                  id="edit-sort-order"
                  type="number"
                  disabled={!isAdmin}
                  value={editForm.sort_order}
                  onChange={e => setEditForm(prev => prev ? { ...prev, sort_order: Number(e.target.value) } : prev)}
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white focus:border-gray-400 transition-all font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Active Toggle Status */}
              <div
                className="flex flex-col rounded-xl px-4 py-3.5 border bg-gray-50 space-y-2.5"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                      Status da Área
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {editForm.active ? 'Ativa — visível e disponível para contagem' : 'Inativa — oculta no fluxo operacional'}
                    </p>
                  </div>
                  <button
                    id="edit-active-toggle"
                    disabled={!isAdmin}
                    onClick={() => setEditForm(prev => prev ? { ...prev, active: !prev.active } : prev)}
                    className="relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={editForm.active ? { backgroundColor: 'var(--brand)' } : { backgroundColor: '#D1D5DB' }}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                        editForm.active ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {!editForm.active && (
                  <div className="rounded-lg p-2.5 bg-amber-50 border border-amber-200/50 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-semibold text-amber-800 leading-relaxed">
                      <span className="font-bold">Aviso operacional:</span> A desativação requer que a área não possua nenhum item ativo associado.
                    </p>
                  </div>
                )}
              </div>

              {editState === 'error' && editError && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-red-50 border border-red-200 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-700">{editError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t space-y-2.5 shrink-0" style={{ borderColor: 'var(--border)' }}>
              {!isAdmin ? (
                <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold text-center leading-relaxed">
                  Apenas administradores podem salvar alterações nas áreas.
                </div>
              ) : (
                <button
                  id="edit-save-btn"
                  onClick={handleSaveEdit}
                  disabled={editState === 'saving'}
                  className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
                  style={{ backgroundColor: editState === 'saved' ? '#10B981' : 'var(--brand)' }}
                >
                  {editState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editState === 'saved' && <Check className="w-4 h-4" />}
                  {editState === 'saving'
                    ? 'Salvando...'
                    : editState === 'saved'
                    ? 'Salvo!'
                    : 'Salvar Alterações'}
                </button>
              )}
              <button
                onClick={closeEdit}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                {isAdmin ? 'Cancelar' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
