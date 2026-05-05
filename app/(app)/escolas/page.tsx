"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"
import Link from "next/link"

// 🚀 FIX: Adicionado loading explícito para evitar que o Leaflet tente carregar antes da DOM estar pronta
const MapEscolas = dynamic(() => import("./MapEscolas"), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#020617]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
    </div>
  )
})

// LÓGICA DE CÁLCULO INTACTA
function calcScore(e: any) {
  const salas = Number(e.qtd_salas || 0)
  const aps = Number(e.aps_instalados || 0)
  const alunos = Number(e.total_alunos || 0)

  const equip = Number(
    e.total_equipamentos_funcionando ||
    e.total_equipamentos_recebidos ||
    0
  )

  const wifiIdeal = salas / 2 || 1
  const equipIdeal = alunos / 3 || 1

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equip / equipIdeal, 1)

  const score = indiceEquip * 0.6 + indiceAP * 0.4

  let criticidade = "saudavel"
  if (score < 0.6) criticidade = "critica"
  else if (score < 0.8) criticidade = "atencao"

  return { score, criticidade, indiceAP, indiceEquip }
}

export default function EscolasGridViewModerno() {
  const supabase = createClient()
  const [escolas, setEscolas] = useState<any[]>([])
  const [filtrado, setFiltrado] = useState<any[]>([])
  const [busca, setBusca] = useState("")
  const [criticidadeFiltro, setCriticidadeFiltro] = useState("todas")
  const [selected, setSelected] = useState<any>(null)
  
  // 🚀 FIX: Trava de montagem para o Leaflet não quebrar no Strict Mode do Next.js
  const [isMounted, setIsMounted] = useState(false)

  // CARREGAMENTO INTACTO
  async function carregar() {
    const { data } = await supabase.from("escolas").select("*")
    const enriched = data?.map((e) => ({ ...e, ...calcScore(e) })) || []
    enriched.sort((a, b) => a.nome_escola.localeCompare(b.nome_escola, "pt-BR"))
    setEscolas(enriched)
    setFiltrado(enriched)
  }

  useEffect(() => { 
    carregar()
    setIsMounted(true) // 🚀 Libera a renderização do mapa apenas no Client-Side!
  }, [])

  // FILTROS INTACTOS
  useEffect(() => {
    let f = escolas.filter((e) => e.nome_escola?.toLowerCase().includes(busca.toLowerCase()))
    if (criticidadeFiltro !== "todas") {
      f = f.filter((e) => e.criticidade === criticidadeFiltro)
    }
    setFiltrado(f)
  }, [busca, criticidadeFiltro, escolas])

  // Função para estilizar os badges e textos de criticidade
  function getCriticidadeVisual(c: string) {
    if (c === "critica") return { label: "Estado Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.1)]" }
    if (c === "atencao") return { label: "Atenção", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", shadow: "shadow-[0_0_15px_rgba(234,179,8,0.1)]" }
    return { label: "Saudável", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", shadow: "shadow-none" }
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">

      {/* CABEÇALHO E FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#020617] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Rede Escolar SETEC</h1>
          <p className="text-slate-400 text-sm md:text-base">Acompanhamento de infraestrutura e saúde tecnológica.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Barra de Busca com Ícone */}
          <div className="relative w-full lg:w-80">
            <input
              placeholder="Buscar unidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-2xl outline-none text-sm w-full focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-sm"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </div>
          </div>

          {/* Select de Status */}
          <div className="relative w-full lg:w-56">
            <select
              value={criticidadeFiltro}
              onChange={(e) => setCriticidadeFiltro(e.target.value)}
              className="appearance-none bg-slate-900/50 border border-slate-700 text-slate-300 font-semibold px-4 py-3.5 pr-10 rounded-2xl outline-none text-sm w-full focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm"
            >
              <option value="todas">🎯 Todos os Status</option>
              <option value="critica">🚨 Apenas Críticas</option>
              <option value="atencao">⚠️ Apenas Atenção</option>
              <option value="saudavel">✅ Apenas Saudáveis</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
               <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* MAPA PANORÂMICO */}
      <div className="bg-[#020617] border border-slate-800 rounded-3xl h-[350px] lg:h-[450px] overflow-hidden shadow-2xl relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
           <span className="bg-slate-900/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-700/50 shadow-lg text-xs font-bold text-white flex items-center gap-2">
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
             </span>
             {filtrado.length} UEs no mapa
           </span>
        </div>
        {/* 🚀 FIX: Renderiza o mapa APENAS quando montado no Client-Side */}
        {isMounted && <MapEscolas escolas={filtrado} selected={selected} onSelect={setSelected} />}
      </div>

      {/* GRID DE CARDS DAS ESCOLAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pt-4">
        {filtrado.length === 0 ? (
           <div className="col-span-full py-24 text-center flex flex-col items-center justify-center bg-[#020617]/50 rounded-3xl border border-slate-800 border-dashed">
             <span className="text-5xl opacity-50 grayscale mb-4">🏫</span>
             <h3 className="text-xl font-bold text-white mb-2">Nenhuma escola localizada</h3>
             <p className="text-slate-500 font-medium max-w-sm">Altere os filtros de busca ou verifique se o nome foi digitado corretamente.</p>
           </div>
        ) : (
          filtrado.map((e) => {
            const isSelected = selected?.id === e.id
            const statusVisual = getCriticidadeVisual(e.criticidade)
            const scorePercent = (e.score * 100).toFixed(0)

            return (
              <div
                key={e.id}
                onClick={() => setSelected(e)}
                className={`group flex flex-col bg-gradient-to-b from-[#020617] to-slate-900/30 rounded-3xl p-6 sm:p-8 transition-all duration-300 cursor-pointer border hover:-translate-y-1 hover:shadow-2xl ${
                  isSelected 
                  ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500' 
                  : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* Header do Card (Score e Badge) */}
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusVisual.bg} ${statusVisual.color} ${statusVisual.border} ${statusVisual.shadow}`}>
                      {statusVisual.label}
                    </span>
                  </div>
                  <div className={`text-3xl font-black tracking-tighter ${statusVisual.color}`}>
                    {scorePercent}<span className="text-lg opacity-50">%</span>
                  </div>
                </div>

                {/* Informações da Escola */}
                <div className="flex-1 mb-8">
                  {/* TAG CIE */}
                  <div className="mb-2">
                    <span className="inline-block px-2.5 py-1 bg-slate-800/50 border border-slate-700 text-cyan-400 text-[10px] font-black tracking-widest rounded-md">
                      CIE: {e.cie || "N/A"}
                    </span>
                  </div>
                  
                  <h3 className={`text-xl font-bold leading-tight mb-4 transition-colors ${isSelected ? 'text-cyan-400' : 'text-slate-100 group-hover:text-white'}`}>
                    {e.nome_escola}
                  </h3>
                  
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-2 text-slate-500">
                      <span className="mt-0.5">📍</span>
                      <p className="text-sm font-medium line-clamp-2 leading-relaxed">
                        {e.endereco || "Endereço não cadastrado"}
                      </p>
                    </div>
                    {/* INFORMAÇÃO DO TÉCNICO */}
                    <div className="flex items-center gap-2 text-blue-400/80">
                      <span className="">👨‍🔧</span>
                      <p className="text-xs font-bold line-clamp-1 uppercase tracking-wider">
                        {e.tecnico_atribuido || "Sem técnico atribuído"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas Rápidas (3 Blocos) */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/50 flex flex-col items-center justify-center text-center transition-colors group-hover:bg-slate-900">
                    <span className="text-xl mb-1 opacity-80">👨‍🎓</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Alunos</p>
                    <p className="font-black text-slate-200 text-sm">{e.total_alunos ?? 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/50 flex flex-col items-center justify-center text-center transition-colors group-hover:bg-slate-900">
                    <span className="text-xl mb-1 opacity-80">💻</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Equips</p>
                    <p className="font-black text-slate-200 text-sm">{e.total_equipamentos_funcionando ?? e.total_equipamentos_recebidos ?? 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/50 flex flex-col items-center justify-center text-center transition-colors group-hover:bg-slate-900">
                    <span className="text-xl mb-1 opacity-80">📡</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Rede APs</p>
                    <p className="font-black text-slate-200 text-sm">{e.aps_instalados ?? 0}</p>
                  </div>
                </div>

                {/* Botão de Ação */}
                <Link
                  href={`/escolas/${e.id}`}
                  className={`mt-auto w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-2 ${
                    isSelected 
                    ? 'bg-cyan-500 text-cyan-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400' 
                    : 'bg-[#020617] text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Ficha Técnica da Unidade <span className="text-lg leading-none">→</span>
                </Link>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}