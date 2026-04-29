"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"

const MapEscolas = dynamic(() => import("../escolas/MapEscolas"), { ssr: false })

function calcMetrics(e: any) {
  const salas = Number(e.qtd_salas || 0)
  const aps = Number(e.aps_instalados || 0)
  const alunos = Number(e.total_alunos || 0)
  const equipRecebidos = Number(e.total_equipamentos_recebidos || 0)
  const equipFuncionando = Number(e.total_equipamentos_funcionando ?? equipRecebidos ?? 0)

  const equipInativos = Math.max(equipRecebidos - equipFuncionando, 0)
  const wifiIdeal = Math.ceil(salas / 2) || 1
  const equipIdeal = Math.ceil(alunos / 3) || 1

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equipFuncionando / equipIdeal, 1)

  const score = (indiceEquip * 0.6) + (indiceAP * 0.4)

  let criticidade = "saudavel"
  if (score < 0.6) criticidade = "critica"
  else if (score < 0.8) criticidade = "atencao"

  const deficitEquip = Math.max(equipIdeal - equipFuncionando, 0)

  return {
    salas, aps, alunos, equipRecebidos, equipFuncionando,
    equipInativos, indiceAP, indiceEquip, score,
    criticidade, equipIdeal, wifiIdeal, deficitEquip
  }
}

function DashboardContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const escolaFiltro = searchParams.get("escola") || ""

  const [escolas, setEscolas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const { data } = await supabase.from("escolas").select("*")
    const enriched = data?.map((e) => ({ ...e, ...calcMetrics(e) })) || []
    setEscolas(enriched)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const escolasFiltradas = useMemo(() => {
    if (!escolaFiltro) return escolas
    return escolas.filter(e => e.nome_escola === escolaFiltro)
  }, [escolas, escolaFiltro])

  const listaNomesEscolas = useMemo(() => {
    return [...new Set(escolas.map(e => e.nome_escola))].sort()
  }, [escolas])

  const handleFiltro = (nome: string) => {
    const params = new URLSearchParams(searchParams)
    if (nome) params.set("escola", nome)
    else params.delete("escola")
    router.push(`?${params.toString()}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[500px]">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
    </div>
  )

  const totalEscolas = escolasFiltradas.length
  const totalAlunos = escolasFiltradas.reduce((acc, e) => acc + e.alunos, 0)
  const totalEquipFuncionando = escolasFiltradas.reduce((acc, e) => acc + e.equipFuncionando, 0)
  const totalEquipRecebidos = escolasFiltradas.reduce((acc, e) => acc + e.equipRecebidos, 0)
  const totalEquipIdeal = escolasFiltradas.reduce((acc, e) => acc + e.equipIdeal, 0)
  const deficitEquipTotal = Math.max(totalEquipIdeal - totalEquipFuncionando, 0)
  const totalAP = escolasFiltradas.reduce((acc, e) => acc + e.aps, 0)
  const totalSalas = escolasFiltradas.reduce((acc, e) => acc + e.salas, 0)
  
  const scoreMedio = totalEscolas > 0 
    ? (escolasFiltradas.reduce((acc, e) => acc + e.score, 0) / totalEscolas) 
    : 0

  const coberturaEquip = totalEquipIdeal ? totalEquipFuncionando / totalEquipIdeal : 0
  const totalWifiIdeal = escolasFiltradas.reduce((acc, e) => acc + e.wifiIdeal, 0)
  const coberturaWifi = Math.min(totalAP / (totalWifiIdeal || 1), 1)
  const equipamentosParados = totalEquipRecebidos - totalEquipFuncionando
  const alunosPorEquip = totalEquipFuncionando ? totalAlunos / totalEquipFuncionando : 0
  const salasPorAP = totalAP ? totalSalas / totalAP : 0

  const criticas = escolasFiltradas.filter((e) => e.criticidade === "critica").length
  const atencao = escolasFiltradas.filter((e) => e.criticidade === "atencao").length
  const saudavel = escolasFiltradas.filter((e) => e.criticidade === "saudavel").length

  const rankingScore = [...escolasFiltradas].sort((a, b) => a.score - b.score).slice(0, 10)
  const rankingMauUso = [...escolasFiltradas].sort((a, b) => b.equipInativos - a.equipInativos).slice(0, 10)

  return (
    <div className="space-y-10 pb-12 max-w-[1600px] mx-auto">
      
      {/* 🚀 HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
             <span className="text-cyan-500">●</span> Dashboard Escolar de Tecnologia
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl leading-relaxed">
            {escolaFiltro 
              ? `Análise individual de infraestrutura tecnológica: ${escolaFiltro}` 
              : "Panorama estratégico da infraestrutura tecnológica e conectividade das Escolas da URE Guarulhos Sul."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={escolaFiltro}
            onChange={(e) => handleFiltro(e.target.value)}
            className="bg-[#020617] border border-slate-800 text-white font-bold rounded-xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all min-w-[280px] shadow-lg cursor-pointer"
          >
            <option value="">🏫 Visão Global (Todas as Escolas)</option>
            {listaNomesEscolas.map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 🚀 CARDS GIGANTES DE STATUS (CRITICIDADE) */}
      {!escolaFiltro && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard title="Saúde Crítica" value={criticas} subtitle="Abaixo de 60%" color="red" icon="🚨" />
          <StatusCard title="Atenção" value={atencao} subtitle="Entre 60% e 80%" color="yellow" icon="⚠️" />
          <StatusCard title="Saudáveis" value={saudavel} subtitle="Acima de 80%" color="emerald" icon="✅" />
        </div>
      )}

      {/* 🚀 BLOCO 1: INFRAESTRUTURA BÁSICA */}
      <Glass title="📊 Infraestrutura e Alcance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
          <KpiCard title="Escolas" value={totalEscolas} subtitle="Unidades" color="slate" />
          <KpiCard title="Alunos" value={totalAlunos.toLocaleString('pt-BR')} subtitle="Impactados" color="blue" />
          <KpiCard title="Equip. Ativos" value={totalEquipFuncionando.toLocaleString('pt-BR')} subtitle="Operacionais" color="emerald" />
          <KpiCard title="Déficit Máquinas" value={deficitEquipTotal.toLocaleString('pt-BR')} subtitle="Para meta 3:1" color="red" />
        </div>
      </Glass>

      {/* 🚀 BLOCO 2: MÉTRICAS DE EFICIÊNCIA */}
      <Glass title="⚡ Métricas de Eficiência e Cobertura">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
          <KpiCard title="Score Geral" value={`${(scoreMedio * 100).toFixed(0)}%`} subtitle="Saúde da Rede" color={scoreMedio > 0.8 ? "emerald" : scoreMedio > 0.5 ? "yellow" : "red"} />
          <KpiCard title="Cob. Dispositivos" value={`${(coberturaEquip * 100).toFixed(0)}%`} subtitle="Ativos vs Ideal" color="blue" />
          <KpiCard title="Cob. Wi-Fi" value={`${(coberturaWifi * 100).toFixed(0)}%`} subtitle="APs vs Ideal" color="purple" />
          <KpiCard title="Equip. Parados" value={equipamentosParados} subtitle="Inativos/Quebrados" color="red" />
        </div>
      </Glass>

      {/* 🚀 BLOCO 3: MAPA E RANKING */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Mapa (Sem padding interno para o mapa encostar na borda) */}
        <div className="xl:col-span-2 bg-[#020617] border border-slate-800 rounded-[2.5rem] h-[650px] overflow-hidden shadow-2xl relative">
            <div className="absolute top-6 left-8 z-10 bg-[#020617]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">🗺️ Geolocalização</h3>
            </div>
            <MapEscolas escolas={escolasFiltradas} />
        </div>

        {/* Ranking Crítico */}
        <Glass title={escolaFiltro ? "📋 Detalhes do Score" : "🚨 Top 10 - Escolas Críticas"}>
          <div className="space-y-4 mt-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {rankingScore.map((e, index) => {
              const perc = (e.score * 100).toFixed(0);
              const colorClass = e.score < 0.5 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                 e.score < 0.8 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                                 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

              return (
                <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800/60 bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-4">
                    {!escolaFiltro && (
                      <span className="text-slate-600 font-black text-sm w-4">{index + 1}.</span>
                    )}
                    <p className="font-bold text-slate-200 text-sm max-w-[160px] md:max-w-[200px] truncate" title={e.nome_escola}>
                      {e.nome_escola}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black border ${colorClass}`}>
                    {perc}%
                  </span>
                </div>
              )
            })}
          </div>
        </Glass>
      </div>

      {/* 🚀 BLOCO 4: MAU USO E INSIGHTS */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        <Glass title={escolaFiltro ? "🔧 Estado de Conservação" : "📉 Top 10 - Equipamentos Inativos"}>
          <div className="space-y-3 mt-2">
            {rankingMauUso.map((e, index) => (
              <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800/60 bg-slate-800/20">
                 <div className="flex items-center gap-4">
                    {!escolaFiltro && (
                      <span className="text-slate-600 font-black text-sm w-4">{index + 1}.</span>
                    )}
                    <p className="font-bold text-slate-200 text-sm max-w-[200px] truncate">{e.nome_escola}</p>
                 </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Inativos:</span>
                  <span className="bg-red-500/10 text-red-400 font-black px-3 py-1 rounded-lg border border-red-500/20">
                    {e.equipInativos}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        <Glass title="💡 Inteligência Analítica">
          <div className="flex flex-col justify-center h-full space-y-6">
            
            <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-3xl flex items-start gap-5">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                <span className="text-blue-400 text-xl">💻</span>
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Déficit Estrutural</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  A {escolaFiltro || "Rede URE Guarulhos Sul"} possui um déficit estimado de <strong className="text-blue-400">{deficitEquipTotal.toLocaleString('pt-BR')} equipamentos</strong> para atingir a meta ideal do EduMonitor (3 alunos por dispositivo).
                </p>
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-3xl flex items-start gap-5">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20">
                <span className="text-red-400 text-xl">🔧</span>
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Ociosidade de Hardware</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Existem atualmente <strong className="text-red-400">{equipamentosParados} dispositivos</strong> registrados na base que não estão operacionais. A manutenção deste parque tecnológico aumentaria o Score em até {(equipamentosParados / (totalEquipIdeal||1) * 60).toFixed(1)}%.
                </p>
              </div>
            </div>

          </div>
        </Glass>

      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl relative overflow-hidden h-full ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">{title}</h3>}
      {children}
    </div>
  )
}

function KpiCard({ title, value, subtitle, color }: any) {
  const gradients: any = {
    slate: "from-slate-600/20 to-transparent border-slate-500/30",
    blue: "from-blue-600/20 to-transparent border-blue-500/30",
    purple: "from-purple-600/20 to-transparent border-purple-500/30",
    yellow: "from-yellow-600/20 to-transparent border-yellow-500/30",
    emerald: "from-emerald-600/20 to-transparent border-emerald-500/30",
    red: "from-red-600/20 to-transparent border-red-500/30",
  }

  const textColors: any = {
    slate: "text-slate-300",
    blue: "text-blue-400",
    purple: "text-purple-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
  }

  return (
    <div className={`bg-[#020617] border rounded-[2rem] p-6 shadow-2xl relative overflow-hidden transition-all hover:scale-[1.02] ${gradients[color]}`}>
      <div className={`absolute top-0 left-0 h-full w-1 bg-gradient-to-b ${color === 'slate' ? 'from-slate-500' : color === 'blue' ? 'from-blue-500' : color === 'purple' ? 'from-purple-500' : color === 'yellow' ? 'from-yellow-500' : color === 'emerald' ? 'from-emerald-500' : 'from-red-500'} to-transparent opacity-70`}></div>
      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.15em] mb-3">{title}</p>
      <p className={`text-3xl lg:text-4xl font-black mb-2 tracking-tighter ${textColors[color]}`}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
        {subtitle}
      </p>
    </div>
  )
}

function StatusCard({ title, value, subtitle, color, icon }: any) {
  const bgColors: any = {
    red: "bg-gradient-to-br from-[#020617] to-red-950/20 border-red-900/50 hover:border-red-500/50",
    yellow: "bg-gradient-to-br from-[#020617] to-yellow-950/20 border-yellow-900/50 hover:border-yellow-500/50",
    emerald: "bg-gradient-to-br from-[#020617] to-emerald-950/20 border-emerald-900/50 hover:border-emerald-500/50",
  }

  const textColors: any = {
    red: "text-red-500",
    yellow: "text-yellow-500",
    emerald: "text-emerald-500",
  }

  return (
    <div className={`p-8 rounded-[2.5rem] border ${bgColors[color]} flex items-center justify-between transition-all duration-300 group`}>
      <div>
        <p className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${textColors[color]} opacity-80`}>{title}</p>
        <p className="text-5xl font-black text-white tracking-tighter mb-2">{value}</p>
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{subtitle}</p>
      </div>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all ${color === 'red' ? 'bg-red-500/10' : color === 'yellow' ? 'bg-yellow-500/10' : 'bg-emerald-500/10'}`}>
        {icon}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div></div>}>
      <DashboardContent />
    </Suspense>
  )
}