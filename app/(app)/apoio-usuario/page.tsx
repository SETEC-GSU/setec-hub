"use client"

import { useState, useMemo, useEffect } from "react"
import Card from "@/components/ui/Card"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ApoioUsuarioClient(){

const [busca,setBusca] = useState("")
const [materiais,setMateriais] = useState<any[]>([])

useEffect(()=>{

async function carregar(){

const { data } = await supabase
.from("base_conhecimento")
.select("*")

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


/* FUNÇÃO PARA CONTAR VISUALIZAÇÃO */

async function registrarVisualizacao(item:any){

try{

await supabase
.from("base_conhecimento")
.update({
visualizacoes:(item.visualizacoes || 0) + 1
})
.eq("id",item.id)

}catch(e){
console.log("erro ao registrar visualização",e)
}

window.open(item?.arquivo_url,"_blank")

}


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

return(

<Card>

<h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
{icone} {nome}
</h2>

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

<h3 className="text-white font-semibold text-lg">
{subcategoria}
</h3>

<div className="space-y-2 pt-2">

{itens.map((item:any)=>(

<button
key={item.id}
onClick={()=>registrarVisualizacao(item)}
className={`block w-full text-left text-sm ${
item?.arquivo_url
? "text-slate-300 hover:text-cyan-400"
: "text-slate-500 cursor-not-allowed"
}`}
>

📄 {item?.titulo || "Tutorial"}

</button>

))}

</div>

</div>

)

})}

</div>

)}

</Card>

)

}


return(

<div className="space-y-10">

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
className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500"
/>

</div>

</Card>

{renderCategoria("Conectividade",categorias.CONECTIVIDADE,"🌐")}
{renderCategoria("Equipamentos",categorias.EQUIPAMENTOS,"💻")}
{renderCategoria("Sistemas",categorias.SISTEMAS,"⚙️")}
{renderCategoria("Espelhamento",categorias.ESPELHAMENTO,"📡")}

</div>

)

}