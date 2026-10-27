"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"
import Modal from "@/components/saresp/ModalSaresp"
import pageStyles from "@/components/saresp/SarespPage.module.css"
import { conferirDemandaSaresp, coberturaNoPeriodo, dataValida, deslocarDiaUtil, fimPeriodo, formatarPeriodo, mensagemErroSaresp, periodosSobrepostos } from "@/lib/saresp/operacao"
import { montarConferenciaSaresp, montarEmailSaresp, montarGuiaSaresp, montarPlanoSaresp } from "@/lib/saresp/documentos"


type SarespEdicao = {
  id: string
  titulo: string
  ano: number
  data_prova_padrao: string | null
  data_prova_fim_padrao: string | null
  serie_padrao: string | null
  status: string
  fonte_equipamentos: string
  reserva_tecnica_padrao: number
  margem_atencao: number
  distancia_maxima_km: number | null
  descricao: string | null
  created_at: string | null
  updated_at: string | null
}

type SarespResultado = {
  demanda_id: string
  edicao_id: string
  edicao_titulo: string | null
  ano: number | null
  edicao_status: string | null
  fonte_equipamentos: string | null
  reserva_tecnica_padrao: number | null
  margem_atencao: number | null
  cie: string | null
  cie_limpo: string | null
  escola_id: string | null
  escola_nome: string | null
  data_prova: string | null
  data_prova_fim: string | null
  serie: string | null
  alunos_manha: number | null
  alunos_tarde: number | null
  alunos_noite: number | null
  total_alunos_planilha: number | null
  total_alunos_calculado: number | null
  maior_turno: number | null
  turno_critico: string | null
  equipamentos_planilha: number | null
  equipamentos_inventario: number | null
  situacao_inventario: string
  notebooks_funcionando: number | null
  tablets_funcionando: number | null
  desktops_ped_funcionando: number | null
  ultima_atualizacao_inventario: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  diretor: string | null
  latitude: number | null
  longitude: number | null
  tecnico_atribuido: string | null
  equipamentos_base: number | null
  capacidade_util: number | null
  demanda_considerada: number | null
  saldo: number | null
  deficit: number | null
  sobra: number | null
  status_calculado: string | null
  necessidade_texto: string | null
}

type SarespDoadora = {
  edicao_id: string
  edicao_titulo: string | null
  ano: number | null
  reserva_tecnica_padrao: number | null
  distancia_maxima_km: number | null
  escola_id: string | null
  nome_escola: string | null
  cie: string | null
  cie_limpo: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  diretor: string | null
  latitude: number | null
  longitude: number | null
  tecnico_atribuido: string | null
  equipamentos_base: number | null
  fonte_capacidade: string | null
  sobra_disponivel: number | null
  status_doadora: string | null
  data_prova: string | null
  data_prova_fim: string | null
  reservados: number | null
  uso_proprio: number | null
}

type SarespSugestao = {
  edicao_id: string
  demanda_id: string
  destino_id: string | null
  destino_cie: string | null
  destino_nome: string | null
  data_prova: string | null
  data_prova_fim: string | null
  serie: string | null
  turno_critico: string | null
  demanda_considerada: number | null
  capacidade_util: number | null
  deficit: number | null
  origem_id: string | null
  origem_cie: string | null
  origem_nome: string | null
  sobra_disponivel: number | null
  fonte_capacidade: string | null
  distancia_km: number | null
  quantidade_sugerida: number | null
}

type SarespRemanejamento = {
  id: string
  edicao_id: string
  escola_origem_id: string | null
  escola_origem_cie: string | null
  escola_origem_nome: string | null
  escola_destino_id: string | null
  escola_destino_cie: string | null
  escola_destino_nome: string | null
  quantidade: number | null
  data_prova: string | null
  data_prova_fim: string | null
  turno_referencia: string | null
  distancia_km: number | null
  status: string
  responsavel_retirada: string | null
  data_retirada: string | null
  observacao: string | null
  created_at: string | null
  updated_at: string | null
  concluido_em: string | null
}

type Escola = {
  id: string
  nome_escola: string | null
  cie: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  diretor: string | null
  latitude: number | null
  longitude: number | null
  tecnico_atribuido: string | null
  total_equipamentos_funcionando: number | null
}

type EquipamentoModelo = {
  id?: string | null
  equipamento?: string | null
  tipo?: string | null
  marca?: string | null
  uso?: string | null
  finalidade?: string | null
}

type EquipamentoRecebidoRow = {
  escola_nome: string | null
  modelo_id: string | null
  quantidade_recebida: number | null
}

type InventarioRespostaRow = {
  id: string
  escola_nome: string | null
  created_at: string | null
}

type InventarioItemRow = {
  inventario_id: string | null
  modelo_id: string | null
  funcionando: number | null
}

type EscolaDetalhe = {
  id: string
  nome_escola: string | null
  cie: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  diretor: string | null
}

type CsvLinha = {
  cie: string
  escola: string
  alunos_manha: number
  alunos_tarde: number
  alunos_noite: number
  total_alunos: number
  equipamentos_cadastrados: number
  linha_original: number
}

type Feedback = {
  tipo: "success" | "error" | "info" | "warning"
  texto: string
} | null

type EmailGerado = {
  assunto: string
  corpo: string
  destinatarios: string
  remanejamento: SarespRemanejamento
} | null

type ImportResumo = {
  arquivo: string
  linhasLidas: number
  linhasValidas: number
  linhasIgnoradas: number
  processadas?: number
  encontradas?: number
  naoEncontradas?: number
} | null

type SugestaoStatusInfo = {
  label: string
  description: string
  badge: string
  dot: string
  tone: "red" | "yellow" | "blue" | "emerald" | "cyan"
}

type SugestaoFiltroStatus =
  | "todos"
  | "pendente_remanejamento"
  | "pendente_aprovacao"
  | "concluido"
  | "em_atencao"
  | "sem_indicacao"
  | "validar_inventario"

type SugestaoGrupo = {
  destino: string
  resultado: SarespResultado | null
  sugestoes: SarespSugestao[]
  statusInfo: SugestaoStatusInfo
  statusFiltro: SugestaoFiltroStatus | "plano_parcial" | "atendido" | "margem_atendida"
  planejado: number
  deficit: number
  metaComGordura: number
  pendente: number
  pendenteComGordura: number
  turnoCritico: string | null
  tipo: "deficit" | "atencao" | "sem_indicacao"
}

const GORDURA_OPERACIONAL_PERCENTUAL = 0.1
const GORDURA_OPERACIONAL_MINIMA = 5
const RAIO_MINIMO_SUGESTOES_KM = 6.5
const SUGESTOES_INICIAIS_POR_ESCOLA = 2
const LIMITE_SUGESTOES_EXPANDIDAS = 20

const STATUS_FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "precisa_remanejamento", label: "Déficit" },
  { value: "sem_inventario", label: "Conferir inventário (referência)" },
  { value: "atencao", label: "Atenção" },
  { value: "atende", label: "Atende" },
  { value: "sem_demanda", label: "Sem demanda" },
]

const STATUS_FILTROS_SUGESTOES: {
  value: SugestaoFiltroStatus
  label: string
  icon: string
  description: string
}[] = [
  {
    value: "todos",
    label: "Todos",
    icon: "🧭",
    description: "Todas as escolas importadas",
  },
  {
    value: "pendente_remanejamento",
    label: "Pendente de remanejamento",
    icon: "🚨",
    description: "Ainda falta incluir no plano",
  },
  {
    value: "pendente_aprovacao",
    label: "Pendente de aprovação",
    icon: "🟡",
    description: "Já está no plano e aguarda aprovação",
  },
  {
    value: "concluido",
    label: "Concluído",
    icon: "✅",
    description: "Remanejamento concluído",
  },
  {
    value: "em_atencao",
    label: "Em atenção",
    icon: "⚠️",
    description: "Escolas em alerta, mesmo sem déficit crítico",
  },
  {
    value: "sem_indicacao",
    label: "Sem indicação",
    icon: "🟢",
    description: "Sem déficit automático, mas disponível para ajuste manual",
  },
  { value:"validar_inventario", label:"Conferir inventário (referência)", icon:"📦", description:"Escolas sem base confirmada de equipamentos funcionando" },
]

const ABAS = [
  { value: "painel", label: "Painel", icon: "📊", detail: "execução" },
  { value: "importacao", label: "Importação", icon: "📥", detail: "CSV" },
  { value: "diagnostico", label: "Diagnóstico", icon: "🧭", detail: "escolas" },
  { value: "sugestoes", label: "Sugestões", icon: "🗺️", detail: "rotas" },
  { value: "plano", label: "Plano", icon: "📋", detail: "e-mails" },
  { value: "doadoras", label: "Doadoras", icon: "🏫", detail: "sobra" },
]

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function numeroSeguro(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function normalizarHeader(value: unknown) {
  return normalizar(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function limparCie(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "")
  return digits.replace(/^0+/, "") || digits
}

function limparNumero(value: unknown) {
  const text = String(value ?? "").trim()
  if (!text) return 0

  const onlyDigits = text.replace(/[^\d-]/g, "")
  const number = Number(onlyDigits || 0)

  return Number.isFinite(number) ? number : 0
}

function calcularGorduraOperacional(deficit: unknown) {
  const base = numeroSeguro(deficit)

  if (base <= 0) return 0

  return Math.max(
    GORDURA_OPERACIONAL_MINIMA,
    Math.ceil(base * GORDURA_OPERACIONAL_PERCENTUAL)
  )
}

function calcularMetaComGordura(deficit: unknown) {
  const base = numeroSeguro(deficit)

  if (base <= 0) return 0

  return base + calcularGorduraOperacional(base)
}

function formatarData(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatarDataHora(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatarNumero(value: unknown) {
  return numeroSeguro(value).toLocaleString("pt-BR")
}

function formatarDistancia(value: unknown) {
  const number = Number(value)

  if (!Number.isFinite(number)) return "-"

  return `${number.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`
}

function parseDataIsoLocal(value?: string | null) {
  if (!value) return null

  const text = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  const date = new Date(text)

  if (Number.isNaN(date.getTime())) return null

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toIsoDateLocal(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function isFimDeSemana(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function ajustarParaDiaUtil(date: Date, direcao: "anterior" | "posterior") {
  const adjusted = new Date(date)

  while (isFimDeSemana(adjusted)) {
    adjusted.setDate(adjusted.getDate() + (direcao === "posterior" ? 1 : -1))
  }

  return adjusted
}

function adicionarDiasUteis(value?: string | null, quantidade = 1) {
  const base = parseDataIsoLocal(value)

  if (!base) return null

  const date = new Date(base)
  let adicionados = 0

  while (adicionados < quantidade) {
    date.setDate(date.getDate() + 1)

    if (!isFimDeSemana(date)) {
      adicionados += 1
    }
  }

  return date
}

function subtrairDiasUteis(value?: string | null, quantidade = 1) {
  const base = parseDataIsoLocal(value)

  if (!base) return null

  const date = new Date(base)
  let removidos = 0

  while (removidos < quantidade) {
    date.setDate(date.getDate() - 1)

    if (!isFimDeSemana(date)) {
      removidos += 1
    }
  }

  return date
}

function getDataRetiradaPrevista(value?: string | null) { return deslocarDiaUtil(value,-1) }
function getDataDevolucaoPrevista(value?: string | null) { return deslocarDiaUtil(value,1) }

function getDataProvaReferencia(remanejamento?: Partial<SarespRemanejamento> | null, edicao?: SarespEdicao | null) {
  return remanejamento?.data_prova || edicao?.data_prova_padrao || null
}

function getDataRetiradaFormatada(value?: string | null) {
  const retirada = getDataRetiradaPrevista(value)
  return retirada ? formatarData(retirada) : "A combinar"
}

function getDataDevolucaoFormatada(value?: string | null) {
  const devolucao = getDataDevolucaoPrevista(value)
  return devolucao ? formatarData(devolucao) : "A combinar"
}

function escaparHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escaparCsv(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function baixarArquivo(nomeArquivo: string, conteudo: string, mimeType: string) {
  const blob = new Blob([conteudo], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

function slugArquivo(value: unknown) {
  return normalizar(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "saresp-digital"
}

function getNomeArquivoPlano(edicao?: SarespEdicao | null, extensao = "xls") {
  const data = new Date()
  const stamp = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`
  return `plano-final-saresp-${slugArquivo(edicao?.titulo || edicao?.ano || "edicao")}-${stamp}.${extensao}`
}

function slugEscolaArquivo(value: unknown, fallback: string) {
  const slug = normalizar(value || fallback)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)

  return (slug || normalizar(fallback).replace(/[^a-z0-9]+/g, "-")).toUpperCase()
}

function getNomeArquivoGuia(remanejamento: SarespRemanejamento, extensao = "pdf") {
  const origem = slugEscolaArquivo(
    remanejamento.escola_origem_nome || remanejamento.escola_origem_cie,
    "UNIDADE-CEDENTE"
  )

  const destino = slugEscolaArquivo(
    remanejamento.escola_destino_nome || remanejamento.escola_destino_cie,
    "UNIDADE-CONTEMPLADA"
  )

  return `GUIA-REMESSA-SARESP-${origem}-PARA-${destino}.${extensao}`
}

function getOrientacoesInstitucionaisTexto() {
  return [
    "Atenção aos equipamentos recebidos em empréstimo: a unidade contemplada deverá zelar por todos os aspectos de guarda, conferência, etiquetas patrimoniais, identificações e integridade física dos equipamentos durante todo o período de utilização.",
    "As unidades cedentes, em sua maioria, são escolas de Ciclo I, que possuem quantitativo reduzido de equipamentos para uso cotidiano. Por esse motivo, os itens emprestados devem ser manuseados, armazenados e devolvidos com máximo cuidado.",
    "Caso algum equipamento recebido em empréstimo já chegue à unidade contemplada com dano, ausência de teclas, tela quebrada, falha de funcionamento ou qualquer outra divergência, a direção da escola cedente deverá ser comunicada imediatamente, com ciência à SETEC.",
    "Os equipamentos deverão permanecer guardados em local seguro durante todo o processo, com servidor responsável pela conferência diária dos itens emprestados, inclusive antes e após a aplicação.",
    "A retirada deverá ocorrer, preferencialmente, um dia útil antes da data da prova, em horário a ser combinado diretamente entre as unidades escolares envolvidas.",
    "A devolução deverá ocorrer, preferencialmente, um dia útil após a data da prova, em horário a ser combinado diretamente entre as unidades escolares envolvidas.",
    "O termo de remanejamento/guia de remessa deverá informar a quantidade remanejada entre as escolas. As duas vias deverão ser assinadas e enviadas à SETEC após a retirada dos equipamentos.",
    "As movimentações deverão ser formalizadas por Relação de Remessa, com a quantidade remanejada entre as unidades e duas vias assinadas pelas escolas envolvidas.",
    "O remanejamento considera as necessidades e possibilidades de uso de equipamentos em cada Unidade Escolar, de acordo com a infraestrutura lógica e tecnológica local, priorizando tablets e notebooks como equipamentos remanejáveis quando aplicável.",
    "Todas as unidades envolvidas deverão cumprir o procedimento conforme orientação da COINTEC/SEDUC, uma vez que se trata de organização estadual para viabilização das provas digitais agendadas.",
  ]
}

function getOrientacoesInstitucionaisHtml() {
  return getOrientacoesInstitucionaisTexto()
    .map((item) => `<li>${escaparHtml(item)}</li>`)
    .join("")
}

function getTurnoLabel(turno?: string | null) {
  const value = normalizar(turno)

  if (value === "manha") return "Manhã"
  if (value === "tarde") return "Tarde"
  if (value === "noite") return "Noite"

  return textoSeguro(turno, "-")
}

function isTipoPermitidoSaresp(tipo?: string | null) {
  const tipoNormalizado = normalizar(tipo).replace(/\s+/g, " ")

  return (
    tipoNormalizado === "notebook" ||
    tipoNormalizado === "tablet" ||
    tipoNormalizado === "desktop ped"
  )
}

function isEquipamentoSaresp(modelo?: EquipamentoModelo | null) {
  if (!modelo) return false

  return isTipoPermitidoSaresp(modelo.tipo)
}

function haversineKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
) {
  const aLat = Number(lat1)
  const aLon = Number(lon1)
  const bLat = Number(lat2)
  const bLon = Number(lon2)

  if (
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLon) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLon)
  ) {
    return null
  }

  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Number((earthRadiusKm * c).toFixed(2))
}

function getStatusConfig(status?: string | null) {
  const value = textoSeguro(status, "sem_demanda")

  if (value === "sem_inventario") return {label:"Conferir inventário (referência)",short:"Validar inventário",badge:"border-orange-500/30 bg-orange-500/10 text-orange-300",dot:"bg-orange-400"}
  if (value === "precisa_remanejamento") {
    return {
      label: "Precisa remanejamento",
      short: "Déficit",
      badge: "border-red-500/30 bg-red-500/10 text-red-300",
      dot: "bg-red-400",
    }
  }

  if (value === "atencao") {
    return {
      label: "Atenção",
      short: "Atenção",
      badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
      dot: "bg-yellow-400",
    }
  }

  if (value === "atende") {
    return {
      label: "Atende",
      short: "Atende",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
    }
  }

  return {
    label: "Sem demanda",
    short: "Sem demanda",
    badge: "border-slate-700 bg-slate-900 text-slate-400",
    dot: "bg-slate-500",
  }
}

function getRemanejamentoStatus(status: string) {
  if (status === "aprovado") {
    return {
      label: "Aprovado",
      badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",
      dot: "bg-blue-400",
    }
  }

  if (status === "concluido") {
    return {
      label: "Concluído",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
    }
  }

  if (status === "cancelado") {
    return {
      label: "Cancelado",
      badge: "border-red-500/30 bg-red-500/10 text-red-300",
      dot: "bg-red-400",
    }
  }

  return {
    label: "Sugerido",
    badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    dot: "bg-yellow-400",
  }
}

function getErrorMessage(error: unknown) { return mensagemErroSaresp(error) }

function detectarDelimitador(headerLine: string) {
  const opcoes = [",", ";", "\t"]

  return opcoes
    .map((delimitador) => ({
      delimitador,
      count: headerLine.split(delimitador).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimitador
}

function parseCsvLine(line: string, delimiter: string) {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  result.push(current.trim())

  return result
}

function headerToKey(header: string) {
  const key = normalizarHeader(header)

  if (key === "cie" || key === "ci" || key.includes("codigo")) return "cie"

  if (
    key === "escola" ||
    key === "nome_escola" ||
    key.includes("unidade") ||
    key.includes("ue")
  ) {
    return "escola"
  }

  if (key.includes("manha")) return "alunos_manha"
  if (key.includes("tarde")) return "alunos_tarde"
  if (key.includes("noite")) return "alunos_noite"
  if (key.includes("total") && key.includes("aluno")) return "total_alunos"

  if (key.includes("cadastrad") && !key.includes("aluno")) {
    return "equipamentos_cadastrados"
  }

  return key
}

function parseCsvSaresp(text: string) {
  const conteudo = text.replace(/^\uFEFF/, "").replace(/\r\n/g,"\n").replace(/\r/g,"\n")
  const delimiter = detectarDelimitador(conteudo.split("\n").find(l=>l.trim()) || "")
  const registros: {valores:string[];linha:number}[] = []
  let valores:string[] = [], campo="", aspas=false, linha=1, inicioLinha=1
  for (let i=0;i<conteudo.length;i++) {
    const c=conteudo[i]
    if(c==='"') { if(aspas && conteudo[i+1]==='"'){campo+='"';i++} else aspas=!aspas }
    else if(c===delimiter && !aspas) {valores.push(campo.trim());campo=""}
    else if(c==="\n" && !aspas) { valores.push(campo.trim()); if(valores.some(Boolean)) registros.push({valores,linha:inicioLinha});valores=[];campo="";inicioLinha=linha+1 }
    else campo+=c
    if(c==="\n") linha++
  }
  if(aspas) throw new Error("O CSV contém aspas sem fechamento. Exporte novamente o arquivo.")
  valores.push(campo.trim());if(valores.some(Boolean)) registros.push({valores,linha:inicioLinha})
  if(registros.length<2) return {rows:[] as CsvLinha[],lidas:0,ignoradas:0}
  const headers=registros[0].valores.map(h=>{
    const normal=normalizarHeader(h)
    if(normal==="codesc") return "cie"
    if(normal==="nomesc") return "escola"
    return headerToKey(h)
  })
  if(!headers.includes("cie") || !headers.includes("escola") || !headers.some(h=>["alunos_manha","alunos_tarde","alunos_noite"].includes(h))) throw new Error("Confira os cabeçalhos do CSV: CIE, Escola e alunos separados por turno são necessários.")
  if (!headers.includes("equipamentos_cadastrados")) throw new Error("Inclua a coluna Equipamentos cadastrados no CSV: ela é a base da necessidade de remanejamento.")
  const reconhecidos = headers.filter(h => ["cie","escola","alunos_manha","alunos_tarde","alunos_noite","total_alunos","equipamentos_cadastrados"].includes(h))
  if (new Set(reconhecidos).size !== reconhecidos.length) throw new Error("Há cabeçalhos repetidos ou ambíguos no CSV. Mantenha apenas uma coluna para Equipamentos cadastrados e para cada turno.")
  const inteiro=(valor:string, linha:number, nome:string, opcional=false)=>{
    const t=(valor || "").trim().replace(/\s/g,"")
    if(!t || (opcional && /^(pendente|n[aã]o informado|-|n\/a)$/i.test(t))) return 0
    const normal=/^\d{1,3}(\.\d{3})+$/.test(t)?t.replace(/\./g,""):t.replace(",",".")
    const n=Number(normal)
    if(!Number.isSafeInteger(n) || n<0 || n>10000000) throw new Error(`Linha ${linha}: quantidade inválida em ${nome}. Informe um inteiro zero ou maior.`)
    return n
  }
  const rows:CsvLinha[]=[], vistos=new Set<string>();let ignoradas=0
  for(const registro of registros.slice(1)) {
    const raw:Record<string,string>={};headers.forEach((h,i)=>{raw[h]=registro.valores[i]||""})
    const cie=textoSeguro(raw.cie), escola=textoSeguro(raw.escola), chave=limparCie(cie)
    if(!cie || !escola || !chave) throw new Error(`Linha ${registro.linha}: informe CIE e escola válidos.`)
    if(vistos.has(chave)) throw new Error(`CIE ${chave} aparece mais de uma vez. Consolide os turnos da escola antes de importar.`)
    vistos.add(chave)
    const manha=inteiro(raw.alunos_manha,registro.linha,"Manhã"), tarde=inteiro(raw.alunos_tarde,registro.linha,"Tarde"), noite=inteiro(raw.alunos_noite,registro.linha,"Noite")
    if (!(raw.equipamentos_cadastrados || "").trim()) throw new Error(`Linha ${registro.linha}: preencha Equipamentos cadastrados. Se não houver, informe 0 explicitamente.`)
    rows.push({cie,escola,alunos_manha:manha,alunos_tarde:tarde,alunos_noite:noite,total_alunos:inteiro(raw.total_alunos,registro.linha,"Total") || manha+tarde+noite,equipamentos_cadastrados:inteiro(raw.equipamentos_cadastrados,registro.linha,"Equipamentos cadastrados"),linha_original:registro.linha})
  }
  if(rows.length>5000) throw new Error("O CSV deve conter até 5.000 escolas por importação.")
  return {rows,lidas:registros.length-1,ignoradas}
}

export default function CentralSarespPage() {
  const supabase = useMemo(() => createClient(), [])

  const [edicoes, setEdicoes] = useState<SarespEdicao[]>([])
  const [edicaoId, setEdicaoId] = useState("")
  const [resultados, setResultados] = useState<SarespResultado[]>([])
  const [doadoras, setDoadoras] = useState<SarespDoadora[]>([])
  const [sugestoesView, setSugestoesView] = useState<SarespSugestao[]>([])
  const [remanejamentos, setRemanejamentos] = useState<SarespRemanejamento[]>([])
  const [podeGerenciar, setPodeGerenciar] = useState(false)
  const [alertasPlano, setAlertasPlano] = useState<{id:string;origem:string;destino:string;quantidade:number;disponivel:number}[]>([])
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null)
  const consultaRef = useRef(0)
  const controladorRef = useRef<AbortController | null>(null)

  const [aba, setAba] = useState("painel")
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroEscolaSugestao, setFiltroEscolaSugestao] = useState("todas")
  const [filtroStatusSugestao, setFiltroStatusSugestao] =
    useState<SugestaoFiltroStatus>("todos")
  const [gruposSugestoesExpandidos, setGruposSugestoesExpandidos] = useState<
    Record<string, boolean>
  >({})
  const [loading, setLoading] = useState(true)
  const [loadingDados, setLoadingDados] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [zerando, setZerando] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [emailGerado, setEmailGerado] = useState<EmailGerado>(null)
  const [resultadoDetalhe, setResultadoDetalhe] = useState<SarespResultado | null>(null)

  const [csvRows, setCsvRows] = useState<CsvLinha[]>([])
  const [importResumo, setImportResumo] = useState<ImportResumo>(null)
  const [dataProvaImport, setDataProvaImport] = useState("")
  const [dataProvaFimImport, setDataProvaFimImport] = useState("")
  const [serieImport, setSerieImport] = useState("3ª série EM")

  const [sugestaoSelecionada, setSugestaoSelecionada] = useState<SarespSugestao | null>(null)
  const [quantidadePlano, setQuantidadePlano] = useState<number | "">("")

  const edicaoSelecionada = useMemo(() => {
    return edicoes.find((item) => item.id === edicaoId) || null
  }, [edicaoId, edicoes])

  const raioSugestoesKm = useMemo(() => {
    return Math.max(
      numeroSeguro(edicaoSelecionada?.distancia_maxima_km) || 10,
      0.1
    )
  }, [edicaoSelecionada?.distancia_maxima_km])

  useEffect(() => {
    if (!edicaoSelecionada) return

    setDataProvaImport(edicaoSelecionada.data_prova_padrao || "")
    setDataProvaFimImport(edicaoSelecionada.data_prova_fim_padrao || "")
    setSerieImport(edicaoSelecionada.serie_padrao || "3ª série EM")
  }, [edicaoSelecionada?.id])

  const carregarEdicoes = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from("saresp_edicoes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const lista = (data || []) as SarespEdicao[]
      setEdicoes(lista)

      setEdicaoId((current) => {
        if (current && lista.some(item => item.id === current)) return current

        const ativa = lista.find((item) => item.status === "ativo") || lista[0]
        return ativa?.id || ""
      })
    } catch (error) {
      console.error("[Central SARESP] Erro ao carregar edições:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const carregarDadosEdicao = useCallback(async (id: string) => {
    controladorRef.current?.abort()
    const requisicao = ++consultaRef.current
    if (!id) { setResultados([]); setDoadoras([]); setSugestoesView([]); setRemanejamentos([]); return }
    const controlador = new AbortController()
    controladorRef.current = controlador
    const prazo = window.setTimeout(() => controlador.abort(), 25000)
    setLoadingDados(true)
    try {
      const { data, error } = await supabase.rpc("hub_saresp_contexto", { p_edicao_id: id }).abortSignal(controlador.signal)
      if (error) throw error
      if (consultaRef.current !== requisicao) return
      const base = data as { versao:number; resultados:SarespResultado[]; doadoras:SarespDoadora[]; sugestoes:SarespSugestao[]; remanejamentos:SarespRemanejamento[]; pode_gerenciar:boolean; gerado_em:string; alertas:{id:string;origem:string;destino:string;quantidade:number;disponivel:number}[] }
      if (!base || base.versao!==2 || !Array.isArray(base.resultados) || !Array.isArray(base.doadoras) || !Array.isArray(base.sugestoes) || !Array.isArray(base.remanejamentos)) throw new Error("Aplique o SQL 014-saresp-necessidade-cadastrados.sql para calcular a necessidade pelos equipamentos cadastrados; depois atualize a página.")
      setResultados(base.resultados); setDoadoras(base.doadoras); setSugestoesView(base.sugestoes); setRemanejamentos(base.remanejamentos)
      setPodeGerenciar(Boolean(base.pode_gerenciar)); setAlertasPlano(base.alertas || []); setAtualizadoEm(base.gerado_em)
    } catch (error) {
      if (consultaRef.current === requisicao) setFeedback({ tipo:"error", texto:getErrorMessage(error) })
    } finally {
      window.clearTimeout(prazo)
      if (consultaRef.current === requisicao) setLoadingDados(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarEdicoes()
  }, [carregarEdicoes])

  useEffect(() => {
    setResultados([]); setDoadoras([]); setSugestoesView([]); setRemanejamentos([]); setAlertasPlano([]); setAtualizadoEm(null)
    if (edicaoId) carregarDadosEdicao(edicaoId)
    return () => { ++consultaRef.current; controladorRef.current?.abort() }
  }, [carregarDadosEdicao, edicaoId])

  useEffect(() => {
    setGruposSugestoesExpandidos({})
  }, [edicaoId])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  const resultadosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return resultados.filter((item) => {
      const matchBusca = termo
        ? [
            item.escola_nome,
            item.cie,
            item.necessidade_texto,
            item.turno_critico,
            item.serie,
            item.tecnico_atribuido,
          ]
            .map(normalizar)
            .join(" ")
            .includes(termo)
        : true

      const matchStatus =
        filtroStatus === "todos" ? true : filtroStatus === "sem_inventario" ? item.situacao_inventario !== "confirmado" : item.status_calculado === filtroStatus

      return matchBusca && matchStatus
    })
  }, [busca, filtroStatus, resultados])

  const doadorasDisponiveis = useMemo(() => {
    return doadoras.filter((item) => numeroSeguro(item.sobra_disponivel) > 0)
  }, [doadoras])

  function getRemanejamentosAtivosParaDestino(
    destinoId?: string | null,
    destinoNome?: string | null,
    edicaoRef?: string | null,
    inicio?: string | null, fim?: string | null
  ) {
    return remanejamentos.filter((item) => {
      if (item.status === "cancelado") return false
      if (edicaoRef && item.edicao_id !== edicaoRef) return false

      const matchId = destinoId && item.escola_destino_id === destinoId
      const matchNome = !destinoId && Boolean(destinoNome) && normalizar(item.escola_destino_nome) === normalizar(destinoNome)
      const periodo = !inicio || periodosSobrepostos(item.data_prova, item.data_prova_fim, inicio, fim)
      return Boolean(matchId || matchNome) && periodo
    })
  }

  function getPlanejadoParaDestino(sugestao: SarespSugestao) {
    return coberturaNoPeriodo(getRemanejamentosAtivosParaDestino(sugestao.destino_id, sugestao.destino_nome, sugestao.edicao_id), sugestao.data_prova, sugestao.data_prova_fim)
  }
  function getPlanejadoParaResultado(resultado: SarespResultado) {
    return conferirDemandaSaresp(resultado, remanejamentos).previsto
  }

  function getPendenteParaDestino(sugestao: SarespSugestao) {
    return Math.max(numeroSeguro(sugestao.deficit) - getPlanejadoParaDestino(sugestao), 0)
  }

  function getMetaComGorduraParaDestino(sugestao: SarespSugestao) {
    return calcularMetaComGordura(sugestao.deficit)
  }

  function getGorduraParaDestino(sugestao: SarespSugestao) {
    return calcularGorduraOperacional(sugestao.deficit)
  }

  function getPendenteComGorduraParaDestino(sugestao: SarespSugestao) {
    return Math.max(
      getMetaComGorduraParaDestino(sugestao) - getPlanejadoParaDestino(sugestao),
      0
    )
  }

  function getLimiteQuantidadeSugestao(sugestao: SarespSugestao) {
    const sobraOrigem = numeroSeguro(sugestao.sobra_disponivel)
    // Pode superar o déficit, mas respeita o saldo confirmado para o período.
    return Math.max(sobraOrigem, 0)
  }

  function getStatusOperacionalResultado(resultado: SarespResultado): SugestaoStatusInfo {
    if (resultado.status_calculado === "sem_inventario") return {
      label:"Conferir inventário (referência)", description:"Não há inventário confirmado para calcular a capacidade desta escola. O total recebido não é usado como disponibilidade.",
      badge:"border-orange-500/30 bg-orange-500/10 text-orange-300", dot:"bg-orange-400", tone:"yellow",
    }
    const planejado = getPlanejadoParaResultado(resultado)
    const deficit = numeroSeguro(resultado.deficit)
    const metaComGordura = calcularMetaComGordura(resultado.deficit)
    const itensAtivos = getRemanejamentosAtivosParaDestino(
      resultado.escola_id,
      resultado.escola_nome,
      resultado.edicao_id, resultado.data_prova, resultado.data_prova_fim
    )

    const temPendenteAprovacao = itensAtivos.some((item) => item.status === "sugerido")
    const todosConcluidos =
      itensAtivos.length > 0 && itensAtivos.every((item) => item.status === "concluido")

    // Primeiro respeita o fluxo real do plano. Assim, mesmo uma escola sem déficit
    // automático pode aparecer como pendente de aprovação ou concluída se você
    // incluir remanejamento manual por oscilação, logística ou reserva operacional.
    if (temPendenteAprovacao) {
      return {
        label: "Pendente de aprovação",
        description: "A escola já possui item no plano, mas ainda aguarda aprovação.",
        badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
        dot: "bg-yellow-400",
        tone: "yellow",
      }
    }

    if (todosConcluidos && planejado > 0) {
      return {
        label: "Concluído",
        description: "O remanejamento desta escola já foi marcado como concluído no plano.",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        tone: "emerald",
      }
    }

    if (resultado.status_calculado === "atencao" && deficit <= 0) {
      return {
        label: "Em atenção",
        description:
          "A escola está em atenção. Não há déficit crítico calculado, mas ela permanece visível para acompanhamento preventivo e remanejamento manual, se necessário.",
        badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
        dot: "bg-yellow-400",
        tone: "yellow",
      }
    }

    if (deficit <= 0) {
      return {
        label: "Sem indicação automática",
        description:
          "A escola não possui déficit calculado pela regra automática, mas permanece disponível para análise e inclusão manual no plano, caso haja oscilação de equipamentos ou necessidade operacional.",
        badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        tone: "emerald",
      }
    }

    if (planejado <= 0) {
      return {
        label: "Pendente de remanejamento",
        description: "Ainda não há quantidade incluída no plano para esta escola.",
        badge: "border-red-500/30 bg-red-500/10 text-red-300",
        dot: "bg-red-400",
        tone: "red",
      }
    }

    if (planejado < deficit) {
      return {
        label: "Plano parcial",
        description: "Já existe quantidade no plano, mas ainda não cobre o déficit calculado.",
        badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
        dot: "bg-yellow-400",
        tone: "yellow",
      }
    }


    if (planejado >= metaComGordura) {
      return {
        label: "Necessidade + margem atendida",
        description: "A quantidade planejada cobre o déficit e a margem operacional.",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        tone: "emerald",
      }
    }

    return {
      label: "Necessidade atendida",
      description: "A quantidade planejada cobre o déficit calculado.",
      badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",
      dot: "bg-blue-400",
      tone: "blue",
    }
  }

  function getStatusOperacionalSugestao(sugestao: SarespSugestao): SugestaoStatusInfo {
    const resultado = resultados.find((item) => {
      const matchId = sugestao.destino_id && item.escola_id === sugestao.destino_id
      const matchNome = !sugestao.destino_id && normalizar(item.escola_nome) === normalizar(sugestao.destino_nome)
      return item.demanda_id === sugestao.demanda_id && Boolean(matchId || matchNome)
    })

    if (resultado) return getStatusOperacionalResultado(resultado)

    const planejado = getPlanejadoParaDestino(sugestao)
    const deficit = numeroSeguro(sugestao.deficit)
    const metaComGordura = getMetaComGorduraParaDestino(sugestao)
    const itensAtivos = getRemanejamentosAtivosParaDestino(
      sugestao.destino_id,
      sugestao.destino_nome,
      sugestao.edicao_id, sugestao.data_prova, sugestao.data_prova_fim
    )

    const temPendenteAprovacao = itensAtivos.some((item) => item.status === "sugerido")
    const todosConcluidos =
      itensAtivos.length > 0 && itensAtivos.every((item) => item.status === "concluido")

    if (deficit <= 0) {
      return {
        label: "Sem déficit",
        description: "A escola não possui déficit calculado para esta edição.",
        badge: "border-slate-700 bg-slate-900 text-slate-300",
        dot: "bg-slate-400",
        tone: "cyan",
      }
    }

    if (planejado <= 0) {
      return {
        label: "Pendente de remanejamento",
        description: "Ainda não há quantidade incluída no plano para esta escola.",
        badge: "border-red-500/30 bg-red-500/10 text-red-300",
        dot: "bg-red-400",
        tone: "red",
      }
    }

    if (planejado < deficit) {
      return {
        label: "Plano parcial",
        description: "Já existe quantidade no plano, mas ainda não cobre o déficit calculado.",
        badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
        dot: "bg-yellow-400",
        tone: "yellow",
      }
    }

    if (temPendenteAprovacao) {
      return {
        label: "Pendente de aprovação",
        description: "A necessidade já entrou no plano, mas ainda possui item aguardando aprovação.",
        badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
        dot: "bg-yellow-400",
        tone: "yellow",
      }
    }

    if (todosConcluidos && planejado >= deficit) {
      return {
        label: "Concluído",
        description: "O remanejamento desta escola já foi marcado como concluído no plano.",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        tone: "emerald",
      }
    }

    if (planejado >= metaComGordura) {
      return {
        label: "Necessidade + margem atendida",
        description: "A quantidade planejada cobre o déficit e a margem operacional.",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        tone: "emerald",
      }
    }

    return {
      label: "Necessidade atendida",
      description: "A quantidade planejada cobre o déficit calculado.",
      badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",
      dot: "bg-blue-400",
      tone: "blue",
    }
  }

  function getFiltroStatusSugestaoPorResultado(resultado: SarespResultado): SugestaoGrupo["statusFiltro"] {
    const statusInfo = getStatusOperacionalResultado(resultado)
    if (resultado.status_calculado==="sem_inventario") return "validar_inventario"

    if (statusInfo.label === "Pendente de remanejamento" || statusInfo.label === "Plano parcial") {
      return "pendente_remanejamento"
    }

    if (statusInfo.label === "Pendente de aprovação") {
      return "pendente_aprovacao"
    }

    if (statusInfo.label === "Concluído") {
      return "concluido"
    }

    if (statusInfo.label === "Em atenção") {
      return "em_atencao"
    }

    if (statusInfo.label === "Sem indicação automática" || statusInfo.label === "Sem déficit") {
      return "sem_indicacao"
    }

    if (statusInfo.label === "Necessidade + margem atendida") {
      return "margem_atendida"
    }

    if (statusInfo.label === "Necessidade atendida") {
      return "atendido"
    }

    return "todos"
  }

  const sugestoes = useMemo(() => sugestoesView, [sugestoesView])

  const resultadosBaseSugestoes = useMemo(() => {
    return resultados
      .filter((item) => item.edicao_id === edicaoId)
      .sort((a, b) => {
        const prioridade = (item: SarespResultado) => {
          const statusInfo = getStatusOperacionalResultado(item)
          if (statusInfo.label === "Pendente de remanejamento" || statusInfo.label === "Plano parcial") return 0
          if (statusInfo.label === "Pendente de aprovação") return 1
          if (statusInfo.label === "Em atenção") return 2
          if (statusInfo.label === "Concluído") return 5
          if (statusInfo.label === "Sem indicação automática") return 4
          return 3
        }

        const prioridadeA = prioridade(a)
        const prioridadeB = prioridade(b)
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB
        return textoSeguro(a.escola_nome).localeCompare(textoSeguro(b.escola_nome), "pt-BR")
      })
  }, [edicaoId, resultados, remanejamentos])

  const sugestaoEscolasFiltroOpcoes = useMemo(() => {
    return resultadosBaseSugestoes
      .map((item) => ({
        id: item.escola_id || item.demanda_id || textoSeguro(item.escola_nome),
        nome: textoSeguro(item.escola_nome, "Escola não informada"),
        cie: textoSeguro(item.cie, ""),
      }))
      .filter((item) => item.id && item.nome)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
  }, [resultadosBaseSugestoes])

  const sugestoesAgrupadas = useMemo<SugestaoGrupo[]>(() => {
    const map = new Map<string, SugestaoGrupo>()

    resultadosBaseSugestoes.forEach((resultado) => {
      const key = resultado.demanda_id
      if (!key) return

      const statusInfo = getStatusOperacionalResultado(resultado)
      const planejado = getPlanejadoParaResultado(resultado)
      const deficit = numeroSeguro(resultado.deficit)
      const metaComGordura = calcularMetaComGordura(resultado.deficit)
      const pendente = Math.max(deficit - planejado, 0)
      const pendenteComGordura = Math.max(metaComGordura - planejado, 0)

      map.set(key, {
        destino: textoSeguro(resultado.escola_nome, "Escola não informada"),
        resultado,
        sugestoes: [],
        statusInfo,
        statusFiltro: getFiltroStatusSugestaoPorResultado(resultado),
        planejado,
        deficit,
        metaComGordura,
        pendente,
        pendenteComGordura,
        turnoCritico: resultado.turno_critico,
        tipo:
          resultado.status_calculado === "atencao" && deficit <= 0
            ? "atencao"
            : deficit > 0
              ? "deficit"
              : "sem_indicacao",
      })
    })

    sugestoes.forEach((sugestao) => {
      const key = sugestao.demanda_id
      if (!key) return

      if (!map.has(key)) {
        const statusInfo = getStatusOperacionalSugestao(sugestao)
        const planejado = getPlanejadoParaDestino(sugestao)
        const deficit = numeroSeguro(sugestao.deficit)
        const metaComGordura = getMetaComGorduraParaDestino(sugestao)
        const pendente = Math.max(deficit - planejado, 0)
        const pendenteComGordura = Math.max(metaComGordura - planejado, 0)

        map.set(key, {
          destino: textoSeguro(sugestao.destino_nome, "Escola não informada"),
          resultado: null,
          sugestoes: [],
          statusInfo,
          statusFiltro:
            statusInfo.label === "Pendente de aprovação"
              ? "pendente_aprovacao"
              : statusInfo.label === "Concluído"
                ? "concluido"
                : statusInfo.label === "Em atenção"
                  ? "em_atencao"
                  : statusInfo.label === "Sem indicação automática" || statusInfo.label === "Sem déficit"
                    ? "sem_indicacao"
                    : statusInfo.label === "Pendente de remanejamento" || statusInfo.label === "Plano parcial"
                      ? "pendente_remanejamento"
                      : "atendido",
          planejado,
          deficit,
          metaComGordura,
          pendente,
          pendenteComGordura,
          turnoCritico: sugestao.turno_critico,
          tipo: "deficit",
        })
      }

      const grupo = map.get(key)
      if (!grupo) return

      if (grupo.sugestoes.length < LIMITE_SUGESTOES_EXPANDIDAS) {
        grupo.sugestoes.push(sugestao)
      }
    })

    return Array.from(map.values())
      .filter((grupo) => {
        const escolaFiltroOk =
          filtroEscolaSugestao === "todas" ||
          grupo.resultado?.escola_id === filtroEscolaSugestao ||
          grupo.resultado?.demanda_id === filtroEscolaSugestao ||
          grupo.destino === filtroEscolaSugestao

        const statusFiltroOk =
          filtroStatusSugestao === "todos" || (filtroStatusSugestao === "validar_inventario" ? grupo.resultado?.situacao_inventario !== "confirmado" : grupo.statusFiltro === filtroStatusSugestao)

        return escolaFiltroOk && statusFiltroOk
      })
      .sort((a, b) => {
        const prioridade = (grupo: SugestaoGrupo) => {
          if (grupo.statusFiltro === "pendente_remanejamento") return 0
          if (grupo.statusFiltro === "pendente_aprovacao") return 1
          if (grupo.statusFiltro === "em_atencao") return 2
          if (grupo.statusFiltro === "sem_indicacao") return 4
          if (grupo.statusFiltro === "concluido") return 5
          return 3
        }

        const prioridadeA = prioridade(a)
        const prioridadeB = prioridade(b)
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB
        return a.destino.localeCompare(b.destino, "pt-BR", { sensitivity: "base" })
      })
  }, [
    sugestoes,
    resultadosBaseSugestoes,
    remanejamentos,
    filtroEscolaSugestao,
    filtroStatusSugestao,
  ])

  const estatisticas = useMemo(() => {
    const escolasAplicam = resultados.length

    const escolasDeficit = resultados.filter(
      (item) => item.status_calculado === "precisa_remanejamento"
    ).length

    const escolasAtencao = resultados.filter(
      (item) => item.status_calculado === "atencao"
    ).length

    const escolasAtendem = resultados.filter(
      (item) => item.status_calculado === "atende"
    ).length

    const deficitTotal = resultados.reduce(
      (acc, item) => acc + numeroSeguro(item.deficit),
      0
    )

    const gorduraTotal = resultados
      .filter((item) => numeroSeguro(item.deficit) > 0)
      .reduce((acc, item) => acc + calcularGorduraOperacional(item.deficit), 0)

    const metaComGorduraTotal = deficitTotal + gorduraTotal

    const demandaTotal = resultados.reduce(
      (acc, item) => acc + numeroSeguro(item.demanda_considerada),
      0
    )

    const capacidadeTotal = resultados.reduce(
      (acc, item) => acc + numeroSeguro(item.capacidade_util),
      0
    )

    const remanejavel = doadorasDisponiveis.reduce(
      (acc, item) => acc + numeroSeguro(item.sobra_disponivel),
      0
    )

    const maiorDeficit = resultados.reduce((maior, item) => {
      const deficit = numeroSeguro(item.deficit)
      return deficit > maior ? deficit : maior
    }, 0)

    const planoAtivo = remanejamentos.filter((item) => item.status !== "cancelado")
    const pendentesAprovacao = remanejamentos.filter((item) => item.status === "sugerido")
    const aprovadosExecucao = remanejamentos.filter((item) => item.status === "aprovado")
    const concluidos = remanejamentos.filter((item) => item.status === "concluido")
    const cancelados = remanejamentos.filter((item) => item.status === "cancelado")

    const quantidadePlanejada = planoAtivo.reduce(
      (acc, item) => acc + numeroSeguro(item.quantidade),
      0
    )

    const quantidadePendenteAprovacao = pendentesAprovacao.reduce(
      (acc, item) => acc + numeroSeguro(item.quantidade),
      0
    )

    const quantidadeAprovadaExecucao = aprovadosExecucao.reduce(
      (acc, item) => acc + numeroSeguro(item.quantidade),
      0
    )

    const quantidadeConcluida = concluidos.reduce(
      (acc, item) => acc + numeroSeguro(item.quantidade),
      0
    )

    const resultadosComDeficit = resultados.filter(
      (item) => numeroSeguro(item.deficit) > 0
    )

    const resultadosPendentesRemanejamento = resultadosComDeficit.filter(item => getPlanejadoParaResultado(item) < numeroSeguro(item.deficit))
    const quantidadePendenteRemanejamento = resultadosPendentesRemanejamento.reduce((soma,item) => soma+Math.max(numeroSeguro(item.deficit)-getPlanejadoParaResultado(item),0),0)
    const resultadosAtendidosNoPlano = resultadosComDeficit.filter(item => getPlanejadoParaResultado(item) >= numeroSeguro(item.deficit))

    return {
      escolasAplicam,
      escolasDeficit,
      escolasAtencao,
      escolasAtendem,
      deficitTotal,
      gorduraTotal,
      metaComGorduraTotal,
      demandaTotal,
      capacidadeTotal,
      remanejavel,
      maiorDeficit,
      planoAtivo: planoAtivo.length,
      pendentesRemanejamento: resultadosPendentesRemanejamento.length,
      quantidadePendenteRemanejamento,
      resultadosPendentesRemanejamento,
      pendentesAprovacao: pendentesAprovacao.length,
      quantidadePendenteAprovacao,
      aprovadosExecucao: aprovadosExecucao.length,
      quantidadeAprovadaExecucao,
      concluidos: concluidos.length,
      cancelados: cancelados.length,
      resultadosAtendidosNoPlano: resultadosAtendidosNoPlano.length,
      quantidadePlanejada,
      quantidadeConcluida,
    }
  }, [doadorasDisponiveis, remanejamentos, resultados])

  async function recarregarTudo() {
    await carregarEdicoes()

    if (edicaoId) {
      await carregarDadosEdicao(edicaoId)
    }
  }

  function handleArquivoCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const text = String(reader.result || "")
        const parsed = parseCsvSaresp(text)

        setCsvRows(parsed.rows)
        setImportResumo({
          arquivo: file.name,
          linhasLidas: parsed.lidas,
          linhasValidas: parsed.rows.length,
          linhasIgnoradas: parsed.ignoradas,
        })

        setFeedback({
          tipo: parsed.rows.length > 0 ? "success" : "warning",
          texto:
            parsed.rows.length > 0
              ? `CSV lido com sucesso: ${parsed.rows.length} linha(s) válida(s).`
              : "CSV lido, mas nenhuma linha válida foi encontrada. Verifique os cabeçalhos.",
        })
      } catch (error) {
        console.error("[Central SARESP] Erro ao ler CSV:", error)
        setCsvRows([])
        setImportResumo(null)
        setFeedback({
          tipo: "error",
          texto: getErrorMessage(error),
        })
      }
    }

    reader.onerror = () => {
      setFeedback({
        tipo: "error",
        texto: "Erro ao carregar o arquivo CSV.",
      })
    }

    reader.readAsText(file, "UTF-8")
  }



  async function zerarEdicaoAtual() {
    if (!edicaoId || !podeGerenciar) return

    const confirmado = window.confirm(
      "Deseja zerar os dados processados desta edição? Isso removerá demandas importadas e plano de remanejamento desta edição."
    )

    if (!confirmado) return

    setZerando(true)
    setFeedback(null)

    try {
      const { error } = await supabase.rpc("hub_saresp_zerar_edicao", { p_edicao_id: edicaoId })
      if (error) throw error


      setCsvRows([])
      setImportResumo(null)
      setResultados([])
      setDoadoras([])
      setSugestoesView([])
      setRemanejamentos([])
      setAba("importacao")

      setFeedback({
        tipo: "success",
        texto: "Edição zerada com sucesso. Você já pode importar uma nova planilha.",
      })

      await carregarDadosEdicao(edicaoId)
    } catch (error) {
      console.error("[Central SARESP] Erro ao zerar edição:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setZerando(false)
    }
  }

  async function importarCsvEProcessar() {
    if (!podeGerenciar) { setFeedback({tipo:"warning",texto:"Seu perfil possui acesso de consulta."}); return }
    if (!edicaoId) {
      setFeedback({
        tipo: "warning",
        texto: "Selecione uma edição SARESP antes de importar.",
      })
      return
    }

    if (!dataValida(dataProvaImport) || (dataProvaFimImport && (!dataValida(dataProvaFimImport) || dataProvaFimImport<dataProvaImport))) {
      setFeedback({
        tipo: "warning",
        texto: "Confira as datas: o fim deve ser igual ou posterior ao início da aplicação.",
      })
      return
    }

    if (csvRows.length === 0) {
      setFeedback({
        tipo: "warning",
        texto: "Selecione um CSV válido antes de processar.",
      })
      return
    }

    setImportando(true)
    setFeedback(null)

    try {
      const registros = csvRows.map((row) => ({
        cie: row.cie,
        escola: row.escola,
        alunos_manha: row.alunos_manha,
        alunos_tarde: row.alunos_tarde,
        alunos_noite: row.alunos_noite,
        total_alunos: row.total_alunos,
        equipamentos_cadastrados: row.equipamentos_cadastrados,
      }))

      const { data, error } = await supabase.rpc("hub_saresp_importar", {
        p_edicao_id: edicaoId, p_data_prova: dataProvaImport,
        p_data_prova_fim: dataProvaFimImport || dataProvaImport,
        p_serie: serieImport.trim(), p_linhas: registros,
      })

      if (error) throw error

      const retorno = Array.isArray(data) ? data[0] : data

      setImportResumo((prev) => ({
        arquivo: prev?.arquivo || "CSV importado",
        linhasLidas: prev?.linhasLidas || csvRows.length,
        linhasValidas: prev?.linhasValidas || csvRows.length,
        linhasIgnoradas: prev?.linhasIgnoradas || 0,
        processadas: numeroSeguro(retorno?.linhas_processadas),
        encontradas: numeroSeguro(retorno?.escolas_encontradas),
        naoEncontradas: numeroSeguro(retorno?.escolas_nao_encontradas),
      }))

      setFeedback({
        tipo: "success",
        texto: "Importação processada com sucesso. Diagnóstico atualizado.",
      })

      await carregarDadosEdicao(edicaoId)
      setAba("diagnostico")
    } catch (error) {
      console.error("[Central SARESP] Erro ao importar CSV:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setImportando(false)
    }
  }

  function abrirModalQuantidadePlano(sugestao: SarespSugestao) {
    const referencia = getLimiteQuantidadeSugestao(sugestao)

    setSugestaoSelecionada(sugestao)
    setQuantidadePlano(Math.min(referencia, Math.max(getPendenteComGorduraParaDestino(sugestao), numeroSeguro(sugestao.quantidade_sugerida), 1)))
  }

  function fecharModalQuantidadePlano() {
    setSugestaoSelecionada(null)
    setQuantidadePlano("")
  }

  async function adicionarSugestaoAoPlano(
    sugestao: SarespSugestao,
    quantidadeInformada: number
  ) {
    const quantidade = Number(quantidadeInformada)
    const referencia = getLimiteQuantidadeSugestao(sugestao)

    if (!edicaoId || quantidade <= 0 || !Number.isSafeInteger(quantidade)) {
      setFeedback({
        tipo: "warning",
        texto: "Informe uma quantidade válida para adicionar ao plano.",
      })
      return
    }

    if (!podeGerenciar) return
    if (quantidade > numeroSeguro(sugestao.sobra_disponivel)) { setFeedback({tipo:"warning",texto:"A quantidade ultrapassa o saldo de notebooks e tablets funcionando para este período."}); return }
    const jaExiste = remanejamentos.some((item) => {
      return (
        item.status !== "cancelado" &&
        item.escola_origem_id === sugestao.origem_id &&
        item.escola_destino_id === sugestao.destino_id &&
        item.edicao_id === sugestao.edicao_id &&
        periodosSobrepostos(item.data_prova,item.data_prova_fim,sugestao.data_prova,sugestao.data_prova_fim)
      )
    })

    if (jaExiste) {
      setFeedback({
        tipo: "warning",
        texto:
          "Já existe um remanejamento ativo entre essas escolas nesta edição. Cancele o item no plano antes de recriar com outra quantidade.",
      })
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase.from("saresp_remanejamentos").insert({
        edicao_id: sugestao.edicao_id,
        escola_origem_id: sugestao.origem_id || null,
        escola_origem_cie: sugestao.origem_cie || null,
        escola_origem_nome: textoSeguro(sugestao.origem_nome, "Escola origem"),
        escola_destino_id: sugestao.destino_id || null,
        escola_destino_cie: sugestao.destino_cie || null,
        escola_destino_nome: textoSeguro(sugestao.destino_nome, "Escola destino"),
        quantidade,
        data_prova:
          sugestao.data_prova || edicaoSelecionada?.data_prova_padrao || null,
        data_prova_fim: sugestao.data_prova_fim || sugestao.data_prova || edicaoSelecionada?.data_prova_fim_padrao || edicaoSelecionada?.data_prova_padrao || null,
        turno_referencia: sugestao.turno_critico || null,
        distancia_km: sugestao.distancia_km || null,
        status: "sugerido",
        observacao:
          `Sugestão configurada manualmente pela Central SARESP. ` +
          `Déficit original: ${numeroSeguro(sugestao.deficit)}. ` +
          `Gordura operacional sugerida: ${getGorduraParaDestino(sugestao)}. ` +
          `Meta com gordura: ${getMetaComGorduraParaDestino(sugestao)}. ` +
          `Referência automática apresentada: ${referencia}. ` +
          `Quantidade enviada ao plano: ${quantidade}. ` +
          `Quantidade permitida manualmente para atender condições reais de aplicação e logística.`,
      })

      if (error) throw error

      setFeedback({
        tipo: "success",
        texto: `${quantidade} equipamento(s) adicionados ao plano de remanejamento.`,
      })

      fecharModalQuantidadePlano()
      setAba("plano")
      await carregarDadosEdicao(edicaoId)
    } catch (error) {
      console.error("[Central SARESP] Erro ao adicionar plano:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarStatusRemanejamento(
    remanejamento: SarespRemanejamento,
    novoStatus: "sugerido" | "aprovado" | "concluido" | "cancelado"
  ) {
    if (!podeGerenciar) return
    setSalvando(true)

    try {
      const payload: Record<string, unknown> = {
        status: novoStatus,
        concluido_em: novoStatus === "concluido" ? new Date().toISOString() : null,
      }

      const { error } = await supabase
        .from("saresp_remanejamentos")
        .update(payload)
        .eq("id", remanejamento.id)

      if (error) throw error

      setFeedback({
        tipo: "success",
        texto: `Remanejamento marcado como ${
          getRemanejamentoStatus(novoStatus).label
        }.`,
      })

      await carregarDadosEdicao(edicaoId)
    } catch (error) {
      console.error("[Central SARESP] Erro ao atualizar status:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function buscarEscolaDetalhe(id?: string | null) {
    if (!id) return null

    const { data, error } = await supabase
      .from("escolas")
      .select("id, nome_escola, cie, endereco, telefone, email, diretor")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("[Central SARESP] Erro ao buscar escola:", error)
      return null
    }

    return data as EscolaDetalhe | null
  }

  async function gerarEmailRemanejamento(remanejamento: SarespRemanejamento) {
    setSalvando(true)

    try {
      const [origem, destino] = await Promise.all([
        buscarEscolaDetalhe(remanejamento.escola_origem_id),
        buscarEscolaDetalhe(remanejamento.escola_destino_id),
      ])

      const { assunto, corpo, destinatarios } = montarEmailSaresp(edicaoSelecionada, remanejamento, origem, destino)

      setEmailGerado({
        assunto,
        corpo,
        destinatarios,
        remanejamento,
      })
    } catch (error) {
      console.error("[Central SARESP] Erro ao gerar e-mail:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setSalvando(false)
    }
  }


  function getRemanejamentosAtivos() {
    return remanejamentos.filter((item) => item.status !== "cancelado")
  }

  function montarLinhasPlanilhaPlanoFinal() {
    return getRemanejamentosAtivos().map((item) => {
      const dataProvaRef = getDataProvaReferencia(item, edicaoSelecionada)

      return {
        "Edição": edicaoSelecionada?.titulo || item.edicao_id,
        "Status": getRemanejamentoStatus(item.status).label,
        "Origem": textoSeguro(item.escola_origem_nome, "Não informado"),
        "CIE origem": textoSeguro(item.escola_origem_cie, "Não informado"),
        "Destino": textoSeguro(item.escola_destino_nome, "Não informado"),
        "CIE destino": textoSeguro(item.escola_destino_cie, "Não informado"),
        "Quantidade": numeroSeguro(item.quantidade),
        "Início da aplicação": formatarData(dataProvaRef),
        "Fim da aplicação": formatarData(fimPeriodo(item,edicaoSelecionada)),
        "Retirada prevista": getDataRetiradaFormatada(dataProvaRef),
        "Devolução prevista": getDataDevolucaoFormatada(fimPeriodo(item,edicaoSelecionada)),
        "Horário": "A combinar entre as escolas",
        "Turno de referência": getTurnoLabel(item.turno_referencia),
        "Distância aproximada": formatarDistancia(item.distancia_km),
        "Responsável retirada": textoSeguro(item.responsavel_retirada, ""),
        "Data retirada registrada": formatarData(item.data_retirada),
        "Criado em": formatarDataHora(item.created_at),
        "Concluído em": formatarDataHora(item.concluido_em),
        "Observação": textoSeguro(item.observacao, ""),
      }
    })
  }

  function montarHtmlExcelPlanoFinal() {
    const linhas = montarLinhasPlanilhaPlanoFinal()
    const dataEmissao = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const headers = linhas.length > 0 ? Object.keys(linhas[0]) : []

    const linhasHtml = linhas
      .map((linha, index) => {
        return `
          <tr>
            <td class="center">${index + 1}</td>
            ${headers
              .map((header) => `<td>${escaparHtml(linha[header as keyof typeof linha])}</td>`)
              .join("")}
          </tr>
        `
      })
      .join("")

    const conferenciasHtml = resultados.map(r=> {
      const c=conferirDemandaSaresp(r,remanejamentos)
      return `<tr>${[r.escola_nome,r.cie,r.serie,formatarPeriodo(r.data_prova,r.data_prova_fim),c.maiorTurno,c.cadastrados,c.previsto,c.confirmado,c.falta,c.excedente].map(v=>`<td>${escaparHtml(v)}</td>`).join("")}</tr>`
    }).join("")
    const resumo = [
      ["Edição", edicaoSelecionada?.titulo || "-"],
      ["Ano", edicaoSelecionada?.ano || "-"],
      ["Base da necessidade", "Equipamentos cadastrados, da planilha importada"],
      ["Período da aplicação", formatarPeriodo(edicaoSelecionada?.data_prova_padrao,edicaoSelecionada?.data_prova_fim_padrao || edicaoSelecionada?.data_prova_padrao)],
      ["Retirada prevista", getDataRetiradaFormatada(edicaoSelecionada?.data_prova_padrao)],
      ["Devolução prevista", getDataDevolucaoFormatada(edicaoSelecionada?.data_prova_fim_padrao || edicaoSelecionada?.data_prova_padrao)],
      ["Remanejamentos ativos", getRemanejamentosAtivos().length],
      ["Equipamentos planejados", estatisticas.quantidadePlanejada],
      ["Concluídos", estatisticas.quantidadeConcluida],
      ["Emitido em", dataEmissao],
    ]

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Plano Final</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
            table { border-collapse: collapse; width: 100%; }
            .title { background: #1e3a8a; color: #ffffff; font-size: 18px; font-weight: 800; text-align: center; }
            .subtitle { background: #dbeafe; color: #1e3a8a; font-weight: 700; text-align: center; }
            .section { background: #e5e7eb; color: #111827; font-weight: 800; text-transform: uppercase; }
            th { background: #1e40af; color: #ffffff; font-weight: 800; text-align: center; border: 1px solid #94a3b8; padding: 8px; }
            td { border: 1px solid #cbd5e1; padding: 7px; vertical-align: top; mso-number-format:"\@"; }
            .center { text-align: center; }
            .muted { color: #64748b; }
            .ok { background: #dcfce7; color: #166534; font-weight: 800; }
            .warn { background: #fef3c7; color: #92400e; font-weight: 800; }
            .danger { background: #fee2e2; color: #991b1b; font-weight: 800; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="title" colspan="${Math.max(headers.length + 1, 8)}">PLANO FINAL DE REMANEJAMENTO - SARESP DIGITAL</td></tr>
            <tr><td class="subtitle" colspan="${Math.max(headers.length + 1, 8)}">SETEC / SEINTEC - URE GUARULHOS SUL</td></tr>
            <tr><td colspan="${Math.max(headers.length + 1, 8)}"></td></tr>
          </table>

          <table>
            <tr><td class="section" colspan="2">Resumo institucional</td></tr>
            ${resumo
              .map(([label, value]) => `<tr><td><strong>${escaparHtml(label)}</strong></td><td>${escaparHtml(value)}</td></tr>`)
              .join("")}
          </table>

          <br />

          <table>
            <thead>
              <tr>
                <th>#</th>
                ${headers.map((header) => `<th>${escaparHtml(header)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${linhasHtml || `<tr><td class="center" colspan="${headers.length + 1}">Nenhum remanejamento ativo.</td></tr>`}
            </tbody>
          </table>

          <br />

          <table>
            <tr><td class="section" colspan="10">Conferência do planejamento — base: Equipamentos cadastrados</td></tr>
            <tr>${["Escola","CIE","Série","Período","Maior turno","Cadastrados","Previsto","Confirmado","Ainda falta","A rever (margem)"].map(t=>`<th>${escaparHtml(t)}</th>`).join("")}</tr>
            ${conferenciasHtml}
            <tr><td colspan="10">Previsto inclui sugeridos, aprovados e concluídos; confirmado inclui aprovados e concluídos. Vale a menor cobertura diária do período. Quantidade a rever não cancela planos.</td></tr>
          </table>
          <br />
          <table>
            <tr><td class="section">Orientações obrigatórias</td></tr>
            ${getOrientacoesInstitucionaisTexto()
              .map((item) => `<tr><td>${escaparHtml(item)}</td></tr>`)
              .join("")}
          </table>
        </body>
      </html>
    `
  }

  function exportarPlanilhaPlanoFinal() {
    const linhas = montarLinhasPlanilhaPlanoFinal()

    if (linhas.length === 0 && resultados.length === 0) {
      setFeedback({
        tipo: "warning",
        texto: "Não há remanejamentos ativos para exportar.",
      })
      return
    }

    baixarArquivo(
      getNomeArquivoPlano(edicaoSelecionada, "xls"),
      `\uFEFF${montarHtmlExcelPlanoFinal()}`,
      "application/vnd.ms-excel;charset=utf-8"
    )

    setFeedback({
      tipo: "success",
      texto: "Planilha Excel formatada do plano final exportada com sucesso.",
    })
  }

  function montarHtmlPlanoFinal() {
    return montarPlanoSaresp(edicaoSelecionada, remanejamentos, resultados)
  }

  function montarHtmlGuiaRemanejamento(remanejamento: SarespRemanejamento) {
    return montarGuiaSaresp(edicaoSelecionada, remanejamento)
  }

  function exportarGuiaRemanejamento(remanejamento: SarespRemanejamento) {
    const janela = window.open("", "_blank")
    const nomeArquivoGuia = getNomeArquivoGuia(remanejamento)

    if (!janela) {
      setFeedback({
        tipo: "warning",
        texto: "O navegador bloqueou a abertura da Guia de Remanejamento. Libere pop-ups para gerar o PDF.",
      })
      return
    }

    janela.document.open()
    janela.document.write(montarHtmlGuiaRemanejamento(remanejamento))
    janela.document.close()

    setFeedback({
      tipo: "success",
      texto: `Guia de Remanejamento preparada. Sugestão de nome para salvar: ${nomeArquivoGuia}` ,
    })
  }

  function exportarPdfPlanoFinal() {
    const ativos = getRemanejamentosAtivos()

    if (ativos.length === 0 && resultados.length === 0) {
      setFeedback({
        tipo: "warning",
        texto: "Não há remanejamentos ativos para gerar o PDF do plano final.",
      })
      return
    }

    const janela = window.open("", "_blank")

    if (!janela) {
      setFeedback({
        tipo: "warning",
        texto: "O navegador bloqueou a abertura do PDF. Libere pop-ups para gerar o documento.",
      })
      return
    }

    janela.document.open()
    janela.document.write(montarHtmlPlanoFinal())
    janela.document.close()

    setFeedback({
      tipo: "success",
      texto: "PDF institucional preparado. Use a janela aberta para salvar ou imprimir o plano final.",
    })
  }

  function exportarPdfConferencia() {
    if (resultados.length === 0) {
      setFeedback({ tipo: "warning", texto: "Não há demandas nesta edição para gerar a conferência." })
      return
    }

    const janela = window.open("", "_blank")
    if (!janela) {
      setFeedback({ tipo: "warning", texto: "O navegador bloqueou o PDF. Libere pop-ups para gerar a conferência." })
      return
    }

    janela.document.open()
    janela.document.write(montarConferenciaSaresp(edicaoSelecionada, remanejamentos, resultados))
    janela.document.close()
    setFeedback({ tipo: "success", texto: "PDF da conferência preparado em documento separado." })
  }

  async function copiarTexto(texto: string, mensagemSucesso: string) {
    try {
      await navigator.clipboard.writeText(texto)

      setFeedback({
        tipo: "success",
        texto: mensagemSucesso,
      })
    } catch {
      setFeedback({
        tipo: "warning",
        texto:
          "Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.",
      })
    }
  }

  if (loading) {
    return <LoadingPage />
  }

  const limiteModal = sugestaoSelecionada
    ? getLimiteQuantidadeSugestao(sugestaoSelecionada)
    : 0

  const planejadoModal = sugestaoSelecionada
    ? getPlanejadoParaDestino(sugestaoSelecionada)
    : 0

  const pendenteModal = sugestaoSelecionada
    ? getPendenteParaDestino(sugestaoSelecionada)
    : 0

  const gorduraModal = sugestaoSelecionada
    ? getGorduraParaDestino(sugestaoSelecionada)
    : 0

  const metaComGorduraModal = sugestaoSelecionada
    ? getMetaComGorduraParaDestino(sugestaoSelecionada)
    : 0

  const pendenteComGorduraModal = sugestaoSelecionada
    ? getPendenteComGorduraParaDestino(sugestaoSelecionada)
    : 0

  const mostrarFiltrosGerais = ["diagnostico", "doadoras"].includes(aba)

  return (
    <div className={`${pageStyles.page} mx-auto max-w-[1700px] space-y-6 pb-12`}>
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#020617] p-5 shadow-xl shadow-blue-950/10 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_34%)]" />

        <div className="relative z-10 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_720px] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                Central SARESP
              </Badge>
              <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                Equipamentos cadastrados
              </Badge>
              <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                Notebook • Tablet • Desktop PED
              </Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Central{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                SARESP Digital
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Necessidade calculada pelos equipamentos cadastrados no CSV e pelos alunos do maior turno.
              Empréstimos consideram todo o período; a disponibilidade das cedentes é conferida no inventário.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
              <select
                value={edicaoId}
                onChange={(event) => setEdicaoId(event.target.value)}
                className="min-h-[48px] rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              >
                {edicoes.length === 0 ? (
                  <option value="">Nenhuma edição cadastrada</option>
                ) : (
                  edicoes.map((edicao) => (
                    <option key={edicao.id} value={edicao.id}>
                      {edicao.titulo}
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={recarregarTudo}
                disabled={loadingDados}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={loadingDados ? "animate-spin" : ""}>↻</span>
                Atualizar
              </button>

              <button
                type="button"
                onClick={zerarEdicaoAtual}
                disabled={zerando || !edicaoId || !podeGerenciar}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 text-sm font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {zerando ? "Zerando..." : "Zerar edição"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Aplicam" value={estatisticas.escolasAplicam} tone="blue" />
            <MiniStat label="Com déficit" value={estatisticas.escolasDeficit} tone="red" />
            <MiniStat label="Déficit" value={estatisticas.deficitTotal} tone="red" />
            <MiniStat label="Gordura" value={estatisticas.gorduraTotal} tone="yellow" />
            <MiniStat label="Meta segura" value={estatisticas.metaComGorduraTotal} tone="cyan" />
            <MiniStat label="Doadoras" value={doadorasDisponiveis.length} tone="emerald" />
            <MiniStat label="Remanejável" value={estatisticas.remanejavel} tone="cyan" />
            <MiniStat label="No plano" value={estatisticas.quantidadePlanejada} tone="blue" />
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            feedback.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : feedback.tipo === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : feedback.tipo === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {feedback.texto}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{podeGerenciar ? "Gestão habilitada" : "Modo de consulta"} · {atualizadoEm ? `Atualizado em ${formatarDataHora(atualizadoEm)}` : "Carregando base da edição"}</span>
        {podeGerenciar && <a href="/saresp/gestao" className="font-semibold text-cyan-300 hover:underline">Gerenciar edições e datas →</a>}
      </div>
      <div role="status" className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-sm text-cyan-100"><strong>Base da necessidade: Equipamentos cadastrados, da planilha importada.</strong> A falta é o maior turno menos esse total. O inventário é uma referência separada e limita o que uma cedente pode emprestar. Margem operacional é adicional opcional.</div>
      <ConferenciaPlanejamento resultados={resultadosFiltrados} planos={remanejamentos} />
      {alertasPlano.length>0 && <details className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><summary className="cursor-pointer font-bold">{alertasPlano.length} operação(ões) do plano precisam de revisão de saldo no período</summary><p className="mt-3">Os registros foram preservados. Confira o inventário, as reservas de outras edições e a quantidade antes de executar.</p><ul className="mt-3 space-y-2">{alertasPlano.map(a=><li key={a.id}>{a.origem} → {a.destino}: {a.quantidade} no plano; {a.disponivel} disponíveis para esta operação.</li>)}</ul></details>}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <InfoBlock
              label="Edição"
              value={edicaoSelecionada?.titulo || "Nenhuma edição"}
              detail={`Status: ${edicaoSelecionada?.status || "-"}`}
            />
            <InfoBlock
              label="Período de aplicação"
              value={formatarPeriodo(edicaoSelecionada?.data_prova_padrao,edicaoSelecionada?.data_prova_fim_padrao || edicaoSelecionada?.data_prova_padrao)}
              detail={textoSeguro(edicaoSelecionada?.serie_padrao, "Série não informada")}
            />
            <InfoBlock
              label="Fonte"
              value="Equipamentos cadastrados"
              detail="Base de necessidade: coluna do CSV"
            />
            <InfoBlock
              label="Regra SARESP"
              value="Maior turno − cadastrados"
              detail="Doadoras: móveis funcionando, limitados ao cadastro quando informado"
            />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-2xl">
              🧠
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Margem operacional aplicada
              </h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                O plano permite trabalhar com gordura de {Math.round(GORDURA_OPERACIONAL_PERCENTUAL * 100)}%
                ou mínimo de {GORDURA_OPERACIONAL_MINIMA} equipamentos sobre o déficit,
                limitado pela sobra da escola doadora.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl shadow-slate-950/20 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            {ABAS.map((item) => {
              const ativo = aba === item.value

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAba(item.value)}
                  className={`group rounded-2xl border px-3 py-3 text-left transition md:min-w-[132px] ${
                    ativo
                      ? "border-blue-500/35 bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-blue-500/40 hover:bg-slate-900 hover:text-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-black uppercase tracking-widest">
                      {item.label}
                    </span>
                  </div>
                  <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${ativo ? "text-blue-100/75" : "text-slate-600"}`}>
                    {item.detail}
                  </p>
                </button>
              )
            })}
          </div>

          {mostrarFiltrosGerais && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] xl:min-w-[620px]">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar escola, CIE, status, técnico..."
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              />

              <select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              >
                {STATUS_FILTROS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {loadingDados ? (
        <LoadingPanel />
      ) : (
        <>
          {aba === "painel" && (
            <section className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title="Pend. remanejamento"
                  value={estatisticas.pendentesRemanejamento}
                  subtitle={`${formatarNumero(estatisticas.quantidadePendenteRemanejamento)} equipamento(s) a incluir`}
                  tone="red"
                />
                <KpiCard
                  title="Pend. aprovação"
                  value={estatisticas.pendentesAprovacao}
                  subtitle={`${formatarNumero(estatisticas.quantidadePendenteAprovacao)} equipamento(s) sugeridos`}
                  tone="yellow"
                />
                <KpiCard
                  title="Aprovados"
                  value={estatisticas.aprovadosExecucao}
                  subtitle={`${formatarNumero(estatisticas.quantidadeAprovadaExecucao)} equipamento(s) para retirada`}
                  tone="blue"
                />
                <KpiCard
                  title="Concluídos"
                  value={estatisticas.concluidos}
                  subtitle={`${formatarNumero(estatisticas.quantidadeConcluida)} equipamento(s) executados`}
                  tone="emerald"
                />
              </div>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_430px]">
                <Panel>
                  <SectionHeader
                    title="Dashboard de execução"
                    description="Separação objetiva entre o que ainda precisa entrar no plano, o que aguarda aprovação, o que já foi aprovado e o que foi concluído."
                  />

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <PainelPendenciasRemanejamentoCard
                      title="Pendentes de remanejamento"
                      icon="🚩"
                      description="Escolas com déficit que ainda não estão cobertas pelo plano de remanejamento."
                      resultados={estatisticas.resultadosPendentesRemanejamento}
                      tone="red"
                    />

                    <PainelStatusCard
                      title="Pendentes de aprovação"
                      icon="🟡"
                      description="Itens já incluídos no plano, mas ainda aguardando aprovação."
                      remanejamentos={remanejamentos.filter((item) => item.status === "sugerido")}
                      tone="yellow"
                    />

                    <PainelStatusCard
                      title="Aprovados para retirada"
                      icon="🔵"
                      description="Itens aprovados que aguardam retirada, execução ou finalização no sistema."
                      remanejamentos={remanejamentos.filter((item) => item.status === "aprovado")}
                      tone="blue"
                    />

                    <PainelStatusCard
                      title="Concluídos"
                      icon="✅"
                      description="Itens marcados como concluídos para documentação final."
                      remanejamentos={remanejamentos.filter((item) => item.status === "concluido")}
                      tone="emerald"
                    />
                  </div>
                </Panel>

                <Panel>
                  <SectionHeader
                    title="Documentação final"
                    description="Ações rápidas para salvar evidências institucionais do plano."
                  />

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={exportarPlanilhaPlanoFinal}
                      disabled={getRemanejamentosAtivos().length === 0 && resultados.length === 0}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-left transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-black text-white">Exportar Excel formatado</span>
                        <span className="mt-1 block text-xs font-semibold text-emerald-200/70">Arquivo .xls com resumo e plano completo</span>
                      </span>
                      <span className="text-2xl">📊</span>
                    </button>

                    <button
                      type="button"
                      onClick={exportarPdfPlanoFinal}
                      disabled={getRemanejamentosAtivos().length === 0 && resultados.length === 0}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-left transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-black text-white">PDF do plano</span>
                        <span className="mt-1 block text-xs font-semibold text-red-200/70">Assinatura somente SEINTEC e SETEC</span>
                      </span>
                      <span className="text-2xl">📄</span>
                    </button>

                    <button
                      type="button"
                      onClick={exportarPdfConferencia}
                      disabled={resultados.length === 0}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-left transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-black text-white">PDF da conferência</span>
                        <span className="mt-1 block text-xs font-semibold text-blue-200/70">Cadastrados, cobertura e faltas em arquivo separado</span>
                      </span>
                      <span className="text-2xl">📑</span>
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-xs font-semibold leading-relaxed text-blue-100/80">
                      Use o painel para acompanhar o fluxo: primeiro inclua a escola no plano, depois aprove, execute a retirada/devolução e finalize como concluído.
                    </p>
                  </div>
                </Panel>
              </section>
            </section>
          )}

          {aba === "importacao" && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
              <Panel>
                <SectionHeader
                  title="Importar planilha do SARESP"
                  description="Exporte sua planilha em CSV e importe aqui. A coluna de necessidade não precisa vir, pois o sistema calcula automaticamente."
                />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                      Início da aplicação
                    </label>
                    <input
                      type="date"
                      value={dataProvaImport}
                      onChange={(event) => setDataProvaImport(event.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500" htmlFor="saresp-data-fim">Fim da aplicação (opcional)</label>
                    <input id="saresp-data-fim" type="date" min={dataProvaImport || undefined} value={dataProvaFimImport} onChange={event=>setDataProvaFimImport(event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none focus:border-blue-500/60" />
                    <p className="mt-2 text-xs text-slate-400">Em branco: aplicação de um dia. Nos dois dias, a quantidade de equipamentos é a mesma.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                      Série
                    </label>
                    <input
                      value={serieImport}
                      onChange={(event) => setSerieImport(event.target.value)}
                      placeholder="Ex.: 3ª série EM"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-dashed border-blue-500/30 bg-blue-500/10 p-5">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleArquivoCsv}
                    className="block w-full cursor-pointer rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm font-bold text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-black file:text-white hover:file:bg-blue-700"
                  />

                  <p className="mt-3 text-xs font-medium leading-relaxed text-blue-100/80">
                    Cabeçalhos aceitos: CIE, Escola, Alunos_Manha,
                    Alunos_Tarde, Alunos_Noite, TOTAL_Alunos e
                    EQUIPAMENTOS CADASTRADOS.
                  </p>
                </div>

                {csvRows.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-800">
                    <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Prévia das primeiras linhas
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-[#020617] text-[10px] uppercase tracking-widest text-slate-500">
                          <tr>
                            <th className="px-4 py-3">CIE</th>
                            <th className="px-4 py-3">Escola</th>
                            <th className="px-4 py-3 text-center">Manhã</th>
                            <th className="px-4 py-3 text-center">Tarde</th>
                            <th className="px-4 py-3 text-center">Noite</th>
                            <th className="px-4 py-3 text-center">Equip.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {csvRows.slice(0, 8).map((row) => (
                            <tr key={`${row.cie}-${row.linha_original}`}>
                              <td className="px-4 py-3 font-bold text-blue-300">
                                {row.cie}
                              </td>
                              <td className="px-4 py-3 font-bold text-white">
                                {row.escola}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-300">
                                {row.alunos_manha}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-300">
                                {row.alunos_tarde}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-300">
                                {row.alunos_noite}
                              </td>
                              <td className="px-4 py-3 text-center text-cyan-300">
                                {row.equipamentos_cadastrados}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvRows([])
                      setImportResumo(null)
                    }}
                    disabled={importando}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Limpar prévia
                  </button>

                  <button
                    type="button"
                    onClick={importarCsvEProcessar}
                    disabled={importando || csvRows.length === 0 || !edicaoId || !podeGerenciar || loadingDados}
                    className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    {importando ? "Processando..." : "Importar e calcular"}
                  </button>
                </div>
              </Panel>

              <div className="space-y-5">
                <Panel>
                  <SectionHeader
                    title="Resumo da importação"
                    description="Use este bloco para validar se o CSV foi reconhecido corretamente."
                  />

                  {importResumo ? (
                    <div className="grid grid-cols-2 gap-3">
                      <MiniMetric label="Linhas lidas" value={importResumo.linhasLidas} />
                      <MiniMetric label="Válidas" value={importResumo.linhasValidas} />
                      <MiniMetric label="Ignoradas" value={importResumo.linhasIgnoradas} />
                      <MiniMetric label="Processadas" value={importResumo.processadas ?? "-"} />
                      <MiniMetric label="CIE encontrados" value={importResumo.encontradas ?? "-"} />
                      <MiniMetric
                        label="Não encontrados"
                        value={importResumo.naoEncontradas ?? "-"}
                        danger={numeroSeguro(importResumo.naoEncontradas) > 0}
                      />
                    </div>
                  ) : (
                    <EmptyBox
                      icon="📄"
                      title="Aguardando CSV"
                      description="Selecione o arquivo exportado da planilha para visualizar a prévia e processar a simulação."
                    />
                  )}
                </Panel>

                <Panel>
                  <h2 className="text-lg font-black text-white">
                    Modelo esperado
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                    Não precisa importar a coluna “Necessidade de Remanejamento”.
                    O sistema compara o maior turno com Equipamentos cadastrados. Essa coluna é obrigatória; informe zero explicitamente quando não houver equipamentos.
                  </p>

                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-bold leading-relaxed text-slate-300">
                    cie, escola, alunos_manha, alunos_tarde, alunos_noite,
                    total_alunos, equipamentos_cadastrados
                  </div>
                </Panel>
              </div>
            </section>
          )}

          {aba === "diagnostico" && (
            <section className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  title="Demanda total"
                  value={estatisticas.demandaTotal}
                  subtitle="Maior turno somado por escola"
                  tone="blue"
                />
                <KpiCard
                  title="Equipamentos cadastrados"
                  value={estatisticas.capacidadeTotal}
                  subtitle="Base da necessidade na planilha"
                  tone="cyan"
                />
                <KpiCard
                  title="Déficit seco"
                  value={estatisticas.deficitTotal}
                  subtitle="Falta sem margem"
                  tone="red"
                />
                <KpiCard
                  title="Gordura operacional"
                  value={estatisticas.gorduraTotal}
                  subtitle="Margem de segurança"
                  tone="yellow"
                />
                <KpiCard
                  title="Meta segura"
                  value={estatisticas.metaComGorduraTotal}
                  subtitle="Déficit + gordura"
                  tone="emerald"
                />
              </div>

              <Panel>
                <SectionHeader
                  title="Diagnóstico por escola"
                  description={`${resultadosFiltrados.length} escola(s) encontrada(s) no recorte atual.`}
                />

                {resultadosFiltrados.length === 0 ? (
                  <EmptyBox
                    icon="🔎"
                    title="Nenhum dado processado"
                    description="Vá até a aba Importação, selecione o CSV e clique em Importar e calcular."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {resultadosFiltrados.map((item) => (
                      <ResultadoCard
                        key={item.demanda_id}
                        resultado={item}
                        onDetalhes={() => setResultadoDetalhe(item)}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </section>
          )}

          {aba === "sugestoes" && (
            <section className="space-y-5">
              <Panel>
                <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                      Sugestões e acompanhamento
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      Todas as escolas da edição
                    </h2>
                    <p className="mt-1 max-w-4xl text-sm font-medium leading-relaxed text-slate-500">
                      Use a segmentação para localizar qualquer escola importada na edição. Mesmo quando
                      o cálculo automático não indicar remanejamento, a escola fica disponível para análise
                      manual em caso de oscilação de equipamentos, logística ou necessidade operacional.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                      🧭 Raio de busca: {formatarDistancia(raioSugestoesKm)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:min-w-[520px]">
                    <MiniMetric label="Exibidas" value={sugestoesAgrupadas.length} />
                    <MiniMetric
                      label="Pend. remanej."
                      value={sugestoesAgrupadas.filter((item) => item.statusFiltro === "pendente_remanejamento").length}
                      danger={sugestoesAgrupadas.some((item) => item.statusFiltro === "pendente_remanejamento")}
                    />
                    <MiniMetric
                      label="Pend. aprovação"
                      value={sugestoesAgrupadas.filter((item) => item.statusFiltro === "pendente_aprovacao").length}
                    />
                    <MiniMetric
                      label="Sem indicação"
                      value={sugestoesAgrupadas.filter((item) => item.statusFiltro === "sem_indicacao").length}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
                  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Segmentar por escola
                    </label>
                    <select
                      value={filtroEscolaSugestao}
                      onChange={(event) => setFiltroEscolaSugestao(event.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50"
                    >
                      <option value="todas">Todas as escolas</option>
                      {sugestaoEscolasFiltroOpcoes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}{item.cie ? ` — CIE ${item.cie}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Status da sugestão
                    </p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
                      {STATUS_FILTROS_SUGESTOES.map((item) => {
                        const ativo = filtroStatusSugestao === item.value
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setFiltroStatusSugestao(item.value)}
                            className={`rounded-2xl border p-3 text-left transition ${
                              ativo
                                ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                                : "border-slate-800 bg-[#020617] text-slate-500 hover:border-cyan-500/30 hover:text-cyan-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{item.icon}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {item.label}
                              </span>
                            </div>
                            <p className={`mt-1 text-[10px] font-semibold leading-snug ${ativo ? "text-cyan-100/70" : "text-slate-600"}`}>
                              {item.description}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel>
                {sugestoesAgrupadas.length === 0 ? (
                  <EmptyBox
                    icon="🗺️"
                    title="Nenhuma escola encontrada nesse filtro"
                    description="Ajuste a segmentação por escola ou status para visualizar as sugestões disponíveis."
                  />
                ) : (
                  <div className="space-y-5">
                    {sugestoesAgrupadas.map((grupo) => {
                      const statusGrupo = grupo.statusInfo
                      const semInventario = grupo.resultado?.status_calculado === "sem_inventario"
                      const ehAtencao = grupo.tipo === "atencao"
                      const semIndicacao = grupo.tipo === "sem_indicacao"
                      const grupoKey = `${grupo.resultado?.demanda_id || grupo.resultado?.escola_id || grupo.destino}`
                      const grupoExpandido = Boolean(
                        gruposSugestoesExpandidos[grupoKey]
                      )
                      const sugestoesOrdenadas = [...grupo.sugestoes].sort(
                        (a, b) =>
                          numeroSeguro(a.distancia_km) -
                            numeroSeguro(b.distancia_km) ||
                          numeroSeguro(b.quantidade_sugerida) -
                            numeroSeguro(a.quantidade_sugerida)
                      )
                      const sugestoesVisiveis = grupoExpandido
                        ? sugestoesOrdenadas
                        : sugestoesOrdenadas.slice(
                            0,
                            SUGESTOES_INICIAIS_POR_ESCOLA
                          )
                      const quantidadeOpcoesOcultas = Math.max(
                        sugestoesOrdenadas.length -
                          SUGESTOES_INICIAIS_POR_ESCOLA,
                        0
                      )

                      return (
                        <div
                          key={`${grupo.destino}-${grupo.resultado?.demanda_id || grupo.resultado?.escola_id || "sem-id"}`}
                          className="rounded-[1.75rem] border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="mb-4 flex flex-col gap-4 border-b border-slate-800 pb-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                    ehAtencao
                                      ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
                                      : semIndicacao
                                        ? (semInventario ? "border-orange-500/25 bg-orange-500/10 text-orange-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300")
                                        : "border-red-500/25 bg-red-500/10 text-red-300"
                                  }`}
                                >
                                  {semInventario ? "Inventário pendente de validação" : ehAtencao
                                    ? "Escola em atenção"
                                    : semIndicacao
                                      ? "Sem indicação automática"
                                      : "Escola com déficit"}
                                </span>
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusGrupo.badge}`}>
                                  <span className={`h-2 w-2 rounded-full ${statusGrupo.dot}`} />
                                  {statusGrupo.label}
                                </span>
                              </div>

                              <h3 className="mt-1 break-words text-xl font-black text-white">
                                {grupo.destino}
                              </h3>

                              <p className="mt-2 text-sm font-semibold text-slate-500">
                                Planejado: <span className="font-black text-blue-300">{formatarNumero(grupo.planejado)}</span>
                                {" • "}Déficit: <span className="font-black text-red-300">{semInventario ? "A validar" : formatarNumero(grupo.deficit)}</span>
                                {" • "}Referência segura: <span className="font-black text-cyan-300">{semInventario ? "A validar" : formatarNumero(grupo.metaComGordura)}</span>
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <MiniMetric label="Planejado" value={grupo.planejado} />
                              <MiniMetric label="Falta" value={semInventario ? "A validar" : grupo.pendente} danger={grupo.pendente > 0} />
                              <MiniMetric label="Falta c/ margem" value={semInventario ? "A validar" : grupo.pendenteComGordura} danger={grupo.pendenteComGordura > 0} />
                              <MiniMetric label="Turno" value={getTurnoLabel(grupo.turnoCritico)} />
                            </div>
                          </div>

                          <div className="mb-4 rounded-2xl border border-slate-800 bg-[#020617] p-4 text-xs font-semibold leading-relaxed text-slate-400">
                            {statusGrupo.description}
                          </div>

                          {grupo.sugestoes.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-yellow-500/25 bg-yellow-500/10 p-5">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-sm font-black text-white">
                                    {semInventario ? "Confirme o inventário desta escola" : "Escola disponível para análise manual"}
                                  </p>
                                  <p className="mt-1 text-sm font-medium leading-relaxed text-yellow-100/75">
                                    Esta unidade não possui sugestão automática de origem neste momento. Caso haja oscilação de equipamentos,
                                    instabilidade operacional ou necessidade de reserva local, selecione outra escola no filtro ou avalie manualmente uma origem doadora na aba Doadoras.
                                  </p>
                                </div>
                                <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">
                                  Análise manual
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                              {sugestoesVisiveis.map((sugestao) => {
                                const statusOperacional = getStatusOperacionalSugestao(sugestao)

                                return (
                                  <SugestaoCard
                                    key={`${sugestao.demanda_id}-${sugestao.origem_id}`}
                                    sugestao={sugestao}
                                    statusOperacional={statusOperacional}
                                    salvando={salvando || !podeGerenciar}
                                    planejadoDestino={getPlanejadoParaDestino(sugestao)}
                                    pendenteDestino={getPendenteParaDestino(sugestao)}
                                    gorduraDestino={getGorduraParaDestino(sugestao)}
                                    metaComGordura={getMetaComGorduraParaDestino(sugestao)}
                                    pendenteComGordura={getPendenteComGorduraParaDestino(sugestao)}
                                    limiteQuantidade={getLimiteQuantidadeSugestao(sugestao)}
                                    onAdicionar={() => abrirModalQuantidadePlano(sugestao)}
                                  />
                                )
                              })}
                            </div>
                          )}

                          {quantidadeOpcoesOcultas > 0 && (
                            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-white">
                                  Mais escolas doadoras disponíveis
                                </p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                  O sistema considera opções dentro de um raio operacional de até {formatarDistancia(
                                    raioSugestoesKm
                                  )}. As alternativas adicionais ficam ocultas para manter o card mais simples.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setGruposSugestoesExpandidos((current) => ({
                                    ...current,
                                    [grupoKey]: !grupoExpandido,
                                  }))
                                }
                                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                              >
                                {grupoExpandido
                                  ? "Ocultar opções adicionais"
                                  : `Mostrar mais opções (${quantidadeOpcoesOcultas})`}
                                <span
                                  className={`text-base transition-transform ${
                                    grupoExpandido ? "rotate-180" : ""
                                  }`}
                                >
                                  ⌄
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </section>
          )}

          {aba === "plano" && (
            <section className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <KpiCard
                  title="Itens no plano"
                  value={estatisticas.planoAtivo}
                  subtitle="Remanejamentos não cancelados"
                  tone="blue"
                />
                <KpiCard
                  title="Planejado"
                  value={estatisticas.quantidadePlanejada}
                  subtitle="Equipamentos previstos"
                  tone="cyan"
                />
                <KpiCard
                  title="Concluído"
                  value={estatisticas.quantidadeConcluida}
                  subtitle="Equipamentos concluídos"
                  tone="emerald"
                />
              </div>

              <Panel>
                <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                      Plano final e documentação
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      Plano de remanejamento / e-mails
                    </h2>
                    <p className="mt-1 max-w-4xl text-sm font-medium leading-relaxed text-slate-500">
                      Aprove, conclua, cancele, gere e-mails e exporte a documentação final do
                      remanejamento em PDF do plano, PDF da conferência, Excel formatado e guias individuais.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={exportarPlanilhaPlanoFinal}
                      disabled={remanejamentos.length === 0 && resultados.length === 0}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 text-xs font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      📊 Exportar Excel
                    </button>

                    <button
                      type="button"
                      onClick={exportarPdfPlanoFinal}
                      disabled={remanejamentos.length === 0 && resultados.length === 0}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 text-xs font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      📄 PDF do plano
                    </button>

                    <button
                      type="button"
                      onClick={exportarPdfConferencia}
                      disabled={resultados.length === 0}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      📑 PDF da conferência
                    </button>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoBlock
                    label="Retirada prevista"
                    value={getDataRetiradaFormatada(edicaoSelecionada?.data_prova_padrao)}
                    detail="Antes do primeiro dia de aplicação"
                  />
                  <InfoBlock
                    label="Devolução prevista"
                    value={getDataDevolucaoFormatada(edicaoSelecionada?.data_prova_fim_padrao || edicaoSelecionada?.data_prova_padrao)}
                    detail="Depois do último dia de aplicação"
                  />
                  <InfoBlock
                    label="Horário"
                    value="A combinar"
                    detail="Alinhamento direto entre as escolas"
                  />
                </div>

                <div className="mb-5 rounded-[1.5rem] border border-yellow-500/25 bg-yellow-500/10 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 text-2xl">
                      ⚠️
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white">
                        Orientações institucionais para o remanejamento
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-yellow-100/80">
                        A retirada deverá ocorrer preferencialmente um dia útil antes da data
                        da prova e a devolução um dia útil após a aplicação, sempre em horário
                        a combinar diretamente entre as unidades escolares. O termo de
                        remanejamento/guia de remessa deverá informar a quantidade remanejada,
                        ser assinado em duas vias e encaminhado à SETEC após a retirada.
                      </p>
                    </div>
                  </div>
                </div>

                {remanejamentos.length === 0 ? (
                  <EmptyBox
                    icon="📋"
                    title="Nenhum remanejamento no plano"
                    description="Abra a aba Sugestões e adicione uma sugestão ao plano. Após consolidar, exporte o PDF e a planilha para documentação."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {remanejamentos.map((item) => (
                      <RemanejamentoCard
                        key={item.id}
                        remanejamento={item}
                        podeGerenciar={podeGerenciar}
                        salvando={salvando}
                        onAprovar={() =>
                          atualizarStatusRemanejamento(item, "aprovado")
                        }
                        onConcluir={() =>
                          atualizarStatusRemanejamento(item, "concluido")
                        }
                        onCancelar={() =>
                          atualizarStatusRemanejamento(item, "cancelado")
                        }
                        onEmail={() => gerarEmailRemanejamento(item)}
                        onGuia={() => exportarGuiaRemanejamento(item)}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </section>
          )}

          {aba === "doadoras" && (
            <Panel>
              <SectionHeader
                title="Escolas possíveis doadoras"
                description="Escolas fora do CSV da edição. A sobra usa notebooks e tablets funcionando, protege o uso próprio e as reservas; quando há cadastro SARESP no mesmo ano, ele também limita a disponibilidade."
              />

              {doadorasDisponiveis.length === 0 ? (
                <EmptyBox
                  icon="🏫"
                  title="Nenhuma doadora encontrada"
                  description="Não há escolas com sobra disponível conforme as regras atuais, ou os equipamentos elegíveis ainda não estão cadastrados com tipo Notebook, Tablet ou Desktop PED."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {doadorasDisponiveis.map((item) => (
                    <DoadoraCard
                      key={`${item.edicao_id}-${item.escola_id || item.cie}`}
                      doadora={item}
                    />
                  ))}
                </div>
              )}
            </Panel>
          )}
        </>
      )}

      {sugestaoSelecionada && (
        <Modal
          title="Confirmar quantidade para o plano"
          onClose={fecharModalQuantidadePlano}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            <p className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Aplicação: <strong>{formatarPeriodo(sugestaoSelecionada.data_prova,sugestaoSelecionada.data_prova_fim)}</strong>. Ajuste a quantidade até o saldo disponível no período.
            </p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
              <SchoolFlow
                label="Origem doadora"
                school={sugestaoSelecionada.origem_nome}
                cie={sugestaoSelecionada.origem_cie}
              />

              <div className="hidden items-center justify-center text-3xl text-slate-600 lg:flex">
                →
              </div>

              <SchoolFlow
                label="Destino com déficit"
                school={sugestaoSelecionada.destino_nome}
                cie={sugestaoSelecionada.destino_cie}
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                Quantidade a enviar para o plano
              </label>

              <input
                type="number"
                min={1}
                max={limiteModal}
                step={1}
                value={quantidadePlano}
                onChange={(event) => {
                  const value = event.target.value
                  if (value === "") {
                    setQuantidadePlano("")
                    return
                  }

                  const number = Number(value)
                  if (!Number.isFinite(number)) return

                  setQuantidadePlano(number)
                }}
                className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-5 py-5 text-3xl font-black text-white outline-none transition focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50"
              />

              <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
                Referência calculada automaticamente:{" "}
                <span className="font-black text-cyan-300">
                  {formatarNumero(sugestaoSelecionada.quantidade_sugerida)}
                </span>{" "}
                equipamento(s). Distância aproximada:{" "}
                <span className="font-black text-cyan-300">
                  {formatarDistancia(sugestaoSelecionada.distancia_km)}
                </span>
                . Falta sem margem:{" "}
                <span className="font-black text-yellow-300">
                  {formatarNumero(pendenteModal)}
                </span>
                . Disponíveis no período: {formatarNumero(limiteModal)}. A quantidade pode superar o déficit, respeitando este saldo.
              </p>
            </div>

            <details className="rounded-2xl border border-slate-800 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-300">Ver cálculo e margem operacional</summary><div className="mt-4"><div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <MiniMetric
                label="Déficit"
                value={sugestaoSelecionada.deficit}
                danger
              />
              <MiniMetric label="Gordura" value={gorduraModal} />
              <MiniMetric label="Meta segura" value={metaComGorduraModal} />
              <MiniMetric label="Já planejado" value={planejadoModal} />
              <MiniMetric
                label="Falta c/ margem"
                value={pendenteComGorduraModal}
                danger={pendenteComGorduraModal > 0}
              />
              <MiniMetric label="Saldo no período" value={limiteModal} />
            </div></div></details>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharModalQuantidadePlano}
                disabled={salvando}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  adicionarSugestaoAoPlano(
                    sugestaoSelecionada,
                    Number(quantidadePlano)
                  )
                }
                disabled={
                  salvando ||
                  quantidadePlano === "" ||
                  Number(quantidadePlano) <= 0 || !Number.isSafeInteger(Number(quantidadePlano)) || Number(quantidadePlano)>limiteModal || !podeGerenciar
                }
                className="rounded-2xl bg-cyan-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {salvando ? "Adicionando..." : "Salvar quantidade no plano"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {resultadoDetalhe && (
        <Modal
          title="Detalhes da escola"
          onClose={() => setResultadoDetalhe(null)}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Unidade escolar
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {resultadoDetalhe.escola_nome}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                CIE {resultadoDetalhe.cie} • Técnico:{" "}
                {textoSeguro(resultadoDetalhe.tecnico_atribuido, "Não informado")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DetailBox label="Manhã" value={resultadoDetalhe.alunos_manha} />
              <DetailBox label="Tarde" value={resultadoDetalhe.alunos_tarde} />
              <DetailBox label="Noite" value={resultadoDetalhe.alunos_noite} />
              <DetailBox label="Maior turno" value={resultadoDetalhe.maior_turno} />
              <DetailBox
                label="Turno crítico"
                value={getTurnoLabel(resultadoDetalhe.turno_critico)}
              />
              <DetailBox
                label="Equipamentos cadastrados"
                value={resultadoDetalhe.equipamentos_planilha}
              />
              <DetailBox
                label="Capacidade cadastrada"
                value={resultadoDetalhe.capacidade_util}
              />
              <DetailBox
                label="Demanda considerada"
                value={resultadoDetalhe.demanda_considerada}
              />
              <DetailBox label="Saldo" value={resultadoDetalhe.saldo} />
            </div>

            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Necessidade calculada
              </p>
              <p className="mt-2 text-lg font-black text-white">
                {resultadoDetalhe.necessidade_texto}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {emailGerado && (
        <Modal
          title="E-mail gerado para formalização"
          onClose={() => setEmailGerado(null)}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailText
                label="Destinatários sugeridos"
                value={
                  emailGerado.destinatarios ||
                  "E-mails não cadastrados na tabela escolas"
                }
              />
              <DetailText label="Assunto" value={emailGerado.assunto} />
              <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>copiarTexto(emailGerado.destinatarios,"Destinatários copiados.")} className="rounded-xl border border-cyan-500/30 px-4 py-2 text-sm font-semibold text-cyan-300">Copiar destinatários</button><button type="button" onClick={()=>baixarArquivo(`Email_SARESP_${emailGerado.remanejamento.id.slice(0,8)}.txt`,`Para: ${emailGerado.destinatarios}\nAssunto: ${emailGerado.assunto}\n\n${emailGerado.corpo}`,"text/plain;charset=utf-8")} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Baixar rascunho</button></div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Corpo do e-mail
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      copiarTexto(emailGerado.assunto, "Assunto copiado.")
                    }
                    className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
                  >
                    Copiar assunto
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copiarTexto(emailGerado.corpo, "Corpo do e-mail copiado.")
                    }
                    className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    Copiar corpo
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copiarTexto(
                        `Assunto: ${emailGerado.assunto}\n\n${emailGerado.corpo}`,
                        "E-mail completo copiado."
                      )
                    }
                    className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    Copiar tudo
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={emailGerado.corpo}
                className="min-h-[520px] w-full resize-none rounded-2xl border border-slate-800 bg-[#020617] p-4 text-sm font-medium leading-relaxed text-slate-200 outline-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ConferenciaPlanejamento({ resultados, planos }: { resultados: SarespResultado[]; planos: SarespRemanejamento[] }) {
  const linhas = resultados.map(r => ({ resultado:r, ...conferirDemandaSaresp(r,planos) }))
    .sort((a,b)=>b.falta-a.falta || b.excedente-a.excedente || String(a.resultado.escola_nome).localeCompare(String(b.resultado.escola_nome),'pt-BR'))
  const pendentes = linhas.filter(l=>l.falta>0)
  const rever = linhas.filter(l=>l.excedente>0)
  return <details className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
    <summary className="cursor-pointer text-sm font-bold text-white">Conferência do planejamento · {pendentes.length} aplicação(ões) com falta · {rever.length} recebimento(s) acima da necessidade</summary>
    <p className="mt-3 text-xs leading-relaxed text-slate-400">Recorte dos filtros atuais. Previsto inclui sugeridos, aprovados e concluídos; confirmado inclui aprovados e concluídos. A menor cobertura diária é usada em provas de dois dias. Quantidade a rever pode ser margem deliberada e não cancela nenhum plano.</p>
    <div className="mt-3 max-h-[480px] overflow-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-slate-900 text-slate-300"><tr>{["Escola / aplicação","Maior turno","Cadastrados","Funcionando¹","Previsto","Confirmado","Ainda falta","A rever²"].map(t=><th key={t} className="p-3 font-bold">{t}</th>)}</tr></thead>
        <tbody>{linhas.map(l=><tr key={l.resultado.demanda_id} className="border-t border-slate-800 text-slate-300">
          <td className="p-3"><strong className="text-white">{l.resultado.escola_nome}</strong><br/>CIE {l.resultado.cie} · {l.resultado.serie}<br/>{formatarPeriodo(l.resultado.data_prova,l.resultado.data_prova_fim)}</td>
          <td className="p-3">{formatarNumero(l.maiorTurno)}</td><td className="p-3 font-bold text-cyan-300">{formatarNumero(l.cadastrados)}</td>
          <td className="p-3">{l.resultado.situacao_inventario==='confirmado' ? formatarNumero(l.resultado.equipamentos_inventario) : "A validar"}</td>
          <td className="p-3">{formatarNumero(l.previsto)}</td><td className="p-3">{formatarNumero(l.confirmado)}</td>
          <td className={`p-3 font-bold ${l.falta>0 ? "text-red-300" : "text-emerald-300"}`}>{formatarNumero(l.falta)}</td>
          <td className="p-3 text-amber-300">{l.excedente>0 ? `${formatarNumero(l.excedente)}${l.semNecessidade ? " · sem déficit" : " · margem"}` : "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {linhas.length===0 && <p className="mt-3 text-sm text-slate-400">Nenhuma aplicação no filtro atual.</p>}
    <p className="mt-3 text-xs text-slate-500">¹ Referência do inventário, não entra no cálculo da falta. ² Previsto acima do déficit inicial, sem incluir margem opcional.</p>
  </details>
}

function ResultadoCard({
  resultado,
  onDetalhes,
}: {
  resultado: SarespResultado
  onDetalhes: () => void
}) {
  const status = getStatusConfig(resultado.status_calculado)
  const deficit = numeroSeguro(resultado.deficit)
  const saldo = numeroSeguro(resultado.saldo)
  const gordura = calcularGorduraOperacional(deficit)
  const metaComGordura = calcularMetaComGordura(deficit)

  return (
    <article className="group rounded-[1.5rem] border border-slate-800 bg-slate-950/60 p-5 transition-all hover:border-blue-500/35">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_620px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${status.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              {status.short}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              CIE {textoSeguro(resultado.cie, "S/N")}
            </span>

            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
              {getTurnoLabel(resultado.turno_critico)}
            </span>
          </div>

          <h3 className="break-words text-xl font-black text-white">
            {resultado.escola_nome}
          </h3>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            {resultado.necessidade_texto}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <MiniMetric label="Manhã" value={resultado.alunos_manha} />
          <MiniMetric label="Tarde" value={resultado.alunos_tarde} />
          <MiniMetric label="Noite" value={resultado.alunos_noite} />
          <MiniMetric label="Cadastrados" value={resultado.equipamentos_planilha} />
          <MiniMetric
            label={deficit > 0 ? "Déficit" : "Saldo"}
            value={deficit > 0 ? deficit : saldo}
            danger={deficit > 0}
          />
          <MiniMetric
            label="Meta segura"
            value={deficit > 0 ? metaComGordura : gordura}
            danger={deficit > 0}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs font-semibold text-slate-600">
          Cadastrados (base):{" "}
          <span className="text-slate-400">
            {formatarNumero(resultado.equipamentos_planilha)}
          </span>{" "}
          • Funcionando (referência):{" "}
          <span className="text-slate-400">
            {resultado.situacao_inventario!=="confirmado" ? "A validar" : formatarNumero(resultado.equipamentos_inventario)}
          </span>{" "}
          • Base usada:{" "}
          <span className="text-slate-400">
            {resultado.status_calculado==="sem_inventario" ? "A validar" : formatarNumero(resultado.equipamentos_base)}
          </span>{" "}
          • Gordura:{" "}
          <span className="text-cyan-300">{formatarNumero(gordura)}</span>
        </div>

        <button
          type="button"
          onClick={onDetalhes}
          className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
        >
          Ver detalhes
        </button>
      </div>
    </article>
  )
}

function SugestaoCard({
  sugestao,
  statusOperacional,
  salvando,
  planejadoDestino,
  pendenteDestino,
  gorduraDestino,
  metaComGordura,
  pendenteComGordura,
  limiteQuantidade,
  onAdicionar,
}: {
  sugestao: SarespSugestao
  statusOperacional: SugestaoStatusInfo
  salvando: boolean
  planejadoDestino: number
  pendenteDestino: number
  gorduraDestino: number
  metaComGordura: number
  pendenteComGordura: number
  limiteQuantidade: number
  onAdicionar: () => void
}) {
  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#020617] p-4 transition hover:border-cyan-500/35">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              Origem sugerida
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusOperacional.badge}`}>
              <span className={`h-2 w-2 rounded-full ${statusOperacional.dot}`} />
              {statusOperacional.label}
            </span>
          </div>

          <h4 className="break-words text-lg font-black text-white">
            {sugestao.origem_nome}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            CIE {textoSeguro(sugestao.origem_cie, "S/N")} •{" "}
            {formatarDistancia(sugestao.distancia_km)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Saldo no período
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {formatarNumero(limiteQuantidade)}
          </p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniMetric label="Sobra" value={sugestao.sobra_disponivel} />
        <MiniMetric label="Planejado" value={planejadoDestino} />
        <MiniMetric label="Falta" value={pendenteDestino} danger={pendenteDestino > 0} />
        <MiniMetric label="Falta c/ margem" value={pendenteComGordura} danger={pendenteComGordura > 0} />
      </div>

      <button
        type="button"
        onClick={onAdicionar}
        disabled={salvando}
        className="relative z-10 mt-4 w-full rounded-2xl bg-cyan-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        Configurar quantidade
      </button>

      <p className="relative z-10 mt-3 text-[11px] font-semibold leading-relaxed text-slate-600">
        {statusOperacional.description} A quantidade pode superar o déficit até o limite disponível no período.
      </p>
    </article>
  )
}


function RemanejamentoCard({
  remanejamento,
  podeGerenciar,
  salvando,
  onAprovar,
  onConcluir,
  onCancelar,
  onEmail,
  onGuia,
}: {
  remanejamento: SarespRemanejamento
  podeGerenciar: boolean
  salvando: boolean
  onAprovar: () => void
  onConcluir: () => void
  onCancelar: () => void
  onEmail: () => void
  onGuia: () => void
}) {
  const status = getRemanejamentoStatus(remanejamento.status)
  const dataProvaRef = remanejamento.data_prova
  const dataRetirada = getDataRetiradaFormatada(dataProvaRef)
  const dataDevolucao = getDataDevolucaoFormatada(remanejamento.data_prova_fim || dataProvaRef)

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950/60 p-5 transition hover:border-blue-500/35">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_480px] xl:items-center">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${status.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>

            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Aplicação: {formatarPeriodo(dataProvaRef,remanejamento.data_prova_fim || dataProvaRef)}
            </span>

            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              {formatarDistancia(remanejamento.distancia_km)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <SchoolFlow
              label="Origem cedente"
              school={remanejamento.escola_origem_nome}
              cie={remanejamento.escola_origem_cie}
            />

            <div className="hidden text-center text-2xl text-slate-600 lg:block">
              →
            </div>

            <SchoolFlow
              label="Destino contemplado"
              school={remanejamento.escola_destino_nome}
              cie={remanejamento.escola_destino_cie}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">
                Retirada prevista
              </p>
              <p className="mt-1 text-sm font-black text-white">{dataRetirada}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">
                Antes do primeiro dia • horário a combinar
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                Devolução prevista
              </p>
              <p className="mt-1 text-sm font-black text-white">{dataDevolucao}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">
                Após o último dia • horário a combinar
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-yellow-300">
                Termo / GRB
              </p>
              <p className="mt-1 text-sm font-black text-white">2 vias assinadas</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">
                Enviar à SETEC após retirada
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniMetric label="Qtd." value={remanejamento.quantidade} />
          <MiniMetric
            label="Turno"
            value={getTurnoLabel(remanejamento.turno_referencia)}
          />

          <button
            type="button"
            onClick={onEmail}
            disabled={salvando}
            className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-60"
          >
            E-mail
          </button>

          <button
            type="button"
            onClick={onGuia}
            disabled={salvando || remanejamento.status === "cancelado"}
            className="rounded-2xl border border-purple-500/25 bg-purple-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-60"
          >
            Guia PDF
          </button>

          {podeGerenciar && remanejamento.status === "sugerido" && (
            <button
              type="button"
              onClick={onAprovar}
              disabled={salvando}
              className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-60"
            >
              Aprovar
            </button>
          )}

          {podeGerenciar && remanejamento.status !== "concluido" &&
            remanejamento.status !== "cancelado" && (
              <button
                type="button"
                onClick={onConcluir}
                disabled={salvando}
                className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
              >
                Concluir
              </button>
            )}

          {podeGerenciar && remanejamento.status !== "cancelado" && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={salvando}
              className="rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {remanejamento.concluido_em && (
        <p className="relative z-10 mt-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-500">
          Concluído em {formatarDataHora(remanejamento.concluido_em)}
        </p>
      )}
    </article>
  )
}


function DoadoraCard({ doadora }: { doadora: SarespDoadora }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4 transition hover:border-emerald-500/35">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            Possível doadora
          </p>
          <h3 className="mt-1 break-words text-lg font-black text-white">
            {doadora.nome_escola}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            CIE {textoSeguro(doadora.cie, "S/N")}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
            Sobra
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {formatarNumero(doadora.sobra_disponivel)}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-xs font-semibold text-slate-500">
        <p>Móveis considerados após limite cadastrado: {formatarNumero(doadora.equipamentos_base)}</p>
        <p>Fonte: Inventário funcionando, limitado ao cadastro quando informado</p>
        <p>Tipos considerados: Notebook, Tablet e Desktop PED</p>
        <p>Endereço: {textoSeguro(doadora.endereco, "Não informado")}</p>
        <p>Técnico: {textoSeguro(doadora.tecnico_atribuido, "Não informado")}</p>
      </div>
    </article>
  )
}

function SchoolFlow({
  label,
  school,
  cie,
}: {
  label: string
  school?: string | null
  cie?: string | null
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-white">
        {textoSeguro(school, "Escola não informada")}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-600">
        CIE {textoSeguro(cie, "S/N")}
      </p>
    </div>
  )
}


function PainelPendenciasRemanejamentoCard({
  title,
  icon,
  description,
  resultados,
  tone,
}: {
  title: string
  icon: string
  description: string
  resultados: SarespResultado[]
  tone: "red" | "yellow"
}) {
  const styles = {
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
  }

  const totalEquipamentosPendentes = resultados.reduce(
    (acc, item) => acc + numeroSeguro(item.deficit),
    0
  )

  return (
    <div className={`rounded-[1.5rem] border p-4 ${styles[tone]}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {formatarNumero(resultados.length)}
          </p>
          <p className="mt-1 text-xs font-semibold opacity-80">
            {formatarNumero(totalEquipamentosPendentes)} equipamento(s) em déficit
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-2xl">
          {icon}
        </div>
      </div>

      <p className="mb-4 text-xs font-medium leading-relaxed text-slate-400">
        {description}
      </p>

      <div className="custom-scrollbar max-h-[260px] space-y-2 overflow-y-auto pr-1">
        {resultados.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs font-bold text-slate-600">
            Nenhuma escola pendente neste grupo.
          </div>
        ) : (
          resultados.slice(0, 12).map((item) => (
            <div
              key={item.demanda_id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
            >
              <p className="truncate text-xs font-black text-white">
                {textoSeguro(item.escola_nome, "Escola não informada")}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                CIE {textoSeguro(item.cie, "S/N")} • déficit {formatarNumero(item.deficit)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


function PainelStatusCard({
  title,
  icon,
  description,
  remanejamentos,
  tone,
}: {
  title: string
  icon: string
  description: string
  remanejamentos: SarespRemanejamento[]
  tone: "yellow" | "emerald" | "red" | "blue"
}) {
  const styles = {
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  }

  const totalEquipamentos = remanejamentos.reduce(
    (acc, item) => acc + numeroSeguro(item.quantidade),
    0
  )

  return (
    <div className={`rounded-[1.5rem] border p-4 ${styles[tone]}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {formatarNumero(remanejamentos.length)}
          </p>
          <p className="mt-1 text-xs font-semibold opacity-80">
            {formatarNumero(totalEquipamentos)} equipamento(s)
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-2xl">
          {icon}
        </div>
      </div>

      <p className="mb-4 text-xs font-medium leading-relaxed text-slate-400">
        {description}
      </p>

      <div className="custom-scrollbar max-h-[260px] space-y-2 overflow-y-auto pr-1">
        {remanejamentos.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs font-bold text-slate-600">
            Nenhum registro nesta situação.
          </div>
        ) : (
          remanejamentos.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
            >
              <p className="truncate text-sm font-black text-white">
                {item.escola_destino_nome || "Destino não informado"}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                Origem: {item.escola_origem_nome || "Não informado"}
              </p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                {formatarNumero(item.quantidade)} equipamento(s) • {getRemanejamentoStatus(item.status).label}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-12">
      <div className="h-64 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      <div className="h-24 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      <div className="h-[420px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
    </div>
  )
}

function LoadingPanel() {
  return (
    <Panel>
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
          Carregando simulação
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Consolidando equipamentos cadastrados, demandas, doadoras e sugestões por distância.
        </p>
      </div>
    </Panel>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function Badge({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}
    >
      {children}
    </span>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "blue" | "red" | "yellow" | "emerald" | "cyan"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {formatarNumero(value)}
      </p>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string
  value: string | number
  subtitle: string
  tone: "blue" | "cyan" | "red" | "emerald" | "yellow"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
  }

  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
        {title}
      </p>
      <p className="mt-3 text-3xl font-black text-white">
        {formatarNumero(value)}
      </p>
      <p className="mt-1 text-xs font-semibold opacity-80">{subtitle}</p>
    </div>
  )
}

function InfoBlock({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number | null | undefined
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-white">
        {textoSeguro(value, "-")}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-600">{detail}</p>
    </div>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function MiniMetric({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string | number | null | undefined
  danger?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        danger
          ? "border-red-500/25 bg-red-500/10 text-red-300"
          : "border-slate-800 bg-slate-950 text-slate-400"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-white">
        {typeof value === "number" ? formatarNumero(value) : textoSeguro(value, "-")}
      </p>
    </div>
  )
}

function EmptyBox({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-3xl">
        {icon}
      </div>
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function DetailBox({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black text-white">
        {typeof value === "number" ? formatarNumero(value) : textoSeguro(value, "-")}
      </p>
    </div>
  )
}

function DetailText({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold leading-relaxed text-white">
        {textoSeguro(value, "-")}
      </p>
    </div>
  )
}
