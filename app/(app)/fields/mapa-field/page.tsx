"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase"
import {
  filtrarEscolas,
  getCoordenadas,
  getTecnicoId,
  getTecnicos,
  getTecnicoVisual,
  SEM_TECNICO,
  textoSeguro,
  type EscolaMapa
} from "@/lib/fieldsMap"

const MapSetorizacao = dynamic(() => import("@/components/ui/MapSetorizacao"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400"
    >
      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      Carregando mapa…
    </div>
  )
})

type Feedback = { tipo: "success" | "error"; texto: string } | null
type Visualizacao = "mapa" | "lista"
const TAMANHO_LOTE = 500
const ESCOLAS_POR_PAGINA = 24

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return "Não foi possível carregar as escolas. Tente atualizar novamente."
}

export default function MapaGeograficoSetorizacao() {
  const supabase = useMemo(() => createClient(), [])
  const request = useRef<AbortController | null>(null)
  const mapaSection = useRef<HTMLElement | null>(null)
  const [escolas, setEscolas] = useState<EscolaMapa[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState("")
  const [filtroTecnico, setFiltroTecnico] = useState("")
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("mapa")
  const [pagina, setPagina] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fitBoundsKey, setFitBoundsKey] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const carregarDados = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      request.current?.abort()
      const controller = new AbortController()
      request.current = controller
      if (modo === "inicial") setLoading(true)
      setRefreshing(modo === "manual")
      setFeedback(null)

      try {
        // Paginação explícita para não cortar escolas no limite padrão da API.
        const resultado: EscolaMapa[] = []
        let inicio = 0
        while (!controller.signal.aborted) {
          const { data, error } = await supabase
            .from("escolas")
            .select(
              "id, nome_escola, cie, latitude, longitude, tecnico_atribuido"
            )
            .order("nome_escola", { ascending: true })
            .order("id", { ascending: true })
            .range(inicio, inicio + TAMANHO_LOTE - 1)
            .abortSignal(controller.signal)
          if (controller.signal.aborted) return
          if (error) throw error
          const lote = (data || []) as EscolaMapa[]
          resultado.push(...lote)
          if (lote.length < TAMANHO_LOTE) break
          inicio += lote.length
        }
        if (controller.signal.aborted) return
        setEscolas(resultado)
        if (modo === "manual") {
          setFeedback({
            tipo: "success",
            texto: "Escolas e atribuições atualizadas."
          })
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("[Mapa de Setorização] Erro ao carregar:", error)
        setFeedback({ tipo: "error", texto: getErrorMessage(error) })
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [supabase]
  )

  useEffect(() => {
    void carregarDados("inicial")
    return () => request.current?.abort()
  }, [carregarDados])

  useEffect(() => {
    if (feedback?.tipo !== "success") return
    const timer = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const tecnicos = useMemo(() => getTecnicos(escolas), [escolas])
  const tecnicosAtribuidos = useMemo(
    () => tecnicos.filter((tecnico) => tecnico.id !== SEM_TECNICO),
    [tecnicos]
  )
  const stats = useMemo(() => {
    let mapeadas = 0
    let semTecnico = 0
    for (const escola of escolas) {
      if (getCoordenadas(escola)) mapeadas += 1
      if (getTecnicoId(escola.tecnico_atribuido) === SEM_TECNICO)
        semTecnico += 1
    }
    return {
      total: escolas.length,
      mapeadas,
      semCoordenadas: escolas.length - mapeadas,
      semTecnico,
      percentual: escolas.length
        ? Math.round((mapeadas / escolas.length) * 100)
        : 0
    }
  }, [escolas])
  const escolasFiltradas = useMemo(
    () => filtrarEscolas(escolas, busca, filtroTecnico),
    [escolas, busca, filtroTecnico]
  )
  const escolasNoMapa = useMemo(
    () => escolasFiltradas.filter((escola) => Boolean(getCoordenadas(escola))),
    [escolasFiltradas]
  )
  const selected =
    escolasNoMapa.find((escola) => escola.id === selectedId) || null
  const filtrosAtivos = Boolean(busca.trim() || filtroTecnico)
  const totalPaginas = Math.max(
    1,
    Math.ceil(escolasFiltradas.length / ESCOLAS_POR_PAGINA)
  )
  const paginaAtual = Math.min(pagina, totalPaginas)
  const escolasNaPagina = escolasFiltradas.slice(
    (paginaAtual - 1) * ESCOLAS_POR_PAGINA,
    paginaAtual * ESCOLAS_POR_PAGINA
  )
  const semCoordenadasFiltradas = escolasFiltradas.length - escolasNoMapa.length

  useEffect(() => {
    setPagina(1)
    setSelectedId(null)
  }, [busca, filtroTecnico])

  useEffect(() => {
    if (
      filtroTecnico &&
      !tecnicos.some((tecnico) => tecnico.id === filtroTecnico)
    ) {
      setFiltroTecnico("")
    }
  }, [tecnicos, filtroTecnico])

  function limparFiltros() {
    setBusca("")
    setFiltroTecnico("")
    setSelectedId(null)
  }

  function localizarEscola(escola: EscolaMapa) {
    setSelectedId(escola.id)
    setVisualizacao("mapa")
    requestAnimationFrame(() =>
      mapaSection.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    )
  }

  if (loading) return <LoadingPage />

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1700px] space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#020617] p-5 shadow-xl sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.15),transparent_65%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                <Icon name="pin" className="h-3 w-3" /> Fields
              </span>
              <span className="text-xs text-slate-500">
                Georreferenciamento · Setorização
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Mapa de{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Setorização
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Encontre as escolas, acompanhe os responsáveis e planeje o
              atendimento da região.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <Icon name="users" />
            </span>
            <div>
              <p className="text-lg font-black leading-tight text-white">
                {tecnicosAtribuidos.length}
              </p>
              <p className="text-xs text-slate-400">
                técnicos vinculados às escolas
              </p>
            </div>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat
            label="Unidades escolares"
            value={stats.total}
            icon="school"
            tone="slate"
          />
          <MiniStat
            label="No mapa"
            value={stats.mapeadas}
            detail={`${stats.percentual}% do total`}
            icon="pin"
            tone="cyan"
          />
          <MiniStat
            label="Sem coordenadas"
            value={stats.semCoordenadas}
            icon="location-off"
            tone="orange"
          />
          <MiniStat
            label="Sem técnico"
            value={stats.semTecnico}
            icon="users"
            tone="rose"
          />
        </div>
      </section>

      {feedback && (
        <div
          role={feedback.tipo === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${feedback.tipo === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}
        >
          <p className="min-w-0 flex-1 break-words">{feedback.texto}</p>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setFeedback(null)}
            className="-my-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-white/5"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      <section
        aria-label="Filtros das escolas"
        className="rounded-3xl border border-slate-800 bg-[#020617] p-4 sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,280px)_auto] md:items-end">
          <div className="min-w-0">
            <label
              htmlFor="mapa-fields-busca"
              className="mb-2 block text-xs font-semibold text-slate-400"
            >
              Buscar escola, CIE ou técnico
            </label>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"
              />
              <input
                id="mapa-fields-busca"
                type="search"
                placeholder="Nome da escola, CIE ou responsável…"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-11 pr-3 text-base text-white outline-none placeholder:text-sm placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="mapa-fields-tecnico"
              className="mb-2 block text-xs font-semibold text-slate-400"
            >
              Técnico responsável
            </label>
            <select
              id="mapa-fields-tecnico"
              value={filtroTecnico}
              onChange={(event) => setFiltroTecnico(event.target.value)}
              className="h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 px-3 text-base text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            >
              <option value="">Todos os técnicos</option>
              <option value={SEM_TECNICO}>Sem técnico</option>
              {tecnicosAtribuidos.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nome} ({tecnico.quantidade})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void carregarDados("manual")}
            disabled={refreshing}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-wait disabled:opacity-60"
          >
            <Icon
              name="refresh"
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <p role="status" className="text-xs text-slate-400">
            <strong className="font-bold text-cyan-300">
              {escolasNoMapa.length}
            </strong>{" "}
            no mapa
            <span className="mx-2 text-slate-700">/</span>
            {escolasFiltradas.length} escolas encontradas
          </p>
          {filtrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10"
            >
              <Icon name="close" className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      </section>

      <section
        ref={mapaSection}
        aria-label="Visualização das escolas"
        className="scroll-mt-4 overflow-hidden rounded-3xl border border-slate-800 bg-[#020617] shadow-xl"
      >
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div
            className="flex rounded-xl border border-slate-800 bg-slate-900/60 p-1"
            role="group"
            aria-label="Modo de visualização"
          >
            <ViewButton
              active={visualizacao === "mapa"}
              onClick={() => setVisualizacao("mapa")}
              icon="map"
            >
              Mapa
            </ViewButton>
            <ViewButton
              active={visualizacao === "lista"}
              onClick={() => setVisualizacao("lista")}
              icon="list"
            >
              Lista de escolas
            </ViewButton>
          </div>
          {visualizacao === "mapa" && (
            <button
              type="button"
              disabled={escolasNoMapa.length === 0}
              onClick={() => {
                setSelectedId(null)
                setFitBoundsKey((key) => key + 1)
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <Icon name="focus" className="h-4 w-4" /> Enquadrar escolas
            </button>
          )}
        </div>

        {visualizacao === "mapa" ? (
          <>
            <div className="mapa-fields-map relative h-[58svh] min-h-[360px] sm:h-[62vh] sm:min-h-[440px] lg:h-[580px]">
              <MapSetorizacao
                escolas={escolasNoMapa}
                selected={selected}
                onSelect={(escola) => setSelectedId(escola.id)}
                fitBoundsKey={fitBoundsKey}
                filtroTecnico={filtroTecnico}
                onFilterTecnico={setFiltroTecnico}
              />
              {escolasNoMapa.length === 0 && (
                <div className="absolute inset-0 z-[900] flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
                  <Icon name="map" className="mb-4 h-10 w-10 text-slate-600" />
                  <h2 className="text-base font-bold text-white">
                    Nenhuma escola no mapa
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                    {semCoordenadasFiltradas > 0
                      ? "As escolas encontradas precisam de coordenadas válidas. Você pode consultá-las na lista."
                      : "Ajuste os filtros ou atualize os dados para tentar novamente."}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {filtrosAtivos && (
                      <button
                        type="button"
                        onClick={limparFiltros}
                        className="min-h-11 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white"
                      >
                        Limpar filtros
                      </button>
                    )}
                    {semCoordenadasFiltradas > 0 && (
                      <button
                        type="button"
                        onClick={() => setVisualizacao("lista")}
                        className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-200"
                      >
                        Ver lista de escolas
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>Clique em uma escola para ver o responsável e abrir a rota.</p>
              {semCoordenadasFiltradas > 0 && (
                <button
                  type="button"
                  onClick={() => setVisualizacao("lista")}
                  className="min-h-11 text-left font-semibold text-amber-300"
                >
                  {semCoordenadasFiltradas} sem coordenadas · Consultar na lista
                  ↗
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 sm:p-5">
            {escolasFiltradas.length === 0 ? (
              <div className="py-14 text-center">
                <h2 className="font-bold text-white">
                  Nenhuma escola encontrada
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Tente outro nome, CIE ou técnico.
                </p>
                {filtrosAtivos && (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="mt-4 min-h-11 rounded-xl bg-cyan-500/10 px-4 text-sm font-bold text-cyan-300"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {escolasNaPagina.map((escola) => {
                    const tecnico = getTecnicoVisual(escola.tecnico_atribuido)
                    const coordenadas = getCoordenadas(escola)
                    return (
                      <article
                        key={escola.id}
                        className="flex min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                      >
                        <p className="mb-2 text-[11px] font-bold text-cyan-300">
                          CIE {textoSeguro(escola.cie, "S/N")}
                        </p>
                        <h3 className="break-words text-sm font-bold leading-relaxed text-white">
                          {textoSeguro(escola.nome_escola, "Unidade escolar")}
                        </h3>
                        <div className="mt-4 flex items-center gap-2.5">
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 text-[10px] font-black text-white"
                            style={{ backgroundColor: tecnico.cor }}
                          >
                            {tecnico.iniciais}
                          </span>
                          <p className="min-w-0 break-words text-xs leading-relaxed text-slate-300">
                            {tecnico.nome}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                          <span
                            className={`text-[11px] font-semibold ${coordenadas ? "text-emerald-300" : "text-amber-300"}`}
                          >
                            {coordenadas
                              ? "Localização cadastrada"
                              : "Sem coordenadas"}
                          </span>
                          {coordenadas && (
                            <button
                              type="button"
                              onClick={() => localizarEscola(escola)}
                              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10"
                            >
                              Ver no mapa{" "}
                              <Icon name="pin" className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
                {totalPaginas > 1 && (
                  <nav
                    aria-label="Paginação das escolas"
                    className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4"
                  >
                    <p className="text-xs text-slate-400">
                      Página {paginaAtual} de {totalPaginas} ·{" "}
                      {escolasFiltradas.length} escolas
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={paginaAtual === 1}
                        onClick={() => setPagina(paginaAtual - 1)}
                        className="min-h-11 rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={paginaAtual === totalPaginas}
                        onClick={() => setPagina(paginaAtual + 1)}
                        className="min-h-11 rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                      >
                        Próxima
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean
  onClick: () => void
  icon: IconName
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition sm:flex-none sm:px-4 ${active ? "bg-cyan-500/15 text-cyan-300 shadow-sm" : "text-slate-400 hover:text-white"}`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {children}
    </button>
  )
}

function MiniStat({
  label,
  value,
  detail,
  icon,
  tone
}: {
  label: string
  value: number
  detail?: string
  icon: IconName
  tone: "slate" | "cyan" | "orange" | "rose"
}) {
  const tones = {
    slate: "border-slate-800 bg-slate-900/50 text-slate-400",
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    orange: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-300"
  }
  return (
    <div className={`min-w-0 rounded-2xl border p-3.5 sm:p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold leading-relaxed">{label}</p>
        <Icon name={icon} className="h-4 w-4 shrink-0 opacity-70" />
      </div>
      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">{value}</p>
      {detail && (
        <p className="mt-1 text-[10px] font-semibold opacity-80">{detail}</p>
      )}
    </div>
  )
}

type IconName =
  | "map"
  | "list"
  | "pin"
  | "search"
  | "refresh"
  | "close"
  | "focus"
  | "users"
  | "school"
  | "location-off"
function Icon({
  name,
  className = "h-5 w-5"
}: {
  name: IconName
  className?: string
}) {
  const paths: Record<IconName, ReactNode> = {
    map: (
      <>
        <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7a8.2 8.2 0 0 0-14-2L3 8m0-5v5h5M4 17a8.2 8.2 0 0 0 14 2l3-3m0 5v-5h-5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    focus: (
      <>
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2M17 4a3 3 0 0 1 0 6m1 5a5 5 0 0 1 3 4v2" />
      </>
    ),
    school: (
      <>
        <path d="M4 21V7l8-4 8 4v14H4Zm6 0v-5h4v5M8 9h1m6 0h1M8 12h1m6 0h1" />
      </>
    ),
    "location-off": (
      <>
        <path d="m3 3 18 18M20 10c0 1.5-.5 3-1.4 4.4M9 2.6A8 8 0 0 1 20 10M4.5 7.5C2 15 12 21 12 21s2.5-1.6 4.6-4.1" />
      </>
    )
  }
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function LoadingPage() {
  return (
    <div
      role="status"
      aria-label="Carregando mapa de setorização"
      className="mx-auto w-full max-w-[1700px] space-y-5 pb-8"
    >
      <div className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/40" />
      <div className="h-40 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/40" />
      <div className="h-[58svh] min-h-[360px] animate-pulse rounded-3xl border border-slate-800 bg-slate-900/40" />
    </div>
  )
}
