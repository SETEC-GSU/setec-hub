"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"

export default function GestaoDemandasFields() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Dados do Banco
  const [escolas, setEscolas] = useState<any[]>([])
  const [demandas, setDemandas] = useState<any[]>([])

  // Estado do Formulário
  const [escolaSelecionada, setEscolaSelecionada] = useState("")
  const [tipo, setTipo] = useState("")
  const [urgencia, setUrgencia] = useState("Baixa")
  const [dataPrevista, setDataPrevista] = useState("")
  const [descricao, setDescricao] = useState("")
  const [salvando, setSalvando] = useState(false)
  
  // 🚀 NOVO: Estado para saber se estamos editando ou criando
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // Carrega os dados iniciais
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

  // Puxa o técnico dinamicamente
  const infoEscola = useMemo(() => {
    if (!escolaSelecionada) return null;
    return escolas.find(e => String(e.id) === String(escolaSelecionada))
  }, [escolaSelecionada, escolas])

  // KPIs Dinâmicos
  const stats = useMemo(() => {
    const pendentes = demandas.filter(d => d.status === "Pendente Atendimento").length
    const concluidas = demandas.filter(d => d.status === "Concluída").length
    const criticas = demandas.filter(d => d.urgencia === "Crítica" && d.status !== "Concluída").length
    return { total: demandas.length, pendentes, concluidas, criticas }
  }, [demandas])

  // 🚀 LÓGICA UNIFICADA: Salvar Novo OU Atualizar Existente
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!escolaSelecionada || !tipo || !descricao) return alert("Preencha os campos obrigatórios!")

    setSalvando(true)

    const payload: any = {
      escola_id: String(escolaSelecionada),
      escola_nome: infoEscola?.nome_escola || "Escola Desconhecida",
      tipo: tipo,
      descricao: descricao,
      urgencia: urgencia,
    }

    if (dataPrevista) {
      payload.data_prevista = dataPrevista;
    } else {
      payload.data_prevista = null; // Garante que limpe caso removam a data
    }

    if (editandoId) {
      // MODO EDIÇÃO (UPDATE)
      const { error } = await supabase.from("demandas_fields").update(payload).eq("id", editandoId)
      if (!error) {
        handleLimparFormulario();
        carregarDados();
      } else {
        alert(`ERRO AO ATUALIZAR:\n\n${error.message}`);
      }
    } else {
      // MODO CRIAÇÃO (INSERT)
      payload.status = "Pendente Atendimento"; // O status inicial só entra na criação
      const { error } = await supabase.from("demandas_fields").insert([payload])
      if (!error) {
        handleLimparFormulario();
        carregarDados();
      } else {
        alert(`ERRO AO SALVAR:\n\n${error.message}`);
      }
    }
    
    setSalvando(false)
  }

  // 🚀 Ação de Clicar em "Editar" no Card
  function handleEditarClick(demanda: any) {
    setEditandoId(demanda.id);
    setEscolaSelecionada(String(demanda.escola_id));
    setTipo(demanda.tipo);
    setUrgencia(demanda.urgencia);
    setDataPrevista(demanda.data_prevista || "");
    setDescricao(demanda.descricao);
    
    // Animação que sobe a tela suavemente para mostrar o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLimparFormulario() {
    setEditandoId(null);
    setEscolaSelecionada("");
    setTipo("");
    setUrgencia("Baixa");
    setDataPrevista("");
    setDescricao("");
  }

  // Concluir Demanda
  async function handleConcluir(id: string) {
    if(!window.confirm("Deseja marcar esta demanda como concluída?")) return;
    
    await supabase.from("demandas_fields")
      .update({ status: "Concluída", concluido_em: new Date().toISOString() })
      .eq("id", id)
      
    carregarDados()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B1120]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div></div>
  )

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto min-h-screen px-4 xl:px-0">
      
      {/* HEADER & KPIs */}
      <div className="flex flex-col gap-6 border-b border-slate-800/50 pb-8 pt-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <span className="text-cyan-500">●</span> Cadastro e controle de demandas - FIELD
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Abertura, triagem e resolução de demandas técnicas por Unidade Escolar.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-[#020617] border border-slate-800 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-white">{stats.total}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Total Registrado</span>
           </div>
           <div className="bg-gradient-to-t from-yellow-900/20 to-[#020617] border border-yellow-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-yellow-500">{stats.pendentes}</span>
              <span className="text-[10px] uppercase font-bold text-yellow-500/80 tracking-widest mt-1">Pendentes</span>
           </div>
           <div className="bg-gradient-to-t from-red-900/20 to-[#020617] border border-red-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-red-500">{stats.criticas}</span>
              <span className="text-[10px] uppercase font-bold text-red-500/80 tracking-widest mt-1">Urgência Crítica</span>
           </div>
           <div className="bg-gradient-to-t from-emerald-900/20 to-[#020617] border border-emerald-500/30 rounded-2xl px-5 py-4 flex flex-col items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-emerald-400">{stats.concluidas}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-500/80 tracking-widest mt-1">Concluídas</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO DE ABERTURA / EDIÇÃO */}
        <div className="xl:col-span-4 sticky top-6">
          <Glass title={editandoId ? "✏️ Editar Demanda" : "➕ Nova Demanda"} className={editandoId ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]" : ""}>
            <form onSubmit={handleSalvar} className="space-y-5">
              
              {/* Seleção de Escola */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Unidade Escolar *</label>
                <select 
                  required
                  value={escolaSelecionada}
                  onChange={(e) => setEscolaSelecionada(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-semibold"
                >
                  <option value="">Selecione a escola...</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome_escola}</option>)}
                </select>
              </div>

              {/* Badge do Técnico Dinâmico */}
              {infoEscola && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl shrink-0">👨‍🔧</div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-blue-500/70 tracking-widest">Técnico da Unidade</p>
                    <p className="text-sm font-bold text-blue-300">{infoEscola.tecnico_atribuido || "Nenhum técnico atribuído a esta unidade."}</p>
                  </div>
                </div>
              )}

              {/* Tipo e Urgência */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tipo *</label>
                  <select required value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm font-semibold">
                    <option value="">Selecione...</option>
                    <option value="Equipamentos">💻 Equipamentos</option>
                    <option value="Rede/Conectividade">🌐 Rede/Conectividade</option>
                    <option value="Suporte">🛠️ Suporte Geral</option>
                    <option value="URE">📦 URE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Urgência</label>
                  <select value={urgencia} onChange={(e) => setUrgencia(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm font-semibold">
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">🚨 Crítica</option>
                  </select>
                </div>
              </div>

              {/* Data Prevista */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Data Prevista de Visita (Opcional)</label>
                <input 
                  type="date" 
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm font-semibold"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Descrição do Problema *</label>
                <textarea 
                  required
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o que precisa ser feito na unidade..."
                  className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm font-semibold custom-scrollbar resize-none"
                />
              </div>

              {/* 🚀 BOTÕES DINÂMICOS (EDITAR / CANCELAR / SALVAR) */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={salvando}
                  className={`flex-1 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg ${
                    editandoId ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30'
                  }`}
                >
                  {salvando ? "Processando..." : (editandoId ? "Atualizar Demanda" : "Registrar Demanda")}
                </button>
                
                {editandoId && (
                  <button 
                    type="button" 
                    onClick={handleLimparFormulario}
                    className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all border border-slate-700"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </Glass>
        </div>

        {/* COLUNA DIREITA: LISTA DE DEMANDAS */}
        <div className="xl:col-span-8">
          <Glass title="📋 Fila de Atendimentos">
            <div className="space-y-4 max-h-[850px] overflow-y-auto pr-3 custom-scrollbar">
              {demandas.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <span className="text-5xl mb-4 block opacity-30">📭</span>
                  <p className="font-bold uppercase tracking-widest text-sm">Nenhuma demanda registrada</p>
                </div>
              ) : (
                demandas.map(demanda => {
                  const escolaAtual = escolas.find(e => String(e.id) === String(demanda.escola_id));
                  const tecnicoAtual = escolaAtual?.tecnico_atribuido || "Sem Atribuição";
                  const isConcluida = demanda.status === "Concluída";
                  const isSendoEditada = editandoId === demanda.id;

                  return (
                    <div key={demanda.id} className={`p-5 rounded-2xl border transition-all ${isSendoEditada ? 'border-blue-500 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : isConcluida ? 'bg-emerald-900/5 border-emerald-900/30 opacity-60' : 'bg-[#020617] border-slate-700 hover:border-cyan-500/50 shadow-md'}`}>
                      
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        
                        {/* Info Principal */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${isConcluida ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                              {demanda.status}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                              {demanda.tipo}
                            </span>
                            {demanda.urgencia === "Crítica" && !isConcluida && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded animate-pulse">
                                🚨 URGÊNCIA CRÍTICA
                              </span>
                            )}
                            {isSendoEditada && (
                              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                                ✏️ EDITANDO
                              </span>
                            )}
                          </div>
                          
                          <h3 className={`text-lg font-bold mb-1 ${isConcluida ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {demanda.escola_nome}
                          </h3>
                          <p className={`text-sm mb-4 line-clamp-2 ${isConcluida ? 'text-slate-500' : 'text-slate-300'}`}>
                            {demanda.descricao}
                          </p>

                          {/* Footer do Card */}
                          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
                            <div className="flex items-center gap-1.5 text-blue-400 bg-blue-900/20 px-2 py-1 rounded-md">
                              <span>👨‍🔧</span> {tecnicoAtual}
                            </div>
                            {demanda.data_prevista && (
                              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                                <span>📅</span> Previsto: {format(new Date(demanda.data_prevista + 'T00:00:00'), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 🚀 AÇÕES (EDITAR / CONCLUIR) */}
                        <div className="flex flex-row lg:flex-col items-center justify-end shrink-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6 gap-3">
                          {!isConcluida ? (
                            <>
                              <button 
                                onClick={() => handleEditarClick(demanda)}
                                className={`w-full text-center px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${isSendoEditada ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-800/50 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'}`}
                              >
                                {isSendoEditada ? "Editando..." : "✏️ Editar"}
                              </button>
                              <button 
                                onClick={() => handleConcluir(demanda.id)}
                                disabled={isSendoEditada}
                                className="w-full text-center bg-emerald-500/10 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-500 hover:text-white text-emerald-500 border border-emerald-500/30 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                              >
                                ✓ Concluir
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-end text-right justify-center h-full">
                              <span className="text-emerald-500 font-black text-3xl">✓</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                                Em {format(new Date(demanda.concluido_em), 'dd/MM/yy')}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Glass>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden h-full flex flex-col transition-all duration-300 ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 shrink-0">{title}</h3>}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  )
}