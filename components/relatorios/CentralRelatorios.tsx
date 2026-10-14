"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { erroFormatoChamado } from "@/lib/relatorios/chamado";
import { leituraComPrazo } from "@/lib/relatorios/consulta";
import type { ContextoRelatorios, DetalheRelatorio, DocumentoRelatorio, HistoricoDispensa,
  ReferenciaExportacao, RegistroControle, RespostaControle } from "@/lib/relatorios/types";

type Aba = "painel" | "relatorios" | "pendencias" | "dispensas" | "backup";
type Filtros = { mes: string; tecnico: string; tipo: string; busca: string; situacao: string };
type ResultadoConsulta = { chave: string; dados: RespostaControle };
type ModalAcao = { registro: RegistroControle; acao: "aprovar" | "solicitar" | "revogar" };
type ArquivoBackup = { nome: string; url: string; falhas: number; quantidade: number };
type IconeNome = "painel" | "arquivo" | "pendencia" | "escudo" | "download" | "filtro" | "atualizar" | "seta" | "fechar";
const campo = "min-h-[46px] w-full min-w-0 rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2.5 text-base text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50";
const botao = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-cyan-400/50 hover:bg-cyan-400/5 focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";
const primario = `${botao} border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300`;
const abas: Array<{ id: Aba; label: string; icon: IconeNome }> = [
  { id: "painel", label: "Visão geral", icon: "painel" },
  { id: "relatorios", label: "Relatórios", icon: "arquivo" },
  { id: "pendencias", label: "Pendências", icon: "pendencia" },
  { id: "dispensas", label: "Dispensas SETEC", icon: "escudo" },
  { id: "backup", label: "Backup mensal", icon: "download" },
];
const rotulos: Record<string, string> = { entregue: "Com relatório", dispensado: "Dispensa aprovada",
  pendente: "Sem relatório", rascunho: "Rascunho", aguardando_aprovacao: "Aguardando SETEC", finalizado: "Finalizado" };
function mesAtual() {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${p.find(v => v.type === "year")?.value}-${p.find(v => v.type === "month")?.value}`;
}
function filtrosIniciais(): Filtros { return { mes: mesAtual(), tecnico: "", tipo: "todos", busca: "", situacao: "todos" }; }
function dataBR(valor?: string | null) {
  if (!valor) return "Sem data";
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor.split("-").reverse().join("/");
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "Sem data" : data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}
function mesBR(valor: string) {
  const data = new Date(`${valor}-01T12:00:00-03:00`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" });
}
function numero(n: unknown) {
  const valor = typeof n === "number" ? n : typeof n === "string" && n.trim() ? Number(n) : NaN;
  return Number.isFinite(valor) ? valor.toLocaleString("pt-BR") : "—";
}
function erroTexto(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Não foi possível concluir a operação. Tente novamente.";
}
function Icone({ nome, className = "h-4 w-4" }: { nome: IconeNome; className?: string }) {
  const desenhos: Record<IconeNome, ReactNode> = {
    painel: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    arquivo: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    pendencia: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    escudo: <><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
    filtro: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    atualizar: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6" /></>,
    seta: <path d="M5 12h14m-5-5 5 5-5 5" />,
    fechar: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg aria-hidden="true" className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{desenhos[nome]}</svg>;
}
function Tag({ estado }: { estado: string }) {
  const cor = estado === "entregue" || estado === "finalizado" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" :
    estado === "dispensado" ? "border-blue-500/25 bg-blue-500/10 text-blue-300" :
    estado === "pendente" ? "border-red-500/25 bg-red-500/10 text-red-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${cor}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{rotulos[estado] || estado}</span>;
}
function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 text-slate-500"><Icone nome="arquivo" className="h-6 w-6" /></div><h3 className="mt-4 text-base font-bold text-slate-200">{titulo}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{texto}</p></div>;
}

export default function CentralRelatorios({ contextoInicial }: { contextoInicial: ContextoRelatorios }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [aba, setAba] = useState<Aba>("painel");
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [edicao, setEdicao] = useState<Filtros>(filtrosIniciais);
  const [pagina, setPagina] = useState(1);
  const [contexto, setContexto] = useState(contextoInicial);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const chaveConsulta = useMemo(() => JSON.stringify({ aba, filtros, pagina }), [aba, filtros, pagina]);
  // A renderização pode acontecer antes da limpeza no useEffect. Só mostra
  // dados cuja consulta corresponde à aba, aos filtros e à página atuais.
  const dados = resultado?.chave === chaveConsulta ? resultado.dados : null;
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [falhaConsulta, setFalhaConsulta] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [semAcesso, setSemAcesso] = useState(false);
  const [acao, setAcao] = useState<ModalAcao | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [salvandoAcao, setSalvandoAcao] = useState(false);
  const [detalhe, setDetalhe] = useState<DetalheRelatorio | null>(null);
  const [historico, setHistorico] = useState<HistoricoDispensa[] | null>(null);
  const [historicoChamado, setHistoricoChamado] = useState("");
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [progresso, setProgresso] = useState({ preparados: 0, total: 0, texto: "" });
  const [arquivos, setArquivos] = useState<ArquivoBackup[]>([]);
  const consultaRef = useRef<AbortController | null>(null);
  const exportacaoRef = useRef<AbortController | null>(null);
  const sequencia = useRef(0);
  const urls = useRef<string[]>([]);
  const montado = useRef(true);
  const versaoAcesso = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const atualizadoMs = useRef(0);
  const ocupadoRef = useRef(false);
  ocupadoRef.current = exportando || salvandoAcao || Boolean(acao || detalhe || historico);
  const { mes, tecnico, tipo } = filtros;
  const filtrosAlterados = JSON.stringify(edicao) !== JSON.stringify(filtros);
  const modalAberto = Boolean(acao || detalhe || historico);

  const limparArquivos = useCallback(() => {
    urls.current.forEach(URL.revokeObjectURL); urls.current = []; setArquivos([]);
  }, []);
  const limparAcesso = useCallback(() => {
    versaoAcesso.current++; sequencia.current++;
    consultaRef.current?.abort(); exportacaoRef.current?.abort();
    setResultado(null); setDetalhe(null); setHistorico(null); setAcao(null);
    setExportando(false); setCarregando(false); setSemAcesso(true); limparArquivos();
  }, [limparArquivos]);

  useEffect(() => {
    montado.current = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Nenhuma chamada assíncrona do Supabase ocorre dentro deste callback.
      if (event === "SIGNED_OUT" || (session?.user.id && session.user.id !== contextoInicial.usuario_id)) limparAcesso();
    });
    return () => { montado.current = false; listener.subscription.unsubscribe(); consultaRef.current?.abort();
      exportacaoRef.current?.abort(); urls.current.forEach(URL.revokeObjectURL); };
  }, [contextoInicial.usuario_id, limparAcesso, supabase]);
  useEffect(() => { if (semAcesso) router.replace("/"); }, [semAcesso, router]);

  const carregar = useCallback(async () => {
    consultaRef.current?.abort();
    const controller = new AbortController(); consultaRef.current = controller;
    const seq = ++sequencia.current;
    setCarregando(true); setFalhaConsulta(null);
    try {
      const { data, error } = await leituraComPrazo(supabase.rpc("hub_relatorios_consultar", {
        p_mes: filtros.mes, p_tecnico: filtros.tecnico,
        p_tipo: aba === "relatorios" || aba === "backup" ? filtros.tipo : "todos",
        p_aba: aba,
        p_busca: filtros.busca, p_situacao: filtros.situacao, p_pagina: pagina, p_tamanho: 25,
      }).abortSignal(controller.signal), "A consulta demorou mais que o esperado. Use Atualizar para tentar novamente.", 20_000);
      if (controller.signal.aborted || seq !== sequencia.current || !montado.current) return;
      if (error) { if (error.code === "42501") limparAcesso(); throw error; }
      const resposta = data as RespostaControle;
      if (!resposta?.contexto?.permitido) { limparAcesso(); return; }
      setResultado({ chave: chaveConsulta, dados: resposta }); setContexto({ ...contextoInicial, ...resposta.contexto });
      setTecnicos(resposta.tecnicos || []); atualizadoMs.current = Date.now(); setAtualizadoEm(new Date().toISOString());
    } catch (error) {
      if (montado.current && !controller.signal.aborted && seq === sequencia.current) setFalhaConsulta(erroTexto(error));
    } finally {
      if (montado.current && seq === sequencia.current) setCarregando(false);
      controller.abort();
    }
  }, [aba, chaveConsulta, contextoInicial, filtros, limparAcesso, pagina, supabase]);

  useEffect(() => {
    setResultado(null); void carregar();
    return () => { sequencia.current++; consultaRef.current?.abort(); };
  }, [carregar]);
  useEffect(() => {
    // Sem polling. Ao voltar para a aba, atualiza somente se a última consulta
    // tiver mais de dois minutos e nenhuma ação/exportação estiver em curso.
    const voltar = () => {
      if (document.visibilityState !== "visible" || ocupadoRef.current || Date.now() - atualizadoMs.current < 120_000 || consultaRef.current?.signal.aborted === false) return;
      void carregar();
    };
    const atualizado = () => { if (document.visibilityState === "visible" && !ocupadoRef.current) void carregar(); };
    window.addEventListener("focus", voltar); document.addEventListener("visibilitychange", voltar);
    window.addEventListener("hub-relatorios-atualizados", atualizado);
    return () => { window.removeEventListener("focus", voltar); document.removeEventListener("visibilitychange", voltar); window.removeEventListener("hub-relatorios-atualizados", atualizado); };
  }, [carregar]);

  function mudarAba(nova: Aba) {
    if (exportando || nova === aba) return;
    const novos = { ...filtros, busca: "", situacao: "todos" };
    setEdicao(novos); setFiltros(novos); setPagina(1); setAba(nova); setMensagem(null);
  }
  function aplicarFiltros() {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(edicao.mes)) { setMensagem("Selecione um mês válido para consultar os relatórios."); return; }
    const novos = { ...edicao, busca: edicao.busca.trim() };
    setPagina(1); setEdicao(novos); setMensagem(null);
    if (JSON.stringify(novos) === JSON.stringify(filtros) && pagina === 1) void carregar();
    else setFiltros(novos);
  }
  function fecharModal() { if (!salvandoAcao) { setAcao(null); setDetalhe(null); setHistorico(null); } }

  useEffect(() => {
    if (!modalAberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    const teclado = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !salvandoAcao) { setAcao(null); setDetalhe(null); setHistorico(null); }
      if (event.key === "Tab") {
        const el = Array.from(modalRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled),textarea,a[href]") || []);
        const primeiro = el[0], ultimo = el[el.length - 1];
        if (!primeiro) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === primeiro || document.activeElement === modalRef.current)) { event.preventDefault(); ultimo?.focus(); }
        else if (!event.shiftKey && (document.activeElement === ultimo || document.activeElement === modalRef.current)) { event.preventDefault(); primeiro.focus(); }
      }
    };
    document.addEventListener("keydown", teclado);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", teclado); if (anterior?.isConnected) anterior.focus(); };
  }, [modalAberto, salvandoAcao]);

  async function decidirDispensa() {
    if (!acao || salvandoAcao || justificativa.trim().length < 10) return;
    const acesso = versaoAcesso.current;
    setSalvandoAcao(true); setMensagem(null);
    try {
      const { error } = await supabase.rpc("hub_relatorios_dispensa", { p_chamado: acao.registro.chamado,
        p_acao: acao.acao, p_justificativa: justificativa.trim(), p_versao: acao.registro.dispensa_versao || 0 });
      if (error) throw error;
      if (!montado.current || acesso !== versaoAcesso.current) return;
      setAcao(null); setJustificativa("");
      setMensagem(acao.acao === "aprovar" ? "Dispensa aprovada pela SETEC. O chamado saiu das pendências de relatório." : acao.acao === "revogar" ? "Dispensa revogada. O chamado voltou a exigir relatório." : "Solicitação enviada. O chamado permanece pendente até a aprovação SETEC.");
      await carregar();
    } catch (error) { if (montado.current && acesso === versaoAcesso.current) setMensagem(erroTexto(error)); }
    finally { if (montado.current && acesso === versaoAcesso.current) setSalvandoAcao(false); }
  }
  async function abrirHistorico(chamado: string) {
    const acesso = versaoAcesso.current;
    setOcupadoId(chamado); setMensagem(null);
    try {
      const { data, error } = await leituraComPrazo(supabase.rpc("hub_relatorios_historico_dispensa", { p_chamado: chamado }));
      if (error) throw error;
      if (!montado.current || acesso !== versaoAcesso.current) return;
      setHistoricoChamado(chamado); setHistorico(Array.isArray(data) ? data as HistoricoDispensa[] : []);
    } catch (error) { if (montado.current && acesso === versaoAcesso.current) setMensagem(erroTexto(error)); }
    finally { if (montado.current) setOcupadoId(null); }
  }
  async function abrirDetalhe(doc: DocumentoRelatorio) {
    const acesso = versaoAcesso.current;
    setOcupadoId(doc.id); setMensagem(null);
    try {
      const { data, error } = await leituraComPrazo(supabase.rpc("hub_relatorios_documento", { p_tipo: doc.tipo, p_id: doc.id }));
      if (error) throw error;
      if (montado.current && acesso === versaoAcesso.current) setDetalhe(data as DetalheRelatorio);
    } catch (error) { if (montado.current && acesso === versaoAcesso.current) setMensagem(erroTexto(error)); }
    finally { if (montado.current) setOcupadoId(null); }
  }
  async function baixarPDF(doc: DocumentoRelatorio) {
    const acesso = versaoAcesso.current;
    setOcupadoId(doc.id); setMensagem(null);
    try {
      const response = await fetch(`/api/fields/relatorios/documento?tipo=${encodeURIComponent(doc.tipo)}&id=${encodeURIComponent(doc.id)}`, { cache: "no-store" });
      if (!response.ok) { const erro = await response.json(); throw new Error(erro.erro || "Não foi possível baixar o PDF."); }
      const blob = await response.blob();
      if (!montado.current || acesso !== versaoAcesso.current) return;
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `Relatorio_${doc.tipo}_${doc.chamado.replace(/[^A-Za-z0-9_-]/g, "_")}_${doc.id}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { if (montado.current && acesso === versaoAcesso.current) setMensagem(erroTexto(error)); }
    finally { if (montado.current) setOcupadoId(null); }
  }

  // A implementação completa da exportação é inserida abaixo, preservando a
  // seleção estável, a paginação sem corte e os lotes de até 25 documentos.
  async function exportar() {
    if (exportando) return;
    const controller = new AbortController(); exportacaoRef.current = controller;
    const acesso = versaoAcesso.current;
    limparArquivos(); setExportando(true); setMensagem(null);
    setProgresso({ preparados: 0, total: 0, texto: "Conferindo a lista completa de relatórios…" });
    try {
      const corte = new Date().toISOString(); const referencias: ReferenciaExportacao[] = [];
      let total: number | null = null; const identificadores = new Set<string>();
      for (let p = 1; ; p++) {
        const { data, error } = await leituraComPrazo(supabase.rpc("hub_relatorios_exportacao_lista", {
          p_mes: mes, p_tecnico: tecnico, p_tipo: tipo, p_pagina: p, p_corte: corte,
        }).abortSignal(controller.signal), "A seleção do backup demorou. Tente novamente.", 20_000);
        if (error) throw error;
        const resposta = data as { total: number; registros: ReferenciaExportacao[] };
        if (total === null) total = resposta.total;
        if (resposta.total !== total) throw new Error("A lista de relatórios mudou durante a seleção. Inicie a exportação novamente.");
        for (const r of resposta.registros) {
          const chave = r.tipo + ":" + r.id;
          if (identificadores.has(chave)) throw new Error("A seleção mudou durante a consulta. Inicie a exportação novamente.");
          identificadores.add(chave); referencias.push(r);
        }
        if (referencias.length === total) break;
        if (!resposta.registros.length || referencias.length > total) throw new Error("A seleção ficou incompleta. Nenhum lote incompleto será considerado concluído.");
      }
      if (!referencias.length) { setMensagem("Nenhum relatório finalizado corresponde aos filtros selecionados."); return; }
      const partes = Math.ceil(referencias.length / 25);
      let preparados = 0, falhasTotal = 0;
      for (let parte = 0; parte < partes; parte++) {
        if (controller.signal.aborted) throw new DOMException("Cancelado", "AbortError");
        const refs = referencias.slice(parte * 25, (parte + 1) * 25);
        setProgresso({ preparados, total: referencias.length, texto: `Preparando parte ${parte + 1} de ${partes}…` });
        const response = await fetch("/api/fields/relatorios/backup", { method: "POST", cache: "no-store",
          headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ mes, tecnico, tipo, referencias: refs, parte: parte + 1, partes, corte }) });
        if (!response.ok) { const erro = await response.json(); throw new Error(erro.erro || "Falha ao preparar o backup."); }
        const blob = await response.blob();
        if (!montado.current || acesso !== versaoAcesso.current || controller.signal.aborted) throw new DOMException("Cancelado", "AbortError");
        const falhas = Number(response.headers.get("X-Relatorios-Falhas") || 0);
        const quantidade = Number(response.headers.get("X-Relatorios-PDFs") || 0);
        const nome = response.headers.get("X-Relatorios-Arquivo") || `SETEC_Relatorios_${mes}_parte_${parte + 1}.zip`;
        const url = URL.createObjectURL(blob); urls.current.push(url);
        setArquivos(atuais => [...atuais, { nome, url, falhas, quantidade }]);
        preparados += refs.length; falhasTotal += falhas;
        setProgresso({ preparados, total: referencias.length, texto: `${preparados} de ${referencias.length} relatórios processados` });
      }
      setMensagem(falhasTotal ? `Backup preparado com ${falhasTotal} falha(s). Consulte falhas.csv nos lotes PARCIAL e refaça os registros indicados.` : `Backup completo: ${referencias.length} PDFs preparados em ${partes} arquivo(s) ZIP. Baixe todas as partes abaixo.`);
    } catch (error) {
      if (montado.current && acesso === versaoAcesso.current) setMensagem(controller.signal.aborted ? "Exportação interrompida. As partes já preparadas continuam disponíveis; o conjunto ainda está incompleto." : erroTexto(error));
    } finally { if (montado.current && acesso === versaoAcesso.current) setExportando(false); }
  }


  if (semAcesso) return <p role="status" className="p-6 text-sm text-slate-400">Conferindo seu acesso…</p>;
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.tamanho)) : 1;
  const listaTecnicos = Array.from(new Set([...tecnicos, ...(edicao.tecnico ? [edicao.tecnico] : [])])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const resumo = dados?.resumo;
  const cobertura = resumo && resumo.chamados > resumo.dispensados ? Math.round(100 * resumo.entregues / (resumo.chamados - resumo.dispensados)) : null;

  return <main className="mx-auto w-full min-w-0 max-w-[1560px] space-y-5 pb-10 sm:space-y-6">
    <header className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(120deg,#07162b,#020617_70%)] p-5 shadow-xl shadow-slate-950/20 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />SETEC Hub · Fields</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Central de Relatórios</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">Equipamentos e redes em um só lugar. Acompanhe entregas, confira pendências e prepare seu backup mensal.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:max-w-md">
          <Link prefetch={false} href="/fields/relatorio-tecnico" className={`${botao} justify-between bg-slate-950/60`}><span>Novo relatório de equipamentos</span><Icone nome="seta" /></Link>
          <Link prefetch={false} href="/fields/relatorio-redes" className={`${botao} justify-between bg-slate-950/60`}><span>Novo relatório de redes</span><Icone nome="seta" /></Link>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400"><span className="font-semibold text-slate-200">URE Guarulhos Sul</span><span>Acompanhamento desde 09/09/2026</span><span className="rounded-full border border-slate-700/80 px-2.5 py-1 text-slate-300">{contexto.gestao ? "Visão de gestão SETEC" : "Meus relatórios e chamados"}</span></div>
    </header>

    <nav aria-label="Seções da central" className="min-w-0 rounded-2xl border border-slate-800 bg-[#020617] p-2">
      <div className="grid min-w-0 grid-cols-2 gap-1 sm:grid-cols-5" role="tablist">
        {abas.map(item => <button key={item.id} id={`central-tab-${item.id}`} role="tab" aria-selected={aba === item.id} aria-controls="central-conteudo" type="button" disabled={exportando} onClick={() => mudarAba(item.id)} className={`inline-flex min-h-[46px] min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition disabled:opacity-50 lg:px-3 lg:text-sm ${item.id === "backup" ? "col-span-2 sm:col-span-1" : ""} ${aba === item.id ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}><Icone nome={item.icon} />{item.label}</button>)}
      </div>
    </nav>

    <form onSubmit={event => { event.preventDefault(); if (!exportando) aplicarFiltros(); }} className="rounded-2xl border border-slate-800 bg-[#020617] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-bold text-slate-200"><Icone nome="filtro" />Filtrar informações</p><p className="text-xs text-slate-400">{filtrosAlterados ? "Há filtros aguardando aplicação" : `Exibindo ${mesBR(filtros.mes)}`}</p></div>
      <div className={`grid items-end gap-3 sm:grid-cols-2 ${aba === "relatorios" || aba === "backup" ? "xl:grid-cols-4" : "xl:grid-cols-[1fr_1.5fr_auto]"}`}>
        <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-400">Mês do atendimento<input type="month" aria-label="Mês do atendimento" style={{ colorScheme: "dark" }} className={campo} value={edicao.mes} disabled={exportando} onChange={e => setEdicao(atual => ({ ...atual, mes: e.target.value }))} /></label>
        <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-400">Técnico<select aria-label="Técnico" className={campo} value={edicao.tecnico} disabled={exportando} onChange={e => setEdicao(atual => ({ ...atual, tecnico: e.target.value }))}><option value="">Todos os técnicos disponíveis</option>{listaTecnicos.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
        {(aba === "relatorios" || aba === "backup") && <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-400">Tipo de relatório<select aria-label="Tipo de relatório" className={campo} value={edicao.tipo} disabled={exportando} onChange={e => setEdicao(atual => ({ ...atual, tipo: e.target.value }))}><option value="todos">Equipamentos e redes</option><option value="equipamentos">Equipamentos</option><option value="redes">Redes</option></select></label>}
        <button type="submit" disabled={exportando} className={primario}><Icone nome="filtro" />Aplicar filtros</button>
      </div>
      {(aba === "relatorios" || aba === "pendencias" || aba === "dispensas") && <div className="mt-3 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-400">Chamado, escola ou técnico<input aria-label="Buscar chamado, escola ou técnico" className={campo} value={edicao.busca} maxLength={200} disabled={exportando} onChange={e => setEdicao(atual => ({ ...atual, busca: e.target.value }))} placeholder="Ex.: STI-26/0000 ou nome da escola" /></label>
        <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-400">Situação<select aria-label="Situação" className={campo} value={edicao.situacao} disabled={exportando} onChange={e => setEdicao(atual => ({ ...atual, situacao: e.target.value }))}><option value="todos">Todas as situações</option>{aba === "relatorios" ? <><option value="finalizado">Finalizados</option><option value="rascunho">Rascunhos</option><option value="ure">Atendimentos na URE</option><option value="sem_vinculo">Conferir vínculo com o chamado</option></> : <><option value="pendente">Sem relatório</option><option value="rascunho">Em rascunho</option><option value="aguardando_aprovacao">Aguardando SETEC</option>{aba === "dispensas" && <><option value="dispensado">Dispensa aprovada</option><option value="entregue">Com relatório</option></>}</>}</select></label>
      </div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
        <p className="text-xs text-slate-400">{atualizadoEm ? `Última consulta: ${dataBR(atualizadoEm)}` : "Preparando a primeira consulta"}{carregando && <span className="ml-2 text-cyan-300">Atualizando…</span>}</p>
        <div className="flex gap-3"><button type="button" disabled={exportando} onClick={() => { const novos = filtrosIniciais(); setEdicao(novos); setFiltros(novos); setPagina(1); }} className="min-h-[40px] px-2 text-xs font-bold text-slate-400 hover:text-slate-200 disabled:opacity-50">Limpar filtros</button><button type="button" disabled={carregando || exportando} className="inline-flex min-h-[40px] items-center gap-2 px-2 text-xs font-bold text-cyan-300 disabled:opacity-50" onClick={() => void carregar()}><Icone nome="atualizar" />Atualizar</button></div>
      </div>
    </form>

    {(mensagem || falhaConsulta) && <div role={falhaConsulta ? "alert" : "status"} aria-live="polite" className={`rounded-2xl border p-4 text-sm leading-relaxed ${falhaConsulta ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-cyan-400/25 bg-cyan-400/5 text-cyan-100"}`}>{falhaConsulta || mensagem}</div>}

    <section id="central-conteudo" role="tabpanel" aria-labelledby={`central-tab-${aba}`} aria-busy={carregando} className="min-w-0 space-y-5">
      {!dados && carregando && <div className="rounded-2xl border border-slate-800 bg-[#020617] p-6"><div className="flex items-center gap-3 text-sm text-slate-300"><span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-r-transparent" />Consultando informações do período…</div><div aria-hidden="true" className="mt-5 grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map(n => <div key={n} className="h-20 rounded-xl bg-slate-800/50" />)}</div></div>}

      {dados && aba === "painel" && <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Indicador titulo="Chamados do período" valor={dados.resumo.chamados} detalhe="Uma exigência por chamado" tom="slate" icone="arquivo" />
          <Indicador titulo="Com relatório" valor={dados.resumo.entregues} detalhe="Equipamentos ou redes finalizado" tom="emerald" icone="escudo" />
          <Indicador titulo="Pendências" valor={dados.resumo.pendentes} detalhe={`${numero(dados.resumo.aguardando_aprovacao)} aguardando SETEC`} tom="amber" icone="pendencia" />
          <Indicador titulo="Dispensas SETEC" valor={dados.resumo.dispensados} detalhe="Exceções aprovadas com motivo" tom="blue" icone="escudo" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <section className="min-w-0 rounded-2xl border border-slate-800 bg-[#020617] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-white">Cobertura por técnico</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">Chamados com relatório entre os que exigem relatório. Dispensas aprovadas ficam fora da exigência.</p></div><span className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm font-black text-cyan-300">{cobertura === null ? "Sem exigências" : `${cobertura}% no período`}</span></div>
            <div className="mt-6 space-y-5">{dados.ranking.length ? dados.ranking.map((r, i) => <div key={r.tecnico} className="min-w-0"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-slate-300">{i + 1}</span><p className="break-words text-sm font-bold text-slate-100">{r.tecnico}</p></div><p className="shrink-0 text-sm font-black tabular-nums text-cyan-300">{r.cobertura === null ? "—" : `${r.cobertura}%`}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(0, Math.min(100, r.cobertura || 0))}%` }} /></div><p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400"><span>{numero(r.entregues)} com relatório</span><span className={r.pendentes ? "text-amber-300" : ""}>{numero(r.pendentes)} pendentes</span><span>{numero(r.dispensados)} dispensados</span></p></div>) : <Vazio titulo="Sem chamados neste período" texto="Escolha outro mês ou técnico para conferir o acompanhamento." />}</div>
          </section>
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-800 bg-[#020617] p-5 sm:p-6"><h2 className="text-lg font-black text-white">Relatórios emitidos</h2><p className="mt-1 text-xs text-slate-400">Documentos finalizados por autor no mês selecionado.</p><div className="mt-5 space-y-3">{dados.ranking_emitidos.length ? dados.ranking_emitidos.map((r, i) => <div key={r.tecnico} className="flex items-start justify-between gap-4 border-b border-slate-800/70 pb-3 last:border-0 last:pb-0"><div className="flex min-w-0 gap-3"><span className="text-xs font-bold text-slate-500">{String(i + 1).padStart(2, "0")}</span><span className="break-words text-sm text-slate-200">{r.tecnico}</span></div><strong className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-sm tabular-nums text-blue-300">{numero(r.total)}</strong></div>) : <p className="py-4 text-sm text-slate-400">Nenhum relatório finalizado no período.</p>}</div><p className="mt-5 border-t border-slate-800 pt-3 text-xs text-slate-400">{numero(dados.resumo.relatorios)} finalizados · {numero(dados.resumo.rascunhos)} rascunhos</p><p className="mt-2 text-xs leading-relaxed text-blue-300">{numero(dados.resumo.internos ?? 0)} finalizado(s) na URE. Atendimentos internos sem chamado não geram pendência escolar.</p></section>
            <section className="rounded-2xl border border-amber-500/20 bg-[linear-gradient(130deg,rgba(245,158,11,0.05),#020617)] p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Próxima ação</p><h3 className="mt-2 text-base font-black text-white">{dados.resumo.pendentes ? "Conferir pendências de relatório" : "Manter os relatórios em dia"}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{dados.resumo.pendentes ? "Localize os chamados sem documento e analise as solicitações de dispensa." : "Consulte os documentos emitidos ou prepare o backup deste mês."}</p><button type="button" className={`${botao} mt-4 w-full border-amber-500/20 text-amber-200`} onClick={() => mudarAba(dados.resumo.pendentes ? "pendencias" : "backup")}>{dados.resumo.pendentes ? "Ver pendências" : "Preparar backup"}<Icone nome="seta" /></button></section>
          </div>
        </div>
        {(dados.resumo.sem_data > 0 || dados.resumo.sem_vinculo > 0) && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-200">Conferência da base: {numero(dados.resumo.sem_data)} chamado(s) sem data reconhecida e {numero(dados.resumo.sem_vinculo)} relatório(s) do mês sem vínculo reconhecido. Revise os registros para completar o acompanhamento.</p>}
      </>}

      {dados && (aba === "relatorios" || aba === "pendencias" || aba === "dispensas") && <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#020617]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-4 sm:p-5"><div><h2 className="text-lg font-black text-white">{aba === "relatorios" ? "Documentos registrados" : aba === "pendencias" ? "Chamados que exigem relatório" : "Análises e dispensas SETEC"}</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">{aba === "pendencias" ? "Rascunhos e solicitações de dispensa permanecem pendentes até a conclusão ou aprovação." : aba === "dispensas" ? "Aprovações, solicitações e revogações com justificativa e histórico." : "Abra os detalhes ou baixe os documentos finalizados."}</p></div><span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300">{numero(dados.total)} registro(s)</span></div>
        <div className="space-y-3 p-3 sm:p-5">
          {!dados.registros.length && <Vazio titulo="Nenhum registro encontrado" texto="Confira o mês, o técnico e os demais filtros selecionados." />}
          {dados.registros.map(registro => {
            if (aba === "relatorios") {
              const doc = registro as DocumentoRelatorio;
              return <article key={`${doc.tipo}:${doc.id}`} className="grid min-w-0 gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${doc.tipo === "redes" ? "bg-blue-500/10 text-blue-300" : "bg-cyan-400/10 text-cyan-300"}`}>{doc.tipo === "redes" ? "Redes" : "Equipamentos"}</span><Tag estado={doc.status} />{doc.local_atendimento === "ure" && <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-300">URE · Interno</span>}{doc.local_atendimento !== "ure" && !doc.vinculado && <span className="text-xs text-amber-300">Conferir vínculo</span>}</div><h3 className="mt-3 break-words text-sm font-black text-white">{doc.chamado_referencia || (doc.local_atendimento === "ure" ? "Atendimento na URE — sem chamado" : "Referência não preenchida")}</h3><p className="mt-1 break-words text-sm text-slate-300">{doc.escola}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>{doc.tecnico}</span><span>{dataBR(doc.data_atendimento)}</span><span>{numero(doc.itens)} {doc.tipo === "redes" ? "componente(s)" : "equipamento(s)"}</span></div></div><div className="flex flex-wrap gap-2"><button type="button" className={botao} disabled={ocupadoId === doc.id} onClick={() => void abrirDetalhe(doc)}>Ver detalhes</button>{doc.status === "finalizado" && <button type="button" className={`${botao} border-cyan-400/20 text-cyan-300`} disabled={ocupadoId === doc.id} onClick={() => void baixarPDF(doc)}><Icone nome="download" />PDF</button>}</div></article>;
            }
            const r = registro as RegistroControle;
            return <article key={r.chamado} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-all text-sm font-black text-white">{r.chamado}</h3><Tag estado={r.situacao} /></div><p className="mt-2 break-words text-sm text-slate-200">{r.escola}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>{r.tecnico}</span><span>{dataBR(r.data_referencia)}</span><span>Atendimento: {r.status_field || "sem status"}</span></div>{(r.categoria || r.subcategoria) && <p className="mt-2 text-xs text-slate-500">{[r.categoria, r.subcategoria].filter(Boolean).join(" · ")}</p>}<p className="mt-2 text-xs text-slate-400">{r.finalizados} relatório(s) finalizado(s) · {r.rascunhos} rascunho(s)</p>{erroFormatoChamado(r.chamado) && <p className="mt-3 text-xs text-amber-300">Confira o número do chamado: novos relatórios exigem o padrão STI-26/.</p>}</div><div className="flex shrink-0 flex-wrap gap-2">
              {r.situacao !== "entregue" && r.situacao !== "dispensado" && <button type="button" className={`${botao} border-blue-500/25 text-blue-300`} onClick={() => { setMensagem(null); setJustificativa(r.justificativa || ""); setAcao({ registro: r, acao: contexto.aprovar ? "aprovar" : "solicitar" }); }}><Icone nome="escudo" />{contexto.aprovar ? "Dispensar relatório" : "Solicitar dispensa"}</button>}
              {contexto.aprovar && r.dispensa_estado === "aprovada" && <button type="button" className={`${botao} text-amber-300`} onClick={() => { setMensagem(null); setJustificativa(""); setAcao({ registro: r, acao: "revogar" }); }}>Revogar dispensa</button>}
              {contexto.gestao && r.dispensa_estado && <button type="button" className={botao} disabled={ocupadoId === r.chamado} onClick={() => void abrirHistorico(r.chamado)}>Histórico</button>}
            </div></div>{r.justificativa && <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-500/5 p-3"><p className="text-xs font-bold text-blue-300">{r.dispensa_estado === "revogada" ? "Motivo da revogação" : "Justificativa"}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{r.justificativa}</p>{r.aprovado_nome && r.dispensa_estado === "aprovada" && <p className="mt-2 text-xs text-slate-400">Aprovado por {r.aprovado_nome} · {dataBR(r.aprovado_em)}</p>}</div>}</article>;
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-4 sm:p-5"><p className="text-xs text-slate-400">Página {dados.pagina} de {paginas} · até 25 registros por página</p><div className="flex gap-2"><button type="button" className={botao} disabled={carregando || pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><button type="button" className={botao} disabled={carregando || pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Próxima</button></div></div>
      </section>}

      {dados && aba === "backup" && <section className="rounded-2xl border border-slate-800 bg-[#020617] p-5 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Icone nome="download" className="h-6 w-6" /></div><h2 className="mt-4 text-xl font-black text-white">Backup mensal</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Baixe os relatórios finalizados do período, separados por tipo e técnico. Cada documento mantém os equipamentos ou componentes individuais.</p><div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4"><p className="text-xs font-bold capitalize text-cyan-300">{mesBR(filtros.mes)}</p><p className="mt-2 text-3xl font-black tabular-nums text-white">{numero(dados.resumo.relatorios)}<span className="ml-2 text-sm font-semibold text-slate-400">relatório(s)</span></p><p className="mt-2 text-xs text-slate-400">{filtros.tecnico || "Todos os técnicos disponíveis"} · {filtros.tipo === "todos" ? "Equipamentos e redes" : filtros.tipo === "redes" ? "Redes" : "Equipamentos"}</p></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" className={primario} disabled={exportando || !dados.resumo.relatorios || filtrosAlterados} onClick={() => void exportar()}><Icone nome="download" />{exportando ? "Preparando arquivos…" : "Preparar backup ZIP"}</button>{exportando && <button type="button" className={botao} onClick={() => exportacaoRef.current?.abort()}>Interromper</button>}</div>{filtrosAlterados && <p className="mt-3 text-xs text-amber-300">Aplique os filtros antes de preparar o backup.</p>}</div><div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5"><h3 className="text-sm font-black text-slate-200">O que vem no arquivo</h3><ul className="mt-4 space-y-3 text-sm text-slate-400"><li className="flex gap-3"><span className="text-cyan-300">✓</span>PDFs individuais no modelo institucional</li><li className="flex gap-3"><span className="text-cyan-300">✓</span>Versões HTML dos documentos</li><li className="flex gap-3"><span className="text-cyan-300">✓</span>Índice CSV e dados completos em JSON</li><li className="flex gap-3"><span className="text-cyan-300">✓</span>Conferência dos documentos incluídos</li></ul><p className="mt-5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">Meses maiores são divididos em partes de até 25 documentos. Baixe todas as partes e guarde no local escolhido para seu backup.</p></div></div>
        {progresso.texto && <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4" aria-live="polite"><p className="text-sm text-slate-300">{progresso.texto}</p>{progresso.total > 0 && <progress className="mt-3 h-2.5 w-full accent-cyan-400" value={progresso.preparados} max={progresso.total} aria-label="Relatórios processados no backup" />}</div>}
        {arquivos.length > 0 && <div className="mt-5 space-y-3">{arquivos.map(a => <a key={a.url} href={a.url} download={a.nome} className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 transition hover:bg-slate-800/30 ${a.falhas ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-400/20 bg-cyan-400/5"}`}><span className="mt-1 text-cyan-300"><Icone nome="download" /></span><span className="min-w-0"><span className="block break-all text-sm font-bold text-cyan-200">Baixar {a.nome}</span><span className="mt-1 block text-xs text-slate-400">{a.quantidade} PDFs · {a.falhas ? `${a.falhas} falha(s), confira falhas.csv` : "Parte concluída"}</span></span></a>)}</div>}
      </section>}
    </section>

    <p className="px-1 text-xs leading-relaxed text-slate-500">Um relatório finalizado de equipamentos ou redes atende à exigência do chamado. A dispensa depende de aprovação SETEC com justificativa.</p>

    {modalAberto && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onClick={fecharModal}>
      <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="central-modal-titulo" className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#020617] shadow-2xl outline-none" onClick={event => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 p-4 sm:p-6"><div className="min-w-0"><p className="text-xs font-bold text-cyan-300">Central de Relatórios</p><h2 id="central-modal-titulo" className="mt-1 text-lg font-black text-white">{acao ? acao.acao === "revogar" ? "Revogar dispensa" : acao.acao === "aprovar" ? "Aprovação SETEC" : "Solicitar dispensa" : detalhe ? "Detalhes do relatório" : "Histórico da dispensa"}</h2></div><button type="button" aria-label="Fechar detalhes" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50" disabled={salvandoAcao} onClick={fecharModal}><Icone nome="fechar" className="h-5 w-5" /></button></div>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {acao && <div className="space-y-4"><div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="break-words text-sm font-black text-cyan-200">{acao.registro.chamado}</p><p className="mt-1 break-words text-sm text-slate-300">{acao.registro.escola}</p></div><p className="text-sm leading-relaxed text-slate-400">{acao.acao === "revogar" ? "O chamado voltará a exigir relatório. Registre o motivo da revisão." : acao.acao === "aprovar" ? "Ao aprovar, a SETEC confirma que este chamado não necessita de relatório. A aprovação retira a pendência e registra o motivo, o responsável e a data." : "O chamado continuará pendente até a aprovação SETEC. Explique o motivo da solicitação."}</p><label className="block text-sm font-bold text-slate-300">Justificativa obrigatória<textarea className={`${campo} mt-2 min-h-36 resize-y`} value={justificativa} disabled={salvandoAcao} maxLength={2000} onChange={event => setJustificativa(event.target.value)} placeholder="Descreva o motivo da decisão." /></label><p className="text-xs text-slate-500">Entre 10 e 2.000 caracteres.</p>{mensagem && <p role="status" className="text-sm text-amber-200">{mensagem}</p>}<button type="button" className={`${primario} w-full`} disabled={salvandoAcao || justificativa.trim().length < 10} onClick={() => void decidirDispensa()}>{salvandoAcao ? "Registrando…" : acao.acao === "aprovar" ? "Aprovar dispensa e retirar pendência" : acao.acao === "revogar" ? "Revogar e restabelecer exigência" : "Enviar solicitação à SETEC"}</button></div>}
          {detalhe && <DetalhesConteudo detalhe={detalhe} />}
          {historico && <div className="space-y-3"><p className="break-words text-sm font-black text-cyan-200">{historicoChamado}</p>{historico.length ? historico.map(h => <article key={h.id} className="rounded-xl border border-slate-800 p-4"><p className="text-sm font-bold text-slate-200">{h.acao === "aprovar" ? "Dispensa aprovada" : h.acao === "revogar" ? "Dispensa revogada" : "Dispensa solicitada"}</p><p className="mt-2 text-xs text-slate-400">{h.usuario_nome} · {dataBR(h.registrado_em)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-300">{h.justificativa}</p></article>) : <Vazio titulo="Sem movimentações" texto="As decisões SETEC aparecerão neste histórico." />}</div>}
        </div>
      </div>
    </div>}
  </main>;
}

function Indicador({ titulo, valor, detalhe, tom, icone }: { titulo: string; valor: number; detalhe: string; tom: "slate" | "emerald" | "amber" | "blue"; icone: IconeNome }) {
  const cor = { slate: "text-slate-300 bg-slate-800/60 border-slate-700", emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20", amber: "text-amber-300 bg-amber-500/10 border-amber-500/20", blue: "text-blue-300 bg-blue-500/10 border-blue-500/20" }[tom];
  return <article className="min-w-0 rounded-2xl border border-slate-800 bg-[#020617] p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold leading-relaxed text-slate-400 sm:text-sm">{titulo}</p><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${cor}`}><Icone nome={icone} /></span></div><p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-white sm:text-4xl">{numero(valor)}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500 sm:text-xs">{detalhe}</p></article>;
}

const labels: Record<string, string> = {
  local_atendimento: "Local do atendimento", escola_nome: "Unidade", cie: "CIE", endereco: "Endereço", telefone: "Telefone", email: "E-mail da unidade",
  tecnico_nome: "Técnico responsável", tecnico_email: "E-mail do técnico", data_atendimento: "Data do atendimento", turno: "Turno",
  chamado_referencia: "Chamado", categoria: "Categoria", subcategoria: "Subcategoria", status: "Situação",
  resumo_atendimento: "Resumo do atendimento", observacoes_gerais: "Observações gerais", descricao_demanda: "Descrição da demanda", resolucao_origem: "Resolução da demanda",
  created_at: "Cadastrado em", updated_at: "Atualizado em", finalized_at: "Finalizado em",
  equipamento: "Equipamento", marca_modelo: "Marca e modelo", numero_serie: "Número de série", patrimonio: "Patrimônio",
  problema_relatado: "Problema apresentado", possui_problema_fisico: "Problema físico", problema_fisico_descricao: "Descrição do problema físico",
  diagnostico: "Diagnóstico", acao_realizada: "Procedimentos realizados", resultado: "Resultado", precisa_garantia: "Necessita de garantia",
  registrado_bluemonitor: "Registrado no BlueMonitor / Datamob", observacao: "Observações",
  tipo_componente: "Componente", identificacao: "Identificação", ambiente: "Ambiente", rack_origem: "Rack de origem", porta_ponto: "Porta ou ponto",
  sintoma: "Situação encontrada", testes_realizados: "Testes realizados", testes_outro: "Outros testes",
  necessita_nova_visita: "Necessita de nova visita", necessita_infraestrutura: "Necessita de infraestrutura", necessita_manutencao_ponto: "Manutenção do ponto",
  acionamento_fde: "Acionamento da FDE", acionamento_operadora: "Acionamento da operadora", necessita_garantia: "Necessita de garantia", escola_orientada: "Escola orientada",
  qtd_pontos_rede: "Pontos de rede", qtd_pontos_eletricos: "Pontos elétricos", qtd_infra_aps: "Infraestrutura para APs", ambientes_infra: "Ambientes da infraestrutura", justificativa_infra: "Justificativa da infraestrutura", chamado_infra: "Chamado de infraestrutura",
};
function DetalhesConteudo({ detalhe }: { detalhe: DetalheRelatorio }) {
  const r = detalhe.relatorio;
  const chaveItens = detalhe.tipo === "redes" ? "relatorios_redes_itens" : "pareceres_tecnicos_itens";
  const itens = Array.isArray(r[chaveItens]) ? r[chaveItens] as Array<Record<string, unknown>> : [];
  const exibir = (k: string, v: unknown): string => v === null || v === undefined || v === "" ? "Não informado" : typeof v === "boolean" ? v ? "Sim" : "Não" : Array.isArray(v) ? v.map(String).join(" · ") : ["data_atendimento", "created_at", "updated_at", "finalized_at"].includes(k) ? dataBR(String(v)) : k === "local_atendimento" ? v === "ure" ? "Atendimento na URE" : "Atendimento em escola" : k === "status" ? rotulos[String(v)] || String(v) : typeof v === "object" ? JSON.stringify(v) : String(v);
  const lista = (registro: Record<string, unknown>, ignorar: string[] = []) => <dl className="space-y-1">{Object.entries(registro).filter(([k, v]) => labels[k] && !ignorar.includes(k) && v !== null && v !== undefined && v !== "").map(([k, v]) => <div key={k} className="grid min-w-0 gap-1 border-b border-slate-800/70 py-3 last:border-0 sm:grid-cols-[175px_minmax(0,1fr)]"><dt className="text-xs font-semibold text-slate-400">{labels[k]}</dt><dd className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{exibir(k, v)}</dd></div>)}</dl>;
  return <div className="space-y-5"><section className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4"><p className="text-xs font-bold text-cyan-300">{detalhe.tipo === "redes" ? "Relatório de redes" : "Relatório de equipamentos"}</p><h3 className="mt-2 break-words text-lg font-black text-white">{String(r.chamado_referencia || (r.local_atendimento === "ure" ? "Atendimento na URE — sem chamado" : "Referência não preenchida"))}</h3><p className="mt-1 break-words text-sm text-slate-300">{String(r.escola_nome || "Unidade não informada")}</p></section><section className="rounded-xl border border-slate-800 px-4">{lista(r, ["chamado_referencia", "escola_nome"])}</section><h3 className="text-sm font-black text-cyan-200">{itens.length} {detalhe.tipo === "redes" ? "componente(s) registrado(s)" : "equipamento(s) registrado(s)"}</h3>{itens.map((item, i) => <section key={String(item.id || i)} className="rounded-xl border border-slate-800 p-4"><h4 className="border-b border-slate-800 pb-3 text-sm font-black text-slate-200">{String(i + 1).padStart(2, "0")} · {String(item.equipamento || item.tipo_componente || "Item")}</h4>{lista(item)}</section>)}</div>;
}
