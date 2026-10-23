"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dataBR, filtrosIniciais, intervaloPeriodo, rotuloPeriodo, validarFiltros } from "@/lib/chamados-relatorios/periodos";
import type { FiltrosHub, OpcaoHub, OpcoesHub, PeriodicidadeHub, PreviaHub } from "@/lib/chamados-relatorios/types";
import styles from "./ModalRelatorioHub.module.css";

const classes = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25";
const numero = (n: number) => n.toLocaleString("pt-BR");
const btn = "min-h-11 rounded-xl px-4 py-3 text-xs font-black transition disabled:opacity-40";
export default function ModalRelatorioHub({ opcoes, fechar, chavePersistencia }: { opcoes: OpcoesHub; fechar: () => void; chavePersistencia: string }) {
  const [filtros, setFiltros] = useState<FiltrosHub>(() => {
    try { const v = sessionStorage.getItem(`${chavePersistencia}:filtros`); if (v) return validarFiltros(JSON.parse(v)); } catch {}
    return filtrosIniciais();
  });
  const [previa, setPrevia] = useState<PreviaHub | null>(null), [erro, setErro] = useState(""), [aviso, setAviso] = useState("");
  const [estado, setEstado] = useState<"livre" | "previa" | "pdf">("livre"), [parte, setParte] = useState(1);
  const dialogo = useRef<HTMLDialogElement>(null), leitura = useRef<AbortController | null>(null);
  const vivo = useRef(true), travado = useRef(false), fecharRef = useRef(fechar); fecharRef.current = fechar;
  useEffect(() => {
    vivo.current = true;
    const ativo = document.activeElement as HTMLElement | null;
    const anterior = ativo && ativo !== document.body ? ativo : document.querySelector<HTMLElement>("[data-gerar-relatorio-hub]");
    const overflow = document.body.style.overflow, d = dialogo.current;
    document.body.style.overflow = "hidden"; d?.showModal();
    return () => { vivo.current = false; leitura.current?.abort(); d?.close(); document.body.style.overflow = overflow; anterior?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { try { sessionStorage.setItem(`${chavePersistencia}:filtros`, JSON.stringify(filtros)); } catch {} }, [chavePersistencia, filtros]);
  function alterar(valores: Partial<FiltrosHub>) {
    leitura.current?.abort(); setFiltros(f => ({ ...f, ...valores })); setPrevia(null); setParte(1); setErro(""); setAviso("");
  }
  function periodo(tipo: PeriodicidadeHub, ano = filtros.ano, indice = 1) {
    alterar(tipo === "personalizado" ? { periodicidade: tipo } : { periodicidade: tipo, ano, indice, ...intervaloPeriodo(tipo, ano, indice) });
  }
  async function solicitar(acao: "previa" | "pdf") {
    if (travado.current) return;
    let validos: FiltrosHub; try { validos = validarFiltros(filtros); } catch (e) { setErro(e instanceof Error ? e.message : "Confira os filtros."); return; }
    if (acao === "pdf" && !previa) return;
    travado.current = true; setEstado(acao); setErro(""); setAviso("");
    const controller = new AbortController(); leitura.current = controller;
    const timer = setTimeout(() => controller.abort(), acao === "pdf" ? 65000 : 30000);
    try {
      const res = await fetch("/api/chamados/relatorios/gerencial", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, filtros: validos, assinatura: previa?.assinatura, parte }), signal: controller.signal, cache: "no-store" });
      if (!res.ok) {
        const r = await res.json().catch(() => null);
        if ([401, 403, 409].includes(res.status) && vivo.current) setPrevia(null);
        throw new Error(r?.erro || "Não foi possível gerar o relatório. Confira a sessão e tente novamente.");
      }
      if (acao === "previa") {
        const dados = await res.json() as PreviaHub;
        if (vivo.current && !controller.signal.aborted) { setPrevia(dados); setParte(1); }
      } else {
        if (!res.headers.get("content-type")?.includes("application/pdf")) throw new Error("O servidor não retornou um PDF válido.");
        const blob = await res.blob(); if (!vivo.current || controller.signal.aborted) return;
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "Relatorio_Chamados_Hub.pdf";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
        setAviso(`PDF preparado${previa && previa.partes > 1 ? ` · parte ${parte} de ${previa.partes}` : ""}.`);
      }
    } catch (e) {
      if (vivo.current) setErro(controller.signal.aborted ? "A geração foi interrompida. Seus filtros foram mantidos. Tente novamente ou reduza o período." : e instanceof Error ? e.message : "Falha ao gerar o documento.");
    } finally { clearTimeout(timer); travado.current = false; if (vivo.current) setEstado("livre"); }
  }
  const ocupado = estado !== "livre", a = previa?.analise;
  function filtro(campo: "responsavel" | "unidade" | "categoria" | "origem", titulo: string, todos: string, valores: OpcaoHub[]) {
    const selecionado = filtros[campo];
    return <label className="min-w-0 text-xs font-bold text-slate-300">{titulo}<select aria-label={titulo + " do relatório"} className={classes} value={selecionado} onChange={e => alterar({ [campo]: e.target.value })}>
      <option value="">{todos}</option>{campo === "responsavel" && <option value="__sem_responsavel__">Sem responsável</option>}
      {selecionado && selecionado !== "__sem_responsavel__" && !valores.some(v => v.valor === selecionado) && <option value={selecionado}>{selecionado}</option>}
      {valores.map(v => <option key={v.valor} value={v.valor}>{v.label}</option>)}</select></label>;
  }
  return createPortal(<dialog ref={dialogo} aria-labelledby="hub-relatorio-titulo" aria-describedby="hub-relatorio-descricao"
    onCancel={e => { e.preventDefault(); fecharRef.current(); }} onClick={e => { if (e.target === e.currentTarget) fecharRef.current(); }}
    className={styles.janela}>
      <header className={`${styles.cabecalho} border-b border-slate-800 bg-slate-950 px-4 py-5 sm:px-7`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SETEC / SEINTEC · Chamados do Hub</p>
          <h2 id="hub-relatorio-titulo" className="mt-2 text-xl font-black tracking-tight sm:text-3xl">Gerar relatório gerencial</h2>
          <p id="hub-relatorio-descricao" className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">Indicadores, distribuições e detalhes dos atendimentos registrados no Hub.</p></div>
          <button type="button" autoFocus onClick={fechar} aria-label="Fechar relatório do Hub" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xl text-slate-300 hover:bg-slate-800">×</button></div>
      </header>
      <div data-hub-relatorio-scroll tabIndex={0} role="region" aria-label="Filtros e prévia do relatório" className={`${styles.rolagem} space-y-5 p-4 sm:p-7`}>
        <fieldset disabled={ocupado} className="min-w-0 space-y-5 disabled:opacity-70"><legend className="sr-only">Configurar relatório do Hub</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([ ["estrategico", "Estratégico", "Indicadores, gráficos, pontos de atenção e direções sugeridas."], ["quantitativo", "Quantitativo", "Totais, distribuições e detalhes de pedidos e retornos por chamado."] ] as const).map(([tipo, titulo, texto]) =>
            <button key={tipo} type="button" aria-pressed={filtros.modalidade === tipo} onClick={() => alterar({ modalidade: tipo, detalhar: tipo === "quantitativo" })} className={`min-w-0 rounded-2xl border p-4 text-left transition ${filtros.modalidade === tipo ? "border-blue-400 bg-blue-500/15 ring-1 ring-blue-400/30" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`}><span className="text-sm font-black text-white">{titulo}</span><span className="mt-2 block text-xs leading-relaxed text-slate-400">{texto}</span></button>)}</div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="min-w-0 text-xs font-bold text-slate-300">Período<select aria-label="Periodicidade do relatório" className={classes} value={filtros.periodicidade} onChange={e => periodo(e.target.value as PeriodicidadeHub)}><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="personalizado">Personalizado</option></select></label>
            {filtros.periodicidade !== "personalizado" ? <><label className="min-w-0 text-xs font-bold text-slate-300">Ano<select aria-label="Ano do relatório" className={classes} value={filtros.ano} onChange={e => periodo(filtros.periodicidade, Number(e.target.value), filtros.indice)}>{Array.from({ length: 101 }, (_, i) => 2000 + i).map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></label>
              {filtros.periodicidade !== "anual" && <label className="min-w-0 text-xs font-bold text-slate-300">{filtros.periodicidade === "mensal" ? "Mês" : filtros.periodicidade === "trimestral" ? "Trimestre" : "Semestre"}<select aria-label="Índice do período" className={classes} value={filtros.indice} onChange={e => periodo(filtros.periodicidade, filtros.ano, Number(e.target.value))}>{Array.from({ length: filtros.periodicidade === "mensal" ? 12 : filtros.periodicidade === "trimestral" ? 4 : 2 }, (_, i) => <option key={i} value={i + 1}>{filtros.periodicidade === "mensal" ? new Date(2026, i, 1).toLocaleDateString("pt-BR", { month: "long" }) : `${i + 1}º período`}</option>)}</select></label>}</>
              : <><label className="min-w-0 text-xs font-bold text-slate-300">Início<input aria-label="Início do período" type="date" value={filtros.inicio} onChange={e => alterar({ inicio: e.target.value })} className={classes}/></label><label className="min-w-0 text-xs font-bold text-slate-300">Fim<input aria-label="Fim do período" type="date" value={filtros.fim} onChange={e => alterar({ fim: e.target.value })} className={classes}/></label></>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="min-w-0 text-xs font-bold text-slate-300">Selecionar chamados pela data de<select aria-label="Data de referência do relatório" className={classes} value={filtros.referencia} onChange={e => alterar({ referencia: e.target.value as FiltrosHub["referencia"], status: e.target.value === "conclusao" ? "atendidos" : "todos" })}><option value="conclusao">Conclusão do atendimento</option><option value="abertura">Abertura do chamado</option></select></label>
            <label className="min-w-0 text-xs font-bold text-slate-300">Situação atual<select aria-label="Situação dos chamados no relatório" className={classes} value={filtros.status} onChange={e => alterar({ status: e.target.value as FiltrosHub["status"] })}>{filtros.referencia === "abertura" && <><option value="todos">Todos os status</option><option value="ativos">Ativos</option><option value="aberto">Abertos</option><option value="assumido">Assumidos</option><option value="em_atendimento">Em atendimento</option><option value="cancelado">Cancelados</option><option value="outros">Outros status</option></>}<option value="atendidos">Atendidos · resolvidos + fechados</option><option value="resolvido">Resolvidos</option><option value="fechado">Fechados</option></select></label>
            {filtro("responsavel", "Responsável", "Todos os responsáveis", opcoes.responsaveis)}
            {filtro("unidade", "Escola / setor URE", "Todas as unidades", opcoes.unidades)}
            {filtro("categoria", "Categoria", "Todas as categorias", opcoes.categorias.map(valor => ({ valor, label: valor })))}
            {filtro("origem", "Origem", "Todas as origens", opcoes.origens.map(valor => ({ valor, label: valor })))}
            <label className="min-w-0 text-xs font-bold text-slate-300">Prioridade<select aria-label="Prioridade do relatório" className={classes} value={filtros.prioridade} onChange={e => alterar({ prioridade: e.target.value })}><option value="">Todas as prioridades</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option><option value="nao_informada">Não informada</option></select></label>
            <label className="min-w-0 text-xs font-bold text-slate-300">Busca nos chamados<input aria-label="Busca no relatório" value={filtros.busca} maxLength={250} onChange={e => alterar({ busca: e.target.value })} className={classes} placeholder="Código, pedido, retorno ou solicitante…"/></label>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-4"><input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-blue-500" checked={filtros.detalhar} onChange={e => alterar({ detalhar: e.target.checked })}/><span className="text-sm font-bold">Incluir detalhes de cada chamado<span className="mt-1 block text-xs font-normal leading-relaxed text-slate-400">Pedido e retorno completos, responsável e datas. Anexos extensos são divididos em partes de 150 registros.</span></span></label>
        </fieldset>
        <p className="text-xs leading-relaxed text-slate-500">{filtros.referencia === "conclusao" ? "Conta os atendidos pela data de resolução; usa o fechamento quando não há resolução datada. Concluídos sem essas datas ficam fora deste recorte." : "Conta os chamados abertos no período e mostra sua situação atual. Esse recorte não representa todo o estoque do sistema."} Os filtros deste relatório são independentes dos filtros do painel.</p>
        {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</div>}
        {aviso && <p role="status" className="text-sm text-emerald-300">{aviso}</p>}
        {previa && a && <section aria-label="Prévia do relatório" className="space-y-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 sm:p-5"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Prévia conferida</p><h3 className="mt-1 font-black text-white">{rotuloPeriodo(previa.filtros)}</h3><p className="mt-1 text-xs text-slate-400">{dataBR(previa.filtros.inicio)} a {dataBR(previa.filtros.fim)} · {new Date(previa.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[ ["Chamados", a.total], ["Atendidos", a.atendidos], ["Ativos", a.ativos], ["Internos URE", a.internos] ].map(([label, valor]) => <div key={label} className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-white">{numero(Number(valor))}</p></div>)}</div>
          <p className="text-xs leading-relaxed text-slate-400">{numero(a.escolas)} escolas · {numero(a.setores)} setores URE · {numero(a.responsaveis)} responsáveis · {numero(a.semRetorno)} atendidos sem retorno.</p>
          {previa.filtros.modalidade === "estrategico" && <div className="space-y-3">{a.pontos.slice(0, 3).map(x => <div key={x.titulo} className="border-l-2 border-amber-400/60 pl-3"><p className="text-xs font-black text-slate-100">{x.titulo}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{x.evidencia}</p></div>)}</div>}
          {previa.partes > 1 && <label className="block text-xs font-bold text-slate-300">Parte do anexo<select aria-label="Parte do anexo" className={classes} value={parte} disabled={ocupado} onChange={e => setParte(Number(e.target.value))}>{Array.from({ length: previa.partes }, (_, i) => <option key={i} value={i + 1}>Parte {i + 1}/{previa.partes} · registros {i * previa.detalhesPorParte + 1}–{Math.min((i + 1) * previa.detalhesPorParte, a.total)}</option>)}</select><span className="mt-2 block font-normal leading-relaxed text-slate-400">Cada PDF repete os indicadores do recorte e contém a parte escolhida do anexo. Baixe todas as partes para ter todos os detalhes; não some os indicadores entre PDFs.</span></label>}
        </section>}
      </div>
      <footer className={`${styles.rodape} flex flex-col gap-3 border-t border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7`}><p aria-live="polite" className="text-xs text-slate-400">{estado === "previa" ? "Conferindo os dados do período…" : estado === "pdf" ? "Preparando o documento institucional…" : "Geração sob demanda · sem salvar PDFs no Supabase"}</p><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void solicitar("previa")} disabled={ocupado} className={`${btn} border border-blue-500/40 bg-blue-500/10 text-blue-200`}>{estado === "previa" ? "Consultando…" : previa ? "Atualizar prévia" : "Conferir dados"}</button><button type="button" onClick={() => void solicitar("pdf")} disabled={ocupado || !previa} className={`${btn} bg-blue-600 text-white hover:bg-blue-500`}>{estado === "pdf" ? "Gerando PDF…" : previa && previa.partes > 1 ? `Baixar PDF · parte ${parte}` : "Baixar PDF"}</button></div></footer>
  </dialog>, document.body);
}
