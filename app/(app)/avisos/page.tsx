"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function AdminAvisos() {

const supabase = createClient()

const [avisos,setAvisos] = useState<any[]>([])
const [titulo,setTitulo] = useState("")
const [descricao,setDescricao] = useState("")
const [emoji,setEmoji] = useState("⚠️")

/* NOVOS CAMPOS */

const [tipo,setTipo] = useState("informativo")
const [dataInicio,setDataInicio] = useState("")
const [dataFim,setDataFim] = useState("")

async function carregar(){

const {data} = await supabase
.from("avisos_setec")
.select("*")
.order("created_at",{ascending:false})

setAvisos(data || [])

}

async function criarAviso(){

if(!titulo || !descricao) return alert("Preencha os campos")

await supabase.from("avisos_setec").insert({

titulo,
descricao,
emoji,
tipo,
data_inicio:dataInicio || null,
data_fim:dataFim || null,
ativo:true

})

setTitulo("")
setDescricao("")
setEmoji("⚠️")
setTipo("informativo")
setDataInicio("")
setDataFim("")

carregar()

}

async function alternarAviso(id:any,ativo:boolean){

await supabase
.from("avisos_setec")
.update({ativo:!ativo})
.eq("id",id)

carregar()

}

useEffect(()=>{carregar()},[])

return(

<div className="space-y-8">

{/* HEADER */}

<div>

<h1 className="text-2xl font-bold text-white">
Gestão de Avisos SETEC
</h1>

<p className="text-slate-400 text-sm">
Avisos exibidos na página principal
</p>

</div>

{/* FORMULÁRIO */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-4">

<h2 className="text-white font-semibold">
Criar novo aviso
</h2>

<input
value={emoji}
onChange={(e)=>setEmoji(e.target.value)}
placeholder="Emoji"
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
/>

<input
value={titulo}
onChange={(e)=>setTitulo(e.target.value)}
placeholder="Título do aviso"
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
/>

<textarea
value={descricao}
onChange={(e)=>setDescricao(e.target.value)}
placeholder="Descrição"
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
/>

{/* TIPO */}

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
>

<option value="informativo">ℹ️ Informativo</option>
<option value="alerta">⚠️ Alerta</option>
<option value="comunicado">📢 Comunicado</option>
<option value="urgente">🚨 Urgente</option>

</select>

{/* AGENDAMENTO */}

<div className="grid grid-cols-2 gap-3">

<input
type="datetime-local"
value={dataInicio}
onChange={(e)=>setDataInicio(e.target.value)}
className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
/>

<input
type="datetime-local"
value={dataFim}
onChange={(e)=>setDataFim(e.target.value)}
className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
/>

</div>

<button
onClick={criarAviso}
className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
>

Publicar aviso

</button>

</div>

{/* PREVIEW */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
Preview
</h2>

<div className="flex gap-3 bg-slate-900 p-4 rounded-lg">

<span className="text-xl">{emoji}</span>

<div>

<p className="text-white text-sm font-semibold">
{titulo || "Título do aviso"}
</p>

<p className="text-slate-400 text-xs">
{descricao || "Descrição do aviso aparecerá aqui"}
</p>

</div>

</div>

</div>

{/* LISTA */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
Avisos existentes
</h2>

<div className="space-y-3">

{avisos.map(a=>(

<div
key={a.id}
className="flex justify-between items-center bg-slate-900 p-4 rounded-lg"
>

<div className="flex gap-3">

<span className="text-xl">
{a.emoji}
</span>

<div>

<p className="text-white text-sm font-semibold">
{a.titulo}
</p>

<p className="text-slate-400 text-xs">
{a.descricao}
</p>

<p className="text-slate-500 text-xs mt-1">
Tipo: {a.tipo}
</p>

</div>

</div>

<button
onClick={()=>alternarAviso(a.id,a.ativo)}
className={`px-3 py-1 rounded text-xs ${
a.ativo
? "bg-green-600 text-white"
: "bg-slate-700 text-slate-300"
}`}
>

{a.ativo ? "Ativo" : "Inativo"}

</button>

</div>

))}

</div>

</div>

</div>

)

}