'use client'

import { useRouter } from 'next/navigation'
import { ClipboardList, Clock, CheckCircle2, AlertCircle, ChevronRight, Store } from 'lucide-react'
import { MOCK_CURRENT_USER, MOCK_TODAY_COUNT, MOCK_AREAS, MOCK_HISTORY } from '@/mocks/maisUmBar'
import { USER_ROLE_LABELS, AreaStatus } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'

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

const AREA_DOT: Record<AreaStatus, string> = {
  pending: 'bg-gray-300',
  in_progress: 'bg-amber-400',
  completed: 'bg-green-400',
}

export default function DashboardPage() {
  const router = useRouter()
  const user = MOCK_CURRENT_USER
  const today = MOCK_TODAY_COUNT
  const progress = Math.round((today.completedAreas / today.totalAreas) * 100)

  const countButtonLabel =
    today.status === 'not_started'
      ? 'Iniciar Contagem'
      : today.status === 'in_progress'
        ? 'Continuar Contagem'
        : 'Ver Contagem'

  return (
    <div className="space-y-5 py-5">

      {/* Header operacional */}
      <div
        className="rounded-2xl p-4 space-y-1 border"
        style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {greeting()},
        </p>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {user.name}
        </h1>
        <div className="flex items-center gap-3 pt-1">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}
          >
            {USER_ROLE_LABELS[user.role]}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <Store className="w-3 h-3" />
            {user.store}
          </span>
        </div>
        <p className="text-xs capitalize pt-1" style={{ color: 'var(--muted)' }}>
          {todayLabel()}
        </p>
      </div>

      {/* Card principal: Contagem de Hoje */}
      <div
        className="rounded-2xl p-4 border space-y-4"
        style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Contagem de Hoje
            </p>
          </div>
          <StatusBadge variant="count" status={today.status} />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {today.completedAreas} de {today.totalAreas} áreas concluídas
            </span>
            <span className="font-bold" style={{ color: 'var(--brand)' }}>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        {today.lastUpdate && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Última atualização: {today.lastUpdate}
          </p>
        )}

        <button
          onClick={() => router.push('/dashboard/counts')}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <ClipboardList className="w-4 h-4" />
          {countButtonLabel}
        </button>
      </div>

      {/* Áreas da loja */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
          Áreas da Loja
        </p>
        <div className="space-y-2">
          {MOCK_AREAS.map(area => (
            <div
              key={area.id}
              className="rounded-2xl p-3.5 border flex items-center justify-between"
              style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{area.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {area.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {area.itemCount} itens
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${AREA_DOT[area.status]}`} />
                <StatusBadge variant="area" status={area.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progresso da Contagem */}
      <div
        className="rounded-2xl p-4 border space-y-3"
        style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Progresso Geral
        </p>
        <div className="flex justify-between text-sm font-semibold">
          <span style={{ color: 'var(--foreground)' }}>
            {today.completedAreas} concluídas
          </span>
          <span style={{ color: 'var(--muted)' }}>
            {today.totalAreas - today.completedAreas} pendentes
          </span>
        </div>
        <ProgressBar value={progress} />
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: 'Total', value: today.totalAreas, icon: ClipboardList },
            { label: 'Concluídas', value: today.completedAreas, icon: CheckCircle2 },
            { label: 'Pendentes', value: today.totalAreas - today.completedAreas, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: 'var(--background)' }}
            >
              <p className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>{value}</p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico Recente */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest pl-1 mb-3" style={{ color: 'var(--muted)' }}>
          Histórico Recente
        </p>
        <div className="space-y-2">
          {MOCK_HISTORY.map(entry => (
            <div
              key={entry.id}
              className="rounded-2xl p-3.5 border flex items-center justify-between"
              style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {entry.date}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {entry.operator} · {entry.areasCompleted}/{entry.totalAreas} áreas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge variant="count" status={entry.status} />
                <button className="p-1 rounded-lg hover:bg-gray-50 transition">
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Administrativo */}
      <div
        className="rounded-2xl p-4 border space-y-3"
        style={{
          backgroundColor: 'white',
          borderColor: 'var(--border)',
          borderLeftWidth: 3,
          borderLeftColor: 'var(--brand)',
        }}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Itens da Contagem
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Aguardando lista de insumos
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Cadastre ou importe os itens que farão parte da contagem da loja.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/admin')}
          className="w-full py-3 rounded-xl border font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            borderColor: 'var(--brand)',
            color: 'var(--brand)',
            backgroundColor: 'var(--brand-light)',
          }}
        >
          Preparar Cadastro
        </button>
      </div>

    </div>
  )
}
