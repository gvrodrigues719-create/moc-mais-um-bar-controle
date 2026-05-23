'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import StatusBadge from '@/components/ui/StatusBadge'
import { MOCK_AREAS } from '@/mocks/maisUmBar'

export default function CountsPage() {
  const router = useRouter()
  const { loading, isConfigured, profile, areas } = useStoreData()

  const isLive = isConfigured && profile !== null
  const displayAreas = isLive ? areas : MOCK_AREAS

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
            Módulo de Contagem
          </p>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Contagem da Loja
          </h1>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      )}

      {!loading && (
        <>
          {/* Aviso de fase */}
          <div
            className="rounded-2xl p-6 border-2 border-dashed bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-center space-y-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
              <ClipboardList className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                Fluxo de contagem em preparação
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                O formulário de entrada de quantidades será implementado na Fase 3,
                após o cadastro completo dos itens e insumos da loja.
              </p>
            </div>
          </div>

          {/* Áreas */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
              Áreas da Loja
            </p>

            {displayAreas.length === 0 ? (
              <div
                className="rounded-2xl p-6 border text-center space-y-1"
                style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Nenhuma área cadastrada
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Execute o seed no Supabase para criar as áreas padrão do +1 Bar.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {displayAreas.map((area: any) => (
                  <div
                    key={area.id}
                    className="rounded-xl p-3 border flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-200 hover:border-gray-300"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-3">
                      {area.icon && (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-gray-50 border border-gray-100 shrink-0">
                          {area.icon}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                          {area.name}
                        </p>
                        {area.itemCount !== undefined && (
                          <p className="text-[10px] font-medium animate-pulse" style={{ color: 'var(--muted)' }}>
                            {area.itemCount} itens para contar
                          </p>
                        )}
                        {isLive && (
                          <p className="text-[9px] font-semibold text-amber-600" style={{ opacity: 0.85 }}>
                            Itens serão carregados na Fase 3
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge variant="area" status={area.status ?? 'pending'} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos passos */}
          <div
            className="rounded-2xl p-4 border space-y-2"
            style={{ backgroundColor: 'var(--brand-light)', borderColor: '#E8C4C6' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
              Próximos Passos — Fase 3
            </p>
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--brand)' }}>
              {[
                '1. Cadastrar ou importar lista de itens por área',
                '2. Vincular itens às áreas corretas',
                '3. Ativar formulário de entrada de quantidades',
                '4. Habilitar sessão de contagem por área',
              ].map(step => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
