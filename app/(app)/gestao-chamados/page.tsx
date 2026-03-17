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
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroOrigem, setFiltroOrigem] = useState("todos")

  async function carregarChamados() {
    const { data: chamadosData, error } = await supabase
      .from("chamados")
      .select(`
        *,
        usuarios:analista_responsavel (nome)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar chamados:", error)
      return
    }

    const listaChamados = chamadosData || []

    const idsUsuarios = [...new Set(listaChamados.map(c => c.usuario_id).filter(Boolean))]
    
    let mapaNomes: Record<string, string> = {}
    
    if (idsUsuarios.length > 0) {
      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select("id, nome")
        .in("id", idsUsuarios)

      if (usuariosData) {
        usuariosData.forEach(u => {
          mapaNomes[u.id] = u.nome
        })
      }
    }

    const dadosSeguros = listaChamados.map((c: any) => {
      let nomeDoAnalista = "-"
      if (c.usuarios) {
        nomeDoAnalista = Array.isArray(c.usuarios) ? (c.usuarios[0]?.nome || "-") : (c.usuarios.nome || "-")
      }

      return {
        ...c,
        nome_analista_seguro: nomeDoAnalista,
        nome_dono_seguro: mapaNomes[c.usuario_id] || "Desconhecido" 
      }
    })

    setChamados(dadosSeguros)
  }

  useEffect(() => {
    carregarChamados()

    supabase
      .from("chamados")
      .update({ visualizado_gestao: true })
      .eq("visualizado_gestao", false)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("realtime-chamados")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chamados" },
        () => carregarChamados()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chamados" },
        () => carregarChamados()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chamados" },
        () => carregarChamados()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function atualizarStatus(id: string, status: string) {
    const payload: any = { 
      status, 
      visualizado_pelo_usuario: false 
    }

    const { data: { user } } = await supabase.auth.getUser()

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

  // ⭐ NOVA LÓGICA DE SLA: Pula finais de semana!
  function calcularSLA(c: any) {
    if (c.status === "resolvido") return "RESOLVIDO"

    const horasSLA = slaMap[c.prioridade] || 24
    const criado = new Date(c.created_at)

    let limite = new Date(criado)
    let horasRestantes = horasSLA

    // Vai somando 1 hora de cada vez. Se for sábado (6) ou domingo (0), não desconta das horasRestantes.
    while (horasRestantes > 0) {
      limite.setTime(limite.getTime() + 3600000) // +1 hora em milissegundos
      if (limite.getDay() !== 0 && limite.getDay() !== 6) {
        horasRestantes--
      }
    }

    const diff = limite.getTime() - Date.now()

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de chamados</h1>
          <p className="text-slate-400 text-sm">Painel operacional SETEC</p>
        </div>

        <div className="flex gap-4">
          <select
          value={filtroStatus}
          onChange={(e)=>setFiltroStatus(e.target.value)}
          className="bg-[#020617] border border-slate-800 text-white px-4 py-2 rounded-lg outline-none">
            <option value="todos">Todos Status</option>
            <option value="aberto">Aberto</option>
            <option value="assumido">Assumido</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="resolvido">Resolvido</option>
          </select>

          <select
          value={filtroOrigem}
          onChange={(e)=>setFiltroOrigem(e.target.value)}
          className="bg-[#020617] border border-slate-800 text-white px-4 py-2 rounded-lg outline-none">
            <option value="todos">Todas origens</option>
            <option value="ure">URE</option>
            <option value="escola">Escola</option>
          </select>
        </div>
      </div>

      <div className="bg-[#020617] border border-slate-800 rounded-2xl overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-800 text-slate-400 whitespace-nowrap">
            <tr>
              <th className="px-4 py-4">ID</th>
              <th className="px-4 py-4">Criador</th>
              <th className="px-4 py-4">Título</th>
              <th className="px-4 py-4">Contato (Ficha)</th>
              <th className="px-4 py-4">Prioridade</th>
              <th className="px-4 py-4">SLA</th>
              <th className="px-4 py-4">Abertura</th>
              <th className="px-4 py-4">Responsável</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {chamadosFiltrados.map((c) => {
              const sla = calcularSLA(c)

              return (
                <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                  
                  <td className="px-4 py-4 text-slate-300 max-w-[100px] truncate" title={c.codigo}>
                    #{c.codigo}
                  </td>
                  
                  <td className="px-4 py-4">
                     <div className="text-white font-medium bg-slate-800/50 px-2 py-1 rounded max-w-[120px] truncate" title={c.nome_dono_seguro}>
                       {c.nome_dono_seguro}
                     </div>
                  </td>

                  <td className="px-4 py-4 text-white font-medium max-w-[200px] truncate" title={c.titulo}>
                    <a href={`/gestao-chamados/${c.id}`} className="hover:text-blue-400">
                      {c.titulo}
                    </a>
                  </td>
                  
                  <td className="px-4 py-4 text-slate-300 text-xs max-w-[120px] truncate" title={c.solicitante_nome}>
                    {c.solicitante_nome ?? "-"}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${prioridadeColor(c.prioridade)}`}>{c.prioridade}</span>
                  </td>
                  
                  {/* ⭐ A MÁGICA DO PISCA-PISCA: Adicionado "animate-pulse" aqui */}
                  <td className={`px-4 py-4 text-xs whitespace-nowrap ${sla === "ATRASADO" ? "text-red-500 font-bold animate-pulse" : ""}`}>
                    {sla}
                  </td>
                  
                  <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                    {formatarData(c.created_at)}
                  </td>
                  
                  <td className="px-4 py-4 text-slate-300 text-xs whitespace-nowrap max-w-[120px] truncate" title={c.nome_analista_seguro}>
                    {c.nome_analista_seguro}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(c.status)}`}>{c.status}</span>
                  </td>
                  
                  <td className="px-4 py-4 flex gap-2 whitespace-nowrap">
                    {c.status === "aberto" && (
                      <button onClick={() => atualizarStatus(c.id, "assumido")} className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs transition">
                        Assumir
                      </button>
                    )}
                    {(c.status === "aberto" || c.status === "assumido") && (
                      <button onClick={() => atenderChamado(c.id)} className="px-3 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs transition">
                        Atender
                      </button>
                    )}
                    {c.status !== "resolvido" && (
                      <button onClick={() => atualizarStatus(c.id, "resolvido")} className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs transition">
                        Resolver
                      </button>
                    )}
                    {c.status === "resolvido" && (
                      <button onClick={() => atualizarStatus(c.id, "aberto")} className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs transition">
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