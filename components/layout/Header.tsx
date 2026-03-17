"use client"

import NotificacaoChamados from "@/components/NotificacaoChamados"
import MensagensChamados from "@/components/MensagensChamados"

export default function Header() {
  return (
    <header className="w-full h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-[#020617]">

      <div>
        <h1 className="text-white font-semibold">
          Plataforma Operacional - SETEC GSU
        </h1>

        <p className="text-slate-400 text-sm">
          Boa tarde, SETEC - URE Guarulhos Sul
        </p>
      </div>

      <div className="flex items-center gap-4">

        <NotificacaoChamados />

        <MensagensChamados />

        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
          Administrador
        </span>

        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
          Sair
        </button>

      </div>

    </header>
  )
}