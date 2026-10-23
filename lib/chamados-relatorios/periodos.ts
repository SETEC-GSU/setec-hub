import type { FiltrosHub, PeriodicidadeHub } from "./types";
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const diaSaoPaulo = (agora = new Date()) => agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export function intervaloPeriodo(tipo: PeriodicidadeHub, ano: number, indice: number) {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error("Selecione um ano entre 2000 e 2100.");
  const meses = tipo === "anual" ? 12 : tipo === "semestral" ? 6 : tipo === "trimestral" ? 3 : 1;
  if (!Number.isInteger(indice) || indice < 1 || indice > 12 / meses) throw new Error("Selecione um período válido.");
  const mes = (indice - 1) * meses;
  return { inicio: iso(new Date(Date.UTC(ano, mes, 1))), fim: iso(new Date(Date.UTC(ano, mes + meses, 0))) };
}
export function filtrosIniciais(agora = new Date()): FiltrosHub {
  const hoje = diaSaoPaulo(agora), ano = Number(hoje.slice(0, 4)), indice = Number(hoje.slice(5, 7));
  return { periodicidade: "mensal", ano, indice, ...intervaloPeriodo("mensal", ano, indice), modalidade: "estrategico",
    referencia: "conclusao", responsavel: "", unidade: "", categoria: "", origem: "", prioridade: "",
    status: "atendidos", busca: "", detalhar: false };
}
function dataValida(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + "T00:00:00Z")) && iso(new Date(v + "T00:00:00Z")) === v;
}
export function validarFiltros(valor: unknown): FiltrosHub {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Filtros inválidos.");
  const f = valor as FiltrosHub;
  if (!["mensal", "trimestral", "semestral", "anual", "personalizado"].includes(f.periodicidade)) throw new Error("Período inválido.");
  if (!["estrategico", "quantitativo"].includes(f.modalidade)) throw new Error("Tipo de relatório inválido.");
  if (!["conclusao", "abertura"].includes(f.referencia)) throw new Error("Data de referência inválida.");
  if (!["todos", "atendidos", "ativos", "aberto", "assumido", "em_atendimento", "resolvido", "fechado", "cancelado", "outros"].includes(f.status)) throw new Error("Situação inválida.");
  if (f.referencia === "conclusao" && !["atendidos", "resolvido", "fechado"].includes(f.status)) throw new Error("Pela data de conclusão, selecione atendidos, resolvidos ou fechados. Para analisar os demais, use a data de abertura.");
  if (typeof f.detalhar !== "boolean") throw new Error("Opção de detalhamento inválida.");
  for (const v of [f.responsavel, f.unidade, f.categoria, f.origem, f.prioridade, f.busca]) if (typeof v !== "string" || v.length > 250) throw new Error("Filtro de texto inválido.");
  if (f.responsavel && f.responsavel !== "__sem_responsavel__" && !/^[a-f0-9-]{36}$/i.test(f.responsavel)) throw new Error("Responsável inválido.");
  if (f.prioridade && !["critica", "alta", "media", "baixa", "nao_informada"].includes(f.prioridade)) throw new Error("Prioridade inválida.");
  const intervalo = f.periodicidade === "personalizado" ? { inicio: f.inicio, fim: f.fim } : intervaloPeriodo(f.periodicidade, f.ano, f.indice);
  if (!dataValida(intervalo.inicio) || !dataValida(intervalo.fim)) throw new Error("Informe datas válidas.");
  if (intervalo.inicio < "2000-01-01" || intervalo.fim > "2100-12-31") throw new Error("Use datas entre 2000 e 2100.");
  const dias = (Date.parse(intervalo.fim) - Date.parse(intervalo.inicio)) / 86_400_000 + 1;
  if (dias < 1 || dias > 366) throw new Error("Selecione de 1 a 366 dias. Divida intervalos maiores.");
  // Lista explícita: campos desconhecidos não participam da consulta nem da assinatura.
  return { periodicidade: f.periodicidade, ano: Number(intervalo.inicio.slice(0, 4)), indice: f.periodicidade === "personalizado" ? 1 : f.indice,
    ...intervalo, modalidade: f.modalidade, referencia: f.referencia, responsavel: f.responsavel.trim(), unidade: f.unidade.trim(),
    categoria: f.categoria.trim(), origem: f.origem.trim(), prioridade: f.prioridade, status: f.status, busca: f.busca.trim(), detalhar: f.detalhar };
}
export function dataBR(v: string | null | undefined) { return v ? v.slice(0, 10).split("-").reverse().join("/") : "Não informada"; }
export function rotuloPeriodo(f: FiltrosHub) {
  if (f.periodicidade === "mensal") return new Date(f.inicio + "T12:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  if (f.periodicidade === "anual") return `Ano ${f.ano}`;
  if (f.periodicidade === "semestral") return `${f.indice}º semestre de ${f.ano}`;
  if (f.periodicidade === "trimestral") return `${f.indice}º trimestre de ${f.ano}`;
  return `${dataBR(f.inicio)} a ${dataBR(f.fim)}`;
}
// Encontra o início civil de cada dia com o próprio Intl. Também respeita
// eventuais regras históricas de horário de verão do fuso de São Paulo.
function inicioDoDia(dia: string) {
  const centro = Date.parse(dia + "T00:00:00Z");
  let menor = centro - 18 * 3_600_000, maior = centro + 18 * 3_600_000;
  while (menor < maior) {
    const meio = Math.floor((menor + maior) / 2);
    if (diaSaoPaulo(new Date(meio)) < dia) menor = meio + 1; else maior = meio;
  }
  return new Date(menor).toISOString();
}
export function limitesPeriodo(f: FiltrosHub) {
  const proximo = new Date(f.fim + "T12:00:00Z"); proximo.setUTCDate(proximo.getUTCDate() + 1);
  return { inicio: inicioDoDia(f.inicio), fimExclusivo: inicioDoDia(iso(proximo)) };
}
