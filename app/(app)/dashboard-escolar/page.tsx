"use client"

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"

const MapEscolas = dynamic(() => import("../escolas/MapEscolas"), {
  ssr: false,
})

type EscolaRow = {
  id: string
  nome_escola: string | null
  cie?: string | null
  telefone?: string | null
  endereco?: string | null
  diretor?: string | null
  tipo_ensino?: string | null
  periodo?: string | null
  email?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  horario_abertura?: string | null
  horario_fechamento?: string | null
  total_alunos?: number | null
  qtd_salas?: number | null
  total_equipamentos_recebidos?: number | null
  aps_instalados?: number | null
  status_conectividade?: string | null
  criticidade?: number | null
  ultima_visita?: string | null
  observacoes?: string | null
  created_at?: string | null
  total_equipamentos_funcionando?: number | null
  ultima_atualizacao?: string | null
  ultima_atualizacao_inventario?: string | null
  tecnico_atribuido?: string | null
}

type EscolaComMetricas = EscolaRow & {
  salas: number
  aps: number
  alunos: number
  equipRecebidos: number
  equipFuncionando: number
  equipInativos: number
  equipIdeal: number
  wifiIdeal: number
  deficitEquip: number
  indiceAP: number
  indiceEquip: number
  score: number
  criticidadeCalculada: "critica" | "atencao" | "saudavel"
  alunosPorEquip: number
  salasPorAP: number
  ultimaAtualizacaoInventario: string | null
  inventarioResponsavel: string | null
  inventarioCargo: string | null
  diasSemInventario: number | null
  statusInventario: "em_dia" | "atencao" | "vencido" | "sem_dados"
  funcionamentoEstimado: boolean
  recebidosVinculados: boolean
}

type InventarioResumoRow = {
  escola_nome: string | null
  created_at: string | null
  responsavel_nome: string | null
  responsavel_cargo: string | null
}

type EquipamentoRecebidoResumoRow = {
  escola_nome: string | null
  quantidade_recebida: number | null
}

type EnriquecimentoEscola = {
  totalRecebidos?: number
  recebidosVinculados?: boolean
  inventarioData?: string | null
  inventarioResponsavel?: string | null
  inventarioCargo?: string | null
}

type Tone =
  | "blue"
  | "cyan"
  | "emerald"
  | "red"
  | "yellow"
  | "purple"
  | "orange"
  | "slate"

function toNumber(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function diasDesde(value?: string | null) {
  if (!value) return null

  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return null

  const diff = Date.now() - data.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

function getStatusInventario(
  value?: string | null
): EscolaComMetricas["statusInventario"] {
  const dias = diasDesde(value)

  if (dias === null) return "sem_dados"
  if (dias <= 90) return "em_dia"
  if (dias <= 120) return "atencao"
  return "vencido"
}

function getInventarioTone(
  status: EscolaComMetricas["statusInventario"]
): Tone {
  if (status === "em_dia") return "emerald"
  if (status === "atencao") return "yellow"
  if (status === "vencido") return "red"
  return "slate"
}

function getInventarioLabel(
  status: EscolaComMetricas["statusInventario"]
) {
  if (status === "em_dia") return "Em dia"
  if (status === "atencao") return "Atenção"
  if (status === "vencido") return "Vencido"
  return "Sem inventário"
}

function calcMetrics(
  e: EscolaRow,
  enriquecimento: EnriquecimentoEscola = {}
): EscolaComMetricas {
  const salas = toNumber(e.qtd_salas)
  const aps = toNumber(e.aps_instalados)
  const alunos = toNumber(e.total_alunos)

  const recebidosVinculados = enriquecimento.recebidosVinculados === true
  const equipRecebidos = recebidosVinculados
    ? toNumber(enriquecimento.totalRecebidos)
    : toNumber(e.total_equipamentos_recebidos)

  /*
   * Mantém compatibilidade com o comportamento anterior:
   * quando ainda não existe total de funcionamento registrado, o painel usa
   * recebidos como estimativa. A UI passa a sinalizar esse dado como estimado.
   */
  const funcionamentoEstimado =
    e.total_equipamentos_funcionando === null ||
    e.total_equipamentos_funcionando === undefined

  const equipFuncionando = toNumber(
    e.total_equipamentos_funcionando ?? equipRecebidos
  )

  const ultimaAtualizacaoInventario =
    enriquecimento.inventarioData ||
    e.ultima_atualizacao_inventario ||
    null

  const statusInventario = getStatusInventario(ultimaAtualizacaoInventario)
  const diasSemInventario = diasDesde(ultimaAtualizacaoInventario)

  const equipInativos = Math.max(equipRecebidos - equipFuncionando, 0)
  const wifiIdeal = Math.max(Math.ceil(salas / 2), 1)
  const equipIdeal = Math.max(Math.ceil(alunos / 3), 1)

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equipFuncionando / equipIdeal, 1)

  const score = indiceEquip * 0.6 + indiceAP * 0.4

  let criticidadeCalculada: EscolaComMetricas["criticidadeCalculada"] =
    "saudavel"

  if (score < 0.6) criticidadeCalculada = "critica"
  else if (score < 0.8) criticidadeCalculada = "atencao"

  const deficitEquip = Math.max(equipIdeal - equipFuncionando, 0)

  return {
    ...e,
    salas,
    aps,
    alunos,
    equipRecebidos,
    equipFuncionando,
    equipInativos,
    indiceAP,
    indiceEquip,
    score,
    criticidadeCalculada,
    equipIdeal,
    wifiIdeal,
    deficitEquip,
    alunosPorEquip: equipFuncionando > 0 ? alunos / equipFuncionando : 0,
    salasPorAP: aps > 0 ? salas / aps : 0,
    ultimaAtualizacaoInventario,
    inventarioResponsavel: enriquecimento.inventarioResponsavel || null,
    inventarioCargo: enriquecimento.inventarioCargo || null,
    diasSemInventario,
    statusInventario,
    funcionamentoEstimado,
    recebidosVinculados,
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR")
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%"
  return `${Math.round(value * 100)}%`
}

function formatDecimal(value: number, digits = 1) {
  if (!Number.isFinite(value) || value === 0) return "0"
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Sem data"

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getScoreTone(score: number): Tone {
  if (score < 0.6) return "red"
  if (score < 0.8) return "yellow"
  return "emerald"
}

function getConectividadeTone(status?: string | null): Tone {
  const text = String(status || "").toLowerCase()

  if (text.includes("online") || text.includes("normal") || text.includes("ativo")) {
    return "emerald"
  }

  if (text.includes("instável") || text.includes("instavel") || text.includes("atenção")) {
    return "yellow"
  }

  if (text.includes("offline") || text.includes("sem") || text.includes("queda")) {
    return "red"
  }

  return "slate"
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function DashboardContent() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  const escolaFiltro = searchParams.get("escola") || ""

  const [escolas, setEscolas] = useState<EscolaComMetricas[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroCriticidade, setFiltroCriticidade] = useState("todas")
  const [filtroInventario, setFiltroInventario] = useState("todos")

  const carregar = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)

      setErro("")

      try {
        const [escolasResult, recebidosResult, inventariosResult] =
          await Promise.all([
            supabase
              .from("escolas")
              .select("*")
              .order("nome_escola", { ascending: true }),
            supabase
              .from("equipamentos_recebidos")
              .select("escola_nome, quantidade_recebida"),
            supabase
              .from("inventario_respostas")
              .select(
                "escola_nome, created_at, responsavel_nome, responsavel_cargo"
              )
              .order("created_at", { ascending: false }),
          ])

        if (escolasResult.error) throw escolasResult.error

        if (recebidosResult.error) {
          console.warn(
            "[Dashboard Escolar] Não foi possível vincular equipamentos recebidos:",
            recebidosResult.error
          )
        }

        if (inventariosResult.error) {
          console.warn(
            "[Dashboard Escolar] Não foi possível vincular inventários:",
            inventariosResult.error
          )
        }

        const mapaRecebidos = new Map<string, number>()

        if (!recebidosResult.error) {
          ;(
            (recebidosResult.data || []) as EquipamentoRecebidoResumoRow[]
          ).forEach((item) => {
            const chave = normalizarTexto(item.escola_nome)
            if (!chave) return

            mapaRecebidos.set(
              chave,
              (mapaRecebidos.get(chave) || 0) +
                Math.max(toNumber(item.quantidade_recebida), 0)
            )
          })
        }

        const mapaInventarios = new Map<string, InventarioResumoRow>()

        if (!inventariosResult.error) {
          ;((inventariosResult.data || []) as InventarioResumoRow[]).forEach(
            (item) => {
              const chave = normalizarTexto(item.escola_nome)
              if (!chave || mapaInventarios.has(chave)) return

              // A consulta vem ordenada do mais recente para o mais antigo.
              mapaInventarios.set(chave, item)
            }
          )
        }

        const enriched = ((escolasResult.data || []) as EscolaRow[]).map(
          (escola) => {
            const chave = normalizarTexto(escola.nome_escola)
            const ultimoInventario = mapaInventarios.get(chave)
            const possuiRecebidosVinculados = mapaRecebidos.has(chave)

            return calcMetrics(escola, {
              totalRecebidos: possuiRecebidosVinculados
                ? mapaRecebidos.get(chave)
                : undefined,
              recebidosVinculados: possuiRecebidosVinculados,
              inventarioData:
                ultimoInventario?.created_at ||
                escola.ultima_atualizacao_inventario ||
                null,
              inventarioResponsavel:
                ultimoInventario?.responsavel_nome || null,
              inventarioCargo: ultimoInventario?.responsavel_cargo || null,
            })
          }
        )

        setEscolas(enriched)
      } catch (error) {
        console.error("[Dashboard Escolar] Erro ao carregar escolas:", error)
        setErro("Não foi possível carregar os dados das escolas.")
        setEscolas([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    carregar()
  }, [carregar])

  const listaNomesEscolas = useMemo(() => {
    return [...new Set(escolas.map((e) => e.nome_escola).filter(Boolean) as string[])].sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    )
  }, [escolas])

  const escolaSelecionada = useMemo(() => {
    if (!escolaFiltro) return null

    return escolas.find((e) => e.nome_escola === escolaFiltro) || null
  }, [escolas, escolaFiltro])

  const escolasFiltradas = useMemo(() => {
    let base = escolas

    if (escolaFiltro) {
      base = base.filter((e) => e.nome_escola === escolaFiltro)
    }

    if (busca.trim()) {
      const termo = normalizarTexto(busca)

      base = base.filter((e) =>
        normalizarTexto(
          `${e.nome_escola || ""} ${e.cie || ""} ${e.endereco || ""} ${
            e.tecnico_atribuido || ""
          } ${e.status_conectividade || ""}`
        ).includes(termo)
      )
    }

    if (filtroCriticidade !== "todas") {
      base = base.filter((e) => e.criticidadeCalculada === filtroCriticidade)
    }

    if (filtroInventario !== "todos") {
      base = base.filter((e) => e.statusInventario === filtroInventario)
    }

    return base
  }, [
    escolas,
    escolaFiltro,
    busca,
    filtroCriticidade,
    filtroInventario,
  ])

  function handleFiltroEscola(nome: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (nome) params.set("escola", nome)
    else params.delete("escola")

    router.push(params.toString() ? `?${params.toString()}` : "?")
  }

  function limparFiltros() {
    setBusca("")
    setFiltroCriticidade("todas")
    setFiltroInventario("todos")
    handleFiltroEscola("")
  }

  function analisarEscola(escola: EscolaComMetricas) {
    if (!escola.nome_escola) return
    handleFiltroEscola(escola.nome_escola)

    window.setTimeout(() => {
      document
        .getElementById("detalhe-escola-dashboard")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  const metrics = useMemo(() => {
    const totalEscolas = escolasFiltradas.length
    const totalAlunos = escolasFiltradas.reduce((acc, e) => acc + e.alunos, 0)
    const totalEquipFuncionando = escolasFiltradas.reduce(
      (acc, e) => acc + e.equipFuncionando,
      0
    )
    const totalEquipRecebidos = escolasFiltradas.reduce(
      (acc, e) => acc + e.equipRecebidos,
      0
    )
    const totalEquipIdeal = escolasFiltradas.reduce((acc, e) => acc + e.equipIdeal, 0)
    const totalAP = escolasFiltradas.reduce((acc, e) => acc + e.aps, 0)
    const totalSalas = escolasFiltradas.reduce((acc, e) => acc + e.salas, 0)
    const totalWifiIdeal = escolasFiltradas.reduce((acc, e) => acc + e.wifiIdeal, 0)

    const scoreMedio =
      totalEscolas > 0
        ? escolasFiltradas.reduce((acc, e) => acc + e.score, 0) / totalEscolas
        : 0

    const coberturaEquip =
      totalEquipIdeal > 0 ? Math.min(totalEquipFuncionando / totalEquipIdeal, 1) : 0

    const coberturaWifi = totalWifiIdeal > 0 ? Math.min(totalAP / totalWifiIdeal, 1) : 0

    const equipamentosParados = Math.max(totalEquipRecebidos - totalEquipFuncionando, 0)
    const deficitEquipTotal = Math.max(totalEquipIdeal - totalEquipFuncionando, 0)

    const alunosPorEquip =
      totalEquipFuncionando > 0 ? totalAlunos / totalEquipFuncionando : 0

    const salasPorAP = totalAP > 0 ? totalSalas / totalAP : 0

    const criticas = escolasFiltradas.filter(
      (e) => e.criticidadeCalculada === "critica"
    ).length
    const atencao = escolasFiltradas.filter(
      (e) => e.criticidadeCalculada === "atencao"
    ).length
    const saudavel = escolasFiltradas.filter(
      (e) => e.criticidadeCalculada === "saudavel"
    ).length

    const inventarioEmDia = escolasFiltradas.filter(
      (e) => e.statusInventario === "em_dia"
    ).length
    const inventarioAtencao = escolasFiltradas.filter(
      (e) => e.statusInventario === "atencao"
    ).length
    const inventarioVencido = escolasFiltradas.filter(
      (e) => e.statusInventario === "vencido"
    ).length
    const inventarioSemDados = escolasFiltradas.filter(
      (e) => e.statusInventario === "sem_dados"
    ).length

    const inventarioCobertura =
      totalEscolas > 0 ? inventarioEmDia / totalEscolas : 0

    const conectividadeNormal = escolasFiltradas.filter(
      (e) => getConectividadeTone(e.status_conectividade) === "emerald"
    ).length
    const conectividadeAtencao = escolasFiltradas.filter(
      (e) => getConectividadeTone(e.status_conectividade) === "yellow"
    ).length
    const conectividadeCritica = escolasFiltradas.filter(
      (e) => getConectividadeTone(e.status_conectividade) === "red"
    ).length

    const equipamentosComFonteVinculada = escolasFiltradas.filter(
      (e) => e.recebidosVinculados
    ).length

    return {
      totalEscolas,
      totalAlunos,
      totalEquipFuncionando,
      totalEquipRecebidos,
      totalEquipIdeal,
      totalAP,
      totalSalas,
      totalWifiIdeal,
      scoreMedio,
      coberturaEquip,
      coberturaWifi,
      equipamentosParados,
      deficitEquipTotal,
      alunosPorEquip,
      salasPorAP,
      criticas,
      atencao,
      saudavel,
      inventarioEmDia,
      inventarioAtencao,
      inventarioVencido,
      inventarioSemDados,
      inventarioCobertura,
      conectividadeNormal,
      conectividadeAtencao,
      conectividadeCritica,
      equipamentosComFonteVinculada,
    }
  }, [escolasFiltradas])

  const rankingScore = useMemo(() => {
    return [...escolasFiltradas].sort((a, b) => a.score - b.score).slice(0, 10)
  }, [escolasFiltradas])

  const rankingDeficit = useMemo(() => {
    return [...escolasFiltradas].sort((a, b) => b.deficitEquip - a.deficitEquip).slice(0, 10)
  }, [escolasFiltradas])

  const rankingInativos = useMemo(() => {
    return [...escolasFiltradas].sort((a, b) => b.equipInativos - a.equipInativos).slice(0, 10)
  }, [escolasFiltradas])

  const maiorDeficit = rankingDeficit[0]
  const maiorInatividade = rankingInativos[0]

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:rounded-[2.5rem] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.10),transparent_32%)]" />
        <div className="pointer-events-none absolute -right-16 -bottom-24 hidden text-blue-500/5 lg:block">
          <BuildingIcon className="h-96 w-96" />
        </div>

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge tone="blue">Dashboard Escolar</Badge>
              <Badge tone="cyan">Tecnologia</Badge>
              <Badge tone="slate">URE Guarulhos Sul</Badge>
            </div>

            <h1 className="max-w-5xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Panorama Tecnológico das{" "}
              <span className="bg-gradient-to-r from-blue-300 to-blue-600 bg-clip-text text-transparent">
                Escolas
              </span>
            </h1>

            <p className="mt-4 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              {escolaFiltro
                ? `Análise integrada da infraestrutura tecnológica da unidade ${escolaFiltro}.`
                : "Visão integrada de equipamentos, inventário, conectividade, APs, atendimento Field e indicadores operacionais das unidades escolares."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4 sm:grid-cols-4 xl:min-w-[620px]">
            <MiniHeroStat label="Score" value={percent(metrics.scoreMedio)} tone={getScoreTone(metrics.scoreMedio)} />
            <MiniHeroStat label="Escolas" value={metrics.totalEscolas} tone="blue" />
            <MiniHeroStat
              label="Inventário"
              value={percent(metrics.inventarioCobertura)}
              tone={
                metrics.inventarioCobertura >= 0.8
                  ? "emerald"
                  : metrics.inventarioCobertura >= 0.5
                    ? "yellow"
                    : "red"
              }
            />
            <MiniHeroStat
              label="Equip. ativos"
              value={formatNumber(metrics.totalEquipFuncionando)}
              tone="emerald"
            />
          </div>
        </div>
      </section>

      {erro && (
        <section className="rounded-3xl border border-red-500/25 bg-red-500/10 p-5 text-red-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Erro ao carregar o dashboard</p>
              <p className="mt-1 text-sm font-medium text-red-200/75">{erro}</p>
            </div>

            <button
              type="button"
              onClick={() => carregar(true)}
              className="rounded-2xl bg-red-500/15 px-5 py-3 text-sm font-bold transition-all hover:bg-red-500/25"
            >
              Tentar novamente
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_0.72fr_0.72fr_auto_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-500" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar por escola, CIE, endereço, técnico ou conectividade..."
              className="w-full border-none bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-600"
            />

            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-800 hover:text-white"
                aria-label="Limpar busca"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={escolaFiltro}
            onChange={(event) => handleFiltroEscola(event.target.value)}
            className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-sm font-semibold text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Visão global - Todas as escolas</option>
            {listaNomesEscolas.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>

          <select
            value={filtroCriticidade}
            onChange={(event) => setFiltroCriticidade(event.target.value)}
            className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-sm font-semibold text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="todas">Todas as criticidades</option>
            <option value="critica">Críticas</option>
            <option value="atencao">Atenção</option>
            <option value="saudavel">Saudáveis</option>
          </select>

          <select
            value={filtroInventario}
            onChange={(event) => setFiltroInventario(event.target.value)}
            className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-sm font-semibold text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os inventários</option>
            <option value="em_dia">Inventário em dia</option>
            <option value="atencao">Inventário em atenção</option>
            <option value="vencido">Inventário vencido</option>
            <option value="sem_dados">Sem inventário</option>
          </select>

          <button
            type="button"
            onClick={() => carregar(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3.5 text-sm font-bold text-slate-300 transition-all hover:border-blue-500/40 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>

          {(busca ||
            escolaFiltro ||
            filtroCriticidade !== "todas" ||
            filtroInventario !== "todos") && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-[#020617] px-5 py-3.5 text-sm font-bold text-slate-300 transition-all hover:border-red-500/40 hover:text-red-300"
            >
              Limpar
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatusCard
          title="Saúde crítica"
          value={metrics.criticas}
          subtitle="Score abaixo de 60%"
          tone="red"
          icon={<AlertIcon className="h-7 w-7" />}
        />
        <StatusCard
          title="Em atenção"
          value={metrics.atencao}
          subtitle="Score entre 60% e 80%"
          tone="yellow"
          icon={<WarningIcon className="h-7 w-7" />}
        />
        <StatusCard
          title="Saudáveis"
          value={metrics.saudavel}
          subtitle="Score acima de 80%"
          tone="emerald"
          icon={<CheckIcon className="h-7 w-7" />}
        />
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Inventário</Badge>
              <Badge
                tone={
                  metrics.inventarioCobertura >= 0.8
                    ? "emerald"
                    : metrics.inventarioCobertura >= 0.5
                      ? "yellow"
                      : "red"
                }
              >
                {percent(metrics.inventarioCobertura)} em dia
              </Badge>
            </div>

            <h2 className="mt-3 text-xl font-bold text-white">
              Recertificação tecnológica das unidades
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Vinculação com o último registro de inventário de cada escola,
              considerando o ciclo operacional de 90 dias.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[650px]">
            <InventoryMini
              label="Em dia"
              value={metrics.inventarioEmDia}
              tone="emerald"
            />
            <InventoryMini
              label="Atenção"
              value={metrics.inventarioAtencao}
              tone="yellow"
            />
            <InventoryMini
              label="Vencido"
              value={metrics.inventarioVencido}
              tone="red"
            />
            <InventoryMini
              label="Sem envio"
              value={metrics.inventarioSemDados}
              tone="slate"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Escolas"
          value={metrics.totalEscolas}
          subtitle="Unidades no recorte"
          tone="blue"
          icon={<BuildingIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Alunos"
          value={formatNumber(metrics.totalAlunos)}
          subtitle="Impactados pela infraestrutura"
          tone="cyan"
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Equip. ativos"
          value={formatNumber(metrics.totalEquipFuncionando)}
          subtitle="Dispositivos funcionando"
          tone="emerald"
          icon={<ComputerIcon className="h-5 w-5" />}
        />
        <KpiCard
          title="Déficit"
          value={formatNumber(metrics.deficitEquipTotal)}
          subtitle="Para meta 3 alunos por equipamento"
          tone={metrics.deficitEquipTotal > 0 ? "red" : "emerald"}
          icon={<TrendIcon className="h-5 w-5" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <MetricCard
          title="Score Geral"
          value={percent(metrics.scoreMedio)}
          description="Composição 60% equipamentos e 40% APs."
          progress={metrics.scoreMedio}
          tone={getScoreTone(metrics.scoreMedio)}
        />
        <MetricCard
          title="Cobertura de Dispositivos"
          value={percent(metrics.coberturaEquip)}
          description="Equipamentos ativos em relação ao ideal."
          progress={metrics.coberturaEquip}
          tone="blue"
        />
        <MetricCard
          title="Cobertura Wi-Fi"
          value={percent(metrics.coberturaWifi)}
          description="APs instalados em relação à meta."
          progress={metrics.coberturaWifi}
          tone="purple"
        />
        <MetricCard
          title="Equipamentos Parados"
          value={formatNumber(metrics.equipamentosParados)}
          description="Recebidos menos funcionando."
          progress={
            metrics.totalEquipRecebidos > 0
              ? Math.min(metrics.equipamentosParados / metrics.totalEquipRecebidos, 1)
              : 0
          }
          tone={metrics.equipamentosParados > 0 ? "red" : "emerald"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CompactInfoCard
          title="Conectividade normal"
          value={metrics.conectividadeNormal}
          detail={`${metrics.conectividadeAtencao} em atenção • ${metrics.conectividadeCritica} crítica(s)`}
          tone="emerald"
          icon={<WifiIcon className="h-5 w-5" />}
        />
        <CompactInfoCard
          title="Base de recebimentos vinculada"
          value={`${metrics.equipamentosComFonteVinculada}/${metrics.totalEscolas}`}
          detail="Totais obtidos diretamente de equipamentos_recebidos"
          tone="blue"
          icon={<ComputerIcon className="h-5 w-5" />}
        />
        <CompactInfoCard
          title="Média operacional"
          value={`${formatDecimal(metrics.alunosPorEquip)} aluno(s)/equip.`}
          detail={`${formatDecimal(metrics.salasPorAP)} sala(s) por AP no recorte`}
          tone="cyan"
          icon={<TrendIcon className="h-5 w-5" />}
        />
      </section>

      {escolaSelecionada && (
        <section
          id="detalhe-escola-dashboard"
          className="scroll-mt-6 overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#020617] shadow-xl"
        >
          <div className="border-b border-slate-800 bg-gradient-to-r from-blue-500/[0.08] via-transparent to-cyan-500/[0.05] p-5 md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={getScoreTone(escolaSelecionada.score)}>
                    Score {percent(escolaSelecionada.score)}
                  </Badge>
                  <Badge tone={getInventarioTone(escolaSelecionada.statusInventario)}>
                    Inventário {getInventarioLabel(escolaSelecionada.statusInventario)}
                  </Badge>
                  <Badge tone={getConectividadeTone(escolaSelecionada.status_conectividade)}>
                    {escolaSelecionada.status_conectividade || "Conectividade N/I"}
                  </Badge>
                </div>

                <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
                  {escolaSelecionada.nome_escola}
                </h2>

                <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-slate-400">
                  {escolaSelecionada.endereco || "Endereço não cadastrado."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-auto">
                <SchoolMetric
                  label="Recebidos"
                  value={formatNumber(escolaSelecionada.equipRecebidos)}
                  tone="blue"
                />
                <SchoolMetric
                  label={escolaSelecionada.funcionamentoEstimado ? "Ativos*" : "Ativos"}
                  value={formatNumber(escolaSelecionada.equipFuncionando)}
                  tone="emerald"
                />
                <SchoolMetric
                  label="Inativos"
                  value={formatNumber(escolaSelecionada.equipInativos)}
                  tone={escolaSelecionada.equipInativos > 0 ? "orange" : "emerald"}
                />
                <SchoolMetric
                  label="APs"
                  value={formatNumber(escolaSelecionada.aps)}
                  tone="purple"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-5 md:p-7 xl:grid-cols-[1fr_330px]">
            <div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <InfoMini label="CIE" value={escolaSelecionada.cie || "N/I"} />
                <InfoMini
                  label="Técnico Field"
                  value={escolaSelecionada.tecnico_atribuido || "Não atribuído"}
                />
                <InfoMini
                  label="Diretor(a)"
                  value={escolaSelecionada.diretor || "N/I"}
                />
                <InfoMini
                  label="Último inventário"
                  value={formatDate(escolaSelecionada.ultimaAtualizacaoInventario)}
                />
                <InfoMini
                  label="Responsável inventário"
                  value={escolaSelecionada.inventarioResponsavel || "N/I"}
                />
                <InfoMini
                  label="Cargo"
                  value={escolaSelecionada.inventarioCargo || "N/I"}
                />
                <InfoMini
                  label="Alunos / salas"
                  value={`${formatNumber(escolaSelecionada.alunos)} / ${formatNumber(
                    escolaSelecionada.salas
                  )}`}
                />
                <InfoMini
                  label="Funcionamento"
                  value={
                    escolaSelecionada.horario_abertura ||
                    escolaSelecionada.horario_fechamento
                      ? `${escolaSelecionada.horario_abertura || "?"} às ${
                          escolaSelecionada.horario_fechamento || "?"
                        }`
                      : "N/I"
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                <span>
                  Recebimentos:{" "}
                  {escolaSelecionada.recebidosVinculados
                    ? "vinculados à tabela equipamentos_recebidos"
                    : "valor de referência da tabela escolas"}
                </span>
                {escolaSelecionada.funcionamentoEstimado && (
                  <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-yellow-300">
                    *Ativos estimados por ausência de inventário consolidado
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => router.push(`/escolas/${encodeURIComponent(escolaSelecionada.id)}`)}
                className="rounded-2xl bg-blue-600 px-5 py-4 text-center text-sm font-bold text-white transition-all hover:bg-blue-500"
              >
                Abrir ficha completa
              </button>

              {escolaSelecionada.endereco && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    escolaSelecionada.endereco
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-center text-sm font-bold text-blue-300 transition-all hover:bg-blue-500 hover:text-white"
                >
                  Abrir rota
                </a>
              )}

              {escolaSelecionada.telefone && (
                <a
                  href={`tel:${escolaSelecionada.telefone}`}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center text-sm font-bold text-emerald-300 transition-all hover:bg-emerald-500 hover:text-white"
                >
                  Ligar para a unidade
                </a>
              )}

              {escolaSelecionada.email && (
                <a
                  href={`mailto:${escolaSelecionada.email}`}
                  className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-4 text-center text-sm font-bold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-white"
                >
                  Enviar e-mail
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Geolocalização das escolas</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Visualização territorial do recorte atual.
              </p>
            </div>

            <Badge tone="blue">{metrics.totalEscolas} unidade(s)</Badge>
          </div>

          <div className="h-[420px] overflow-hidden rounded-[1.75rem] border border-slate-800 md:h-[620px]">
            <MapEscolas escolas={escolasFiltradas} />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-bold text-white">
            {escolaFiltro ? "Detalhes do Score" : "Top 10 - Escolas críticas"}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Menores scores no recorte atual.
          </p>

          <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {rankingScore.length === 0 ? (
              <EmptyState message="Nenhuma escola encontrada no recorte atual." />
            ) : (
              rankingScore.map((e, index) => (
                <RankingItem
                  key={e.id}
                  index={index}
                  title={e.nome_escola || "Escola sem nome"}
                  subtitle={`${e.equipFuncionando}/${e.equipIdeal} equipamentos • ${e.aps}/${e.wifiIdeal} APs`}
                  value={percent(e.score)}
                  tone={getScoreTone(e.score)}
                  hideIndex={Boolean(escolaFiltro)}
                  onClick={() => analisarEscola(e)}
                />
              ))
            )}
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <Panel>
          <h2 className="text-xl font-bold text-white">Déficit de equipamentos</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Escolas com maior distância da meta 3:1.
          </p>

          <div className="mt-5 space-y-3">
            {rankingDeficit.length === 0 ? (
              <EmptyState message="Nenhum dado disponível." />
            ) : (
              rankingDeficit.map((e, index) => (
                <RankingItem
                  key={e.id}
                  index={index}
                  title={e.nome_escola || "Escola sem nome"}
                  subtitle={`${formatNumber(e.alunos)} alunos • ideal ${formatNumber(e.equipIdeal)}`}
                  value={formatNumber(e.deficitEquip)}
                  tone={e.deficitEquip > 0 ? "red" : "emerald"}
                  hideIndex={Boolean(escolaFiltro)}
                  onClick={() => analisarEscola(e)}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-bold text-white">Equipamentos inativos</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Diferença entre recebidos e funcionando.
          </p>

          <div className="mt-5 space-y-3">
            {rankingInativos.length === 0 ? (
              <EmptyState message="Nenhum dado disponível." />
            ) : (
              rankingInativos.map((e, index) => (
                <RankingItem
                  key={e.id}
                  index={index}
                  title={e.nome_escola || "Escola sem nome"}
                  subtitle={`${formatNumber(e.equipFuncionando)} funcionando de ${formatNumber(
                    e.equipRecebidos
                  )}`}
                  value={formatNumber(e.equipInativos)}
                  tone={e.equipInativos > 0 ? "orange" : "emerald"}
                  hideIndex={Boolean(escolaFiltro)}
                  onClick={() => analisarEscola(e)}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-bold text-white">Inteligência analítica</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Leitura rápida para tomada de decisão.
          </p>

          <div className="mt-5 space-y-4">
            <InsightCard
              tone="blue"
              icon={<ComputerIcon className="h-5 w-5" />}
              title="Déficit estrutural"
              description={
                escolaFiltro
                  ? `A unidade possui déficit estimado de ${formatNumber(
                      metrics.deficitEquipTotal
                    )} equipamento(s) para a meta ideal.`
                  : `A rede possui déficit estimado de ${formatNumber(
                      metrics.deficitEquipTotal
                    )} equipamento(s) para atingir a meta ideal.`
              }
            />

            <InsightCard
              tone="red"
              icon={<ToolIcon className="h-5 w-5" />}
              title="Parque inativo"
              description={`Há ${formatNumber(
                metrics.equipamentosParados
              )} dispositivo(s) não operacional(is) no recorte atual.`}
            />

            <InsightCard
              tone="purple"
              icon={<WifiIcon className="h-5 w-5" />}
              title="Cobertura Wi-Fi"
              description={`A cobertura estimada de APs está em ${percent(
                metrics.coberturaWifi
              )}, com média de ${formatDecimal(metrics.salasPorAP)} sala(s) por AP.`}
            />

            <InsightCard
              tone={
                metrics.inventarioCobertura >= 0.8
                  ? "emerald"
                  : metrics.inventarioCobertura >= 0.5
                    ? "yellow"
                    : "red"
              }
              icon={<ClipboardIcon className="h-5 w-5" />}
              title="Recertificação de inventário"
              description={`${metrics.inventarioEmDia} de ${metrics.totalEscolas} unidade(s) estão com inventário dentro do ciclo de 90 dias. ${metrics.inventarioVencido} vencida(s) e ${metrics.inventarioSemDados} sem envio localizado.`}
            />

            {!escolaFiltro && maiorDeficit && (
              <InsightCard
                tone="orange"
                icon={<TrendIcon className="h-5 w-5" />}
                title="Maior déficit"
                description={`${maiorDeficit.nome_escola} concentra o maior déficit estimado no recorte atual: ${formatNumber(
                  maiorDeficit.deficitEquip
                )} equipamento(s).`}
              />
            )}

            {!escolaFiltro && maiorInatividade && (
              <InsightCard
                tone="yellow"
                icon={<AlertIcon className="h-5 w-5" />}
                title="Atenção operacional"
                description={`${maiorInatividade.nome_escola} possui ${formatNumber(
                  maiorInatividade.equipInativos
                )} equipamento(s) inativo(s) registrado(s).`}
              />
            )}
          </div>
        </Panel>
      </section>

      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Resumo das escolas</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Consulte os principais indicadores e abra rapidamente a análise de cada unidade.
            </p>
          </div>

          <Badge tone="slate">{escolasFiltradas.length} resultado(s)</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-separate border-spacing-y-2 text-left">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                <th className="px-4 py-2">Escola</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Alunos</th>
                <th className="px-4 py-2">Equipamentos</th>
                <th className="px-4 py-2">Inativos</th>
                <th className="px-4 py-2">APs</th>
                <th className="px-4 py-2">Inventário</th>
                <th className="px-4 py-2">Conectividade</th>
                <th className="px-4 py-2">Técnico</th>
                <th className="px-4 py-2 text-right">Ação</th>
              </tr>
            </thead>

            <tbody>
              {escolasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState message="Nenhuma escola localizada com os filtros atuais." />
                  </td>
                </tr>
              ) : (
                escolasFiltradas.map((e) => (
                  <tr key={e.id} className="bg-slate-900/50 text-sm text-slate-300">
                    <td className="rounded-l-2xl px-4 py-4">
                      <p className="max-w-[320px] truncate font-bold text-white">
                        {e.nome_escola || "Sem nome"}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        CIE {e.cie || "N/I"} • {e.tecnico_atribuido || "Sem técnico"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={getScoreTone(e.score)}>{percent(e.score)}</Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatNumber(e.alunos)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-200">
                        {formatNumber(e.equipFuncionando)} ativos
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        {formatNumber(e.equipRecebidos)} recebidos
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={e.equipInativos > 0 ? "orange" : "emerald"}>
                        {formatNumber(e.equipInativos)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatNumber(e.aps)} / {formatNumber(e.wifiIdeal)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={getInventarioTone(e.statusInventario)}>
                        {getInventarioLabel(e.statusInventario)}
                      </Badge>
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">
                        {formatDate(e.ultimaAtualizacaoInventario)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={getConectividadeTone(e.status_conectividade)}>
                        {e.status_conectividade || "N/I"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <p
                        className="max-w-[180px] truncate text-xs font-semibold text-slate-400"
                        title={e.tecnico_atribuido || "Sem técnico"}
                      >
                        {e.tecnico_atribuido || "Sem técnico"}
                      </p>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => analisarEscola(e)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-300 transition hover:bg-blue-500 hover:text-white"
                      >
                        Analisar
                        <ChevronIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  )
}

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const colors: Record<Tone, string> = {
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
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${colors[tone]}`}
    >
      {children}
    </span>
  )
}

function MiniHeroStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: Tone
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className={`mt-2 truncate text-2xl font-bold text-white`}>
        {value}
      </p>

      <div className={`mt-3 h-1 rounded-full ${toneBg(tone)}`} />
    </div>
  )
}

function StatusCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string
  value: number
  subtitle: string
  tone: Tone
  icon: ReactNode
}) {
  return (
    <div className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-xl transition-all hover:-translate-y-0.5 md:p-7 ${tonePanel(tone)}`}>
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-white/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className="relative z-10 flex items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">
            {title}
          </p>

          <p className="mt-2 text-5xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-2 text-xs font-semibold uppercase tracking-widest opacity-70">
            {subtitle}
          </p>
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 opacity-80 transition-all group-hover:scale-110 group-hover:opacity-100">
          {icon}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string
  value: string | number
  subtitle: string
  tone: Tone
  icon: ReactNode
}) {
  return (
    <div className={`group relative overflow-hidden rounded-[1.75rem] border p-5 shadow-xl transition-all hover:-translate-y-0.5 md:p-6 ${tonePanel(tone)}`}>
      <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
          {icon}
        </div>

        <div className={`h-2.5 w-2.5 rounded-full ${toneBg(tone)} shadow-lg`} />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
        {value}
      </p>

      <p className="mt-2 text-xs font-medium leading-relaxed opacity-80">
        {subtitle}
      </p>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  progress,
  tone,
}: {
  title: string
  value: string | number
  description: string
  progress: number
  tone: Tone
}) {
  const width = `${Math.min(Math.max(progress, 0), 1) * 100}%`

  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>

        <span className={`rounded-2xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${toneBadge(tone)}`}>
          Indicador
        </span>
      </div>

      <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
        {description}
      </p>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-900">
        <div className={`h-full rounded-full ${toneBg(tone)}`} style={{ width }} />
      </div>
    </div>
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
    <section
      className={`rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:rounded-[2.5rem] md:p-7 ${className}`}
    >
      {children}
    </section>
  )
}

function RankingItem({
  index,
  title,
  subtitle,
  value,
  tone,
  hideIndex = false,
  onClick,
}: {
  index: number
  title: string
  subtitle: string
  value: string | number
  tone: Tone
  hideIndex?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-left transition-all hover:border-blue-500/30 hover:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        {!hideIndex && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#020617] text-xs font-bold text-slate-500">
            {index + 1}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white" title={title}>
            {title}
          </p>

          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={tone}>{value}</Badge>
        <ChevronIcon className="h-4 w-4 text-slate-600" />
      </div>
    </button>
  )
}

function InsightCard({
  tone,
  icon,
  title,
  description,
}: {
  tone: Tone
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className={`rounded-3xl border p-5 ${tonePanel(tone)}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
          {icon}
        </div>

        <div>
          <p className="font-bold text-white">{title}</p>
          <p className="mt-1 text-sm font-medium leading-relaxed opacity-80">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-white" title={value}>
        {value}
      </p>
    </div>
  )
}

function CompactInfoCard({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string
  value: string | number
  detail: string
  tone: Tone
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-800 bg-[#020617] p-5 shadow-lg">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tonePanel(tone)}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {title}
        </p>
        <p className="mt-1 truncate text-xl font-bold text-white">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500" title={detail}>
          {detail}
        </p>
      </div>
    </div>
  )
}

function InventoryMini({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: Tone
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tonePanel(tone)}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-75">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function SchoolMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: Tone
}) {
  return (
    <div className={`min-w-[112px] rounded-2xl border p-3.5 ${tonePanel(tone)}`}>
      <p className="text-[9px] font-semibold uppercase tracking-widest opacity-75">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6 text-center">
      <p className="text-sm font-semibold text-slate-500">{message}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-8 pb-12">
      <div className="h-64 animate-pulse rounded-[2.5rem] border border-slate-800 bg-slate-900/50" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-900/50" />
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-900/50" />
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-900/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-900/50" />
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-900/50" />
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-900/50" />
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-900/50" />
      </div>
    </main>
  )
}

function tonePanel(tone: Tone) {
  const colors: Record<Tone, string> = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    slate: "border-slate-800 bg-slate-900/50 text-slate-300",
  }

  return colors[tone]
}

function toneBadge(tone: Tone) {
  return tonePanel(tone)
}

function toneBg(tone: Tone) {
  const colors: Record<Tone, string> = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    slate: "bg-slate-500",
  }

  return colors[tone]
}

function SvgBase({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      {children}
    </svg>
  )
}

function BuildingIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 21V5.25A2.25 2.25 0 0 1 6.75 3h10.5a2.25 2.25 0 0 1 2.25 2.25V21M9 7.5h1.5M9 11.25h1.5M9 15h1.5m3-7.5H15m-1.5 3.75H15M13.5 15H15" />
    </SvgBase>
  )
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a5.971 5.971 0 0 0-.941 3.197" />
    </SvgBase>
  )
}

function ComputerIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m-10.5-3h15A2.25 2.25 0 0 0 21.75 12V5.25A2.25 2.25 0 0 0 19.5 3h-15A2.25 2.25 0 0 0 2.25 5.25V12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </SvgBase>
  )
}

function TrendIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.5 4.5L21.75 7.5M16.5 7.5h5.25v5.25" />
    </SvgBase>
  )
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </SvgBase>
  )
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992M20.49 4.51v4.838h-4.838M7.977 14.652H2.985M3.51 19.49v-4.838h4.838m11.154-2.69a7.5 7.5 0 0 0-12.728-4.228M4.498 12.04a7.5 7.5 0 0 0 12.728 4.228" />
    </SvgBase>
  )
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </SvgBase>
  )
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm-9.303 1.083 8.25-14.25a1.5 1.5 0 0 1 2.606 0l8.25 14.25A1.5 1.5 0 0 1 20.5 21h-17a1.5 1.5 0 0 1-1.303-2.167Z" />
    </SvgBase>
  )
}

function WarningIcon({ className = "" }: { className?: string }) {
  return <AlertIcon className={className} />
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </SvgBase>
  )
}

function ToolIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21.75 6.75-6 6m0 0L9.75 6.75m6 6v8.25m-6-14.25L3.75 12.75m6-6v8.25" />
    </SvgBase>
  )
}

function WifiIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 18.75h.008v.008H12v-.008Z" />
    </SvgBase>
  )
}

function ClipboardIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5.25h6m-6 4.5h6m-6 4.5h3.75M8.25 3.75h7.5A2.25 2.25 0 0 1 18 6v13.5H6V6a2.25 2.25 0 0 1 2.25-2.25Z"
      />
    </SvgBase>
  )
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 5.25 6.75 6.75L9 18.75"
      />
    </SvgBase>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-cyan-500" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}