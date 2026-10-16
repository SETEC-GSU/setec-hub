import type { FiltrosFields, Periodicidade } from "./types";

export function diaSaoPaulo(agora = new Date()) {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function intervaloPeriodo(tipo: Periodicidade, ano: number, indice: number) {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error("Selecione um ano válido.");
  const meses = tipo === "anual" ? 12 : tipo === "semestral" ? 6 : tipo === "trimestral" ? 3 : 1;
  const max = 12 / meses;
  if (!Number.isInteger(indice) || indice < 1 || indice > max) throw new Error("Selecione um período válido.");
  const mes = (indice - 1) * meses;
  return { inicio: iso(new Date(Date.UTC(ano, mes, 1))), fim: iso(new Date(Date.UTC(ano, mes + meses, 0))) };
}
export function filtrosIniciais(agora = new Date()): FiltrosFields {
  const hoje = diaSaoPaulo(agora), ano = Number(hoje.slice(0, 4)), indice = Number(hoje.slice(5, 7));
  return { periodicidade: "mensal", ano, indice, ...intervaloPeriodo("mensal", ano, indice),
    modalidade: "estrategico", tecnico: "", escola: "", categoria: "", status: "todos", cruzarCentral: true, detalhar: false };
}
function dataValida(d: unknown): d is string {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    Number.isFinite(Date.parse(d + "T00:00:00Z")) && iso(new Date(d + "T00:00:00Z")) === d;
}
export function validarFiltros(valor: unknown): FiltrosFields {
  if (!valor || typeof valor !== "object") throw new Error("Filtros inválidos.");
  const f = valor as FiltrosFields;
  if (!["mensal", "trimestral", "semestral", "anual", "personalizado"].includes(f.periodicidade)) throw new Error("Período inválido.");
  if (!["estrategico", "quantitativo"].includes(f.modalidade)) throw new Error("Tipo de relatório inválido.");
  if (!["todos", "realizados", "abertos", "cancelados"].includes(f.status)) throw new Error("Situação inválida.");
  if (typeof f.cruzarCentral !== "boolean" || typeof f.detalhar !== "boolean") throw new Error("Opções inválidas.");
  for (const texto of [f.tecnico, f.escola, f.categoria]) if (typeof texto !== "string" || texto.length > 250) throw new Error("Filtro de texto inválido.");
  const intervalo = f.periodicidade === "personalizado" ? { inicio: f.inicio, fim: f.fim } : intervaloPeriodo(f.periodicidade, f.ano, f.indice);
  if (!dataValida(intervalo.inicio) || !dataValida(intervalo.fim)) throw new Error("Informe datas válidas.");
  const dias = (Date.parse(intervalo.fim) - Date.parse(intervalo.inicio)) / 86_400_000 + 1;
  if (dias < 1 || dias > 366) throw new Error("O intervalo deve ter entre 1 e 366 dias. Divida períodos maiores.");
  return { ...f, ...intervalo, tecnico: f.tecnico.trim(), escola: f.escola.trim(), categoria: f.categoria.trim() };
}
export function dataBR(data: string | null | undefined) {
  return data ? data.slice(0, 10).split("-").reverse().join("/") : "Não informada";
}
export function rotuloPeriodo(f: FiltrosFields) {
  if (f.periodicidade === "mensal") return new Date(f.inicio + "T12:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  if (f.periodicidade === "anual") return `Ano ${f.ano}`;
  if (f.periodicidade === "trimestral") return `${f.indice}º trimestre de ${f.ano}`;
  if (f.periodicidade === "semestral") return `${f.indice}º semestre de ${f.ano}`;
  return `${dataBR(f.inicio)} a ${dataBR(f.fim)}`;
}
