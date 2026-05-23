'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Package, Users, ClipboardList, ChevronRight } from 'lucide-react'
import { MOCK_AREAS, MOCK_ITEMS } from '@/mocks/maisUmBar'
import { ITEM_TYPE_CONFIG } from '@/lib/types'

const ADMIN_BLOCKS = [
  {
    id: 'areas',
    icon: MapPin,
    title: 'Áreas da Loja',
    description: 'Gerencie as áreas físicas onde os itens são contados.',
    count: MOCK_AREAS.length,
    countLabel: 'áreas cadastradas',
    status: 'active',
  },
  {
    id: 'items',
    icon: Package,
    title: 'Itens da Contagem',
    description: 'Cadastre os insumos, produtos e descartáveis que entram na contagem.',
    count: MOCK_ITEMS.length,
    countLabel: 'itens (mock)',
    status: 'mock',
  },
  {
    id: 'users',
    icon: Users,
    title: 'Usuários',
    description: 'Gerencie os operadores e gerentes com acesso ao sistema.',
    count: 3,
    countLabel: 'usuários ativos',
    status: 'pending',
  },
  {
    id: 'sessions',
    icon: ClipboardList,
    title: 'Sessões de Contagem',
    description: 'Visualize e gerencie sessões abertas e histórico de contagens.',
    count: 0,
    countLabel: 'sessões ativas',
    status: 'pending',
  },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-green-50 text-green-700' },
  mock: { label: 'Mock', className: 'bg-amber-50 text-amber-700' },
  pending: { label: 'Em breve', className: 'bg-gray-100 text-gray-500' },
}

export default function AdminPage() {
  const router = useRouter()

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
      <div className="space-y-3">
        {ADMIN_BLOCKS.map(block => {
          const Icon = block.icon
          const badge = STATUS_BADGE[block.status]
          return (
            <div
              key={block.id}
              className="rounded-2xl p-4 border flex items-center justify-between"
              style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{ backgroundColor: 'var(--brand-light)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                      {block.title}
                    </p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {block.description}
                  </p>
                  <p className="text-xs font-semibold mt-1.5" style={{ color: 'var(--brand)' }}>
                    {block.count} {block.countLabel}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--muted)' }} />
            </div>
          )
        })}
      </div>

      {/* Seção: tipos de item */}
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
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                style={{ backgroundColor: cfg.color }}
              />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                  {cfg.label}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {cfg.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção: itens mock */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
          Itens de Exemplo (Mock)
        </p>
        <div className="space-y-1.5">
          {MOCK_ITEMS.slice(0, 8).map(item => {
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {item.name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {typeCfg.label} · {item.unit}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <p className="text-xs text-center pt-1" style={{ color: 'var(--muted)' }}>
            + {MOCK_ITEMS.length - 8} itens no mock total
          </p>
        </div>
      </div>

    </div>
  )
}
