'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, X, AlertCircle, Loader2, Check, ClipboardList, ChevronDown, ChevronUp, Trash2, Calendar, User
} from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import {
  getSessionsAction,
  cancelSessionAction,
  type AdminSession,
} from '@/app/actions/admin'

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'cancelled'
type ActionState = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminSessionsPage() {
  const router = useRouter()
  const { loading: storeLoading, isConfigured, profile } = useStoreData()

  // Data States
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // UI States
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  // Cancellation Modal States
  const [cancellingSession, setCancellingSession] = useState<AdminSession | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelState, setCancelState] = useState<ActionState>('idle')
  const [cancelError, setCancelError] = useState('')

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await getSessionsAction()
      if (res.success) {
        setSessions(res.sessions)
      } else {
        setLoadError(res.error || 'Erro ao carregar sessões.')
      }
    } catch {
      setLoadError('Erro de conexão ao carregar sessões.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (storeLoading) return

    if (isConfigured && (!profile || profile.role === 'operator')) {
      router.push('/dashboard')
      return
    }

    if (isConfigured && profile) {
      const timer = setTimeout(() => {
        loadSessions()
      }, 0)
      return () => clearTimeout(timer)
    } else if (isConfigured === false) {
      const timer = setTimeout(() => {
        setLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [storeLoading, isConfigured, profile, router, loadSessions])

  async function refreshSessions() {
    try {
      const res = await getSessionsAction()
      if (res.success) {
        setSessions(res.sessions)
      }
    } catch (err) {
      console.error('Erro ao recarregar:', err)
    }
  }

  // Filtering
  const filteredSessions = useMemo(() => {
    const q = search.toLowerCase().trim()
    return sessions.filter(s => {
      // Filtrar por texto da observação, responsável ou ID
      const matchSearch =
        !q ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.started_by_profile?.name && s.started_by_profile.name.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)

      const matchStatus = filterStatus === 'all' || s.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [sessions, search, filterStatus])

  // Expanded panel helper
  const toggleExpand = (id: string) => {
    setExpandedSessionId(prev => (prev === id ? null : id))
  }

  // Open cancellation
  const openCancel = (session: AdminSession) => {
    setCancellingSession(session)
    setCancelReason('')
    setCancelState('idle')
    setCancelError('')
  }

  const closeCancel = () => {
    setCancellingSession(null)
    setCancelReason('')
    setCancelState('idle')
    setCancelError('')
  }

  const handleCancelSubmit = async () => {
    if (!cancellingSession) return

    const reason = cancelReason.trim()
    if (!reason) {
      setCancelState('error')
      setCancelError('Escreva a justificativa para o cancelamento.')
      return
    }

    setCancelState('saving')
    setCancelError('')

    try {
      const res = await cancelSessionAction(cancellingSession.id, reason)
      if (res.success) {
        setCancelState('saved')
        
        // Optimistic UI updates
        setSessions(prev =>
          prev.map(s =>
            s.id === cancellingSession.id
              ? {
                  ...s,
                  status: 'cancelled',
                  notes: `Cancelada: ${reason}`,
                  completed_at: new Date().toISOString(),
                }
              : s
          )
        )

        setTimeout(() => {
          closeCancel()
          refreshSessions()
        }, 1200)
      } else {
        setCancelState('error')
        setCancelError(res.error || 'Erro ao cancelar a sessão.')
      }
    } catch {
      setCancelState('error')
      setCancelError('Erro de conexão ao salvar cancelamento.')
    }
  }

  // Format date helper
  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isLive = isConfigured && profile !== null

  if (storeLoading) {
    return null
  }

  if (isConfigured && (!profile || profile.role === 'operator')) {
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-red-800" style={{ color: 'var(--brand)' }} />
        <p className="text-xs font-semibold text-gray-500">Carregando sessões de contagem...</p>
      </div>
    )
  }

  if (!isLive) {
    return (
      <div className="space-y-5 py-5 max-w-lg mx-auto px-4">
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin</p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>Sessões</h1>
          </div>
        </div>

        <div className="rounded-2xl p-10 border bg-white text-center space-y-4 shadow-sm" style={{ borderColor: 'var(--border)' }}>
          <ClipboardList className="w-10 h-10 mx-auto text-gray-300" />
          <div className="space-y-1">
            <p className="text-sm font-extrabold">Modo de Demonstração</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              O módulo de auditoria de sessões exige conexão ativa com o banco Supabase. Configure as variáveis de ambiente para visualizar logs de contagem reais.
            </p>
          </div>
        </div>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin</p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Sessões de Contagem
            </h1>
          </div>
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
            id="admin-sessions-search"
            type="text"
            placeholder="Buscar por responsável ou observação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border text-xs font-semibold outline-none bg-white transition-all shadow-sm focus:border-gray-400"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {([
            { value: 'all', label: 'Todas' },
            { value: 'in_progress', label: 'Em Andamento' },
            { value: 'completed', label: 'Concluídas' },
            { value: 'cancelled', label: 'Canceladas' }
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition cursor-pointer shrink-0 ${
                filterStatus === opt.value
                  ? 'text-white border-transparent'
                  : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'
              }`}
              style={filterStatus === opt.value ? { backgroundColor: 'var(--brand)' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sessions list */}
        <div className="space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="rounded-2xl p-10 border bg-white text-center space-y-2" style={{ borderColor: 'var(--border)' }}>
              <ClipboardList className="w-9 h-9 mx-auto text-gray-200" />
              <p className="text-xs font-bold text-gray-500">Nenhuma sessão localizada</p>
              <p className="text-[10px] text-gray-400">Ajuste os termos de busca ou filtros.</p>
            </div>
          ) : (
            filteredSessions.map(session => {
              const isExpanded = expandedSessionId === session.id
              const progressPercent = session.total_items > 0
                ? Math.round((session.counted_items / session.total_items) * 100)
                : 0

              let statusLabel = 'Iniciada'
              let statusStyle = 'bg-orange-50 text-orange-700 border-orange-200'
              if (session.status === 'completed') {
                statusLabel = 'Concluída'
                statusStyle = 'bg-green-50 text-green-700 border-green-200'
              } else if (session.status === 'cancelled') {
                statusLabel = 'Cancelada'
                statusStyle = 'bg-red-50 text-red-700 border-red-200'
              }

              return (
                <div
                  key={session.id}
                  className="rounded-xl border bg-white shadow-sm overflow-hidden"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Summary Card */}
                  <div
                    onClick={() => toggleExpand(session.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${statusStyle}`}>
                          {statusLabel}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono font-medium truncate max-w-[120px]">
                          #{session.id.split('-')[0]}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 mt-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(session.started_at)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {session.started_by_profile?.name || 'Sistema'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-black" style={{ color: 'var(--brand)' }}>
                          {session.counted_items} / {session.total_items}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                          {progressPercent}% Contado
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t bg-gray-50/50 space-y-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 border rounded-lg bg-white text-center">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Total</p>
                          <p className="text-sm font-black text-gray-800 mt-0.5">{session.total_items}</p>
                        </div>
                        <div className="p-2 border rounded-lg bg-white text-center">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Contados</p>
                          <p className="text-sm font-black text-green-700 mt-0.5">{session.counted_items}</p>
                        </div>
                        <div className="p-2 border rounded-lg bg-white text-center">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Pendentes</p>
                          <p className="text-sm font-black text-amber-700 mt-0.5">{session.pending_items}</p>
                        </div>
                      </div>

                      {/* Notes / Justification details */}
                      {session.notes && (
                        <div className="p-2.5 border rounded-lg bg-white space-y-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Anotações / Histórico:</span>
                          <p className="text-xs font-semibold text-gray-700 leading-relaxed">{session.notes}</p>
                        </div>
                      )}

                      {/* Dates and closures */}
                      <div className="text-[10px] font-medium text-gray-400 space-y-0.5">
                        <p>Iniciada em: {formatDate(session.started_at)} por {session.started_by_profile?.name || 'Sistema'}</p>
                        {session.completed_at && (
                          <p>
                            {session.status === 'completed' ? 'Concluída' : 'Cancelada'} em: {formatDate(session.completed_at)} por {session.completed_by_profile?.name || 'Sistema'}
                          </p>
                        )}
                      </div>

                      {/* Action to Cancel count session if in progress */}
                      {session.status === 'in_progress' && (
                        <div className="pt-1.5">
                          <button
                            onClick={() => openCancel(session)}
                            className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold uppercase tracking-wider transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            Cancelar Sessão
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ─── Modal Cancelamento de Sessão (Confirmation Bottom Sheet) ────────── */}
      {cancellingSession && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={closeCancel}
        >
          <div
            className="bg-white rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Alerta de Cancelamento</p>
                <h2 className="text-sm font-extrabold text-gray-800">
                  Cancelar Sessão #{cancellingSession.id.split('-')[0]}
                </h2>
              </div>
              <button
                onClick={closeCancel}
                className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              
              <div className="rounded-xl p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs space-y-1.5 leading-relaxed">
                <p className="font-bold uppercase tracking-wide">Atenção! Esta ação não pode ser desfeita.</p>
                <p>
                  O cancelamento encerrará a contagem operacional atual. A sessão será registrada permanentemente no histórico com o status de <strong>Cancelada</strong>. Nenhuma exclusão física de registros ocorrerá.
                </p>
              </div>

              {/* Justification Text area */}
              <div className="space-y-1.5">
                <label htmlFor="cancel-reason" className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Justificativa de Cancelamento *
                </label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Escreva detalhadamente o motivo do cancelamento (ex: Falha operacional no fechamento da cozinha, erro de escala de insumos...)"
                  className="w-full text-sm px-3.5 py-3 border rounded-xl outline-none bg-gray-50 focus:bg-white focus:border-red-800 transition-all font-semibold resize-none text-gray-800"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              {cancelState === 'error' && cancelError && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-700">{cancelError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t space-y-2.5 shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                id="cancel-submit-btn"
                onClick={handleCancelSubmit}
                disabled={cancelState === 'saving'}
                className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
                style={{ backgroundColor: cancelState === 'saved' ? '#10B981' : '#DC2626' }}
              >
                {cancelState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {cancelState === 'saved' && <Check className="w-4 h-4" />}
                {cancelState === 'saving'
                  ? 'Salvando...'
                  : cancelState === 'saved'
                  ? 'Cancelada!'
                  : 'Confirmar Cancelamento'}
              </button>
              <button
                onClick={closeCancel}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Manter Sessão Ativa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
