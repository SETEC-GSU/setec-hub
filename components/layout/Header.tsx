"use client"

import NotificacaoChamados from "@/components/NotificacaoChamados"

export default function Header() {
  return (
    <header className="w-full h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 bg-[#020617]">

      {/* ESQUERDA */}
      <div className="flex items-center gap-3">

        {/* BOTÃO MENU MOBILE */}
        <button className="lg:hidden text-white text-2xl">
          ☰
        </button>

        <div>
          <h1 className="text-white font-semibold hidden sm:block">
            Plataforma Operacional - SETEC GSU
          </h1>

          <h1 className="text-white font-semibold sm:hidden">
            SETEC GSU
          </h1>

          <p className="text-slate-400 text-sm hidden sm:block">
            Boa tarde, SETEC - URE Guarulhos Sul
          </p>
        </div>

      </div>

      {/* DIREITA */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* 🔔 BADGE NOTIFICAÇÃO */}
        <NotificacaoChamados />

        {/* PERFIL */}
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
          Administrador
        </span>

        {/* BOTÃO SAIR */}
        <button className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
          Sair
        </button>

      </div>
    </header>
  )
}