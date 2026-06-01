"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"

type EscolaSetorizacao = {
  id: string
  nome_escola: string | null
  cie: string | number | null
  tecnico_atribuido: string | null
}

type TecnicoCarga = {
  name: string
  count: number
}

type Feedback = {
  tipo: "success" | "error" | "info"
  texto: string
} | null

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function getInitials(name?: string | null) {
  const clean = textoSeguro(name)

  if (!clean || clean === "Sem Técnico") return "ST"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível carregar os dados da setorização."
}

function getCargaStyle(count: number, media: number) {
  if (media > 0 && count > media + 2) {
    return {
      label: "Alta carga",
      badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
      bar: "from-orange-500 to-red-500",
      text: "text-orange-300",
      glow: "shadow-orange-950/20",
      dot: "bg-orange-400",
    }
  }

  if (media > 0 && count < Math.max(media - 2, 1)) {
    return {
      label: "Baixa carga",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      bar: "from-emerald-500 to-teal-400",
      text: "text-emerald-300",
      glow: "shadow-emerald-950/20",
      dot: "bg-emerald-400",
    }
  }

  return {
    label: "Equilibrado",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    bar: "from-blue-500 to-cyan-400",
    text: "text-cyan-300",
    glow: "shadow-cyan-950/20",
    dot: "bg-cyan-400",
  }
}

export default function PainelVisualSetorizacao() {
  const supabase = useMemo(() => createClient(), [])

  const [escolas, setEscolas] = useState<EscolaSetorizacao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState("")
  const [filtroTecnico, setFiltroTecnico] = useState("Todos")
  const [feedback, setFeedback] = useState<Feedback>(null)

  const carregarDados = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setFeedback(null)

      try {
        const { data, error } = await supabase
          .from("escolas")
          .select("id, nome_escola, cie, tecnico_atribuido")
          .order("nome_escola", { ascending: true })

        if (error) throw error

        setEscolas((data || []) as EscolaSetorizacao[])

        if (modo === "manual") {
          setFeedback({
            tipo: "success",
            texto: "Painel atualizado com sucesso.",
          })
        }
      } catch (error) {
        console.error("[Painel Visual Setorização] Erro ao carregar:", error)

        setFeedback({
          tipo: "error",
          texto: getErrorMessage(error),
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    carregarDados("inicial")
  }, [carregarDados])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  const stats = useMemo(() => {
    const contagem: Record<string, number> = {}
    let pendentes = 0

    escolas.forEach((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)

      if (tecnico) {
        contagem[tecnico] = (contagem[tecnico] || 0) + 1
      } else {
        pendentes++
      }
    })

    const chartData: TecnicoCarga[] = Object.entries(contagem)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"))

    const total = escolas.length
    const cobertas = total - pendentes
    const maxCarga = chartData.length > 0 ? chartData[0].count : 1
    const totalTecnicosAtivos = chartData.length
    const mediaPorTecnico =
      totalTecnicosAtivos > 0 ? Math.round(cobertas / totalTecnicosAtivos) : 0

    const tecnicoMaisLotado = chartData.length > 0 ? chartData[0] : null
    const tecnicoMenosLotado =
      chartData.length > 0 ? chartData[chartData.length - 1] : null

    const percentualCobertura =
      total > 0 ? Math.round((cobertas / total) * 100) : 0

    const acimaDaMedia = chartData.filter((item) =>
      mediaPorTecnico > 0 ? item.count > mediaPorTecnico : false
    ).length

    return {
      chartData,
      pendentes,
      total,
      cobertas,
      maxCarga,
      mediaPorTecnico,
      tecnicoMaisLotado,
      tecnicoMenosLotado,
      totalTecnicosAtivos,
      percentualCobertura,
      acimaDaMedia,
    }
  }, [escolas])

  const listaTecnicosSelect = useMemo(() => {
    const nomes = new Set<string>()

    escolas.forEach((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)
      if (tecnico) nomes.add(tecnico)
    })

    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [escolas])

  const escolasFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    return escolas.filter((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)

      const matchBusca = termo
        ? [escola.nome_escola, escola.cie, escola.tecnico_atribuido]
            .map(normalizar)
            .join(" ")
            .includes(termo)
        : true

      const matchTecnico =
        filtroTecnico === "Todos"
          ? true
          : filtroTecnico === "Sem Técnico"
            ? !tecnico
            : tecnico === filtroTecnico

      return matchBusca && matchTecnico
    })
  }, [busca, escolas, filtroTecnico])

  const filtrosAtivos = Boolean(busca.trim()) || filtroTecnico !== "Todos"

  function limparFiltros() {
    setBusca("")
    setFiltroTecnico("Todos")
  }

  if (loading) return <LoadingPage />

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-cyan-500/20 bg-[#020617] p-5 shadow-2xl shadow-cyan-950/10 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.18),transparent_34%)]" />
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_360px] xl:items-stretch">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <Badge color="cyan">Fields</Badge>
                <Badge color="blue">Setorização</Badge>
                <Badge color="emerald">Malha de atendimento</Badge>
              </div>

              <h1 className="max-w-5xl text-3xl font-black tracking-tight text-white md:text-5xl">
                Gestão e Setorização{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                  FIELD
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
                Monitoramento tático da distribuição das unidades escolares por
                técnico de campo, com visão de cobertura, carga operacional,
                gargalos e escolas ainda sem atribuição.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <KpiCard
                label="Total UEs"
                value={stats.total}
                subtitle="Base geral"
                tone="slate"
              />

              <KpiCard
                label="Cobertas"
                value={stats.cobertas}
                subtitle={`${stats.percentualCobertura}% da malha`}
                tone="emerald"
              />

              <KpiCard
                label="Descobertas"
                value={stats.pendentes}
                subtitle="Sem técnico"
                tone="red"
              />

              <KpiCard
                label="Média"
                value={`~${stats.mediaPorTecnico}`}
                subtitle="UEs/técnico"
                tone="blue"
              />

              <KpiCard
                label="Acima da média"
                value={stats.acimaDaMedia}
                subtitle="Pontos de atenção"
                tone="orange"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-cyan-500/25 bg-slate-950/70 p-5 shadow-xl shadow-cyan-950/20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_48%)]" />

            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#22d3ee ${stats.percentualCobertura * 3.6}deg, rgba(30,41,59,0.92) 0deg)`,
                }}
              >
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border border-slate-800 bg-[#020617] shadow-inner">
                  <p className="text-4xl font-black text-white">
                    {stats.percentualCobertura}%
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Cobertura
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-lg font-black text-white">
                  {stats.pendentes > 0
                    ? `${stats.pendentes} escola(s) sem técnico`
                    : "Malha totalmente coberta"}
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                  Dados consolidados a partir da coluna técnico atribuído.
                </p>
              </div>
            </div>
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
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {feedback.texto}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Glass title="Carga da Equipe Field" icon="📊">
          {stats.chartData.length === 0 ? (
            <EmptyState
              icon="👨‍🔧"
              title="Nenhum técnico atribuído"
              description="Ainda não há técnicos vinculados às escolas na base."
            />
          ) : (
            <div className="custom-scrollbar max-h-[650px] space-y-3 overflow-y-auto pr-2">
              {stats.chartData.map((tecnico, index) => (
                <TecnicoCargaCard
                  key={tecnico.name}
                  tecnico={tecnico}
                  index={index}
                  maxCarga={stats.maxCarga}
                  media={stats.mediaPorTecnico}
                />
              ))}
            </div>
          )}
        </Glass>

        <Glass title="Consulta da Malha de Atendimento" icon="🔎">
          <div className="mb-5 rounded-[1.75rem] border border-slate-800 bg-slate-950/45 p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_270px_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-slate-500">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Localizar por escola, CIE ou técnico..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-[#020617] py-4 pl-14 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>

              <select
                value={filtroTecnico}
                onChange={(event) => setFiltroTecnico(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value="Todos">Todos os técnicos</option>
                <option value="Sem Técnico">Sem técnico</option>

                {listaTecnicosSelect.map((tecnico) => (
                  <option key={tecnico} value={tecnico}>
                    {tecnico}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => carregarDados("manual")}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={refreshing ? "animate-spin" : ""}>↻</span>
                Atualizar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <p className="text-xs font-semibold text-slate-500">
                Exibindo{" "}
                <span className="font-black text-cyan-300">
                  {escolasFiltradas.length}
                </span>{" "}
                de <span className="font-black text-slate-300">{stats.total}</span>{" "}
                escola(s).
              </p>

              {filtrosAtivos && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {escolasFiltradas.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Nenhum resultado encontrado"
              description="Ajuste a busca, selecione outro técnico ou limpe os filtros."
            />
          ) : (
            <div className="custom-scrollbar grid max-h-[560px] grid-cols-1 gap-3 overflow-y-auto pr-2 lg:grid-cols-2">
              {escolasFiltradas.map((escola) => (
                <EscolaCard key={escola.id} escola={escola} />
              ))}
            </div>
          )}
        </Glass>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InsightCard
          label="Maior carga"
          value={stats.tecnicoMaisLotado ? `${stats.tecnicoMaisLotado.count} UEs` : "0"}
          detail={stats.tecnicoMaisLotado?.name || "Nenhum técnico"}
          tone="orange"
        />

        <InsightCard
          label="Menor carga"
          value={stats.tecnicoMenosLotado ? `${stats.tecnicoMenosLotado.count} UEs` : "0"}
          detail={stats.tecnicoMenosLotado?.name || "Nenhum técnico"}
          tone="emerald"
        />

        <InsightCard
          label="Técnicos ativos"
          value={stats.totalTecnicosAtivos}
          detail="Técnicos com escolas vinculadas"
          tone="cyan"
        />
      </section>

      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #475569 rgba(15, 23, 42, 0.45);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.35);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }

        select option {
          background-color: #0f172a;
          color: #f8fafc;
        }
      `}</style>
    </div>
  )
}

function TecnicoCargaCard({
  tecnico,
  index,
  maxCarga,
  media,
}: {
  tecnico: TecnicoCarga
  index: number
  maxCarga: number
  media: number
}) {
  const percent = maxCarga > 0 ? (tecnico.count / maxCarga) * 100 : 0
  const visual = getCargaStyle(tecnico.count, media)

  const rank =
    index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.55rem] border border-slate-800 bg-slate-950/75 p-4 shadow-lg transition hover:-translate-y-[1px] hover:border-cyan-500/35 hover:bg-slate-900/80 ${visual.glow}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-sm font-black ${visual.badge}`}
          >
            {getInitials(tecnico.name)}
          </div>

          {rank && (
            <div className="absolute -right-2 -top-2 text-lg drop-shadow-md">
              {rank}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                {tecnico.name}
              </p>

              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${visual.badge}`}
              >
                {visual.label}
              </span>
            </div>

            <p className={`shrink-0 text-2xl font-black ${visual.text}`}>
              {tecnico.count}
              <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                UEs
              </span>
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full border border-slate-800 bg-[#020617]">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${visual.bar}`}
              style={{ width: `${Math.max(percent, 5)}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function EscolaCard({ escola }: { escola: EscolaSetorizacao }) {
  const tecnico = textoSeguro(escola.tecnico_atribuido)
  const descoberta = !tecnico

  return (
    <article
      className={`group relative min-h-[112px] overflow-hidden rounded-[1.55rem] border p-4 shadow-lg transition hover:-translate-y-[1px] ${
        descoberta
          ? "border-red-500/25 bg-red-500/[0.045] hover:border-red-500/40"
          : "border-slate-800 bg-slate-950/75 hover:border-cyan-500/35 hover:bg-slate-900/80"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
              CIE {textoSeguro(escola.cie, "S/N")}
            </span>

            {descoberta ? (
              <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-300">
                Descoberta
              </span>
            ) : (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Coberta
              </span>
            )}
          </div>

          <h3
            className="line-clamp-2 text-sm font-black leading-snug text-white"
            title={textoSeguro(escola.nome_escola, "Escola sem nome")}
          >
            {textoSeguro(escola.nome_escola, "Escola sem nome")}
          </h3>
        </div>

        <div
          className={`inline-flex max-w-full items-center gap-2 self-start rounded-xl border px-3 py-2 ${
            descoberta
              ? "border-red-500/25 bg-red-500/10 text-red-300"
              : "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
          }`}
          title={descoberta ? "Sem técnico atribuído" : tecnico}
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              descoberta ? "animate-pulse bg-red-400" : "bg-cyan-400"
            }`}
          />
          <span className="truncate text-[10px] font-black uppercase tracking-widest">
            {descoberta ? "Sem técnico atribuído" : tecnico}
          </span>
        </div>
      </div>
    </article>
  )
}

function Glass({
  children,
  title,
  icon,
  className = "",
}: {
  children: ReactNode
  title: string
  icon?: string
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="mb-5 flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-xl">
            {icon}
          </div>
        )}

        <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {title}
        </h2>
      </div>

      {children}
    </div>
  )
}

function KpiCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string
  value: string | number
  subtitle: string
  tone: "slate" | "emerald" | "red" | "blue" | "orange"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  }

  const bars = {
    slate: "bg-slate-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {value}
      </p>

      <p className="mt-1 truncate text-xs font-semibold opacity-80" title={subtitle}>
        {subtitle}
      </p>

      <div className={`mt-3 h-1 rounded-full ${bars[tone]}`} />
    </div>
  )
}

function InsightCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  tone: "orange" | "emerald" | "cyan"
}) {
  const styles = {
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  }

  return (
    <div className={`rounded-[1.75rem] border p-5 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>

      <p className="mt-1 truncate text-sm font-bold opacity-80" title={detail}>
        {detail}
      </p>
    </div>
  )
}

function Badge({
  children,
  color,
}: {
  children: ReactNode
  color: "cyan" | "blue" | "emerald"
}) {
  const styles = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles[color]}`}
    >
      {children}
    </span>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-3xl">
        {icon}
      </div>

      <p className="text-lg font-black text-white">{title}</p>

      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      <div className="h-72 animate-pulse rounded-[2.5rem] border border-slate-800 bg-slate-900/40" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="h-[650px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
        <div className="h-[650px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      </div>
    </div>
  )
}