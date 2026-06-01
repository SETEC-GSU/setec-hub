"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"

const MapSetorizacao = dynamic(
  () => import("@/components/ui/MapSetorizacao"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Carregando mapa
          </p>
        </div>
      </div>
    ),
  }
)

type EscolaMapa = {
  id: string
  nome_escola: string | null
  cie: string | number | null
  latitude: string | number | null
  longitude: string | number | null
  tecnico_atribuido: string | null
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

function temCoordenada(escola: EscolaMapa) {
  const latitude = Number(escola.latitude)
  const longitude = Number(escola.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false
  if (latitude === 0 && longitude === 0) return false

  return true
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível carregar o mapa de setorização."
}

export default function MapaGeograficoSetorizacao() {
  const supabase = useMemo(() => createClient(), [])

  const [escolas, setEscolas] = useState<EscolaMapa[]>([])
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
          .select("id, nome_escola, cie, latitude, longitude, tecnico_atribuido")
          .order("nome_escola", { ascending: true })

        if (error) throw error

        setEscolas((data || []) as EscolaMapa[])

        if (modo === "manual") {
          setFeedback({
            tipo: "success",
            texto: "Mapa atualizado com sucesso.",
          })
        }
      } catch (error) {
        console.error("[Mapa de Setorização] Erro ao carregar:", error)

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
    const total = escolas.length
    const comCoordenada = escolas.filter(temCoordenada).length
    const semCoordenada = total - comCoordenada
    const semTecnico = escolas.filter(
      (escola) => !textoSeguro(escola.tecnico_atribuido)
    ).length
    const comTecnico = total - semTecnico

    const percentualMapeado =
      total > 0 ? Math.round((comCoordenada / total) * 100) : 0

    return {
      total,
      comCoordenada,
      semCoordenada,
      semTecnico,
      comTecnico,
      percentualMapeado,
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

      return matchBusca && matchTecnico && temCoordenada(escola)
    })
  }, [busca, escolas, filtroTecnico])

  const filtrosAtivos = Boolean(busca.trim()) || filtroTecnico !== "Todos"

  function limparFiltros() {
    setBusca("")
    setFiltroTecnico("Todos")
  }

  if (loading) return <LoadingPage />

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-cyan-500/20 bg-[#020617] p-5 shadow-2xl shadow-cyan-950/10 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.16),transparent_34%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge color="cyan">Mapa Field</Badge>
              <Badge color="blue">Georreferenciamento</Badge>
              <Badge color="emerald">Setorização</Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Mapa de{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
                Setorização
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Visualização geográfica da malha de atendimento dos Fields, com
              filtros por unidade escolar, CIE e técnico atribuído.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[620px]">
            <MiniStat label="Total UEs" value={stats.total} tone="slate" />

            <MiniStat
              label="Mapeadas"
              value={stats.comCoordenada}
              detail={`${stats.percentualMapeado}%`}
              tone="cyan"
            />

            <MiniStat
              label="Sem coordenada"
              value={stats.semCoordenada}
              tone="orange"
            />

            <MiniStat
              label="Sem técnico"
              value={stats.semTecnico}
              tone="red"
            />
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

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl shadow-slate-950/20 md:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px_auto_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-slate-500">
              🔍
            </span>

            <input
              type="text"
              placeholder="Buscar por escola, CIE ou técnico..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 pl-14 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <select
            value={filtroTecnico}
            onChange={(event) => setFiltroTecnico(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="Todos">Todos os técnicos</option>
            <option value="Sem Técnico">Sem técnico</option>

            {listaTecnicosSelect.map((tecnico) => (
              <option key={tecnico} value={tecnico}>
                {tecnico}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-300">
            {escolasFiltradas.length} exibidas
          </div>

          <button
            type="button"
            onClick={() => carregarDados("manual")}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            Atualizar
          </button>
        </div>

        {(filtrosAtivos || stats.semCoordenada > 0) && (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {stats.semCoordenada > 0 && (
                <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
                  {stats.semCoordenada} escola(s) sem coordenada não aparecem no mapa
                </span>
              )}

              {filtrosAtivos && (
                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                  Filtro ativo
                </span>
              )}
            </div>

            {filtrosAtivos && (
              <button
                type="button"
                onClick={limparFiltros}
                className="self-start rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 md:self-auto"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[2.25rem] border border-slate-800 bg-[#020617] shadow-2xl shadow-slate-950/20">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="mapa-fields-map relative h-[62vh] min-h-[460px] overflow-hidden rounded-[2.25rem] md:h-[calc(100vh-360px)] md:min-h-[560px]">
          {escolasFiltradas.length === 0 ? (
            <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-[#020617]/85 p-6 text-center backdrop-blur-md">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-3xl">
                🗺️
              </div>

              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Nenhuma escola encontrada
              </p>

              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                Ajuste os filtros, limpe a busca ou verifique se as escolas
                possuem latitude e longitude cadastradas.
              </p>

              {filtrosAtivos && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="mt-5 rounded-2xl bg-cyan-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-cyan-700"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : null}

          <MapSetorizacao escolas={escolasFiltradas} />
        </div>
      </section>

      <style jsx global>{`
        .mapa-fields-map .leaflet-container {
          height: 100%;
          min-height: inherit;
          background: #020617;
          font-family: inherit;
        }

        .mapa-fields-map .leaflet-control-container {
          font-family: inherit;
        }

        .mapa-fields-map .leaflet-pane,
        .mapa-fields-map .leaflet-tile-pane,
        .mapa-fields-map .leaflet-overlay-pane,
        .mapa-fields-map .leaflet-shadow-pane,
        .mapa-fields-map .leaflet-marker-pane,
        .mapa-fields-map .leaflet-tooltip-pane,
        .mapa-fields-map .leaflet-popup-pane {
          outline: none !important;
        }

        .mapa-fields-map .leaflet-tile {
          border: none !important;
          outline: 1px solid transparent !important;
          box-shadow: none !important;
          background: transparent !important;
          image-rendering: auto !important;
          -webkit-backface-visibility: hidden !important;
          backface-visibility: hidden !important;
          transform: translateZ(0);
        }

        .mapa-fields-map .leaflet-marker-icon,
        .mapa-fields-map .leaflet-marker-shadow {
          outline: none !important;
          box-shadow: none !important;
        }

        .mapa-fields-map .leaflet-control {
          border-radius: 1rem !important;
          border: 1px solid rgba(51, 65, 85, 0.95) !important;
          background: rgba(2, 6, 23, 0.92) !important;
          color: #e2e8f0 !important;
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.35) !important;
          backdrop-filter: blur(12px);
        }

        .mapa-fields-map .leaflet-control a {
          background: rgba(15, 23, 42, 0.98) !important;
          color: #e2e8f0 !important;
          border-color: rgba(51, 65, 85, 0.95) !important;
        }

        .mapa-fields-map .leaflet-control a:hover {
          background: rgba(30, 41, 59, 0.98) !important;
          color: #67e8f9 !important;
        }

        .mapa-fields-map .leaflet-popup-content-wrapper,
        .mapa-fields-map .leaflet-popup-tip {
          background: #020617 !important;
          color: #f8fafc !important;
          border: 1px solid rgba(51, 65, 85, 0.95) !important;
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.45) !important;
        }

        .mapa-fields-map .leaflet-popup-content {
          margin: 14px 16px !important;
          font-family: inherit !important;
          color: #f8fafc !important;
        }

        .mapa-fields-map .leaflet-popup-content * {
          color: #f8fafc !important;
        }

        .mapa-fields-map .leaflet-popup-content strong,
        .mapa-fields-map .leaflet-popup-content b,
        .mapa-fields-map .leaflet-popup-content h1,
        .mapa-fields-map .leaflet-popup-content h2,
        .mapa-fields-map .leaflet-popup-content h3,
        .mapa-fields-map .leaflet-popup-content h4 {
          color: #ffffff !important;
          font-weight: 800 !important;
        }

        .mapa-fields-map .leaflet-popup-content small,
        .mapa-fields-map .leaflet-popup-content .muted,
        .mapa-fields-map .leaflet-popup-content .secondary {
          color: #94a3b8 !important;
        }

        .mapa-fields-map .leaflet-popup-close-button {
          color: #ffffff !important;
          font-size: 18px !important;
          font-weight: 700 !important;
        }

        .mapa-fields-map .leaflet-popup-close-button:hover {
          color: #67e8f9 !important;
          background: transparent !important;
        }

        .mapa-fields-map .leaflet-control-attribution {
          display: none !important;
        }

        .mapa-fields-map .legend,
        .mapa-fields-map .map-legend,
        .mapa-fields-map .leaflet-control-layers,
        .mapa-fields-map .leaflet-bottom.leaflet-right .leaflet-control,
        .mapa-fields-map .leaflet-bottom.leaflet-left .leaflet-control {
          max-width: min(360px, calc(100vw - 48px));
          max-height: 34vh;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .mapa-fields-map {
            height: 64vh !important;
            min-height: 480px !important;
          }

          .mapa-fields-map .leaflet-top.leaflet-left {
            top: 12px !important;
            left: 12px !important;
          }

          .mapa-fields-map .leaflet-top.leaflet-right {
            top: 12px !important;
            right: 12px !important;
          }

          .mapa-fields-map .leaflet-bottom.leaflet-right {
            right: 12px !important;
            bottom: 12px !important;
          }

          .mapa-fields-map .leaflet-bottom.leaflet-left {
            left: 12px !important;
            bottom: 12px !important;
          }

          .mapa-fields-map .legend,
          .mapa-fields-map .map-legend,
          .mapa-fields-map .leaflet-control-layers,
          .mapa-fields-map .leaflet-bottom.leaflet-right .leaflet-control,
          .mapa-fields-map .leaflet-bottom.leaflet-left .leaflet-control {
            max-width: calc(100vw - 40px) !important;
            max-height: 30vh !important;
            overflow-y: auto !important;
            font-size: 11px !important;
          }
        }

        select option {
          background-color: #0f172a;
          color: #f8fafc;
        }
      `}</style>
    </div>
  )
}

function MiniStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string | number
  detail?: string
  tone: "slate" | "cyan" | "orange" | "red"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
  }

  const bars = {
    slate: "bg-slate-500",
    cyan: "bg-cyan-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>

      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-black text-white md:text-3xl">{value}</p>

        {detail && (
          <span className="mb-1 text-xs font-black uppercase tracking-widest opacity-80">
            {detail}
          </span>
        )}
      </div>

      <div className={`mt-3 h-1 rounded-full ${bars[tone]}`} />
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

function LoadingPage() {
  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-8">
      <div className="h-64 animate-pulse rounded-[2.25rem] border border-slate-800 bg-slate-900/40" />
      <div className="h-24 animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      <div className="h-[62vh] min-h-[460px] animate-pulse rounded-[2.25rem] border border-slate-800 bg-slate-900/40" />
    </div>
  )
}