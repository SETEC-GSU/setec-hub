"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type ChamadoRow = {
  id: string
  codigo: string | null
  titulo: string | null
  descricao: string | null
  categoria: string | null
  origem: string | null
  prioridade: string | null
  status: string | null
  solicitante_nome: string | null
  solicitante_email: string | null
  setor: string | null
  escola: string | null
  usuario_id: string | null
  analista_responsavel: string | null
  created_at: string | null
  updated_at: string | null
  resolved_at: string | null
  closed_at: string | null
  started_at: string | null
  visualizado_gestao: boolean | null
  visualizado_pelo_usuario: boolean | null

  // Campos utilizados somente na visão administrativa.
  // retorno_devolutivo é o parecer/resolução registrado ao finalizar o chamado.
  retorno_devolutivo?: string | null
  sla_horas?: number | null
}

type UsuarioRow = {
  id: string
  nome: string | null
  email: string | null
  role: string | null
  setor: string | null
}

type RankingItem = {
  key: string
  label: string
  quantidade: number
}

type RankingAtendimentoItem = {
  key: string
  label: string
  total: number
  resolvidos: number
  ativos: number
  taxaResolucao: number
  mediaResolucaoHoras: number | null
}

type FiltroStatus =
  | ""
  | "aberto"
  | "assumido"
  | "em_atendimento"
  | "resolvido"
  | "fechado"

type Feedback = {
  type: "error" | "info"
  message: string
} | null

const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#06b6d4",
  "#a855f7",
]

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  assumido: "Assumido",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
}

const prioridadeLabel: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}

const ADMIN_PANEL_ROLES = new Set(["admin", "seintec", "analista", "dirigente"])

function podeVerPainelAdministrativo(role?: string | null) {
  return ADMIN_PANEL_ROLES.has(normalizarTexto(role))
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function textoSeguro(value: unknown, fallback = "Não informado") {
  const clean = String(value || "").trim()
  return clean || fallback
}

function normalizarStatus(value?: string | null) {
  return normalizarTexto(value || "aberto").replaceAll(" ", "_")
}

function normalizarPrioridade(value?: string | null) {
  const prioridade = normalizarTexto(value || "media")

  if (prioridade.includes("critica")) return "critica"
  if (prioridade.includes("alta")) return "alta"
  if (prioridade.includes("media")) return "media"
  if (prioridade.includes("baixa")) return "baixa"

  return prioridade || "media"
}

function formatarStatus(value?: string | null) {
  const status = normalizarStatus(value)

  return (
    statusLabel[status] ||
    status
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

function formatarPrioridade(value?: string | null) {
  const prioridade = normalizarPrioridade(value)
  return prioridadeLabel[prioridade] || "Média"
}

function getHojeSP() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function getDateKeySP(dataIso?: string | null) {
  if (!dataIso) return ""

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return ""

  return data.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function getMesKey(dataIso?: string | null) {
  if (!dataIso) return ""

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return ""

  const ano = data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  })

  const mes = data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
  })

  return `${ano}-${mes}`
}

function getMesLabel(mesKey: string) {
  const [ano, mes] = mesKey.split("-")

  if (!ano || !mes) return mesKey

  const data = new Date(Number(ano), Number(mes) - 1, 1)

  return data.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  })
}

function formatarDataHoraBR(dataIso?: string | null) {
  if (!dataIso) return "Não informado"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Não informado"

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function diferencaHoras(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return null

  const dataInicio = new Date(inicio)
  const dataFim = new Date(fim)

  if (
    Number.isNaN(dataInicio.getTime()) ||
    Number.isNaN(dataFim.getTime())
  ) {
    return null
  }

  const horas = (dataFim.getTime() - dataInicio.getTime()) / 3_600_000

  return horas >= 0 ? horas : null
}

function idadeHoras(dataIso?: string | null) {
  if (!dataIso) return null

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return null

  const horas = (Date.now() - data.getTime()) / 3_600_000
  return horas >= 0 ? horas : null
}

function mediaNumeros(valores: Array<number | null>) {
  const validos = valores.filter(
    (valor): valor is number => typeof valor === "number" && Number.isFinite(valor)
  )

  if (validos.length === 0) return null

  return validos.reduce((acc, valor) => acc + valor, 0) / validos.length
}

function formatarHoras(valor?: number | null) {
  if (valor == null || !Number.isFinite(valor)) return "—"

  if (valor < 1) {
    return `${Math.max(1, Math.round(valor * 60))} min`
  }

  if (valor < 24) {
    return `${valor.toFixed(valor >= 10 ? 0 : 1)} h`
  }

  const dias = valor / 24
  return `${dias.toFixed(dias >= 10 ? 0 : 1)} d`
}

function chamadoFinalizado(chamado: ChamadoRow) {
  return ["resolvido", "fechado"].includes(normalizarStatus(chamado.status))
}

function agruparPorCampo(
  chamados: ChamadoRow[],
  getLabel: (chamado: ChamadoRow) => string,
  limite = 10
): RankingItem[] {
  const mapa = new Map<string, RankingItem>()

  chamados.forEach((chamado) => {
    const label = textoSeguro(getLabel(chamado), "Não definido")
    const key = normalizarTexto(label) || "nao_definido"
    const atual = mapa.get(key)

    if (atual) {
      atual.quantidade += 1
    } else {
      mapa.set(key, {
        key,
        label,
        quantidade: 1,
      })
    }
  })

  return Array.from(mapa.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite)
}

function SafeTooltip({ active, payload, label }: any) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null
  }

  const titulo =
    label ||
    payload[0]?.payload?.label ||
    payload[0]?.payload?.name ||
    payload[0]?.payload?.mes ||
    "Item"

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#020617] p-4 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {String(titulo)}
      </p>

      {payload.map((entry: any, index: number) => (
        <p key={index} className="mt-1 text-sm font-black text-white">
          {entry.name || "Quantidade"}:{" "}
          <span className="text-cyan-300">{entry.value || 0}</span>
        </p>
      ))}
    </div>
  )
}

export default function PainelChamados() {
  const supabase = useMemo(() => createClient(), [])

  const [chamados, setChamados] = useState<ChamadoRow[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [filtroOrigem, setFiltroOrigem] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("")
  const [busca, setBusca] = useState("")

  const [modoAdministrativo, setModoAdministrativo] = useState(false)
  const [filtroAnalistaAdmin, setFiltroAnalistaAdmin] = useState("")
  const [filtroPrioridadeAdmin, setFiltroPrioridadeAdmin] = useState("")

  const carregar = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setFeedback(null)

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          console.error("[Painel Chamados] Erro ao identificar usuário:", authError)
        }

        let perfilAtual: UsuarioRow | null = null

        if (user?.id) {
          const perfilPorId = await supabase
            .from("usuarios")
            .select("id,nome,email,role,setor")
            .eq("id", user.id)
            .maybeSingle()

          if (perfilPorId.data) {
            perfilAtual = perfilPorId.data as UsuarioRow
          } else if (user.email) {
            const perfilPorEmail = await supabase
              .from("usuarios")
              .select("id,nome,email,role,setor")
              .ilike("email", user.email)
              .maybeSingle()

            perfilAtual = (perfilPorEmail.data || null) as UsuarioRow | null
          }
        }

        setUsuarioAtual(perfilAtual)

        const acessoAdministrativo = podeVerPainelAdministrativo(perfilAtual?.role)

        /*
         * IMPORTANTE:
         * Mantemos duas queries literais em vez de interpolar campos dentro
         * do .select(). O parser de tipos do Supabase interpreta a string
         * de seleção em tempo de compilação e não aceita bem uma seleção
         * construída dinamicamente.
         *
         * Perfis administrativos recebem também retorno_devolutivo e sla_horas.
         * Os demais perfis continuam consultando somente os campos operacionais.
         */
        let listaChamados: ChamadoRow[] = []

        if (acessoAdministrativo) {
          const { data: chamadosData, error: chamadosError } = await supabase
            .from("chamados")
            .select(
              `
              id,
              codigo,
              titulo,
              descricao,
              categoria,
              origem,
              prioridade,
              status,
              solicitante_nome,
              solicitante_email,
              setor,
              escola,
              usuario_id,
              analista_responsavel,
              created_at,
              updated_at,
              resolved_at,
              closed_at,
              started_at,
              visualizado_gestao,
              visualizado_pelo_usuario,
              retorno_devolutivo,
              sla_horas
            `
            )
            .order("created_at", { ascending: false })

          if (chamadosError) throw chamadosError

          listaChamados = (chamadosData || []).map((chamado) => ({
            ...chamado,
          })) as ChamadoRow[]
        } else {
          const { data: chamadosData, error: chamadosError } = await supabase
            .from("chamados")
            .select(
              `
              id,
              codigo,
              titulo,
              descricao,
              categoria,
              origem,
              prioridade,
              status,
              solicitante_nome,
              solicitante_email,
              setor,
              escola,
              usuario_id,
              analista_responsavel,
              created_at,
              updated_at,
              resolved_at,
              closed_at,
              started_at,
              visualizado_gestao,
              visualizado_pelo_usuario
            `
            )
            .order("created_at", { ascending: false })

          if (chamadosError) throw chamadosError

          listaChamados = (chamadosData || []).map((chamado) => ({
            ...chamado,
            retorno_devolutivo: null,
            sla_horas: null,
          })) as ChamadoRow[]
        }

        setChamados(listaChamados)

        /*
         * Antes a página buscava apenas usuario_id (solicitante).
         * Para o ranking administrativo também precisamos resolver o nome
         * de quem ASSUMIU o chamado em analista_responsavel.
         */
        const idsUsuarios = [
          ...new Set(
            listaChamados
              .flatMap((chamado) => [
                chamado.usuario_id,
                chamado.analista_responsavel,
              ])
              .filter(Boolean) as string[]
          ),
        ]

        if (idsUsuarios.length === 0) {
          setUsuarios(perfilAtual ? [perfilAtual] : [])
        } else {
          const { data: usuariosData, error: usuariosError } = await supabase
            .from("usuarios")
            .select("id,nome,email,role,setor")
            .in("id", idsUsuarios)

          if (usuariosError) {
            console.error(
              "[Painel Chamados] Erro ao buscar usuários:",
              usuariosError
            )
            setUsuarios(perfilAtual ? [perfilAtual] : [])
          } else {
            const listaUsuarios = (usuariosData || []) as UsuarioRow[]

            if (
              perfilAtual &&
              !listaUsuarios.some((usuario) => usuario.id === perfilAtual?.id)
            ) {
              listaUsuarios.push(perfilAtual)
            }

            setUsuarios(listaUsuarios)
          }
        }
      } catch (error) {
        console.error("[Painel Chamados] Erro ao carregar dados:", error)

        setFeedback({
          type: "error",
          message:
            "Não foi possível carregar os dados do painel. Verifique a conexão e tente novamente.",
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    carregar("inicial")
  }, [carregar])

  const usuarioMap = useMemo(() => {
    const mapa = new Map<string, UsuarioRow>()

    usuarios.forEach((usuario) => {
      mapa.set(usuario.id, usuario)
    })

    return mapa
  }, [usuarios])

  const podeAcessarAdministrativo = useMemo(
    () => podeVerPainelAdministrativo(usuarioAtual?.role),
    [usuarioAtual?.role]
  )

  useEffect(() => {
    if (!podeAcessarAdministrativo && modoAdministrativo) {
      setModoAdministrativo(false)
      setFiltroAnalistaAdmin("")
      setFiltroPrioridadeAdmin("")
    }
  }, [modoAdministrativo, podeAcessarAdministrativo])

  const listaAnalistasAdmin = useMemo(() => {
    const ids = new Set(
      chamados
        .map((chamado) => chamado.analista_responsavel)
        .filter(Boolean) as string[]
    )

    return Array.from(ids)
      .map((id) => {
        const usuario = usuarioMap.get(id)

        return {
          id,
          nome:
            usuario?.nome ||
            usuario?.email ||
            `Responsável ${id.slice(0, 8)}`,
        }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [chamados, usuarioMap])

  const listaOrigens = useMemo(() => {
    return Array.from(
      new Set(
        chamados
          .map((chamado) => textoSeguro(chamado.origem, "Outros").toUpperCase())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [chamados])

  const listaMeses = useMemo(() => {
    const meses = Array.from(
      new Set(
        chamados.map((chamado) => getMesKey(chamado.created_at)).filter(Boolean)
      )
    )

    return meses
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        key,
        label: getMesLabel(key),
      }))
  }, [chamados])

  const chamadosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    return chamados.filter((chamado) => {
      const origem = textoSeguro(chamado.origem, "Outros").toUpperCase()
      const mes = getMesKey(chamado.created_at)
      const status = normalizarStatus(chamado.status)

      if (filtroOrigem && origem !== filtroOrigem) return false
      if (filtroMes && mes !== filtroMes) return false
      if (filtroStatus && status !== filtroStatus) return false

      if (modoAdministrativo && podeAcessarAdministrativo) {
        if (
          filtroPrioridadeAdmin &&
          normalizarPrioridade(chamado.prioridade) !== filtroPrioridadeAdmin
        ) {
          return false
        }

        if (filtroAnalistaAdmin === "__sem_responsavel__") {
          if (chamado.analista_responsavel) return false
        } else if (
          filtroAnalistaAdmin &&
          chamado.analista_responsavel !== filtroAnalistaAdmin
        ) {
          return false
        }
      }

      if (!termo) return true

      const usuario = chamado.usuario_id ? usuarioMap.get(chamado.usuario_id) : null
      const analista = chamado.analista_responsavel
        ? usuarioMap.get(chamado.analista_responsavel)
        : null

      const conteudo = normalizarTexto(
        [
          chamado.codigo,
          chamado.titulo,
          chamado.descricao,
          chamado.retorno_devolutivo,
          chamado.categoria,
          chamado.origem,
          chamado.prioridade,
          chamado.status,
          chamado.solicitante_nome,
          chamado.solicitante_email,
          chamado.setor,
          chamado.escola,
          usuario?.nome,
          usuario?.email,
          analista?.nome,
          analista?.email,
        ].join(" ")
      )

      return conteudo.includes(termo)
    })
  }, [
    busca,
    chamados,
    filtroAnalistaAdmin,
    filtroMes,
    filtroOrigem,
    filtroPrioridadeAdmin,
    filtroStatus,
    modoAdministrativo,
    podeAcessarAdministrativo,
    usuarioMap,
  ])

  const stats = useMemo(() => {
    const total = chamadosFiltrados.length

    const abertos = chamadosFiltrados.filter(
      (chamado) => normalizarStatus(chamado.status) === "aberto"
    ).length

    const emAtendimento = chamadosFiltrados.filter((chamado) =>
      ["assumido", "em_atendimento"].includes(normalizarStatus(chamado.status))
    ).length

    const resolvidos = chamadosFiltrados.filter((chamado) =>
      ["resolvido", "fechado"].includes(normalizarStatus(chamado.status))
    ).length

    const hoje = getHojeSP()

    const resolvidosHoje = chamadosFiltrados.filter((chamado) => {
      const dataFinalizacao = chamado.resolved_at || chamado.closed_at
      return getDateKeySP(dataFinalizacao) === hoje
    }).length

    const naoVisualizadosGestao = chamadosFiltrados.filter(
      (chamado) => chamado.visualizado_gestao === false
    ).length

    const taxaResolucao = total > 0 ? Math.round((resolvidos / total) * 100) : 0

    return {
      total,
      abertos,
      emAtendimento,
      resolvidos,
      resolvidosHoje,
      naoVisualizadosGestao,
      taxaResolucao,
    }
  }, [chamadosFiltrados])

  const rankingCategorias = useMemo(() => {
    return agruparPorCampo(
      chamadosFiltrados,
      (chamado) => chamado.categoria || "Não definida",
      12
    )
  }, [chamadosFiltrados])

  const rankingUsuarios = useMemo(() => {
    const mapa = new Map<string, RankingItem>()

    chamadosFiltrados.forEach((chamado) => {
      const usuario = chamado.usuario_id ? usuarioMap.get(chamado.usuario_id) : null

      const label =
        usuario?.nome ||
        chamado.solicitante_nome ||
        chamado.solicitante_email ||
        "Usuário não identificado"

      const key = chamado.usuario_id || normalizarTexto(label)
      const atual = mapa.get(key)

      if (atual) {
        atual.quantidade += 1
      } else {
        mapa.set(key, {
          key,
          label,
          quantidade: 1,
        })
      }
    })

    return Array.from(mapa.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 12)
  }, [chamadosFiltrados, usuarioMap])

  const rankingAtendimentos = useMemo<RankingAtendimentoItem[]>(() => {
    const mapa = new Map<
      string,
      {
        key: string
        label: string
        total: number
        resolvidos: number
        ativos: number
        temposResolucao: number[]
      }
    >()

    chamadosFiltrados.forEach((chamado) => {
      const responsavelId = chamado.analista_responsavel

      if (!responsavelId) return

      const usuario = usuarioMap.get(responsavelId)
      const label =
        usuario?.nome ||
        usuario?.email ||
        `Responsável ${responsavelId.slice(0, 8)}`

      const atual =
        mapa.get(responsavelId) || {
          key: responsavelId,
          label,
          total: 0,
          resolvidos: 0,
          ativos: 0,
          temposResolucao: [],
        }

      atual.total += 1

      if (chamadoFinalizado(chamado)) {
        atual.resolvidos += 1

        const horas = diferencaHoras(
          chamado.created_at,
          chamado.resolved_at || chamado.closed_at
        )

        if (horas != null) {
          atual.temposResolucao.push(horas)
        }
      } else {
        atual.ativos += 1
      }

      mapa.set(responsavelId, atual)
    })

    return Array.from(mapa.values())
      .map((item) => ({
        key: item.key,
        label: item.label,
        total: item.total,
        resolvidos: item.resolvidos,
        ativos: item.ativos,
        taxaResolucao:
          item.total > 0
            ? Math.round((item.resolvidos / item.total) * 100)
            : 0,
        mediaResolucaoHoras:
          item.temposResolucao.length > 0
            ? item.temposResolucao.reduce((acc, valor) => acc + valor, 0) /
              item.temposResolucao.length
            : null,
      }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.resolvidos - a.resolvidos ||
          a.label.localeCompare(b.label, "pt-BR")
      )
      .slice(0, 15)
  }, [chamadosFiltrados, usuarioMap])

  const adminStats = useMemo(() => {
    const total = chamadosFiltrados.length

    const semResponsavel = chamadosFiltrados.filter(
      (chamado) => !chamado.analista_responsavel
    ).length

    const comResponsavel = total - semResponsavel

    const ativos = chamadosFiltrados.filter(
      (chamado) => !chamadoFinalizado(chamado)
    )

    const criticosAtivos = ativos.filter(
      (chamado) => normalizarPrioridade(chamado.prioridade) === "critica"
    ).length

    const backlog72h = ativos.filter((chamado) => {
      const horas = idadeHoras(chamado.created_at)
      return horas != null && horas >= 72
    }).length

    const foraSla = ativos.filter((chamado) => {
      const sla = Number(chamado.sla_horas || 0)
      const horas = idadeHoras(chamado.created_at)

      return sla > 0 && horas != null && horas > sla
    }).length

    const finalizados = chamadosFiltrados.filter(chamadoFinalizado)

    const comDevolutiva = finalizados.filter(
      (chamado) => textoSeguro(chamado.retorno_devolutivo, "").length > 0
    ).length

    const tempoMedioInicio = mediaNumeros(
      chamadosFiltrados.map((chamado) =>
        diferencaHoras(chamado.created_at, chamado.started_at)
      )
    )

    const tempoMedioResolucao = mediaNumeros(
      finalizados.map((chamado) =>
        diferencaHoras(
          chamado.created_at,
          chamado.resolved_at || chamado.closed_at
        )
      )
    )

    return {
      total,
      semResponsavel,
      comResponsavel,
      criticosAtivos,
      backlog72h,
      foraSla,
      comDevolutiva,
      taxaDevolutiva:
        finalizados.length > 0
          ? Math.round((comDevolutiva / finalizados.length) * 100)
          : 0,
      tempoMedioInicio,
      tempoMedioResolucao,
    }
  }, [chamadosFiltrados])

  const dadosStatus = useMemo(() => {
    return agruparPorCampo(
      chamadosFiltrados,
      (chamado) => formatarStatus(chamado.status),
      8
    )
  }, [chamadosFiltrados])

  const dadosOrigem = useMemo(() => {
    return agruparPorCampo(
      chamadosFiltrados,
      (chamado) => textoSeguro(chamado.origem, "Outros").toUpperCase(),
      8
    )
  }, [chamadosFiltrados])

  const dadosPrioridade = useMemo(() => {
    return agruparPorCampo(
      chamadosFiltrados,
      (chamado) => formatarPrioridade(chamado.prioridade),
      8
    )
  }, [chamadosFiltrados])

  const dadosMeses = useMemo(() => {
    const mapa = new Map<
      string,
      {
        key: string
        mes: string
        chamados: number
        resolvidos: number
      }
    >()

    chamadosFiltrados.forEach((chamado) => {
      const key = getMesKey(chamado.created_at)

      if (!key) return

      const atual =
        mapa.get(key) ||
        {
          key,
          mes: getMesLabel(key),
          chamados: 0,
          resolvidos: 0,
        }

      atual.chamados += 1

      if (["resolvido", "fechado"].includes(normalizarStatus(chamado.status))) {
        atual.resolvidos += 1
      }

      mapa.set(key, atual)
    })

    return Array.from(mapa.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [chamadosFiltrados])

  const totalOrigem = dadosOrigem.reduce((acc, item) => acc + item.quantidade, 0)

  function limparFiltros() {
    setBusca("")
    setFiltroOrigem("")
    setFiltroMes("")
    setFiltroStatus("")
    setFiltroAnalistaAdmin("")
    setFiltroPrioridadeAdmin("")
  }

  const filtrosAtivos =
    Boolean(busca.trim().length > 0 || filtroOrigem || filtroMes || filtroStatus) ||
    Boolean(
      modoAdministrativo &&
        podeAcessarAdministrativo &&
        (filtroAnalistaAdmin || filtroPrioridadeAdmin)
    )

  if (loading) {
    return <LoadingPainel />
  }

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.17),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.10),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge>Dashboard SETEC</Badge>
              <Badge>Chamados</Badge>
              <Badge secondary>
                {modoAdministrativo && podeAcessarAdministrativo
                  ? "Administrativo"
                  : "Operacional"}
              </Badge>

              {podeAcessarAdministrativo && (
                <button
                  type="button"
                  onClick={() =>
                    setModoAdministrativo((valorAtual) => !valorAtual)
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    modoAdministrativo
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-violet-500/30 hover:text-violet-300"
                  }`}
                  title="Alternar visão administrativa"
                >
                  <span aria-hidden="true">
                    {modoAdministrativo ? "🔓" : "🔐"}
                  </span>
                  {modoAdministrativo
                    ? "Painel administrativo ativo"
                    : "Abrir painel administrativo"}
                </button>
              )}
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Painel Geral de{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                Chamados
              </span>
            </h1>

            <p className="mt-3 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              {modoAdministrativo && podeAcessarAdministrativo
                ? "Visão administrativa dos chamados, com produtividade por responsável, tempos de atendimento, backlog, SLA, descrição e resolução aplicada."
                : "Visão consolidada dos atendimentos SETEC, com indicadores por status, categoria, origem, prioridade, evolução mensal e usuários solicitantes."}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 xl:min-w-[360px]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Taxa de resolução
            </p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-5xl font-black text-white">
                {stats.taxaResolucao}
                <span className="text-2xl text-cyan-300">%</span>
              </p>

              <p className="text-right text-xs font-bold text-slate-500">
                {stats.resolvidos} de {stats.total} chamado(s)
              </p>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                style={{ width: `${stats.taxaResolucao}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
            feedback.type === "error"
              ? "border-red-500/25 bg-red-500/10 text-red-200"
              : "border-blue-500/25 bg-blue-500/10 text-blue-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-slate-500">🔎</span>

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por código, título, categoria, escola, setor ou usuário..."
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

          <Select value={filtroOrigem} onChange={setFiltroOrigem}>
            <option value="">Todas as origens</option>
            {listaOrigens.map((origem) => (
              <option key={origem} value={origem}>
                {origem}
              </option>
            ))}
          </Select>

          <Select
            value={filtroStatus}
            onChange={(value) => setFiltroStatus(value as FiltroStatus)}
          >
            <option value="">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="assumido">Assumido</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="resolvido">Resolvido</option>
            <option value="fechado">Fechado</option>
          </Select>

          <Select value={filtroMes} onChange={setFiltroMes}>
            <option value="">Todos os meses</option>
            {listaMeses.map((mes) => (
              <option key={mes.key} value={mes.key}>
                {mes.label}
              </option>
            ))}
          </Select>

          <button
            type="button"
            onClick={() => carregar("manual")}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3.5 text-sm font-bold text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            Atualizar
          </button>
        </div>

        {podeAcessarAdministrativo && modoAdministrativo && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 lg:grid-cols-[1fr_1fr_auto]">
            <Select
              value={filtroAnalistaAdmin}
              onChange={setFiltroAnalistaAdmin}
            >
              <option value="">Todos os responsáveis</option>
              <option value="__sem_responsavel__">Sem responsável</option>
              {listaAnalistasAdmin.map((analista) => (
                <option key={analista.id} value={analista.id}>
                  {analista.nome}
                </option>
              ))}
            </Select>

            <Select
              value={filtroPrioridadeAdmin}
              onChange={setFiltroPrioridadeAdmin}
            >
              <option value="">Todas as prioridades</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </Select>

            <div className="flex items-center rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-xs font-bold text-violet-200">
              🔐 Visão restrita • {textoSeguro(usuarioAtual?.role, "perfil")}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-500">
            Exibindo{" "}
            <span className="font-bold text-slate-300">{chamadosFiltrados.length}</span>{" "}
            chamado(s) no recorte atual.
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
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Total" value={stats.total} subtitle="Chamados no recorte" tone="blue" />
        <KpiCard title="Abertos" value={stats.abertos} subtitle="Aguardando triagem" tone="yellow" />
        <KpiCard title="Em atendimento" value={stats.emAtendimento} subtitle="Assumidos/iniciados" tone="purple" />
        <KpiCard title="Resolvidos" value={stats.resolvidos} subtitle="Finalizados" tone="emerald" />
        <KpiCard title="Resolvidos hoje" value={stats.resolvidosHoje} subtitle="Conclusões do dia" tone="cyan" />
        <KpiCard title="Não visualizados" value={stats.naoVisualizadosGestao} subtitle="Novos para gestão" tone="red" />
      </section>

      {podeAcessarAdministrativo && modoAdministrativo && (
        <section className="space-y-6 rounded-[2rem] border border-violet-500/20 bg-violet-500/[0.035] p-4 shadow-xl md:p-6">
          <div className="flex flex-col gap-4 border-b border-violet-500/15 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">
                  🔐 Acesso administrativo
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {chamadosFiltrados.length} chamados no recorte
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-black text-white">
                Inteligência Administrativa dos Chamados
              </h2>
              <p className="mt-1 max-w-4xl text-sm font-medium leading-relaxed text-slate-500">
                Produtividade da equipe, tempos operacionais, backlog e consulta
                detalhada das demandas e devolutivas registradas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModoAdministrativo(false)}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-violet-500/30 hover:text-violet-200"
            >
              Voltar à visão operacional
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <AdminMetricCard
              label="Sem responsável"
              value={adminStats.semResponsavel}
              detail="Aguardando responsável"
              tone="red"
            />
            <AdminMetricCard
              label="Críticos ativos"
              value={adminStats.criticosAtivos}
              detail="Prioridade crítica em aberto"
              tone="orange"
            />
            <AdminMetricCard
              label="Backlog +72h"
              value={adminStats.backlog72h}
              detail="Ativos há 3 dias ou mais"
              tone="yellow"
            />
            <AdminMetricCard
              label="Fora do SLA"
              value={adminStats.foraSla}
              detail="Ativos acima do SLA cadastrado"
              tone="purple"
            />
            <AdminMetricCard
              label="Tempo até início"
              value={formatarHoras(adminStats.tempoMedioInicio)}
              detail="Média abertura → início"
              tone="cyan"
            />
            <AdminMetricCard
              label="Tempo de resolução"
              value={formatarHoras(adminStats.tempoMedioResolucao)}
              detail="Média abertura → finalização"
              tone="emerald"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                    Produtividade
                  </p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    Ranking por responsável
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Chamados que possuem analista_responsavel atribuído.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                    Devolutivas registradas
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {adminStats.taxaDevolutiva}%
                  </p>
                </div>
              </div>

              <RankingAtendimentos data={rankingAtendimentos} />
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5">
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  Controle operacional
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  Qualidade e cobertura
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Indicadores de atribuição e documentação do atendimento.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminProgress
                  label="Chamados com responsável"
                  value={adminStats.comResponsavel}
                  total={adminStats.total}
                  detail={`${adminStats.semResponsavel} sem responsável`}
                />
                <AdminProgress
                  label="Finalizados com devolutiva"
                  value={adminStats.comDevolutiva}
                  total={stats.resolvidos}
                  detail={`${adminStats.taxaDevolutiva}% documentados`}
                />
                <AdminProgress
                  label="Taxa de resolução"
                  value={stats.resolvidos}
                  total={stats.total}
                  detail={`${stats.taxaResolucao}% do recorte`}
                />
                <AdminProgress
                  label="Dentro do fluxo de SLA"
                  value={Math.max(
                    adminStats.total - adminStats.foraSla,
                    0
                  )}
                  total={adminStats.total}
                  detail={`${adminStats.foraSla} ativo(s) acima do SLA`}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Leitura rápida
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-black text-white">
                      {adminStats.comResponsavel}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      com responsável
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">
                      {adminStats.comDevolutiva}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      resoluções documentadas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                  Auditoria operacional
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  Chamados detalhados
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Abra cada registro para consultar a descrição original e a
                  resolução/devolutiva aplicada.
                </p>
              </div>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Até 100 registros mais recentes do recorte
              </span>
            </div>

            <div className="custom-scrollbar max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {chamadosFiltrados.length === 0 ? (
                <EmptyGraph>Nenhum chamado encontrado no recorte atual.</EmptyGraph>
              ) : (
                chamadosFiltrados.slice(0, 100).map((chamado) => (
                  <ChamadoAdminDetails
                    key={chamado.id}
                    chamado={chamado}
                    usuarioMap={usuarioMap}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <DashboardCard
          className="xl:col-span-6"
          title="Ranking de solicitações"
          subtitle="Categorias mais registradas no período filtrado."
        >
          <CompactRanking
            data={rankingCategorias}
            accent="#0ea5e9"
            emptyText="Nenhuma categoria encontrada."
          />
        </DashboardCard>

        <DashboardCard
          className="xl:col-span-6"
          title="Principais solicitantes"
          subtitle="Usuários que mais registraram chamados no período."
        >
          <CompactRanking
            data={rankingUsuarios}
            accent="#22c55e"
            emptyText="Nenhum usuário encontrado."
          />
        </DashboardCard>

        <DashboardCard
          className="xl:col-span-7"
          title="Evolução mensal"
          subtitle="Comparativo mensal entre chamados abertos e resolvidos."
        >
          <div className="h-[330px] w-full">
            {dadosMeses.length === 0 ? (
              <EmptyGraph>Nenhum dado mensal disponível.</EmptyGraph>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosMeses}
                  margin={{ top: 18, right: 18, left: -10, bottom: 8 }}
                  barGap={8}
                  barCategoryGap="24%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />

                  <Tooltip content={<SafeTooltip />} />

                  <Bar
                    dataKey="chamados"
                    name="Abertos"
                    fill="#0ea5e9"
                    radius={[10, 10, 0, 0]}
                    barSize={34}
                  />

                  <Bar
                    dataKey="resolvidos"
                    name="Resolvidos"
                    fill="#22c55e"
                    radius={[10, 10, 0, 0]}
                    barSize={34}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DashboardCard>

        <DashboardCard
          className="xl:col-span-5"
          title="Origem dos chamados"
          subtitle="Distribuição por URE, escola ou outras origens."
        >
          <div className="grid min-h-[320px] gap-4 lg:grid-cols-[1fr_1fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1fr]">
            <div className="relative h-[240px] w-full">
              {dadosOrigem.length === 0 ? (
                <EmptyGraph>Nenhuma origem encontrada.</EmptyGraph>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosOrigem}
                      dataKey="quantidade"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={5}
                    >
                      {dadosOrigem.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<SafeTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-black text-white">{totalOrigem}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Total
                </p>
              </div>
            </div>

            <div className="custom-scrollbar max-h-[250px] space-y-3 overflow-y-auto pr-1">
              {dadosOrigem.map((item, index) => {
                const percent =
                  totalOrigem > 0
                    ? Math.round((item.quantidade / totalOrigem) * 100)
                    : 0

                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <p className="truncate text-xs font-black uppercase tracking-widest text-slate-300">
                          {item.label}
                        </p>
                      </div>

                      <p className="text-xs font-black text-cyan-300">
                        {item.quantidade}
                      </p>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          className="xl:col-span-6"
          title="Chamados por status"
          subtitle="Situação atual dos registros."
        >
          <SimpleBarChart data={dadosStatus} color="#38bdf8" />
        </DashboardCard>

        <DashboardCard
          className="xl:col-span-6"
          title="Chamados por prioridade"
          subtitle="Distribuição por criticidade operacional."
        >
          <SimpleBarChart data={dadosPrioridade} color="#f59e0b" />
        </DashboardCard>
      </section>
    </main>
  )
}

function AdminMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  tone: "red" | "orange" | "yellow" | "purple" | "cyan" | "emerald"
}) {
  const tones = {
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    orange: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div
      className={`flex min-h-[128px] flex-col justify-between rounded-[1.5rem] border p-4 ${tones[tone]}`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>

      <p className="my-2 text-3xl font-black text-white">{value}</p>

      <p className="text-[11px] font-semibold leading-snug text-slate-500">
        {detail}
      </p>
    </div>
  )
}

function AdminProgress({
  label,
  value,
  total,
  detail,
}: {
  label: string
  value: number
  total: number
  detail: string
}) {
  const percentual =
    total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-200">{label}</p>
          <p className="mt-1 text-[10px] font-semibold text-slate-600">
            {detail}
          </p>
        </div>
        <span className="text-sm font-black text-cyan-300">{percentual}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  )
}

function RankingAtendimentos({
  data,
}: {
  data: RankingAtendimentoItem[]
}) {
  if (data.length === 0) {
    return (
      <EmptyGraph>
        Nenhum chamado com responsável atribuído neste recorte.
      </EmptyGraph>
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950/35">
      <div className="hidden grid-cols-[48px_minmax(160px,1fr)_74px_84px_76px_92px] gap-3 border-b border-slate-800 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-600 md:grid">
        <span>#</span>
        <span>Responsável</span>
        <span className="text-center">Total</span>
        <span className="text-center">Resolvidos</span>
        <span className="text-center">Taxa</span>
        <span className="text-right">Tempo médio</span>
      </div>

      <div className="custom-scrollbar max-h-[390px] overflow-y-auto">
        {data.map((item, index) => (
          <div
            key={item.key}
            className="border-b border-slate-800/70 px-4 py-4 last:border-b-0 hover:bg-slate-900/40 md:grid md:grid-cols-[48px_minmax(160px,1fr)_74px_84px_76px_92px] md:items-center md:gap-3"
          >
            <div className="mb-3 flex items-center justify-between md:mb-0 md:block">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-xs font-black text-violet-300">
                {index + 1}
              </span>
              <span className="text-xs font-black text-cyan-300 md:hidden">
                {item.total} atendimentos
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white" title={item.label}>
                {item.label}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-slate-600">
                {item.ativos} ativo(s) no recorte
              </p>
            </div>

            <p className="hidden text-center text-sm font-black text-white md:block">
              {item.total}
            </p>
            <p className="hidden text-center text-sm font-black text-emerald-300 md:block">
              {item.resolvidos}
            </p>
            <p className="hidden text-center text-sm font-black text-cyan-300 md:block">
              {item.taxaResolucao}%
            </p>
            <p className="hidden text-right text-xs font-black text-slate-300 md:block">
              {formatarHoras(item.mediaResolucaoHoras)}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 md:hidden">
              <MiniStat label="Resolvidos" value={item.resolvidos} />
              <MiniStat label="Taxa" value={`${item.taxaResolucao}%`} />
              <MiniStat
                label="Tempo"
                value={formatarHoras(item.mediaResolucaoHoras)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020617] p-2 text-center">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-xs font-black text-white">{value}</p>
    </div>
  )
}

function ChamadoAdminDetails({
  chamado,
  usuarioMap,
}: {
  chamado: ChamadoRow
  usuarioMap: Map<string, UsuarioRow>
}) {
  const responsavel = chamado.analista_responsavel
    ? usuarioMap.get(chamado.analista_responsavel)
    : null

  const solicitante = chamado.usuario_id
    ? usuarioMap.get(chamado.usuario_id)
    : null

  const finalizado = chamadoFinalizado(chamado)
  const tempoTotal = finalizado
    ? diferencaHoras(
        chamado.created_at,
        chamado.resolved_at || chamado.closed_at
      )
    : idadeHoras(chamado.created_at)

  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/45 open:border-blue-500/25 open:bg-blue-500/[0.035]">
      <summary className="cursor-pointer list-none p-4 marker:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                {textoSeguro(chamado.codigo, "Sem código")}
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                {formatarStatus(chamado.status)}
              </span>

              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-orange-300">
                {formatarPrioridade(chamado.prioridade)}
              </span>

              {!chamado.analista_responsavel && (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
                  Sem responsável
                </span>
              )}
            </div>

            <h4 className="mt-3 truncate text-sm font-black text-white md:text-base">
              {textoSeguro(chamado.titulo, "Chamado sem título")}
            </h4>

            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {textoSeguro(chamado.escola || chamado.setor, "Unidade não informada")}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailMini
              label="Responsável"
              value={
                responsavel?.nome ||
                responsavel?.email ||
                (chamado.analista_responsavel
                  ? "Responsável não localizado"
                  : "Não atribuído")
              }
            />
            <DetailMini
              label="Abertura"
              value={formatarDataHoraBR(chamado.created_at)}
            />
            <DetailMini
              label={finalizado ? "Tempo total" : "Tempo aberto"}
              value={formatarHoras(tempoTotal)}
            />
            <div className="flex items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              Ver detalhes ↓
            </div>
          </div>
        </div>
      </summary>

      <div className="border-t border-slate-800 px-4 pb-4 pt-4">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <DetailMini
            label="Solicitante"
            value={
              solicitante?.nome ||
              chamado.solicitante_nome ||
              chamado.solicitante_email ||
              "Não informado"
            }
          />
          <DetailMini
            label="Categoria"
            value={textoSeguro(chamado.categoria)}
          />
          <DetailMini
            label="Início atendimento"
            value={formatarDataHoraBR(chamado.started_at)}
          />
          <DetailMini
            label="Finalização"
            value={formatarDataHoraBR(
              chamado.resolved_at || chamado.closed_at
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              📝 Descrição do chamado
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-300">
              {textoSeguro(
                chamado.descricao,
                "Sem descrição detalhada registrada."
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">
              🛠️ Resolução aplicada / devolutiva
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-blue-100/80">
              {textoSeguro(
                chamado.retorno_devolutivo,
                "Sem resolução/devolutiva registrada para este chamado."
              )}
            </p>
          </div>
        </div>
      </div>
    </details>
  )
}

function DetailMini({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-[#020617] px-3 py-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-[10px] font-black text-slate-300" title={value}>
        {value}
      </p>
    </div>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3.5 text-sm font-bold text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {children}
    </select>
  )
}

function Badge({
  children,
  secondary = false,
}: {
  children: ReactNode
  secondary?: boolean
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
        secondary
          ? "border-slate-700 bg-slate-900 text-slate-400"
          : "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
      }`}
    >
      {children}
    </span>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string
  value: number
  subtitle: string
  tone: "blue" | "yellow" | "purple" | "emerald" | "cyan" | "red"
}) {
  const tones = {
    blue: "border-blue-500/25 bg-blue-500/10",
    yellow: "border-yellow-500/25 bg-yellow-500/10",
    purple: "border-purple-500/25 bg-purple-500/10",
    emerald: "border-emerald-500/25 bg-emerald-500/10",
    cyan: "border-cyan-500/25 bg-cyan-500/10",
    red: "border-red-500/25 bg-red-500/10",
  }

  return (
    <div
      className={`flex min-h-[130px] flex-col justify-between rounded-[1.6rem] border p-4 shadow-xl ${tones[tone]}`}
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {title}
        </p>

        <p className="mt-2 text-3xl font-black text-white md:text-4xl">{value}</p>
      </div>

      <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">
        {subtitle}
      </p>
    </div>
  )
}

function DashboardCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string
  subtitle: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex min-h-[430px] flex-col rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6 ${className}`}
    >
      <div className="mb-5 flex min-h-[54px] flex-col justify-start">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function CompactRanking({
  data,
  accent,
  emptyText,
}: {
  data: RankingItem[]
  accent: string
  emptyText: string
}) {
  const max = Math.max(...data.map((item) => item.quantidade), 1)

  if (data.length === 0) {
    return <EmptyGraph>{emptyText}</EmptyGraph>
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/30">
      <div className="grid grid-cols-[54px_1fr_82px] border-b border-slate-800 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
        <span>Rank</span>
        <span>Descrição</span>
        <span className="text-right">Total</span>
      </div>

      <div className="custom-scrollbar max-h-[330px] overflow-y-auto">
        {data.map((item, index) => {
          const percent = Math.max((item.quantidade / max) * 100, 6)

          return (
            <div
              key={item.key}
              className="grid grid-cols-[54px_1fr_82px] items-center gap-3 border-b border-slate-800/70 px-4 py-3 last:border-b-0 hover:bg-slate-900/40"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-[#020617] text-xs font-black text-slate-400">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white" title={item.label}>
                  {item.label}
                </p>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
              </div>

              <div className="text-right">
                <span
                  className="inline-flex min-w-10 justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-black"
                  style={{ color: accent }}
                >
                  {item.quantidade}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SimpleBarChart({
  data,
  color,
}: {
  data: RankingItem[]
  color: string
}) {
  if (data.length === 0) {
    return <EmptyGraph>Nenhum dado encontrado.</EmptyGraph>
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip content={<SafeTooltip />} />
          <Bar
            dataKey="quantidade"
            name="Quantidade"
            fill={color}
            radius={[10, 10, 0, 0]}
            barSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyGraph({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
      <p className="text-sm font-semibold text-slate-500">{children}</p>
    </div>
  )
}

function LoadingPainel() {
  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-6 pb-12">
      <div className="h-56 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />

      <div className="h-24 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[1.6rem] border border-slate-800 bg-slate-900/40"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`h-80 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40 ${
              index < 2 ? "xl:col-span-6" : "xl:col-span-4"
            }`}
          />
        ))}
      </div>
    </main>
  )
}