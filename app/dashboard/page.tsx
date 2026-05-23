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
        className="rounded-2xl p-4 border flex flex-col gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.015)] bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
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
          <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--foreground)' }}>
            {displayName}
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-wider pt-0.5" style={{ color: 'var(--muted)', opacity: 0.8 }}>
            {todayLabel()}
          </p>
        </div>
      </div>

      {/* Card: Contagem de Hoje */}
      <div
        className="rounded-2xl p-5 border-2 space-y-5 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
        style={{ borderColor: 'var(--brand)' }}
      >
        <div className="flex items-center justify-between border-b pb-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--foreground)' }}>
              Contagem de Hoje
            </p>
          </div>
          <StatusBadge variant="count" status={isLive ? 'not_started' : MOCK_TODAY_COUNT.status} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
              Progresso por áreas
            </span>
            <span className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>
              {completedAreas} de {totalAreas} áreas concluídas
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={progress} />
            </div>
            <span className="text-base font-black tracking-tight shrink-0" style={{ color: 'var(--brand)' }}>
              {progress}%
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard/counts')}
          className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:bg-opacity-95 active:scale-[0.98] shadow-[0_2px_6px_rgba(124,45,53,0.2)] flex items-center justify-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          <ClipboardList className="w-4 h-4" />
          {isLive ? 'Iniciar Contagem' : 'Visualizar Painel de Contagem'}
        </button>
      </div>

      {/* Áreas da Loja */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={{ color: 'var(--muted)' }}>
          Áreas da Loja
        </p>

        {displayAreas.length === 0 ? (
          <div
            className="rounded-2xl p-6 border text-center space-y-1 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
              Nenhuma área cadastrada
            </p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              As áreas serão cadastradas via Supabase após aplicar o seed inicial.
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
                      <p className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>
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
        className="rounded-2xl p-5 border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--muted)' }}>
          Visão Geral do Painel
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Áreas', value: totalAreas, activeColor: 'var(--foreground)', bg: '#F7F6F3' },
            { label: 'Concluídas', value: completedAreas, activeColor: '#16A34A', bg: '#F0FDF4' },
            { label: 'Pendentes', value: totalAreas - completedAreas, activeColor: '#D97706', bg: '#FFFBEB' },
          ].map(({ label, value, activeColor, bg }) => (
            <div
              key={label}
              className="rounded-xl p-3.5 text-center border transition-all duration-200"
              style={{ backgroundColor: bg, borderColor: 'var(--border)' }}
            >
              <p className="text-2xl font-black tracking-tight" style={{ color: activeColor }}>
                {value}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--muted)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-3.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wide text-[10px]" style={{ color: 'var(--muted)' }}>
              Taxa de Conclusão Geral
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
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] pl-1" style={{ color: 'var(--muted)' }}>
          Histórico Recente
        </p>

        {isLive && recentSessions.length === 0 ? (
          <div
            className="rounded-2xl p-6 border text-center bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] space-y-1"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
              Nenhuma contagem registrada ainda
            </p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              O histórico aparecerá após a primeira contagem finalizada.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(isLive ? recentSessions : MOCK_HISTORY).map((entry: any) => (
              <div
                key={entry.id}
                className="rounded-xl p-3 border flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                    {entry.date ?? new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>
                    {entry.operator ?? '—'}
                    {entry.areasCompleted !== undefined && ` · ${entry.areasCompleted}/${entry.totalAreas} áreas`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant="count" status={entry.status ?? 'not_started'} />
                  <button className="p-1 rounded-lg hover:bg-gray-50 transition cursor-pointer">
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
        className="rounded-2xl p-5 border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-4 border-l-4"
        style={{
          borderColor: 'var(--border)',
          borderLeftColor: 'var(--brand)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5" style={{ color: 'var(--brand)' }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--muted)' }}>
              Etapa Administrativa
            </p>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded">
            Pendente
          </span>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
            Aguardando lista de insumos
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Cadastre ou importe os itens que farão parte da contagem da loja.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard/admin')}
          className="w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          style={{ borderColor: 'var(--brand)', color: 'var(--brand)', backgroundColor: 'transparent' }}
        >
          Preparar Cadastro
        </button>
      </div>

    </div>
  )
}
