'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ClipboardList, Loader2, Search, Check,
  AlertCircle, X, Eye, HelpCircle, Save
} from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import {
  getActiveSessionAction,
  startSessionAction,
  updateSessionItemAction,
  completeSessionAction
} from '@/app/actions/count'
import type { CountSession, CountSessionItem, AreaStatus } from '@/lib/types'

// Função utilitária para mapear slug da área física para emoji
export function getAreaIcon(slug: string): string {
  const icons: Record<string, string> = {
    'bar': '🍸',
    'cozinha': '🍳',
    'estoque-seco': '📦',
    'bebidas': '🍹',
    'freezer-camara': '🥶',
    'descartaveis': '🥤'
  }
  return icons[slug] || '📁'
}

// Definição de interface para os itens com join
interface JoinedSessionItem {
  id: string
  session_id: string
  item_id: string
  area_id: string | null
  quantity: number | null
  status: 'pending' | 'counted' | 'zeroed' | 'skipped'
  observation: string | null
  count_items: {
    name: string
    unit: string
    item_type: string
  } | null
}

export default function CountsPage() {
  const router = useRouter()
  const { loading: storeLoading, isConfigured, profile, areas } = useStoreData()

  // Estados principais
  const [activeSession, setActiveSession] = useState<CountSession | null>(null)
  const [sessionItems, setSessionItems] = useState<JoinedSessionItem[]>([])
  const [loadingSession, setLoadingSession] = useState(true)
  const [starting, setStarting] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Estados de navegação interna e busca
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Estados locais para inputs em tempo real para evitar lag ao digitar
  const [inputQuantities, setInputQuantities] = useState<Record<string, string>>({})
  const [inputObservations, setInputObservations] = useState<Record<string, string>>({})
  const [saveStates, setSaveStates] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})

  // Estados dos Modais de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAreasList, setPendingAreasList] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')

  const isLive = isConfigured && profile !== null

  // Carregar sessão ativa e itens do Supabase
  useEffect(() => {
    if (!isConfigured || !profile) {
      setLoadingSession(false)
      return
    }

    async function loadSession() {
      try {
        const session = await getActiveSessionAction()
        setActiveSession(session)
        if (session) {
          await loadSessionItems(session.id)
        }
      } catch (err) {
        console.error('Erro ao carregar sessão ativa:', err)
      } finally {
        setLoadingSession(false)
      }
    }

    loadSession()
  }, [isConfigured, profile])

  // Função auxiliar para carregar itens da sessão
  async function loadSessionItems(sessionId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('count_session_items')
      .select(`
        id,
        session_id,
        item_id,
        area_id,
        quantity,
        status,
        observation,
        count_items (
          name,
          unit,
          item_type
        )
      `)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Erro ao carregar itens da contagem:', error)
      return
    }

    const items = (data || []) as unknown as JoinedSessionItem[]
    setSessionItems(items)

    // Sincronizar inputs locais
    const qtys: Record<string, string> = {}
    const obs: Record<string, string> = {}
    items.forEach(item => {
      qtys[item.item_id] = item.quantity !== null ? String(item.quantity) : ''
      obs[item.item_id] = item.observation || ''
    })
    setInputQuantities(qtys)
    setInputObservations(obs)
  }

  // Ação de Iniciar Contagem
  const handleStartSession = async () => {
    setStarting(true)
    try {
      const res = await startSessionAction()
      if (res.success && res.session) {
        setActiveSession(res.session)
        await loadSessionItems(res.session.id)
      } else {
        alert(res.error || 'Erro ao iniciar sessão.')
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.')
    } finally {
      setStarting(false)
    }
  }

  // Ação de salvar item (manual ou autosave)
  const handleSaveItem = async (itemId: string, forceStatus?: 'zeroed') => {
    if (!activeSession) return

    const rawQty = forceStatus === 'zeroed' ? '0' : (inputQuantities[itemId] || '').trim()
    const observation = (inputObservations[itemId] || '').trim()

    // Se estiver vazio e não for zerado, ignorar salvamento (continua pendente)
    if (rawQty === '' && forceStatus !== 'zeroed') {
      return
    }

    // Normalizar ponto e vírgula decimal
    const normalizedQty = rawQty.replace(',', '.')
    const parsedQty = parseFloat(normalizedQty)

    if (isNaN(parsedQty) || parsedQty < 0) {
      setSaveStates(prev => ({ ...prev, [itemId]: 'error' }))
      setSaveErrors(prev => ({ ...prev, [itemId]: 'Insira um valor numérico válido.' }))
      return
    }

    setSaveStates(prev => ({ ...prev, [itemId]: 'saving' }))
    setSaveErrors(prev => ({ ...prev, [itemId]: '' }))

    const isZeroed = forceStatus === 'zeroed' || parsedQty === 0

    try {
      const res = await updateSessionItemAction(
        activeSession.id,
        itemId,
        parsedQty,
        isZeroed,
        observation || null
      )

      if (res.success) {
        setSaveStates(prev => ({ ...prev, [itemId]: 'saved' }))
        
        // Atualizar lista local de itens para refletir status
        setSessionItems(prev =>
          prev.map(item =>
            item.item_id === itemId
              ? {
                  ...item,
                  quantity: parsedQty,
                  status: isZeroed ? 'zeroed' : 'counted',
                  observation: observation || null,
                }
              : item
          )
        )

        if (forceStatus === 'zeroed') {
          setInputQuantities(prev => ({ ...prev, [itemId]: '0' }))
        }

        // Limpar status de "salvo" após 2 segundos
        setTimeout(() => {
          setSaveStates(prev => (prev[itemId] === 'saved' ? { ...prev, [itemId]: 'idle' } : prev))
        }, 2000)
      } else {
        setSaveStates(prev => ({ ...prev, [itemId]: 'error' }))
        setSaveErrors(prev => ({ ...prev, [itemId]: 'Não foi possível salvar. Tente novamente.' }))
      }
    } catch (err) {
      setSaveStates(prev => ({ ...prev, [itemId]: 'error' }))
      setSaveErrors(prev => ({ ...prev, [itemId]: 'Erro de rede. Tente novamente.' }))
    }
  }

  // Prepara confirmação de encerramento
  const handleOpenConfirmModal = () => {
    if (!activeSession) return

    // Contar pendências
    const pendingItems = sessionItems.filter(x => x.status === 'pending')

    if (pendingItems.length > 0) {
      // Mapear pendências por área
      const areaNameMap: Record<string, string> = {}
      areas.forEach(a => {
        areaNameMap[a.id] = a.name
      })

      const map: Record<string, number> = {}
      pendingItems.forEach(item => {
        const areaName = item.area_id ? (areaNameMap[item.area_id] || 'Sem Área') : 'Sem Área'
        map[areaName] = (map[areaName] || 0) + 1
      })

      setPendingAreasList(map)
      setShowConfirmModal(true)
    } else {
      setPendingAreasList({})
      setShowConfirmModal(true)
    }
  }

  // Efetua a finalização da sessão no Supabase
  const handleCompleteSession = async () => {
    if (!activeSession) return
    setCompleting(true)

    try {
      const res = await completeSessionAction(activeSession.id, notes)
      if (res.success) {
        setShowConfirmModal(false)
        setActiveSession(null)
        setSessionItems([])
        setSelectedAreaId(null)
        alert('Sessão de contagem finalizada e registrada no histórico!')
        router.push('/dashboard')
      } else {
        alert(res.error || 'Falha ao finalizar contagem.')
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.')
    } finally {
      setCompleting(false)
    }
  }

  if (storeLoading || loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand)' }} />
      </div>
    )
  }

  // --- Caso 1: Supabase não configurado ou mock data ---
  if (!isLive) {
    return (
      <div className="space-y-5 py-5 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Contagem</p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>Modo de Demonstração</h1>
          </div>
        </div>

        <div className="rounded-2xl p-6 border-2 border-dashed bg-white shadow-sm text-center space-y-3" style={{ borderColor: 'var(--border)' }}>
          <ClipboardList className="w-10 h-10 mx-auto" style={{ color: 'var(--brand)' }} />
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider">Modo Local Simulado</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              Configure o Supabase na Vercel ou no arquivo `.env.local` local para habilitar o fluxo completo de contagem em lote com os 223 itens reais do +1 Bar!
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- Caso 2: Supabase Ativo mas Sem Sessão Aberta ---
  if (!activeSession) {
    return (
      <div className="space-y-5 py-5 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Módulo de Contagem</p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>Contagem da Loja</h1>
          </div>
        </div>

        <div className="rounded-2xl p-6 border bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)] text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center border border-red-100 animate-pulse">
            <ClipboardList className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Pronto para iniciar
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Uma nova sessão de contagem será aberta. O sistema inicializará os **223 itens reais** e os dividirá nas áreas físicas correspondentes.
            </p>
          </div>

          <button
            onClick={handleStartSession}
            disabled={starting}
            className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:bg-opacity-95 active:scale-[0.98] shadow-[0_2px_6px_rgba(124,45,53,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            {starting ? 'Inicializando Itens...' : 'Iniciar Contagem de Hoje'}
          </button>
        </div>
      </div>
    )
  }

  // --- Caso 3: Sessão Aberta - Visão de Áreas ---
  if (selectedAreaId === null) {
    // Calcular progresso de itens geral
    const totalSessionItems = sessionItems.length
    const completedSessionItems = sessionItems.filter(x => x.status !== 'pending').length
    const sessionProgress = totalSessionItems > 0 ? Math.round((completedSessionItems / totalSessionItems) * 100) : 0

    // Progresso individual por área
    const displayAreas = areas.map(area => {
      const areaItems = sessionItems.filter(x => x.area_id === area.id)
      const areaTotal = areaItems.length
      const areaCompleted = areaItems.filter(x => x.status !== 'pending').length
      const areaProgress = areaTotal > 0 ? Math.round((areaCompleted / areaTotal) * 100) : 0
      const status = (areaCompleted === 0 ? 'pending' : (areaCompleted === areaTotal ? 'completed' : 'in_progress')) as AreaStatus
      return {
        ...area,
        itemCount: areaTotal,
        completedCount: areaCompleted,
        progress: areaProgress,
        status,
      }
    })

    const allCompleted = completedSessionItems === totalSessionItems

    return (
      <div className="space-y-5 py-5 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Painel de Contagem</p>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>Áreas de Estoque</h1>
            </div>
          </div>
          <StatusBadge variant="count" status="in_progress" />
        </div>

        {/* Progresso Geral */}
        <div className="rounded-2xl p-4 border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Progresso Geral da Loja
            </span>
            <span className="text-[10px] font-black" style={{ color: 'var(--brand)' }}>
              {completedSessionItems} de {totalSessionItems} itens contados
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={sessionProgress} />
            </div>
            <span className="text-sm font-black tracking-tight" style={{ color: 'var(--brand)' }}>{sessionProgress}%</span>
          </div>
        </div>

        {/* Áreas para Contagem */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={{ color: 'var(--muted)' }}>
            Selecione uma área para contar
          </p>

          <div className="grid gap-2">
            {displayAreas.map(area => (
              <div
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className="rounded-xl p-3.5 border flex flex-col gap-2.5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-200 hover:border-gray-300 cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-gray-50 border border-gray-100 shrink-0">
                      {getAreaIcon(area.slug)}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                        {area.name}
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                        {area.completedCount} de {area.itemCount} itens contados
                      </p>
                    </div>
                  </div>
                  <StatusBadge variant="area" status={area.status} />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar value={area.progress} />
                  </div>
                  <span className="text-[10px] font-black text-gray-500 shrink-0">{area.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão de Encerramento Geral */}
        <div className="pt-2">
          <button
            onClick={handleOpenConfirmModal}
            className="w-full py-4 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:bg-opacity-95 active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            <Check className="w-4 h-4" />
            Finalizar Contagem
          </button>
        </div>

        {/* Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-gray-800">
                  <AlertCircle className="w-4.5 h-4.5" style={{ color: 'var(--brand)' }} />
                  Confirmação de Sessão
                </h3>
                <button onClick={() => setShowConfirmModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {Object.keys(pendingAreasList).length > 0 ? (
                // CASO POSSUA PENDÊNCIAS
                <div className="space-y-4">
                  <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                    <p className="font-bold">A contagem possui itens pendentes!</p>
                    <p>Não é possível finalizar a sessão enquanto houver itens não contados.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Itens pendentes por área:</p>
                    <div className="max-h-36 overflow-y-auto divide-y border rounded-xl" style={{ borderColor: 'var(--border)' }}>
                      {Object.entries(pendingAreasList).map(([areaName, count]) => (
                        <div key={areaName} className="flex justify-between py-2 px-3 text-xs font-semibold text-gray-700 bg-white">
                          <span>{areaName}</span>
                          <span className="text-amber-600 font-bold">{count} pendentes</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer shadow-sm"
                    style={{ backgroundColor: 'var(--brand)' }}
                  >
                    Entendido, Voltar a Contar
                  </button>
                </div>
              ) : (
                // CASO ESTEJA 100% PREENCHIDO
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-gray-600">
                    Deseja finalizar a contagem? Depois disso ela será registrada no histórico.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Observações adicionais (opcional):</label>
                    <textarea
                      placeholder="Ex: Tudo correto, estoque dentro do esperado..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full text-xs p-3 border rounded-xl outline-none focus:border-red-800 bg-gray-50 focus:bg-white transition-all h-20 resize-none font-medium text-gray-800"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer hover:bg-gray-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCompleteSession}
                      disabled={completing}
                      className="flex-1 py-3 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: 'var(--brand)' }}
                    >
                      {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {completing ? 'Encerrando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Caso 4: Sessão Aberta - Tela de Itens da Área Selecionada ---
  const currentArea = areas.find(a => a.id === selectedAreaId)
  const areaItems = sessionItems.filter(item => item.area_id === selectedAreaId)

  // Filtragem por busca
  const filteredItems = areaItems.filter(item =>
    (item.count_items?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 py-5 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedAreaId(null)
              setSearchQuery('')
            }}
            className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition"
            style={{ borderColor: 'var(--border)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Área Operacional</p>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {currentArea?.name}
            </h1>
          </div>
        </div>
        <span className="text-[10px] font-black text-gray-500 uppercase">
          {areaItems.filter(x => x.status !== 'pending').length} de {areaItems.length} itens
        </span>
      </div>

      {/* Input de Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar item pelo nome..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border text-xs font-semibold outline-none bg-white focus:border-red-800 transition-all shadow-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista de Itens */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl p-8 border text-center space-y-1 bg-white" style={{ borderColor: 'var(--border)' }}>
            <AlertCircle className="w-7 h-7 mx-auto text-gray-400" />
            <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>Nenhum item localizado</p>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Modifique a busca ou limpe o campo.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const savedState = saveStates[item.item_id] || 'idle'
            const errorMsg = saveErrors[item.item_id]
            const name = item.count_items?.name || 'Insumo sem nome'
            const unit = item.count_items?.unit || 'un'
            
            return (
              <div
                key={item.id}
                className="rounded-xl p-3 border.5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2.5 transition-all"
                style={{
                  borderColor:
                    savedState === 'error'
                      ? '#EF4444'
                      : savedState === 'saved'
                      ? '#10B981'
                      : 'var(--border)',
                }}
              >
                {/* Nome e Categoria do Item */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-xs font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                      {name}
                    </h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                      Unidade: <span className="text-gray-500 font-extrabold">{unit}</span>
                    </p>
                  </div>
                  {/* Status Badge Custom */}
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 border ${
                      item.status === 'zeroed'
                        ? 'border-amber-200 text-amber-700 bg-amber-50'
                        : item.status === 'counted'
                        ? 'border-green-200 text-green-700 bg-green-50'
                        : 'border-gray-200 text-gray-400 bg-transparent'
                    }`}
                  >
                    {item.status === 'zeroed' ? 'Zerado' : item.status === 'counted' ? 'Contado' : 'Pendente'}
                  </span>
                </div>

                {/* Input de Contagem e Botões */}
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Qtd"
                      value={inputQuantities[item.item_id] ?? ''}
                      onChange={e => setInputQuantities(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                      onBlur={() => handleSaveItem(item.item_id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSaveItem(item.item_id)
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-20 text-center py-2.5 rounded-lg border text-xs font-extrabold outline-none bg-gray-50 focus:bg-white focus:border-red-800 transition-all text-gray-800"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    
                    {/* Botão de Salvar Manual */}
                    <button
                      onClick={() => handleSaveItem(item.item_id)}
                      disabled={savedState === 'saving'}
                      className="p-2.5 rounded-lg border flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition active:scale-95 cursor-pointer shrink-0"
                      style={{ borderColor: 'var(--border)' }}
                      title="Salvar item"
                    >
                      {savedState === 'saving' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                      ) : savedState === 'saved' ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Save className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    {/* Botão Zerar */}
                    <button
                      onClick={() => handleSaveItem(item.item_id, 'zeroed')}
                      className="px-3.5 py-2 text-[10px] font-black uppercase border rounded-lg transition active:scale-95 cursor-pointer shrink-0 bg-red-50 hover:bg-red-100/70 border-red-200"
                      style={{ color: 'var(--brand)' }}
                    >
                      Zerar
                    </button>
                  </div>
                </div>

                {/* Input de Observação opcional */}
                <input
                  type="text"
                  placeholder="Observação (opcional)..."
                  value={inputObservations[item.item_id] ?? ''}
                  onChange={e => setInputObservations(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                  onBlur={() => handleSaveItem(item.item_id)}
                  className="w-full text-[10px] p-2 border rounded-lg outline-none bg-gray-50/50 font-semibold focus:bg-white focus:border-red-800 transition-all text-gray-700"
                  style={{ borderColor: 'var(--border)' }}
                />

                {/* Alertas de Erro */}
                {savedState === 'error' && errorMsg && (
                  <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5 animate-pulse mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errorMsg}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Barra de Rodapé de Navegação */}
      <div className="pt-2">
        <button
          onClick={() => {
            setSelectedAreaId(null)
            setSearchQuery('')
          }}
          className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:bg-opacity-95 active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          Voltar para Áreas
        </button>
      </div>
    </div>
  )
}
