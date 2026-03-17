"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation" // Importamos para o filtro
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
  if (score < 0.5) criticidade = "critica"
  else if (score < 0.8) criticidade = "atencao"

  const deficitEquip = Math.max(equipIdeal - equipFuncionando, 0)

  return {
    salas, aps, alunos, equipRecebidos, equipFuncionando,
    equipInativos, indiceAP, indiceEquip, score,
    criticidade, equipIdeal, wifiIdeal, deficitEquip
  }
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Captura a escola da URL
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

  // ==========================================
  // LÓGICA DE FILTRAGEM (A MÁGICA ACONTECE AQUI)
  // ==========================================
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

  if (loading) return <p className="text-white p-10">Carregando panorama tecnológico...</p>

  // Todas as métricas agora usam 'escolasFiltradas'
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
    <div className="space-y-8 pb-10">
      
      {/* HEADER COM SELETOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Escolar</h1>
          <p className="text-slate-400 text-sm">
            {escolaFiltro ? `Análise individual: ${escolaFiltro}` : "Panorama tecnológico das Escolas da URE"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase">Filtrar Unidade:</label>
          <select 
            value={escolaFiltro}
            onChange={(e) => handleFiltro(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-cyan-500 transition-all min-w-[250px]"
          >
            <option value="">Todas as Escolas</option>
            {listaNomesEscolas.map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card title="Escolas" value={totalEscolas} />
        <Card title="Alunos" value={totalAlunos.toLocaleString()} />
        <Card title="Equipamentos ativos" value={totalEquipFuncionando} />
        <Card title="Score médio" value={`${(scoreMedio * 100).toFixed(0)}%`} />
        <Card title="Déficit equipamentos" value={deficitEquipTotal} />
        <Card title="Salas por AP" value={salasPorAP.toFixed(1)} />
      </div>

      {/* MÉTRICAS AVANÇADAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Cobertura equipamentos" value={`${(coberturaEquip * 100).toFixed(0)}%`} />
        <Card title="Cobertura Wi-Fi" value={`${(coberturaWifi * 100).toFixed(0)}%`} />
        <Card title="Equipamentos inativos" value={equipamentosParados} />
        <Card title="Alunos por equipamento" value={alunosPorEquip.toFixed(1)} />
      </div>

      {/* DISTRIBUIÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard title="Escolas críticas" value={criticas} color="red" />
        <StatusCard title="Escolas atenção" value={atencao} color="yellow" />
        <StatusCard title="Escolas saudáveis" value={saudavel} color="green" />
      </div>

      {/* MAPA + RANKINGS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#020617] border border-slate-800 rounded-2xl h-[600px] overflow-hidden">
          {/* O mapa agora só mostra o(s) pin(s) da escola filtrada */}
          <MapEscolas escolas={escolasFiltradas} />
        </div>

        <div className="bg-[#020617] border border-slate-800 rounded-2xl p-5 overflow-auto h-[600px]">
          <h3 className="text-lg font-semibold mb-4 text-white">
            {escolaFiltro ? "Score da Unidade" : "Escolas mais críticas"}
          </h3>
          <div className="space-y-3">
            {rankingScore.map((e) => (
              <div key={e.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                <p className="font-semibold text-white">{e.nome_escola}</p>
                <p className="text-xs text-slate-400">Score {(e.score * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RANKING MAU USO */}
      <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">
          {escolaFiltro ? "Estado de conservação" : "Escolas com maior taxa de mau uso de equipamentos"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {rankingMauUso.map((e) => (
            <div key={e.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
              <p className="font-semibold text-white">{e.nome_escola}</p>
              <p className="text-xs text-slate-400">{e.equipInativos} equipamentos não operacionais</p>
            </div>
          ))}
        </div>
      </div>

      {/* INSIGHTS */}
      <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-2">
        <h3 className="font-semibold text-white">Insights automáticos</h3>
        <p className="text-sm text-slate-400">
          A {escolaFiltro || "URE"} possui déficit estimado de <b>{deficitEquipTotal} equipamentos</b> considerando a proporção ideal.
        </p>
        <p className="text-sm text-slate-400">
          Existem atualmente <b>{equipamentosParados}</b> equipamentos instalados mas não operacionais.
        </p>
      </div>
    </div>
  )
}

function Card({ title, value }: any) {
  return (
    <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function StatusCard({ title, value, color }: any) {
  const colors: any = {
    red: "bg-red-500/10 border-red-500/30 text-red-400",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
  }
  return (
    <div className={`p-5 rounded-2xl border ${colors[color]}`}>
      <p className="text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}