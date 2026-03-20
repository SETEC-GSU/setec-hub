"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function GestaoEscolasGrid() {
  const supabase = createClient()

  const [escolas, setEscolas] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [creating, setCreating] = useState(false)
  const [busca, setBusca] = useState("")

  const columns = [
    "nome_escola", "cie", "telefone", "endereco", "diretor", "tipo_ensino",
    "periodo", "email", "latitude", "longitude", "horario_abertura",
    "horario_fechamento", "total_alunos", "qtd_salas", "total_equipamentos_recebidos",
    "total_equipamentos_funcionando", "aps_instalados",
  ]

  async function carregar() {
    const { data } = await supabase.from("escolas").select("*").order("nome_escola")
    setEscolas(data || [])
  }

  useEffect(() => { carregar() }, [])

  function iniciarEdicao(row: any) {
    setEditingId(row.id)
    setForm(row)
  }

  function iniciarCriacao() {
    const empty: any = {}
    columns.forEach(col => (empty[col] = ""))
    setForm(empty)
    setCreating(true)
  }

  function cancelar() {
    setEditingId(null)
    setCreating(false)
  }

  async function salvar() {
    if (creating) {
      await supabase.from("escolas").insert(form)
      setCreating(false)
    } else {
      await supabase.from("escolas").update(form).eq("id", editingId)
      setEditingId(null)
    }
    carregar()
  }

  const escolasFiltradas = useMemo(() => {
    if (!busca) return escolas;
    return escolas.filter(e => 
      e.nome_escola?.toLowerCase().includes(busca.toLowerCase()) || 
      e.cie?.includes(busca)
    )
  }, [escolas, busca])

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Escolas</h1>
          <p className="text-slate-400 text-sm">Central de gestão de dados das Unidades Escolares - URE GSU</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Buscar por nome ou CIE..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="bg-[#020617] border border-slate-700 px-4 py-2.5 rounded-xl text-sm w-full md:w-72 text-white focus:border-blue-500 outline-none"
          />
          <button
            onClick={iniciarCriacao}
            disabled={creating || editingId !== null}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 transition-colors"
          >
            + Cadastrar Escola
          </button>
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* CARD DE CRIAÇÃO */}
        {creating && (
          <div className="bg-[#020617] border-2 border-blue-500/50 rounded-[2rem] p-8 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-6">Nova Escola</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {columns.map(col => (
                <div key={col} className="space-y-1">
                  <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{col.replaceAll("_", " ")}</label>
                  <input
                    value={form[col] || ""}
                    onChange={e => setForm({ ...form, [col]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
               <button onClick={cancelar} className="px-4 py-2 text-slate-400 font-bold text-sm hover:text-white">Cancelar</button>
               <button onClick={salvar} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl">Salvar</button>
            </div>
          </div>
        )}

        {escolasFiltradas.length === 0 && !creating && (
            <div className="col-span-full text-center py-12 text-slate-500">Nenhum resultado encontrado para "{busca}".</div>
        )}

        {escolasFiltradas.map(row => {
          const isEditing = editingId === row.id;

          return (
            <div key={row.id} className={`bg-[#020617] border rounded-[2rem] p-8 transition-all duration-300 ${isEditing ? 'border-blue-500/50 shadow-2xl scale-[1.02]' : 'border-slate-800 hover:border-slate-700'}`}>
              
              {isEditing ? (
                /* MODO EDIÇÃO DENTRO DO CARD */
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Editando: {row.nome_escola}</h3>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md font-bold">Modo Edição</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {columns.map(col => (
                      <div key={col} className="space-y-1">
                        <label className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{col.replaceAll("_", " ")}</label>
                        <input
                          value={form[col] || ""}
                          onChange={e => setForm({ ...form, [col]: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button onClick={cancelar} className="px-4 py-2 text-slate-400 font-bold text-sm hover:text-white">Cancelar</button>
                    <button onClick={salvar} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl">Salvar Alterações</button>
                  </div>
                </>
              ) : (
                /* MODO VISUALIZAÇÃO DO CARD */
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Link href={`/escolas/${row.id}`} className="text-xl font-bold text-blue-400 hover:underline">
                        {row.nome_escola || "Sem Nome"}
                      </Link>
                      <p className="text-sm text-slate-400 font-medium mt-1">CIE: <span className="text-slate-300">{row.cie || "-"}</span></p>
                    </div>
                    <button 
                      onClick={() => iniciarEdicao(row)}
                      disabled={editingId !== null}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Editar Dados
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-800/50">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Diretor</p>
                      <p className="text-sm text-slate-300 truncate font-medium">{row.diretor || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Telefone</p>
                      <p className="text-sm text-slate-300 font-medium">{row.telefone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alunos</p>
                      <p className="text-sm text-slate-300 font-medium">{row.total_alunos || "0"}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 flex justify-between items-center">
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status Hardware</p>
                         <div className="flex gap-4 mt-1">
                            <span className="text-xs text-emerald-400 font-bold">{row.total_equipamentos_funcionando || 0} OK</span>
                            <span className="text-xs text-blue-400 font-bold">{row.aps_instalados || 0} APs</span>
                         </div>
                       </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          )
        })}

      </div>
    </div>
  )
}