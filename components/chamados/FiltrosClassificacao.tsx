"use client"
import { useMemo } from "react"
import { classificacaoChamado, type ChamadoClassificavel } from "@/lib/chamados/catalogo"
export default function FiltrosClassificacao({ chamados, categoria, assunto, alterar }: { chamados: ChamadoClassificavel[]; categoria: string; assunto: string; alterar: (categoria: string, assunto: string) => void }) {
  const opcoes = useMemo(() => chamados.map(classificacaoChamado), [chamados])
  const categorias = [...new Set(opcoes.map(c => c.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const assuntos = [...new Set(opcoes.filter(c => !categoria || c.categoria === categoria).map(c => c.assunto))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const css = "min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none focus:border-blue-400"
  return <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"><label className="min-w-0 text-xs font-bold text-slate-400">Categoria<select aria-label="Filtrar categoria" className={css + " mt-2"} value={categoria} onChange={e => alterar(e.target.value, "")}><option value="">Todas as categorias</option>{categorias.map(c => <option key={c}>{c}</option>)}</select></label><label className="min-w-0 text-xs font-bold text-slate-400">Assunto<select aria-label="Filtrar assunto" className={css + " mt-2"} value={assunto} onChange={e => alterar(categoria, e.target.value)}><option value="">Todos os assuntos</option>{assuntos.map(a => <option key={a}>{a}</option>)}</select></label></div>
}
