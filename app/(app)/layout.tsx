import type { ReactNode } from "react"
import Sidebar from "@/components/layout/Sidebar"
import LogoutButton from "@/components/LogoutButton"
import RoleBadge from "@/components/RoleBadge"
import Greeting from "@/components/Greeting"
import NotificacaoChamados from "@/components/NotificacaoChamados"
import MensagensChamados from "@/components/MensagensChamados"

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen bg-[#0B1120] text-white">

      {/* SIDEBAR */}
      <Sidebar />

      {/* AREA DIREITA */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <header className="h-24 bg-[#020617] border-b border-slate-800 flex items-center justify-between px-10">

          {/* ESQUERDA */}
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight">
              Plataforma Operacional - SETEC GSU
            </h1>

            <Greeting />
          </div>

          {/* DIREITA */}
          <div className="flex items-center gap-4">

            <NotificacaoChamados />

            <MensagensChamados />

            <RoleBadge />

            <LogoutButton />

          </div>

        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-auto p-10 bg-[#0B1120]">
          {children}
        </main>

      </div>
    </div>
  )
}