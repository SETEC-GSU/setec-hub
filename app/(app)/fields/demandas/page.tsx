"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"

// HELPER BLINDADO: Iniciais para os avatares (Impede crash se o nome vier vazio)
const getInitials = (name: string) => {
  if (!name || name === "Sem Técnico") return "⚠️";
  const clean = name.trim();
  if (!clean) return "⚠️";
  const parts = clean.split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.substring(0, 2).toUpperCase();
}

// HELPER PARA ORDENAÇÃO: Peso da urgência
const pesoUrgencia: Record<string, number> = {
  "Crítica": 4,
  "Alta": 3,
  "Média": 2,
  "Baixa": 1
};

export default function GestaoDemandasFields() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Dados do Banco
  const [escolas, setEscolas] = useState<any[]>([])
  const [demandas, setDemandas] = useState<any[]>([])

  // Filtros
  const [busca, setBusca] = useState("")
  const [filtroEscola, setFiltroEscola] = useState("Todos")
  const [filtroTecnico, setFiltroTecnico] = useState("Todos")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroTipo, setFiltroTipo] = useState("Todos")

  // Estado do Formulário
  const [escolaSelecionada, setEscolaSelecionada] = useState("")
  const [tipo, setTipo] = useState("")
  const [urgencia, setUrgencia] = useState("Baixa")
  const [dataPrevista, setDataPrevista] = useState("")
  const [descricao, setDescricao] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // ESTADO DO MODAL (Splash Page)
  const [demandaModal, setDemandaModal] = useState<any | null>(null)

  // Carrega os dados
  async function carregarDados() {
    const { data: dataEscolas } = await supabase.from("escolas").select("id, nome_escola, cie, tecnico_atribuido").order("nome_escola")
    const { data: dataDemandas } = await supabase.from("demandas_fields").select("*").order("created_at", { ascending: false })
    
    setEscolas(dataEscolas || [])
    setDemandas(dataDemandas || [])
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Puxa info da escola com base no nome digitado/selecionado (Datalist)
  const infoEscola = useMemo(() => {
    if (!escolaSelecionada) return null;
    return escolas.find(e => e.nome_escola === escolaSelecionada)
  }, [escolaSelecionada, escolas])

  const stats = useMemo(() => {
    const pendentes = demandas.filter(d => d.status === "Pendente Atendimento").length
    const concluidas = demandas.filter(d => d.status === "Concluída").length
    const criticas = demandas.filter(d => d.urgencia === "Crítica" && d.status !== "Concluída").length
    return { total: demandas.length, pendentes, concluidas, criticas }
  }, [demandas])

  const listaTecnicosFiltro = useMemo(() => {
    const nomes = new Set(escolas.map(e => e.tecnico_atribuido).filter(Boolean))
    return Array.from(nomes).sort()
  }, [escolas])

  // LÓGICA DE FILTROS BLINDADA + ORDENAÇÃO INTELIGENTE
  const demandasFiltradas = useMemo(() => {
    // 1. Filtragem
    const filtradas = demandas.filter(d => {
      const escolaRelacionada = escolas.find(e => String(e.id) === String(d.escola_id));
      const tecnico = escolaRelacionada?.tecnico_atribuido || "Sem Atribuição";
      
      const textoEscola = d.escola_nome || "";
      const textoDescricao = d.descricao || "";

      const matchBusca = textoEscola.toLowerCase().includes(busca.toLowerCase()) || 
                         textoDescricao.toLowerCase().includes(busca.toLowerCase());
                         
      const matchEscola = filtroEscola === "Todos" ? true : String(d.escola_id) === String(filtroEscola);
      const matchTecnico = filtroTecnico === "Todos" ? true : tecnico === filtroTecnico;
      const matchStatus = filtroStatus === "Todos" ? true : d.status === filtroStatus;
      const matchTipo = filtroTipo === "Todos" ? true : d.tipo === filtroTipo;
      
      return matchBusca && matchEscola && matchTecnico && matchStatus && matchTipo;
    });

    // 2. Ordenação (1º Pendentes vs Concluídas | 2º Urgência | 3º Data mais recente)
    return filtradas.sort((a, b) => {
      // Se um é concluído e o outro não, joga o concluído pro fim
      if (a.status !== b.status) {
        return a.status === "Concluída" ? 1 : -1;
      }
      
      // Se ambos são "Pendentes", ordena por urgência (Crítica > Alta > Média > Baixa)
      if (a.status === "Pendente Atendimento") {
        const pesoA = pesoUrgencia[a.urgencia] || 0;
        const pesoB = pesoUrgencia[b.urgencia] || 0;
        if (pesoA !== pesoB) {
          return pesoB - pesoA; // Maior peso primeiro
        }
      }

      // Se empatar em status e urgência, o mais recente ganha
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  }, [demandas, busca, filtroEscola, filtroTecnico, filtroStatus, filtroTipo, escolas])

  // DADOS PARA OS DASHBOARDS
  const chartCategoria = useMemo(() => {
    const tipos = ["Equipamentos", "Rede/Conectividade", "Suporte", "URE"]
    return tipos.map(t => ({ name: t, qtd: demandas.filter(d => d.tipo === t).length }))
  }, [demandas])

  const chartTecnico = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach(d => {
      const esc = escolas.find(e => String(e.id) === String(d.escola_id));
      const t = esc?.tecnico_atribuido || "S/ Atribuição";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, qtd]) => ({name, qtd})).sort((a,b) => b.qtd - a.qtd).slice(0, 10);
  }, [demandas, escolas])

  const chartEscola = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach(d => { 
      const nomeSafe = d.escola_nome || "Escola Desconhecida";
      counts[nomeSafe] = (counts[nomeSafe] || 0) + 1; 
    });
    return Object.entries(counts).map(([name, qtd]) => ({name, qtd})).sort((a,b) => b.qtd - a.qtd).slice(0, 10);
  }, [demandas])

  // Lógica de Salvar
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!infoEscola) return alert("Por favor, selecione uma escola válida da lista.")
    if (!tipo || !descricao) return alert("Preencha os campos obrigatórios!")

    setSalvando(true)
    const payload: any = {
      escola_id: String(infoEscola.id),
      escola_nome: infoEscola.nome_escola,
      tipo, descricao, urgencia,
      data_prevista: dataPrevista || null,
    }

    if (editandoId) {
      const { error } = await supabase.from("demandas_fields").update(payload).eq("id", editandoId)
      if (!error) { handleLimparFormulario(); carregarDados(); } else alert(`Erro: ${error.message}`);
    } else {
      payload.status = "Pendente Atendimento";
      const { error } = await supabase.from("demandas_fields").insert([payload])
      if (!error) { handleLimparFormulario(); carregarDados(); } else alert(`Erro: ${error.message}`);
    }
    setSalvando(false)
  }

  function handleEditarClick(demanda: any) {
    setEditandoId(demanda.id); 
    setEscolaSelecionada(demanda.escola_nome); // O Datalist usa o nome agora
    setTipo(demanda.tipo);
    setUrgencia(demanda.urgencia); 
    setDataPrevista(demanda.data_prevista || ""); 
    setDescricao(demanda.descricao || "");
  }

  function handleLimparFormulario() {
    setEditandoId(null); setEscolaSelecionada(""); setTipo(""); setUrgencia("Baixa"); setDataPrevista(""); setDescricao("");
  }

  async function handleConcluir(id: string) {
    if(!window.confirm("Deseja concluir esta demanda?")) return;
    await supabase.from("demandas_fields").update({ status: "Concluída", concluido_em: new Date().toISOString() }).eq("id", id)
    carregarDados()
  }

  // NOVA LÓGICA: REABRIR DEMANDA
  async function handleReabrir(id: string) {
    if(!window.confirm("Deseja reabrir esta demanda para atendimento?")) return;
    await supabase.from("demandas_fields").update({ status: "Pendente Atendimento", concluido_em: null }).eq("id", id)
    carregarDados()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B1120]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div></div>
  )

  return (
    <div className="space-y-8 pb-12 max-w-[1700px] mx-auto min-h-screen px-4 xl:px-0">
      
      {/* HEADER & KPIs MANTIDOS */}
      <div className="flex flex-col gap-6 border-b border-slate-800/50 pb-8 pt-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <span className="text-cyan-500">●</span> Cadastro e controle de demandas - FIELD
          </h1>
          <p className="text-slate-400 mt-2 text-base font-medium">Abertura, triagem e resolução de demandas técnicas por Unidade Escolar e por Técnico Field.</p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-[#020617] border border-slate-800 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-white">{stats.total}</span>
              <span className="text-xs uppercase font-bold text-slate-500 tracking-widest mt-1">Total Registrado</span>
           </div>
           <div className="bg-gradient-to-t from-yellow-900/20 to-[#020617] border border-yellow-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-yellow-500">{stats.pendentes}</span>
              <span className="text-xs uppercase font-bold text-yellow-500/80 tracking-widest mt-1">Pendentes</span>
           </div>
           <div className="bg-gradient-to-t from-red-900/20 to-[#020617] border border-red-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-red-500">{stats.criticas}</span>
              <span className="text-xs uppercase font-bold text-red-500/80 tracking-widest mt-1">Urgência Crítica</span>
           </div>
           <div className="bg-gradient-to-t from-emerald-900/20 to-[#020617] border border-emerald-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-emerald-400">{stats.concluidas}</span>
              <span className="text-xs uppercase font-bold text-emerald-500/80 tracking-widest mt-1">Concluídas</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO */}
        <div className="xl:col-span-4 h-[800px]">
          <Glass title={editandoId ? "✏️ Editar Demanda" : "➕ Nova Demanda"} className={editandoId ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]" : ""}>
            <div className="overflow-y-auto pr-2 custom-scrollbar h-full">
              <form onSubmit={handleSalvar} className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Unidade Escolar *</label>
                  <input 
                    required 
                    list="escolas-list"
                    placeholder="Digite para buscar a escola..."
                    value={escolaSelecionada} 
                    onChange={(e) => setEscolaSelecionada(e.target.value)} 
                    className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-4 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-semibold"
                  />
                  <datalist id="escolas-list">
                    {escolas.map(e => <option key={e.id} value={e.nome_escola} />)}
                  </datalist>
                </div>

                {infoEscola && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5 flex items-center gap-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl shrink-0">👨‍🔧</div>
                    <div>
                      <p className="text-xs uppercase font-black text-blue-500/70 tracking-widest mb-1">Técnico da Unidade</p>
                      <p className="text-lg font-bold text-blue-300">{infoEscola.tecnico_atribuido || "Nenhum técnico atribuído."}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo *</label>
                    <select required value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-4 outline-none focus:border-cyan-500 text-sm font-semibold">
                      <option value="">Selecione...</option>
                      <option value="Equipamentos">💻 Equipamentos</option>
                      <option value="Rede/Conectividade">🌐 Rede/Conectividade</option>
                      <option value="Suporte">🛠️ Suporte Geral</option>
                      <option value="URE">📦 URE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Urgência</label>
                    <select value={urgencia} onChange={(e) => setUrgencia(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-4 outline-none focus:border-cyan-500 text-sm font-semibold">
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">🚨 Crítica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Data Prevista de Visita</label>
                  <input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-4 outline-none focus:border-cyan-500 text-sm font-semibold" style={{ colorScheme: 'dark' }} />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Descrição do Problema *</label>
                  <textarea required rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o que precisa ser feito..." className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-4 outline-none focus:border-cyan-500 text-sm font-medium custom-scrollbar resize-none" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={salvando} className={`flex-1 text-white font-black uppercase tracking-widest text-sm py-5 rounded-xl transition-all shadow-lg ${editandoId ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30'}`}>
                    {salvando ? "Processando..." : (editandoId ? "Atualizar Demanda" : "Registrar Demanda")}
                  </button>
                  {editandoId && <button type="button" onClick={handleLimparFormulario} className="px-8 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest text-sm rounded-xl transition-all border border-slate-700">Cancelar</button>}
                </div>
              </form>
            </div>
          </Glass>
        </div>

        {/* COLUNA DIREITA: FILA ABSOLUTAMENTE FIXA */}
        <div className="xl:col-span-8 h-[800px] flex flex-col">
          <Glass title="📋 Fila de Atendimentos" className="flex-1">
            
            {/* 🚀 Filtros da Fila Ajustados (flex-1 para esticar sem deixar buracos) */}
            <div className="flex flex-wrap gap-3 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
               <input type="text" placeholder="Buscar texto..." value={busca} onChange={e => setBusca(e.target.value)} className="flex-[100%] md:flex-[2] min-w-[200px] bg-[#020617] border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500" />
               <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="flex-1 min-w-[150px] bg-[#020617] border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500">
                 <option value="Todos">Todos os Status</option>
                 <option value="Pendente Atendimento">Pendentes</option>
                 <option value="Concluída">Concluídas</option>
               </select>
               <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="flex-1 min-w-[150px] bg-[#020617] border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500">
                 <option value="Todos">Todos os Tipos</option>
                 <option value="Equipamentos">Equipamentos</option>
                 <option value="Rede/Conectividade">Rede/Conectividade</option>
                 <option value="Suporte">Suporte</option>
                 <option value="URE">URE</option>
               </select>
               <select value={filtroEscola} onChange={e => setFiltroEscola(e.target.value)} className="flex-1 min-w-[150px] bg-[#020617] border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500">
                 <option value="Todos">Todas Escolas</option>
                 {escolas.map(e => <option key={e.id} value={e.id}>{e.nome_escola}</option>)}
               </select>
               <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} className="flex-1 min-w-[150px] bg-[#020617] border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500">
                 <option value="Todos">Todos Técnicos</option>
                 {listaTecnicosFiltro.map(t => <option key={String(t)} value={String(t)}>{String(t)}</option>)}
               </select>
            </div>

            {/* A LISTA COM GRID CSS ESTRITO E ORDENADA */}
            <div className="space-y-3 overflow-y-auto pr-3 custom-scrollbar flex-1 pb-4">
              {demandasFiltradas.length === 0 ? (
                <div className="text-center py-20 text-slate-500"><span className="text-5xl mb-4 block opacity-30">📭</span><p className="font-bold uppercase tracking-widest text-sm">Nenhuma demanda encontrada</p></div>
              ) : (
                demandasFiltradas.map(demanda => {
                  const escolaAtual = escolas.find(e => String(e.id) === String(demanda.escola_id));
                  const tecnicoAtual = escolaAtual?.tecnico_atribuido || "Sem Atribuição";
                  const isConcluida = demanda.status === "Concluída";
                  const isSendoEditada = editandoId === demanda.id;

                  return (
                    <div key={demanda.id} className={`w-full grid grid-cols-1 md:grid-cols-[100px_1fr_160px_100px] gap-4 p-4 rounded-2xl border items-center transition-all ${isSendoEditada ? 'border-blue-500 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : isConcluida ? 'bg-emerald-900/5 border-emerald-900/30 opacity-60 hover:opacity-100' : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'}`}>
                      
                      {/* Coluna 1: Status */}
                      <div className="flex flex-col gap-2">
                         <span className={`px-2 py-1.5 rounded-lg text-xs text-center font-black uppercase tracking-widest ${isConcluida ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>{demanda.status}</span>
                         {demanda.urgencia === "Crítica" && !isConcluida && <span className="px-2 py-1.5 rounded-lg text-xs text-center font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-500 animate-pulse">Crítica</span>}
                      </div>

                      {/* Coluna 2: Informações */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button 
                            onClick={() => {
                              const escolaInfo = escolas.find(e => String(e.id) === String(demanda.escola_id));
                              setDemandaModal({ ...demanda, tecnicoAtual: escolaInfo?.tecnico_atribuido || "S/ Atribuição", cie: escolaInfo?.cie || "S/N" });
                            }} 
                            className={`text-base font-black truncate text-left transition-all hover:text-cyan-400 hover:underline underline-offset-4 decoration-cyan-500/50 ${isConcluida ? 'text-slate-500 line-through' : 'text-white'}`}
                            title="Clique para ver todos os detalhes"
                          >
                            {demanda.escola_nome}
                          </button>
                          <span className="text-[10px] shrink-0 font-bold text-slate-400 bg-[#020617] border border-slate-800 px-2 py-1 rounded-md">{demanda.tipo}</span>
                        </div>
                        <p className={`text-xs line-clamp-1 ${isConcluida ? 'text-slate-600' : 'text-slate-400'}`} title={demanda.descricao}>{demanda.descricao}</p>
                      </div>

                      {/* Coluna 3: Técnico e Data */}
                      <div className="flex flex-col gap-1.5 md:border-l md:border-slate-800 md:pl-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
                          <span className="text-base">👨‍🔧</span> <span className="truncate" title={tecnicoAtual}>{tecnicoAtual}</span>
                        </div>
                        {demanda.data_prevista && (
                          <div className="text-xs font-bold text-slate-500 bg-slate-900/50 px-2 py-1 rounded w-fit border border-slate-800">
                            📅 Prev: {format(new Date(demanda.data_prevista + 'T00:00:00'), 'dd/MM/yy')}
                          </div>
                        )}
                      </div>

                      {/* Coluna 4: Ações */}
                      <div className="flex flex-col gap-2">
                        {!isConcluida ? (
                          <>
                            <button onClick={() => handleEditarClick(demanda)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-[11px] font-black uppercase transition-all">Editar</button>
                            <button onClick={() => handleConcluir(demanda.id)} disabled={isSendoEditada} className="w-full bg-emerald-500/10 hover:bg-emerald-500 disabled:opacity-30 text-emerald-500 hover:text-white border border-emerald-500/30 py-2 rounded-lg text-[11px] font-black uppercase transition-all">Concluir</button>
                          </>
                        ) : (
                          // BOTÃO DE REABRIR DEMANDA
                          <div className="flex flex-col h-full justify-center gap-1">
                            <button onClick={() => handleReabrir(demanda.id)} className="w-full bg-slate-800/80 hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 border border-slate-700 hover:border-yellow-500/30 py-2 rounded-lg text-[11px] font-black uppercase transition-all group">
                              <span className="group-hover:hidden">Concluído</span>
                              <span className="hidden group-hover:inline">🔄 Reabrir</span>
                            </button>
                            <div className="text-[9px] text-slate-500 font-bold text-center uppercase tracking-widest">{format(new Date(demanda.concluido_em), 'dd/MM/yyyy')}</div>
                          </div>
                        )}
                      </div>

                    </div>
                  )
                })
              )}
            </div>
          </Glass>
        </div>
      </div>

      {/* DASHBOARDS BLINDADOS CONTRA CRASH E TEXTO MAIS CLARO */}
      <div className="mt-12 pt-8 border-t border-slate-800/50">
         <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 mb-8">
            <span className="text-cyan-500">📊</span> Dashboards Operacionais
         </h2>
         
         <div className="mb-8">
           <Glass title="Volume por Categoria">
              <div className="h-[300px] w-full mt-4">
                {demandas.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartCategoria} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#cbd5e1" fontSize={14} fontWeight={800} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px'}} />
                      <Bar dataKey="qtd" radius={[6, 6, 0, 0]} barSize={60}>
                        <LabelList dataKey="qtd" position="top" fill="#f8fafc" fontSize={16} fontWeight={900} />
                        {chartCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#06b6d4' : '#3b82f6'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 font-bold text-xs uppercase tracking-widest">Aguardando dados...</div>
                )}
              </div>
           </Glass>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Glass title="Carga por Técnico">
              <div className="h-[350px] w-full mt-4">
                {chartTecnico.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartTecnico} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={14} fontWeight={700} tickLine={false} axisLine={false} width={120} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px'}} />
                      <Bar dataKey="qtd" radius={[0, 6, 6, 0]} barSize={25} fill="#f59e0b">
                         <LabelList dataKey="qtd" position="right" fill="#fef3c7" fontSize={14} fontWeight={800} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 font-bold text-xs uppercase tracking-widest">Aguardando dados...</div>
                )}
              </div>
           </Glass>

           <Glass title="Volume por Unidade (Top 10)">
              <div className="h-[350px] w-full mt-4">
                {chartEscola.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartEscola} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={14} fontWeight={700} tickLine={false} axisLine={false} width={150} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px'}} />
                      <Bar dataKey="qtd" radius={[0, 6, 6, 0]} barSize={25} fill="#10b981">
                         <LabelList dataKey="qtd" position="right" fill="#d1fae5" fontSize={14} fontWeight={800} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 font-bold text-xs uppercase tracking-widest">Aguardando dados...</div>
                )}
              </div>
           </Glass>
         </div>
      </div>

      {/* SPLASH PAGE (MODAL DETALHADO) */}
      {demandaModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900/80 border-b border-slate-800 p-6 flex justify-between items-start">
               <div>
                 <div className="flex gap-2 mb-3">
                    <span className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest">{demandaModal.tipo}</span>
                    <span className={`px-3 py-1 rounded text-xs font-black uppercase tracking-widest ${demandaModal.status === 'Concluída' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>{demandaModal.status}</span>
                 </div>
                 <h2 className="text-4xl font-black text-white tracking-tight">{demandaModal.escola_nome}</h2>
                 <p className="text-slate-500 font-mono text-sm mt-1">CIE: {demandaModal.cie}</p>
               </div>
               <button onClick={() => setDemandaModal(null)} className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all text-xl">X</button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
               
               <div className="grid grid-cols-2 gap-6 mb-8">
                 <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Técnico Responsável</p>
                    <p className="text-xl font-bold text-blue-400 flex items-center gap-2">👨‍🔧 {demandaModal.tecnicoAtual}</p>
                 </div>
                 <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Nível de Urgência</p>
                    <p className={`text-xl font-bold flex items-center gap-2 ${demandaModal.urgencia === 'Crítica' ? 'text-red-500' : 'text-white'}`}>
                      {demandaModal.urgencia === 'Crítica' ? '🚨' : '📌'} {demandaModal.urgencia}
                    </p>
                 </div>
                 <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Criada em</p>
                    <p className="text-xl font-bold text-white">{format(new Date(demandaModal.created_at), 'dd/MM/yyyy HH:mm')}</p>
                 </div>
                 <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Previsão / Conclusão</p>
                    <p className="text-xl font-bold text-emerald-400">
                      {demandaModal.concluido_em ? `Concluído: ${format(new Date(demandaModal.concluido_em), 'dd/MM/yyyy')}` : demandaModal.data_prevista ? `Previsto: ${format(new Date(demandaModal.data_prevista + 'T00:00:00'), 'dd/MM/yyyy')}` : 'Sem previsão definida'}
                    </p>
                 </div>
               </div>

               <div className="bg-[#020617] border border-slate-800 p-6 rounded-2xl">
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-3">Descrição do Problema Reportado</p>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base">{demandaModal.descricao}</p>
               </div>

            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-end">
               <button onClick={() => setDemandaModal(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all">Fechar Detalhes</button>
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
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden h-full flex flex-col transition-all duration-300 ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-6 shrink-0">{title}</h3>}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  )
}