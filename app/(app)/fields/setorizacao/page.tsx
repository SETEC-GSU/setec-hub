"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"

export default function SetorizacaoPage() {
  const supabase = createClient()

  const [escolas, setEscolas] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de UI e Filtros
  const [buscaEscola, setBuscaEscola] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "pendentes" | "atribuidas">("todas")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  
  // Estado para novo técnico
  const [novoTecnicoNome, setNovoTecnicoNome] = useState("")
  const [salvandoTecnico, setSalvandoTecnico] = useState(false)

  async function carregarDados() {
    const { data: dataTecnicos } = await supabase
      .from("tecnicos")
      .select("*")
      .order("nome")
    
    const { data: dataEscolas } = await supabase
      .from("escolas")
      .select("id, nome_escola, cie, tecnico_atribuido")
      .order("nome_escola")

    setTecnicos(dataTecnicos || [])
    setEscolas(dataEscolas || [])
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function handleAtribuirTecnico(escolaId: string, novoTecnico: string) {
    setSavingId(escolaId)
    
    const { error } = await supabase
      .from("escolas")
      .update({ tecnico_atribuido: novoTecnico })
      .eq("id", escolaId)

    if (!error) {
      setEscolas(escolas.map(e => e.id === escolaId ? { ...e, tecnico_atribuido: novoTecnico } : e))
      setSuccessId(escolaId)
      setTimeout(() => setSuccessId(null), 2000)
    } else {
      alert("Erro ao atribuir técnico. Verifique sua conexão.")
    }
    
    setSavingId(null)
  }

  async function handleAdicionarTecnico(e: React.FormEvent) {
    e.preventDefault()
    if (!novoTecnicoNome.trim()) return

    setSalvandoTecnico(true)
    const { error } = await supabase
      .from("tecnicos")
      .insert([{ nome: novoTecnicoNome.trim(), ativo: true }])

    if (!error) {
      setNovoTecnicoNome("")
      carregarDados() 
    }
    setSalvandoTecnico(false)
  }

  async function handleToggleStatusTecnico(id: string, statusAtual: boolean) {
    await supabase
      .from("tecnicos")
      .update({ ativo: !statusAtual })
      .eq("id", id)
    carregarDados()
  }

  async function handleRemoverTecnico(id: string, nome: string) {
    if (!window.confirm(`Tem certeza que deseja remover definitivamente o técnico(a) ${nome}?`)) return;
    
    await supabase
      .from("tecnicos")
      .delete()
      .eq("id", id)
      
    carregarDados()
  }

  // 🚀 UPGRADE 1: CÁLCULO DE CARGA DE TRABALHO
  const contagemPorTecnico = useMemo(() => {
    const contagem: Record<string, number> = {};
    escolas.forEach(e => {
      if (e.tecnico_atribuido) {
        contagem[e.tecnico_atribuido] = (contagem[e.tecnico_atribuido] || 0) + 1;
      }
    });
    return contagem;
  }, [escolas]);

  // 🚀 UPGRADE 2: PROGRESSO DA SETORIZAÇÃO
  const escolasAtribuidas = escolas.filter(e => e.tecnico_atribuido).length;
  const progresso = escolas.length > 0 ? Math.round((escolasAtribuidas / escolas.length) * 100) : 0;

  const tecnicosAtivos = tecnicos.filter(t => t.ativo)
  const mediaIdeal = Math.ceil(escolas.length / (tecnicosAtivos.length || 1))

  // 🚀 UPGRADE 3: FILTRO INTELIGENTE DE ESCOLAS
  const escolasFiltradas = escolas.filter(e => {
    const matchBusca = e.nome_escola?.toLowerCase().includes(buscaEscola.toLowerCase()) || e.cie?.toLowerCase().includes(buscaEscola.toLowerCase());
    
    if (filtroStatus === "pendentes") return matchBusca && !e.tecnico_atribuido;
    if (filtroStatus === "atribuidas") return matchBusca && !!e.tecnico_atribuido;
    return matchBusca;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B1120]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
    </div>
  )

  return (
    <div className="space-y-10 pb-12 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
             <span className="text-blue-500">●</span> Setorização SETEC
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
            Painel executivo de atribuição de técnicos por Unidade Escolar. As alterações refletem instantaneamente no ecossistema de chamados.
          </p>
        </div>
        
        {/* BARRA DE PROGRESSO GLOBAL */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 min-w-[300px]">
           <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso da Rede</span>
              <span className="text-xl font-black text-white">{progresso}%</span>
           </div>
           <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progresso}%` }}></div>
           </div>
           <p className="text-[10px] text-slate-500 mt-2 font-semibold">
              {escolasAtribuidas} de {escolas.length} escolas com técnicos definidos.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: GESTÃO DE TÉCNICOS */}
        <div className="xl:col-span-1 space-y-6">
          <Glass title="👨‍🔧 Gerenciar Equipe (Fields)">
            
            <form onSubmit={handleAdicionarTecnico} className="flex gap-2 mb-8">
              <input 
                type="text" 
                placeholder="Nome do novo técnico..." 
                value={novoTecnicoNome}
                onChange={(e) => setNovoTecnicoNome(e.target.value)}
                className="flex-1 bg-slate-900/50 border border-slate-700/50 text-white rounded-xl px-5 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-semibold placeholder:text-slate-600 shadow-inner"
              />
              <button 
                type="submit" 
                disabled={salvandoTecnico || !novoTecnicoNome.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all shrink-0 shadow-lg shadow-blue-900/20"
              >
                {salvandoTecnico ? "..." : "Add"}
              </button>
            </form>

            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
              {tecnicos.length === 0 ? (
                 <p className="text-slate-500 text-sm text-center py-10 italic">Nenhum técnico cadastrado ou tabela bloqueada pelo RLS do Supabase.</p>
              ) : (
                tecnicos.map(tec => {
                  const carga = contagemPorTecnico[tec.nome] || 0;
                  const isSobrecarga = carga > mediaIdeal + 2;

                  return (
                    <div key={tec.id} className={`group relative flex flex-col p-5 rounded-[1.5rem] border transition-all duration-300 ${tec.ativo ? 'bg-gradient-to-br from-slate-800/40 to-slate-900/40 border-slate-700/60 hover:border-slate-600' : 'bg-red-950/10 border-red-900/20 opacity-70'}`}>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className={`font-bold text-base tracking-tight ${tec.ativo ? 'text-white' : 'text-slate-500 line-through'}`}>{tec.nome}</p>
                          <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mt-1 ${tec.ativo ? 'text-emerald-400' : 'text-red-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tec.ativo ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                            {tec.ativo ? 'Em Rota Ativa' : 'Inativo / Ausente'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* 🚀 TERMÔMETRO DE CARGA (BADGE) */}
                          {tec.ativo && (
                            <div className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg border ${isSobrecarga ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-900 border-slate-700 text-blue-400'}`} title={`Média ideal: ${mediaIdeal}`}>
                               <span className="text-lg font-black leading-none">{carga}</span>
                               <span className="text-[8px] uppercase font-bold tracking-widest">Escolas</span>
                            </div>
                          )}

                          {/* BOTAO DE LIXEIRA */}
                          <button 
                            onClick={() => handleRemoverTecnico(tec.id, tec.nome)}
                            className="text-slate-600 hover:text-red-500 transition-colors p-1"
                            title="Remover Técnico"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleToggleStatusTecnico(tec.id, tec.ativo)}
                        className={`w-full text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border transition-all ${tec.ativo ? 'text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                      >
                        {tec.ativo ? 'Suspender Atribuições' : 'Reativar Técnico'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </Glass>

          <Glass title="💡 Inteligência de Setorização">
             <div className="space-y-5">
                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Unidades Atendidas</p>
                    <p className="text-3xl font-black text-white">{escolas.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Equipe Operacional</p>
                    <p className="text-3xl font-black text-blue-400">{tecnicosAtivos.length}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/5 border border-blue-500/20 p-5 rounded-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                   <p className="text-xs text-blue-200/80 font-medium leading-relaxed">
                     A densidade ideal calculada pelo algoritmo atual é de <strong className="text-white">{mediaIdeal} escolas</strong> por técnico field.
                   </p>
                </div>
             </div>
          </Glass>
        </div>

        {/* COLUNA DIREITA: MATRIZ DE ATRIBUIÇÃO */}
        <div className="xl:col-span-2">
          <Glass title={`🏫 Matriz de Atribuição (${escolasFiltradas.length} Listadas)`}>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-5 flex items-center text-slate-500">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </span>
                <input 
                  type="text" 
                  placeholder="Buscar escola por nome ou código CIE..." 
                  value={buscaEscola}
                  onChange={(e) => setBuscaEscola(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 text-white rounded-2xl pl-14 pr-6 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-semibold shadow-inner placeholder:text-slate-600"
                />
              </div>

              {/* 🚀 BOTÕES DE FILTRO RÁPIDO */}
              <div className="flex bg-slate-900/50 border border-slate-700/50 rounded-2xl p-1 shrink-0">
                 <button 
                   onClick={() => setFiltroStatus("todas")}
                   className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === "todas" ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                 >
                   Todas
                 </button>
                 <button 
                   onClick={() => setFiltroStatus("pendentes")}
                   className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === "pendentes" ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                 >
                   Sem Técnico
                 </button>
                 <button 
                   onClick={() => setFiltroStatus("atribuidas")}
                   className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtroStatus === "atribuidas" ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                 >
                   Atribuídas
                 </button>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-[1.5rem] overflow-hidden shadow-2xl">
              <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#020617] sticky top-0 z-10 shadow-md">
                    <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-widest">
                      <th className="py-5 px-6 font-black w-24">CIE</th>
                      <th className="py-5 px-6 font-black w-1/2">Unidade Escolar</th>
                      <th className="py-5 px-6 font-black">Técnico Field Atribuído</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800/50">
                    {escolasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                          Nenhuma escola encontrada neste filtro.
                        </td>
                      </tr>
                    ) : (
                      escolasFiltradas.map((escola) => {
                        const isSaving = savingId === escola.id;
                        const isSuccess = successId === escola.id;

                        return (
                          <tr key={escola.id} className={`transition-colors duration-300 ${isSuccess ? 'bg-emerald-500/5' : 'hover:bg-slate-800/40'}`}>
                            <td className="py-4 px-6 text-slate-500 font-mono text-xs font-bold">{escola.cie || "S/N"}</td>
                            <td className="py-4 px-6 text-slate-200 font-bold truncate max-w-[200px]">{escola.nome_escola}</td>
                            <td className="py-4 px-6">
                              <div className="relative flex items-center">
                                {/* 🚀 SELECT COM VISUAL CORRIGIDO (DARK MODE FORÇADO) */}
                                <select
                                  value={escola.tecnico_atribuido || ""}
                                  onChange={(e) => handleAtribuirTecnico(escola.id, e.target.value)}
                                  disabled={isSaving}
                                  className={`w-full border rounded-xl px-4 py-2.5 outline-none transition-all text-xs font-bold cursor-pointer appearance-none shadow-sm ${
                                    isSuccess ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' : 
                                    !escola.tecnico_atribuido ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:border-yellow-500/50' : 'border-slate-700 text-blue-400 bg-[#0f172a] focus:border-blue-500 hover:border-slate-500'
                                  }`}
                                >
                                  {/* As tags <option> agora têm background escuro para corrigir a cor feia do navegador */}
                                  <option className="bg-slate-900 text-yellow-500 font-bold py-2" value="">⚠️ Sem Técnico Atribuído</option>
                                  {tecnicosAtivos.map(t => (
                                    <option className="bg-slate-900 text-slate-200 font-semibold py-2" key={t.id} value={t.nome}>{t.nome}</option>
                                  ))}
                                  {escola.tecnico_atribuido && !tecnicosAtivos.some(t => t.nome === escola.tecnico_atribuido) && (
                                    <option className="bg-slate-900 text-red-400 font-semibold py-2" value={escola.tecnico_atribuido}>{escola.tecnico_atribuido} (Inativo)</option>
                                  )}
                                </select>
                                
                                <div className="absolute right-4 pointer-events-none">
                                  {isSaving ? (
                                    <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                                  ) : isSuccess ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                                  ) : (
                                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Glass>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }
        
        /* Força a estilização no select do windows */
        select option {
          background-color: #0f172a;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  )
}

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden h-full ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">{title}</h3>}
      {children}
    </div>
  )
}