'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, LayoutGrid, ClipboardList, Settings } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [role, setRole] = useState<UserRole>('operator')

  useEffect(() => {
    async function checkSession() {
      if (!isSupabaseConfigured()) {
        // Modo local: liberar sem verificação de sessão.
        setReady(true)
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role) setRole(profile.role as UserRole)
      setReady(true)
    }

    checkSession()
  }, [router])

  const handleLogout = async () => {
    if (!isSupabaseConfigured()) {
      router.replace('/login')
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand)' }} />
      </div>
    )
  }

  const isAdmin = role === 'admin' || role === 'manager'

  const navItems = [
    { href: '/dashboard', label: 'Início', Icon: LayoutGrid },
    { href: '/dashboard/counts', label: 'Contagem', Icon: ClipboardList },
    ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin', Icon: Settings }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b px-5 py-3 flex items-center justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
            <img
              src="/brand/logo-mais-um-bar.png"
              alt="+1 Bar"
              className="h-10 w-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                if (sibling) sibling.style.display = 'block';
              }}
            />
            {/* Fallback sutil de logotipo se a imagem falhar */}
            <div className="hidden w-10 h-10 rounded-full bg-red-50 flex items-center justify-center font-black text-xs text-red-800 border border-red-100">
              +1B
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black uppercase tracking-tight" style={{ color: 'var(--brand)' }}>
                +1 BAR
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                Controle
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider -mt-0.5" style={{ color: 'var(--muted)' }}>
              Controle Operacional
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all active:scale-95 cursor-pointer"
          title="Sair"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-28">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 flex justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.015)]"
        style={{ borderColor: 'var(--border)' }}
      >
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex flex-col items-center py-3.5 px-4 gap-1 flex-1 transition-all duration-200 relative cursor-pointer"
            >
              {/* Active Tab Bar Indicator */}
              {active && (
                <div
                  className="absolute top-0 left-1/4 right-1/4 h-[3px] rounded-b-full transition-all duration-300"
                  style={{ backgroundColor: 'var(--brand)' }}
                />
              )}
              <Icon
                className="w-5 h-5 transition-transform duration-200"
                style={{
                  color: active ? 'var(--brand)' : 'var(--muted)',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-200"
                style={{
                  color: active ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: active ? '900' : '600',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
