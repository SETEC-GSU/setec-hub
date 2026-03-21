"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts"

// ⭐ TOOLTIP SEGURO
const SafeTooltip = ({ active, payload, label }: any) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  try {
    const titulo = label ? String(label) : String(payload[0]?.payload?.label || "Item");
    const valor = String(payload[0]?.value || 0);

    return (
      <div className="bg-[#0f172a] border border-slate-800 p-3 rounded-xl shadow-xl z-50 relative">
        <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{titulo}</p>
        <p className="text-white font-bold text-lg">{valor}</p>
      </div>
    );
  } catch (error) {
    return null; 
  }
};

export default function PainelChamados() {
  const supabase = createClient()

  // Estados dos Dados Brutos e Filtros
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([])
  const [filtroOrigem, setFiltroOrigem] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [listaOrigens, setListaOrigens] = useState<string[]>([])
  const [listaMeses, setListaMeses] = useState<string[]>([])

  // Estados dos Gráficos e Cards
  const [stats, setStats] = useState({
    total: 0,
    resolvidoGeral: 0,
    aberto: 0,
    atendimento: 0,
    resolvidoHoje: 0,
  })

  const [ranking, setRanking] = useState<any[]>([])
  const [meses, setMeses] = useState<any[]>([])
  const [origem, setOrigem] = useState<any[]>([])
  const [prioridade, setPrioridade] = useState<any[]>([])

  const extrairTextoSeguro = (valor: any, fallback: string): string => {
    if (!valor) return fallback;
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'object') {
      if (Array.isArray(valor)) return valor[0]?.nome || valor[0]?.name || fallback;
      return valor.nome || valor.name || valor.titulo || fallback;
    }
    return String(valor);
  };

  // 1. Busca no Banco de Dados
  async function carregar() {
    const { data, error } = await supabase.from("chamados").select("*")
      
    if (!data) {
      if (error) console.error("Erro ao buscar chamados:", error)
      return
    }

    setDadosBrutos(data)

    // Extrai listas únicas para popular os Selects dos filtros
    const origensUnicas = [...new Set(data.map((c: any) => extrairTextoSeguro(c.origem, "OUTROS").toUpperCase()))]
    const mesesUnicos = [...new Set(data.map((c: any) => {
      if (!c.created_at) return "";
      return new Date(c.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    }).filter(Boolean))]

    setListaOrigens(origensUnicas as string[])
    setListaMeses(mesesUnicos as string[])
  }

  useEffect(() => {
    carregar()
  }, [])

  // 2. Processamento dos Dados
  useEffect(() => {
    if (dadosBrutos.length === 0) return;

    let filtrados = dadosBrutos;

    // Aplica filtro de Origem
    if (filtroOrigem) {
      filtrados = filtrados.filter(c => extrairTextoSeguro(c.origem, "OUTROS").toUpperCase() === filtroOrigem);
    }

    // Aplica filtro de Mês
    if (filtroMes) {
      filtrados = filtrados.filter(c => {
        if (!c.created_at) return false;
        const mesDoChamado = new Date(c.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        return mesDoChamado === filtroMes;
      });
    }

    // --- RECALCULA CARDS ---
    const dataHoje = new Date()
    dataHoje.setHours(0, 0, 0, 0)

    setStats({
      total: filtrados.length,
      resolvidoGeral: filtrados.filter((c) => c.status === "resolvido").length,
      aberto: filtrados.filter((c) => c.status === "aberto").length,
      atendimento: filtrados.filter((c) => c.status === "em_atendimento").length,
      resolvidoHoje: filtrados.filter((c) => {
        if (!c.resolved_at) return false
        const resDate = new Date(c.resolved_at)
        resDate.setHours(0, 0, 0, 0)
        return resDate.getTime() === dataHoje.getTime()
      }).length,
    })

    // --- RECALCULA RANKING DE CATEGORIAS ---
    const mapaCat: any = {}
    filtrados.forEach((c) => {
      const cat = extrairTextoSeguro(c.categoria, "Não definida");
      mapaCat[cat] = (mapaCat[cat] || 0) + 1
    })
    setRanking(Object.keys(mapaCat).map((k) => ({ label: k, quantidade: mapaCat[k] })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8))

    // --- RECALCULA MESES ---
    const mesMap: any = {}
    filtrados.forEach((c) => {
      if (!c.created_at) return;
      const mes = new Date(c.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      mesMap[mes] = (mesMap[mes] || 0) + 1
    })
    setMeses(Object.keys(mesMap).map((k) => ({ label: k, quantidade: mesMap[k] })))

    // --- RECALCULA ORIGEM ---
    const origemMap: any = {}
    filtrados.forEach((c) => {
      const orig = extrairTextoSeguro(c.origem, "OUTROS").toUpperCase();
      origemMap[orig] = (origemMap[orig] || 0) + 1
    })
    setOrigem(Object.keys(origemMap).map((k) => ({ label: k, quantidade: origemMap[k] })))

    // --- RECALCULA PRIORIDADE ---
    const prioMap: any = {}
    filtrados.forEach((c) => {
      let prio = extrairTextoSeguro(c.prioridade, "Normal");
      prio = prio.charAt(0).toUpperCase() + prio.slice(1).toLowerCase();
      prioMap[prio] = (prioMap[prio] || 0) + 1
    })
    setPrioridade(Object.keys(prioMap).map((k) => ({ label: k, quantidade: prioMap[k] })))

  }, [dadosBrutos, filtroOrigem, filtroMes])

  const COLORS = ["#0ea5e9", "#d946ef", "#10b981", "#f59e0b"]
  const totalOrigem = origem.reduce((acc, cur) => acc + cur.quantidade, 0)

  return (
    <div className="space-y-6 pb-12">

      {/* HEADER + FILTROS (Responsivo) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-white">Painel Geral de Chamados - SETEC</h2>
          <p className="text-slate-400 text-sm">Visão operacional dos atendimentos SETEC</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={filtroOrigem} 
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Todas as Origens</option>
            {listaOrigens.map((orig: string) => (
              <option key={orig} value={orig}>{orig}</option>
            ))}
          </select>

          <select 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(e.target.value)}
            className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Todos os Meses</option>
            {listaMeses.map((mes: string) => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CARDS TOTAIS RESPONSIVOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card title="Total" value={stats.total} color="blue" />
        <Card title="Resolvidos Geral" value={stats.resolvidoGeral} color="emerald" />
        <Card title="Abertos" value={stats.aberto} color="yellow" />
        <Card title="Em atendimento" value={stats.atendimento} color="purple" />
        <Card title="Resolvidos Hoje" value={stats.resolvidoHoje} color="green" className="col-span-2 md:col-span-1" />
      </div>

      {/* GRID DE GRÁFICOS (1 coluna no celular, 2 no PC - SIMÉTRICO com 4 gráficos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. CATEGORIAS */}
        <Glass>
          <h3 className="mb-4 font-semibold text-white">Ranking de solicitações (Categorias)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ranking} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                width={120}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: '#1e293b' }} content={<SafeTooltip />} />
              <Bar dataKey="quantidade" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Glass>

        {/* 2. PRIORIDADE */}
        <Glass>
          <h3 className="mb-4 font-semibold text-white">Chamados por prioridade</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={prioridade}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip cursor={{ fill: '#1e293b' }} content={<SafeTooltip />} />
              <Bar dataKey="quantidade" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Glass>

        {/* 3. MESES */}
        <Glass>
          <h3 className="mb-4 font-semibold text-white">Chamados por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip cursor={{ fill: '#1e293b' }} content={<SafeTooltip />} />
              <Bar dataKey="quantidade" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </Glass>

        {/* 4. ORIGEM */}
        <Glass>
          <div className="flex flex-col h-full min-h-[300px]">
            <h3 className="mb-2 font-semibold text-white">Origem dos chamados</h3>
            
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={origem}
                    dataKey="quantidade"
                    nameKey="label"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={6}
                    animationDuration={800}
                  >
                    {origem.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<SafeTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4 pt-4 border-t border-slate-800/50">
              {origem.map((item, index) => {
                const percent = totalOrigem > 0 ? ((item.quantidade / totalOrigem) * 100).toFixed(1) : "0.0";
                return (
                  <div key={index} className="flex items-center gap-2 text-[10px] sm:text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-300 truncate" title={item.label}>{item.label}</span>
                    <span className="text-slate-400 ml-auto font-medium">{item.quantidade} ({percent}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Glass>

      </div>
    </div>
  )
}

function Glass({ children }: any) {
  return (
    <div className="bg-gradient-to-br from-[#020617] to-[#020617]/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg h-full flex flex-col w-full overflow-hidden">
      {children}
    </div>
  )
}

function Card({ title, value, color, className = "" }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", 
    red: "bg-red-500/10 border-red-500/30 text-red-400",
  }

  return (
    <div
      className={`p-4 md:p-5 rounded-2xl backdrop-blur-xl border shadow-lg transition hover:scale-[1.02] flex flex-col justify-center ${colors[color]} ${className}`}
    >
      <p className="text-slate-400 text-xs md:text-sm">{title}</p>
      <p className="text-2xl md:text-3xl font-black mt-1 tracking-tight truncate">{value}</p> 
    </div>
  )
}