"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"

// HELPER: Extrai as iniciais (ex: "Matheus Paiva" -> "MP") para os avatares da esquerda
const getInitials = (name: string) => {
  if (!name || name === "Sem Técnico") return "⚠️";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function PainelVisualSetorizacao() {
  const supabase = createClient()
  const [escolas, setEscolas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtroTecnico, setFiltroTecnico] = useState("Todos")

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("escolas").select("id, nome_escola, cie, tecnico_atribuido").order("nome_escola")
      setEscolas(data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const stats = useMemo(() => {
    const contagem: Record<string, number> = {}
    let pendentes = 0
    
    escolas.forEach(e => {
      if (e.tecnico_atribuido) {
        contagem[e.tecnico_atribuido] = (contagem[e.tecnico_atribuido] || 0) + 1
      } else {
        pendentes++
      }
    })

    const chartData = Object.entries(contagem)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const maxCarga = chartData.length > 0 ? chartData[0].count : 1
    const totalTecnicosAtivos = chartData.length;
    const mediaPorTecnico = totalTecnicosAtivos > 0 ? Math.round((escolas.length - pendentes) / totalTecnicosAtivos) : 0;
    const tecnicoMaisLotado = chartData.length > 0 ? chartData[0] : null;

    return { 
      chartData, 
      pendentes, 
      total: escolas.length, 
      maxCarga, 
      mediaPorTecnico, 
      tecnicoMaisLotado,
      totalTecnicosAtivos
    }
  }, [escolas])

  const listaTecnicosSelect = useMemo(() => {
    const nomes = new Set(escolas.map(e => e.tecnico_atribuido).filter(Boolean))
    return Array.from(nomes).sort()
  }, [escolas])

  const escolasFiltradas = escolas.filter(e => {
    const matchBusca = e.nome_escola?.toLowerCase().includes(busca.toLowerCase()) || 
                       e.cie?.toLowerCase().includes(busca.toLowerCase()) ||
                       e.tecnico_atribuido?.toLowerCase().includes(busca.toLowerCase())
    
    const matchTecnico = filtroTecnico === "Todos" 
                         ? true 
                         : filtroTecnico === "Sem Técnico"
                           ? !e.tecnico_atribuido
                           : e.tecnico_atribuido === filtroTecnico

    return matchBusca && matchTecnico
  })

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B1120]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
    </div>
  )

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER EXECUTIVO COM NOVOS CARDS */}
      <div className="flex flex-col gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <span className="text-cyan-500">●</span> Gestão e Setorização FIELD
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Monitoramento tático de carga e diretório de setorização da malha de atendimento.
          </p>
        </div>
        
        {/* 🚀 FAIXA DE KPIs (NOVIDADE: 5 Cards Estratégicos) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
           <div className="bg-[#020617] border border-slate-800 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-white">{stats.total}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Total UEs</span>
           </div>
           
           <div className="bg-gradient-to-t from-emerald-900/20 to-[#020617] border border-emerald-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg shadow-emerald-900/10">
              <span className="text-3xl font-black text-emerald-400">{stats.total - stats.pendentes}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-500/80 tracking-widest mt-1">Cobertas</span>
           </div>
           
           <div className="bg-gradient-to-t from-red-900/20 to-[#020617] border border-red-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg shadow-red-900/10">
              <span className="text-3xl font-black text-red-400">{stats.pendentes}</span>
              <span className="text-[10px] uppercase font-bold text-red-500/80 tracking-widest mt-1">Descobertas</span>
           </div>

           <div className="bg-gradient-to-t from-blue-900/20 to-[#020617] border border-blue-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg shadow-blue-900/10">
              <span className="text-3xl font-black text-blue-400">~{stats.mediaPorTecnico}</span>
              <span className="text-[10px] uppercase font-bold text-blue-500/80 tracking-widest mt-1 text-center">Média / Técnico</span>
           </div>

           <div className="bg-gradient-to-t from-orange-900/20 to-[#020617] border border-orange-500/30 rounded-2xl px-4 py-4 flex flex-col items-center justify-center shadow-lg shadow-orange-900/10">
              <span className="text-2xl font-black text-orange-400 truncate w-full text-center" title={stats.tecnicoMaisLotado?.name || "N/A"}>
                {stats.tecnicoMaisLotado ? stats.tecnicoMaisLotado.count : "0"} <span className="text-sm">UEs</span>
              </span>
              <span className="text-[9px] uppercase font-bold text-orange-500/80 tracking-widest mt-1 text-center truncate w-full">
                Gargalo: {stats.tecnicoMaisLotado ? getInitials(stats.tecnicoMaisLotado.name) : "Nenhum"}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: GRÁFICO REFORMULADO */}
        <div className="xl:col-span-1">
          <Glass title="📊 Carga da Equipe Field">
            <div className="space-y-4 mt-2 max-h-[579px] overflow-y-auto pr-3 custom-scrollbar">
              {stats.chartData.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-3xl mb-2 block opacity-50">👨‍🔧</span>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Nenhum técnico atribuído</p>
                </div>
              ) : (
                stats.chartData.map((tec, i) => {
                  const percent = (tec.count / stats.maxCarga) * 100;
                  
                  // Triage de Carga
                  const isAltaCarga = tec.count > 12;
                  const isBaixaCarga = tec.count < 8;
                  
                  let themeColor = "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]";
                  let textColor = "text-cyan-400";
                  let bgBadge = "bg-cyan-900/30 border-cyan-500/30 text-cyan-400";
                  
                  if (isAltaCarga) {
                    themeColor = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
                    textColor = "text-red-400";
                    bgBadge = "bg-red-900/30 border-red-500/30 text-red-400";
                  } else if (isBaixaCarga) {
                    themeColor = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
                    textColor = "text-emerald-400";
                    bgBadge = "bg-emerald-900/30 border-emerald-500/30 text-emerald-400";
                  }

                  const isTop3 = i < 3;
                  const rankTrophy = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";

                  return (
                    <div key={tec.name} className="group flex items-center gap-4 bg-slate-900/30 p-3 rounded-2xl border border-slate-800/50 hover:bg-slate-800/50 transition-all duration-300">
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border ${bgBadge}`}>
                          {getInitials(tec.name)}
                        </div>
                        {isTop3 && (
                          <div className="absolute -top-2 -right-2 text-lg drop-shadow-md">
                            {rankTrophy}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-bold text-slate-200 truncate pr-2 group-hover:text-white transition-colors">
                            {tec.name}
                          </span>
                          <span className={`text-sm font-black shrink-0 ${textColor}`}>
                            {tec.count} <span className="text-[9px] text-slate-500 uppercase tracking-widest">UEs</span>
                          </span>
                        </div>
                        <div className="w-full bg-[#020617] rounded-full h-2 border border-slate-800/80 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${themeColor}`} 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Glass>
        </div>

        {/* COLUNA DIREITA: DIRETÓRIO DE CONSULTA */}
        <div className="xl:col-span-2">
          <Glass title="🔍 Consulta de Malha de Atendimento">
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-5 flex items-center text-slate-500">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </span>
                <input 
                  type="text" 
                  placeholder="Localizar por Escola ou CIE..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-700 text-white rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-semibold shadow-inner placeholder:text-slate-600"
                />
              </div>

              <div className="relative shrink-0 md:w-64">
                <select
                  value={filtroTecnico}
                  onChange={(e) => setFiltroTecnico(e.target.value)}
                  className="w-full h-full bg-[#020617] border border-slate-700 text-slate-300 rounded-2xl pl-4 pr-10 py-4 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-semibold shadow-inner cursor-pointer appearance-none"
                >
                  <option className="bg-slate-900 text-white" value="Todos">👨‍🔧 Todos os Técnicos</option>
                  <option className="bg-slate-900 text-red-400 font-bold" value="Sem Técnico">⚠️ Sem Técnico</option>
                  {listaTecnicosSelect.map(t => (
                    <option className="bg-slate-900 text-slate-200" key={String(t)} value={String(t)}>{String(t)}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* 🚀 LISTA DE ESCOLAS ALINHADA E COM NOME COMPLETO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar content-start">
              {escolasFiltradas.length === 0 ? (
                 <div className="col-span-1 lg:col-span-2 py-10 flex flex-col items-center justify-center text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 opacity-30"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" /></svg>
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhum resultado encontrado</p>
                 </div>
              ) : (
                escolasFiltradas.map((escola) => (
                  // 🚀 h-20 garante que todos os cards fiquem com a mesma altura
                  <div key={escola.id} className="group bg-[#020617] border border-slate-800 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-800/40 hover:border-cyan-500/30 transition-all duration-300 shadow-sm h-20">
                    
                    <div className="flex flex-col overflow-hidden pr-3 flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate" title={escola.nome_escola}>{escola.nome_escola}</p>
                      <p className="text-slate-500 text-[10px] font-mono mt-0.5">CIE: {escola.cie || "S/N"}</p>
                    </div>
                    
                    {/* 🚀 NOME COMPLETO VOLTOU AQUI */}
                    <div className="shrink-0 flex justify-end max-w-[45%]">
                      {escola.tecnico_atribuido ? (
                        <div className="bg-blue-900/20 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-full">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)] shrink-0"></div>
                           <span className="text-[10px] font-black uppercase text-blue-300 tracking-wider truncate" title={escola.tecnico_atribuido}>
                             {escola.tecnico_atribuido}
                           </span>
                        </div>
                      ) : (
                        <div className="bg-red-900/20 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-full">
                           <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse shrink-0"></div>
                           <span className="text-[10px] font-black uppercase text-red-400 tracking-wider truncate">
                             Descoberta
                           </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </Glass>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
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
      `}</style>
    </div>
  )
}

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden h-full ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">{title}</h3>}
      {children}
    </div>
  )
}