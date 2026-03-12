import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SETEC Hub',
  description: 'Plataforma Operacional SETEC',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
      <body className="font-sans antialiased min-h-screen overflow-x-hidden">

        {/* Container global responsivo */}
        <div className="min-h-screen flex flex-col">

          <ThemeProvider>

            {/* área principal responsiva */}
            <main className="
              flex-1
              w-full
              max-w-[1800px]
              mx-auto
              px-4
              sm:px-6
              lg:px-8
            ">
              {children}
            </main>

          </ThemeProvider>

        </div>

      </body>
    </html>
  )
}