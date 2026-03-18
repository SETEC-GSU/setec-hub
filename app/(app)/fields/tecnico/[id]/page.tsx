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

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function TecnicoPage() {
  const supabase = createClient()
  const params = useParams()
  const tecnico = decodeURIComponent(params.id as string)

  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: vData } = await supabase.from("fields_visitas").select("*").eq("tecnico", tecnico)
      const { data: aData } = await supabase.from("fields_avaliacoes").select("*").eq("tecnico", tecnico)
      setVisitas(vData || [])
      setAvaliacoes(aData || [])
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

      {/* KPI GRID (Original Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Atendidos" value={stats.totalAtendidos} subtitle="Chamados concluídos" color="blue" />
        <KpiCard title="Pendentes" value={stats.totalPendentes} subtitle="Em aberto" color="yellow" />
        <KpiCard title="SLA Médio" value={stats.slaMedio + "d"} subtitle="Dias úteis" color="purple" />
        <KpiCard title="Avaliação" value={stats.mediaAval + " ⭐"} subtitle="Média feedback" color="emerald" />
      </div>

      {/* NOVO: GRÁFICO DE PIZZA (Design Preservado) */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
            <Glass title="📦 Mix de Categorias">
                <div className="flex flex-col items-center py-4">
                    <SimplePieChart data={stats.categorias} />
                </div>
            </Glass>
        </div>
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
            <FeedbackSection title="Elogios" color="emerald" items={stats.elogios} />
            <FeedbackSection title="Sugestões" color="yellow" items={stats.sugestoes} />
        </div>
      </div>

      <div className="grid lg:grid-cols-1 gap-8">
        <FeedbackSection title="Reclamações" color="red" items={stats.reclamacoes} />
      </div>

      {/* ESCOLAS ATENDIDAS */}
      <Glass title="🏫 Escolas Atendidas">
        <div className="grid md:grid-cols-3 gap-4 mt-2">
          {stats.escolasAtendidas.map(e => (
            <div key={e} className="bg-slate-800/20 border border-slate-800 p-4 rounded-2xl text-slate-200 font-medium">
              {e}
            </div>
          ))}
        </div>
      </Glass>

      {/* HISTÓRICO DE ATENDIMENTOS */}
      <Glass title="📅 Histórico Completo (Decrescente)">
        <div className="space-y-4 mt-4">
          {stats.ordenadas.map((v) => {
            const statusNorm = (v.status || "").toLowerCase().trim();
            const isVerde = statusNorm === 'realizada' || statusNorm === 'finalizado';
            const isAmarelo = statusNorm === 'pendente';
            const dataInicio = v.data_realizacao || v.data_visita;

            return (
              <div key={v.chamado} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-800/20 border border-slate-800 rounded-[2rem] group hover:bg-slate-800/30 transition-all">
                <div className="flex items-center gap-6">
                  <span className="text-blue-500 font-bold text-sm">#{v.chamado}</span>
                  <div>
                    <p className="text-white font-bold text-lg">{v.escola}</p>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">{v.categoria} | {v.subcategoria}</p>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center gap-4">
                  {v.data_finalizacao && dataInicio && (
                    <span className="text-[10px] text-slate-500 font-bold px-3 py-1 bg-black/20 rounded-lg">
                      SLA: {calcBusinessDays(dataInicio, v.data_finalizacao)}D ÚTEIS
                    </span>
                  )}
                  <span className={`px-4 py-1 rounded-full text-[10px] font-bold border ${
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
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

function SimplePieChart({ data }: { data: any[] }) {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#facc15', '#ef4444'];
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  if (total === 0) return <div className="text-slate-600 text-xs italic">Sem dados</div>

  return (
    <div className="relative w-48 h-48">
      <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
        {data.map((slice, i) => {
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += slice.value / total;
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;
          const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
          return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="#020617" strokeWidth="0.02" />;
        })}
        <circle cx="0" cy="0" r="0.7" fill="#020617" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] text-slate-500 font-bold uppercase">Total</span>
        <span className="text-2xl text-white font-bold">{total}</span>
      </div>
    </div>
  );
}

function Glass({ children, title }: any) {
  return (
    <div className="bg-[#020617] border border-slate-800 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden h-full">
      {title && <h3 className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em] mb-6">{title}</h3>}
      {children}
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
      <div className="space-y-3">
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