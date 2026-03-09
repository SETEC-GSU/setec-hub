"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

export default function TecnicoPage(){

const supabase = createClient()

const params = useParams()
const tecnico = decodeURIComponent(params.id as string)

const [visitas,setVisitas] = useState<any[]>([])
const [avaliacoes,setAvaliacoes] = useState<any[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{

async function carregar(){

const {data:visitasData} =
await supabase
.from("fields_visitas")
.select("*")
.eq("tecnico",tecnico)

const {data:avaliacoesData} =
await supabase
.from("fields_avaliacoes")
.select("*")
.eq("tecnico",tecnico)

setVisitas(visitasData || [])
setAvaliacoes(avaliacoesData || [])

setLoading(false)

}

carregar()

},[])



if(loading)
return <p className="text-white">Carregando...</p>



const chamadosAtendidos =
visitas.filter(v =>
String(v.status).toLowerCase().includes("realizada")
).length


const visitasPendentes =
visitas.filter(v =>
String(v.status).toLowerCase().includes("pendente")
).length


const escolasAtendidas =
[...new Set(visitas.map(v=>v.escola))]


const mediaAvaliacao =
avaliacoes.length > 0
? avaliacoes.reduce(
(acc,a)=>acc + Number(a.nota_media || 0),
0
) / avaliacoes.length
: 0



const elogios =
avaliacoes
.map(a=>a.elogios)
.filter(Boolean)

const reclamacoes =
avaliacoes
.map(a=>a.reclamacoes)
.filter(Boolean)

const sugestoes =
avaliacoes
.map(a=>a.sugestoes)
.filter(Boolean)



return(

<div className="space-y-8">

{/* HEADER */}

<div>

<h1 className="text-3xl font-bold">
👨‍🔧 {tecnico}
</h1>

<p className="text-slate-400 text-sm">
Painel operacional do técnico
</p>

</div>



{/* KPIs */}

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<Card
title="Chamados atendidos"
value={chamadosAtendidos}
/>

<Card
title="Visitas pendentes"
value={visitasPendentes}
/>

<Card
title="Avaliação média"
value={`${mediaAvaliacao.toFixed(1)} ⭐`}
/>

<Card
title="Escolas atendidas"
value={escolasAtendidas.length}
/>

</div>



{/* ESCOLAS */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="font-semibold mb-4">
🏫 Escolas atendidas
</h3>

<div className="grid md:grid-cols-2 gap-3">

{escolasAtendidas.map(e=>(
<div
key={e}
className="p-3 border border-slate-800 rounded-xl"
>
{e}
</div>
))}

</div>

</div>



{/* FEEDBACK */}

<div className="grid md:grid-cols-3 gap-6">

<Feedback
title="Elogios"
color="green"
items={elogios}
/>

<Feedback
title="Sugestões"
color="yellow"
items={sugestoes}
/>

<Feedback
title="Reclamações"
color="red"
items={reclamacoes}
/>

</div>



{/* HISTÓRICO */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="font-semibold mb-4">
📅 Histórico de atendimentos
</h3>

<div className="space-y-3">

{visitas.map(v=>(
<div
key={v.chamado}
className="p-3 border border-slate-800 rounded-xl flex justify-between"
>

<div>

<p className="font-semibold">
{v.escola}
</p>

<p className="text-xs text-slate-400">
Chamado {v.chamado}
</p>

</div>

<div>

<span className={`text-xs px-2 py-1 rounded-md
${String(v.status).toLowerCase().includes("pendente")
? "bg-yellow-500 text-black"
: "bg-green-500 text-white"
}`}>
{v.status}
</span>

</div>

</div>
))}

</div>

</div>



</div>

)

}



function Card({title,value}:any){

return(

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">

<p className="text-xs text-slate-400">
{title}
</p>

<p className="text-2xl font-bold">
{value ?? "-"}
</p>

</div>

)

}



function Feedback({title,color,items}:any){

return(

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="font-semibold mb-4">
{title}
</h3>

<div className="space-y-2">

{items.length === 0 && (
<p className="text-sm text-slate-500">
Sem registros
</p>
)}

{items.map((item:any,index:number)=>(
<div
key={index}
className="p-3 border border-slate-800 rounded-xl text-sm"
>
{item}
</div>
))}

</div>

</div>

)

}