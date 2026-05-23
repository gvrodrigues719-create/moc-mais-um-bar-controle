'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Package, Users, ClipboardList, ChevronRight, Lock } from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { ITEM_TYPE_CONFIG } from '@/lib/types'
import { MOCK_AREAS, MOCK_ITEMS } from '@/mocks/maisUmBar'

const ADMIN_BLOCKS = [
  {
    id: 'areas',
    icon: MapPin,
    title: 'Áreas da Loja',
    description: 'Gerencie as áreas físicas onde os itens são contados.',
    phase: 2,
    phaseLabel: 'Fase 2',
    phaseStyle: 'bg-green-50 text-green-700',
  },
  {
    id: 'items',
    icon: Package,
    title: 'Itens da Contagem',
    description: 'Cadastre os insumos, produtos e descartáveis da loja.',
    phase: 3,
    phaseLabel: 'Fase 3',
    phaseStyle: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'users',
    icon: Users,
    title: 'Usuários',
    description: 'Gerencie os operadores e gerentes com acesso ao sistema.',
    phase: 2,
    phaseLabel: 'Fase 2',
    phaseStyle: 'bg-green-50 text-green-700',
  },
  {
    id: 'sessions',
    icon: ClipboardList,
    title: 'Sessões de Contagem',
    description: 'Visualize sessões abertas e histórico de contagens.',
    phase: 3,
    phaseLabel: 'Fase 3',
    phaseStyle: 'bg-amber-50 text-amber-700',
  },
]

export default function AdminPage() {
  const router = useRouter()
  const { isConfigured, profile, areas } = useStoreData()
  const isLive = isConfigured && profile !== null
  const areaCount = isLive ? areas.length : MOCK_AREAS.length

  return (
    <div className="space-y-5 py-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-xl border transition hover:bg-gray-50"
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
          const isPhase3 = block.phase === 3
          return (
            <div
              key={block.id}
              className={`rounded-xl p-3.5 border flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-200 ${!isPhase3 ? 'hover:border-gray-300' : ''}`}
              style={{
                borderColor: 'var(--border)',
                opacity: isPhase3 ? 0.7 : 1,
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
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${block.phaseStyle}`}>
                      {block.phaseLabel}
                    </span>
                    {isPhase3 && <Lock className="w-3 h-3 text-gray-400" />}
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {block.description}
                  </p>
                  {block.id === 'areas' && (
                    <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--brand)' }}>
                      {areaCount} áreas {isLive ? 'no banco' : '(mock)'}
                    </p>
                  )}
                  {isPhase3 && (
                    <p className="text-[10px] font-bold mt-1 text-amber-600">
                      Disponível após cadastro/importação de itens
                    </p>
                  )}
                </div>
              </div>
              {!isPhase3 && (
                <ChevronRight className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--muted)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Aviso Fase 3 */}
      <div
        className="rounded-2xl p-4 border space-y-2"
        style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Fase 3 — Cadastro de Itens
        </p>
        <p className="text-xs leading-relaxed text-amber-800">
          O cadastro e a importação da lista real de insumos e produtos será implementado
          na próxima fase. A estrutura do banco já está preparada para receber os itens.
        </p>
      </div>

      {/* Tipos de item */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
          Tipos de Item
        </p>
        <div className="space-y-2">
          {Object.entries(ITEM_TYPE_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              className="rounded-2xl p-3.5 border flex items-start gap-3"
              style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: cfg.color }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{cfg.label}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>{cfg.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itens mock como referência */}
      {!isLive && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
            Itens de Referência (Mock)
          </p>
          <div className="space-y-1.5">
            {MOCK_ITEMS.slice(0, 6).map(item => {
              const typeCfg = ITEM_TYPE_CONFIG[item.type]
              return (
                <div
                  key={item.id}
                  className="rounded-xl px-3.5 py-3 border flex items-center justify-between"
                  style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeCfg.color }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                        {typeCfg.label} · {item.unit}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-center pt-1" style={{ color: 'var(--muted)' }}>
              + {MOCK_ITEMS.length - 6} itens no mock · serão substituídos pelos reais na Fase 3
            </p>
          </div>
        </div>
      )}

      {isLive && (
        <div
          className="rounded-2xl p-5 border text-center space-y-1"
          style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Nenhum item cadastrado ainda
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            A lista de insumos será adicionada na Fase 3 via cadastro manual ou importação CSV.
          </p>
        </div>
      )}

    </div>
  )
}
