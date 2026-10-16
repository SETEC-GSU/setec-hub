"use client"
import { useId, useMemo, useState } from "react"
import { buscarServicos, CATEGORIAS_CHAMADOS, encontrarServico, servicosDaOrigem, type OrigemChamado, type ServicoChamado } from "@/lib/chamados/catalogo"
const input = "min-h-11 w-full min-w-0 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
export default function SeletorServico({ origem, value, onChange, disabled = false }: { origem: OrigemChamado; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [busca, setBusca] = useState(""); const id = useId()
  const encontrados = useMemo(() => buscarServicos(busca, origem).filter(s => s.id !== "outra"), [busca, origem])
  const selecionado = encontrarServico(value, origem)
  const incluiSelecionado = selecionado && selecionado.id !== "outra" && !encontrados.some(s => s.id === value)
  return <div className="min-w-0 space-y-3">
    <label className="block text-xs font-bold text-slate-300" htmlFor={id + "-busca"}>Encontre sua solicitação</label>
    <input id={id + "-busca"} aria-label="Buscar tipo de solicitação" className={input} value={busca} onChange={e => setBusca(e.target.value)} disabled={disabled} placeholder="Ex.: emprestar notebook, senha, bateria, Wi-Fi…" maxLength={160}/>
    <label className="block text-xs font-bold text-slate-300" htmlFor={id}>O que você precisa? <span className="text-blue-300">*</span></label>
    <select id={id} aria-label="O que você precisa?" className={input} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required>
      <option value="">Selecione uma solicitação</option>
      {incluiSelecionado && <optgroup label="Solicitação selecionada"><option value={selecionado.id}>{selecionado.label}</option></optgroup>}
      {CATEGORIAS_CHAMADOS.map(c => { const itens = encontrados.filter(s => s.categoria === c); return itens.length ? <optgroup key={c} label={c}>{itens.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup> : null })}
      <optgroup label="Não encontrou uma opção?"><option value="outra">Não encontrei minha solicitação</option></optgroup>
    </select>
    {busca.trim() && <p aria-live="polite" className="text-xs leading-relaxed text-slate-400">{encontrados.length ? `${encontrados.length} opção(ões) relacionada(s).` : "Nenhuma opção encontrada. Tente outra palavra ou descreva sua necessidade na última opção."}</p>}
    {value === "outra" && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100"><b>Confira antes de continuar:</b><div className="mt-2 flex flex-wrap gap-2">{(busca.trim() ? encontrados : servicosDaOrigem(origem).filter(s => ["conta.senha", "internet.wifi", "equipamento.falha", "evento.emprestimo", "sistema.cadastro"].includes(s.id))).slice(0, 5).map(s => <button key={s.id} type="button" disabled={disabled} onClick={() => onChange(s.id)} className="min-h-10 rounded-lg border border-amber-300/20 px-3 py-2 text-left text-xs font-bold hover:bg-amber-400/10">{s.label}</button>)}</div><p className="mt-2">Se nenhuma opção representar sua demanda, prossiga e explique o assunto e o que faltou no catálogo.</p></div>}
    {selecionado && <p className="text-xs leading-relaxed text-slate-400">Categoria: <strong className="text-slate-200">{selecionado.categoria}</strong> · Assunto: {selecionado.label}</p>}
  </div>
}
export function CamposServico({ servico, respostas, alterar, disabled = false }: { servico: ServicoChamado; respostas: Record<string, string>; alterar: (id: string, valor: string) => void; disabled?: boolean }) {
  const prefixo = useId()
  return <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:grid-cols-2">
    <legend className="px-2 text-xs font-black text-blue-300">Informações para o atendimento</legend>
    {servico.campos.map(c => <div key={c.id} className="min-w-0"><label htmlFor={`${prefixo}-${c.id}`} className="mb-2 block text-xs font-bold text-slate-300">{c.label}{!c.opcional && <span className="text-blue-300"> *</span>}</label>
      {c.tipo === "select" ? <select id={`${prefixo}-${c.id}`} aria-label={c.label} className={input} required={!c.opcional} value={respostas[c.id] || ""} onChange={e => alterar(c.id, e.target.value)}><option value="">Selecione</option>{c.opcoes?.map(o => <option key={o}>{o}</option>)}</select> : <input id={`${prefixo}-${c.id}`} aria-label={c.label} type={c.tipo === "date" ? "date" : c.tipo === "number" ? "number" : "text"} min={c.tipo === "number" ? 1 : undefined} max={c.tipo === "number" ? 10000 : undefined} className={input} required={!c.opcional} maxLength={2000} value={respostas[c.id] || ""} onChange={e => alterar(c.id, e.target.value)}/>}
      {c.dica && <p className="mt-2 text-xs leading-relaxed text-slate-500">{c.dica}</p>}</div>)}
  </fieldset>
}
