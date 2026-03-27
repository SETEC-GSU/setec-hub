"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Star, MessageSquare, TrendingUp, Award, Users, X, Calendar, UserCheck, ThumbsUp, Lightbulb, AlertCircle, User } from "lucide-react"

export default function AvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any | null>(null) // Controla a Splash Page
  
  // NOVO ESTADO: Controla o filtro por técnico no histórico
  const [filtroTecnico, setFiltroTecnico] = useState<string>("") 

  const supabase = createClient()

  useEffect(() => {
    async function carregarAvaliacoes() {
      // 🚀 A QUERY EXATA BASEADA NO SEU APPS SCRIPT E PRINTS (Tabela: fields_avaliacoes)
      const { data, error } = await supabase
        .from("fields_avaliacoes")
        .select("*")
        .order("data_visita", { ascending: false })

      if (error) {
        console.error("Erro ao buscar avaliações:", error)
        setLoading(false)
        return
      }

      if (data) setAvaliacoes(data)
      setLoading(false)
    }
    carregarAvaliacoes()
  }, [])

  // ==========================================
  // LÓGICA DE INSIGHTS (COM TRAVAS ANTI-NaN)
  // ==========================================
  const totalAvaliacoes = avaliacoes.length
  
  // Usamos a coluna 'nota_media' que vem do seu Apps Script
  const notasValidas = avaliacoes.map(a => Number(a.nota_media)).filter(n => !isNaN(n) && n > 0)
  const totalNotasValidas = notasValidas.length
  
  const somaNotas = notasValidas.reduce((acc, curr) => acc + curr, 0)
  const mediaGeral = totalNotasValidas > 0 ? (somaNotas / totalNotasValidas).toFixed(1) : "0.0"
  
  // Excelência = notas >= 4.5 (já que a média é quebrada)
  const notasExcelentes = notasValidas.filter(n => n >= 4.5).length
  const taxaExcelencia = totalNotasValidas > 0 ? Math.round((notasExcelentes / totalNotasValidas) * 100) : 0

  // Distribuição de Notas (Arredondadas para o gráfico)
  const distribuicao = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  avaliacoes.forEach(a => { 
    // CORREÇÃO: Arredonda a média para o inteiro mais próximo (ex: 4.8 vira 5, 3.2 vira 3)
    const n = Math.round(Number(a.nota_media))
    if (n >= 1 && n <= 5) distribuicao[n as keyof typeof distribuicao]++ 
  })

  // Ranking de Técnicos
  const tecnicosMap: Record<string, { total: number, soma: number }> = {}
  avaliacoes.forEach(a => {
    if (!a.tecnico) return
    const nome = a.tecnico.trim()
    const nota = Number(a.nota_media)
    
    if (!isNaN(nota) && nota > 0) {
      if (!tecnicosMap[nome]) tecnicosMap[nome] = { total: 0, soma: 0 }
      tecnicosMap[nome].total += 1
      tecnicosMap[nome].soma += nota
    }
  })

  const rankingTecnicos = Object.entries(tecnicosMap)
    .map(([nome, stats]) => ({
      nome,
      media: (stats.soma / stats.total).toFixed(1),
      avaliacoes: stats.total
    }))
    .sort((a, b) => Number(b.media) - Number(a.media) || b.avaliacoes - a.avaliacoes)
    .slice(0, 5) // Pega o Top 5

  // ==========================================
  // LÓGICA DO NOVO FILTRO DO HISTÓRICO
  // ==========================================
  
  // 1. Pega os nomes únicos de todos os técnicos para o Dropdown
  const tecnicosUnicos = Array.from(
    new Set(avaliacoes.map(a => a.tecnico).filter(Boolean))
  ).sort()

  // 2. Filtra a lista principal baseado no dropdown
  const avaliacoesFiltradas = filtroTecnico 
    ? avaliacoes.filter(a => a.tecnico === filtroTecnico)
    : avaliacoes

  // ==========================================
  // COMPONENTES AUXILIARES
  // ==========================================
  
  // 🌟 CORREÇÃO: Renderiza Meia Estrela com perfeição visual
  const renderStars = (nota: number, max = 5) => {
    const numNota = Number(nota) || 0
    return Array.from({ length: max }).map((_, i) => {
      const value = numNota - i

      if (value >= 1) {
        // Estrela Inteira
        return <Star key={i} size={14} className="text-yellow-400 fill-yellow-400 shrink-0" />
      } else if (value >= 0.5) {
        // Meia Estrela (usando truque de overflow e overlay do Tailwind)
        return (
          <div key={i} className="relative shrink-0 w-[14px] h-[14px]">
            <Star size={14} className="text-slate-700 absolute top-0 left-0" />
            <div className="absolute top-0 left-0 overflow-hidden w-[50%] h-full">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
            </div>
          </div>
        )
      } else {
        // Estrela Vazia
        return <Star key={i} size={14} className="text-slate-700 shrink-0" />
      }
    })
  }

  const formatarData = (dataStr: string) => {
    if (!dataStr) return "-"
    // Se a data vier no formato yyyy-MM-dd do App Script
    const partes = dataStr.split("-")
    if (partes.length === 3) {
       return `${partes[2]}/${partes[1]}/${partes[0]}`
    }
    return new Date(dataStr).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto px-4 sm:px-6 relative">
      
      {/* HEADER EXECUTIVO */}
      <div className="bg-gradient-to-br from-[#020617] to-slate-900/80 border border-slate-800 rounded-3xl p-8 lg:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 bg-blue-500"></div>
        
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Star size={20} className="fill-blue-400/20" />
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-[11px] font-bold uppercase tracking-widest">
              Índice de Satisfação das UEs
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Visão Geral das Avaliações - FIELDS
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
            Monitoramento em tempo real do feedback das escolas sobre os atendimentos presenciais do Projeto Suporte Técnico de TI (Fields).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* CARDS DE KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#020617] border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-all"></div>
              <h3 className="text-slate-400 text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" /> Média Geral
              </h3>
              <div className="flex items-end gap-3 z-10">
                <span className="text-5xl font-black text-white">{mediaGeral}</span>
                <div className="flex mb-2">{renderStars(Number(mediaGeral))}</div>
              </div>
            </div>

            <div className="bg-[#020617] border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
              <h3 className="text-slate-400 text-sm font-semibold mb-4 flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-400" /> Total de Avaliações
              </h3>
              <div className="flex items-end gap-3 z-10">
                <span className="text-5xl font-black text-white">{totalAvaliacoes}</span>
                <span className="text-slate-500 font-medium mb-1">feedbacks</span>
              </div>
            </div>

            <div className="bg-[#020617] border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col relative overflow-hidden group hover:border-purple-500/30 transition-all">
              <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full group-hover:bg-purple-500/20 transition-all"></div>
              <h3 className="text-slate-400 text-sm font-semibold mb-4 flex items-center gap-2">
                <Award size={16} className="text-purple-400" /> Taxa de Excelência (≥ 4.5)
              </h3>
              <div className="flex items-end gap-3 z-10">
                <span className="text-5xl font-black text-white">{taxaExcelencia}%</span>
                <span className="text-slate-500 font-medium mb-1">das notas</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${taxaExcelencia}%` }}></div>
              </div>
            </div>

          </div>

          {/* SESSÃO DO MEIO: DISTRIBUIÇÃO E RANKING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Distribuição de Notas */}
            <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                📊 Satisfação Geral
              </h3>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribuicao[star as keyof typeof distribuicao];
                  const percent = totalNotasValidas > 0 ? (count / totalNotasValidas) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-4">
                      <div className="flex items-center gap-1 w-16 shrink-0">
                        <span className="text-slate-300 font-medium text-sm">{star}</span>
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="flex-1 bg-slate-900 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-1000 ${
                            star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-right text-slate-400 text-sm font-medium shrink-0">
                        {count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Ranking de Técnicos */}
            <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                🏆 Top Técnicos (Média)
              </h3>
              <div className="space-y-4">
                {rankingTecnicos.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhum dado suficiente para o ranking.</p>
                ) : (
                  rankingTecnicos.map((tec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 
                          idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' : 
                          idx === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {idx + 1}º
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{tec.nome}</p>
                          <p className="text-slate-500 text-[11px] uppercase tracking-wide">{tec.avaliacoes} avaliações</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-white">{tec.media}</div>
                        <div className="flex gap-0.5">{renderStars(Number(tec.media), 5)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* LISTA LINEAR GERAL (CARDS CLICÁVEIS) COM FILTRO */}
          <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 shadow-lg">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  📋 Histórico Geral de Avaliações
                </h3>
                <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-900 rounded-full hidden md:inline-block">
                  {avaliacoesFiltradas.length} registros
                </span>
              </div>

              {/* DROPDOWN DE FILTRO POR TÉCNICO */}
              <div className="w-full sm:w-auto flex items-center gap-2">
                <Users size={16} className="text-slate-500 hidden sm:block" />
                <select
                  value={filtroTecnico}
                  onChange={(e) => setFiltroTecnico(e.target.value)}
                  className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="">Todos os Técnicos</option>
                  {tecnicosUnicos.map((tec: any, idx) => (
                    <option key={idx} value={tec}>{tec}</option>
                  ))}
                </select>
              </div>
            </div>

            {avaliacoesFiltradas.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                {avaliacoes.length === 0 ? "Nenhum feedback registrado ainda." : "Nenhuma avaliação encontrada para este técnico."}
              </div>
            ) : (
              <div className="space-y-3">
                {/* 🚀 MAPA ATUALIZADO PARA USAR O avaliacoesFiltradas */}
                {avaliacoesFiltradas.map((av, index) => (
                  <div 
                    key={index} 
                    onClick={() => setSelectedAvaliacao(av)}
                    className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl hover:bg-slate-800/60 hover:border-blue-500/30 transition-all cursor-pointer gap-4"
                  >
                    
                    {/* Escola e Data */}
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
                        {av.escola || "Escola não informada"}
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                        <Calendar size={12} /> Visita: {formatarData(av.data_visita)}
                      </p>
                    </div>

                    {/* Técnico e Preview */}
                    <div className="flex-1 hidden md:block">
                      <p className="text-slate-300 text-sm flex items-center gap-2">
                        <Users size={14} className="text-slate-500" /> {av.tecnico || "-"}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {/* Indicadores Visuais Rápidos */}
                        {av.elogios && <span className="flex items-center gap-1 text-[10px] text-emerald-400"><ThumbsUp size={10}/> Elogio</span>}
                        {av.reclamacoes && <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertCircle size={10}/> Reclamação</span>}
                        {av.sugestoes && <span className="flex items-center gap-1 text-[10px] text-yellow-400"><Lightbulb size={10}/> Sugestão</span>}
                      </div>
                    </div>

                    {/* Nota */}
                    <div className="flex flex-col items-start md:items-end shrink-0">
                      <div className="flex gap-1 mb-1">
                        {renderStars(av.nota_media)}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider group-hover:text-slate-400">
                        Ver Detalhes ▸
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 🚀 SPLASH PAGE / MODAL DE DETALHES RICOS */}
      {/* ========================================== */}
      {selectedAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm animate-in fade-in duration-200">
          
          <div className="bg-gradient-to-b from-[#0f172a] to-[#020617] border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <div className="pr-8">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                  Relatório de Satisfação
                </span>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {selectedAvaliacao.escola || "Escola não informada"}
                </h2>
              </div>
              
              <button 
                onClick={() => setSelectedAvaliacao(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Modal (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              
              {/* Box de Nota e Avaliador */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Média do Atendimento</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-white leading-none">
                        {Number(selectedAvaliacao.nota_media).toFixed(1)}
                      </span>
                      <span className="text-slate-500 mb-1 font-medium">/ 5</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {renderStars(selectedAvaliacao.nota_media, 5).map((star, i) => (
                      <div key={i} className="scale-125 origin-right">{star}</div>
                    ))}
                  </div>
                </div>

                {/* Info do Avaliador e Responsável */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><User size={12}/> Preenchido por</p>
                    <p className="text-slate-200 text-sm font-medium">{selectedAvaliacao.nome_responsavel || "Não informado"}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{selectedAvaliacao.cargo_responsavel || "Cargo não informado"}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Users size={12}/> Técnico Avaliado</p>
                    <p className="text-slate-200 text-sm font-medium">{selectedAvaliacao.tecnico || "Não informado"}</p>
                    <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1"><Calendar size={12}/> Visita: {formatarData(selectedAvaliacao.data_visita)}</p>
                  </div>
                </div>
              </div>

              {/* Critérios Específicos (Conforme App Script) */}
              <div className="pt-6 border-t border-slate-800">
                <h4 className="text-white text-sm font-bold mb-4">Critérios Avaliados (1 a 5)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Escopo Resolvido", val: selectedAvaliacao.escopo },
                    { label: "Organização", val: selectedAvaliacao.organizacao },
                    { label: "Conhecimento", val: selectedAvaliacao.conhecimento },
                    { label: "Comunicação", val: selectedAvaliacao.comunicacao },
                    { label: "Postura", val: selectedAvaliacao.postura },
                    { label: "Satisfação Geral", val: selectedAvaliacao.satisfacao },
                  ].map((crit, idx) => (
                    <div key={idx} className="bg-slate-900/30 p-3 rounded-xl border border-slate-800/80">
                      <p className="text-slate-400 text-[11px] font-medium uppercase mb-2 truncate">{crit.label}</p>
                      <div className="flex items-center gap-2">
                         <span className="text-white font-bold">{crit.val || 0}</span>
                         <div className="flex gap-0.5">{renderStars(crit.val || 0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Check de Postura */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-800/80 flex flex-col items-center text-center">
                   <UserCheck size={20} className={selectedAvaliacao.uniformizado ? "text-emerald-400 mb-2" : "text-red-600 mb-2"} />
                   <p className="text-slate-400 text-[10px] font-bold uppercase">Uniformizado</p>
                   <p className="text-white text-xs mt-1">{selectedAvaliacao.uniformizado ? "Sim" : "Não"}</p>
                </div>
                <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-800/80 flex flex-col items-center text-center">
                   <UserCheck size={20} className={selectedAvaliacao.cracha ? "text-emerald-400 mb-2" : "text-slate-600 mb-2"} />
                   <p className="text-slate-400 text-[10px] font-bold uppercase">Crachá</p>
                   <p className="text-white text-xs mt-1">{selectedAvaliacao.cracha ? "Sim" : "Não"}</p>
                </div>
                <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-800/80 flex flex-col items-center text-center">
                   <UserCheck size={20} className={selectedAvaliacao.apresentacao ? "text-emerald-400 mb-2" : "text-slate-600 mb-2"} />
                   <p className="text-slate-400 text-[10px] font-bold uppercase">Apresentação</p>
                   <p className="text-white text-xs mt-1">{selectedAvaliacao.apresentacao ? "Sim" : "Não"}</p>
                </div>
              </div>

              {/* Textos Descritivos */}
              <div className="space-y-4 pt-6 border-t border-slate-800">
                {selectedAvaliacao.elogios && (
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                    <p className="text-emerald-400 text-xs font-semibold uppercase mb-2 flex items-center gap-1"><ThumbsUp size={12}/> Elogios</p>
                    <p className="text-slate-300 text-sm leading-relaxed italic">"{selectedAvaliacao.elogios}"</p>
                  </div>
                )}
                {selectedAvaliacao.sugestoes && (
                  <div className="bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20">
                    <p className="text-yellow-400 text-xs font-semibold uppercase mb-2 flex items-center gap-1"><Lightbulb size={12}/> Sugestões</p>
                    <p className="text-slate-300 text-sm leading-relaxed italic">"{selectedAvaliacao.sugestoes}"</p>
                  </div>
                )}
                {selectedAvaliacao.reclamacoes && (
                  <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                    <p className="text-red-400 text-xs font-semibold uppercase mb-2 flex items-center gap-1"><AlertCircle size={12}/> Reclamações</p>
                    <p className="text-slate-300 text-sm leading-relaxed italic">"{selectedAvaliacao.reclamacoes}"</p>
                  </div>
                )}
                
                {/* Fallback se não tiver nenhum texto */}
                {(!selectedAvaliacao.elogios && !selectedAvaliacao.sugestoes && !selectedAvaliacao.reclamacoes) && (
                   <p className="text-slate-500 text-sm italic text-center py-4">A escola não deixou comentários em texto.</p>
                )}
              </div>

            </div>

            {/* Footer do Modal */}
            <div className="p-6 pt-4 border-t border-slate-800 shrink-0">
              <button 
                onClick={() => setSelectedAvaliacao(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Fechar Detalhes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Estilos customizados pro scroll do modal ficar bonitinho no Chrome */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}