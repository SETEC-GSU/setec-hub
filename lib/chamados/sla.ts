import { encontrarServico, servicoLegado } from "./catalogo"

// Mesmo expediente e mesmas datas sem atendimento que já estavam configurados
// na Gestão de Chamados. Alterações do calendário operacional ficam neste ponto.
export const CALENDARIO_SLA = {
  fuso: "America/Sao_Paulo", inicio: 8, fim: 18,
  diasSemExpediente: [
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21",
    "2026-05-01", "2026-06-04", "2026-07-09", "2026-09-07", "2026-10-12",
    "2026-10-28", "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-08", "2026-12-25",
  ] as readonly string[],
}
const DIA = 86_400_000, MINUTO = 60_000, MINUTOS_DIA = (CALENDARIO_SLA.fim - CALENDARIO_SLA.inicio) * 60
const feriados = new Set(CALENDARIO_SLA.diasSemExpediente)
const partesSP = new Intl.DateTimeFormat("en-CA", { timeZone: CALENDARIO_SLA.fuso,
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
const formatoPrazo = new Intl.DateTimeFormat("pt-BR", { timeZone: CALENDARIO_SLA.fuso, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
function civil(data: Date) {
  const p = Object.fromEntries(partesSP.formatToParts(data).map(v => [v.type, v.value]))
  return { dia: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60 + data.getUTCMilliseconds() / MINUTO }
}
function diaUTC(dia: string) { return Date.parse(dia + "T00:00:00Z") }
function avancarDia(dia: string, n = 1) { return new Date(diaUTC(dia) + n * DIA).toISOString().slice(0, 10) }
function diaUtil(dia: string) { const semana = new Date(diaUTC(dia)).getUTCDay(); return semana !== 0 && semana !== 6 && !feriados.has(dia) }
function instanteCivil(dia: string, minutos: number) {
  const desejado = diaUTC(dia) + minutos * MINUTO
  let instante = desejado
  for (let i = 0; i < 3; i++) {
    const p = civil(new Date(instante)), encontrado = diaUTC(p.dia) + p.minutos * MINUTO
    const ajuste = desejado - encontrado
    instante += ajuste
    if (!ajuste) break
  }
  return new Date(instante)
}
function data(v: string | Date | null | undefined): Date | null {
  if (!v) return null
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null
  // Colunas sem offset seguem o horário da operação; nunca o fuso do aparelho.
  const semFuso = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/.exec(v)
  if (semFuso && (!Number.isFinite(diaUTC(semFuso[1])) || new Date(diaUTC(semFuso[1])).toISOString().slice(0, 10) !== semFuso[1])) return null
  const d = semFuso ? instanteCivil(semFuso[1], Number(semFuso[2] || 0) * 60 + Number(semFuso[3] || 0) + Number(semFuso[4] || 0) / 60 + Number("0." + (semFuso[5] || "0")) / 60) : new Date(v)
  return Number.isFinite(d.getTime()) ? d : null
}
function diasUteisEntreDias(inicio: string, fimExclusivo: string) {
  const n = Math.max(0, Math.round((diaUTC(fimExclusivo) - diaUTC(inicio)) / DIA))
  let uteis = Math.floor(n / 7) * 5
  const semana = new Date(diaUTC(inicio)).getUTCDay()
  for (let i = 0; i < n % 7; i++) if (![0, 6].includes((semana + i) % 7)) uteis++
  for (const dia of feriados) if (dia >= inicio && dia < fimExclusivo && ![0, 6].includes(new Date(diaUTC(dia)).getUTCDay())) uteis--
  return Math.max(0, uteis)
}
export function minutosUteisEntre(inicio: string | Date | null | undefined, fim: string | Date | null | undefined): number | null {
  const a = data(inicio), b = data(fim)
  if (!a || !b || b < a) return null
  const ca = civil(a), cb = civil(b), abertura = CALENDARIO_SLA.inicio * 60, fechamento = CALENDARIO_SLA.fim * 60
  if (ca.dia === cb.dia) return diaUtil(ca.dia) ? Math.max(0, Math.min(fechamento, cb.minutos) - Math.max(abertura, ca.minutos)) : 0
  const primeiro = diaUtil(ca.dia) ? Math.max(0, fechamento - Math.max(abertura, ca.minutos)) : 0
  const ultimo = diaUtil(cb.dia) ? Math.max(0, Math.min(fechamento, cb.minutos) - abertura) : 0
  return primeiro + diasUteisEntreDias(avancarDia(ca.dia), cb.dia) * MINUTOS_DIA + ultimo
}
export function adicionarHorasUteis(inicio: string | Date, horas: number): Date | null {
  const a = data(inicio)
  if (!a || !Number.isFinite(horas) || horas < 0 || horas > 100_000) return null
  let { dia, minutos } = civil(a), restantes = horas * 60
  while (!diaUtil(dia) || minutos >= CALENDARIO_SLA.fim * 60) { dia = avancarDia(dia); minutos = CALENDARIO_SLA.inicio * 60 }
  minutos = Math.max(minutos, CALENDARIO_SLA.inicio * 60)
  while (restantes > CALENDARIO_SLA.fim * 60 - minutos) {
    restantes -= CALENDARIO_SLA.fim * 60 - minutos
    do { dia = avancarDia(dia) } while (!diaUtil(dia))
    minutos = CALENDARIO_SLA.inicio * 60
  }
  return instanteCivil(dia, minutos + restantes)
}
type ChamadoSLA = { created_at: string | null; status: string | null; prioridade?: string | null; sla_horas?: number | null;
  servico_id?: string | null; categoria?: string | null; resolved_at?: string | null; closed_at?: string | null }
export function horasSLA(chamado: ChamadoSLA) {
  if (Number.isFinite(Number(chamado.sla_horas)) && Number(chamado.sla_horas) > 0) return Number(chamado.sla_horas)
  const servico = encontrarServico(chamado.servico_id) || servicoLegado(chamado.categoria)
  if (servico) return servico.sla
  const prioridade = String(chamado.prioridade || "media").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
  return ({ critica: 4, alta: 8, media: 24, baixa: 48 } as Record<string, number>)[prioridade] || 24
}
export function formatarMinutosUteis(v: number) {
  const m = Math.max(0, Math.ceil(Math.abs(v))), h = Math.floor(m / 60), resto = m % 60
  return h ? `${h}h${resto ? ` ${resto}min` : ""} úteis` : `${m}min úteis`
}
export function calcularSLAUtil(chamado: ChamadoSLA, agora = new Date()) {
  const status = String(chamado.status || "aberto").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "_")
  const base = { label: "Sem SLA", descricao: "Data de abertura inválida ou ausente", atrasado: false, vencendo: false, minutosRestantes: 0, percent: 0, limite: null as string | null }
  if (["cancelado", "cancelada"].includes(status)) return { ...base, label: "Cancelado", descricao: "Chamado cancelado; não compõe o SLA ativo" }
  if (["resolvido", "fechado", "encerrado"].includes(status)) return { ...base, label: "Concluído", descricao: "Chamado finalizado", percent: 100 }
  if (!["aberto", "assumido", "em_atendimento"].includes(status)) return { ...base, descricao: "Situação fora do fluxo de atendimento ativo" }
  const criado = data(chamado.created_at)
  if (!criado || criado > agora) return base
  const horas = horasSLA(chamado), limite = adicionarHorasUteis(criado, horas), consumidos = minutosUteisEntre(criado, agora)
  if (!limite || consumidos === null) return base
  const atrasado = agora > limite, minutosRestantes = atrasado ? (-(minutosUteisEntre(limite, agora) || 0) || 0) : (minutosUteisEntre(agora, limite) || 0)
  return { label: atrasado ? "Atrasado" : formatarMinutosUteis(minutosRestantes),
    descricao: atrasado ? `Vencido há ${formatarMinutosUteis(-minutosRestantes)}` : `Prazo útil até ${formatoPrazo.format(limite)}`,
    atrasado, vencendo: !atrasado && minutosRestantes <= 240, minutosRestantes,
    percent: Math.max(0, Math.min(100, consumidos / (horas * 60) * 100)), limite: limite.toISOString() }
}

export function resumoSLAUtil(chamados: ChamadoSLA[], agora = new Date()) {
  let avaliados = 0, foraPrazo = 0, semDados = 0
  for (const chamado of chamados) {
    const status = String(chamado.status || "aberto").trim().toLowerCase().replace(/\s+/g, "_")
    if (!["aberto", "assumido", "em_atendimento"].includes(status)) continue
    const sla = calcularSLAUtil(chamado, agora)
    if (!sla.limite) { semDados++; continue }
    avaliados++
    if (sla.atrasado) foraPrazo++
  }
  return { avaliados, foraPrazo, dentroPrazo: avaliados - foraPrazo, semDados }
}
