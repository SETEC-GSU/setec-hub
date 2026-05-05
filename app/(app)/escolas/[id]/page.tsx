"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"

function calcMetrics(e: any) {
  const salas = Number(e.qtd_salas || 0)
  const aps = Number(e.aps_instalados || 0)
  const alunos = Number(e.total_alunos || 0)
  const equipRecebidos = Number(e.total_equipamentos_recebidos || 0)
  const equipFuncionando = Number(e.total_equipamentos_funcionando ?? equipRecebidos ?? 0)

  const wifiIdeal = salas / 2 || 1
  const equipIdeal = alunos / 3 || 1

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equipFuncionando / equipIdeal, 1)

  /* PESO INVERTIDO — HW 60% / WIFI 40% */
  const score = indiceEquip * 0.6 + indiceAP * 0.4

  let criticidade = "Saudável"
  if (score < 0.6) criticidade = "Crítica"
  else if (score < 0.8) criticidade = "Atenção"

  const percentualFuncionando = equipRecebidos > 0 ? equipFuncionando / equipRecebidos : 0

  return {
    salas, aps, alunos, equipRecebidos, equipFuncionando, percentualFuncionando,
    indiceAP, indiceEquip, score, criticidade,
    apsFaltantes: Math.max(Math.ceil(wifiIdeal - aps), 0),
    equipFaltantes: Math.max(Math.ceil(equipIdeal - equipFuncionando), 0),
  }
}

export default function EscolaDetalhePage() {
  const supabase = createClient()
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [escola, setEscola] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)

  async function carregar() {
    const { data } = await supabase.from("escolas").select("*").eq("id", id).single()
    if (data) {
      setEscola(data)
      setMetrics(calcMetrics(data))
    }
  }

  useEffect(() => {
    if (id) carregar()
  }, [id])

  if (!escola || !metrics) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
    </div>
  )

  function badgeConfig(c: string) {
    if (c === "Crítica") return { style: "bg-red-500/10 text-red-500 border border-red-500/20", icon: "🚨" }
    if (c === "Atenção") return { style: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20", icon: "⚠️" }
    return { style: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20", icon: "✅" }
  }

  const criticidadeAtual = badgeConfig(metrics.criticidade)

  return (
    // max-w-[1600px] para a tela abrir mais e os cards ficarem largos
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 px-4 sm:px-6">

      {/* HEADER EXECUTIVO COM CIE GIGANTE E TÉCNICO */}
      <div className="bg-gradient-to-br from-[#020617] to-slate-900/50 border border-slate-800 rounded-3xl p-8 lg:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        <div className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 ${metrics.criticidade === 'Crítica' ? 'bg-red-500' : metrics.criticidade === 'Atenção' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest">
              Ficha da Unidade
            </span>
            {escola.cie && (
              <span className="px-5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-base md:text-lg font-black tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                CIE: {escola.cie}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {escola.nome_escola}
          </h1>
          <p className="text-slate-400 text-lg mt-3 flex items-center gap-2">
            📍 {escola.endereco || "Endereço não informado"}
          </p>
          
          {/* 🚀 DESTAQUE DO TÉCNICO NO CABEÇALHO */}
          <div className="mt-5 flex items-center">
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2.5 rounded-xl text-sm font-black tracking-wide flex items-center gap-2 shadow-sm">
              👨‍🔧 Técnico Atribuído: <span className="text-blue-200 ml-1">{escola.tecnico_atribuido || "Não atribuído"}</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 shrink-0 mt-4 md:mt-0">
          <div className={`px-8 py-5 rounded-3xl flex items-center gap-4 shadow-lg ${criticidadeAtual.style}`}>
            <span className="text-4xl">{criticidadeAtual.icon}</span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-0.5">Status Geral</p>
              <p className="text-2xl font-black leading-none">{metrics.criticidade}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTAS DE AÇÃO */}
      {(metrics.apsFaltantes > 0 || metrics.equipFaltantes > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-4xl shrink-0 border border-yellow-500/30">🎯</div>
          <div className="flex-1 space-y-3">
            <h3 className="text-yellow-500 font-bold text-xl">Recomendações de Ação</h3>
            <div className="flex flex-wrap gap-4 text-base text-yellow-400/90 font-medium">
              {metrics.equipFaltantes > 0 && (
                <span className="bg-[#020617]/50 px-4 py-2 rounded-xl border border-yellow-500/20 text-lg">💻 Enviar <b className="text-white mx-1">{metrics.equipFaltantes}</b> equipamentos</span>
              )}
              {metrics.apsFaltantes > 0 && (
                <span className="bg-[#020617]/50 px-4 py-2 rounded-xl border border-yellow-500/20 text-lg">📡 Instalar <b className="text-white mx-1">{metrics.apsFaltantes}</b> novos APs</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ÍNDICES PRINCIPAIS (MAIORES E INVERTIDOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Hardware Primeiro */}
        <div className="bg-[#020617] border border-indigo-500/30 rounded-3xl p-10 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 text-3xl">💻</div>
            <span className="text-sm font-bold text-slate-500 mt-2">Hardware (60%)</span>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Índice Equipamentos</p>
          <p className="text-6xl font-black text-indigo-400">{(metrics.indiceEquip * 100).toFixed(0)}<span className="text-3xl opacity-50">%</span></p>
        </div>

        {/* Wi-Fi Depois */}
        <div className="bg-[#020617] border border-cyan-500/30 rounded-3xl p-10 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 text-3xl">📡</div>
            <span className="text-sm font-bold text-slate-500 mt-2">Wi-Fi (40%)</span>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Índice AP</p>
          <p className="text-6xl font-black text-cyan-400">{(metrics.indiceAP * 100).toFixed(0)}<span className="text-3xl opacity-50">%</span></p>
        </div>

        {/* Score Total */}
        <div className="bg-[#020617] border border-purple-500/30 rounded-3xl p-10 shadow-[0_0_20px_rgba(168,85,247,0.05)] bg-gradient-to-br from-[#020617] to-purple-900/10">
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30 text-3xl">🏆</div>
            <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-4 py-2 rounded-lg uppercase tracking-widest mt-1">Score Geral</span>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Score Tech Total</p>
          <p className="text-6xl font-black text-purple-400">{(metrics.score * 100).toFixed(0)}<span className="text-3xl opacity-50">%</span></p>
        </div>
      </div>

      {/* RAIO-X DA INFRAESTRUTURA (MAIORES E INVERTIDOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        {/* Parque Tecnológico na Esquerda */}
        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 lg:p-10 space-y-10 flex flex-col">
          <div className="flex justify-between items-end border-b border-slate-800 pb-5">
            <h3 className="text-2xl lg:text-3xl font-bold text-white">Parque Tecnológico</h3>
            <span className="text-xs lg:text-sm bg-slate-800 text-slate-300 px-4 py-2 rounded-lg font-bold">{metrics.alunos} Alunos Totais</span>
          </div>

          <div className="grid grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
              <span className="text-xs lg:text-sm text-slate-500 font-bold uppercase tracking-widest block mb-2">Recebidos</span>
              <span className="text-4xl lg:text-5xl font-black text-slate-300">{metrics.equipRecebidos}</span>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
              <span className="text-xs lg:text-sm text-slate-500 font-bold uppercase tracking-widest block mb-2">Funcionando</span>
              <span className="text-4xl lg:text-5xl font-black text-indigo-400">{metrics.equipFuncionando}</span>
            </div>
          </div>

          <div className="space-y-4 pt-4 mt-auto">
            <div className="flex justify-between text-lg">
              <span className="text-slate-400 font-medium">Capacidade Operacional</span>
              <span className="text-white font-bold">{(metrics.percentualFuncionando * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden flex">
              <div className={`h-full transition-all duration-1000 ${metrics.percentualFuncionando < 0.6 ? 'bg-red-500' : metrics.percentualFuncionando < 0.8 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${metrics.percentualFuncionando * 100}%` }}></div>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-2">
              {metrics.percentualFuncionando < 0.6 ? "Crítico — grande parte do parque inoperante" : metrics.percentualFuncionando < 0.8 ? "Atenção — parte relevante do parque parada" : "Saudável — maioria dos equipamentos em operação"}
            </p>
          </div>
        </div>

        {/* Infraestrutura de Rede na Direita */}
        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 lg:p-10 flex flex-col">
          <h3 className="text-2xl lg:text-3xl font-bold text-white mb-8 border-b border-slate-800 pb-5">Infraestrutura de Rede</h3>
          <div className="grid grid-cols-2 gap-6 lg:gap-8 flex-1">
            <div className="bg-slate-900/50 p-6 lg:p-8 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center">
              <span className="text-xs lg:text-sm text-slate-500 font-bold uppercase tracking-widest mb-3">Qtd Salas</span>
              <p className="text-5xl lg:text-6xl font-black text-slate-200">{metrics.salas}</p>
            </div>
            <div className="bg-slate-900/50 p-6 lg:p-8 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center">
              <span className="text-xs lg:text-sm text-slate-500 font-bold uppercase tracking-widest mb-3">APs Instalados</span>
              <p className="text-5xl lg:text-6xl font-black text-cyan-400">{metrics.aps}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-6 text-center italic">Calculado com base em 1 AP a cada 2 salas.</p>
        </div>

      </div>

      {/* DADOS CADASTRAIS (E-MAIL PROTEGIDO CONTRA CORTE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8">
          <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><span className="text-slate-500 text-3xl">🏫</span> Institucional</h4>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-3"><span className="text-base text-slate-500 whitespace-nowrap">Tipo Ensino</span><span className="text-base font-medium text-slate-300 text-right">{escola.tipo_ensino || "-"}</span></div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-3"><span className="text-base text-slate-500 whitespace-nowrap">Período</span><span className="text-base font-medium text-slate-300 text-right">{escola.periodo || "-"}</span></div>
            <div className="flex items-start justify-between gap-4"><span className="text-base text-slate-500 whitespace-nowrap mt-0.5">Diretor</span><span className="text-base font-medium text-slate-300 text-right">{escola.diretor || "-"}</span></div>
          </div>
        </div>

        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8">
          <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><span className="text-slate-500 text-3xl">📞</span> Contato</h4>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-3"><span className="text-base text-slate-500 whitespace-nowrap">Telefone</span><span className="text-base font-medium text-slate-300 text-right">{escola.telefone || "-"}</span></div>
            {/* O email agora quebra a linha em vez de sumir graças ao break-all */}
            <div className="flex items-start justify-between gap-4"><span className="text-base text-slate-500 whitespace-nowrap mt-0.5">E-mail</span><span className="text-base font-medium text-slate-300 text-right break-all max-w-[70%]">{escola.email || "-"}</span></div>
          </div>
        </div>

        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8">
          <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><span className="text-slate-500 text-3xl">⏰</span> Operação</h4>
          <div className="space-y-5">
            {/* 🚀 TÉCNICO INCLUÍDO AQUI TAMBÉM */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-3">
              <span className="text-base text-slate-500 whitespace-nowrap">Técnico Field</span>
              <span className="text-base font-bold text-blue-400 text-right">{escola.tecnico_atribuido || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-3"><span className="text-base text-slate-500 whitespace-nowrap">Abertura</span><span className="text-base font-medium text-slate-300 text-right">{escola.horario_abertura || "-"}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-base text-slate-500 whitespace-nowrap">Fechamento</span><span className="text-base font-medium text-slate-300 text-right">{escola.horario_fechamento || "-"}</span></div>
          </div>
        </div>
      </div>

      {/* EXPLICAÇÃO DOS CÁLCULOS NO RODAPÉ */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 lg:p-10 text-slate-400 text-base space-y-4">
        <h4 className="text-white font-bold mb-2 text-lg">Metodologia de Avaliação:</h4>
        <p>📡 <b>Índice AP:</b> Considera 1 Access Point ideal para cada 2 salas de aula.</p>
        <p>💻 <b>Índice Equipamentos:</b> Considera 1 equipamento ideal para cada 3 alunos matriculados.</p>
        <p>🏆 <b>Score Tech:</b> Média ponderada entre infraestrutura Wi-Fi (peso 40%) e parque de equipamentos (peso 60%).</p>
      </div>

    </div>
  )
}