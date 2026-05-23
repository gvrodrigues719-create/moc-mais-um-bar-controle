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
        className="sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between bg-white shadow-sm"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
            +1 Bar
          </p>
          <p className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            MOC Controle
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-28">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 flex justify-around"
        style={{ borderColor: 'var(--border)' }}
      >
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex flex-col items-center py-3 px-4 gap-1 text-xs font-semibold flex-1 transition ${!active ? 'text-gray-400 hover:text-gray-600' : ''}`}
              style={active ? { color: 'var(--brand)' } : {}}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
