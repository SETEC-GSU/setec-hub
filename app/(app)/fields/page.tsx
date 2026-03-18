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

  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [tecnicoFiltro, setTecnicoFiltro] = useState("Todos")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: vData } = await supabase.from("fields_visitas").select("*")
      const { data: aData } = await supabase.from("fields_avaliacoes").select("*")
      setVisitas(vData || [])
      setAvaliacoes(aData || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const stats = useMemo(() => {
    // Filtragem e Ordenação Decrescente por Código
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
    ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)

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

    return {
      filtradas,
      totalVisitas: filtradas.length,
      tecnicosAtivos: rankingTecnicos.length,
      slaMedio,
      mediaAval,
      rankingTecnicos,
      rankingEscolas,
      graficoMes,
      coberturaEscolas: new Set(filtradas.map(v => v.escola)).size
    }
  }, [visitas, avaliacoes, tecnicoFiltro])

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
             <span className="text-blue-500">●</span> Inteligência Field
          </h2>
          <p className="text-slate-400 mt-1">Análise operacional e estratégica SETEC</p>
        </div>

        <select
          value={tecnicoFiltro}
          onChange={(e) => setTecnicoFiltro(e.target.value)}
          className="bg-[#020617] border border-slate-800 text-white rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-w-[260px] font-bold"
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
        <KpiCard title="Escolas" value={stats.coberturaEscolas + "/82"} subtitle="Atendidas" color="blue" />
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

      <div className="grid xl:grid-cols-2 gap-8">
        <Glass title="🏆 Performance por Técnico">
          <div className="divide-y divide-slate-800/50 mt-2">
            {stats.rankingTecnicos.slice(0, 5).map((t, i) => (
              <Link 
                href={`/fields/tecnico/${encodeURIComponent(t.nome)}`}
                key={t.nome} 
                className="flex items-center justify-between py-5 hover:bg-slate-800/30 px-4 rounded-2xl transition group"
              >
                <div className="flex items-center gap-5">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    {i + 1}
                  </span>
                  <span className="text-slate-100 group-hover:text-blue-400 font-bold transition-colors text-lg">{t.nome}</span>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 text-xl font-bold">{t.media}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.total} VISITAS</p>
                </div>
              </Link>
            ))}
          </div>
        </Glass>

        <Glass title="🚩 Escolas com Maior Demanda">
          <div className="divide-y divide-slate-800/50 mt-2">
            {stats.rankingEscolas.slice(0, 5).map((e: any) => (
              <div key={String(e[0])} className="flex items-center justify-between py-5 px-4">
                <span className="text-slate-200 font-bold truncate max-w-[280px]">{e[0]}</span>
                <span className="bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-[11px] font-bold border border-red-500/20">
                  {e[1]} CHAMADOS
                </span>
              </div>
            ))}
          </div>
        </Glass>
      </div>

      {/* TABELA DE CHAMADOS */}
      <Glass title="📋 Lista de Chamados Atendidos (Decrescente)">
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
              {stats.filtradas.slice(0, 100).map((v: any) => {
                const statusNormalizado = (v.status || "").toLowerCase().trim();
                const isVerde = statusNormalizado === 'realizada' || statusNormalizado === 'finalizado';
                const isAmarelo = statusNormalizado === 'pendente';

                return (
                  <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-4 text-blue-400 text-xs font-bold">{v.chamado || "N/A"}</td>
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
              })}
            </tbody>
          </table>
        </div>
      </Glass>
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