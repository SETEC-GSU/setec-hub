"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import Card from "@/components/ui/Card" 
import { Plus, Edit2, Trash2, Search, AlertCircle, X, Check, Laptop } from "lucide-react"

// Inicialização do Supabase Cliente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function GestaoEquipamentosPage() {
  // Estados Gerais
  const [escolas, setEscolas] = useState<string[]>([])
  const [modelos, setModelos] = useState<any[]>([])
  const [escolaSelecionada, setEscolaSelecionada] = useState<string>("")
  const [equipamentosRecebidos, setEquipamentosRecebidos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Estados dos Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditOpen, setModalEditOpen] = useState(false)
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false)
  const [modalNovoModeloOpen, setModalNovoModeloOpen] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState<any>(null)

  // Estados dos Formulários
  const [formEscola, setFormEscola] = useState("")
  const [formModeloId, setFormModeloId] = useState("")
  const [formQuantidade, setFormQuantidade] = useState<number | "">("")

  // 🚀 ESTADOS DO NOVO MODELO (AGORA COMPLETOS)
  const [novoModeloNome, setNovoModeloNome] = useState("")
  const [novoModeloFinalidade, setNovoModeloFinalidade] = useState("")
  const [novoModeloAno, setNovoModeloAno] = useState("")
  const [novoModeloUso, setNovoModeloUso] = useState("") // NOVO
  const [novoModeloTipo, setNovoModeloTipo] = useState("") // NOVO
  const [novoModeloImagem, setNovoModeloImagem] = useState("")

  useEffect(() => {
    async function carregarDadosBase() {
      const { data: modelosData } = await supabase
        .from("equipamentos_modelos")
        .select("*")
        .order("equipamento")
      if (modelosData) setModelos(modelosData)

      const { data: escolasData } = await supabase
        .from("equipamentos_recebidos")
        .select("escola_nome")
      
      if (escolasData) {
        const unicas = Array.from(new Set(escolasData.map(e => e.escola_nome))).sort()
        setEscolas(unicas)
      }
    }
    carregarDadosBase()
  }, [])

  useEffect(() => {
    if (!escolaSelecionada) {
      setEquipamentosRecebidos([])
      return
    }

    async function buscarEquipamentosEscola() {
      setLoading(true)
      const { data, error } = await supabase
        .from("equipamentos_recebidos")
        .select(`
          id,
          escola_nome,
          quantidade_recebida,
          modelo_id,
          equipamentos_modelos (
            id,
            equipamento,
            finalidade,
            imagem_url,
            ano_recebimento,
            uso,
            tipo
          )
        `)
        .eq("escola_nome", escolaSelecionada)
        .order("id", { ascending: false })

      if (!error && data) {
        setEquipamentosRecebidos(data)
      }
      setLoading(false)
    }

    buscarEquipamentosEscola()
  }, [escolaSelecionada])

  const totalGeral = equipamentosRecebidos.reduce((acc, item) => acc + (item.quantidade_recebida || 0), 0)
  
  const totalSemCarregamento = equipamentosRecebidos.reduce((acc, item) => {
    const finalidade = (item.equipamentos_modelos?.finalidade || "").toLowerCase()
    if (finalidade.includes("carregamento")) return acc
    return acc + (item.quantidade_recebida || 0)
  }, 0)

  // 🚀 INSERÇÃO DE MODELO ATUALIZADA COM USO E TIPO
  const handleSalvarNovoModelo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoModeloNome.trim()) return alert("Digite o nome do novo equipamento.")

    const { data: modeloData, error: modeloError } = await supabase
      .from("equipamentos_modelos")
      .insert({
        equipamento: novoModeloNome.trim(),
        finalidade: novoModeloFinalidade.trim() || null,
        ano_recebimento: novoModeloAno.trim() || null,
        uso: novoModeloUso.trim() || null, // ADICIONADO
        tipo: novoModeloTipo.trim() || null, // ADICIONADO
        imagem_url: novoModeloImagem.trim() || null
      })
      .select("*")
      .single()

    if (modeloError) {
      return alert("Erro ao criar novo modelo: " + modeloError.message)
    }

    setModelos(prev => [...prev, modeloData].sort((a, b) => a.equipamento.localeCompare(b.equipamento)))
    alert("Modelo cadastrado com sucesso! Agora você pode vinculá-lo a uma escola.")
    fecharModais()
  }

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEscola || !formModeloId || !formQuantidade) return alert("Preencha todos os campos.")

    const escolaClean = formEscola.trim()
    const modeloIdSelecionado = formModeloId
    const qtdNum = Number(formQuantidade)

    const { data: existente } = await supabase
      .from("equipamentos_recebidos")
      .select("*")
      .eq("escola_nome", escolaClean)
      .eq("modelo_id", modeloIdSelecionado)
      .maybeSingle()

    let registroSalvo;
    let isEdicao = false;

    if (existente) {
      const novaQtd = existente.quantidade_recebida + qtdNum;
      const { data, error } = await supabase
        .from("equipamentos_recebidos")
        .update({ quantidade_recebida: novaQtd })
        .eq("id", existente.id)
        .select()
        .single()
      
      if (error) return alert("Erro ao atualizar recebimento: " + error.message)
      registroSalvo = data;
      isEdicao = true;
    } else {
      const { data, error } = await supabase
        .from("equipamentos_recebidos")
        .insert({
          escola_nome: escolaClean,
          modelo_id: modeloIdSelecionado,
          quantidade_recebida: qtdNum
        })
        .select()
        .single()

      if (error) return alert("Erro ao cadastrar recebimento: " + error.message)
      registroSalvo = data;
    }

    const modeloCompleto = modelos.find(m => String(m.id) === String(modeloIdSelecionado))
    
    const itemParaTela = {
      ...registroSalvo,
      equipamentos_modelos: modeloCompleto || null
    }

    if (escolaClean === escolaSelecionada) {
      setEquipamentosRecebidos(prev => {
        if (isEdicao) {
          return prev.map(item => item.id === registroSalvo.id ? itemParaTela : item)
        } else {
          return [itemParaTela, ...prev]
        }
      })
    }

    if (!escolas.includes(escolaClean)) {
      setEscolas(prev => [...prev, escolaClean].sort())
    }
    
    fecharModais()
  }

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemSelecionado || !formQuantidade) return

    const { error } = await supabase
      .from("equipamentos_recebidos")
      .update({ quantidade_recebida: Number(formQuantidade) })
      .eq("id", itemSelecionado.id)

    if (error) {
      alert("Erro ao atualizar: " + error.message)
    } else {
      setEquipamentosRecebidos(prev => 
        prev.map(item => item.id === itemSelecionado.id ? { ...item, quantidade_recebida: Number(formQuantidade) } : item)
      )
      fecharModais()
    }
  }

  const handleDeletar = async () => {
    if (!itemSelecionado) return

    const { error } = await supabase
      .from("equipamentos_recebidos")
      .delete()
      .eq("id", itemSelecionado.id)

    if (error) {
      alert("Erro ao deletar: " + error.message)
    } else {
      setEquipamentosRecebidos(prev => prev.filter(item => item.id !== itemSelecionado.id))
      fecharModais()
    }
  }

  // 🚀 RESET DOS NOVOS CAMPOS
  const abrirModalNovoModelo = () => {
    setNovoModeloNome("")
    setNovoModeloFinalidade("")
    setNovoModeloAno("")
    setNovoModeloUso("") // RESET
    setNovoModeloTipo("") // RESET
    setNovoModeloImagem("")
    setModalNovoModeloOpen(true)
  }

  const abrirModalNovo = () => {
    setFormEscola(escolaSelecionada || "") 
    setFormModeloId("")
    setFormQuantidade("")
    setModalNovoOpen(true)
  }

  const abrirModalEdit = (item: any) => {
    setItemSelecionado(item)
    setFormQuantidade(item.quantidade_recebida)
    setModalEditOpen(true)
  }

  const abrirModalDelete = (item: any) => {
    setItemSelecionado(item)
    setModalDeleteOpen(true)
  }

  const fecharModais = () => {
    setModalNovoOpen(false)
    setModalEditOpen(false)
    setModalDeleteOpen(false)
    setModalNovoModeloOpen(false)
    setItemSelecionado(null)
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Laptop className="text-blue-500" size={32} />
            Gestão de Recebimentos
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Gerencie o painel central de equipamentos entregues para as escolas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={abrirModalNovoModelo}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} className="text-blue-400" />
            Novo Modelo Base
          </button>

          <button 
            onClick={abrirModalNovo}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Registrar Recebimento
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <Search className="text-slate-400" size={20} />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Selecione a Unidade Escolar</label>
            <select 
              value={escolaSelecionada}
              onChange={(e) => setEscolaSelecionada(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors cursor-pointer font-medium"
            >
              <option value="">Selecione para visualizar os equipamentos...</option>
              {escolas.map((esc, i) => (
                <option key={i} value={esc}>{esc}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {escolaSelecionada ? (
        <Card>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-slate-800 pb-4 gap-4">
            <h2 className="text-xl font-semibold text-white">Equipamentos recebidos: <span className="text-blue-400">{escolaSelecionada}</span></h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                Total Geral: <span className="text-white ml-1">{totalGeral} un.</span>
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                Equipamentos sem Plataformas de Carregamento: <span className="text-cyan-400 ml-1">{totalSemCarregamento} un.</span>
              </span>
              <span className="bg-blue-900/30 text-blue-400 border border-blue-800/50 text-xs font-bold px-3 py-1.5 rounded-lg">
                {equipamentosRecebidos.length} registros
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : equipamentosRecebidos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <AlertCircle className="text-slate-500" size={32} />
              </div>
              <p className="text-slate-300 font-medium">Nenhum equipamento registrado para esta escola.</p>
              <p className="text-slate-500 text-sm mt-1">Utilize o botão no topo para adicionar o primeiro lote.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider pl-2">Equipamento Modelo</th>
                    <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Finalidade</th>
                    <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Quantidade</th>
                    <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right pr-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {equipamentosRecebidos.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-4">
                          {item.equipamentos_modelos?.imagem_url ? (
                            <div className="w-12 h-12 shrink-0 bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                              <img src={item.equipamentos_modelos.imagem_url} alt="Eqp" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 shrink-0 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center">
                              <span className="text-[8px] text-slate-500 uppercase font-bold text-center">Sem<br/>Foto</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white text-sm">{item.equipamentos_modelos?.equipamento || "Modelo Desconhecido"}</p>
                            {item.equipamentos_modelos?.ano_recebimento && (
                              <span className="inline-block mt-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                ANO DE RECEBIMENTO: {item.equipamentos_modelos.ano_recebimento}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-xs text-slate-400 font-medium bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
                          {item.equipamentos_modelos?.finalidade || "-"}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-xl font-black text-white">{item.quantidade_recebida}</span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => abrirModalEdit(item)}
                            className="p-2 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 border border-slate-700 hover:border-blue-500/30 rounded-lg transition-all"
                            title="Editar Quantidade"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => abrirModalDelete(item)}
                            className="p-2 bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-lg transition-all"
                            title="Excluir Registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center opacity-60">
          <Search size={48} className="text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg">Selecione uma escola acima para iniciar a gestão.</p>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🚀 MODAL: NOVO MODELO BASE NO BANCO DE DADOS (ATUALIZADO) */}
      {/* ========================================================= */}
      {modalNovoModeloOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#020617] border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/30">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Laptop className="text-blue-400"/> Cadastrar Modelo Base</h2>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white p-1"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSalvarNovoModelo} className="p-6 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-2">
                <p className="text-xs text-blue-400 leading-relaxed">
                  Aqui você cadastra as informações matrizes de um equipamento novo (ex: "Chromebook Acer"). Depois de salvo, ele ficará disponível na lista de Recebimentos para você vincular às escolas.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1">Nome do Equipamento *</label>
                <input type="text" required value={novoModeloNome} onChange={e => setNovoModeloNome(e.target.value)} placeholder="Ex: Multilaser M10" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Finalidade</label>
                  <input type="text" value={novoModeloFinalidade} onChange={e => setNovoModeloFinalidade(e.target.value)} placeholder="Ex: Aluno" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Ano / Lote</label>
                  <input type="text" value={novoModeloAno} onChange={e => setNovoModeloAno(e.target.value)} placeholder="Ex: 2024" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* 🚀 NOVOS CAMPOS ADICIONADOS AQUI */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Uso</label>
                  <input type="text" value={novoModeloUso} onChange={e => setNovoModeloUso(e.target.value)} placeholder="Ex: Pedagógico" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Tipo</label>
                  <input type="text" value={novoModeloTipo} onChange={e => setNovoModeloTipo(e.target.value)} placeholder="Ex: Notebook" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1">URL da Imagem</label>
                <input type="url" value={novoModeloImagem} onChange={e => setNovoModeloImagem(e.target.value)} placeholder="https://link-da-imagem..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={fecharModais} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2"><Check size={18}/> Salvar Modelo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VINCULAR EQUIPAMENTO À ESCOLA */}
      {/* ========================================================= */}
      {modalNovoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#020617] border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/30">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Plus className="text-blue-500"/> Registrar Recebimento</h2>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white p-1"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSalvarNovo} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1.5">Unidade Escolar *</label>
                <input 
                  type="text"
                  list="lista-escolas"
                  required
                  value={formEscola}
                  onChange={(e) => setFormEscola(e.target.value)}
                  placeholder="Digite ou selecione a escola..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                />
                <datalist id="lista-escolas">
                  {escolas.map((e, i) => <option key={i} value={e} />)}
                </datalist>
                <p className="text-[10px] text-slate-500 mt-1">Se a escola não existir na lista, basta digitar o nome completo.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1.5">Modelo do Equipamento *</label>
                <select 
                  required
                  value={formModeloId}
                  onChange={(e) => setFormModeloId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Selecione o modelo do banco...</option>
                  {modelos.map(m => (
                    <option key={m.id} value={m.id}>{m.equipamento} {m.ano_recebimento ? `(Lote ${m.ano_recebimento})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1.5">Quantidade Entregue *</label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={formQuantidade}
                  onChange={(e) => setFormQuantidade(Number(e.target.value))}
                  placeholder="Ex: 30"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={fecharModais} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2"><Check size={18}/> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR QUANTIDADE */}
      {/* ========================================================= */}
      {modalEditOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#020617] border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/30">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit2 size={18} className="text-blue-500"/> Editar Quantidade</h2>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white p-1"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSalvarEdicao} className="p-6 space-y-5">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Equipamento</p>
                <p className="text-white font-medium">{itemSelecionado.equipamentos_modelos?.equipamento}</p>
                <p className="text-xs text-slate-400 mt-0.5">{itemSelecionado.escola_nome}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1.5">Nova Quantidade</label>
                <input 
                  type="number"
                  min="0"
                  required
                  value={formQuantidade}
                  onChange={(e) => setFormQuantidade(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-xl font-bold"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={fecharModais} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20">Atualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {/* ========================================================= */}
      {modalDeleteOpen && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#020617] border border-red-900/30 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-2">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Remover Registro?</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tem certeza que deseja apagar o registro de <strong className="text-white">{itemSelecionado.quantidade_recebida}x {itemSelecionado.equipamentos_modelos?.equipamento}</strong> da escola <strong className="text-white">{itemSelecionado.escola_nome}</strong>?
              </p>
              <p className="text-red-400 text-xs font-semibold bg-red-500/10 px-3 py-2 rounded-lg w-full">Esta ação não poderá ser desfeita.</p>
              
              <div className="w-full flex gap-3 pt-4">
                <button onClick={fecharModais} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors">Cancelar</button>
                <button onClick={handleDeletar} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/20">Sim, excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}