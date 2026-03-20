"use client"

import { useState, useMemo, useEffect } from "react"
import Card from "@/components/ui/Card"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ApoioUsuarioAccordionOriginal(){

const [busca,setBusca] = useState("")
const [materiais,setMateriais] = useState<any[]>([])

useEffect(()=>{
  async function carregar(){
    const { data } = await supabase.from("base_conhecimento").select("*")
    setMateriais(data || [])
  }
  carregar()
},[])

const listaMateriais = materiais ?? []

const materiaisFiltrados = useMemo(()=>{
  if(!busca) return listaMateriais
  const termo = busca.toLowerCase()
  return listaMateriais.filter((m:any)=>
    (m?.titulo || "").toLowerCase().includes(termo) ||
    (m?.descricao || "").toLowerCase().includes(termo) ||
    (m?.subcategoria || "").toLowerCase().includes(termo) ||
    (m?.categoria || "").toLowerCase().includes(termo)
  )
},[busca,listaMateriais])

const categorias = {
  CONECTIVIDADE: materiaisFiltrados.filter((m:any)=>m?.categoria==="CONECTIVIDADE"),
  EQUIPAMENTOS: materiaisFiltrados.filter((m:any)=>m?.categoria==="EQUIPAMENTOS"),
  SISTEMAS: materiaisFiltrados.filter((m:any)=>m?.categoria==="SISTEMAS"),
  ESPELHAMENTO: materiaisFiltrados.filter((m:any)=>m?.categoria==="ESPELHAMENTO")
}

async function registrarVisualizacao(item:any){
  try{
    await supabase.from("base_conhecimento").update({visualizacoes:(item.visualizacoes || 0) + 1}).eq("id",item.id)
  }catch(e){
    console.log("erro ao registrar visualização",e)
  }
  if(item?.arquivo_url) window.open(item.arquivo_url,"_blank")
}

// Mantive a sua função de agrupamento original
function agruparPorSubcategoria(lista:any[]){
  return lista.reduce((acc:any,item:any)=>{
    const sub = item?.subcategoria?.trim() || "Geral"
    if(!acc[sub]) acc[sub] = []
    acc[sub].push(item)
    return acc
  },{})
}

function renderCategoria(nome:string,lista:any[],icone:string){
  const agrupado = agruparPorSubcategoria(lista)
  if(Object.keys(agrupado).length === 0 && busca) return null;

  return(
    <details className="group" open={busca.length > 0}>
      <summary className="cursor-pointer list-none outline-none mb-4">
        {/* Usando o seu Card original para o cabeçalho */}
        <Card>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {icone} {nome}
            </h2>
            <div className="flex items-center gap-4">
               <span className="text-sm text-slate-400 font-medium">{lista.length} arquivos</span>
               <div className="text-slate-500 group-open:rotate-180 transition-transform duration-300">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
               </div>
            </div>
          </div>
        </Card>
      </summary>

      {/* Usando o seu Card original para o conteúdo interno */}
      <Card>
        {Object.keys(agrupado).length === 0 ? (
          <p className="text-slate-500 text-sm">
            Nenhum material encontrado
          </p>
        ):( 
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(agrupado).map(([subcategoria,itens]:any)=>{
              return(
                <div
                  key={subcategoria}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-cyan-500 transition"
                >
                  <div className="flex justify-between items-center">
                     <h3 className="text-white font-semibold text-lg leading-tight">
                       {subcategoria}
                     </h3>
                     <span className="text-[10px] text-slate-500 font-bold bg-[#020617] px-2 py-0.5 rounded border border-slate-800">
                       {itens.length}
                     </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {itens.map((item:any)=>(
                      <button
                        key={item.id}
                        onClick={()=>registrarVisualizacao(item)}
                        disabled={!item?.arquivo_url}
                        className={`w-full flex items-start gap-2 text-left text-sm group/btn ${
                          item?.arquivo_url
                          ? "text-slate-300 hover:text-cyan-400"
                          : "text-slate-500 cursor-not-allowed opacity-50"
                        }`}
                      >
                        <span className="mt-0.5">📄</span> 
                        <div className="flex-1">
                          <span className="font-medium group-hover/btn:underline decoration-cyan-400/50 underline-offset-2">{item?.titulo || "Tutorial"}</span>
                          {item.visualizacoes > 0 && <span className="block text-[10px] text-slate-500 mt-0.5">{item.visualizacoes} acessos</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </details>
  )
}

return(
  <div className="space-y-10 pb-10">
    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
      📚 Apoio ao Usuário - Base de Conhecimento Tecnológica - SETEC
    </h1>

    <Card>
      <div className="flex items-center gap-2">
        <span className="text-xl">🔎</span>
        <input
          type="text"
          value={busca}
          onChange={(e)=>setBusca(e.target.value)}
          placeholder="Buscar tutorial, equipamento ou sistema..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500 transition-colors"
        />
      </div>
    </Card>

    <div className="space-y-4">
      {renderCategoria("Conectividade",categorias.CONECTIVIDADE,"🌐")}
      {renderCategoria("Equipamentos",categorias.EQUIPAMENTOS,"💻")}
      {renderCategoria("Sistemas",categorias.SISTEMAS,"⚙️")}
      {renderCategoria("Espelhamento",categorias.ESPELHAMENTO,"📡")}
    </div>
  </div>
)
}