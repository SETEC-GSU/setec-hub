"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient } from "@supabase/supabase-js"

type Tutorial = {
  id: string
  titulo: string
  categoria: string | null
  subcategoria: string | null
  visualizacoes: number | null
  arquivo_url: string
}

type CategoriaRanking = {
  categoria: string
  views: number
}

type EquipamentoRanking = {
  equip: string
  views: number
}

type Estatisticas = {
  totalTutoriais: number
  totalViews: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TutoriaisPopulares() {
  const [topTutoriais, setTopTutoriais] = useState<Tutorial[]>([])
  const [porCategoria, setPorCategoria] = useState<CategoriaRanking[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalTutoriais: 0,
    totalViews: 0,
  })

  const [problemasRecorrentes, setProblemasRecorrentes] = useState<Tutorial[]>(
    []
  )
  const [equipamentosSuporte, setEquipamentosSuporte] = useState<
    EquipamentoRanking[]
  >([])
  const [tutoriaisNaoUsados, setTutoriaisNaoUsados] = useState<Tutorial[]>([])

  async function carregar() {
    const { data: top } = await supabase
      .from("base_conhecimento")
      .select("*")
      .order("visualizacoes", { ascending: false })
      .limit(10)

    const { data: todos } = await supabase
      .from("base_conhecimento")
      .select("*")

    const todosTutoriais = (todos || []) as Tutorial[]
    const topCarregados = (top || []) as Tutorial[]

    const categorias: Record<string, number> = {}

    todosTutoriais.forEach((item) => {
      const categoria = item.categoria || "SEM CATEGORIA"

      if (!categorias[categoria]) {
        categorias[categoria] = 0
      }

      categorias[categoria] += item.visualizacoes || 0
    })

    const rankingCategorias = Object.entries(categorias)
      .map(([categoria, views]) => ({ categoria, views }))
      .sort((a, b) => b.views - a.views)

    const recorrentes = [...todosTutoriais]
      .sort((a, b) => (b.visualizacoes || 0) - (a.visualizacoes || 0))
      .slice(0, 5)

    const equipamentos: Record<string, number> = {}

    todosTutoriais.forEach((item) => {
      if (item.categoria === "EQUIPAMENTOS") {
        const subcategoria = item.subcategoria || "Outros"

        if (!equipamentos[subcategoria]) {
          equipamentos[subcategoria] = 0
        }

        equipamentos[subcategoria] += item.visualizacoes || 0
      }
    })

    const rankingEquipamentos = Object.entries(equipamentos)
      .map(([equip, views]) => ({ equip, views }))
      .sort((a, b) => b.views - a.views)

    const naoUsados = todosTutoriais
      .filter((item) => (item.visualizacoes || 0) === 0)
      .slice(0, 6)

    setTopTutoriais(topCarregados)
    setPorCategoria(rankingCategorias)
    setProblemasRecorrentes(recorrentes)
    setEquipamentosSuporte(rankingEquipamentos)
    setTutoriaisNaoUsados(naoUsados)

    setEstatisticas({
      totalTutoriais: todosTutoriais.length,
      totalViews: todosTutoriais.reduce(
        (acc, item) => acc + (item.visualizacoes || 0),
        0
      ),
    })
  }

  useEffect(() => {
    carregar()
  }, [])

  async function registrarVisualizacao(item: Tutorial) {
    try {
      await supabase
        .from("base_conhecimento")
        .update({
          visualizacoes: (item.visualizacoes || 0) + 1,
        })
        .eq("id", item.id)
    } catch (error) {
      console.log("erro ao registrar visualização", error)
    }

    window.open(item.arquivo_url, "_blank")
    carregar()
  }

  const mediaAcessos = estatisticas.totalTutoriais
    ? estatisticas.totalViews / estatisticas.totalTutoriais
    : 0

  const maiorAcessoTutorial = useMemo(
    () => Math.max(1, ...topTutoriais.map((item) => item.visualizacoes || 0)),
    [topTutoriais]
  )

  const maiorCategoria = useMemo(
    () => Math.max(1, ...porCategoria.map((item) => item.views || 0)),
    [porCategoria]
  )

  const maiorEquipamento = useMemo(
    () => Math.max(1, ...equipamentosSuporte.map((item) => item.views || 0)),
    [equipamentosSuporte]
  )

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7 pb-12">
      {/* CABEÇALHO */}
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/30 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_26%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">
                <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.75)]" />
                Base de conhecimento
              </span>

              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Análise de utilização
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.12)] sm:flex">
                <KnowledgeIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  Tutoriais mais acessados
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Acompanhe os conteúdos mais consultados, identifique os temas
                  com maior demanda e monitore materiais que ainda não foram
                  utilizados pela rede.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/65 px-5 py-4 backdrop-blur-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
              Conteúdo em destaque
            </p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-3xl font-black text-white">
                {topTutoriais.length}
              </p>
              <p className="mb-1 text-xs font-bold text-slate-600">
                tutoriais no ranking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total de tutoriais"
          value={estatisticas.totalTutoriais}
          description="Materiais cadastrados na base"
          icon={<LibraryIcon className="h-5 w-5" />}
          tone="blue"
        />

        <MetricCard
          title="Total de acessos"
          value={estatisticas.totalViews}
          description="Visualizações acumuladas"
          icon={<EyeIcon className="h-5 w-5" />}
          tone="cyan"
        />

        <MetricCard
          title="Média de acessos"
          value={mediaAcessos.toFixed(1)}
          description="Visualizações por tutorial"
          icon={<ChartIcon className="h-5 w-5" />}
          tone="violet"
        />
      </section>

      {/* TOP TUTORIAIS */}
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-orange-500/5 blur-3xl" />

        <div className="relative z-10 mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
              Ranking geral
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Top tutoriais da rede
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Clique em um material para abrir o arquivo e registrar uma nova
              visualização.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-orange-300">
            <TrophyIcon className="h-3.5 w-3.5" />
            Mais consultados
          </span>
        </div>

        <div className="relative z-10 space-y-3">
          {topTutoriais.map((item, index) => {
            const visualizacoes = item.visualizacoes || 0
            const percentual = (visualizacoes / maiorAcessoTutorial) * 100

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => registrarVisualizacao(item)}
                className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/35 hover:bg-slate-900"
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/8 to-transparent transition-all duration-700"
                  style={{ width: `${percentual}%` }}
                />

                <div
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${
                    index === 0
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : index === 1
                        ? "border-slate-400/30 bg-slate-400/10 text-slate-300"
                        : index === 2
                          ? "border-orange-500/25 bg-orange-500/10 text-orange-300"
                          : "border-slate-700 bg-slate-900 text-slate-500"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="relative z-10 min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-200 transition group-hover:text-white sm:text-base">
                    {item.titulo}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-300">
                      {item.categoria || "Sem categoria"}
                    </span>

                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-500">
                      {item.subcategoria || "Geral"}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 hidden shrink-0 text-right sm:block">
                  <p className="text-lg font-black text-cyan-300">
                    {visualizacoes}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                    acessos
                  </p>
                </div>

                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-600 transition group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 group-hover:text-cyan-300">
                  <ExternalLinkIcon className="h-4 w-4" />
                </div>
              </button>
            )
          })}

          {topTutoriais.length === 0 && (
            <EmptyState
              title="Nenhum tutorial encontrado"
              description="O ranking será exibido quando os conteúdos forem cadastrados."
            />
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* CATEGORIAS */}
        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              Distribuição temática
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Categorias mais consultadas
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Volume total de visualizações agrupado por categoria.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {porCategoria.map((categoria, index) => {
              const percentual = (categoria.views / maiorCategoria) * 100

              return (
                <article
                  key={categoria.categoria}
                  className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {categoria.categoria}
                      </p>
                      <p className="mt-1 text-xs font-bold text-blue-300">
                        {categoria.views} acessos
                      </p>
                    </div>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs font-black text-blue-300">
                      {index + 1}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </article>
              )
            })}

            {porCategoria.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyState
                  title="Nenhuma categoria encontrada"
                  description="As categorias serão exibidas conforme os tutoriais forem utilizados."
                />
              </div>
            )}
          </div>
        </section>

        {/* PROBLEMAS RECORRENTES */}
        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              Sinais de demanda
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Problemas mais recorrentes
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Conteúdos mais acessados como indicativo de dúvidas frequentes.
            </p>
          </div>

          <div className="space-y-3">
            {problemasRecorrentes.map((item, index) => (
              <article
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-sm font-black text-violet-300">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-200">
                    {item.titulo}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                    {item.categoria || "Sem categoria"} •{" "}
                    {item.subcategoria || "Geral"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-violet-300">
                    {item.visualizacoes || 0}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    acessos
                  </p>
                </div>
              </article>
            ))}

            {problemasRecorrentes.length === 0 && (
              <EmptyState
                title="Nenhum dado recorrente"
                description="Os conteúdos mais acessados aparecerão aqui."
              />
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* EQUIPAMENTOS */}
        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="pointer-events-none absolute right-0 bottom-0 h-40 w-40 rounded-full bg-cyan-500/4 blur-3xl" />

          <div className="relative z-10 mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
              Suporte por equipamento
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Equipamentos que mais geram suporte
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Visualizações dos conteúdos classificados na categoria
              EQUIPAMENTOS.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equipamentosSuporte.map((equipamento, index) => {
              const percentual = (equipamento.views / maiorEquipamento) * 100

              return (
                <article
                  key={equipamento.equip}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                      <DeviceIcon className="h-5 w-5" />
                    </div>

                    <span className="text-xs font-black text-slate-600">
                      #{index + 1}
                    </span>
                  </div>

                  <p className="mt-4 truncate text-sm font-black text-white">
                    {equipamento.equip}
                  </p>

                  <p className="mt-1 text-lg font-black text-cyan-300">
                    {equipamento.views} acessos
                  </p>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </article>
              )
            })}

            {equipamentosSuporte.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <EmptyState
                  title="Nenhum equipamento classificado"
                  description="Os equipamentos aparecerão conforme a base for utilizada."
                />
              </div>
            )}
          </div>
        </section>

        {/* NÃO UTILIZADOS */}
        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
              Oportunidade de revisão
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Tutoriais ainda não utilizados
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Materiais sem visualizações registradas até o momento.
            </p>
          </div>

          <div className="space-y-3">
            {tutoriaisNaoUsados.map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                  <FileIcon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-200">
                    {item.titulo}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                    {item.categoria || "Sem categoria"} •{" "}
                    {item.subcategoria || "Geral"}
                  </p>
                </div>

                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-amber-300">
                  0 acessos
                </span>
              </article>
            ))}

            {tutoriaisNaoUsados.length === 0 && (
              <EmptyState
                title="Todos os materiais já foram utilizados"
                description="Não há tutoriais sem visualizações no momento."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string | number
  description: string
  icon: ReactNode
  tone: "blue" | "cyan" | "violet"
}) {
  const tones = {
    blue: {
      card: "border-blue-500/20 bg-gradient-to-br from-[#020617] to-blue-950/20",
      icon: "border-blue-500/20 bg-blue-500/10 text-blue-300",
      value: "text-blue-300",
    },
    cyan: {
      card: "border-cyan-500/20 bg-gradient-to-br from-[#020617] to-cyan-950/20",
      icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      value: "text-cyan-300",
    },
    violet: {
      card: "border-violet-500/20 bg-gradient-to-br from-[#020617] to-violet-950/20",
      icon: "border-violet-500/20 bg-violet-500/10 text-violet-300",
      value: "text-violet-300",
    },
  }

  const style = tones[tone]

  return (
    <article
      className={`relative isolate overflow-hidden rounded-[1.5rem] border p-5 shadow-xl shadow-slate-950/15 ${style.card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className={`mt-3 text-3xl font-black ${style.value}`}>{value}</p>
          <p className="mt-2 text-xs font-medium text-slate-600">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </article>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <div>
        <p className="text-sm font-black text-slate-400">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-600">
          {description}
        </p>
      </div>
    </div>
  )
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
      strokeWidth={1.9}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function KnowledgeIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3h4.5v16.5h-4.5A2.25 2.25 0 0 0 4.5 21.75V5.25Zm15 0A2.25 2.25 0 0 0 17.25 3h-4.5v16.5h4.5a2.25 2.25 0 0 1 2.25 2.25V5.25Z"
      />
    </SvgBase>
  )
}

function LibraryIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.5h4.5v15h-4.5v-15Zm6 0h4.5v15h-4.5v-15Zm6 0h4.5v15h-4.5v-15Z"
      />
    </SvgBase>
  )
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6S2.25 12 2.25 12Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </SvgBase>
  )
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v18h17.25M7.5 16.5v-4.5m4.5 4.5v-9m4.5 9v-6"
      />
    </SvgBase>
  )
}

function TrophyIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5h7.5v3.75A3.75 3.75 0 0 1 12 12a3.75 3.75 0 0 1-3.75-3.75V4.5Zm0 1.5H4.5v1.5A3.75 3.75 0 0 0 8.25 11.25m7.5-5.25h3.75v1.5a3.75 3.75 0 0 1-3.75 3.75M12 12v4.5m-3 3h6"
      />
    </SvgBase>
  )
}

function ExternalLinkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M10.5 6H6A2.25 2.25 0 0 0 3.75 8.25V18A2.25 2.25 0 0 0 6 20.25h9.75A2.25 2.25 0 0 0 18 18v-4.5"
      />
    </SvgBase>
  )
}

function DeviceIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 4.5h15v10.5h-15V4.5Zm3 15h9m-6-4.5v4.5m3-4.5v4.5"
      />
    </SvgBase>
  )
}

function FileIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3.75h7.5L18 8.25v12H6v-16.5Zm7.5 0v4.5H18M9 12h6m-6 3h6"
      />
    </SvgBase>
  )
}