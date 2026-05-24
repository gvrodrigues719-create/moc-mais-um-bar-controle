'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Package, Users, ClipboardList, ChevronRight, Loader2 } from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { ITEM_TYPE_CONFIG, type ItemType } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { MOCK_AREAS, MOCK_ITEMS } from '@/mocks/maisUmBar'

interface AdminStats {
  totalItems: number
  types: Record<string, number>
  totalSessions: number
  activeSessions: number
  completedSessions: number
  sampleItems: { id: string; name: string; unit: string; item_type: string }[]
  loading: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const { loading: storeLoading, isConfigured, profile, areas } = useStoreData()
  const isLive = isConfigured && profile !== null
  const areaCount = isLive ? areas.length : MOCK_AREAS.length

  const [stats, setStats] = useState<AdminStats>({
    totalItems: 0,
    types: {},
    totalSessions: 0,
    activeSessions: 0,
    completedSessions: 0,
    sampleItems: [],
    loading: true,
  })

  useEffect(() => {
    if (storeLoading) return

    if (isConfigured && (!profile || profile.role === 'operator')) {
      router.push('/dashboard')
      return
    }

    if (!isConfigured || !profile) {
      const timer = setTimeout(() => {
        setStats(prev => ({ ...prev, loading: false }))
      }, 0)
      return () => clearTimeout(timer)
    }

    const storeId = profile.store_id

    async function fetchAdminStats() {
      const supabase = createClient()
      try {
        // Fetch all active count items for this store
        const { data: items, error: itemsErr } = await supabase
          .from('count_items')
          .select('id, name, unit, item_type')
          .eq('store_id', storeId)
          .eq('active', true)

        // Fetch all count sessions for this store
        const { data: sessions, error: sessionsErr } = await supabase
          .from('count_sessions')
          .select('status')
          .eq('store_id', storeId)

        if (itemsErr || sessionsErr) {
          console.error('Erro ao buscar estatísticas do admin:', itemsErr || sessionsErr)
          setStats(prev => ({ ...prev, loading: false }))
          return
        }

        // Aggregate item types
        const typeCounts: Record<string, number> = {
          raw_material: 0,
          prepared_portioned: 0,
          beverage: 0,
          packaging: 0,
          cleaning_operational: 0,
          finished_product: 0,
        }
        
        items?.forEach(item => {
          if (item.item_type) {
            typeCounts[item.item_type] = (typeCounts[item.item_type] || 0) + 1
          }
        })

        // Aggregate sessions
        const total = sessions?.length || 0
        const active = sessions?.filter(s => s.status === 'in_progress').length || 0
        const completed = sessions?.filter(s => s.status === 'completed').length || 0

        // Get first 3 items as a real-time sample list
        const sample = (items || []).slice(0, 3)

        setStats({
          totalItems: items?.length || 0,
          types: typeCounts,
          totalSessions: total,
          activeSessions: active,
          completedSessions: completed,
          sampleItems: sample,
          loading: false,
        })
      } catch (err) {
        console.error('Erro inesperado ao buscar estatísticas do admin:', err)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchAdminStats()
  }, [storeLoading, isConfigured, profile, router])

  const ADMIN_BLOCKS = [
    {
      id: 'areas',
      icon: MapPin,
      title: 'Áreas da Loja',
      description: 'Gerencie as áreas físicas onde os itens são contados.',
      status: 'Ativo',
      statusStyle: 'bg-green-50 text-green-700 border-green-200',
      infoText: `${areaCount} áreas cadastradas no banco`,
      route: '/dashboard/admin/areas',
    },
    {
      id: 'items',
      icon: Package,
      title: 'Itens da Contagem',
      description: 'Itens reais de contagem da loja e distribuição física.',
      status: 'Ativo',
      statusStyle: 'bg-green-50 text-green-700 border-green-200',
      infoText: isLive 
        ? `${stats.totalItems} itens cadastrados` 
        : `${MOCK_ITEMS.length} itens (demonstração)`,
      route: '/dashboard/admin/items',
    },
    {
      id: 'users',
      icon: Users,
      title: 'Usuários',
      description: 'Gerencie os operadores e gerentes com acesso ao sistema.',
      status: 'Ativo',
      statusStyle: 'bg-green-50 text-green-700 border-green-200',
      infoText: isLive ? '1 usuário ativo' : 'Visualização de perfis',
      route: '/dashboard/admin/users',
    },
    {
      id: 'sessions',
      icon: ClipboardList,
      title: 'Sessões de Contagem',
      description: 'Visualize sessões de inventário e logs de auditoria.',
      status: 'Ativo',
      statusStyle: 'bg-green-50 text-green-700 border-green-200',
      infoText: isLive 
        ? `${stats.totalSessions} sessões (${stats.activeSessions} em andamento, ${stats.completedSessions} concluídas)`
        : 'Sessões de contagem ativas',
      route: '/dashboard/admin/sessions',
    },
  ]

  if (storeLoading) {
    return null
  }

  if (isConfigured && (!profile || profile.role === 'operator')) {
    return null
  }

  if (isLive && stats.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-xs font-semibold text-gray-500">Carregando dados reais do banco...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-xl border transition hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Painel Administrativo
          </p>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Configurações
          </h1>
        </div>
      </div>

      {/* Blocos de configuração */}
      <div className="space-y-2">
        {ADMIN_BLOCKS.map(block => {
          const Icon = block.icon
          return (
            <button
              key={block.id}
              onClick={() => router.push(block.route)}
              className="w-full rounded-xl p-3.5 border flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-200 hover:border-gray-300 active:scale-[0.99] cursor-pointer text-left"
              style={{
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg shrink-0 border border-gray-100 bg-gray-50">
                  <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
                      {block.title}
                    </p>
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${block.statusStyle}`}>
                      {block.status}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed text-gray-500">
                    {block.description}
                  </p>
                  <p className="text-[10px] font-extrabold mt-1.5" style={{ color: 'var(--brand)' }}>
                    {block.infoText}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--muted)' }} />
            </button>
          )
        })}
      </div>


      {/* Tipos de item */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3 text-gray-400">
          Tipos de Item & Distribuição
        </p>
        <div className="space-y-2">
          {Object.entries(ITEM_TYPE_CONFIG).map(([key, cfg]) => {
            const currentQty = isLive 
              ? (stats.types[key] || 0) 
              : (MOCK_ITEMS.filter(x => x.type === key).length || 0)
            if (currentQty === 0) return null
            return (
              <div
                key={key}
                className="rounded-2xl p-3.5 border flex items-center justify-between bg-white shadow-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: cfg.color }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{cfg.label}</p>
                    <p className="text-xs mt-0.5 leading-relaxed text-gray-500">{cfg.description}</p>
                  </div>
                </div>
                <span 
                  className="text-xs font-black px-2.5 py-1 rounded-lg border ml-3 shrink-0" 
                  style={{ 
                    backgroundColor: 'var(--brand-light)', 
                    color: 'var(--brand)',
                    borderColor: 'rgba(124,45,53,0.1)'
                  }}
                >
                  {currentQty} itens
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Itens reais de referência na base */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3 text-gray-400">
          Insumos Cadastrados (Amostra)
        </p>
        <div className="space-y-1.5">
          {(isLive ? stats.sampleItems : MOCK_ITEMS.slice(0, 3)).map(item => {
            const itemType = (isLive
              ? (item as { item_type?: string }).item_type
              : (item as { type?: string }).type) as ItemType
            const typeCfg = ITEM_TYPE_CONFIG[itemType] || { label: 'Outro', color: '#6B7280' }
            return (
              <div
                key={item.id}
                className="rounded-xl px-3.5 py-3 border flex items-center justify-between bg-white shadow-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeCfg.color }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                      {typeCfg.label} · {item.unit}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <button
            onClick={() => router.push('/dashboard/admin/items')}
            className="w-full text-center pt-2.5 font-bold text-xs uppercase tracking-wider hover:opacity-80 transition cursor-pointer"
            style={{ color: 'var(--brand)' }}
          >
            Ver todos os itens cadastrados
          </button>
        </div>
      </div>

    </div>
  )
}
