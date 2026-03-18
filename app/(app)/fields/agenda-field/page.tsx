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
          <h2 className="text-3xl text-white font-bold">Agenda Operacional</h2>
          <p className="text-slate-400">Fluxo de chamados SETEC</p>
        </div>

        <div className="flex gap-3">
          <select
            value={tecnicoFiltro}
            onChange={(e) => setTecnicoFiltro(e.target.value)}
            className="bg-[#020617] border border-slate-800 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-bold"
          >
            {tecnicos.map(t => <option key={t} value={t}>{t === "Todos" ? "👨‍🔧 Todos Técnicos" : t}</option>)}
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-[#020617] border border-slate-800 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-bold"
          >
            <option value="Todos">📊 Todos Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Agendado">Agendado</option>
            <option value="Realizada">Realizada</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="bg-[#020617] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        <div style={{ height: 1200 }}> 
          <Calendar
            localizer={localizer}
            events={eventos}
            culture="pt-BR"
            onSelectEvent={(event) => setSelectedEvent(event)}
            popup={false} 
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
              day: "Dia"
            }}
            eventPropGetter={(event: any) => {
              const status = (event.status || "").toLowerCase()
              let bgColor = "#22c55e" 
              if (status.includes("pendente") || status.includes("agendado")) bgColor = "#facc15"
              if (status.includes("cancelado")) bgColor = "#ef4444"

              return {
                className: "border-none shadow-sm",
                style: {
                  backgroundColor: bgColor,
                  color: "#000",
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '2px'
                }
              }
            }}
            components={{
              event: ({ event }: any) => (
                <div className="flex flex-col leading-tight overflow-hidden">
                  <span className="truncate">🏫 {event.escola}</span>
                  <span className="text-[9px] opacity-80">👨‍🔧 {event.tecnico}</span>
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
          <div className="bg-[#020617] border border-slate-800 rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl">
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
                <h3 className="text-2xl text-white mt-4 font-bold leading-tight">{selectedEvent.escola}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white transition-colors text-3xl font-light px-2">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <DetailItem emoji="🆔" label="Código Chamado" value={selectedEvent.chamado} />
              <DetailItem emoji="👨‍🔧" label="Técnico Responsável" value={selectedEvent.tecnico} />
              <DetailItem emoji="📂" label="Categoria" value={`${selectedEvent.categoria} - ${selectedEvent.subcategoria}`} />
              <DetailItem emoji="👤" label="Aberto por" value={selectedEvent.abertura_por} />
              
              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 flex items-center gap-5">
                  <div className="text-3xl">⏱️</div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tempo de Atendimento (SLA)</p>
                    <p className="text-2xl text-blue-400 font-bold">
                      {calcBusinessDays(selectedEvent.data_realizacao || selectedEvent.data_visita, selectedEvent.data_finalizacao)} dias úteis
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .rbc-calendar, .rbc-calendar * { font-family: inherit !important; }

        /* MATA AS HORAS EM TODAS AS VIEWS (SEMANA/DIA) */
        .rbc-time-view .rbc-time-content,
        .rbc-time-view .rbc-time-gutter,
        .rbc-time-view .rbc-label,
        .rbc-time-view .rbc-timeslot-group,
        .rbc-event-label { 
          display: none !important; 
        }
        
        .rbc-time-view { border: none !important; }
        .rbc-time-header-content { border-left: none !important; }

        /* ROLAGEM DOS EVENTOS DENTRO DA CÉLULA DO MÊS */
        .rbc-month-view { border: none !important; }
        .rbc-month-row { 
          flex: 1 0 280px !important; /* Aumentado para forçar a renderização de mais eventos */
          overflow: visible !important; 
        }
        
        .rbc-row-content { 
          position: relative !important;
          max-height: 100% !important; 
          overflow-y: auto !important; 
          scrollbar-width: none; 
          z-index: 2;
        }
        .rbc-row-content::-webkit-scrollbar { display: none; }
        
        .rbc-date-cell { padding: 12px !important; color: #94a3b8 !important; font-weight: bold; }
        .rbc-header { padding: 15px !important; color: #64748b !important; text-transform: uppercase; font-size: 11px; font-weight: bold; border-bottom: 1px solid #1e293b !important; }
        .rbc-day-bg { border-left: 1px solid #1e293b !important; border-bottom: 1px solid #1e293b !important; }
        .rbc-today { background: rgba(59, 130, 246, 0.05) !important; }
        .rbc-off-range-bg { background: transparent !important; opacity: 0.1; }

        .rbc-toolbar button { background: #0f172a !important; color: white !important; border: 1px solid #1e293b !important; border-radius: 12px !important; padding: 8px 16px !important; font-weight: bold !important; }
        .rbc-toolbar button.rbc-active { background: #3b82f6 !important; border-color: #3b82f6 !important; }
        
        .rbc-event { 
          min-height: 48px !important; 
          margin-bottom: 4px !important; 
          position: relative !important;
        }
        .rbc-show-more { display: none !important; } 
      `}</style>
    </div>
  )
}

function DetailItem({ emoji, label, value }: any) {
  return (
    <div className="flex items-center gap-5">
      <div className="text-2xl w-8 text-center">{emoji}</div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{label}</p>
        <p className="text-slate-100 font-semibold">{value || "---"}</p>
      </div>
    </div>
  )
}