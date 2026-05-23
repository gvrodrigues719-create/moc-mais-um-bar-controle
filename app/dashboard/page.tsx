'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Clock, CheckCircle2, ChevronRight,
  Store, AlertCircle, Loader2, WifiOff,
  Wine, Utensils, Package, CupSoda, Snowflake, PackageOpen, Folder,
} from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { USER_ROLE_LABELS, COUNT_STATUS_LABELS, type CountSession } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import { getActiveSessionAction } from '@/app/actions/count'
import { MOCK_CURRENT_USER, MOCK_TODAY_COUNT, MOCK_AREAS, MOCK_HISTORY } from '@/mocks/maisUmBar'

// Mapeia slug ou id de área para ícones profissionais do Lucide
export function getAreaIcon(slugOrId: string) {
  const clean = slugOrId.toLowerCase().replace('area-', '')
  const icons: Record<string, any> = {
    'bar': Wine,
    'cozinha': Utensils,
    'estoque': Package,
    'estoque-seco': Package,
    'bebidas': CupSoda,
    'freezer': Snowflake,
    'freezer-camara': Snowflake,
    'descartaveis': PackageOpen
  }
  return icons[clean] || Folder
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function todayLabel() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const { loading, isConfigured, profile, store, areas, recentSessions, error } = useStoreData()

  // Estado local para carregar sessão de contagem ativa e itens do banco
  const [activeSession, setActiveSession] = useState<CountSession | null>(null)
  const [sessionItems, setSessionItems] = useState<any[]>([])
  const [dbActiveItems, setDbActiveItems] = useState<{ id: string; area_id: string | null }[]>([])
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    if (!isConfigured || !profile) {
      setLoadingSession(false)
      return
    }

    const storeId = profile.store_id

    async function loadData() {
      try {
        const supabase = createClient()
        const session = await getActiveSessionAction()
        setActiveSession(session)
        
        if (session) {
          const { data: items } = await supabase
            .from('count_session_items')
            .select('id, status, area_id')
            .eq('session_id', session.id)

          setSessionItems(items || [])
        } else {
          // Quando não há sessão ativa, carrega a lista de itens ativos do Supabase
          const { data: items } = await supabase
            .from('count_items')
            .select('id, area_id')
            .eq('store_id', storeId)
            .eq('active', true)

          setDbActiveItems(items || [])
        }
      } catch (err) {
        console.error('Erro ao carregar dados na Home:', err)
      } finally {
        setLoadingSession(false)
      }
    }

    loadData()
  }, [isConfigured, profile])

  if (loading || loadingSession) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  // --- Dados dinâmicos: Supabase configurado e profile encontrado ---
  const isLive = isConfigured && profile !== null

  const displayName = isLive ? profile!.name : MOCK_CURRENT_USER.name
  const displayRole = isLive ? profile!.role : MOCK_CURRENT_USER.role
  const displayStore = isLive ? (store?.name ?? '+1 Bar') : MOCK_CURRENT_USER.store

  // Calcular progresso real de itens
  const activeSessionExist = isLive && activeSession !== null
  const totalItems = activeSessionExist 
    ? sessionItems.length 
    : (isLive ? dbActiveItems.length : 223)
  const completedItems = activeSessionExist 
    ? sessionItems.filter(x => x.status !== 'pending').length 
    : 0
  const progress = activeSessionExist && totalItems > 0 
    ? Math.round((completedItems / totalItems) * 100) 
    : 0

  // Constante offline para manter congruência com os 223 itens cadastrados nas áreas
  const DEMO_AREA_COUNTS: Record<string, number> = {
    'area-bar': 17,
    'area-cozinha': 9,
    'area-estoque': 77,
    'area-bebidas': 0,
    'area-freezer': 79,
    'area-descartaveis': 41,
  }

  // Progresso das áreas
  const displayAreas = isLive
    ? areas.map(area => {
        if (activeSessionExist) {
          const areaItems = sessionItems.filter(x => x.area_id === area.id)
          const areaTotal = areaItems.length
          const areaCompleted = areaItems.filter(x => x.status !== 'pending').length
          const status = areaCompleted === 0 ? 'pending' : (areaCompleted === areaTotal ? 'completed' : 'in_progress')
          return {
            ...area,
            itemCount: areaTotal,
            completedCount: areaCompleted,
            status,
          }
        }
        // Sem sessão ativa: busca quantidade de itens ativos no Supabase
        const areaTotal = dbActiveItems.filter(x => x.area_id === area.id).length
        return {
          ...area,
          itemCount: areaTotal,
          completedCount: 0,
          status: 'pending' as const,
        }
      })
    : MOCK_AREAS.map(area => {
        const areaTotal = DEMO_AREA_COUNTS[area.id] ?? area.itemCount
        return {
          ...area,
          slug: area.id.replace('area-', ''), // Garante compatibilidade de tipo
          itemCount: areaTotal,
          completedCount: 0,
          status: 'pending' as const,
        }
      })

  // Filtra as áreas ativas/visíveis (que possuem pelo menos 1 item cadastrado)
  const visibleAreas = displayAreas.filter((area: any) => {
    const areaTotal = activeSessionExist 
      ? area.itemCount 
      : (isLive ? area.itemCount : (DEMO_AREA_COUNTS[area.id] ?? area.itemCount))
    return areaTotal > 0
  })

  const totalAreas = visibleAreas.length
  const completedAreasCount = activeSessionExist 
    ? visibleAreas.filter(x => x.status === 'completed').length 
    : 0
  const areasInProgressCount = activeSessionExist 
    ? visibleAreas.filter(x => x.status === 'in_progress').length 
    : 0
  const pendingAreasCount = activeSessionExist 
    ? visibleAreas.filter(x => x.status === 'pending').length 
    : totalAreas

  const sessionStatus = activeSessionExist ? 'in_progress' : 'not_started'

  return (
    <div className="space-y-5 py-5 max-w-lg mx-auto">

      {/* Banner: Supabase não configurado */}
      {!isConfigured && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-medium"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          Modo demonstração — offline
        </div>
      )}

      {/* Banner: Supabase configurado mas sem profile */}
      {isConfigured && !profile && (
        <div
          className="rounded-xl px-4 py-3 space-y-1 text-xs font-medium"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          <p className="font-bold">Usuário sem perfil operacional.</p>
          <p>Configure o perfil em Supabase → tabela profiles.</p>
        </div>
      )}

      {/* Header operacional */}
      <div
        className="rounded-2xl p-4 border flex flex-col gap-2 shadow-sm bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
            {USER_ROLE_LABELS[displayRole]}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            <Store className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
            {displayStore}
          </span>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
            {greeting()},
          </p>
          <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--foreground)' }}>
            {displayName}
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-wider pt-0.5" style={{ color: 'var(--muted)', opacity: 0.8 }}>
            {todayLabel()}
          </p>
        </div>
      </div>

      {/* Card: Contagem de Hoje */}
      <div
        className="rounded-2xl p-5 border bg-white shadow-md border-t-[3px] space-y-5"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--brand)' }}
      >
        <div className="flex items-center justify-between border-b pb-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Contagem de Hoje
            </h3>
          </div>
          <StatusBadge variant="count" status={sessionStatus} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold text-gray-700">
              {activeSessionExist ? 'Progresso da contagem' : 'Status'}
            </span>
            <span className="text-[10px] font-semibold text-gray-500">
              {activeSessionExist 
                ? `${completedItems} de ${totalItems} itens contados` 
                : 'Base pronta'}
            </span>
          </div>
          
          {!activeSessionExist && (
            <div className="text-[10px] font-bold text-gray-700 mt-0.5">
              {totalItems} itens disponíveis para contagem
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1">
              <ProgressBar value={activeSessionExist ? progress : 0} />
            </div>
            <span className="text-sm font-black tracking-tight shrink-0" style={{ color: 'var(--brand)' }}>
              {activeSessionExist ? `${progress}%` : '0%'}
            </span>
          </div>

          <p className="text-[10px] font-bold text-gray-400 mt-1">
            {activeSessionExist 
              ? `${totalItems} itens ativos e prontos para a contagem`
              : 'Pronto para iniciar a contagem da loja'}
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard/counts')}
          className="w-full py-3 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:bg-opacity-95 active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <ClipboardList className="w-4 h-4" />
          {activeSessionExist ? 'Continuar Contagem' : 'Iniciar Contagem'}
        </button>
      </div>

      {/* Áreas da Loja */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 pl-1">
          Áreas da loja
        </h3>

        {visibleAreas.length === 0 ? (
          <div
            className="rounded-2xl p-6 border text-center space-y-1 bg-white shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
              Nenhuma área cadastrada
            </p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              As áreas serão carregadas via Supabase.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {visibleAreas.map((area: any) => {
              const AreaIcon = getAreaIcon(area.slug || area.id)
              
              const areaTotal = activeSessionExist 
                ? area.itemCount 
                : (isLive ? area.itemCount : (DEMO_AREA_COUNTS[area.id] ?? area.itemCount))

              const subtitle = activeSessionExist
                ? `${area.completedCount} de ${areaTotal} contados`
                : `${areaTotal} itens disponíveis`

              const status = activeSessionExist 
                ? area.status 
                : 'pending'

              return (
                <div
                  key={area.id}
                  className="rounded-xl p-3 border flex items-center justify-between bg-white shadow-sm transition-all duration-150 hover:border-gray-300 active:scale-[0.99] cursor-pointer"
                  onClick={() => router.push('/dashboard/counts')}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100 shrink-0">
                      <AreaIcon className="w-4.5 h-4.5" style={{ color: 'var(--brand)' }} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">
                        {area.name}
                      </h4>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                        {subtitle}
                      </p>
                    </div>
                  </div>
                  <StatusBadge variant="area" status={status ?? 'pending'} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumo Geral */}
      <div
        className="rounded-2xl p-5 border bg-white shadow-sm space-y-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
          Resumo geral
        </h3>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Áreas de contagem', value: totalAreas, activeColor: 'var(--foreground)', bg: '#F7F6F3' },
            { label: 'Concluídas', value: completedAreasCount, activeColor: '#16A34A', bg: '#F0FDF4' },
            { label: 'Pendentes', value: totalAreas - completedAreasCount, activeColor: '#D97706', bg: '#FFFBEB' },
          ].map(({ label, value, activeColor, bg }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center border transition"
              style={{ backgroundColor: bg, borderColor: 'var(--border)' }}
            >
              <p className="text-xl font-black tracking-tight" style={{ color: activeColor }}>
                {value}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-1 text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-3.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wide text-[10px] text-gray-400">
              Conclusão geral
            </span>
            <span className="font-extrabold" style={{ color: 'var(--brand)' }}>
              {progress}%
            </span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      {/* Histórico Recente */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 pl-1">
          Histórico recente
        </h3>

        {isLive && recentSessions.length === 0 ? (
          <div
            className="rounded-2xl p-6 border text-center bg-white shadow-sm space-y-1"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-bold text-gray-800">
              Nenhuma contagem registrada ainda
            </p>
            <p className="text-[11px] text-gray-400">
              O histórico aparecerá após a primeira contagem finalizada.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(isLive ? recentSessions : MOCK_HISTORY).map((entry: any) => (
              <div
                key={entry.id}
                className="rounded-xl p-3 border flex items-center justify-between bg-white shadow-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {entry.date ?? new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                    {entry.operator ?? (entry.started_by ? 'Operador' : '—')}
                    {entry.status === 'completed' ? ' · Concluída' : ' · Em Andamento'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant="count" status={entry.status ?? 'not_started'} />
                  <button
                    onClick={() => router.push('/dashboard/counts')}
                    className="p-1 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Administrativo (Catálogo de Insumos) */}
      <div
        className="rounded-xl p-4 border bg-white shadow-sm border-l-2 space-y-3"
        style={{
          borderColor: 'var(--border)',
          borderLeftColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Catálogo de Insumos
            </h3>
          </div>
          <span className="text-[8px] font-extrabold uppercase tracking-widest bg-gray-50 border border-gray-100 text-gray-400 px-2 py-0.5 rounded">
            Ativo
          </span>
        </div>
        
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-gray-700">
            Catálogo ativo
          </h4>
          <p className="text-[11px] leading-relaxed text-gray-400">
            {totalItems} itens cadastrados para a contagem.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard/admin/items')}
          className="w-full py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'transparent' }}
        >
          Visualizar cadastro
        </button>
      </div>

    </div>
  )
}
