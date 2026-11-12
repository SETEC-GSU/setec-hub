"use client"

import { useId, useState } from "react"
import { ChevronDown, Pencil, UserRound } from "lucide-react"
import type { OrigemChamado } from "@/lib/chamados/catalogo"
import { identificacaoCompleta, type DadosPerfilChamado } from "@/lib/chamados/perfil"

const inputClass = "min-h-12 w-full min-w-0 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-base font-medium text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
const buttonClass = "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"

export function IdentificacaoSolicitante({
  origem, perfil, nome, unidade, alterarNome, alterarUnidade,
}: {
  origem: OrigemChamado
  perfil: DadosPerfilChamado
  nome: string
  unidade: string
  alterarNome: (nome: string) => void
  alterarUnidade: (unidade: string) => void
}) {
  const id = useId()
  const completo = identificacaoCompleta(nome, unidade, origem)
  const [editando, setEditando] = useState(!completo)
  const aberto = editando || !completo
  const unidadeLabel = origem === "ure" ? "Setor solicitante" : "Unidade escolar"
  const alterado = nome !== perfil.nome || unidade !== perfil.unidade

  return (
    <section aria-labelledby={`${id}-titulo`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/25 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300"/><h2 id={`${id}-titulo`} className="break-words text-sm font-semibold text-slate-200">{aberto ? "Dados do solicitante" : nome}</h2></div>
          {!aberto && <div id={`${id}-campos`} className="mt-1 space-y-1">
            <p className="break-words text-sm text-slate-300">{unidade}</p>
            {perfil.email && <p className="break-all text-xs text-slate-400">{perfil.email}</p>}
          </div>}
        </div>
        <button type="button" disabled={!completo} aria-label={aberto ? "Concluir edição" : "Editar dados"} title={aberto ? "Concluir edição" : "Editar dados"} aria-controls={`${id}-campos`} aria-expanded={aberto} onClick={() => setEditando(!aberto)} className={buttonClass}>
          {aberto ? <ChevronDown aria-hidden="true" className="h-4 w-4"/> : <Pencil aria-hidden="true" className="h-4 w-4"/>}
          <span className={aberto ? "" : "hidden sm:inline"}>{aberto ? "Concluir" : "Editar dados"}</span>
        </button>
      </div>
      {aberto && <div id={`${id}-campos`} className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        <label className="block min-w-0 text-sm font-semibold text-slate-300">Nome do solicitante <span className="text-cyan-300">*</span>
          <input aria-label="Nome do solicitante" autoComplete="name" required maxLength={120} value={nome} onChange={event => alterarNome(event.target.value)} placeholder="Nome completo" className={`mt-2 ${inputClass}`}/>
        </label>
        <label className="block min-w-0 text-sm font-semibold text-slate-300">{unidadeLabel} <span className="text-cyan-300">*</span>
          <input aria-label={unidadeLabel} autoComplete="off" required maxLength={160} value={unidade} onChange={event => alterarUnidade(event.target.value)} placeholder={origem === "ure" ? "Ex.: SETEC, SEAFIN, Gabinete…" : "Nome da unidade escolar"} className={`mt-2 ${inputClass}`}/>
        </label>
      </div>}
      {(!completo || alterado || !perfil.disponivel) && <p className="mt-2 text-xs leading-relaxed text-slate-400">{!completo ? "Complete os dados do solicitante para continuar." : "Ajuste válido apenas para este chamado."}</p>}
    </section>
  )
}

export function TituloSugerido({ titulo, sugestao, alterar }: {
  titulo: string
  sugestao: string
  alterar: (titulo: string) => void
}) {
  const id = useId()
  const [editando, setEditando] = useState(false)
  const aberto = editando || (Boolean(sugestao) && titulo.trim().length < 4)
  if (!sugestao && !titulo) return null

  return (
    <section className="min-w-0">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="w-full min-w-0 sm:flex-1">
          <p className="text-xs font-semibold text-blue-300">Título do chamado</p>
          {!aberto && <p className="mt-0.5 break-words text-sm font-semibold text-white">{titulo}</p>}
        </div>
        <button type="button" aria-controls={id} aria-expanded={aberto} onClick={() => setEditando(!aberto)} className={buttonClass}>
          <Pencil aria-hidden="true" className="h-4 w-4" />{aberto ? "Concluir edição do título" : "Personalizar título"}
        </button>
      </div>
      {aberto && <div id={id} className="mt-3">
        <label className="text-sm font-semibold text-slate-300">Título personalizado
          <input aria-label="Título do chamado" className={`mt-2 ${inputClass}`} value={titulo} onChange={event => alterar(event.target.value)} maxLength={120} minLength={4} required />
        </label>
        {sugestao && titulo !== sugestao && <button type="button" onClick={() => alterar(sugestao)} className="mt-2 min-h-11 text-sm font-semibold text-blue-300 underline underline-offset-4">Usar título sugerido</button>}
      </div>}
    </section>
  )
}
