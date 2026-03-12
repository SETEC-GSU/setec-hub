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
  Legend,
} from "recharts"

export default function PainelChamados() {
  const supabase = createClient()

  const [stats, setStats] = useState({
    total: 0,
    aberto: 0,
    atendimento: 0,
    resolvidoHoje: 0,
    criticos: 0,
  })

  const [ranking, setRanking] = useState<any[]>([])
  const [meses, setMeses] = useState<any[]>([])
  const [origem, setOrigem] = useState<any[]>([])
  const [prioridade, setPrioridade] = useState<any[]>([])

  async function carregar() {
    const { data } = await supabase.from("chamados").select("*")
    if (!data) return

    const hoje = new Date().toDateString()

    setStats({
      total: data.length,
      aberto: data.filter((c) => c.status === "aberto").length,
      atendimento: data.filter((c) => c.status === "em_atendimento").length,
      resolvidoHoje: data.filter(
        (c) => c.resolved_at && new Date(c.resolved_at).toDateString() === hoje
      ).length,
      criticos: data.filter((c) => c.prioridade === "critica").length,
    })

    const mapa: any = {}
    data.forEach((c) => {
      mapa[c.categoria] = (mapa[c.categoria] || 0) + 1
    })

    setRanking(
      Object.keys(mapa)
        .map((k) => ({ categoria: k, total: mapa[k] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
    )

    const mesMap: any = {}
    data.forEach((c) => {
      const mes = new Date(c.created_at).toLocaleDateString("pt-BR", {
        month: "2-digit",
        year: "numeric",
      })
      mesMap[mes] = (mesMap[mes] || 0) + 1
    })

    setMeses(Object.keys(mesMap).map((k) => ({ mes: k, total: mesMap[k] })))

    const origemMap: any = {}
    data.forEach((c) => {
      origemMap[c.origem] = (origemMap[c.origem] || 0) + 1
    })

    const origemArray = Object.keys(origemMap).map((k) => ({
      name: k,
      value: origemMap[k],
    }))

    setOrigem(origemArray)

    const prioMap: any = {}
    data.forEach((c) => {
      prioMap[c.prioridade] = (prioMap[c.prioridade] || 0) + 1
    })

    setPrioridade(
      Object.keys(prioMap).map((k) => ({
        prioridade: k,
        total: prioMap[k],
      }))
    )
  }

  useEffect(() => {
    carregar()
  }, [])

  const COLORS = ["#8B5CF6", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444"]

  const totalOrigem = origem.reduce((acc, cur) => acc + cur.value, 0)

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold text-white">Painel Geral de Chamados - SETEC</h2>
        <p className="text-slate-400 text-sm">
          Visão operacional dos atendimentos SETEC
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card title="Total" value={stats.total} color="blue" />
        <Card title="Abertos" value={stats.aberto} color="yellow" />
        <Card title="Em atendimento" value={stats.atendimento} color="purple" />
        <Card title="Resolvidos hoje" value={stats.resolvidoHoje} color="green" />
        <Card title="Críticos" value={stats.criticos} color="red" />
      </div>

      <div className="grid grid-cols-2 gap-6">

        <Glass>
          <h3 className="mb-4 font-semibold text-white">Ranking de solicitações</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ranking} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                dataKey="categoria"
                type="category"
                width={180}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Glass>

        <Glass>
          <h3 className="mb-4 font-semibold text-white">Chamados por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={meses}>
              <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Glass>

        <Glass>
          <h3 className="mb-4 font-semibold text-white">Origem dos chamados</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={origem}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                animationDuration={600}
              >
                {origem.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip
                formatter={(value: any) =>
                  `${value} (${((value / totalOrigem) * 100).toFixed(1)}%)`
                }
              />

              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                formatter={(value: any, entry: any) => {
                  const percent = ((entry.payload.value / totalOrigem) * 100).toFixed(1)
                  return `${value} — ${entry.payload.value} (${percent}%)`
                }}
                wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Glass>

        <Glass>
          <h3 className="mb-4 font-semibold text-white">Chamados por prioridade</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={prioridade}>
              <XAxis dataKey="prioridade" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Glass>

      </div>
    </div>
  )
}

function Glass({ children }: any) {
  return (
    <div className="bg-gradient-to-br from-[#020617] to-[#020617]/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-lg">
      {children}
    </div>
  )
}

function Card({ title, value, color }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
    red: "bg-red-500/10 border-red-500/30 text-red-400",
  }

  return (
    <div
      className={`p-5 rounded-2xl backdrop-blur-xl border shadow-lg transition hover:scale-[1.02] ${colors[color]}`}
    >
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}