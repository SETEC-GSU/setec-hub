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
    <div className="flex h-screen bg-[#0B1120] text-white overflow-hidden relative">

      {/* O SEGREDO DO MENU MOBILE SEM DESTRUIR SEU SISTEMA: CHECKBOX CSS */}
      <input type="checkbox" id="mobile-menu" className="peer hidden" />

      {/* OVERLAY ESCURO (Aparece no celular quando o menu abre) */}
      <label 
        htmlFor="mobile-menu"
        className="fixed inset-0 bg-black/60 z-40 hidden peer-checked:block md:peer-checked:hidden cursor-pointer"
      ></label>

      {/* SIDEBAR COM TRANSIÇÃO (Fica escondida no cel, aparece no PC) */}
      <div className="fixed inset-y-0 left-0 z-50 transform -translate-x-full peer-checked:translate-x-0 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out">
        <Sidebar />
      </div>

      {/* AREA DIREITA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <header className="h-24 bg-[#020617] border-b border-slate-800 flex items-center justify-between px-4 md:px-10 shrink-0">

          {/* ESQUERDA */}
          <div className="flex items-center gap-3 md:gap-4">
            
            {/* BOTÃO HAMBURGER MOBILE (Aciona o checkbox) */}
            <label 
              htmlFor="mobile-menu"
              className="p-2 md:hidden bg-slate-800 rounded-lg text-slate-300 hover:text-white cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </label>

            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-semibold tracking-tight">
                Plataforma Operacional - SETEC GSU
              </h1>
              {/* Esconde a saudação no celular para não espremer os ícones */}
              <div className="hidden md:block">
                <Greeting />
              </div>
            </div>

          </div>

          {/* DIREITA (Seus ícones originais e intactos) */}
          <div className="flex items-center gap-2 md:gap-4">
            <NotificacaoChamados />
            <MensagensChamados />
            <RoleBadge />
            <LogoutButton />
          </div>

        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-auto p-4 md:p-10 bg-[#0B1120]">
          {children}
        </main>

      </div>
    </div>
  )
}