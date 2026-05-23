'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardList, Clock } from 'lucide-react'
import { MOCK_AREAS } from '@/mocks/maisUmBar'
import StatusBadge from '@/components/ui/StatusBadge'

export default function CountsPage() {
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
            Módulo de Contagem
          </p>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Contagem da Loja
          </h1>
        </div>
      </div>

      {/* Aviso de placeholder */}
      <div
        className="rounded-2xl p-5 border-2 border-dashed space-y-2 text-center"
        style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
      >
        <ClipboardList className="w-8 h-8 mx-auto" style={{ color: 'var(--brand)' }} />
        <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
          Fluxo de contagem em preparação
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          O formulário de entrada de quantidades será implementado após o cadastro
          completo dos itens e das áreas da loja.
        </p>
      </div>

      {/* Áreas com status */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
          Áreas da Loja
        </p>
        <div className="space-y-2">
          {MOCK_AREAS.map(area => (
            <div
              key={area.id}
              className="rounded-2xl p-4 border flex items-center justify-between"
              style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{area.icon}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                    {area.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {area.itemCount} itens para contar
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge variant="area" status={area.status} />
                {area.status === 'pending' && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                    <Clock className="w-3 h-3" />
                    Aguardando
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Próximos passos */}
      <div
        className="rounded-2xl p-4 border space-y-2"
        style={{ backgroundColor: 'var(--brand-light)', borderColor: '#E8C4C6' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
          Próximos Passos
        </p>
        <ul className="space-y-1.5 text-xs" style={{ color: 'var(--brand)' }}>
          {[
            '1. Cadastrar itens por área em Admin',
            '2. Configurar unidades de medida',
            '3. Definir operadores por área',
            '4. Ativar fluxo de contagem',
          ].map(step => (
            <li key={step} className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
