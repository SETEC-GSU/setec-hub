"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

type ChamadoRow = {
  id: string
  titulo: string | null
  descricao: string | null
  categoria: string | null
  subcategoria: string | null
  origem: string | null
  prioridade: string | null
  sla_horas: number | null
  status: string | null
  solicitante_nome: string | null
  solicitante_email: string | null
  setor: string | null
  escola: string | null
  equipamento: string | null
  analista_responsavel: string | null
  created_at: string | null
  updated_at: string | null
  codigo: string | null
  tipo: string | null
  usuario_id: string | null
  started_at: string | null
  resolved_at: string | null
  closed_at: string | null
  visualizado_gestao: boolean | null
  visualizado_pelo_usuario: boolean | null
  retorno_devolutivo: string | null
  nome_analista_seguro: string
  nome_dono_seguro: string
}

type UsuarioResumo = {
  id: string
  nome: string | null
  email: string | null
  role?: string | null
}

type Feedback = {
  type: "success" | "error" | "info"
  message: string
} | null

type FiltroStatus =
  | "todos"
  | "aberto"
  | "assumido"
  | "em_atendimento"
  | "resolvido"
  | "fechado"

type FiltroOrigem = "todos" | "ure" | "escola"
type FiltroPrioridade = "todas" | "critica" | "alta" | "media" | "baixa"
type FiltroResponsavel = "todos" | "meus" | "sem_responsavel"
type Ordenacao = "sla" | "recentes" | "antigos" | "prioridade"

type ModalResolucao = {
  id: string | null
  codigo?: string | null
  titulo?: string | null
}

const SLA_HORAS_PADRAO: Record<string, number> = {
  critica: 8,
  alta: 24,
  media: 48,
  baixa: 72,
}

const PRIORIDADE_PESO: Record<string, number> = {
  critica: 4,
  alta: 3,
  media: 2,
  baixa: 1,
}

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  assumido: "Assumido",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
}

const PRIORIDADE_LABEL: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}

/*
  SLA útil — Guarulhos/SP
  Expediente considerado: segunda a sexta, das 08h às 18h.

  Ajuste este array anualmente conforme calendário oficial da SEDUC,
  Governo do Estado, Prefeitura de Guarulhos e pontos facultativos internos.
  Formato: YYYY-MM-DD
*/
const FERIADOS_GUARULHOS_SP = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-06-04",
  "2026-07-09",
  "2026-09-07",
  "2026-10-12",
  "2026-10-28",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-08",
  "2026-12-25",
])

const EXPEDIENTE_INICIO = 8
const EXPEDIENTE_FIM = 18

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function normalizarStatus(value?: string | null) {
  return normalizarTexto(value || "aberto").replaceAll(" ", "_")
}

function normalizarPrioridade(value?: string | null) {
  const prioridade = normalizarTexto(value)

  if (prioridade.includes("critica")) return "critica"
  if (prioridade.includes("alta")) return "alta"
  if (prioridade.includes("media")) return "media"
  if (prioridade.includes("baixa")) return "baixa"

  return prioridade || "media"
}

function formatarStatus(status?: string | null) {
  const normalized = normalizarStatus(status)

  return (
    STATUS_LABEL[normalized] ||
    normalized
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

function formatarPrioridade(prioridade?: string | null) {
  const normalized = normalizarPrioridade(prioridade)
  return PRIORIDADE_LABEL[normalized] || "Média"
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Sem data"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem data"

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatarTempoRelativo(dataIso?: string | null) {
  if (!dataIso) return "Sem registro"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  const diffMs = Date.now() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Agora"
  if (diffMin < 60) return `${diffMin} min atrás`

  const diffHoras = Math.floor(diffMin / 60)

  if (diffHoras < 24) return `${diffHoras}h atrás`

  const diffDias = Math.floor(diffHoras / 24)

  return `${diffDias} dia(s) atrás`
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`
}

function isFeriadoGuarulhos(date: Date) {
  return FERIADOS_GUARULHOS_SP.has(getDateKey(date))
}

function isDiaUtilGuarulhos(date: Date) {
  const dia = date.getDay()

  if (dia === 0 || dia === 6) return false
  if (isFeriadoGuarulhos(date)) return false

  return true
}

function inicioExpediente(date: Date) {
  const result = new Date(date)
  result.setHours(EXPEDIENTE_INICIO, 0, 0, 0)
  return result
}

function fimExpediente(date: Date) {
  const result = new Date(date)
  result.setHours(EXPEDIENTE_FIM, 0, 0, 0)
  return result
}

function proximoDiaUtilInicio(date: Date) {
  const result = new Date(date)
  result.setDate(result.getDate() + 1)
  result.setHours(EXPEDIENTE_INICIO, 0, 0, 0)

  while (!isDiaUtilGuarulhos(result)) {
    result.setDate(result.getDate() + 1)
    result.setHours(EXPEDIENTE_INICIO, 0, 0, 0)
  }

  return result
}

function normalizarParaHorarioUtil(date: Date) {
  let result = new Date(date)

  if (!isDiaUtilGuarulhos(result)) {
    result.setHours(EXPEDIENTE_INICIO, 0, 0, 0)

    while (!isDiaUtilGuarulhos(result)) {
      result.setDate(result.getDate() + 1)
      result.setHours(EXPEDIENTE_INICIO, 0, 0, 0)
    }

    return result
  }

  const inicio = inicioExpediente(result)
  const fim = fimExpediente(result)

  if (result < inicio) return inicio

  if (result >= fim) {
    return proximoDiaUtilInicio(result)
  }

  return result
}

function adicionarHorasUteisGuarulhos(dataInicial: Date, horas: number) {
  let atual = normalizarParaHorarioUtil(dataInicial)
  let minutosRestantes = Math.max(Math.round(horas * 60), 0)

  while (minutosRestantes > 0) {
    atual = normalizarParaHorarioUtil(atual)

    const fimDoDia = fimExpediente(atual)
    const minutosDisponiveisHoje = Math.max(
      Math.floor((fimDoDia.getTime() - atual.getTime()) / 60000),
      0
    )

    if (minutosRestantes <= minutosDisponiveisHoje) {
      return new Date(atual.getTime() + minutosRestantes * 60000)
    }

    minutosRestantes -= minutosDisponiveisHoje
    atual = proximoDiaUtilInicio(atual)
  }

  return atual
}

function calcularMinutosUteisEntre(inicioIso: string | null, fim: Date) {
  if (!inicioIso) return 0

  const inicio = new Date(inicioIso)

  if (Number.isNaN(inicio.getTime())) return 0

  let atual = normalizarParaHorarioUtil(inicio)
  let total = 0

  while (atual < fim) {
    if (!isDiaUtilGuarulhos(atual)) {
      atual = proximoDiaUtilInicio(atual)
      continue
    }

    const fimDoDia = fimExpediente(atual)
    const limite = fim < fimDoDia ? fim : fimDoDia

    if (limite > atual) {
      total += Math.floor((limite.getTime() - atual.getTime()) / 60000)
    }

    if (fim <= fimDoDia) break

    atual = proximoDiaUtilInicio(atual)
  }

  return total
}

function formatarMinutos(minutos: number) {
  const abs = Math.abs(minutos)
  const dias = Math.floor(abs / 600)
  const horas = Math.floor((abs % 600) / 60)
  const mins = abs % 60

  if (dias > 0) return `${dias}d ${horas}h`
  if (horas > 0) return `${horas}h ${mins}m`

  return `${mins}m`
}

function calcularSLA(chamado: ChamadoRow) {
  const status = normalizarStatus(chamado.status)

  if (status === "resolvido" || status === "fechado") {
    return {
      label: "Concluído",
      descricao: "Chamado finalizado",
      atrasado: false,
      vencendo: false,
      minutosRestantes: 0,
      percent: 100,
    }
  }

  if (!chamado.created_at) {
    return {
      label: "Sem SLA",
      descricao: "Data de abertura ausente",
      atrasado: false,
      vencendo: false,
      minutosRestantes: 0,
      percent: 0,
    }
  }

  const criado = new Date(chamado.created_at)

  if (Number.isNaN(criado.getTime())) {
    return {
      label: "Sem SLA",
      descricao: "Data inválida",
      atrasado: false,
      vencendo: false,
      minutosRestantes: 0,
      percent: 0,
    }
  }

  const prioridade = normalizarPrioridade(chamado.prioridade)
  const horasSLA = chamado.sla_horas || SLA_HORAS_PADRAO[prioridade] || 24
  const limite = adicionarHorasUteisGuarulhos(criado, horasSLA)
  const agora = new Date()

  const minutosTotais = Math.max(Math.round(horasSLA * 60), 1)
  const minutosConsumidos = calcularMinutosUteisEntre(chamado.created_at, agora)
  const percent = Math.min(Math.max((minutosConsumidos / minutosTotais) * 100, 0), 100)

  if (agora > limite) {
    const atrasoMs = agora.getTime() - limite.getTime()
    const atrasoMin = Math.floor(atrasoMs / 60000)

    return {
      label: "Atrasado",
      descricao: `Vencido há ${formatarMinutos(atrasoMin)}`,
      atrasado: true,
      vencendo: false,
      minutosRestantes: -atrasoMin,
      percent: 100,
    }
  }

  const diffMs = limite.getTime() - agora.getTime()
  const minutosRestantes = Math.floor(diffMs / 60000)
  const vencendo = minutosRestantes <= 240

  return {
    label: formatarMinutos(minutosRestantes),
    descricao: `Prazo útil até ${formatarData(limite.toISOString())}`,
    atrasado: false,
    vencendo,
    minutosRestantes,
    percent,
  }
}

function prioridadeClass(prioridade?: string | null) {
  const value = normalizarPrioridade(prioridade)

  if (value === "critica") return "border-red-500/25 bg-red-500/10 text-red-300"
  if (value === "alta") return "border-orange-500/25 bg-orange-500/10 text-orange-300"
  if (value === "media") return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
  if (value === "baixa") return "border-blue-500/25 bg-blue-500/10 text-blue-300"

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function statusClass(status?: string | null) {
  const value = normalizarStatus(status)

  if (value === "aberto") return "border-blue-500/25 bg-blue-500/10 text-blue-300"
  if (value === "assumido") return "border-purple-500/25 bg-purple-500/10 text-purple-300"
  if (value === "em_atendimento") return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
  if (value === "resolvido") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  if (value === "fechado") return "border-slate-600 bg-slate-900 text-slate-300"

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function origemClass(origem?: string | null) {
  const value = normalizarTexto(origem)

  if (value === "escola") return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
  if (value === "ure") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-300"

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function textoSeguro(value?: string | null, fallback = "Não informado") {
  const clean = String(value || "").trim()
  return clean || fallback
}

function getInitials(name?: string | null) {
  const clean = String(name || "").trim()

  if (!clean || clean === "-") return "?"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function gerarResumoChamado(chamado: ChamadoRow) {
  const partes = [
    chamado.categoria,
    chamado.subcategoria,
    chamado.equipamento,
    chamado.tipo,
  ].filter(Boolean)

  return partes.join(" • ") || "Sem detalhamento complementar"
}

function possuiFiltrosAtivos({
  busca,
  filtroStatus,
  filtroOrigem,
  filtroPrioridade,
  filtroResponsavel,
  ordenacao,
}: {
  busca: string
  filtroStatus: FiltroStatus
  filtroOrigem: FiltroOrigem
  filtroPrioridade: FiltroPrioridade
  filtroResponsavel: FiltroResponsavel
  ordenacao: Ordenacao
}) {
  return (
    busca.trim() ||
    filtroStatus !== "todos" ||
    filtroOrigem !== "todos" ||
    filtroPrioridade !== "todas" ||
    filtroResponsavel !== "todos" ||
    ordenacao !== "sla"
  )
}

export default function GestaoChamadosCommandCenter() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [chamados, setChamados] = useState<ChamadoRow[]>([])
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioResumo | null>(null)

  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos")
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>("todos")
  const [filtroPrioridade, setFiltroPrioridade] =
    useState<FiltroPrioridade>("todas")
  const [filtroResponsavel, setFiltroResponsavel] =
    useState<FiltroResponsavel>("todos")
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("sla")

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [modalResolucao, setModalResolucao] = useState<ModalResolucao>({
    id: null,
  })
  const [parecerTecnico, setParecerTecnico] = useState("")
  const [salvandoResolucao, setSalvandoResolucao] = useState(false)
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const carregarUsuarioAtual = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[Gestão de Chamados] Erro ao buscar usuário:", authError)
    }

    if (!user) {
      setUsuarioAtual(null)
      return null
    }

    const { data: profile } = await supabase
      .from("usuarios")
      .select("id, nome, email, role")
      .eq("id", user.id)
      .maybeSingle()

    const usuario: UsuarioResumo = {
      id: user.id,
      nome: profile?.nome || user.email || "Usuário",
      email: profile?.email || user.email || null,
      role: profile?.role || null,
    }

    if (mountedRef.current) {
      setUsuarioAtual(usuario)
    }

    return usuario
  }, [supabase])

  const carregarChamados = useCallback(
    async (modo: "inicial" | "manual" | "silencioso" = "silencioso") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setFeedback(null)

      try {
        const { data: chamadosData, error } = await supabase
          .from("chamados")
          .select(
            `
            id,
            titulo,
            descricao,
            categoria,
            subcategoria,
            origem,
            prioridade,
            sla_horas,
            status,
            solicitante_nome,
            solicitante_email,
            setor,
            escola,
            equipamento,
            analista_responsavel,
            created_at,
            updated_at,
            codigo,
            tipo,
            usuario_id,
            started_at,
            resolved_at,
            closed_at,
            visualizado_gestao,
            visualizado_pelo_usuario,
            retorno_devolutivo
          `
          )
          .order("created_at", { ascending: false })

        if (error) throw error

        const lista = (chamadosData || []) as Omit<
          ChamadoRow,
          "nome_analista_seguro" | "nome_dono_seguro"
        >[]

        const idsUsuarios = [
          ...new Set(
            lista
              .flatMap((chamado) => [
                chamado.usuario_id,
                chamado.analista_responsavel,
              ])
              .filter(Boolean) as string[]
          ),
        ]

        const mapaUsuarios: Record<string, UsuarioResumo> = {}

        if (idsUsuarios.length > 0) {
          const { data: usuariosData, error: usuariosError } = await supabase
            .from("usuarios")
            .select("id, nome, email, role")
            .in("id", idsUsuarios)

          if (usuariosError) {
            console.error(
              "[Gestão de Chamados] Erro ao buscar usuários:",
              usuariosError
            )
          }

          ;((usuariosData || []) as UsuarioResumo[]).forEach((usuario) => {
            mapaUsuarios[usuario.id] = usuario
          })
        }

        const enriquecidos: ChamadoRow[] = lista.map((chamado) => {
          const analista = chamado.analista_responsavel
            ? mapaUsuarios[chamado.analista_responsavel]
            : null

          const dono = chamado.usuario_id ? mapaUsuarios[chamado.usuario_id] : null

          return {
            ...chamado,
            nome_analista_seguro:
              analista?.nome ||
              analista?.email ||
              (chamado.analista_responsavel
                ? "Responsável não identificado"
                : "-"),
            nome_dono_seguro:
              chamado.solicitante_nome ||
              dono?.nome ||
              dono?.email ||
              chamado.solicitante_email ||
              "Solicitante não identificado",
          }
        })

        if (!mountedRef.current) return

        setChamados(enriquecidos)

        const idsNaoVisualizados = enriquecidos
          .filter((chamado) => chamado.visualizado_gestao === false)
          .map((chamado) => chamado.id)

        if (idsNaoVisualizados.length > 0) {
          await supabase
            .from("chamados")
            .update({ visualizado_gestao: true })
            .in("id", idsNaoVisualizados)
        }
      } catch (error) {
        console.error("[Gestão de Chamados] Erro ao carregar chamados:", error)

        if (!mountedRef.current) return

        setFeedback({
          type: "error",
          message:
            "Não foi possível carregar os chamados. Verifique a conexão e tente novamente.",
        })
      } finally {
        if (!mountedRef.current) return

        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  const carregarTudo = useCallback(
    async (modo: "inicial" | "manual" | "silencioso" = "silencioso") => {
      await carregarUsuarioAtual()
      await carregarChamados(modo)
    },
    [carregarChamados, carregarUsuarioAtual]
  )

  const carregarDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      carregarChamados("silencioso")
    }, 450)
  }, [carregarChamados])

  useEffect(() => {
    mountedRef.current = true

    carregarTudo("inicial")

    const channel = supabase
      .channel("gestao-chamados-command-center")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chamados" },
        () => carregarDebounced()
      )
      .subscribe()

    return () => {
      mountedRef.current = false

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      supabase.removeChannel(channel)
    }
  }, [carregarTudo, carregarDebounced, supabase])

  async function atualizarChamado(
    id: string,
    payload: Partial<ChamadoRow>,
    mensagemSucesso: string
  ) {
    setAcaoEmAndamento(id)
    setFeedback(null)

    try {
      const { error } = await supabase.from("chamados").update(payload).eq("id", id)

      if (error) throw error

      setFeedback({
        type: "success",
        message: mensagemSucesso,
      })

      await carregarChamados("silencioso")
    } catch (error) {
      console.error("[Gestão de Chamados] Erro ao atualizar chamado:", error)

      setFeedback({
        type: "error",
        message:
          "Não foi possível atualizar o chamado. Verifique sua permissão e tente novamente.",
      })
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  async function assumirChamado(chamado: ChamadoRow) {
    if (!usuarioAtual?.id) {
      setFeedback({
        type: "error",
        message: "Não foi possível identificar o usuário logado.",
      })
      return
    }

    await atualizarChamado(
      chamado.id,
      {
        status: "assumido",
        analista_responsavel: usuarioAtual.id,
        visualizado_pelo_usuario: false,
        updated_at: new Date().toISOString(),
      },
      `Chamado ${chamado.codigo || ""} assumido com sucesso.`
    )
  }

  async function atenderChamado(chamado: ChamadoRow) {
    if (!usuarioAtual?.id) {
      setFeedback({
        type: "error",
        message: "Não foi possível identificar o usuário logado.",
      })
      return
    }

    setAcaoEmAndamento(chamado.id)

    try {
      const payload: Partial<ChamadoRow> = {
        status: "em_atendimento",
        analista_responsavel: chamado.analista_responsavel || usuarioAtual.id,
        started_at: chamado.started_at || new Date().toISOString(),
        visualizado_pelo_usuario: false,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("chamados")
        .update(payload)
        .eq("id", chamado.id)

      if (error) throw error

      router.push(`/gestao-chamados/${chamado.id}`)
    } catch (error) {
      console.error("[Gestão de Chamados] Erro ao atender chamado:", error)

      setFeedback({
        type: "error",
        message: "Não foi possível iniciar o atendimento do chamado.",
      })

      setAcaoEmAndamento(null)
    }
  }

  function abrirModalResolucao(chamado: ChamadoRow) {
    setModalResolucao({
      id: chamado.id,
      codigo: chamado.codigo,
      titulo: chamado.titulo,
    })

    setParecerTecnico(chamado.retorno_devolutivo || "")
  }

  async function confirmarResolucao() {
    if (!modalResolucao.id) return

    const parecer = parecerTecnico.trim()

    if (parecer.length < 15) {
      setFeedback({
        type: "error",
        message:
          "O parecer técnico é obrigatório e deve conter uma descrição mínima da solução aplicada.",
      })
      return
    }

    setSalvandoResolucao(true)
    setFeedback(null)

    try {
      const payload: Partial<ChamadoRow> = {
        status: "resolvido",
        resolved_at: new Date().toISOString(),
        retorno_devolutivo: parecer,
        visualizado_pelo_usuario: false,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("chamados")
        .update(payload)
        .eq("id", modalResolucao.id)

      if (error) throw error

      setModalResolucao({ id: null })
      setParecerTecnico("")

      setFeedback({
        type: "success",
        message: "Chamado resolvido e retorno devolutivo registrado com sucesso.",
      })

      await carregarChamados("silencioso")
    } catch (error) {
      console.error("[Gestão de Chamados] Erro ao resolver chamado:", error)

      setFeedback({
        type: "error",
        message:
          "Não foi possível finalizar o chamado. Verifique a conexão e tente novamente.",
      })
    } finally {
      setSalvandoResolucao(false)
    }
  }

  async function reabrirChamado(chamado: ChamadoRow) {
    await atualizarChamado(
      chamado.id,
      {
        status: "aberto",
        started_at: null,
        resolved_at: null,
        closed_at: null,
        analista_responsavel: null,
        retorno_devolutivo: null,
        visualizado_pelo_usuario: false,
        updated_at: new Date().toISOString(),
      },
      `Chamado ${chamado.codigo || ""} reaberto com sucesso.`
    )
  }

  const chamadosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    let base = chamados.filter((chamado) => {
      const status = normalizarStatus(chamado.status)
      const origem = normalizarTexto(chamado.origem)
      const prioridade = normalizarPrioridade(chamado.prioridade)

      if (filtroStatus !== "todos" && status !== filtroStatus) return false
      if (filtroOrigem !== "todos" && origem !== filtroOrigem) return false
      if (filtroPrioridade !== "todas" && prioridade !== filtroPrioridade) return false

      if (filtroResponsavel === "meus") {
        if (!usuarioAtual?.id || chamado.analista_responsavel !== usuarioAtual.id) {
          return false
        }
      }

      if (filtroResponsavel === "sem_responsavel") {
        if (chamado.analista_responsavel) return false
      }

      if (!termo) return true

      const conteudoBusca = normalizarTexto(
        [
          chamado.codigo,
          chamado.titulo,
          chamado.descricao,
          chamado.categoria,
          chamado.subcategoria,
          chamado.origem,
          chamado.prioridade,
          chamado.status,
          chamado.solicitante_nome,
          chamado.solicitante_email,
          chamado.setor,
          chamado.escola,
          chamado.equipamento,
          chamado.tipo,
          chamado.nome_analista_seguro,
          chamado.nome_dono_seguro,
        ].join(" ")
      )

      return conteudoBusca.includes(termo)
    })

    base = [...base].sort((a, b) => {
      if (ordenacao === "recentes") {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        )
      }

      if (ordenacao === "antigos") {
        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        )
      }

      if (ordenacao === "prioridade") {
        return (
          (PRIORIDADE_PESO[normalizarPrioridade(b.prioridade)] || 0) -
          (PRIORIDADE_PESO[normalizarPrioridade(a.prioridade)] || 0)
        )
      }

      const slaA = calcularSLA(a)
      const slaB = calcularSLA(b)

      if (slaA.atrasado && !slaB.atrasado) return -1
      if (!slaA.atrasado && slaB.atrasado) return 1

      return slaA.minutosRestantes - slaB.minutosRestantes
    })

    return base
  }, [
    chamados,
    busca,
    filtroStatus,
    filtroOrigem,
    filtroPrioridade,
    filtroResponsavel,
    ordenacao,
    usuarioAtual?.id,
  ])

  const stats = useMemo(() => {
    const filaAtiva = chamadosFiltrados.filter(
      (chamado) =>
        !["resolvido", "fechado"].includes(normalizarStatus(chamado.status))
    ).length

    const emAtendimento = chamadosFiltrados.filter((chamado) =>
      ["assumido", "em_atendimento"].includes(normalizarStatus(chamado.status))
    ).length

    const atrasados = chamadosFiltrados.filter(
      (chamado) => calcularSLA(chamado).atrasado
    ).length

    const resolvidos = chamadosFiltrados.filter((chamado) =>
      ["resolvido", "fechado"].includes(normalizarStatus(chamado.status))
    ).length

    return {
      total: chamadosFiltrados.length,
      filaAtiva,
      emAtendimento,
      atrasados,
      resolvidos,
    }
  }, [chamadosFiltrados])

  const filtrosAtivos = Boolean(
    possuiFiltrosAtivos({
      busca,
      filtroStatus,
      filtroOrigem,
      filtroPrioridade,
      filtroResponsavel,
      ordenacao,
    })
  )

  function limparFiltros() {
    setBusca("")
    setFiltroStatus("todos")
    setFiltroOrigem("todos")
    setFiltroPrioridade("todas")
    setFiltroResponsavel("todos")
    setOrdenacao("sla")
  }

  if (loading) {
    return <LoadingDashboard />
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="emerald">SLA útil</Badge>
              <Badge tone="blue">Gestão de Chamados</Badge>
            </div>

            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-4xl">
              Central de{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-blue-600 bg-clip-text text-transparent">
                Atendimento SETEC
              </span>
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400">
              Triagem e acompanhamento dos chamados com prazo contado apenas em
              horário útil de Guarulhos/SP: segunda a sexta, das 08h às 18h.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
            <MiniStat label="Fila ativa" value={stats.filaAtiva} tone="blue" />
            <MiniStat label="Em atendimento" value={stats.emAtendimento} tone="yellow" />
            <MiniStat label="SLA atrasado" value={stats.atrasados} tone="red" />
            <MiniStat label="Resolvidos" value={stats.resolvidos} tone="emerald" />
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm font-semibold ${
            feedback.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : feedback.type === "error"
                ? "border-red-500/25 bg-red-500/10 text-red-200"
                : "border-blue-500/25 bg-blue-500/10 text-blue-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl md:p-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.7fr_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-slate-500">🔎</span>

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por código, escola, título, solicitante ou categoria..."
              className="w-full border-none bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
            />

            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="rounded-xl px-2 py-1 text-xs font-bold text-slate-500 transition-all hover:bg-slate-800 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          <Select value={filtroStatus} onChange={setFiltroStatus}>
            <option value="todos">Todos os status</option>
            <option value="aberto">Abertos</option>
            <option value="assumido">Assumidos</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="resolvido">Resolvidos</option>
            <option value="fechado">Fechados</option>
          </Select>

          <Select value={filtroOrigem} onChange={setFiltroOrigem}>
            <option value="todos">Todas as origens</option>
            <option value="ure">URE</option>
            <option value="escola">Escola</option>
          </Select>

          <Select value={filtroPrioridade} onChange={setFiltroPrioridade}>
            <option value="todas">Todas prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </Select>

          <Select value={filtroResponsavel} onChange={setFiltroResponsavel}>
            <option value="todos">Todos responsáveis</option>
            <option value="meus">Meus chamados</option>
            <option value="sem_responsavel">Sem responsável</option>
          </Select>

          <Select value={ordenacao} onChange={setOrdenacao}>
            <option value="sla">Ordenar por SLA</option>
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
            <option value="prioridade">Prioridade</option>
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium text-slate-500">
              Exibindo{" "}
              <span className="font-bold text-slate-300">
                {chamadosFiltrados.length}
              </span>{" "}
              chamado(s).
            </p>

            {filtrosAtivos && (
              <button
                type="button"
                onClick={limparFiltros}
                className="text-xs font-bold text-cyan-400 transition-all hover:text-cyan-300"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => carregarTudo("manual")}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            Atualizar
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {chamadosFiltrados.length === 0 ? (
          <EmptyState />
        ) : (
          chamadosFiltrados.map((chamado) => (
            <ChamadoCard
              key={chamado.id}
              chamado={chamado}
              acaoEmAndamento={acaoEmAndamento}
              onAssumir={assumirChamado}
              onAtender={atenderChamado}
              onResolver={abrirModalResolucao}
              onReabrir={reabrirChamado}
            />
          ))
        )}
      </section>

      {modalResolucao.id && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl">
            <div className="relative overflow-hidden border-b border-slate-800 bg-emerald-500/10 p-6 md:p-8">
              <div className="absolute left-0 top-0 h-1 w-full bg-emerald-500" />

              <p className="mb-3 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Encerramento formal
              </p>

              <h3 className="text-2xl font-black text-white md:text-3xl">
                Concluir chamado{" "}
                {modalResolucao.codigo ? `#${modalResolucao.codigo}` : ""}
              </h3>

              <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100/70">
                Registre o retorno devolutivo que será vinculado ao chamado.
              </p>

              {modalResolucao.titulo && (
                <p className="mt-4 rounded-2xl border border-slate-800 bg-[#020617]/70 p-4 text-sm font-semibold text-slate-300">
                  {modalResolucao.titulo}
                </p>
              )}
            </div>

            <div className="bg-[#020617] p-6 md:p-8">
              <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Parecer técnico / retorno devolutivo *
              </label>

              <textarea
                value={parecerTecnico}
                onChange={(event) => setParecerTecnico(event.target.value)}
                placeholder="Descreva objetivamente a análise realizada, a ação aplicada e a situação final do chamado."
                className="custom-scrollbar h-44 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-sm font-medium leading-relaxed text-white outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />

              <p className="mt-3 text-xs font-medium text-slate-600">
                Mínimo recomendado: 15 caracteres.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={salvandoResolucao}
                onClick={() => {
                  setModalResolucao({ id: null })
                  setParecerTecnico("")
                }}
                className="rounded-xl bg-slate-800 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={salvandoResolucao}
                onClick={confirmarResolucao}
                className="rounded-xl bg-emerald-600 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvandoResolucao ? "Finalizando..." : "Finalizar chamado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ChamadoCard({
  chamado,
  acaoEmAndamento,
  onAssumir,
  onAtender,
  onResolver,
  onReabrir,
}: {
  chamado: ChamadoRow
  acaoEmAndamento: string | null
  onAssumir: (chamado: ChamadoRow) => void | Promise<void>
  onAtender: (chamado: ChamadoRow) => void | Promise<void>
  onResolver: (chamado: ChamadoRow) => void
  onReabrir: (chamado: ChamadoRow) => void | Promise<void>
}) {
  const sla = calcularSLA(chamado)
  const status = normalizarStatus(chamado.status)
  const bloqueado = acaoEmAndamento === chamado.id
  const isConcluido = status === "resolvido" || status === "fechado"

  return (
    <article
      className={`relative overflow-hidden rounded-[1.5rem] border bg-[#020617] p-4 shadow-lg transition-all hover:border-slate-700 md:p-5 ${
        sla.atrasado
          ? "border-red-500/40"
          : sla.vencendo
            ? "border-yellow-500/35"
            : "border-slate-800"
      }`}
    >
      {sla.atrasado && <div className="absolute left-0 top-0 h-1 w-full bg-red-500" />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[150px_1fr_190px_145px] xl:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
            Protocolo
          </p>

          <p className="mt-1 text-base font-black text-slate-300">
            #{chamado.codigo || "Sem código"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge toneByClass={prioridadeClass(chamado.prioridade)}>
              {formatarPrioridade(chamado.prioridade)}
            </Badge>

            <Badge toneByClass={statusClass(chamado.status)}>
              {formatarStatus(chamado.status)}
            </Badge>
          </div>
        </div>

        <div className="min-w-0 xl:border-l xl:border-slate-800 xl:pl-5">
          <a
            href={`/gestao-chamados/${chamado.id}`}
            className="line-clamp-1 text-lg font-black text-white transition-all hover:text-cyan-300"
          >
            {textoSeguro(chamado.titulo, "Chamado sem título")}
          </a>

          <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">
            {textoSeguro(chamado.descricao, "Sem descrição informada.")}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <InfoChip icon="👤" text={chamado.nome_dono_seguro} />
            <InfoChip
              icon="🏫"
              text={chamado.escola || chamado.setor || "Origem não informada"}
            />
            <InfoChip icon="🧩" text={gerarResumoChamado(chamado)} />

            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${origemClass(
                chamado.origem
              )}`}
            >
              {chamado.origem || "Origem N/I"}
            </span>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-600">
            Criado em {formatarData(chamado.created_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              SLA útil
            </p>

            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                sla.atrasado
                  ? "bg-red-500/10 text-red-300"
                  : sla.vencendo
                    ? "bg-yellow-500/10 text-yellow-300"
                    : isConcluido
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-cyan-500/10 text-cyan-300"
              }`}
            >
              {sla.label}
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#020617]">
            <div
              className={`h-full rounded-full ${
                sla.atrasado
                  ? "bg-red-500"
                  : sla.vencendo
                    ? "bg-yellow-500"
                    : isConcluido
                      ? "bg-emerald-500"
                      : "bg-cyan-500"
              }`}
              style={{ width: `${sla.percent}%` }}
            />
          </div>

          <p className="mt-3 line-clamp-2 text-[11px] font-medium text-slate-500">
            {sla.descricao}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-[10px] font-black text-white">
              {getInitials(chamado.nome_analista_seguro)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-300">
                {chamado.nome_analista_seguro}
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                Responsável
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {status === "aberto" && (
            <ActionButton
              disabled={bloqueado}
              onClick={() => onAssumir(chamado)}
              variant="blue"
            >
              Assumir
            </ActionButton>
          )}

          {(status === "aberto" || status === "assumido") && (
            <ActionButton
              disabled={bloqueado}
              onClick={() => onAtender(chamado)}
              variant="yellow"
            >
              Atender
            </ActionButton>
          )}

          {!isConcluido && (
            <ActionButton
              disabled={bloqueado}
              onClick={() => onResolver(chamado)}
              variant="emerald"
            >
              Resolver
            </ActionButton>
          )}

          {isConcluido && (
            <ActionButton
              disabled={bloqueado}
              onClick={() => onReabrir(chamado)}
              variant="slate"
            >
              Reabrir
            </ActionButton>
          )}

          <a
            href={`/gestao-chamados/${chamado.id}`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300"
          >
            Detalhes
          </a>
        </div>
      </div>
    </article>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: string
  onClick: () => void
  disabled?: boolean
  variant: "blue" | "yellow" | "emerald" | "slate"
}) {
  const classes = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20",
    yellow:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20",
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    slate: "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]}`}
    >
      {disabled ? "Aguarde..." : children}
    </button>
  )
}

function InfoChip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-slate-400">
      <span>{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  )
}

function Badge({
  children,
  tone,
  toneByClass,
}: {
  children: ReactNode
  tone?:
    | "blue"
    | "cyan"
    | "emerald"
    | "red"
    | "yellow"
    | "purple"
    | "orange"
    | "slate"
  toneByClass?: string
}) {
  const tones = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    slate: "border-slate-700 bg-slate-900 text-slate-400",
  }

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
        toneByClass || tones[tone || "slate"]
      }`}
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
  tone: "blue" | "yellow" | "red" | "emerald"
}) {
  const colors = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    emerald: "bg-emerald-500",
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>

      <div className={`mt-3 h-1 rounded-full ${colors[tone]}`} />
    </div>
  )
}

function Select<T extends string>({
  value,
  onChange,
  children,
}: {
  value: T
  onChange: (value: T) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-sm font-bold text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {children}
    </select>
  )
}

function LoadingDashboard() {
  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <div className="h-52 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/50" />

      <div className="h-24 animate-pulse rounded-[2rem] bg-slate-900/50" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[1.5rem] bg-slate-900/50"
          />
        ))}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-800 bg-[#020617]/50 p-12 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 text-4xl">
        📭
      </div>

      <h3 className="text-xl font-black text-white">Nenhum chamado encontrado</h3>

      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        Não há chamados correspondentes aos filtros selecionados. Ajuste a busca
        ou limpe os filtros para visualizar mais registros.
      </p>
    </div>
  )
}