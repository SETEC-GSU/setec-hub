"use client"
import { useId, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { buscarServicos, CATEGORIAS_CHAMADOS, encontrarServico, servicosDaOrigem, type OrigemChamado, type ServicoChamado } from "@/lib/chamados/catalogo"
const input = "min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-base text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
export default function SeletorServico({ origem, value, onChange, disabled = false }: { origem: OrigemChamado; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [busca, setBusca] = useState(""), [buscando, setBuscando] = useState(false), id = useId()
  const encontrados = useMemo(() => buscarServicos(busca, origem).filter(s => s.id !== "outra"), [busca, origem])
  const selecionado = encontrarServico(value, origem)
  const incluiSelecionado = selecionado && selecionado.id !== "outra" && !encontrados.some(s => s.id === value)
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="text-base font-bold text-white" htmlFor={id}>O que você precisa? <span className="text-blue-300">*</span></label>
      <button type="button" disabled={disabled} aria-expanded={buscando} aria-controls={`${id}-busca`} onClick={() => { setBuscando(v => !v); setBusca("") }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-300">{buscando ? <X size={16} aria-hidden="true"/> : <Search size={16} aria-hidden="true"/>}{buscando ? "Fechar busca" : "Buscar solicitação"}</button>
    </div>
    {buscando && <input id={`${id}-busca`} aria-label="Buscar tipo de solicitação" autoFocus className={input} value={busca} onChange={e => setBusca(e.target.value)} disabled={disabled} placeholder={origem === "escola" ? "Ex.: computador, internet, senha, PortalNet…" : "Ex.: Teams, VPN, toner, empréstimo…"} maxLength={160}/>}
    <select id={id} aria-label="O que você precisa?" className={input} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required>
      <option value="">Selecione o pedido</option>
      {incluiSelecionado && <optgroup label="Solicitação selecionada"><option value={selecionado.id}>{selecionado.label}</option></optgroup>}
      {CATEGORIAS_CHAMADOS.map(c => { const itens = encontrados.filter(s => s.categoria === c); return itens.length ? <optgroup key={c} label={c}>{itens.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup> : null })}
      <optgroup label="Não encontrou uma opção?"><option value="outra">Não encontrei minha solicitação</option></optgroup>
    </select>
    {busca.trim() && <p aria-live="polite" className="text-sm leading-relaxed text-slate-400">{encontrados.length ? `${encontrados.length} opções relacionadas.` : "Tente outra palavra ou use a última opção para descrever sua necessidade."}</p>}
    {value === "outra" && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-100"><p>Confira se uma destas opções atende seu pedido:</p><div className="mt-2 flex flex-wrap gap-2">{(busca.trim() ? encontrados : servicosDaOrigem(origem).filter(s => ["conta.senha", "internet.wifi", "equipamento.falha", "evento.emprestimo", "sistema.cadastro"].includes(s.id))).slice(0, 5).map(s => <button key={s.id} type="button" disabled={disabled} onClick={() => onChange(s.id)} className="min-h-11 rounded-lg border border-amber-300/20 px-3 py-2 text-left text-sm font-semibold hover:bg-amber-400/10">{s.label}</button>)}</div></div>}
    {selecionado && <p className="text-xs leading-relaxed text-slate-400">Classificação automática: <strong className="font-semibold text-slate-300">{selecionado.categoria}</strong></p>}
    {selecionado && selecionado.ajuda !== "Descreva o que precisa, o resultado esperado e os testes já realizados." && <p className="text-sm leading-relaxed text-slate-400">{selecionado.ajuda}</p>}
  </div>
}
export function CamposServico({ servico, respostas, alterar, disabled = false, titulo = "Detalhes do pedido" }: { servico: ServicoChamado; respostas: Record<string, string>; alterar: (id: string, valor: string) => void; disabled?: boolean; titulo?: string }) {
  const prefixo = useId()
  return <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
    <legend className="mb-3 text-sm font-semibold text-slate-300">{titulo}</legend>
    {servico.campos.map(c => <div key={c.id} className={`min-w-0 ${c.tipo === "textarea" ? "sm:col-span-2" : ""}`}><label htmlFor={`${prefixo}-${c.id}`} className="mb-2 block text-sm font-medium text-slate-200">{c.label}{!c.opcional && <span className="text-blue-300"> *</span>}{c.opcional && <span className="font-normal text-slate-400"> (opcional)</span>}</label>
      {c.tipo === "select" ? <select id={`${prefixo}-${c.id}`} aria-label={c.label} className={input} required={!c.opcional} value={respostas[c.id] || ""} onChange={e => alterar(c.id, e.target.value)}><option value="">Selecione</option>{c.opcoes?.map(o => <option key={o}>{o}</option>)}</select>
        : c.tipo === "textarea" ? <textarea id={`${prefixo}-${c.id}`} aria-label={c.label} className={input} rows={3} required={!c.opcional} maxLength={2000} value={respostas[c.id] || ""} onChange={e => alterar(c.id, e.target.value)}/>
        : <input id={`${prefixo}-${c.id}`} aria-label={c.label} type={c.tipo === "date" ? "date" : c.tipo === "number" ? "number" : "text"} min={c.tipo === "number" ? 1 : undefined} max={c.tipo === "number" ? 10000 : undefined} className={input} required={!c.opcional} maxLength={2000} value={respostas[c.id] || ""} onChange={e => alterar(c.id, e.target.value)}/>}
      {c.dica && <p className="mt-2 text-xs leading-relaxed text-slate-400">{c.dica}</p>}</div>)}
  </fieldset>
}
