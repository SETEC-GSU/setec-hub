"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"

// Importação dinâmica para evitar erro no SSR do Next.js
const MapSetorizacao = dynamic(() => import("@/components/ui/MapSetorizacao"), { ssr: false })

export default function MapaGeograficoSetorizacao() {
  const supabase = createClient()
  const [escolas, setEscolas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 🚀 NOVOS ESTADOS PARA OS FILTROS
  const [busca, setBusca] = useState("")
  const [filtroTecnico, setFiltroTecnico] = useState("Todos")

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("escolas")
        .select("id, nome_escola, cie, latitude, longitude, tecnico_atribuido")
      
      setEscolas(data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  // 🚀 EXTRAI A LISTA DE TÉCNICOS DINAMICAMENTE
  const listaTecnicosSelect = useMemo(() => {
    const nomes = new Set(escolas.map(e => e.tecnico_atribuido).filter(Boolean))
    return Array.from(nomes).sort()
  }, [escolas])

  // 🚀 LÓGICA DO FILTRO INTELIGENTE
  const escolasFiltradas = useMemo(() => {
    return escolas.filter(e => {
      // 1. Verifica busca por texto (Escola ou CIE)
      const matchBusca = e.nome_escola?.toLowerCase().includes(busca.toLowerCase()) || 
                         e.cie?.toLowerCase().includes(busca.toLowerCase())
      
      // 2. Verifica seleção do dropdown
      const matchTecnico = filtroTecnico === "Todos" 
                           ? true 
                           : filtroTecnico === "Sem Técnico"
                             ? !e.tecnico_atribuido
                             : e.tecnico_atribuido === filtroTecnico

      // Só aparece no mapa se passar nos dois filtros e tiver coordenada
      return matchBusca && matchTecnico && e.latitude && e.longitude
    })
  }, [escolas, busca, filtroTecnico])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B1120]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
    </div>
  )

  const comCoordenadaGeral = escolas.filter(e => e.latitude && e.longitude).length;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 max-w-[1600px] mx-auto pb-6">
      
      {/* HEADER DA PÁGINA + FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
             <span className="text-cyan-500">●</span> Mapa de Setorização
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Visão geográfica da malha. Base geral: {comCoordenadaGeral} UEs mapeadas.
          </p>
        </div>

        {/* 🚀 BARRA DE FERRAMENTAS DO MAPA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          
          <div className="relative w-full sm:w-[300px]">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Buscar UE ou CIE..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#020617] border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-xs font-bold shadow-inner placeholder:text-slate-600"
            />
          </div>

          <div className="relative w-full sm:w-[240px] shrink-0">
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="w-full h-full bg-[#020617] border border-slate-700 text-slate-300 rounded-xl pl-4 pr-10 py-3 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-xs font-bold shadow-inner cursor-pointer appearance-none"
            >
              <option className="bg-slate-900 text-white" value="Todos">🗺️ Todos os Técnicos</option>
              <option className="bg-slate-900 text-red-400 font-bold" value="Sem Técnico">⚠️ Sem Técnico</option>
              {listaTecnicosSelect.map(t => (
                <option className="bg-slate-900 text-slate-200" key={String(t)} value={String(t)}>{String(t)}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-500/30 px-4 py-3 rounded-xl flex items-center justify-center shrink-0">
             <span className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
               Exibindo: {escolasFiltradas.length}
             </span>
          </div>

        </div>
      </div>

      {/* CAIXA DO MAPA */}
      <div className="flex-1 bg-[#020617] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
        {escolasFiltradas.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-[#020617]/80 backdrop-blur-sm">
             <span className="text-4xl mb-4">🗺️</span>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhuma escola encontrada neste filtro</p>
          </div>
        ) : null}
        
        {/* Passamos apenas as escolas que sobreviveram aos filtros! */}
        <MapSetorizacao escolas={escolasFiltradas} />
      </div>

    </div>
  )
}