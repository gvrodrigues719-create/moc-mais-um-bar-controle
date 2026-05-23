'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('error') === 'inactive') {
        setError('Acesso inativo. Fale com o administrador.')
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        // Modo local sem Supabase — aceitar qualquer credencial para desenvolvimento.
        await new Promise(r => setTimeout(r, 500))
        router.push('/dashboard')
        router.refresh()
        return
      }

      const supabase = createClient()
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authErr) {
        if (authErr.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha inválidos.')
        } else if (authErr.message.includes('Email not confirmed')) {
          setError('Confirme seu e-mail antes de acessar.')
        } else {
          setError(authErr.message)
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const configured = isSupabaseConfigured()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="w-full max-w-sm space-y-8">

        {/* Identidade */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative w-[150px] h-auto flex flex-col items-center justify-center">
            <img
              src="/brand/logo-mais-um-bar.png"
              alt="+1 Bar"
              className="w-full h-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                if (sibling) sibling.style.display = 'block';
              }}
            />
            <div className="hidden font-black text-3xl tracking-tight uppercase" style={{ color: 'var(--brand)' }}>
              +1 BAR
            </div>
          </div>
          
          <div className="space-y-0.5">
            <h1 className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: 'var(--foreground)' }}>
              Controle
            </h1>
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              Controle operacional de contagem
            </p>
          </div>
        </div>

        {/* Aviso de modo local */}
        {!configured && (
          <div
            className="rounded-xl px-4 py-3 text-xs font-medium text-center"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
          >
            Supabase não configurado — modo local ativo.
            <br />
            Qualquer credencial é aceita.
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--muted)' }}
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none bg-white"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--muted)' }}
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none bg-white"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
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
