import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

/* 🔧 IMPORTS NOVOS */
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SETEC Hub',
  description: 'Plataforma Operacional SETEC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="pt-BR"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">

        <ThemeProvider>

          {/* 🔧 LAYOUT PRINCIPAL */}
          <div className="flex min-h-screen">

            {/* SIDEBAR */}
            <Sidebar />

            {/* CONTEÚDO */}
            <div className="flex flex-col flex-1">

              <Header />

              <main className="p-6">
                {children}
              </main>

            </div>

          </div>

        </ThemeProvider>

      </body>
    </html>
  )
}