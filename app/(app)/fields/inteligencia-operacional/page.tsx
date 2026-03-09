"use client"

import { useEffect,useState } from "react"
import { createClient } from "@/lib/supabase"

export default function InteligenciaOperacional(){

const supabase = createClient()

const [visitas,setVisitas] = useState<any[]>([])
const [avaliacoes,setAvaliacoes] = useState<any[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{

async function carregar(){

const {data:visitasData} =
await supabase
.from("fields_visitas")
.select("*")

const {data:avaliacoesData} =
await supabase
.from("fields_avaliacoes")
.select("*")

setVisitas(visitasData || [])
setAvaliacoes(avaliacoesData || [])

setLoading(false)

}

carregar()

},[])



if(loading)
return <p className="text-white">Carregando...</p>



/* KPIs */

const totalChamados = visitas.length

const visitasRealizadas =
visitas.filter(v =>
String(v.status).toLowerCase().includes("realizada")
).length


const mediaEquipe =
avaliacoes.length > 0
? avaliacoes.reduce(
(acc,a)=>acc + Number(a.nota_media || 0),
0
)/avaliacoes.length
:0



/* SLA */

const tempos =
visitas
.filter(v=>v.data_visita && v.data_abertura)
.map(v=>{

const abertura = new Date(v.data_abertura)
const visita = new Date(v.data_visita)

return (visita.getTime() - abertura.getTime()) / (1000*60*60*24)

})

const slaMedio =
tempos.length > 0
? tempos.reduce((a,b)=>a+b,0)/tempos.length
:0



/* Ranking técnicos */

const rankingTecnicos:any = {}

visitas.forEach(v=>{

if(!rankingTecnicos[v.tecnico])
rankingTecnicos[v.tecnico]=0

rankingTecnicos[v.tecnico]++

})

const ranking =
Object.entries(rankingTecnicos)
.sort((a:any,b:any)=>b[1]-a[1])



/* Escolas com mais chamados */

const rankingEscolas:any = {}

visitas.forEach(v=>{

if(!rankingEscolas[v.escola])
rankingEscolas[v.escola]=0

rankingEscolas[v.escola]++

})

const topEscolas =
Object.entries(rankingEscolas)
.sort((a:any,b:any)=>b[1]-a[1])
.slice(0,10)



/* Categorias */

const categorias:any = {}

visitas.forEach(v=>{

if(!v.categoria) return

if(!categorias[v.categoria])
categorias[v.categoria]=0

categorias[v.categoria]++

})

const rankingCategorias =
Object.entries(categorias)
.sort((a:any,b:any)=>b[1]-a[1])



return(

<div className="space-y-8">

{/* HEADER */}

<div>

<h1 className="text-3xl font-bold">
🧠 Inteligência Operacional
</h1>

<p className="text-slate-400 text-sm">
Análise estratégica das operações Field
</p>

</div>



{/* KPIs */}

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<Card
title="Chamados registrados"
value={totalChamados}
/>

<Card
title="Visitas realizadas"
value={visitasRealizadas}
/>

<Card
title="SLA médio"
value={`${slaMedio.toFixed(1)} dias`}
/>

<Card
title="Avaliação média equipe"
value={`${mediaEquipe.toFixed(1)} ⭐`}
/>

</div>



{/* RANKINGS */}

<div className="grid md:grid-cols-2 gap-6">

<Box
title="🏆 Ranking de técnicos"
items={ranking}
/>

<Box
title="🏫 Escolas com mais chamados"
items={topEscolas}
/>

</div>



{/* CATEGORIAS */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="font-semibold mb-4">
📂 Chamados por categoria
</h3>

<div className="space-y-3">

{rankingCategorias.map((c:any)=>(
<div
key={c[0]}
className="flex justify-between border border-slate-800 rounded-xl p-3"
>

<p>{c[0]}</p>
<p className="text-blue-400">{c[1]}</p>

</div>
))}

</div>

</div>



{/* INSIGHTS */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-2">

<h3 className="font-semibold">
Insights automáticos
</h3>

<p className="text-sm text-slate-400">

O técnico com maior volume de atendimentos é
<b> {ranking?.[0]?.[0]}</b>.

</p>

<p className="text-sm text-slate-400">

A escola com mais chamados registrados é
<b> {topEscolas?.[0]?.[0]}</b>.

</p>

<p className="text-sm text-slate-400">

A categoria com maior recorrência é
<b> {rankingCategorias?.[0]?.[0]}</b>.

</p>

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



function Box({title,items}:any){

return(

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="font-semibold mb-4">
{title}
</h3>

<div className="space-y-3">

{items.map((i:any,index:number)=>(
<div
key={index}
className="flex justify-between border border-slate-800 rounded-xl p-3"
>

<p>
#{index+1} {i[0]}
</p>

<p className="text-blue-400">
{i[1]}
</p>

</div>
))}

</div>

</div>

)

}