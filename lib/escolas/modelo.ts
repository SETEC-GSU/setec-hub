export type CriticidadeEscola = "critica" | "atencao" | "saudavel" | "sem_dados"
type Quantidade = number | string | null
export type Escola = {
  id: string
  nome_escola: string | null
  cie?: Quantidade
  telefone?: string | null
  endereco?: string | null
  diretor?: string | null
  tipo_ensino?: string | null
  periodo?: string | null
  email?: string | null
  latitude?: Quantidade
  longitude?: Quantidade
  horario_abertura?: string | null
  horario_fechamento?: string | null
  total_alunos?: Quantidade
  qtd_salas?: Quantidade
  total_equipamentos_recebidos?: Quantidade
  total_equipamentos_funcionando?: Quantidade
  aps_instalados?: Quantidade
  status_conectividade?: string | null
  criticidade?: Quantidade
  ultima_visita?: string | null
  ultima_atualizacao?: string | null
  observacoes?: string | null
  tecnico_atribuido?: string | null
  created_at?: string | null
}

export const STATUS_ESCOLA: Record<CriticidadeEscola, { label: string; classe: string; cor: string; ordem: number }> = {
  critica: { label: "Crítica", classe: "border-red-400/25 bg-red-500/10 text-red-300", cor: "#ef4444", ordem: 0 },
  atencao: { label: "Atenção", classe: "border-amber-400/25 bg-amber-500/10 text-amber-300", cor: "#f59e0b", ordem: 1 },
  saudavel: { label: "Saudável", classe: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300", cor: "#10b981", ordem: 3 },
  sem_dados: { label: "Dados incompletos", classe: "border-slate-600 bg-slate-800/60 text-slate-300", cor: "#64748b", ordem: 2 },
}

export function texto(v: unknown, vazio = "Não informado") { return String(v ?? "").trim() || vazio }
export function normalizar(v: unknown) { return texto(v, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() }
export function quantidade(v: unknown): number | null {
  if (v === null || v === undefined || typeof v === "boolean" || (typeof v === "string" && !v.trim())) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export function numero(v: unknown) { const n = quantidade(v); return n === null ? "—" : n.toLocaleString("pt-BR") }
export function percentual(v: number | null) { return v === null ? "—" : `${Math.round(v * 100)}%` }
export function dataBR(v?: string | null) {
  if (!v) return "Sem registro"
  const dia = String(v).slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    const d = new Date(dia + "T12:00:00Z")
    if (Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === dia) return dia.split("-").reverse().join("/")
    return "Sem registro"
  }
  const d = new Date(v)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem registro"
}
export function dataHoraBR(v?: string | null) {
  if (!v) return "Sem registro"
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dataBR(v)
  const d = new Date(v)
  return Number.isFinite(d.getTime()) ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "Sem registro"
}
export function diasSemVisita(v?: string | null, agora = new Date()): number | null {
  if (!v || dataBR(v) === "Sem registro") return null
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(agora)
  const p = (tipo: string) => partes.find(parte => parte.type === tipo)?.value
  const hoje = Date.parse(`${p("year")}-${p("month")}-${p("day")}T12:00:00Z`)
  const dias = Math.floor((hoje - Date.parse(v.slice(0, 10) + "T12:00:00Z")) / 86400000)
  return Number.isFinite(dias) && dias >= 0 ? dias : null
}

export function coordenadas(e: Pick<Escola, "latitude" | "longitude">): [number, number] | null {
  const ler = (v: unknown) => typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.trim().replace(",", ".")) : NaN
  const lat = ler(e.latitude), lng = ler(e.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85.05112878 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null
  return [lat, lng]
}
export function rotaEscola(e: Escola) {
  const ponto = coordenadas(e), destino = ponto ? ponto.join(",") : texto(e.endereco, "")
  return destino ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}` : ""
}
export function telefoneEscola(e: Escola) {
  const telefone = texto(e.telefone, "").replace(/[^\d+]/g, "")
  return /\d/.test(telefone) ? `tel:${telefone}` : ""
}
export function emailEscola(e: Escola) {
  const emails = texto(e.email, "").split(/[,;]/).map(v => v.trim()).filter(Boolean)
  return emails.length && emails.every(email => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) ? `mailto:${emails.map(encodeURIComponent).join(",")}?subject=${encodeURIComponent(`Contato SETEC — ${texto(e.nome_escola, "Unidade escolar")}`)}` : ""
}

export function indicadoresEscola(e: Escola) {
  const alunos = quantidade(e.total_alunos), salas = quantidade(e.qtd_salas), aps = quantidade(e.aps_instalados)
  const recebidos = quantidade(e.total_equipamentos_recebidos), funcionando = quantidade(e.total_equipamentos_funcionando)
  const referenciaEquip = alunos !== null && alunos > 0 ? alunos / 3 : null
  const referenciaAP = salas !== null && salas > 0 ? salas / 2 : null
  const indiceEquip = referenciaEquip !== null && funcionando !== null ? Math.min(funcionando / referenciaEquip, 1) : null
  const indiceAP = referenciaAP !== null && aps !== null ? Math.min(aps / referenciaAP, 1) : null
  const score = indiceEquip !== null && indiceAP !== null ? indiceEquip * .6 + indiceAP * .4 : null
  const criticidade: CriticidadeEscola = score === null ? "sem_dados" : score < .6 ? "critica" : score < .8 ? "atencao" : "saudavel"
  const divergencia = funcionando !== null && recebidos !== null && funcionando > recebidos
  const operacional = funcionando !== null && recebidos !== null && recebidos > 0 && !divergencia ? funcionando / recebidos : null
  const faltando: string[] = []
  if (referenciaEquip === null) faltando.push("total de alunos")
  if (funcionando === null) faltando.push("equipamentos funcionando")
  if (referenciaAP === null) faltando.push("quantidade de salas")
  if (aps === null) faltando.push("APs instalados")
  return { alunos, salas, aps, recebidos, funcionando, referenciaEquip, referenciaAP, indiceEquip, indiceAP, score, criticidade, operacional, divergencia, faltando,
    deficitEquip: referenciaEquip !== null && funcionando !== null ? Math.max(0, Math.ceil(referenciaEquip - funcionando)) : null,
    deficitAP: referenciaAP !== null && aps !== null ? Math.max(0, Math.ceil(referenciaAP - aps)) : null }
}
export type IndicadoresEscola = ReturnType<typeof indicadoresEscola>
export type EscolaPainel = Escola & { indicadores: IndicadoresEscola; busca: string; ponto: [number, number] | null }
export function prepararEscola(e: Escola): EscolaPainel {
  return { ...e, indicadores: indicadoresEscola(e), ponto: coordenadas(e), busca: normalizar([e.nome_escola, e.cie, e.endereco, e.diretor, e.telefone, e.email, e.tecnico_atribuido, e.tipo_ensino, e.periodo].join(" ")) }
}
