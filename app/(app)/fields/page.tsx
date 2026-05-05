"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"

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

// Formatador seguro para as datas do Modal
function formatarDataBR(dateStr: string | null) {
  if (!dateStr) return "N/A"
  const d = parseDateLocal(dateStr)
  if (!d) return "N/A"
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) // Evita desvio de fuso
}

const SafeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const nome = typeof label === 'object' ? (payload[0]?.name || "Item") : String(label || "Item")
  
  return (
    <div className="bg-[#020617] border border-slate-800 p-3 rounded-xl shadow-2xl">
      <p className="text-slate-400 text-[10px] uppercase mb-1">{nome}</p>
      <p className="text-white text-lg font-bold">{String(payload[0].value)}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function FieldsPage() {
  const supabase = createClient()

  // Estados Globais
  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [todasEscolas, setTodasEscolas] = useState<any[]>([]) // 🚀 NOVO ESTADO: Lista oficial de escolas
  const [tecnicoFiltro, setTecnicoFiltro] = useState("Todos")
  const [loading, setLoading] = useState(true)

  // Filtros exclusivos da Tabela
  const [buscaChamado, setBuscaChamado] = useState("")
  const [filtroMesTabela, setFiltroMesTabela] = useState("Todos")
  const [filtroEscolaTabela, setFiltroEscolaTabela] = useState("Todas")
  const [filtroTecnicoTabela, setFiltroTecnicoTabela] = useState("Todos")

  // Controla a Splash Page (Modal)
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: vData } = await supabase.from("fields_visitas").select("*")
      const { data: aData } = await supabase.from("fields_avaliacoes").select("*")
      const { data: eData } = await supabase.from("escolas").select("nome_escola") // 🚀 Trazendo nomes das escolas

      setVisitas(vData || [])
      setAvaliacoes(aData || [])
      setTodasEscolas(eData || [])
      setLoading(false)
    }
    carregar()
  }, [])

  // CÁLCULOS GLOBAIS
  const stats = useMemo(() => {
    const filtradas = (tecnicoFiltro === "Todos" ? visitas : visitas.filter(v => v.tecnico === tecnicoFiltro))
      .sort((a, b) => {
        const codA = String(a.chamado || "");
        const codB = String(b.chamado || "");
        return codB.localeCompare(codA, undefined, { numeric: true });
      });

    const avalFiltradas = tecnicoFiltro === "Todos" ? avaliacoes : avaliacoes.filter(a => a.tecnico === tecnicoFiltro)

    const visitasComFinalizacao = filtradas.filter(v => v.data_visita && v.data_finalizacao)
    const somaDiasUteis = visitasComFinalizacao.reduce((acc, v) => acc + calcBusinessDays(v.data_visita, v.data_finalizacao), 0)
    const slaMedio = visitasComFinalizacao.length > 0 ? (somaDiasUteis / visitasComFinalizacao.length).toFixed(1) : "0"

    const mediaAval = avalFiltradas.length 
      ? (avalFiltradas.reduce((acc, a) => acc + Number(a.nota_media || 0), 0) / avalFiltradas.length).toFixed(1)
      : "0.0"

    const rankingTecnicos = [...new Set(visitas.map(v => v.tecnico))].filter(Boolean).map(t => {
      const vTec = visitas.filter(v => v.tecnico === t)
      const aTec = avaliacoes.filter(a => a.tecnico === t)
      const media = aTec.length ? aTec.reduce((acc, a) => acc + a.nota_media, 0) / aTec.length : 0
      return { nome: String(t), total: vTec.length, media: media.toFixed(1) }
    }).sort((a, b) => b.total - a.total)

    const rankingEscolas = Object.entries(
      filtradas.reduce((acc: any, v) => {
        if (v.escola) acc[v.escola] = (acc[v.escola] || 0) + 1
        return acc
      }, {})
    ).sort((a: any, b: any) => b[1] - a[1])

    const mesesMap: any = {}
    filtradas.forEach(v => {
      if (!v.data_visita) return
      const data = parseDateLocal(v.data_visita)
      if (data) {
        const mesAno = data.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()
        mesesMap[mesAno] = (mesesMap[mesAno] || 0) + 1
      }
    })
    const graficoMes = Object.entries(mesesMap).map(([name, value]) => ({ name, value }))

    // 🚀 LÓGICA DE COBERTURA E ESCOLAS NÃO CONTEMPLADAS
    const escolasAtendidasSet = new Set(
      filtradas
        .map(v => v.escola)
        .filter(escola => {
          if (!escola) return false;
          return !escola.toUpperCase().includes("URE GUARULHOS SUL");
        })
    )
    
    const coberturaEscolas = escolasAtendidasSet.size

    const escolasValidasRede = todasEscolas.filter(e => e.nome_escola && !e.nome_escola.toUpperCase().includes("URE GUARULHOS SUL"))
    const totalEscolasRede = escolasValidasRede.length > 0 ? escolasValidasRede.length : 82 // Fallback para 82 se a query falhar

    const escolasNaoAtendidas = escolasValidasRede
      .filter(e => !escolasAtendidasSet.has(e.nome_escola))
      .map(e => e.nome_escola)
      .sort((a, b) => a.localeCompare(b))

    return {
      filtradas,
      totalVisitas: filtradas.length,
      tecnicosAtivos: rankingTecnicos.length,
      slaMedio,
      mediaAval,
      rankingTecnicos,
      rankingEscolas,
      graficoMes,
      coberturaEscolas,
      totalEscolasRede,
      escolasNaoAtendidas // 🚀 Exposto para uso na UI
    }
  }, [visitas, avaliacoes, tecnicoFiltro, todasEscolas])

  // LÓGICA DE FILTRAGEM EXCLUSIVA DA TABELA
  const chamadosTabela = useMemo(() => {
    return stats.filtradas.filter(v => {
      const matchEscola = filtroEscolaTabela === "Todas" || v.escola === filtroEscolaTabela;
      const matchTecnico = filtroTecnicoTabela === "Todos" || v.tecnico === filtroTecnicoTabela;
      const matchBusca = buscaChamado === "" || String(v.chamado || "").toLowerCase().includes(buscaChamado.toLowerCase());
      
      let matchMes = true;
      if (filtroMesTabela !== "Todos") {
        if (!v.data_visita) {
          matchMes = false;
        } else {
          const data = parseDateLocal(v.data_visita);
          if (data) {
            const mesAno = data.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
            matchMes = mesAno === filtroMesTabela;
          } else {
            matchMes = false;
          }
        }
      }

      return matchEscola && matchTecnico && matchBusca && matchMes;
    });
  }, [stats.filtradas, filtroEscolaTabela, filtroTecnicoTabela, filtroMesTabela, buscaChamado]);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0B1120]">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="space-y-10">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
             <span className="text-blue-500">●</span> Visão Geral - Atendimentos dos Fields
          </h2>
          <p className="text-slate-400 mt-1">Análise operacional e estratégica do suporte em campo da SETEC</p>
        </div>

        <select
          value={tecnicoFiltro}
          onChange={(e) => setTecnicoFiltro(e.target.value)}
          className="bg-[#020617] border border-slate-800 text-white rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-w-[260px] font-bold cursor-pointer"
        >
          <option value="Todos">👨‍🔧 Todos os Técnicos</option>
          {stats.rankingTecnicos.map(t => (
            <option key={t.nome} value={t.nome}>{t.nome}</option>
          ))}
        </select>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard title="Chamados" value={stats.totalVisitas} subtitle="Volume total" color="blue" />
        <KpiCard title="Técnicos" value={stats.tecnicosAtivos} subtitle="Equipe campo" color="purple" />
        <KpiCard title="SLA Útil" value={stats.slaMedio + "d"} subtitle="Média conclusão" color="yellow" />
        <KpiCard title="Média Aval." value={stats.mediaAval + " ⭐"} subtitle="Feedback escolas" color="emerald" />
        {/* 🚀 KPI AGORA USA O TOTAL REAL DINÂMICO DA BASE DE DADOS */}
        <KpiCard title="Escolas" value={`${stats.coberturaEscolas}/${stats.totalEscolasRede}`} subtitle="Atendidas" color="blue" />
      </div>

      {/* GRÁFICO MENSAL */}
      <Glass title="Volume de Atendimentos Mensais">
        <div className="h-[340px] w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.graficoMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip content={<SafeTooltip />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      {/* 🚀 MUDAMOS PARA xl:grid-cols-3 PARA ACOMODAR O NOVO CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        
        <Glass title="🏆 Performance por Técnico">
          <div className="divide-y divide-slate-800/50 mt-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.rankingTecnicos.map((t, i) => (
              <Link 
                href={`/fields/tecnico/${encodeURIComponent(t.nome)}`}
                key={t.nome} 
                className="flex items-center justify-between py-5 hover:bg-slate-800/30 px-4 rounded-2xl transition group"
              >
                <div className="flex items-center gap-5">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : i === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' : i === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' : 'bg-slate-800 text-slate-400'}`}>
                    {i + 1}
                  </span>
                  <span className="text-slate-100 group-hover:text-blue-400 font-bold transition-colors text-base sm:text-lg truncate">{t.nome}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-blue-400 text-xl font-bold">{t.media}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.total} CHAMADOS</p>
                </div>
              </Link>
            ))}
          </div>
        </Glass>

        <Glass title="🚩 Escolas com Maior Demanda">
          <div className="divide-y divide-slate-800/50 mt-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.rankingEscolas.map((e: any) => (
              <div key={String(e[0])} className="flex items-center justify-between py-4 px-4 hover:bg-slate-800/20 rounded-xl transition-colors">
                <span className="text-slate-200 font-bold truncate max-w-[280px]">{e[0]}</span>
                <span className="bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-[11px] font-bold border border-red-500/20 shrink-0">
                  {e[1]} CHAMADOS
                </span>
              </div>
            ))}
          </div>
        </Glass>

        {/* 🚀 NOVO CARD: ESCOLAS NÃO CONTEMPLADAS */}
        <Glass title="🎯 Pendentes (Não Contempladas)">
          <div className="divide-y divide-slate-800/50 mt-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.escolasNaoAtendidas.length === 0 ? (
               <div className="py-12 text-center flex flex-col items-center justify-center">
                 <span className="text-4xl mb-3">🎉</span>
                 <p className="text-emerald-500 text-sm font-bold uppercase tracking-widest">
                   Cobertura de 100%!
                 </p>
                 <p className="text-slate-500 text-xs mt-1">Todas as escolas foram visitadas.</p>
               </div>
            ) : (
              stats.escolasNaoAtendidas.map((escola: string) => (
                <div key={escola} className="flex items-center py-4 px-4 hover:bg-slate-800/20 rounded-xl transition-colors">
                  <span className="w-2 h-2 rounded-full bg-green-700 mr-4 shrink-0 relative">
                    {/* Efeito visual de pulsar para indicar "pendência" */}
                    <span className="animate-ping absolute -inset-1 rounded-full bg-green-500 opacity-20"></span>
                  </span>
                  <span className="text-slate-300 font-medium truncate text-sm">{escola}</span>
                </div>
              ))
            )}
          </div>
        </Glass>

      </div>

      {/* TABELA DE CHAMADOS */}
      <Glass title="📋 Lista de Chamados Atendidos">
        
        {/* BARRA DE FILTROS DA TABELA */}
        <div className="flex flex-col md:flex-row flex-wrap gap-3 mb-6 mt-2">
          {/* Busca por Código */}
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar chamado (ex: STI-26...)" 
              value={buscaChamado}
              onChange={(e) => setBuscaChamado(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold placeholder:text-slate-600"
            />
          </div>

          {/* Filtro Mês */}
          <select 
            value={filtroMesTabela} 
            onChange={(e) => setFiltroMesTabela(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold min-w-[150px] cursor-pointer"
          >
            <option value="Todos">📅 Todos os Meses</option>
            {stats.graficoMes.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>

          {/* Filtro Escola */}
          <select 
            value={filtroEscolaTabela} 
            onChange={(e) => setFiltroEscolaTabela(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold w-full md:flex-1 max-w-[300px] truncate cursor-pointer"
          >
            <option value="Todas">🏫 Todas as Escolas</option>
            {[...new Set(stats.filtradas.map(v => v.escola))].filter(Boolean).sort().map(e => (
              <option key={String(e)} value={String(e)}>{String(e)}</option>
            ))}
          </select>

          {/* Filtro Técnico */}
          <select 
            value={filtroTecnicoTabela} 
            onChange={(e) => setFiltroTecnicoTabela(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold min-w-[180px] cursor-pointer"
          >
            <option value="Todos">👨‍🔧 Todos os Técnicos</option>
            {[...new Set(stats.filtradas.map(v => v.tecnico))].filter(Boolean).sort().map(t => (
              <option key={String(t)} value={String(t)}>{String(t)}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[11px] uppercase tracking-widest">
                <th className="py-4 px-4 font-bold">Código</th>
                <th className="py-4 px-4 font-bold">Escola</th>
                <th className="py-4 px-4 font-bold">Status</th>
                <th className="py-4 px-4 font-bold">Categoria</th>
                <th className="py-4 px-4 font-bold">Descrição / Resolução</th>
                <th className="py-4 px-4 font-bold">Técnico</th>
                <th className="py-4 px-4 font-bold">Aberto por</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/50">
              {chamadosTabela.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                    Nenhum chamado encontrado com estes filtros.
                  </td>
                </tr>
              ) : (
                chamadosTabela.slice(0, 100).map((v: any) => {
                  const statusNormalizado = (v.status || "").toLowerCase().trim();
                  const isVerde = statusNormalizado === 'realizada' || statusNormalizado === 'finalizado';
                  const isAmarelo = statusNormalizado === 'pendente';

                  return (
                    <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-4 text-blue-400 text-xs font-bold">
                        <button 
                          onClick={() => setChamadoSelecionado(v)}
                          className="hover:underline hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Ver detalhes completos"
                        >
                          {v.chamado || "N/A"}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-slate-200 font-bold">{v.escola}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                          isVerde 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : isAmarelo
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {v.status || "Pendente"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-300">{v.categoria}</span>
                          <span className="text-[10px] opacity-60 italic">{v.subcategoria}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400 max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <span className="truncate text-xs italic">" {v.descricao} "</span>
                          <span className="text-[10px] text-blue-500/80 truncate font-bold">R: {v.resolucao}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-200 font-bold">{v.tecnico}</td>
                      <td className="py-4 px-4 text-slate-500 text-xs">{v.abertura_por}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Glass>

      {/* MODAL SPLASH PAGE DE DETALHES DO CHAMADO */}
      {chamadoSelecionado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="bg-slate-900/80 border-b border-slate-800 p-6 sm:p-8 flex justify-between items-start">
               <div>
                 <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest">{chamadoSelecionado.categoria || "Geral"}</span>
                    <span className={`px-3 py-1 rounded text-xs font-black uppercase tracking-widest ${
                        (chamadoSelecionado.status || '').toLowerCase() === 'realizada' || (chamadoSelecionado.status || '').toLowerCase() === 'finalizado' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : (chamadoSelecionado.status || '').toLowerCase() === 'pendente' 
                        ? 'bg-amber-500/20 text-amber-500' 
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {chamadoSelecionado.status || "Pendente"}
                    </span>
                 </div>
                 <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    <span className="text-blue-500">{chamadoSelecionado.chamado || "N/A"}</span> • {chamadoSelecionado.escola}
                 </h2>
                 <p className="text-slate-500 font-mono text-xs sm:text-sm mt-2">
                    Técnico Atribuído: <span className="text-slate-300">{chamadoSelecionado.tecnico}</span> | Aberto por: <span className="text-slate-300">{chamadoSelecionado.abertura_por}</span>
                 </p>
               </div>
               <button onClick={() => setChamadoSelecionado(null)} className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all text-xl shrink-0">X</button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-col gap-6 flex">
               
               {/* Grade de Datas */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Data Abertura</p>
                    <p className="text-base sm:text-lg font-bold text-white">{formatarDataBR(chamadoSelecionado.data_abertura)}</p>
                 </div>
                 <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Data Prevista</p>
                    <p className="text-base sm:text-lg font-bold text-slate-300">{formatarDataBR(chamadoSelecionado.data_prevista)}</p>
                 </div>
                 <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Data Visita</p>
                    <p className="text-base sm:text-lg font-bold text-blue-400">{formatarDataBR(chamadoSelecionado.data_visita)}</p>
                 </div>
                 <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Data Finalização</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-400">{formatarDataBR(chamadoSelecionado.data_finalizacao)}</p>
                 </div>
               </div>

               {/* Infos Extras */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Urgência / Impacto</p>
                      <p className="text-lg font-bold text-white">
                         {chamadoSelecionado.urgencia || 'N/A'} <span className="text-slate-600 font-light mx-1">/</span> {chamadoSelecionado.impacto || 'N/A'}
                      </p>
                   </div>
                   <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Subcategoria</p>
                      <p className="text-lg font-bold text-white">{chamadoSelecionado.subcategoria || 'N/A'}</p>
                   </div>
               </div>

               {/* Textos Longos */}
               <div className="bg-[#020617] border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2"><span className="text-lg">📝</span> Descrição do Problema</p>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{chamadoSelecionado.descricao || 'Sem descrição detalhada registrada.'}</p>
               </div>

               <div className="bg-[#020617] border border-blue-900/30 p-6 rounded-2xl">
                  <p className="text-xs text-blue-400 uppercase font-black tracking-widest mb-3 flex items-center gap-2"><span className="text-lg">🛠️</span> Resolução Aplicada</p>
                  <p className="text-blue-100/80 leading-relaxed whitespace-pre-wrap text-sm font-medium">{chamadoSelecionado.resolucao || 'Sem resolução registrada para este chamado ainda.'}</p>
               </div>

            </div>

            {/* Rodapé Modal */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-end">
               <button onClick={() => setChamadoSelecionado(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {/* GARANTIA DE ESTILOS CSS PARA O SCROLL E ANIMAÇÃO */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">{title}</h3>}
      {children}
    </div>
  )
}

function KpiCard({ title, value, subtitle, color }: any) {
  const gradients: any = {
    blue: "from-blue-600/20 to-transparent border-blue-500/30",
    purple: "from-purple-600/20 to-transparent border-purple-500/30",
    yellow: "from-yellow-600/20 to-transparent border-yellow-500/30",
    emerald: "from-emerald-600/20 to-transparent border-emerald-500/30",
  }

  const textColors: any = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  }

  return (
    <div className={`bg-[#020617] border rounded-[2rem] p-7 shadow-2xl relative overflow-hidden transition-all hover:scale-[1.02] ${gradients[color]}`}>
      <div className={`absolute top-0 left-0 h-full w-1 bg-gradient-to-b ${color === 'blue' ? 'from-blue-500' : color === 'purple' ? 'from-purple-500' : color === 'yellow' ? 'from-yellow-500' : 'from-emerald-500'} to-transparent opacity-70`}></div>
      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">{title}</p>
      <p className="text-4xl text-white font-bold mb-2">
        {value}
      </p>
      <p className={`text-[11px] font-bold uppercase tracking-tight opacity-90 ${textColors[color]} bg-black/20 py-1 px-2 rounded-md inline-block`}>
        {subtitle}
      </p>
    </div>
  )
}