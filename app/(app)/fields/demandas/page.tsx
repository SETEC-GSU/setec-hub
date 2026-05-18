"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"

const TABELA_DEMANDAS = "demandas_fields"

const STATUS = {
  PENDENTE: "Pendente Atendimento",
  CONCLUIDA: "Concluída",
} as const

const TIPOS_DEMANDA = [
  "Equipamentos",
  "Rede/Conectividade",
  "Suporte",
  "URE",
] as const

const URGENCIAS = ["Baixa", "Média", "Alta", "Crítica"] as const

const pesoUrgencia: Record<string, number> = {
  Crítica: 4,
  Alta: 3,
  Média: 2,
  Baixa: 1,
}

type TipoDemanda = (typeof TIPOS_DEMANDA)[number]
type UrgenciaDemanda = (typeof URGENCIAS)[number]

type Escola = {
  id: string
  nome_escola: string
  cie?: string | null
  tecnico_atribuido?: string | null
}

type DemandaField = {
  id: string
  escola_id: string | null
  escola_nome: string | null
  tipo: string | null
  descricao: string | null
  urgencia: string | null
  data_prevista: string | null
  status: string | null
  created_at: string | null
  concluido_em: string | null
  criado_por: string | null
}

type UsuarioSistema = {
  nome: string | null
  email: string | null
  role?: string | null
  setor?: string | null
}

type MensagemTela = {
  tipo: "success" | "error" | "info"
  texto: string
} | null

type FiltroRapido =
  | "Todos"
  | "Pendentes"
  | "Críticas"
  | "Atrasadas"
  | "Hoje"
  | "Sem previsão"
  | "Concluídas"

const getInitials = (name: string) => {
  if (!name || name === "Sem Atribuição" || name === "Sem Técnico") return "ST"

  const clean = name.trim()
  if (!clean) return "ST"

  const parts = clean.split(" ").filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

const normalizarTexto = (value: string | null | undefined) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

const getHojeLocal = () => {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
}

const getDataLocalFromDateString = (value: string | null | undefined) => {
  if (!value) return null

  const onlyDate = value.split("T")[0]
  const [year, month, day] = onlyDate.split("-").map(Number)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

const formatarData = (value: string | null | undefined) => {
  const data = getDataLocalFromDateString(value)
  if (!data) return "Sem data"

  return format(data, "dd/MM/yyyy")
}

const formatarDataCurta = (value: string | null | undefined) => {
  const data = getDataLocalFromDateString(value)
  if (!data) return "Sem data"

  return format(data, "dd/MM/yy")
}

const formatarDataHora = (value: string | null | undefined) => {
  if (!value) return "Sem registro"

  const data = new Date(value)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  return format(data, "dd/MM/yyyy HH:mm")
}

const isConcluida = (demanda: DemandaField) => {
  return demanda.status === STATUS.CONCLUIDA
}

const isPendente = (demanda: DemandaField) => {
  return demanda.status === STATUS.PENDENTE
}

const isAtrasada = (demanda: DemandaField) => {
  if (isConcluida(demanda)) return false

  const dataPrevista = getDataLocalFromDateString(demanda.data_prevista)
  if (!dataPrevista) return false

  return dataPrevista.getTime() < getHojeLocal().getTime()
}

const isPrevistaHoje = (demanda: DemandaField) => {
  if (isConcluida(demanda)) return false

  const dataPrevista = getDataLocalFromDateString(demanda.data_prevista)
  if (!dataPrevista) return false

  return dataPrevista.getTime() === getHojeLocal().getTime()
}

const getUrgenciaClass = (urgencia: string | null | undefined) => {
  switch (urgencia) {
    case "Crítica":
      return "bg-red-500/10 border-red-500/30 text-red-400"
    case "Alta":
      return "bg-orange-500/10 border-orange-500/30 text-orange-400"
    case "Média":
      return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
    default:
      return "bg-slate-800/80 border-slate-700 text-slate-300"
  }
}

const getStatusClass = (status: string | null | undefined) => {
  if (status === STATUS.CONCLUIDA) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
  }

  return "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
}

const getTipoIcone = (tipo: string | null | undefined) => {
  switch (tipo) {
    case "Equipamentos":
      return "💻"
    case "Rede/Conectividade":
      return "🌐"
    case "Suporte":
      return "🛠️"
    case "URE":
      return "🏢"
    default:
      return "📌"
  }
}

export default function GestaoDemandasFields() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioSistema | null>(null)

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [demandas, setDemandas] = useState<DemandaField[]>([])

  const [busca, setBusca] = useState("")
  const [filtroEscola, setFiltroEscola] = useState("Todos")
  const [filtroTecnico, setFiltroTecnico] = useState("Todos")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>("Todos")

  const [escolaSelecionada, setEscolaSelecionada] = useState("")
  const [tipo, setTipo] = useState("")
  const [urgencia, setUrgencia] = useState<UrgenciaDemanda>("Baixa")
  const [dataPrevista, setDataPrevista] = useState("")
  const [descricao, setDescricao] = useState("")
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [demandaModal, setDemandaModal] = useState<
    | (DemandaField & {
        tecnicoAtual: string
        cie: string
      })
    | null
  >(null)

  const escolasPorId = useMemo(() => {
    return new Map(escolas.map((escola) => [String(escola.id), escola]))
  }, [escolas])

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email) {
        const { data: userData } = await supabase
          .from("usuarios")
          .select("nome, email, role, setor")
          .eq("email", user.email)
          .limit(1)
          .maybeSingle()

        const perfil = userData as UsuarioSistema | null

        setUsuarioLogado({
          nome: perfil?.nome || user.email,
          email: user.email,
          role: perfil?.role || null,
          setor: perfil?.setor || null,
        })
      } else {
        setUsuarioLogado(null)
      }

      const [{ data: dataEscolas, error: errorEscolas }, { data: dataDemandas, error: errorDemandas }] =
        await Promise.all([
          supabase
            .from("escolas")
            .select("id, nome_escola, cie, tecnico_atribuido")
            .order("nome_escola", { ascending: true }),
          supabase
            .from(TABELA_DEMANDAS)
            .select("*")
            .order("created_at", { ascending: false }),
        ])

      if (errorEscolas) throw errorEscolas
      if (errorDemandas) throw errorDemandas

      setEscolas((dataEscolas || []) as Escola[])
      setDemandas((dataDemandas || []) as DemandaField[])
    } catch (error: any) {
      console.error("Erro ao carregar demandas Field:", error)
      setMensagem({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível carregar os dados da página de demandas Field.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 4500)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  useEffect(() => {
    if (!demandaModal) return

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDemandaModal(null)
      }
    }

    window.addEventListener("keydown", handleEsc)

    return () => window.removeEventListener("keydown", handleEsc)
  }, [demandaModal])

  const infoEscola = useMemo(() => {
    if (!escolaSelecionada) return null

    return (
      escolas.find(
        (escola) =>
          normalizarTexto(escola.nome_escola) === normalizarTexto(escolaSelecionada)
      ) || null
    )
  }, [escolaSelecionada, escolas])

  const escolaDigitadaInvalida = useMemo(() => {
    if (!escolaSelecionada.trim()) return false
    return !infoEscola
  }, [escolaSelecionada, infoEscola])

  const stats = useMemo(() => {
    const total = demandas.length
    const pendentes = demandas.filter((demanda) => isPendente(demanda)).length
    const concluidas = demandas.filter((demanda) => isConcluida(demanda)).length
    const criticas = demandas.filter(
      (demanda) => demanda.urgencia === "Crítica" && !isConcluida(demanda)
    ).length
    const atrasadas = demandas.filter((demanda) => isAtrasada(demanda)).length
    const hoje = demandas.filter((demanda) => isPrevistaHoje(demanda)).length
    const semPrevisao = demandas.filter(
      (demanda) => !isConcluida(demanda) && !demanda.data_prevista
    ).length
    const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0

    return {
      total,
      pendentes,
      concluidas,
      criticas,
      atrasadas,
      hoje,
      semPrevisao,
      taxaConclusao,
    }
  }, [demandas])

  const listaTecnicosFiltro = useMemo(() => {
    const nomes = new Set<string>()

    escolas.forEach((escola) => {
      if (escola.tecnico_atribuido?.trim()) {
        nomes.add(escola.tecnico_atribuido.trim())
      }
    })

    return Array.from(nomes).sort((a, b) => a.localeCompare(b))
  }, [escolas])

  const demandasFiltradas = useMemo(() => {
    const termoBusca = normalizarTexto(busca)

    const filtradas = demandas.filter((demanda) => {
      const escolaRelacionada = escolasPorId.get(String(demanda.escola_id))
      const tecnico = escolaRelacionada?.tecnico_atribuido || "Sem Atribuição"

      const textoBuscaDemanda = normalizarTexto(
        `${demanda.escola_nome || ""} ${demanda.descricao || ""} ${
          demanda.tipo || ""
        } ${demanda.urgencia || ""} ${demanda.criado_por || ""} ${tecnico}`
      )

      const matchBusca = termoBusca ? textoBuscaDemanda.includes(termoBusca) : true
      const matchEscola =
        filtroEscola === "Todos"
          ? true
          : String(demanda.escola_id) === String(filtroEscola)
      const matchTecnico = filtroTecnico === "Todos" ? true : tecnico === filtroTecnico
      const matchStatus =
        filtroStatus === "Todos" ? true : demanda.status === filtroStatus
      const matchTipo = filtroTipo === "Todos" ? true : demanda.tipo === filtroTipo

      const matchRapido =
        filtroRapido === "Todos"
          ? true
          : filtroRapido === "Pendentes"
            ? isPendente(demanda)
            : filtroRapido === "Críticas"
              ? demanda.urgencia === "Crítica" && !isConcluida(demanda)
              : filtroRapido === "Atrasadas"
                ? isAtrasada(demanda)
                : filtroRapido === "Hoje"
                  ? isPrevistaHoje(demanda)
                  : filtroRapido === "Sem previsão"
                    ? !isConcluida(demanda) && !demanda.data_prevista
                    : filtroRapido === "Concluídas"
                      ? isConcluida(demanda)
                      : true

      return (
        matchBusca &&
        matchEscola &&
        matchTecnico &&
        matchStatus &&
        matchTipo &&
        matchRapido
      )
    })

    return filtradas.sort((a, b) => {
      if (isAtrasada(a) !== isAtrasada(b)) {
        return isAtrasada(a) ? -1 : 1
      }

      if (a.status !== b.status) {
        return isConcluida(a) ? 1 : -1
      }

      if (!isConcluida(a) && !isConcluida(b)) {
        const pesoA = pesoUrgencia[a.urgencia || ""] || 0
        const pesoB = pesoUrgencia[b.urgencia || ""] || 0

        if (pesoA !== pesoB) {
          return pesoB - pesoA
        }

        const dataA = getDataLocalFromDateString(a.data_prevista)
        const dataB = getDataLocalFromDateString(b.data_prevista)

        if (dataA && dataB && dataA.getTime() !== dataB.getTime()) {
          return dataA.getTime() - dataB.getTime()
        }

        if (dataA && !dataB) return -1
        if (!dataA && dataB) return 1
      }

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      )
    })
  }, [
    demandas,
    busca,
    filtroEscola,
    filtroTecnico,
    filtroStatus,
    filtroTipo,
    filtroRapido,
    escolasPorId,
  ])

  const chartCategoria = useMemo(() => {
    return TIPOS_DEMANDA.map((tipoDemanda) => ({
      name: tipoDemanda,
      qtd: demandas.filter((demanda) => demanda.tipo === tipoDemanda).length,
    }))
  }, [demandas])

  const chartUrgencia = useMemo(() => {
    return URGENCIAS.map((nivel) => ({
      name: nivel,
      qtd: demandas.filter(
        (demanda) => demanda.urgencia === nivel && !isConcluida(demanda)
      ).length,
    }))
  }, [demandas])

  const chartTecnico = useMemo(() => {
    const counts: Record<string, number> = {}

    demandas
      .filter((demanda) => !isConcluida(demanda))
      .forEach((demanda) => {
        const escola = escolasPorId.get(String(demanda.escola_id))
        const tecnico = escola?.tecnico_atribuido || "S/ Atribuição"
        counts[tecnico] = (counts[tecnico] || 0) + 1
      })

    return Object.entries(counts)
      .map(([name, qtd]) => ({ name, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10)
  }, [demandas, escolasPorId])

  const chartEscola = useMemo(() => {
    const counts: Record<string, number> = {}

    demandas.forEach((demanda) => {
      const nomeSafe = demanda.escola_nome || "Escola Desconhecida"
      counts[nomeSafe] = (counts[nomeSafe] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, qtd]) => ({ name, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10)
  }, [demandas])

  const limparFiltros = () => {
    setBusca("")
    setFiltroEscola("Todos")
    setFiltroTecnico("Todos")
    setFiltroStatus("Todos")
    setFiltroTipo("Todos")
    setFiltroRapido("Todos")
  }

  const validarFormulario = () => {
    if (!usuarioLogado?.email) {
      setMensagem({
        tipo: "error",
        texto:
          "Sessão do usuário não identificada. Atualize a página ou faça login novamente.",
      })
      return false
    }

    if (!infoEscola) {
      setMensagem({
        tipo: "error",
        texto: "Selecione uma unidade escolar válida da lista.",
      })
      return false
    }

    if (!TIPOS_DEMANDA.includes(tipo as TipoDemanda)) {
      setMensagem({
        tipo: "error",
        texto: "Selecione um tipo de demanda válido.",
      })
      return false
    }

    if (!URGENCIAS.includes(urgencia)) {
      setMensagem({
        tipo: "error",
        texto: "Selecione uma urgência válida.",
      })
      return false
    }

    const descricaoLimpa = descricao.trim()

    if (descricaoLimpa.length < 10) {
      setMensagem({
        tipo: "error",
        texto: "Descreva melhor a demanda. Use pelo menos 10 caracteres.",
      })
      return false
    }

    return true
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()

    if (salvando) return
    if (!validarFormulario()) return

    setSalvando(true)

    try {
      const payload = {
        escola_id: String(infoEscola!.id),
        escola_nome: infoEscola!.nome_escola,
        tipo: tipo.trim(),
        descricao: descricao.trim(),
        urgencia,
        data_prevista: dataPrevista || null,
      }

      if (editandoId) {
        const { error } = await supabase
          .from(TABELA_DEMANDAS)
          .update(payload)
          .eq("id", editandoId)

        if (error) throw error

        setMensagem({
          tipo: "success",
          texto: "Demanda atualizada com sucesso.",
        })
      } else {
        const { error } = await supabase.from(TABELA_DEMANDAS).insert([
          {
            ...payload,
            status: STATUS.PENDENTE,
            criado_por: usuarioLogado?.nome || usuarioLogado?.email || "Usuário",
          },
        ])

        if (error) throw error

        setMensagem({
          tipo: "success",
          texto: "Demanda registrada com sucesso.",
        })
      }

      handleLimparFormulario()
      await carregarDados()
    } catch (error: any) {
      console.error("Erro ao salvar demanda Field:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível salvar a demanda.",
      })
    } finally {
      setSalvando(false)
    }
  }

  function handleEditarClick(demanda: DemandaField) {
    setEditandoId(demanda.id)
    setEscolaSelecionada(demanda.escola_nome || "")
    setTipo(demanda.tipo || "")
    setUrgencia((demanda.urgencia as UrgenciaDemanda) || "Baixa")
    setDataPrevista(demanda.data_prevista || "")
    setDescricao(demanda.descricao || "")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function handleLimparFormulario() {
    setEditandoId(null)
    setEscolaSelecionada("")
    setTipo("")
    setUrgencia("Baixa")
    setDataPrevista("")
    setDescricao("")
  }

  async function handleConcluir(id: string) {
    if (!window.confirm("Deseja concluir esta demanda?")) return

    try {
      const { error } = await supabase
        .from(TABELA_DEMANDAS)
        .update({
          status: STATUS.CONCLUIDA,
          concluido_em: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      setMensagem({
        tipo: "success",
        texto: "Demanda concluída com sucesso.",
      })

      setDemandaModal(null)
      await carregarDados()
    } catch (error: any) {
      console.error("Erro ao concluir demanda Field:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível concluir a demanda.",
      })
    }
  }

  async function handleReabrir(id: string) {
    if (!window.confirm("Deseja reabrir esta demanda para atendimento?")) return

    try {
      const { error } = await supabase
        .from(TABELA_DEMANDAS)
        .update({
          status: STATUS.PENDENTE,
          concluido_em: null,
        })
        .eq("id", id)

      if (error) throw error

      setMensagem({
        tipo: "success",
        texto: "Demanda reaberta com sucesso.",
      })

      setDemandaModal(null)
      await carregarDados()
    } catch (error: any) {
      console.error("Erro ao reabrir demanda Field:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível reabrir a demanda.",
      })
    }
  }

  const abrirModalDemanda = (demanda: DemandaField) => {
    const escolaInfo = escolasPorId.get(String(demanda.escola_id))

    setDemandaModal({
      ...demanda,
      tecnicoAtual: escolaInfo?.tecnico_atribuido || "S/ Atribuição",
      cie: escolaInfo?.cie || "S/N",
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B1120]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-cyan-500" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando demandas Field
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1700px] space-y-8 px-4 pb-12 xl:px-0">
      <div className="flex flex-col gap-6 border-b border-slate-800/50 pb-8 pt-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Módulo Field
              </span>
              <span className="rounded-full border border-slate-700 bg-[#020617] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                URE Guarulhos Sul
              </span>
            </div>

            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white md:text-4xl">
              <span className="text-cyan-500">●</span>
              Cadastro e controle de demandas - FIELD
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Abertura, triagem, priorização e acompanhamento de demandas técnicas
              por Unidade Escolar, técnico Field, status e previsão de atendimento.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#020617] px-5 py-4 shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Usuário atual
            </p>
            <p className="mt-1 max-w-[280px] truncate text-sm font-black text-slate-200">
              {usuarioLogado?.nome || "Sessão não identificada"}
            </p>
            {usuarioLogado?.role && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Perfil: {usuarioLogado.role}
              </p>
            )}
          </div>
        </div>

        {mensagem && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
              mensagem.tipo === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : mensagem.tipo === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 2xl:grid-cols-8">
          <KpiCard
            label="Total registrado"
            value={stats.total}
            description="Histórico geral"
            className="border-slate-800 bg-[#020617]"
            valueClassName="text-white"
          />

          <KpiCard
            label="Pendentes"
            value={stats.pendentes}
            description="Aguardando atendimento"
            className="border-yellow-500/30 bg-gradient-to-t from-yellow-900/20 to-[#020617]"
            valueClassName="text-yellow-400"
          />

          <KpiCard
            label="Críticas"
            value={stats.criticas}
            description="Prioridade máxima"
            className="border-red-500/30 bg-gradient-to-t from-red-900/20 to-[#020617]"
            valueClassName="text-red-400"
          />

          <KpiCard
            label="Atrasadas"
            value={stats.atrasadas}
            description="Previsão vencida"
            className="border-orange-500/30 bg-gradient-to-t from-orange-900/20 to-[#020617]"
            valueClassName="text-orange-400"
          />

          <KpiCard
            label="Hoje"
            value={stats.hoje}
            description="Previstas para hoje"
            className="border-blue-500/30 bg-gradient-to-t from-blue-900/20 to-[#020617]"
            valueClassName="text-blue-300"
          />

          <KpiCard
            label="Sem previsão"
            value={stats.semPrevisao}
            description="Pendentes sem data"
            className="border-slate-700 bg-[#020617]"
            valueClassName="text-slate-200"
          />

          <KpiCard
            label="Concluídas"
            value={stats.concluidas}
            description="Finalizadas"
            className="border-emerald-500/30 bg-gradient-to-t from-emerald-900/20 to-[#020617]"
            valueClassName="text-emerald-400"
          />

          <KpiCard
            label="Conclusão"
            value={`${stats.taxaConclusao}%`}
            description="Total finalizado"
            className="border-cyan-500/30 bg-gradient-to-t from-cyan-900/20 to-[#020617]"
            valueClassName="text-cyan-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
        <div className="xl:col-span-4 xl:h-[820px]">
          <Glass
            title={editandoId ? "✏️ Editar demanda" : "➕ Nova demanda"}
            className={
              editandoId
                ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                : ""
            }
          >
            <div className="custom-scrollbar h-full overflow-y-auto pr-1 md:pr-2">
              {editandoId && (
                <div className="mb-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                    Modo edição ativo
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-300">
                    Você está atualizando uma demanda já cadastrada. Após salvar,
                    a fila será recarregada automaticamente.
                  </p>
                </div>
              )}

              <form onSubmit={handleSalvar} className="space-y-6">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                    Unidade Escolar *
                  </label>

                  <input
                    required
                    list="escolas-list"
                    placeholder="Digite para buscar a escola..."
                    value={escolaSelecionada}
                    onChange={(e) => setEscolaSelecionada(e.target.value)}
                    className={`w-full rounded-xl border bg-[#0f172a] px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:ring-1 ${
                      escolaDigitadaInvalida
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500"
                    }`}
                  />

                  <datalist id="escolas-list">
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.nome_escola} />
                    ))}
                  </datalist>

                  {escolaDigitadaInvalida && (
                    <p className="mt-2 text-xs font-bold text-red-400">
                      Escola não encontrada. Selecione uma unidade exatamente como
                      aparece na lista.
                    </p>
                  )}
                </div>

                {infoEscola && (
                  <div className="animate-fade-in rounded-xl border border-blue-500/30 bg-blue-900/20 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/20 text-sm font-black text-blue-200">
                        {getInitials(infoEscola.tecnico_atribuido || "Sem Técnico")}
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs font-black uppercase tracking-widest text-blue-500/70">
                          Técnico da Unidade
                        </p>
                        <p
                          className="truncate text-lg font-bold text-blue-300"
                          title={infoEscola.tecnico_atribuido || "Nenhum técnico atribuído"}
                        >
                          {infoEscola.tecnico_atribuido || "Nenhum técnico atribuído."}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          CIE: {infoEscola.cie || "Não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                      Tipo *
                    </label>

                    <select
                      required
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Equipamentos">💻 Equipamentos</option>
                      <option value="Rede/Conectividade">🌐 Rede/Conectividade</option>
                      <option value="Suporte">🛠️ Suporte Geral</option>
                      <option value="URE">🏢 URE</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                      Urgência
                    </label>

                    <select
                      value={urgencia}
                      onChange={(e) => setUrgencia(e.target.value as UrgenciaDemanda)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">🚨 Crítica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                    Data prevista de visita
                  </label>

                  <input
                    type="date"
                    value={dataPrevista}
                    onChange={(e) => setDataPrevista(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500"
                    style={{ colorScheme: "dark" }}
                  />

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Use este campo para controlar previsões, atrasos e demandas
                    previstas para o dia.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                    Descrição do problema *
                  </label>

                  <textarea
                    required
                    rows={6}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva objetivamente o que precisa ser feito..."
                    className="custom-scrollbar w-full resize-none rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-4 text-sm font-medium text-white outline-none transition-all focus:border-cyan-500"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs font-bold">
                    <span
                      className={
                        descricao.trim().length >= 10
                          ? "text-emerald-500"
                          : "text-slate-500"
                      }
                    >
                      Mínimo recomendado: 10 caracteres
                    </span>
                    <span className="text-slate-600">
                      {descricao.trim().length} caracteres
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={salvando}
                    className={`flex-1 rounded-xl py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      editandoId
                        ? "bg-blue-600 shadow-blue-900/30 hover:bg-blue-500"
                        : "bg-cyan-600 shadow-cyan-900/30 hover:bg-cyan-500"
                    }`}
                  >
                    {salvando
                      ? "Processando..."
                      : editandoId
                        ? "Atualizar demanda"
                        : "Registrar demanda"}
                  </button>

                  {editandoId && (
                    <button
                      type="button"
                      onClick={handleLimparFormulario}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-8 py-5 text-sm font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </Glass>
        </div>

        <div className="flex flex-col xl:col-span-8 xl:h-[820px]">
          <Glass title="📋 Fila de atendimentos" className="flex-1">
            <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black text-white">
                    {demandasFiltradas.length} demanda(s) encontrada(s)
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Ordenação automática: atrasadas, abertas, urgência e data
                    prevista.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={limparFiltros}
                  className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 lg:w-auto"
                >
                  Limpar filtros
                </button>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  "Todos",
                  "Pendentes",
                  "Críticas",
                  "Atrasadas",
                  "Hoje",
                  "Sem previsão",
                  "Concluídas",
                ].map((filtro) => (
                  <button
                    key={filtro}
                    type="button"
                    onClick={() => setFiltroRapido(filtro as FiltroRapido)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                      filtroRapido === filtro
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#020617] text-slate-500 hover:border-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {filtro}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  type="text"
                  placeholder="Buscar escola, descrição, técnico..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none transition-all focus:border-cyan-500 md:col-span-2 xl:col-span-2"
                />

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-cyan-500"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value={STATUS.PENDENTE}>Pendentes</option>
                  <option value={STATUS.CONCLUIDA}>Concluídas</option>
                </select>

                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-cyan-500"
                >
                  <option value="Todos">Todos os Tipos</option>
                  {TIPOS_DEMANDA.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroTecnico}
                  onChange={(e) => setFiltroTecnico(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-cyan-500"
                >
                  <option value="Todos">Todos Técnicos</option>
                  {listaTecnicosFiltro.map((tecnico) => (
                    <option key={tecnico} value={tecnico}>
                      {tecnico}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroEscola}
                  onChange={(e) => setFiltroEscola(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-cyan-500 md:col-span-2 xl:col-span-5"
                >
                  <option value="Todos">Todas as Escolas</option>
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome_escola}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1 pb-4 md:pr-3">
              {demandasFiltradas.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <span className="mb-4 block text-5xl opacity-30">📭</span>
                  <p className="text-sm font-bold uppercase tracking-widest">
                    Nenhuma demanda encontrada
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    Revise os filtros aplicados ou registre uma nova demanda.
                  </p>
                </div>
              ) : (
                demandasFiltradas.map((demanda) => {
                  const escolaAtual = escolasPorId.get(String(demanda.escola_id))
                  const tecnicoAtual =
                    escolaAtual?.tecnico_atribuido || "Sem Atribuição"
                  const concluida = isConcluida(demanda)
                  const atrasada = isAtrasada(demanda)
                  const previstaHoje = isPrevistaHoje(demanda)
                  const sendoEditada = editandoId === demanda.id

                  return (
                    <div
                      key={demanda.id}
                      className={`grid w-full grid-cols-1 gap-4 rounded-2xl border p-4 transition-all md:grid-cols-[128px_1fr_190px_110px] md:items-center ${
                        sendoEditada
                          ? "border-blue-500 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : concluida
                            ? "border-emerald-900/30 bg-emerald-900/5 opacity-70 hover:opacity-100"
                            : atrasada
                              ? "border-orange-500/30 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.08)]"
                              : "border-slate-800 bg-[#0f172a] hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-wrap gap-2 md:flex-col">
                        <span
                          className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest ${getStatusClass(
                            demanda.status
                          )}`}
                        >
                          {demanda.status || "Sem status"}
                        </span>

                        <span
                          className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest ${getUrgenciaClass(
                            demanda.urgencia
                          )} ${
                            demanda.urgencia === "Crítica" && !concluida
                              ? "animate-pulse"
                              : ""
                          }`}
                        >
                          {demanda.urgencia || "Sem urgência"}
                        </span>

                        {atrasada && (
                          <span className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-orange-300">
                            Atrasada
                          </span>
                        )}

                        {previstaHoje && (
                          <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-blue-300">
                            Hoje
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModalDemanda(demanda)}
                            className={`max-w-full truncate text-left text-base font-black underline-offset-4 transition-all hover:text-cyan-400 hover:underline hover:decoration-cyan-500/50 ${
                              concluida
                                ? "text-slate-500 line-through"
                                : "text-white"
                            }`}
                            title="Clique para ver todos os detalhes"
                          >
                            {demanda.escola_nome || "Escola não informada"}
                          </button>

                          <span className="shrink-0 rounded-md border border-slate-800 bg-[#020617] px-2 py-1 text-[10px] font-bold text-slate-400">
                            {getTipoIcone(demanda.tipo)} {demanda.tipo || "Sem tipo"}
                          </span>
                        </div>

                        <p
                          className={`line-clamp-2 text-xs leading-relaxed ${
                            concluida ? "text-slate-600" : "text-slate-400"
                          }`}
                          title={demanda.descricao || ""}
                        >
                          {demanda.descricao || "Sem descrição registrada."}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold tracking-wide text-slate-500">
                          <span>
                            👤 Registrado por:{" "}
                            <span className="text-slate-400">
                              {demanda.criado_por || "Sistema/Desconhecido"}
                            </span>
                          </span>

                          <span>
                            Criada em:{" "}
                            <span className="text-slate-400">
                              {formatarDataHora(demanda.created_at)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:border-l md:border-slate-800 md:pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-black text-blue-200">
                            {getInitials(tecnicoAtual)}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-bold text-blue-300"
                              title={tecnicoAtual}
                            >
                              {tecnicoAtual}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                              Técnico Field
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {demanda.data_prevista ? (
                            <span
                              className={`w-fit rounded border px-2 py-1 text-xs font-bold ${
                                atrasada
                                  ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                                  : previstaHoje
                                    ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                                    : "border-slate-800 bg-slate-900/50 text-slate-500"
                              }`}
                            >
                              📅 Prev: {formatarDataCurta(demanda.data_prevista)}
                            </span>
                          ) : (
                            <span className="w-fit rounded border border-slate-800 bg-slate-900/50 px-2 py-1 text-xs font-bold text-slate-600">
                              Sem previsão
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-row gap-2 md:flex-col">
                        {!concluida ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditarClick(demanda)}
                              className="w-full rounded-lg bg-slate-800 py-2 text-[11px] font-black uppercase text-slate-300 transition-all hover:bg-slate-700"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleConcluir(demanda.id)}
                              disabled={sendoEditada}
                              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[11px] font-black uppercase text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              Concluir
                            </button>
                          </>
                        ) : (
                          <div className="flex w-full flex-col justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReabrir(demanda.id)}
                              className="group w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 text-[11px] font-black uppercase text-slate-400 transition-all hover:border-yellow-500/30 hover:bg-yellow-500/20 hover:text-yellow-400"
                            >
                              <span className="group-hover:hidden">Concluído</span>
                              <span className="hidden group-hover:inline">
                                🔄 Reabrir
                              </span>
                            </button>

                            <div className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                              {formatarData(demanda.concluido_em)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Glass>
        </div>
      </div>

      <div className="mt-12 border-t border-slate-800/50 pt-8">
        <div className="mb-8 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
              <span className="text-cyan-500">📊</span>
              Dashboards Operacionais
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Indicadores gerados com base nas demandas cadastradas no módulo
              Field.
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
          <Glass title="Volume por categoria">
            <div className="mt-4 h-[300px] w-full">
              {demandas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartCategoria}
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#cbd5e1"
                      fontSize={12}
                      fontWeight={800}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="qtd" radius={[6, 6, 0, 0]} barSize={48}>
                      <LabelList
                        dataKey="qtd"
                        position="top"
                        fill="#f8fafc"
                        fontSize={14}
                        fontWeight={900}
                      />
                      {chartCategoria.map((_, index) => (
                        <Cell
                          key={`categoria-${index}`}
                          fill={index % 2 === 0 ? "#06b6d4" : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </Glass>

          <Glass title="Pendências por urgência">
            <div className="mt-4 h-[300px] w-full">
              {demandas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartUrgencia}
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#cbd5e1"
                      fontSize={12}
                      fontWeight={800}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="qtd" radius={[6, 6, 0, 0]} barSize={48}>
                      <LabelList
                        dataKey="qtd"
                        position="top"
                        fill="#f8fafc"
                        fontSize={14}
                        fontWeight={900}
                      />
                      {chartUrgencia.map((entry) => (
                        <Cell
                          key={`urgencia-${entry.name}`}
                          fill={
                            entry.name === "Crítica"
                              ? "#ef4444"
                              : entry.name === "Alta"
                                ? "#f97316"
                                : entry.name === "Média"
                                  ? "#f59e0b"
                                  : "#64748b"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </Glass>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Glass title="Carga pendente por técnico">
            <div className="mt-4 h-[350px] w-full">
              {chartTecnico.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartTecnico}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#cbd5e1"
                      fontSize={12}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar
                      dataKey="qtd"
                      radius={[0, 6, 6, 0]}
                      barSize={25}
                      fill="#f59e0b"
                    >
                      <LabelList
                        dataKey="qtd"
                        position="right"
                        fill="#fef3c7"
                        fontSize={14}
                        fontWeight={800}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </Glass>

          <Glass title="Volume por unidade escolar - Top 10">
            <div className="mt-4 h-[350px] w-full">
              {chartEscola.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartEscola}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#cbd5e1"
                      fontSize={12}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      width={155}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar
                      dataKey="qtd"
                      radius={[0, 6, 6, 0]}
                      barSize={25}
                      fill="#10b981"
                    >
                      <LabelList
                        dataKey="qtd"
                        position="right"
                        fill="#d1fae5"
                        fontSize={14}
                        fontWeight={800}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </Glass>
        </div>
      </div>

      {demandaModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md animate-fade-in"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDemandaModal(null)
            }
          }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl">
            <div className="flex flex-col gap-5 border-b border-slate-800 bg-slate-900/80 p-6 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-300">
                    {getTipoIcone(demandaModal.tipo)} {demandaModal.tipo}
                  </span>

                  <span
                    className={`rounded border px-3 py-1 text-xs font-black uppercase tracking-widest ${getStatusClass(
                      demandaModal.status
                    )}`}
                  >
                    {demandaModal.status}
                  </span>

                  <span
                    className={`rounded border px-3 py-1 text-xs font-black uppercase tracking-widest ${getUrgenciaClass(
                      demandaModal.urgencia
                    )}`}
                  >
                    {demandaModal.urgencia}
                  </span>

                  {isAtrasada(demandaModal) && (
                    <span className="rounded border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-orange-300">
                      Atrasada
                    </span>
                  )}
                </div>

                <h2 className="truncate text-3xl font-black tracking-tight text-white md:text-4xl">
                  {demandaModal.escola_nome}
                </h2>

                <p className="mt-1 font-mono text-sm text-slate-500">
                  CIE: {demandaModal.cie}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDemandaModal(null)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xl font-bold text-slate-400 transition-all hover:bg-red-500/20 hover:text-red-400"
                title="Fechar"
              >
                X
              </button>
            </div>

            <div className="custom-scrollbar overflow-y-auto p-6 md:p-8">
              <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <InfoBox
                  label="Técnico responsável"
                  value={demandaModal.tecnicoAtual}
                  icon="👨‍🔧"
                  valueClassName="text-blue-400"
                />

                <InfoBox
                  label="Nível de urgência"
                  value={demandaModal.urgencia || "Sem urgência"}
                  icon={demandaModal.urgencia === "Crítica" ? "🚨" : "📌"}
                  valueClassName={
                    demandaModal.urgencia === "Crítica"
                      ? "text-red-400"
                      : "text-slate-200"
                  }
                />

                <InfoBox
                  label="Registrado por"
                  value={demandaModal.criado_por || "N/A"}
                  icon="👤"
                  valueClassName="text-slate-300"
                />

                <InfoBox
                  label="Criada em"
                  value={formatarDataHora(demandaModal.created_at)}
                  icon="🕒"
                  valueClassName="text-white"
                />

                <InfoBox
                  label="Data prevista"
                  value={
                    demandaModal.data_prevista
                      ? formatarData(demandaModal.data_prevista)
                      : "Sem previsão definida"
                  }
                  icon="📅"
                  valueClassName={
                    isAtrasada(demandaModal)
                      ? "text-orange-300"
                      : isPrevistaHoje(demandaModal)
                        ? "text-blue-300"
                        : "text-slate-300"
                  }
                />

                <InfoBox
                  label="Conclusão"
                  value={
                    demandaModal.concluido_em
                      ? formatarData(demandaModal.concluido_em)
                      : "Ainda pendente"
                  }
                  icon="✅"
                  valueClassName={
                    demandaModal.concluido_em
                      ? "text-emerald-400"
                      : "text-yellow-400"
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
                  Descrição do problema reportado
                </p>

                <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-300">
                  {demandaModal.descricao || "Sem descrição registrada."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900 p-4 sm:flex-row sm:justify-end">
              {!isConcluida(demandaModal) ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleEditarClick(demandaModal)
                      setDemandaModal(null)
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConcluir(demandaModal.id)}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-black uppercase tracking-widest text-emerald-400 transition-all hover:bg-emerald-500 hover:text-white"
                  >
                    Concluir demanda
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReabrir(demandaModal.id)}
                  className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-3 text-sm font-black uppercase tracking-widest text-yellow-400 transition-all hover:bg-yellow-500 hover:text-white"
                >
                  Reabrir demanda
                </button>
              )}

              <button
                type="button"
                onClick={() => setDemandaModal(null)}
                className="rounded-xl bg-slate-800 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

function KpiCard({
  label,
  value,
  description,
  className = "",
  valueClassName = "",
}: {
  label: string
  value: string | number
  description: string
  className?: string
  valueClassName?: string
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl ${className}`}
    >
      <span className={`block text-3xl font-black md:text-4xl ${valueClassName}`}>
        {value}
      </span>

      <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>

      <span className="mt-1 block text-[11px] font-semibold text-slate-600">
        {description}
      </span>
    </div>
  )
}

function InfoBox({
  label,
  value,
  icon,
  valueClassName = "",
}: {
  label: string
  value: string
  icon: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-5">
      <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p
        className={`flex items-center gap-2 truncate text-lg font-bold ${valueClassName}`}
        title={value}
      >
        <span>{icon}</span>
        <span className="truncate">{value}</span>
      </p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-600">
      Aguardando dados...
    </div>
  )
}

function Glass({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode
  title?: string
  className?: string
}) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl transition-all duration-300 md:p-8 ${className}`}
    >
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50" />

      {title && (
        <h3 className="mb-6 shrink-0 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          {title}
        </h3>
      )}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}