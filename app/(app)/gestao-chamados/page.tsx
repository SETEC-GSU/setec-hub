"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const slaMap: Record<string, number> = {
  critica: 2,
  alta: 4,
  media: 24,
  baixa: 48,
}

export default function GestaoChamadosPage() {

  const supabase = createClient()

  const [chamados, setChamados] = useState<any[]>([])

  // ⭐ ADICIONADO
  const [filtroStatus,setFiltroStatus] = useState("todos")
  const [filtroOrigem,setFiltroOrigem] = useState("todos")

  async function carregarChamados() {

    const { data } = await supabase
      .from("chamados")
      .select(`
        *,
        usuarios:analista_responsavel (nome)
      `)
      .order("created_at", { ascending: false })

    setChamados(data || [])

  }

  useEffect(() => {

    carregarChamados()

    supabase
      .from("chamados")
      .update({ visualizado_gestao: true })
      .eq("visualizado_gestao", false)

  }, [])

  // ⭐ REALTIME CORRIGIDO
  useEffect(() => {

    const channel = supabase
      .channel("realtime-chamados")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chamados"
        },
        () => {
          carregarChamados()
        }
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chamados"
        },
        () => {
          carregarChamados()
        }
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chamados"
        },
        () => {
          carregarChamados()
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [])

  async function atualizarStatus(id: string, status: string) {

    const payload: any = { status }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (status === "assumido") payload.analista_responsavel = user?.id
    if (status === "em_atendimento") payload.started_at = new Date()
    if (status === "resolvido") payload.resolved_at = new Date()

    if (status === "aberto") {
      payload.started_at = null
      payload.resolved_at = null
      payload.analista_responsavel = null
    }

    await supabase.from("chamados").update(payload).eq("id", id)

    carregarChamados()

  }

  async function atenderChamado(id: string) {

    await atualizarStatus(id, "em_atendimento")

    window.location.href = `/gestao-chamados/${id}`

  }

  function calcularSLA(c: any) {

    const horas = slaMap[c.prioridade] || 24

    const criado = new Date(c.created_at)

    const limite = new Date(criado.getTime() + horas * 3600000)

    const diff = limite.getTime() - Date.now()

    if (c.status === "resolvido") return "RESOLVIDO"

    if (diff <= 0) return "ATRASADO"

    const h = Math.floor(diff / 3600000)

    const m = Math.floor((diff % 3600000) / 60000)

    return `${h}h ${m}m`

  }

  function prioridadeColor(p: string) {

    if (p === "critica") return "bg-red-500/10 text-red-400"
    if (p === "alta") return "bg-orange-500/10 text-orange-400"
    if (p === "media") return "bg-yellow-500/10 text-yellow-400"
    if (p === "baixa") return "bg-blue-500/10 text-blue-400"

    return "bg-slate-500/10 text-slate-400"

  }

  function statusColor(s: string) {

    if (s === "aberto") return "bg-blue-500/10 text-blue-400"
    if (s === "assumido") return "bg-purple-500/10 text-purple-400"
    if (s === "em_atendimento") return "bg-yellow-500/10 text-yellow-400"
    if (s === "resolvido") return "bg-green-500/10 text-green-400"

    return "bg-slate-500/10 text-slate-400"

  }

  function formatarData(data: string) {

    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })

  }

  const chamadosFiltrados = chamados.filter((c) => {

    if(filtroStatus !== "todos" && c.status !== filtroStatus) return false

    if(filtroOrigem !== "todos" && c.origem !== filtroOrigem) return false

    return true

  })

  return (

    <div className="space-y-6">

      {/* HEADER COM FILTROS NA DIREITA */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de chamados</h1>
          <p className="text-slate-400 text-sm">Painel operacional SETEC</p>
        </div>

        <div className="flex gap-4">

          <select
          value={filtroStatus}
          onChange={(e)=>setFiltroStatus(e.target.value)}
          className="bg-[#020617] border border-slate-800 text-white px-4 py-2 rounded-lg">

            <option value="todos">Todos Status</option>
            <option value="aberto">Aberto</option>
            <option value="assumido">Assumido</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="resolvido">Resolvido</option>

          </select>

          <select
          value={filtroOrigem}
          onChange={(e)=>setFiltroOrigem(e.target.value)}
          className="bg-[#020617] border border-slate-800 text-white px-4 py-2 rounded-lg">

            <option value="todos">Todas origens</option>
            <option value="ure">URE</option>
            <option value="escola">Escola</option>

          </select>

        </div>

      </div>

      <div className="bg-[#020617] border border-slate-800 rounded-2xl overflow-hidden">

        <table className="w-full text-sm">

          <thead className="border-b border-slate-800 text-slate-400">

            <tr>
              <th className="px-6 py-4 text-left">ID</th>
              <th className="px-6 py-4 text-left">Título</th>
              <th className="px-6 py-4 text-left">Solicitante</th>
              <th className="px-6 py-4 text-left">Prioridade</th>
              <th className="px-6 py-4 text-left">SLA</th>
              <th className="px-6 py-4 text-left">Abertura</th>
              <th className="px-6 py-4 text-left">Responsável</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Ações</th>
            </tr>

          </thead>

          <tbody>

            {chamadosFiltrados.map((c) => {

              const sla = calcularSLA(c)

              return (

                <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-900/40">

                  <td className="px-6 py-4 text-slate-300">#{c.codigo}</td>

                  <td className="px-6 py-4 text-white font-medium">
                    <a href={`/gestao-chamados/${c.id}`} className="hover:text-blue-400">
                      {c.titulo}
                    </a>
                  </td>

                  <td className="px-6 py-4 text-slate-300 text-xs">
                    {c.solicitante_nome ?? "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${prioridadeColor(c.prioridade)}`}>
                      {c.prioridade}
                    </span>
                  </td>

                  <td className={`px-6 py-4 text-xs ${sla === "ATRASADO" ? "text-red-400 font-bold" : ""}`}>
                    {sla}
                  </td>

                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {formatarData(c.created_at)}
                  </td>

                  <td className="px-6 py-4 text-slate-300 text-xs">
                    {c.usuarios?.nome ?? "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 flex gap-2">

                    {c.status === "aberto" && (
                      <button onClick={() => atualizarStatus(c.id, "assumido")} className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">
                        Assumir
                      </button>
                    )}

                    {(c.status === "aberto" || c.status === "assumido") && (
                      <button
                        onClick={() => atenderChamado(c.id)}
                        className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs">
                        Atender
                      </button>
                    )}

                    {c.status !== "resolvido" && (
                      <button onClick={() => atualizarStatus(c.id, "resolvido")} className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">
                        Resolver
                      </button>
                    )}

                    {c.status === "resolvido" && (
                      <button onClick={() => atualizarStatus(c.id, "aberto")} className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs">
                        Reabrir
                      </button>
                    )}

                  </td>

                </tr>

              )

            })}

          </tbody>

        </table>

      </div>

    </div>

  )

}