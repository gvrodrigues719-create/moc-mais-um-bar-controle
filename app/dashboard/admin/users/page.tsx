'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Clock } from 'lucide-react'

export default function AdminUsersPage() {
  const router = useRouter()

  return (
    <div className="space-y-5 py-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/admin')}
          className="p-2 rounded-xl border bg-white cursor-pointer hover:bg-gray-50 transition"
          style={{ borderColor: 'var(--border)' }}
          aria-label="Voltar ao admin"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Admin / Usuários
          </p>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Usuários
          </h1>
        </div>
      </div>

      {/* Coming soon card */}
      <div
        className="rounded-2xl p-10 border bg-white text-center space-y-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: 'var(--brand-light, #FFF1F2)' }}
        >
          <Users className="w-7 h-7" style={{ color: 'var(--brand)' }} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-extrabold" style={{ color: 'var(--foreground)' }}>
            Gestão de Usuários
          </p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            Esta funcionalidade está em desenvolvimento.
            Aqui você poderá listar, editar e convidar operadores e gerentes para a loja.
          </p>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Fase 4 — Etapa 3</span>
        </div>
      </div>
    </div>
  )
}
