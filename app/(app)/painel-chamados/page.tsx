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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [filtroOrigem, setFiltroOrigem] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("")
  const [busca, setBusca] = useState("")

  const carregar = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setFeedback(null)

      try {
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

        const listaChamados = (chamadosData || []) as ChamadoRow[]

        setChamados(listaChamados)

        const idsUsuarios = [
          ...new Set(
            listaChamados
              .map((chamado) => chamado.usuario_id)
              .filter(Boolean) as string[]
          ),
        ]

        if (idsUsuarios.length === 0) {
          setUsuarios([])
          return
        }

        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuarios")
          .select("id,nome,email,role,setor")
          .in("id", idsUsuarios)

        if (usuariosError) {
          console.error("[Painel Chamados] Erro ao buscar usuários:", usuariosError)
          setUsuarios([])
          return
        }

        setUsuarios((usuariosData || []) as UsuarioRow[])
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

      if (!termo) return true

      const usuario = chamado.usuario_id ? usuarioMap.get(chamado.usuario_id) : null

      const conteudo = normalizarTexto(
        [
          chamado.codigo,
          chamado.titulo,
          chamado.descricao,
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
        ].join(" ")
      )

      return conteudo.includes(termo)
    })
  }, [busca, chamados, filtroMes, filtroOrigem, filtroStatus, usuarioMap])

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
  }

  const filtrosAtivos =
    busca.trim().length > 0 || filtroOrigem || filtroMes || filtroStatus

  if (loading) {
    return <LoadingPainel />
  }

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.17),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.10),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge>Dashboard SETEC</Badge>
              <Badge>Chamados</Badge>
              <Badge secondary>Operacional</Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Painel Geral de{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                Chamados
              </span>
            </h1>

            <p className="mt-3 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Visão consolidada dos atendimentos SETEC, com indicadores por status,
              categoria, origem, prioridade, evolução mensal e usuários solicitantes.
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
          title="Chamados por usuário"
          subtitle="Usuários com mais chamados registrados."
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