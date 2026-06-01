"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import {
  Calendar,
  dateFnsLocalizer,
  type NavigateAction,
  type ToolbarProps,
  type View,
} from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"

import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = { "pt-BR": ptBR }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales,
})

type FieldVisita = {
  id?: string | number | null
  chamado?: string | null
  escola?: string | null
  data_abertura?: string | null
  data_prevista?: string | null
  data_visita?: string | null
  data_finalizacao?: string | null
  impacto?: string | null
  urgencia?: string | null
  status?: string | null
  categoria?: string | null
  subcategoria?: string | null
  tecnico?: string | null
  abertura_por?: string | null
  created_at?: string | null
}

type AgendaEvent = FieldVisita & {
  title: string
  start: Date
  end: Date
  allDay: boolean
}

type Feedback = {
  tipo: "success" | "error" | "info"
  texto: string
} | null

const STATUS_OPTIONS = [
  "Todos",
  "Pendente",
  "Agendado",
  "Realizada",
  "Finalizado",
  "Cancelado",
]

const CALENDAR_VIEWS: Array<{ label: string; view: View }> = [
  { label: "Mês", view: "month" },
  { label: "Semana", view: "week" },
  { label: "Dia", view: "day" },
  { label: "Agenda", view: "agenda" },
]

const NAVIGATION_ACTIONS: Array<{ label: string; action: NavigateAction }> = [
  { label: "Hoje", action: "TODAY" },
  { label: "Anterior", action: "PREV" },
  { label: "Próximo", action: "NEXT" },
]

function textoSeguro(value: unknown, fallback = "---") {
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

function parseDateLocal(dateStr: string | null | undefined) {
  if (!dateStr) return null

  const onlyDate = String(dateStr).slice(0, 10)
  const [y, m, d] = onlyDate.split("-")

  const year = Number(y)
  const month = Number(m)
  const day = Number(d)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  return new Date(year, month - 1, day)
}

function formatarDataBR(dateStr: string | null | undefined) {
  const date = parseDateLocal(dateStr)

  if (!date) return "---"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function calcBusinessDays(
  startStr: string | null | undefined,
  endStr: string | null | undefined
): number {
  if (!startStr || !endStr) return 0

  const start = parseDateLocal(startStr)
  const end = parseDateLocal(endStr)

  if (!start || !end || start > end) return 0

  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}

function getStatusTone(statusValue: unknown) {
  const status = normalizar(statusValue)

  if (status.includes("pendente") || status.includes("agendado")) {
    return {
      label: textoSeguro(statusValue, "Pendente"),
      dot: "bg-yellow-400",
      badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
      eventBg: "#facc15",
      eventBorder: "#854d0e",
      eventText: "#020617",
      modalBadge: "border-yellow-500/40 bg-yellow-400 text-black",
      card: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    }
  }

  if (status.includes("cancelado")) {
    return {
      label: textoSeguro(statusValue, "Cancelado"),
      dot: "bg-red-500",
      badge: "border-red-500/30 bg-red-500/10 text-red-300",
      eventBg: "#ef4444",
      eventBorder: "#7f1d1d",
      eventText: "#ffffff",
      modalBadge: "border-red-600 bg-red-500 text-white",
      card: "border-red-500/25 bg-red-500/10 text-red-300",
    }
  }

  return {
    label: textoSeguro(statusValue, "Concluído"),
    dot: "bg-emerald-500",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    eventBg: "#22c55e",
    eventBorder: "#166534",
    eventText: "#03130a",
    modalBadge: "border-emerald-600 bg-emerald-500 text-black",
    card: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }
}

function getEventDate(visita: FieldVisita) {
  const status = normalizar(visita.status)

  if (status.includes("pendente") || status.includes("agendado")) {
    return visita.data_prevista
  }

  return visita.data_visita
}

function matchStatusFilter(statusValue: unknown, filtro: string) {
  if (filtro === "Todos") return true

  const status = normalizar(statusValue)
  const filtroNormalizado = normalizar(filtro)

  if (filtroNormalizado === "finalizado") {
    return (
      status.includes("finalizado") ||
      status.includes("finalizada") ||
      status.includes("concluido") ||
      status.includes("concluído")
    )
  }

  if (filtroNormalizado === "realizada") {
    return status.includes("realizada") || status.includes("realizado")
  }

  return status.includes(filtroNormalizado)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível carregar a agenda operacional."
}

export default function AgendaFields() {
  const supabase = useMemo(() => createClient(), [])

  const [visitas, setVisitas] = useState<FieldVisita[]>([])
  const [tecnicoFiltro, setTecnicoFiltro] = useState("Todos")
  const [statusFiltro, setStatusFiltro] = useState("Todos")
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date())
  const [calendarView, setCalendarView] = useState<View>("month")

  const carregar = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setFeedback(null)

      try {
        const { data, error } = await supabase
          .from("fields_visitas")
          .select(`
            id,
            chamado,
            escola,
            data_abertura,
            data_prevista,
            data_visita,
            data_finalizacao,
            impacto,
            urgencia,
            status,
            categoria,
            subcategoria,
            tecnico,
            abertura_por,
            created_at
          `)
          .order("data_prevista", { ascending: true, nullsFirst: false })

        if (error) throw error

        setVisitas((data || []) as FieldVisita[])

        if (modo === "manual") {
          setFeedback({
            tipo: "success",
            texto: "Agenda atualizada com sucesso.",
          })
        }
      } catch (error) {
        console.error("[Agenda Fields] Erro ao carregar agenda:", error)

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
    carregar("inicial")
  }, [carregar])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (!selectedEvent) return

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedEvent(null)
    }

    window.addEventListener("keydown", handleEsc)

    return () => window.removeEventListener("keydown", handleEsc)
  }, [selectedEvent])

  const tecnicos = useMemo(() => {
    const nomes = new Set<string>()

    visitas.forEach((visita) => {
      const tecnico = textoSeguro(visita.tecnico, "")
      if (tecnico) nomes.add(tecnico)
    })

    return ["Todos", ...Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"))]
  }, [visitas])

  const eventos = useMemo<AgendaEvent[]>(() => {
    return visitas
      .filter((visita) => {
        const matchTec =
          tecnicoFiltro === "Todos" || textoSeguro(visita.tecnico, "") === tecnicoFiltro

        const matchStatus = matchStatusFilter(visita.status, statusFiltro)

        return matchTec && matchStatus
      })
      .map((visita) => {
        const dataStr = getEventDate(visita)
        const data = parseDateLocal(dataStr)

        if (!data) return null

        return {
          ...visita,
          title: textoSeguro(visita.escola, "Unidade escolar"),
          start: data,
          end: data,
          allDay: true,
        }
      })
      .filter((event): event is AgendaEvent => Boolean(event))
  }, [visitas, tecnicoFiltro, statusFiltro])

  const indicadores = useMemo(() => {
    const pendentes = visitas.filter((visita) => {
      const status = normalizar(visita.status)
      return status.includes("pendente") || status.includes("agendado")
    }).length

    const cancelados = visitas.filter((visita) =>
      normalizar(visita.status).includes("cancelado")
    ).length

    const concluidos = visitas.filter((visita) => {
      const status = normalizar(visita.status)
      return (
        status.includes("realizada") ||
        status.includes("finalizado") ||
        status.includes("finalizada") ||
        status.includes("concluido") ||
        status.includes("concluído")
      )
    }).length

    const semData = visitas.filter((visita) => !getEventDate(visita)).length

    return {
      total: visitas.length,
      exibidos: eventos.length,
      pendentes,
      concluidos,
      cancelados,
      semData,
    }
  }, [eventos.length, visitas])

  if (loading) return <LoadingPage />

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/20 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_34%)]" />
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_600px] xl:items-end">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge color="blue">Agenda Field</Badge>
              <Badge color="cyan">Operacional</Badge>
              <Badge color="emerald">Atendimentos</Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Agenda{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                Operacional
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Acompanhe as visitas técnicas dos Fields por mês, semana, dia ou lista,
              com filtros por técnico e status do atendimento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Total" value={indicadores.total} tone="slate" />
            <MiniStat label="Exibidos" value={indicadores.exibidos} tone="blue" />
            <MiniStat label="Pendentes" value={indicadores.pendentes} tone="yellow" />
            <MiniStat label="Concluídos" value={indicadores.concluidos} tone="emerald" />
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
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <LegendItem color="bg-yellow-400" label="Pendente / Agendado" />
            <LegendItem color="bg-emerald-500" label="Concluído" />
            <LegendItem color="bg-red-500" label="Cancelado" />

            {indicadores.semData > 0 && (
              <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
                {indicadores.semData} sem data
              </span>
            )}
          </div>

          <select
            value={tecnicoFiltro}
            onChange={(event) => setTecnicoFiltro(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
          >
            {tecnicos.map((tecnico) => (
              <option key={tecnico} value={tecnico}>
                {tecnico === "Todos" ? "Todos os Técnicos" : tecnico}
              </option>
            ))}
          </select>

          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "Todos" ? "Todos os Status" : status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => carregar("manual")}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            Atualizar
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-[#020617] p-4 shadow-2xl shadow-slate-950/20 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {eventos.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-slate-800 bg-[#020617] text-3xl">
              📅
            </div>

            <h2 className="text-2xl font-black text-white">Nenhuma visita encontrada</h2>

            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
              Ajuste os filtros ou verifique se os registros possuem data prevista ou data de visita cadastrada.
            </p>
          </div>
        ) : (
          <div className="agenda-calendar-container h-[760px] min-h-[620px] md:h-[850px]">
            <Calendar
              localizer={localizer}
              events={eventos}
              culture="pt-BR"
              date={calendarDate}
              view={calendarView}
              onNavigate={(date) => setCalendarDate(date)}
              onView={(view) => setCalendarView(view)}
              views={CALENDAR_VIEWS.map((item) => item.view)}
              onSelectEvent={(event) => setSelectedEvent(event as AgendaEvent)}
              popup={false}
              showAllEvents
              formats={{
                timeGutterFormat: () => "",
                eventTimeRangeFormat: () => "",
              }}
              messages={{
                next: "Próximo",
                previous: "Anterior",
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Agenda",
                date: "Data",
                time: "Horário",
                event: "Atendimento",
                noEventsInRange: "Nenhum atendimento neste período.",
              }}
              eventPropGetter={(event: AgendaEvent) => {
                const tone = getStatusTone(event.status)

                return {
                  className: "custom-event transition-all hover:scale-[1.02]",
                  style: {
                    backgroundColor: tone.eventBg,
                    color: tone.eventText,
                    border: `1px solid ${tone.eventBorder}`,
                    borderRadius: "10px",
                    padding: "6px 8px",
                    fontSize: "11px",
                    fontWeight: "800",
                    marginBottom: "4px",
                    boxShadow: "0 8px 18px rgba(2,6,23,0.20)",
                  },
                }
              }}
              components={{
                toolbar: CalendarToolbar,
                event: ({ event }: { event: AgendaEvent }) => (
                  <div className="flex min-w-0 flex-col gap-1 overflow-hidden leading-tight">
                    <span className="truncate">
                      🏫 {textoSeguro(event.escola, "Unidade escolar")}
                    </span>

                    <span className="flex items-center gap-1 truncate text-[10px] opacity-80">
                      <span>👨‍🔧</span>
                      <span className="truncate">{textoSeguro(event.tecnico)}</span>
                    </span>
                  </div>
                ),
              }}
              style={{ height: "100%" }}
            />
          </div>
        )}
      </section>

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      <style jsx global>{`
        .agenda-calendar-container .rbc-calendar {
          font-family: inherit !important;
          color: #e2e8f0 !important;
        }

        .agenda-custom-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .agenda-custom-toolbar__group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .agenda-custom-toolbar__title {
          flex: 1;
          min-width: 220px;
          text-align: center;
          font-size: 22px;
          font-weight: 950;
          color: #ffffff;
          text-transform: capitalize;
        }

        .agenda-custom-toolbar__button {
          border-radius: 12px;
          border: 1px solid #1e293b;
          background: #0f172a;
          padding: 9px 16px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: all 0.2s ease;
        }

        .agenda-custom-toolbar__button:hover {
          border-color: #3b82f6;
          background: #111c33;
          color: #ffffff;
        }

        .agenda-custom-toolbar__button--active {
          border-color: #3b82f6;
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.25);
        }

        .agenda-calendar-container .rbc-month-view,
        .agenda-calendar-container .rbc-time-view,
        .agenda-calendar-container .rbc-agenda-view {
          border: 1px solid #1e293b !important;
          border-radius: 24px !important;
          overflow: hidden !important;
          background: #020617 !important;
        }

        .agenda-calendar-container .rbc-header {
          padding: 14px 10px !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          border-bottom: 1px solid #1e293b !important;
          border-left: 1px solid #1e293b !important;
          background: rgba(15, 23, 42, 0.62) !important;
          letter-spacing: 0.08em !important;
        }

        .agenda-calendar-container .rbc-day-bg {
          border-left: 1px solid #1e293b !important;
          border-bottom: 1px solid #1e293b !important;
          transition: background 0.2s ease !important;
        }

        .agenda-calendar-container .rbc-day-bg:hover {
          background: rgba(59, 130, 246, 0.035) !important;
        }

        .agenda-calendar-container .rbc-today {
          background: rgba(59, 130, 246, 0.075) !important;
        }

        .agenda-calendar-container .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.35) !important;
        }

        .agenda-calendar-container .rbc-off-range {
          color: #334155 !important;
        }

        .agenda-calendar-container .rbc-date-cell {
          padding: 10px !important;
          color: #94a3b8 !important;
          font-weight: 900 !important;
        }

        .agenda-calendar-container .rbc-now .rbc-button-link {
          display: inline-flex !important;
          min-width: 28px !important;
          height: 28px !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background: #2563eb !important;
          color: #ffffff !important;
        }

        .agenda-calendar-container .rbc-event {
          overflow: hidden !important;
        }

        .agenda-calendar-container .rbc-event:focus {
          outline: 2px solid rgba(59, 130, 246, 0.65) !important;
          outline-offset: 2px !important;
        }

        .agenda-calendar-container .rbc-month-row {
          min-height: 132px !important;
        }

        .agenda-calendar-container .rbc-row-content {
          position: relative !important;
          height: 100% !important;
          z-index: 2 !important;
        }

        .agenda-calendar-container .rbc-show-more {
          display: none !important;
        }

        .agenda-calendar-container .rbc-time-header {
          border-bottom: 1px solid #1e293b !important;
          background: #020617 !important;
        }

        .agenda-calendar-container .rbc-time-content {
          display: none !important;
        }

        .agenda-calendar-container .rbc-time-view .rbc-allday-cell {
          min-height: 540px !important;
          overflow-y: auto !important;
          background: #020617 !important;
        }

        .agenda-calendar-container .rbc-time-view .rbc-time-gutter {
          display: none !important;
        }

        .agenda-calendar-container .rbc-agenda-view table.rbc-agenda-table {
          border: none !important;
          color: #e2e8f0 !important;
        }

        .agenda-calendar-container .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          background: #0f172a !important;
          color: #64748b !important;
          border-bottom: 1px solid #1e293b !important;
          padding: 15px !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          letter-spacing: 0.08em !important;
        }

        .agenda-calendar-container .rbc-agenda-date-cell,
        .agenda-calendar-container .rbc-agenda-time-cell {
          background: #020617 !important;
          color: #94a3b8 !important;
          font-weight: 800 !important;
          border-bottom: 1px solid #1e293b !important;
          padding: 15px !important;
        }

        .agenda-calendar-container .rbc-agenda-event-cell {
          background: #020617 !important;
          color: #ffffff !important;
          border-bottom: 1px solid #1e293b !important;
          padding: 15px !important;
        }

        .agenda-calendar-container .rbc-agenda-empty {
          color: #475569 !important;
          padding: 40px !important;
          text-align: center !important;
          font-weight: 800 !important;
        }

        @media (max-width: 768px) {
          .agenda-calendar-container {
            height: 690px !important;
            min-height: 690px !important;
          }

          .agenda-custom-toolbar {
            align-items: stretch;
          }

          .agenda-custom-toolbar__title {
            order: -1;
            width: 100%;
            min-width: 100%;
            text-align: left;
            font-size: 18px;
          }

          .agenda-custom-toolbar__group {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .agenda-custom-toolbar__group--views {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .agenda-custom-toolbar__button {
            padding: 9px 8px;
            font-size: 9px;
          }

          .agenda-calendar-container .rbc-header {
            padding: 10px 4px !important;
            font-size: 9px !important;
          }

          .agenda-calendar-container .rbc-date-cell {
            padding: 6px !important;
            font-size: 11px !important;
          }

          .agenda-calendar-container .rbc-month-row {
            min-height: 110px !important;
          }

          .agenda-calendar-container .custom-event {
            padding: 4px 6px !important;
            font-size: 9px !important;
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

function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
}: ToolbarProps<AgendaEvent, object>) {
  return (
    <div className="agenda-custom-toolbar">
      <div className="agenda-custom-toolbar__group">
        {NAVIGATION_ACTIONS.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => onNavigate(item.action)}
            className="agenda-custom-toolbar__button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="agenda-custom-toolbar__title">{label}</div>

      <div className="agenda-custom-toolbar__group agenda-custom-toolbar__group--views">
        {CALENDAR_VIEWS.map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => onView(item.view)}
            className={`agenda-custom-toolbar__button ${
              view === item.view ? "agenda-custom-toolbar__button--active" : ""
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EventModal({
  event,
  onClose,
}: {
  event: AgendaEvent
  onClose: () => void
}) {
  const tone = getStatusTone(event.status)
  const atendimentoData = getEventDate(event)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/88 p-3 backdrop-blur-md md:p-6">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] shadow-2xl shadow-black/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.10),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-4 border-b border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="min-w-0 pr-12 md:pr-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tone.modalBadge}`}
              >
                {textoSeguro(event.status, "Status não informado")}
              </span>

              <span className="inline-flex rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                {formatarDataBR(atendimentoData)}
              </span>

              {event.chamado && (
                <span className="inline-flex rounded-full border border-slate-700 bg-[#020617] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {event.chamado}
                </span>
              )}
            </div>

            <h3 className="break-words text-xl font-black leading-tight text-white md:text-2xl">
              {textoSeguro(event.escola, "Unidade escolar")}
            </h3>

            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Detalhes do atendimento Field
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-lg font-black text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 md:static"
            aria-label="Fechar detalhes"
          >
            ✕
          </button>
        </div>

        <div className="relative z-10 max-h-[62vh] overflow-y-auto p-4 md:max-h-[56vh] md:p-5 custom-modal-scroll">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CompactDetail emoji="👨‍🔧" label="Técnico" value={event.tecnico} />
              <CompactDetail emoji="👤" label="Aberto por" value={event.abertura_por} />
              <CompactDetail emoji="📅" label="Data prevista" value={formatarDataBR(event.data_prevista)} />
              <CompactDetail emoji="✅" label="Data da visita" value={formatarDataBR(event.data_visita)} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CompactDetail emoji="📂" label="Categoria" value={event.categoria} />
              <CompactDetail emoji="🧩" label="Subcategoria" value={event.subcategoria} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Status"
              value={textoSeguro(event.status, "Não informado")}
              className={tone.card}
            />

            <SummaryCard
              label="Dias úteis"
              value={calcBusinessDays(event.data_visita, event.data_finalizacao)}
              className="border-blue-500/25 bg-blue-500/10 text-blue-300"
            />

            <SummaryCard
              label="Referência"
              value={textoSeguro(event.chamado, "---")}
              className="border-slate-700 bg-slate-950/80 text-slate-300"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Observação de privacidade
            </p>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Os campos de descrição e resolução não são exibidos nesta visão para preservar
              informações sensíveis dos atendimentos.
            </p>
          </div>
        </div>

        <style jsx global>{`
          .custom-modal-scroll {
            scrollbar-width: thin;
            scrollbar-color: #475569 rgba(15, 23, 42, 0.45);
          }

          .custom-modal-scroll::-webkit-scrollbar {
            width: 8px;
          }

          .custom-modal-scroll::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.45);
            border-radius: 999px;
          }

          .custom-modal-scroll::-webkit-scrollbar-thumb {
            background-color: #334155;
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
        `}</style>
      </div>
    </div>
  )
}

function CompactDetail({
  emoji,
  label,
  value,
}: {
  emoji: string
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 text-xl">
        {emoji}
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
          {label}
        </p>

        <p className="line-clamp-2 break-words text-sm font-bold text-slate-100">
          {value || "---"}
        </p>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className: string
}) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>

      <p className="mt-2 line-clamp-2 break-words text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Badge({
  children,
  color,
}: {
  children: ReactNode
  color: "blue" | "cyan" | "emerald"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "slate" | "blue" | "yellow" | "emerald"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  const bars = {
    slate: "bg-slate-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-400",
    emerald: "bg-emerald-500",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {value}
      </p>

      <div className={`mt-3 h-1 rounded-full ${bars[tone]}`} />
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#020617] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function LoadingPage() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-[#020617] p-6 text-center shadow-2xl shadow-slate-950/30">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>

        <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
          Carregando agenda
        </p>

        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          Preparando os atendimentos dos Fields...
        </p>
      </div>
    </div>
  )
}