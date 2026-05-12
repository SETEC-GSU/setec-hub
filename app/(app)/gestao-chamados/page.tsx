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
  const supabase = createClient()
  const [chamados, setChamados] = useState<any[]>([])
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroOrigem, setFiltroOrigem] = useState("todos")

  // 🚀 NOVOS ESTADOS PARA O MODAL BONITÃO DE RESOLUÇÃO
  const [modalResolucao, setModalResolucao] = useState<{ id: string | null }>({ id: null })
  const [parecerTecnico, setParecerTecnico] = useState("")
  const [salvandoResolucao, setSalvandoResolucao] = useState(false)

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

  // 🚀 LÓGICA ATUALIZADA: Intercepta o clique em "Resolver" para abrir o Modal
  async function atualizarStatus(id: string, status: string) {
    // Se o técnico clicou em "Resolver", não faz o update agora. Abre o modal lindo!
    if (status === "resolvido") {
      setModalResolucao({ id })
      setParecerTecnico("") // Limpa caso tivesse algo antes
      return
    }

    // Se for outra ação (assumir, reabrir, etc), segue o fluxo normal sem modal
    const payload: any = { 
      status, 
      visualizado_pelo_usuario: false 
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (status === "assumido") payload.analista_responsavel = user?.id
    if (status === "em_atendimento") payload.started_at = new Date()

    if (status === "aberto") {
      payload.started_at = null
      payload.resolved_at = null
      payload.analista_responsavel = null
      payload.retorno_devolutivo = null // Limpa o retorno se reabrir
    }

    await supabase.from("chamados").update(payload).eq("id", id)
    carregarChamados()
  }

  // 🚀 NOVA FUNÇÃO: Disparada quando o técnico clica em "Finalizar Chamado" DENTRO do Modal
  async function confirmarResolucao() {
    if (!modalResolucao.id) return
    if (!parecerTecnico.trim()) {
      alert("⚠️ O parecer técnico é obrigatório para resolver o chamado.")
      return
    }

    setSalvandoResolucao(true)

    const payload = {
      status: "resolvido",
      resolved_at: new Date(),
      retorno_devolutivo: parecerTecnico,
      visualizado_pelo_usuario: false
    }

    await supabase.from("chamados").update(payload).eq("id", modalResolucao.id)
    
    setModalResolucao({ id: null })
    setParecerTecnico("")
    setSalvandoResolucao(false)
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

  const stats = {
    abertos: chamadosFiltrados.filter(c => c.status === "aberto").length,
    emAndamento: chamadosFiltrados.filter(c => c.status === "assumido" || c.status === "em_atendimento").length,
    atrasados: chamadosFiltrados.filter(c => calcularSLA(c) === "ATRASADO" && c.status !== "resolvido").length,
    resolvidos: chamadosFiltrados.filter(c => c.status === "resolvido").length,
  }

  const FilterPill = ({ label, value, currentFilter, setter }: any) => (
    <button
      onClick={() => setter(value)}
      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
        currentFilter === value 
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
          : 'bg-[#020617] text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-12">
      
      {/* ================= HEADER & ESTATÍSTICAS ================= */}
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-start">
        
        <div className="space-y-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Connection
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">SETEC <span className="text-cyan-500">Ticket</span></h1>
          <p className="text-slate-400 text-sm font-medium">Gestão operacional de tickets e SLA da rede SETEC.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full xl:w-auto">
          <div className="bg-[#020617] border border-slate-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors shadow-lg">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div> Abertos
            </span>
            <span className="text-5xl font-black text-white">{stats.abertos}</span>
          </div>

          <div className="bg-[#020617] border border-slate-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-yellow-500/50 transition-colors shadow-lg">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Em Progresso
            </span>
            <span className="text-5xl font-black text-white">{stats.emAndamento}</span>
          </div>

          <div className="bg-[#020617] border border-slate-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-red-500/50 transition-colors shadow-lg">
             {stats.atrasados > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${stats.atrasados > 0 ? 'bg-red-500 animate-pulse' : 'bg-red-600'}`}></div> SLA Atrasado
            </span>
            <span className={`text-5xl font-black ${stats.atrasados > 0 ? 'text-red-500' : 'text-slate-300'}`}>{stats.atrasados}</span>
          </div>

          <div className="bg-[#020617] border border-slate-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors shadow-lg">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Resolvidos
            </span>
            <span className="text-5xl font-black text-white">{stats.resolvidos}</span>
          </div>
        </div>
      </div>

      {/* ================= BARRA DE FILTROS ================= */}
      <div className="flex flex-col xl:flex-row gap-6 bg-slate-900/30 border border-slate-800 p-6 rounded-[2rem] items-start xl:items-center shadow-inner">
        <div className="flex items-center gap-3 text-slate-400 shrink-0">
          <span className="text-xl">🎛️</span>
          <span className="text-xs font-black uppercase tracking-widest">Painel de Triagem</span>
        </div>
        
        <div className="w-full xl:w-px h-px xl:h-10 bg-slate-800"></div>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full">
           <div className="flex flex-col gap-2">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status do Chamado</span>
             <div className="flex flex-wrap gap-2">
               <FilterPill label="Todos" value="todos" currentFilter={filtroStatus} setter={setFiltroStatus} />
               <FilterPill label="Abertos" value="aberto" currentFilter={filtroStatus} setter={setFiltroStatus} />
               <FilterPill label="Assumidos" value="assumido" currentFilter={filtroStatus} setter={setFiltroStatus} />
               <FilterPill label="Em Atendimento" value="em_atendimento" currentFilter={filtroStatus} setter={setFiltroStatus} />
               <FilterPill label="Resolvidos" value="resolvido" currentFilter={filtroStatus} setter={setFiltroStatus} />
             </div>
           </div>

           <div className="w-full sm:w-px h-px sm:h-12 bg-slate-800 hidden sm:block"></div>

           <div className="flex flex-col gap-2">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Origem</span>
             <div className="flex flex-wrap gap-2">
               <FilterPill label="Todas" value="todos" currentFilter={filtroOrigem} setter={setFiltroOrigem} />
               <FilterPill label="URE" value="ure" currentFilter={filtroOrigem} setter={setFiltroOrigem} />
               <FilterPill label="Escola" value="escola" currentFilter={filtroOrigem} setter={setFiltroOrigem} />
             </div>
           </div>
        </div>
      </div>

      {/* ================= LISTA DE CHAMADOS ================= */}
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
              <div key={c.id} className={`group bg-[#020617] border rounded-[2rem] p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center transition-all duration-300 hover:shadow-xl ${isAtrasado ? 'border-red-900/50 hover:border-red-500/50 bg-red-950/5' : 'border-slate-800 hover:border-slate-600'}`}>
                
                <div className="flex flex-row lg:flex-col gap-3 lg:gap-2 items-center lg:items-start w-full lg:w-36 shrink-0">
                  <span className="text-sm font-black text-slate-500 tracking-wider">#{c.codigo}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${prioridadeColor(c.prioridade)}`}>{c.prioridade}</span>
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${statusColor(c.status)}`}>{c.status}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-3 w-full border-l-0 lg:border-l border-slate-800 lg:pl-6">
                  <a href={`/gestao-chamados/${c.id}`} className="block text-xl font-black text-white hover:text-cyan-400 transition-colors truncate pr-4">
                    {c.titulo}
                  </a>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2 bg-slate-900/80 py-1.5 px-3 rounded-xl border border-slate-800 text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                        {c.nome_dono_seguro.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-bold max-w-[150px]">{c.nome_dono_seguro}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="text-base">🏢</span>
                      <span className="uppercase tracking-widest font-black text-[10px]">{c.origem}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="text-base">🕒</span>
                      <span className="font-bold">{formatarData(c.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col justify-between lg:justify-center items-center lg:items-end w-full lg:w-48 shrink-0 bg-slate-900/30 lg:bg-transparent p-4 lg:p-0 rounded-2xl lg:rounded-none">
                  <div className={`text-sm font-black flex items-center gap-2 ${isAtrasado ? 'text-red-500 animate-pulse bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20' : 'text-green-400'}`}>
                    <span>⏱️</span> SLA: {sla}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1.5">
                    <span className="text-base">👨‍💻</span>
                    <span className="truncate max-w-[120px] font-bold" title={c.nome_analista_seguro}>{c.nome_analista_seguro}</span>
                  </div>
                </div>

                <div className="flex flex-wrap lg:flex-col justify-center gap-2 w-full lg:w-36 shrink-0 border-t lg:border-t-0 border-slate-800 pt-5 lg:pt-0 lg:pl-6">
                  {c.status === "aberto" && (
                    <button onClick={() => atualizarStatus(c.id, "assumido")} className="flex-1 lg:flex-none w-full px-4 py-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 text-[11px] font-black uppercase tracking-widest transition-all">
                      Assumir
                    </button>
                  )}
                  {(c.status === "aberto" || c.status === "assumido") && (
                    <button onClick={() => atenderChamado(c.id)} className="flex-1 lg:flex-none w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-yellow-950 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105">
                      Atender
                    </button>
                  )}
                  {c.status !== "resolvido" && (
                    <button onClick={() => atualizarStatus(c.id, "resolvido")} className="flex-1 lg:flex-none w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-widest transition-all">
                      Resolver
                    </button>
                  )}
                  {c.status === "resolvido" && (
                    <button onClick={() => atualizarStatus(c.id, "aberto")} className="flex-1 lg:flex-none w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-black uppercase tracking-widest transition-all">
                      Reabrir
                    </button>
                  )}
                </div>

              </div>
            )
          })
        )}
      </div>

      {/* 🚀 MODAL BONITÃO DE RESOLUÇÃO */}
      {modalResolucao.id && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            
            <div className="p-8 border-b border-slate-800 bg-emerald-500/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <h3 className="text-3xl font-black text-white flex items-center gap-3">
                <span className="text-4xl">✅</span> Concluir Chamado
              </h3>
              <p className="text-emerald-400/80 mt-2 text-sm font-medium">Forneça o Parecer Técnico Final (Retorno Devolutivo) para encerrar oficialmente este protocolo. O usuário será notificado.</p>
            </div>
            
            <div className="p-8 bg-[#020617]">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Descrição da Solução Aplicada *</label>
              <textarea
                value={parecerTecnico}
                onChange={(e) => setParecerTecnico(e.target.value)}
                placeholder="Ex: Foi realizada a substituição do cabo de rede defeituoso e a porta do switch reconfigurada. Equipamento validado e operando normalmente..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 resize-none h-40 custom-scrollbar leading-relaxed"
              ></textarea>
            </div>
            
            <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
              <button 
                disabled={salvandoResolucao} 
                onClick={() => setModalResolucao({id: null})} 
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={salvandoResolucao} 
                onClick={confirmarResolucao} 
                className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
              >
                {salvandoResolucao ? "Registrando..." : "Finalizar Chamado"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }
        .animate-fade-in { animation: fadeIn 0.2s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

    </div>
  )
}