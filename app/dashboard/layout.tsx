'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, LayoutGrid, ClipboardList, Settings } from 'lucide-react'
import { MOCK_CURRENT_USER } from '@/mocks/maisUmBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // Simulação de guarda de rota (substituir por Supabase Auth)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    // Aqui entrará verificação real de sessão
    setChecked(true)
  }, [])

  if (!checked) return null

  const isAdmin = MOCK_CURRENT_USER.role === 'admin' || MOCK_CURRENT_USER.role === 'manager'

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
          onClick={() => router.push('/login')}
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
              className={`flex flex-col items-center py-3 px-4 gap-1 transition text-xs font-semibold flex-1 ${
                active ? '' : 'text-gray-400 hover:text-gray-600'
              }`}
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
