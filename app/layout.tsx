import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "SETEC Hub",
    template: "%s | SETEC Hub",
  },
  description:
    "Plataforma operacional de tecnologia da URE Guarulhos Sul.",
  applicationName: "SETEC Hub",
  icons: {
    icon: [
      { url: "/brand/setec-hub-app-icon.svg?v=elo-20261111", type: "image/svg+xml", sizes: "any" },
      {
        url: "/favicon.ico?v=elo-20261111",
        type: "image/x-icon",
      },
      {
        url: "/icon.png?v=elo-20261111",
        type: "image/png",
        sizes: "512x512",
      },
      {
        url: "/brand/setec-hub-icon-192.png?v=elo-20261111",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: "/favicon.ico?v=elo-20261111",
    apple: [
      {
        url: "/apple-touch-icon.png?v=elo-20261111",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}