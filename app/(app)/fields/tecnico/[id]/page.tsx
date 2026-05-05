"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

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

// 🚀 NOVO HELPER: Formatador seguro para as datas do Modal
function formatarDataBR(dateStr: string | null) {
  if (!dateStr) return "N/A"
  const d = parseDateLocal(dateStr)
  if (!d) return "N/A"
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) // Evita desvio de fuso
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function TecnicoPage() {
  const supabase = createClient()
  const params = useParams()
  const tecnico = decodeURIComponent(params.id as string)

  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [escolasAtribuidas, setEscolasAtribuidas] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  
  // 🚀 NOVO ESTADO: Controla a Splash Page (Modal)
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: vData } = await supabase.from("fields_visitas").select("*").eq("tecnico", tecnico)
      const { data: aData } = await supabase.from("fields_avaliacoes").select("*").eq("tecnico", tecnico)
      const { data: eData } = await supabase.from("escolas").select("nome_escola, cie").eq("tecnico_atribuido", tecnico).order('nome_escola')
      
      setVisitas(vData || [])
      setAvaliacoes(aData || [])
      setEscolasAtribuidas(eData || [])
      setLoading(false)
    }
    carregar()
  }, [tecnico])

  const stats = useMemo(() => {
    const ordenadas = [...visitas].sort((a, b) => {
      const codA = String(a.chamado || "");
      const codB = String(b.chamado || "");
      return codB.localeCompare(codA, undefined, { numeric: true });
    });

    const atendidos = visitas.filter(v => 
      ['realizada', 'finalizado'].includes(String(v.status || "").toLowerCase().trim())
    )

    const pendentes = visitas.filter(v => 
      String(v.status || "").toLowerCase().trim() === 'pendente'
    )

    // CORREÇÃO SLA: Fallback para data_visita se data_realizacao for null
    const visitasComFinalizacao = atendidos.filter(v => (v.data_realizacao || v.data_visita) && v.data_finalizacao)
    const somaDiasUteis = visitasComFinalizacao.reduce((acc, v) => {
        const dataInicio = v.data_realizacao || v.data_visita;
        return acc + calcBusinessDays(dataInicio, v.data_finalizacao);
    }, 0)
    const slaMedio = visitasComFinalizacao.length > 0 ? (somaDiasUteis / visitasComFinalizacao.length).toFixed(1) : "0.0"

    const mediaAval = avaliacoes.length 
      ? (avaliacoes.reduce((acc, a) => acc + Number(a.nota_media || 0), 0) / avaliacoes.length).toFixed(1)
      : "0.0"

    // CATEGORIAS PARA O GRÁFICO
    const catCount: any = {}
    visitas.forEach(v => { if(v.categoria) catCount[v.categoria] = (catCount[v.categoria] || 0) + 1 })
    const categorias = Object.entries(catCount).map(([name, value]) => ({ name, value: value as number }))

    const escolas = [...new Set(visitas.map(v => v.escola))].filter(Boolean)

    return {
      ordenadas,
      totalAtendidos: atendidos.length,
      totalPendentes: pendentes.length,
      slaMedio,
      mediaAval,
      escolasAtendidas: escolas,
      categorias,
      elogios: avaliacoes.map(a => a.elogios).filter(Boolean),
      sugestoes: avaliacoes.map(a => a.sugestoes).filter(Boolean),
      reclamacoes: avaliacoes.map(a => a.reclamacoes).filter(Boolean)
    }
  }, [visitas, avaliacoes])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="space-y-10">
      
      {/* HEADER */}
      <div>
        <h2 className="text-4xl text-white font-bold tracking-tight">
          <span className="text-blue-500">●</span> {tecnico}
        </h2>
        <p className="text-slate-400 mt-1">Análise de performance individual e histórico</p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Atendidos" value={stats.totalAtendidos} subtitle="Chamados concluídos" color="blue" />
        <KpiCard title="Pendentes" value={stats.totalPendentes} subtitle="Em aberto" color="yellow" />
        <KpiCard title="SLA Médio" value={stats.slaMedio + "d"} subtitle="Dias úteis" color="purple" />
        <KpiCard title="Avaliação" value={stats.mediaAval + " ⭐"} subtitle="Média feedback" color="emerald" />
      </div>

      {/* GRÁFICO DE PIZZA E FEEDBACKS */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* CAIXA DO GRÁFICO */}
        <div className="lg:col-span-1">
            <div className="p-8 border rounded-[2rem] bg-[#020617] border-slate-800 h-full flex flex-col">
                <h3 className="text-xs uppercase font-bold tracking-widest mb-6 text-slate-400">📦 Mix de Categorias</h3>
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <SimplePieChart data={stats.categorias} />
                </div>
            </div>
        </div>
        
        {/* CAIXAS DE FEEDBACK */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
            <FeedbackSection title="Elogios" color="emerald" items={stats.elogios} />
            <FeedbackSection title="Sugestões" color="yellow" items={stats.sugestoes} />
        </div>
      </div>

      <div className="grid lg:grid-cols-1 gap-8">
        <FeedbackSection title="Reclamações" color="red" items={stats.reclamacoes} />
      </div>

      {/* SESSÃO: GRID COM AS DUAS LISTAS DE ESCOLAS */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        <Glass 
          title={`📍 Escolas Atribuídas (${escolasAtribuidas.length})`} 
          rightElement={<PulseBadge count={escolasAtribuidas.length} />}
        >
          <div className="grid grid-cols-1 gap-3 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {escolasAtribuidas.length === 0 ? (
               <div className="text-center py-6">
                 <p className="text-slate-500 text-sm font-medium">Nenhuma escola oficialmente atribuída a este técnico no banco de dados.</p>
               </div>
            ) : (
              escolasAtribuidas.map((e, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800 p-4 rounded-2xl transition-colors">
                  <span className="text-slate-200 font-bold truncate max-w-[75%]">{e.nome_escola}</span>
                  <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20 shrink-0">
                    CIE: {e.cie || "N/A"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Glass>

        <Glass 
          title={`🏫 Histórico de Escolas Visitadas (${stats.escolasAtendidas.length})`} 
          rightElement={<PulseBadge count={stats.escolasAtendidas.length} />}
        >
          <div className="grid grid-cols-1 gap-3 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.escolasAtendidas.length === 0 ? (
               <div className="text-center py-6">
                 <p className="text-slate-500 text-sm font-medium">O técnico ainda não registrou chamados em nenhuma escola.</p>
               </div>
            ) : (
              stats.escolasAtendidas.map(e => (
                <div key={e} className="flex items-center bg-slate-800/20 border border-slate-800 p-4 rounded-2xl text-slate-300 font-medium">
                  <span className="mr-3 text-green-500">✓</span> {e}
                </div>
              ))
            )}
          </div>
        </Glass>
      </div>

      {/* HISTÓRICO DE ATENDIMENTOS */}
      <Glass title="📅 Histórico Completo">
        <div className="space-y-4 mt-4">
          {stats.ordenadas.map((v) => {
            const statusNorm = (v.status || "").toLowerCase().trim();
            const isVerde = statusNorm === 'realizada' || statusNorm === 'finalizado';
            const isAmarelo = statusNorm === 'pendente';
            const dataInicio = v.data_realizacao || v.data_visita;

            return (
              <div key={v.chamado} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-800/20 border border-slate-800 rounded-[2rem] group hover:bg-slate-800/30 transition-all">
                <div className="flex items-start md:items-center gap-6">
                  {/* 🚀 AQUI: O span virou um botão clicável para abrir a Splash Page */}
                  <button 
                    onClick={() => setChamadoSelecionado(v)}
                    className="text-blue-500 font-bold text-sm hover:underline hover:text-cyan-400 transition-colors text-left shrink-0"
                    title="Ver detalhes completos do chamado"
                  >
                    #{v.chamado}
                  </button>
                  
                  <div>
                    <p className="text-white font-bold text-lg leading-tight mb-1">{v.escola}</p>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">{v.categoria} | {v.subcategoria}</p>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-wrap md:flex-nowrap items-center gap-4 shrink-0">
                  {v.data_finalizacao && dataInicio && (
                    <span className="text-[10px] text-slate-500 font-bold px-3 py-1 bg-black/20 rounded-lg whitespace-nowrap">
                      SLA: {calcBusinessDays(dataInicio, v.data_finalizacao)}D ÚTEIS
                    </span>
                  )}
                  <span className={`px-4 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                    isVerde ? 'bg-emerald-500 text-black border-emerald-600' :
                    isAmarelo ? 'bg-yellow-500 text-black border-yellow-600' :
                    'bg-slate-700 text-slate-300 border-slate-600'
                  }`}>
                    {v.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Glass>
      
      {/* 🚀 MODAL SPLASH PAGE DE DETALHES DO CHAMADO */}
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

      {/* 🚀 GARANTIA DO SCROLL CSS E DA ANIMAÇÃO DO MODAL INJETADOS AQUI */}
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

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

function PulseBadge({ count }: { count: number }) {
  return (
    <div className="relative flex items-center justify-center group cursor-default">
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
      
      <div className="relative flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#020617] border border-cyan-500/50 text-white font-black text-xs shadow-xl transition-transform group-hover:scale-105">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
        {count} 
        <span className="text-cyan-400/80 tracking-widest uppercase text-[10px]">Total</span>
      </div>
    </div>
  )
}

function SimplePieChart({ data }: { data: any[] }) {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#facc15', '#ef4444', '#f97316', '#06b6d4'];
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  if (total === 0) return <div className="text-slate-600 text-xs italic">Sem dados</div>

  return (
    <div className="flex flex-col items-center w-full">
      {/* O GRÁFICO */}
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
          {data.map((slice, i) => {
            if (slice.value === total) {
              return <circle key={i} cx="0" cy="0" r="1" fill={colors[i % colors.length]} />;
            }
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            cumulativePercent += slice.value / total;
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;
            const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
            return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="#020617" strokeWidth="0.02" />;
          })}
          {/* Furo no meio para fazer o formato de Donut */}
          <circle cx="0" cy="0" r="0.7" fill="#020617" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
          <span className="text-2xl text-white font-black leading-none mt-1">{total}</span>
        </div>
      </div>

      {/* A LEGENDA */}
      <div className="mt-8 flex flex-wrap justify-center gap-2 w-full">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-800/30 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: colors[i % colors.length] }}></span>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
              {slice.name} <span className="text-slate-500 ml-0.5">({slice.value})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Glass({ children, title, rightElement }: any) {
  return (
    <div className="bg-[#020617] border border-slate-800 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden h-full flex flex-col">
      {(title || rightElement) && (
        <div className="flex justify-between items-center mb-6 shrink-0 gap-4">
          {title && <h3 className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em]">{title}</h3>}
          {rightElement && <div>{rightElement}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, color }: any) {
  const colors: any = {
    blue: "border-blue-500/30 from-blue-600/10 text-blue-400",
    purple: "border-purple-500/30 from-purple-600/10 text-purple-400",
    yellow: "border-yellow-500/30 from-yellow-600/10 text-yellow-400",
    emerald: "border-emerald-500/30 from-emerald-600/10 text-emerald-400",
  }
  return (
    <div className={`bg-[#020617] border rounded-[2rem] p-7 shadow-2xl bg-gradient-to-br to-transparent ${colors[color]}`}>
      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">{title}</p>
      <p className="text-4xl text-white font-bold mb-2 tracking-tighter">{value}</p>
      <p className="text-[10px] uppercase font-bold opacity-80">{subtitle}</p>
    </div>
  )
}

function FeedbackSection({ title, color, items }: any) {
  const bg = color === 'emerald' ? 'bg-emerald-500/5' : color === 'yellow' ? 'bg-yellow-500/5' : 'bg-red-500/5';
  const border = color === 'emerald' ? 'border-emerald-500/20' : color === 'yellow' ? 'border-yellow-500/20' : 'border-red-500/20';
  const text = color === 'emerald' ? 'text-emerald-400' : color === 'yellow' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={`p-8 border rounded-[2rem] bg-[#020617] ${border} h-full`}>
      <h3 className={`text-xs uppercase font-bold tracking-widest mb-6 ${text}`}>{title}</h3>
      <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
        {items.length === 0 ? (
          <p className="text-slate-600 text-sm italic">Nenhum registro encontrado</p>
        ) : (
          items.map((item: any, i: number) => (
            <div key={i} className={`p-4 rounded-xl border border-slate-800 text-slate-300 text-sm leading-relaxed`}>
              "{item}"
            </div>
          ))
        )}
      </div>
    </div>
  )
}