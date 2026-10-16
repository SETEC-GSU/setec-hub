"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase"
import { classificacaoChamado, origemCatalogo, type ChamadoClassificavel } from "@/lib/chamados/catalogo"
import SeletorServico from "./SeletorServico"
type Historico = { id: string; antes: ChamadoClassificavel; depois: ChamadoClassificavel; motivo: string; usuario_nome: string; registrado_em: string }
export default function ClassificacaoChamado({ chamado, role, aoSalvar }: { chamado: ChamadoClassificavel & { id: string }; role: string; aoSalvar: () => Promise<void> | void }) {
  const supabase = useMemo(() => createClient(), []), montado = useRef(true), travado = useRef(false)
  const [aberto, setAberto] = useState(false), [servico, setServico] = useState(""), [motivo, setMotivo] = useState("")
  const [salvando, setSalvando] = useState(false), [erro, setErro] = useState(""), [historico, setHistorico] = useState<Historico[] | null>(null)
  const [lendo, setLendo] = useState(false)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  const c = classificacaoChamado(chamado), origem = origemCatalogo(chamado)
  const permitido = ["admin", "seintec", "analista"].includes(role.trim().toLowerCase()) && Boolean(origem)
  async function lerHistorico() {
    setLendo(true); setErro("")
    try {
      const { data, error } = await supabase.from("hub_chamados_classificacao_historico").select("id,antes,depois,motivo,usuario_nome,registrado_em").eq("chamado_id", chamado.id).order("registrado_em", { ascending: false }).limit(20)
      if (error) throw error
      if (montado.current) setHistorico((data || []) as Historico[])
    } catch { if (montado.current) setErro("Não foi possível consultar o histórico. Confira se o SQL 006 foi aplicado.") }
    finally { if (montado.current) setLendo(false) }
  }
  async function salvar() {
    if (!permitido || travado.current) return
    if (!servico || motivo.trim().length < 10) { setErro("Escolha uma solicitação e informe um motivo com pelo menos 10 caracteres."); return }
    travado.current = true; setSalvando(true); setErro("")
    try {
      const { error } = await supabase.rpc("hub_chamados_reclassificar", { p_id: chamado.id, p_servico: servico, p_motivo: motivo.trim(),
        p_esperado: { servico_id: chamado.servico_id ?? null, categoria: chamado.categoria ?? null, subcategoria: chamado.subcategoria ?? null, origem: chamado.origem ?? null } })
      if (error) throw new Error(error.code === "40001" ? "A classificação mudou em outra sessão. Atualize o chamado antes de tentar novamente." : error.message)
      await aoSalvar()
      if (montado.current) { setAberto(false); setMotivo(""); setHistorico(null) }
    } catch (e) { if (montado.current) setErro(e instanceof Error ? e.message : "Não foi possível reclassificar.") }
    finally { travado.current = false; if (montado.current) setSalvando(false) }
  }
  return <section aria-label="Classificação do chamado" className="mt-5 min-w-0 rounded-2xl border border-blue-500/20 bg-slate-950/50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Classificação</p><p className="mt-2 break-words text-sm font-black text-white">{c.categoria}</p><p className="mt-1 break-words text-xs text-slate-400">{c.assunto}</p>{c.legado && <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">Registro anterior ao catálogo. Categoria original: {chamado.categoria || "Não informada"}{chamado.subcategoria ? ` · complemento original: ${chamado.subcategoria}` : ""}.</p>}</div>
      {permitido && <button type="button" onClick={() => { setAberto(!aberto); setServico(c.servico?.id || ""); setErro("") }} disabled={salvando} className="min-h-11 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-200">{aberto ? "Fechar classificação" : "Ajustar classificação"}</button>}</div>
    {permitido && aberto && origem && <div className="mt-5 space-y-4 border-t border-slate-800 pt-4">
      <SeletorServico origem={origem} value={servico} onChange={setServico} disabled={salvando}/>
      <label className="block text-xs font-bold text-slate-300">Motivo da alteração<textarea aria-label="Motivo da reclassificação" value={motivo} onChange={e => setMotivo(e.target.value)} disabled={salvando} maxLength={1000} rows={3} className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"/></label>
      <p className="text-xs leading-relaxed text-slate-500">A alteração registra o antes/depois e o responsável. O pedido original, o status e o prazo registrado permanecem como estão.</p>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void salvar()} disabled={salvando || !servico || servico === chamado.servico_id} className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40">{salvando ? "Salvando…" : "Salvar classificação"}</button><button type="button" onClick={() => void lerHistorico()} disabled={lendo || salvando} className="min-h-11 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-300">{lendo ? "Consultando…" : "Ver histórico de classificação"}</button></div>
      {historico && <div className="space-y-3"><p className="text-xs text-slate-500">Últimas 20 alterações registradas.</p>{historico.length ? historico.map(h => <article key={h.id} className="rounded-xl border border-slate-800 p-3 text-xs leading-relaxed text-slate-400"><p className="font-bold text-slate-200">{h.usuario_nome} · {new Date(h.registrado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p><p className="mt-2 break-words">Antes: {h.antes.categoria} / {h.antes.subcategoria || "Sem subcategoria"}</p><p className="mt-1 break-words">Depois: {h.depois.categoria} / {h.depois.subcategoria}</p><p className="mt-2 whitespace-pre-wrap break-words">{h.motivo}</p></article>) : <p className="text-xs text-slate-400">Nenhuma reclassificação registrada.</p>}</div>}
    </div>}
    {erro && <p role="alert" className="mt-3 break-words text-sm text-red-300">{erro}</p>}
  </section>
}
