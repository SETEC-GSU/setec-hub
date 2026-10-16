"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dataBR, filtrosIniciais, intervaloPeriodo, rotuloPeriodo, validarFiltros } from "@/lib/fields-relatorios/periodos";
import type { FiltrosFields, Periodicidade, PreviaFields } from "@/lib/fields-relatorios/types";

type Opcoes = { tecnico?: string; escola?: string; categoria?: string };
const seletor = "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex='0']";
const numero = (n: number) => n.toLocaleString("pt-BR");
const classes = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30";

export default function ModalRelatorioGerencial({ registros, fechar, chavePersistencia = "" }: { registros: Opcoes[]; fechar: () => void; chavePersistencia?: string }) {
  const [filtros, setFiltros] = useState(() => {
    if (chavePersistencia) {
      try {
        const salvo = sessionStorage.getItem(`${chavePersistencia}:filtros`);
        if (salvo) return validarFiltros(JSON.parse(salvo));
      } catch {}
    }
    return filtrosIniciais();
  });
  const [previa, setPrevia] = useState<PreviaFields | null>(null);
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState<"livre" | "previa" | "pdf">("livre");
  const [parte, setParte] = useState(1);
  const [aviso, setAviso] = useState("");
  const caixa = useRef<HTMLDivElement>(null), leitura = useRef<AbortController | null>(null);
  const vivo = useRef(true), travado = useRef(false);
  const fecharRef = useRef(fechar); fecharRef.current = fechar;
  useEffect(() => {
    if (!chavePersistencia) return;
    try { sessionStorage.setItem(`${chavePersistencia}:filtros`, JSON.stringify(filtros)); } catch {}
  }, [chavePersistencia, filtros]);
  const opcoes = useMemo(() => {
    const listar = (campo: keyof Opcoes) => [...new Set(registros.map(r => r[campo]?.trim()).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { tecnico: listar("tecnico"), escola: listar("escola"), categoria: listar("categoria") };
  }, [registros]);
  const alterar = useCallback((valores: Partial<FiltrosFields>) => {
    leitura.current?.abort(); setFiltros(f => ({ ...f, ...valores })); setPrevia(null); setParte(1); setErro(""); setAviso("");
  }, []);
  function periodo(tipo: Periodicidade, ano = filtros.ano, indice = 1) {
    if (tipo === "personalizado") { alterar({ periodicidade: tipo }); return; }
    alterar({ periodicidade: tipo, ano, indice, ...intervaloPeriodo(tipo, ano, indice) });
  }
  useEffect(() => {
    vivo.current = true;
    const anterior = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; caixa.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); fecharRef.current(); }
      if (e.key !== "Tab" || !caixa.current) return;
      const elementos = [...caixa.current.querySelectorAll<HTMLElement>(seletor)].filter(e => e.getClientRects().length);
      const primeiro = elementos[0], ultimo = elementos.at(-1);
      if (!primeiro) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === caixa.current)) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener("keydown", teclado);
    return () => { vivo.current = false; leitura.current?.abort(); document.body.style.overflow = overflow; document.removeEventListener("keydown", teclado); anterior?.focus(); };
  }, []);

  async function solicitar(acao: "previa" | "pdf") {
    if (travado.current) return;
    let validos: FiltrosFields;
    try { validos = validarFiltros(filtros); } catch (e) { setErro(e instanceof Error ? e.message : "Confira os filtros."); return; }
    travado.current = true; setEstado(acao); setErro(""); setAviso("");
    leitura.current?.abort(); const controller = new AbortController(); leitura.current = controller;
    const timer = setTimeout(() => controller.abort(), acao === "pdf" ? 65000 : 30000);
    try {
      const res = await fetch("/api/fields/relatorios/gerencial", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, filtros: validos, assinatura: previa?.assinatura, parte }), signal: controller.signal, cache: "no-store" });
      if (!res.ok) {
        const r = await res.json().catch(() => null);
        if (res.status === 409 && vivo.current) setPrevia(null);
        throw new Error(r?.erro || "Não foi possível gerar o relatório. Confira a sessão e tente novamente.");
      }
      if (acao === "previa") {
        const dados = await res.json() as PreviaFields;
        if (vivo.current && !controller.signal.aborted) { setPrevia(dados); setParte(1); }
      } else {
        if (!res.headers.get("content-type")?.includes("application/pdf")) throw new Error("O servidor não retornou um PDF válido.");
        const blob = await res.blob();
        if (!vivo.current || controller.signal.aborted) return;
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "Relatorio_Fields.pdf";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
        setAviso(`PDF preparado${previa && previa.partes > 1 ? ` · parte ${parte} de ${previa.partes}` : ""}.`);
      }
    } catch (e) {
      if (vivo.current) setErro(controller.signal.aborted ? "A geração foi interrompida. Seus filtros foram mantidos; tente novamente ou selecione um período menor." : e instanceof Error ? e.message : "Falha ao gerar o documento.");
    } finally { clearTimeout(timer); travado.current = false; if (vivo.current) setEstado("livre"); }
  }
  const ocupado = estado !== "livre", a = previa?.analise;
  return createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 p-2 backdrop-blur-md sm:p-5">
    <div ref={caixa} role="dialog" aria-modal="true" aria-labelledby="fields-relatorio-titulo" tabIndex={-1} className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl outline-none">
      <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SETEC / SEINTEC · Gestão dos Fields</p>
          <h2 id="fields-relatorio-titulo" className="mt-2 text-xl font-black tracking-tight sm:text-3xl">Gerar relatório gerencial</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">Do panorama ao detalhe de cada chamado, com os dados atuais do Hub.</p></div>
          <button type="button" onClick={fechar} aria-label="Fechar relatório gerencial" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xl text-slate-300 hover:bg-slate-800">×</button></div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
        <fieldset disabled={ocupado} className="min-w-0 space-y-5 disabled:opacity-70">
          <legend className="sr-only">Configurar relatório</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([ ["estrategico", "Estratégico", "Indicadores, gráficos, pontos de atenção e direções sugeridas."], ["quantitativo", "Quantitativo", "Totais, distribuições e detalhes de pedidos e respostas por chamado."] ] as const).map(([tipo, titulo, texto]) =>
            <button key={tipo} type="button" aria-pressed={filtros.modalidade === tipo} onClick={() => alterar({ modalidade: tipo, detalhar: tipo === "quantitativo" })} className={`min-w-0 rounded-2xl border p-4 text-left transition ${filtros.modalidade === tipo ? "border-blue-400 bg-blue-500/15 ring-1 ring-blue-400/30" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`}>
              <span className="text-sm font-black text-white">{titulo}</span><span className="mt-2 block text-xs leading-relaxed text-slate-400">{texto}</span></button>)}</div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="min-w-0 text-xs font-bold text-slate-300">Período<select aria-label="Periodicidade do relatório" className={classes} value={filtros.periodicidade} onChange={e => periodo(e.target.value as Periodicidade)}>
              <option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="personalizado">Personalizado</option></select></label>
            {filtros.periodicidade !== "personalizado" ? <>
              <label className="min-w-0 text-xs font-bold text-slate-300">Ano<select aria-label="Ano do relatório" className={classes} value={filtros.ano} onChange={e => periodo(filtros.periodicidade, Number(e.target.value), filtros.indice)}>{Array.from({ length: 101 }, (_, i) => 2000 + i).map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></label>
              {filtros.periodicidade !== "anual" && <label className="min-w-0 text-xs font-bold text-slate-300">{filtros.periodicidade === "mensal" ? "Mês" : filtros.periodicidade === "trimestral" ? "Trimestre" : "Semestre"}<select aria-label="Índice do período" className={classes} value={filtros.indice} onChange={e => periodo(filtros.periodicidade, filtros.ano, Number(e.target.value))}>{Array.from({ length: filtros.periodicidade === "mensal" ? 12 : filtros.periodicidade === "trimestral" ? 4 : 2 }, (_, i) => <option key={i} value={i + 1}>{filtros.periodicidade === "mensal" ? new Date(2026, i, 1).toLocaleDateString("pt-BR", { month: "long" }) : `${i + 1}º ${filtros.periodicidade === "trimestral" ? "trimestre" : "semestre"}`}</option>)}</select></label>}
            </> : <><label className="min-w-0 text-xs font-bold text-slate-300">Início<input aria-label="Início do período" type="date" value={filtros.inicio} onChange={e => alterar({ inicio: e.target.value })} className={classes}/></label><label className="min-w-0 text-xs font-bold text-slate-300">Fim<input aria-label="Fim do período" type="date" value={filtros.fim} onChange={e => alterar({ fim: e.target.value })} className={classes}/></label></>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([ ["tecnico", "Técnico", "Todos os técnicos"], ["escola", "Escola / URE", "Todas as unidades"], ["categoria", "Categoria", "Todas as categorias"] ] as const).map(([campo, label, todos]) => <label key={campo} className="min-w-0 text-xs font-bold text-slate-300">{label}<select aria-label={`Filtro de ${campo} do relatório`} className={classes} value={filtros[campo]} onChange={e => alterar({ [campo]: e.target.value })}><option value="">{todos}</option>{opcoes[campo].map(s => <option key={s} value={s}>{s}</option>)}</select></label>)}
            <label className="min-w-0 text-xs font-bold text-slate-300">Situação do atendimento<select aria-label="Situação dos chamados no relatório" className={classes} value={filtros.status} onChange={e => alterar({ status: e.target.value as FiltrosFields["status"] })}><option value="todos">Todos os status</option><option value="realizados">Realizados</option><option value="abertos">Abertos</option><option value="cancelados">Cancelados</option></select></label></div>
          <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-blue-500" checked={filtros.cruzarCentral} onChange={e => alterar({ cruzarCentral: e.target.checked })}/><span className="text-sm font-bold">Cruzar com a Central de Relatórios<span className="mt-1 block text-xs font-normal leading-relaxed text-slate-400">Pelo número do chamado: entregas, pendências após Realizado e dispensas SETEC e automáticas.</span></span></label>
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-blue-500" checked={filtros.detalhar} onChange={e => alterar({ detalhar: e.target.checked })}/><span className="text-sm font-bold">Incluir detalhes de cada chamado<span className="mt-1 block text-xs font-normal leading-relaxed text-slate-400">Pedido e resposta completos, datas e situação documental. Anexos extensos são divididos em partes de 150 registros.</span></span></label>
          </div>
        </fieldset>
        <p className="text-xs leading-relaxed text-slate-500">O período usa a mesma data de referência da Central: visita → finalização → previsão → abertura → criação. Status e dispensas refletem o momento da emissão.</p>
        {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</div>}
        {aviso && <p role="status" className="text-sm text-emerald-300">{aviso}</p>}
        {previa && a && <section aria-label="Prévia do relatório" className="space-y-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 sm:p-5">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Prévia conferida</p><h3 className="mt-1 font-black text-white">{rotuloPeriodo(previa.filtros)}</h3><p className="mt-1 text-xs text-slate-400">{dataBR(previa.filtros.inicio)} a {dataBR(previa.filtros.fim)} · {new Date(previa.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[ ["Chamados", a.total], ["Realizados", a.realizados], ["Abertos", a.abertos], ["Internos URE", a.internos] ].map(([label, valor]) => <div key={label} className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-white">{numero(Number(valor))}</p></div>)}</div>
          {a.central && <div className="rounded-xl border border-slate-700 p-4 text-xs leading-relaxed text-slate-300"><b>Central:</b> {numero(a.central.entregues)} entregues · {numero(a.central.pendentes)} pendentes · {numero(a.central.dispensasManuais)} dispensas SETEC · {numero(a.central.dispensasAutomaticas)} automáticas.<p className="mt-2 text-slate-500">Entregue = finalizado com itens. Elegíveis para controle: {numero(a.central.elegiveis)} realizados após o marco de 09/09/2026.</p></div>}
          {previa.filtros.modalidade === "estrategico" && <div className="space-y-3">{a.pontos.slice(0, 3).map(x => <div key={x.titulo} className="border-l-2 border-amber-400/60 pl-3"><p className="text-xs font-black text-slate-100">{x.titulo}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{x.evidencia}</p></div>)}</div>}
          {a.semDataFiltrados > 0 && <p className="text-xs text-amber-300">{numero(a.semDataFiltrados)} registros sem data nos filtros ficaram fora do período e serão sinalizados no PDF.</p>}
          {previa.partes > 1 && <label className="block text-xs font-bold text-slate-300">Parte do anexo<select aria-label="Parte do anexo" className={classes} value={parte} disabled={ocupado} onChange={e => setParte(Number(e.target.value))}>{Array.from({ length: previa.partes }, (_, i) => <option key={i} value={i + 1}>Parte {i + 1}/{previa.partes} · registros {i * previa.detalhesPorParte + 1}–{Math.min((i + 1) * previa.detalhesPorParte, a.total)}</option>)}</select><span className="mt-2 block font-normal leading-relaxed text-slate-400">Cada PDF traz os indicadores do recorte completo e o anexo da parte escolhida. Baixe cada parte para ter todos os detalhes; não some os indicadores entre PDFs.</span></label>}
        </section>}
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p aria-live="polite" className="text-xs text-slate-400">{estado === "previa" ? "Conferindo os dados do período…" : estado === "pdf" ? "Preparando o documento institucional…" : "Geração sob demanda · nenhum PDF é salvo no Supabase"}</p>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void solicitar("previa")} disabled={ocupado} className="min-h-11 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-xs font-black text-blue-200 disabled:opacity-50">{estado === "previa" ? "Consultando…" : previa ? "Atualizar prévia" : "Conferir dados"}</button>
          <button type="button" onClick={() => void solicitar("pdf")} disabled={ocupado || !previa} className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-40">{estado === "pdf" ? "Gerando PDF…" : previa && previa.partes > 1 ? `Baixar PDF · parte ${parte}` : "Baixar PDF"}</button></div>
      </div>
    </div></div>, document.body);
}
