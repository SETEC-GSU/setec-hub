import type { SupabaseClient } from "@supabase/supabase-js";
import { leituraComPrazo } from "./consulta";
import { nomeNormalizado } from "./chamado";

export type PendenciaCobranca = {
  chamado: string; escola: string; tecnico: string; data_referencia: string | null;
  categoria: string; subcategoria: string; situacao: string;
};
export type FiltrosCobranca = { mes: string; tecnico: string; busca: string; situacao: string };
export type OpcoesCobranca = {
  agruparPor: "tecnico" | "chamado"; escola: boolean; data: boolean;
  categoria: boolean; situacao: boolean; introducao: string;
};
export const OPCOES_COBRANCA: OpcoesCobranca = {
  agruparPor: "tecnico", escola: true, data: true, categoria: false, situacao: true,
  introducao: "Solicitamos a regularização dos relatórios técnicos pendentes relacionados abaixo. Confira os chamados e finalize o relatório correspondente no SETEC Hub.",
};

export async function buscarPendenciasCobranca(supabase: SupabaseClient,
  filtros: FiltrosCobranca, signal: AbortSignal, chamado = "") {
  const registros: PendenciaCobranca[] = [], ids = new Set<string>();
  let total: number | null = null, assinatura: string | null = null;
  for (let pagina = 1; ; pagina++) {
    if (signal.aborted) throw new Error("Preparação da cobrança cancelada.");
    const { data, error } = await leituraComPrazo(supabase.rpc("hub_relatorios_cobranca", {
      p_mes: filtros.mes, p_tecnico: filtros.tecnico, p_busca: filtros.busca,
      p_situacao: chamado ? "todos" : filtros.situacao, p_chamado: chamado, p_pagina: pagina,
    }).abortSignal(signal), "A lista demorou a carregar. Tente preparar a cobrança novamente.", 20_000);
    if (error) throw error;
    const lote = data as { total: number; assinatura: string; registros: PendenciaCobranca[] };
    if (!lote || !Number.isSafeInteger(lote.total) || lote.total < 0 ||
      typeof lote.assinatura !== "string" || !Array.isArray(lote.registros)) {
      throw new Error("Não foi possível conferir a lista de pendências. Atualize a Central e tente novamente.");
    }
    if (total === null) { total = lote.total; assinatura = lote.assinatura; }
    if (total !== lote.total || assinatura !== lote.assinatura) {
      throw new Error("As pendências mudaram durante a consulta. Gere novamente para copiar uma lista atualizada e completa.");
    }
    for (const item of lote.registros) {
      if (!item.chamado || ids.has(item.chamado) || !["pendente", "rascunho", "aguardando_aprovacao"].includes(item.situacao)) {
        throw new Error("A lista mudou durante a consulta. Prepare a cobrança novamente.");
      }
      ids.add(item.chamado); registros.push(item);
    }
    if (registros.length === total) return registros;
    if (!lote.registros.length || registros.length > total) {
      throw new Error("A consulta ficou incompleta. Nenhum texto parcial foi preparado; tente novamente.");
    }
  }
}

export function montarTextoCobranca(registros: PendenciaCobranca[], mes: string,
  opcoes: OpcoesCobranca = OPCOES_COBRANCA, geradoEm = new Date()) {
  const periodo = new Date(`${mes}-01T12:00:00-03:00`).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo", month: "long", year: "numeric",
  });
  const data = geradoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const rotulos: Record<string, string> = { pendente: "Sem relatório", rascunho: "Em rascunho", aguardando_aprovacao: "Aguardando análise SETEC" };
  const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
  const ordenados = [...registros].sort((a, b) => (opcoes.agruparPor === "tecnico" ? collator.compare(a.tecnico, b.tecnico) : 0) || collator.compare(a.chamado, b.chamado));
  const linhas = ["*PENDÊNCIAS DE RELATÓRIOS — SETEC HUB*", `Período: ${periodo}`, `Chamados pendentes: ${ordenados.length}`, "", opcoes.introducao.trim(), ""];
  let tecnicoAnterior = "";
  for (const [indice, item] of ordenados.entries()) {
    const tecnico = nomeNormalizado(item.tecnico);
    if (opcoes.agruparPor === "tecnico" && tecnico !== tecnicoAnterior) {
      if (indice > 0) linhas.push("");
      linhas.push(`*Técnico: ${item.tecnico}*`); tecnicoAnterior = tecnico;
    }
    linhas.push(`${indice + 1}. ${item.chamado}${opcoes.escola && item.escola ? ` — ${item.escola}` : ""}`);
    if (opcoes.agruparPor === "chamado") linhas.push(`   Técnico: ${item.tecnico}`);
    const detalhes: string[] = [];
    if (opcoes.data && item.data_referencia) detalhes.push(`Data de referência: ${item.data_referencia.split("-").reverse().join("/")}`);
    if (opcoes.situacao) detalhes.push(rotulos[item.situacao] || item.situacao);
    if (opcoes.categoria) detalhes.push([item.categoria, item.subcategoria].filter(Boolean).join(" / "));
    if (detalhes.length) linhas.push(`   ${detalhes.filter(Boolean).join(" · ")}`);
  }
  linhas.push("", "Cada chamado que exige documentação precisa de um relatório finalizado de equipamentos ou redes. Solicitações de dispensa permanecem pendentes até a aprovação SETEC.", "", "SETEC — URE Guarulhos Sul", `Conferido em ${data}`);
  return linhas.join("\n");
}
