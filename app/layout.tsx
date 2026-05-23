import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'MOC +1 Bar Controle',
  description: 'Controle operacional de contagem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="antialiased min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{ duration: 3500, style: { fontWeight: 600 } }}
        />
      </body>
    </html>
  )
}
