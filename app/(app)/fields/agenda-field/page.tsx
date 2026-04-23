"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"

import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = { "pt-BR": ptBR }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDateLocal(dateStr: string | null) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split("-")
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function calcBusinessDays(startStr: string | null, endStr: string | null): number {
  if (!startStr || !endStr) return 0
  let start = parseDateLocal(startStr)
  let end = parseDateLocal(endStr)
  if (!start || !end || start > end) return 0
  
  let count = 0
  let current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function AgendaFields() {
  const supabase = createClient()
  const [visitas, setVisitas] = useState<any[]>([])
  const [tecnicoFiltro, setTecnicoFiltro] = useState("Todos")
  const [statusFiltro, setStatusFiltro] = useState("Todos")
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("fields_visitas").select("*")
      setVisitas(data || [])
    }
    carregar()
  }, [])

  const eventos = useMemo(() => {
    return visitas
      .filter(v => {
        const matchTec = tecnicoFiltro === "Todos" || v.tecnico === tecnicoFiltro
        const statusItem = String(v.status || "").toLowerCase().trim()
        const filtroStatus = statusFiltro.toLowerCase().trim()
        const matchStatus = statusFiltro === "Todos" || statusItem === filtroStatus
        return matchTec && matchStatus
      })
      .map(v => {
        const status = (v.status || "").toLowerCase()
        const dataStr = (status.includes("pendente") || status.includes("agendado"))
          ? v.data_prevista 
          : v.data_visita

        if (!dataStr) return null

        return {
          ...v,
          title: v.escola,
          start: parseDateLocal(dataStr),
          end: parseDateLocal(dataStr),
          allDay: true 
        }
      })
      .filter(Boolean)
  }, [visitas, tecnicoFiltro, statusFiltro])

  const tecnicos = ["Todos", ...new Set(visitas.map(v => v.tecnico))].filter(Boolean)

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl text-white font-bold tracking-tight">
            <span className="text-blue-500">●</span> Agenda Operacional
          </h2>
          <p className="text-slate-400 mt-1">Visões detalhadas de chamados e alocação</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex gap-2 mr-4 bg-[#020617] border border-slate-800 px-4 py-2.5 rounded-xl">
             <span className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold uppercase"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> Pendente</span>
             <span className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold uppercase ml-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Concluído</span>
             <span className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold uppercase ml-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Cancelado</span>
          </div>

          <select
            value={tecnicoFiltro}
            onChange={(e) => setTecnicoFiltro(e.target.value)}
            className="bg-[#020617] border border-slate-800 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-bold min-w-[200px]"
          >
            {tecnicos.map(t => <option key={t} value={t}>{t === "Todos" ? "👨‍🔧 Todos os Técnicos" : t}</option>)}
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-[#020617] border border-slate-800 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-bold min-w-[160px]"
          >
            <option value="Todos">📊 Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Agendado">Agendado</option>
            <option value="Realizada">Realizada</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="bg-[#020617] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative">
        <div style={{ height: 850 }}> 
          <Calendar
            localizer={localizer}
            events={eventos}
            culture="pt-BR"
            defaultView="month"
            views={["month", "week", "day", "agenda"]} // 🚀 REATIVADO: Mês, Semana, Dia e Agenda
            onSelectEvent={(event) => setSelectedEvent(event)}
            popup={false} 
            showAllEvents={true}
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
              agenda: "Agenda"
            }}
            eventPropGetter={(event: any) => {
              const status = (event.status || "").toLowerCase()
              let bgColor = "#22c55e" 
              let borderColor = "#166534"
              let textColor = "#ffffff"

              if (status.includes("pendente") || status.includes("agendado")) {
                 bgColor = "#facc15"
                 borderColor = "#854d0e"
                 textColor = "#000000"
              }
              if (status.includes("cancelado")) {
                 bgColor = "#ef4444"
                 borderColor = "#7f1d1d"
              }

              return {
                className: "custom-event transition-all hover:scale-[1.02]",
                style: {
                  backgroundColor: bgColor,
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }
              }
            }}
            components={{
              event: ({ event }: any) => (
                <div className="flex flex-col leading-tight overflow-hidden gap-1">
                  <span className="truncate">🏫 {event.escola}</span>
                  <span className="text-[10px] opacity-80 flex items-center gap-1">
                     <span>👨‍🔧</span> 
                     <span className="truncate">{event.tecnico}</span>
                  </span>
                </div>
              )
            }}
            style={{ height: "100%" }}
          />
        </div>
      </div>

      {/* MODAL DE DETALHES */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#020617] border border-slate-800 rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className={`px-4 py-1 rounded-full text-[10px] uppercase border font-bold ${
                  (selectedEvent.status?.toLowerCase().includes("pendente") || selectedEvent.status?.toLowerCase().includes("agendado"))
                    ? "bg-yellow-400 text-black border-yellow-500" 
                    : selectedEvent.status?.toLowerCase().includes("cancelado")
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-green-500 text-black border-green-600"
                }`}>
                  {selectedEvent.status}
                </span>
                <h3 className="text-2xl text-white mt-4 font-bold leading-tight pr-8">{selectedEvent.escola}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-3xl font-light">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <DetailItem emoji="🆔" label="Código Chamado" value={selectedEvent.chamado} />
              <DetailItem emoji="👨‍🔧" label="Técnico Responsável" value={selectedEvent.tecnico} />
              <DetailItem emoji="📂" label="Categoria" value={`${selectedEvent.categoria} - ${selectedEvent.subcategoria}`} />
              <DetailItem emoji="👤" label="Aberto por" value={selectedEvent.abertura_por} />
              
              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-5">
                  <div className="text-3xl">⏱️</div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Tempo de Atendimento (SLA)</p>
                    <p className="text-2xl text-white font-bold">
                      {calcBusinessDays(selectedEvent.data_realizacao || selectedEvent.data_visita, selectedEvent.data_finalizacao)} <span className="text-sm font-medium text-slate-400">dias úteis</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 CSS GLOBAL PARA TODAS AS VIEWS */}
      <style jsx global>{`
        .rbc-calendar { font-family: inherit !important; }

        /* TOOLBAR - REATIVADO E ESTILIZADO */
        .rbc-toolbar { margin-bottom: 24px !important; }
        .rbc-toolbar button { 
            background: #0f172a !important; 
            color: #94a3b8 !important; 
            border: 1px solid #1e293b !important; 
            border-radius: 10px !important; 
            padding: 8px 18px !important; 
            font-weight: 800 !important; 
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            transition: all 0.2s;
        }
        .rbc-toolbar button:hover { color: #fff !important; border-color: #3b82f6 !important; }
        .rbc-toolbar button.rbc-active { background: #3b82f6 !important; border-color: #3b82f6 !important; color: #fff !important; }
        .rbc-toolbar-label { font-size: 20px !important; font-weight: 900 !important; color: #fff !important; }

        /* GRADE GERAL */
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { 
            border: 1px solid #1e293b !important; 
            border-radius: 20px !important;
            overflow: hidden !important;
            background: #020617 !important;
        }

        /* AGENDA VIEW (MODERNIZADA) */
        .rbc-agenda-view table.rbc-agenda-table { border: none !important; }
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th { 
            background: #0f172a !important; color: #64748b !important; border-bottom: 1px solid #1e293b !important; padding: 15px !important; 
        }
        .rbc-agenda-date-cell, .rbc-agenda-time-cell { 
            background: #020617 !important; color: #94a3b8 !important; font-weight: bold !important; border-bottom: 1px solid #1e293b !important; padding: 15px !important; 
        }
        .rbc-agenda-event-cell { 
            background: #020617 !important; color: #fff !important; border-bottom: 1px solid #1e293b !important; padding: 15px !important; 
        }
        .rbc-agenda-empty { color: #475569 !important; padding: 40px !important; text-align: center; }

        /* MONTH VIEW */
        .rbc-header { padding: 15px !important; color: #64748b !important; text-transform: uppercase; font-size: 11px; font-weight: 900; border-bottom: 1px solid #1e293b !important; border-left: 1px solid #1e293b !important; background: rgba(15, 23, 42, 0.4) !important; }
        .rbc-day-bg { border-left: 1px solid #1e293b !important; border-bottom: 1px solid #1e293b !important; }
        .rbc-today { background: rgba(59, 130, 246, 0.05) !important; }
        .rbc-off-range-bg { background: #000000 !important; opacity: 0.4; }
        .rbc-date-cell { padding: 12px !important; color: #94a3b8 !important; font-weight: bold; }

        /* TIME VIEW (WEEK/DAY) - REMOVE A GRADE DE HORAS */
        .rbc-time-header { border-bottom: 1px solid #1e293b !important; }
        .rbc-time-content { display: none !important; } /* Esconde a grade de horários vazia */
        .rbc-time-view .rbc-allday-cell { min-height: 500px !important; overflow-y: auto !important; }
        .rbc-time-view .rbc-time-gutter { display: none !important; }

        /* SCROLL NAS CÉLULAS DO MÊS */
        .rbc-month-row { min-height: 140px; }
        .rbc-row-content { position: relative !important; height: 100% !important; z-index: 2; }
        .rbc-show-more { display: none !important; } 
      `}</style>
    </div>
  )
}

function DetailItem({ emoji, label, value }: any) {
  return (
    <div className="flex items-center gap-5">
      <div className="text-2xl w-8 text-center bg-slate-800/50 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-700/50">{emoji}</div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">{label}</p>
        <p className="text-slate-100 font-semibold text-sm">{value || "---"}</p>
      </div>
    </div>
  )
}