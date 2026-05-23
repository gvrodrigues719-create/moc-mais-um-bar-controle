'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)

    // Simulação de login (substituir por Supabase Auth)
    await new Promise(r => setTimeout(r, 800))

    if (email === 'demo@maisumbar.com' && password === 'demo') {
      toast.success('Bem-vindo ao MOC +1 Bar!')
      router.push('/dashboard')
    } else {
      setError('Credenciais inválidas. Use demo@maisumbar.com / demo para testar.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-sm space-y-8">

        {/* Identidade */}
        <div className="text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--brand)' }}>
            +1 Bar
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            MOC Controle
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Controle operacional de contagem
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none transition-all focus:ring-2 bg-white"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none transition-all focus:ring-2 bg-white"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 text-center px-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[11px]" style={{ color: 'var(--muted)' }}>
          Acesso restrito a operadores autorizados
        </p>
      </div>
    </div>
  )
}
