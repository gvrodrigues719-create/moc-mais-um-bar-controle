'use client'

import { useRouter } from 'next/navigation'
import {
  ClipboardList, Clock, CheckCircle2, ChevronRight,
  Store, AlertCircle, Loader2, WifiOff,
} from 'lucide-react'
import { useStoreData } from '@/hooks/useStoreData'
import { USER_ROLE_LABELS, COUNT_STATUS_LABELS, type CountSession } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import { MOCK_CURRENT_USER, MOCK_TODAY_COUNT, MOCK_AREAS, MOCK_HISTORY } from '@/mocks/maisUmBar'

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

function sessionStatusLabel(s: CountSession) {
  return COUNT_STATUS_LABELS[s.status] ?? s.status
}

export default function DashboardPage() {
  const router = useRouter()
  const { loading, isConfigured, profile, store, areas, recentSessions, error } = useStoreData()

  if (loading) {
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
  const displayAreas = isLive ? areas : MOCK_AREAS
  const completedAreas = isLive
    ? 0 // sessão ativa ainda não implementada (Fase 3)
    : MOCK_TODAY_COUNT.completedAreas
  const totalAreas = displayAreas.length
  const progress = totalAreas > 0 ? Math.round((completedAreas / totalAreas) * 100) : 0

  return (
    <div className="space-y-5 py-5">

      {/* Banner: Supabase não configurado */}
      {!isConfigured && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-medium"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          Supabase não configurado — exibindo dados de demonstração.
        </div>
      )}

      {/* Banner: Supabase configurado mas sem profile */}
      {isConfigured && !profile && !loading && (
        <div
          className="rounded-xl px-4 py-3 space-y-1 text-xs font-medium"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          <p className="font-bold">Usuário sem perfil operacional.</p>
          <p>Usuário autenticado, mas sem perfil vinculado no banco. Configure o perfil em Supabase → tabela profiles.</p>
        </div>
      )}

      {/* Header operacional */}
      <div
        className="rounded-2xl p-4 space-y-1 border"
        style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {greeting()},
        </p>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {displayName}
        </h1>
        <div className="flex items-center gap-3 pt-1">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}
          >
            {USER_ROLE_LABELS[displayRole]}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <Store className="w-3 h-3" />
            {displayStore}
          </span>
        </div>
        <p className="text-xs capitalize pt-1" style={{ color: 'var(--muted)' }}>
          {todayLabel()}
        </p>
      </div>

      {/* Card: Contagem de Hoje */}
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
          <StatusBadge variant="count" status={isLive ? 'not_started' : MOCK_TODAY_COUNT.status} />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {completedAreas} de {totalAreas} áreas concluídas
            </span>
            <span className="font-bold" style={{ color: 'var(--brand)' }}>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <button
          onClick={() => router.push('/dashboard/counts')}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <ClipboardList className="w-4 h-4" />
          {isLive ? 'Iniciar Contagem' : 'Ver Contagem'}
        </button>
      </div>

      {/* Áreas da Loja */}
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
              As áreas serão cadastradas via Supabase após aplicar o seed inicial.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayAreas.map((area: any) => (
              <div
                key={area.id}
                className="rounded-2xl p-3.5 border flex items-center justify-between"
                style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  {area.icon && <span className="text-xl">{area.icon}</span>}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {area.name}
                    </p>
                    {area.itemCount !== undefined && (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {area.itemCount} itens
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

      {/* Progresso Geral */}
      <div
        className="rounded-2xl p-4 border space-y-3"
        style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Progresso Geral
        </p>
        <div className="flex justify-between text-sm font-semibold">
          <span style={{ color: 'var(--foreground)' }}>{completedAreas} concluídas</span>
          <span style={{ color: 'var(--muted)' }}>{totalAreas - completedAreas} pendentes</span>
        </div>
        <ProgressBar value={progress} />
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: 'Total', value: totalAreas, Icon: ClipboardList },
            { label: 'Concluídas', value: completedAreas, Icon: CheckCircle2 },
            { label: 'Pendentes', value: totalAreas - completedAreas, Icon: Clock },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--background)' }}>
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

        {isLive && recentSessions.length === 0 ? (
          <div
            className="rounded-2xl p-5 border text-center space-y-1"
            style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Nenhuma sessão registrada
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              O histórico aparecerá aqui após a primeira contagem.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(isLive ? recentSessions : MOCK_HISTORY).map((entry: any) => (
              <div
                key={entry.id}
                className="rounded-2xl p-3.5 border flex items-center justify-between"
                style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {entry.date ?? new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {entry.operator ?? '—'}
                    {entry.areasCompleted !== undefined && ` · ${entry.areasCompleted}/${entry.totalAreas} áreas`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant="count" status={entry.status ?? 'not_started'} />
                  <button className="p-1 rounded-lg hover:bg-gray-50 transition">
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
          style={{ borderColor: 'var(--brand)', color: 'var(--brand)', backgroundColor: 'var(--brand-light)' }}
        >
          Preparar Cadastro
        </button>
      </div>

    </div>
  )
}
