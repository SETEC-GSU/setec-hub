"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

const slaMap: Record<string, number> = {
  critica: 2,
  alta: 4,
  media: 24,
  baixa: 48,
}

export default function GestaoChamadosCommandCenter() {
  // =========================================================================
  // 1. LÓGICA 100% INTACTA - NENHUMA VÍRGULA ALTERADA
  // =========================================================================
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

  function calcularSLA(c: any) {
    if (c.status === "resolvido") return "RESOLVIDO"

    const horasSLA = slaMap[c.prioridade] || 24
    const criado = new Date(c.created_at)

    let limite = new Date(criado)
    let horasRestantes = horasSLA

    while (horasRestantes > 0) {
      limite.setTime(limite.getTime() + 3600000) 
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
    if (p === "critica") return "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
    if (p === "alta") return "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]"
    if (p === "media") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    if (p === "baixa") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    return "bg-slate-500/10 text-slate-400 border-slate-500/20"
  }

  function statusColor(s: string) {
    if (s === "aberto") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    if (s === "assumido") return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    if (s === "em_atendimento") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    if (s === "resolvido") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    return "bg-slate-500/10 text-slate-400 border-slate-500/20"
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo", day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'
    })
  }

  const chamadosFiltrados = chamados.filter((c) => {
    if(filtroStatus !== "todos" && c.status !== filtroStatus) return false
    if(filtroOrigem !== "todos" && c.origem !== filtroOrigem) return false
    return true
  })

  // =========================================================================
  // 2. DESIGN PREMIUM APRIMORADO (DASHBOARD ANALÍTICO)
  // =========================================================================

  const stats = {
    abertos: chamadosFiltrados.filter(c => c.status === "aberto").length,
    emAndamento: chamadosFiltrados.filter(c => c.status === "assumido" || c.status === "em_atendimento").length,
    atrasados: chamadosFiltrados.filter(c => calcularSLA(c) === "ATRASADO" && c.status !== "resolvido").length,
    resolvidos: chamadosFiltrados.filter(c => c.status === "resolvido").length,
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      
      {/* CABEÇALHO E ESTATÍSTICAS */}
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-start">
        
        {/* Título */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/20 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Live Updates
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Central de Chamados</h1>
          <p className="text-slate-400 text-sm">Gestão operacional de tickets e SLA da rede SETEC.</p>
        </div>

        {/* Cards de Estatísticas Rápidas (Agora com visual de "Glow" sutil) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full xl:w-auto">
          <div className="bg-gradient-to-b from-[#020617] to-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              📥 Aguardando
            </span>
            <span className="text-4xl font-black text-white">{stats.abertos}</span>
          </div>

          <div className="bg-gradient-to-b from-[#020617] to-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              ⚡ Em Progresso
            </span>
            <span className="text-4xl font-black text-white">{stats.emAndamento}</span>
          </div>

          <div className="bg-gradient-to-b from-[#020617] to-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group hover:border-red-500/50 transition-colors">
             {stats.atrasados > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              🔥 SLA Atrasado
            </span>
            <span className={`text-4xl font-black ${stats.atrasados > 0 ? 'text-red-500' : 'text-slate-300'}`}>{stats.atrasados}</span>
          </div>

          <div className="bg-gradient-to-b from-[#020617] to-slate-900/50 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              ✅ Resolvidos
            </span>
            <span className="text-4xl font-black text-white">{stats.resolvidos}</span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS MODERNIZADA */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#020617]/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl items-center shadow-lg">
        <div className="flex items-center gap-3 text-slate-400 px-2 w-full sm:w-auto shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
          <span className="text-sm font-bold uppercase tracking-widest">Filtros Ativos</span>
        </div>
        
        <div className="w-px h-8 bg-slate-800 hidden sm:block"></div>
        
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative w-full sm:w-48">
            <select
              value={filtroStatus}
              onChange={(e)=>setFiltroStatus(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 text-white px-4 py-2.5 pr-10 rounded-xl outline-none text-sm w-full focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm">
              <option value="todos">Todos os Status</option>
              <option value="aberto">Abertos</option>
              <option value="assumido">Assumidos</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="resolvido">Resolvidos</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
               <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>

          <div className="relative w-full sm:w-48">
            <select
              value={filtroOrigem}
              onChange={(e)=>setFiltroOrigem(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 text-white px-4 py-2.5 pr-10 rounded-xl outline-none text-sm w-full focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm">
              <option value="todos">Todas Origens</option>
              <option value="ure">Diretoria (URE)</option>
              <option value="escola">Escola</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
               <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE CHAMADOS - MODO APRIMORADO */}
      <div className="space-y-4">
        {chamadosFiltrados.length === 0 ? (
           <div className="bg-[#020617]/50 border border-slate-800 border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center">
             <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-800">
               <span className="text-4xl opacity-50 grayscale">📭</span>
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Fila Vazia</h3>
             <p className="text-slate-400 font-medium max-w-sm">Não há chamados que correspondam aos filtros selecionados. A operação está limpa!</p>
           </div>
        ) : (
          chamadosFiltrados.map((c) => {
            const sla = calcularSLA(c)
            const isAtrasado = sla === "ATRASADO" && c.status !== 'resolvido'

            return (
              <div key={c.id} className={`group bg-gradient-to-r from-[#020617] to-slate-900/40 border rounded-2xl p-5 flex flex-col lg:flex-row gap-6 items-start lg:items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${isAtrasado ? 'border-red-900/50 hover:border-red-500/50 bg-red-950/5' : 'border-slate-800 hover:border-slate-600'}`}>
                
                {/* 1. BLOCO IDENTIFICAÇÃO (ID + STATUS + PRIORIDADE) */}
                <div className="flex flex-row lg:flex-col gap-3 lg:gap-2 items-center lg:items-start w-full lg:w-36 shrink-0">
                  <span className="text-sm font-black text-slate-500 tracking-wider">#{c.codigo}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${prioridadeColor(c.prioridade)}`}>{c.prioridade}</span>
                    <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${statusColor(c.status)}`}>{c.status}</span>
                  </div>
                </div>

                {/* 2. BLOCO INFORMAÇÕES PRINCIPAIS (Com Avatar Refinado) */}
                <div className="flex-1 min-w-0 space-y-3 w-full border-l-0 lg:border-l border-slate-800 lg:pl-6">
                  <a href={`/gestao-chamados/${c.id}`} className="block text-lg font-bold text-white hover:text-cyan-400 transition-colors truncate pr-4">
                    {c.titulo}
                  </a>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2 bg-slate-900/50 py-1 px-2 rounded-lg border border-slate-800/50">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                        {c.nome_dono_seguro.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium text-slate-300">{c.nome_dono_seguro}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>🏢</span>
                      <span className="uppercase tracking-widest font-bold text-[10px]">{c.origem}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>🕒</span>
                      <span className="font-medium">{formatarData(c.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. BLOCO SLA E RESPONSÁVEL */}
                <div className="flex flex-row lg:flex-col justify-between lg:justify-center items-center lg:items-end w-full lg:w-40 shrink-0 bg-slate-900/30 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none">
                  <div className={`text-sm font-black flex items-center gap-2 ${isAtrasado ? 'text-red-500 animate-pulse bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20' : 'text-slate-300'}`}>
                    <span>⏱️</span> {sla}
                  </div>
                  <div className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span className="truncate max-w-[120px]" title={c.nome_analista_seguro}>Resp: {c.nome_analista_seguro}</span>
                  </div>
                </div>

                {/* 4. BLOCO AÇÕES (Botões Elevados) */}
                <div className="flex flex-wrap lg:flex-col justify-center gap-2 w-full lg:w-32 shrink-0 border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0 lg:pl-4">
                  {c.status === "aberto" && (
                    <button onClick={() => atualizarStatus(c.id, "assumido")} className="flex-1 lg:flex-none w-full px-4 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-bold transition-all">
                      Assumir
                    </button>
                  )}
                  {(c.status === "aberto" || c.status === "assumido") && (
                    <button onClick={() => atenderChamado(c.id)} className="flex-1 lg:flex-none w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.2)] text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02]">
                      Atender
                    </button>
                  )}
                  {c.status !== "resolvido" && (
                    <button onClick={() => atualizarStatus(c.id, "resolvido")} className="flex-1 lg:flex-none w-full px-4 py-2.5 rounded-xl bg-[#020617] hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all">
                      Resolver
                    </button>
                  )}
                  {c.status === "resolvido" && (
                    <button onClick={() => atualizarStatus(c.id, "aberto")} className="flex-1 lg:flex-none w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all">
                      Reabrir
                    </button>
                  )}
                </div>

              </div>
            )
          })
        )}
      </div>
    </div>
  )
}