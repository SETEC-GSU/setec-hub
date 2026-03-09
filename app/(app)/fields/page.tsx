"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

import {
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
ResponsiveContainer,
PieChart,
Pie,
Cell
} from "recharts"


/* TYPES */

type Visita = {
tecnico:string
escola:string
categoria:string
data_abertura:string
data_visita:string | null
}

type Avaliacao = {
tecnico:string
nota_media:number
}

type SLAItem = {
escola:string
total:number
count:number
}



/* DATE PARSER */

function parseDateLocal(dateStr:string | null){

if(!dateStr) return null

const [y,m,d] = dateStr.split("-")

return new Date(Number(y),Number(m)-1,Number(d))

}



export default function FieldsPage(){

const supabase = createClient()

const [visitas,setVisitas] = useState<Visita[]>([])
const [avaliacoes,setAvaliacoes] = useState<Avaliacao[]>([])
const [escolasTotal,setEscolasTotal] = useState<any[]>([])
const [tecnicoFiltro,setTecnicoFiltro] = useState("Todos")
const [loading,setLoading] = useState(true)



useEffect(()=>{

async function carregar(){

const {data:visitasData} =
await supabase.from("fields_visitas").select("*")

const {data:avaliacoesData} =
await supabase.from("fields_avaliacoes").select("*")

const {data:escolasData} =
await supabase.from("escolas").select("*")

setVisitas(visitasData || [])
setAvaliacoes(avaliacoesData || [])
setEscolasTotal(escolasData || [])

setLoading(false)

}

carregar()

},[])



if(loading) return <p className="text-white">Carregando...</p>



/* TECNICOS */

const tecnicos =
["Todos",...new Set(visitas.map(v=>v.tecnico))]



/* FILTRO */

const visitasFiltradas =
tecnicoFiltro==="Todos"
? visitas
: visitas.filter(v=>v.tecnico===tecnicoFiltro)



/* ESCOLAS DO TECNICO */

const escolasTecnico =
new Set(visitasFiltradas.map(v=>v.escola))



/* SLA */

const sla = visitasFiltradas.reduce<Record<string,SLAItem>>((acc,visita)=>{

if(!visita.data_visita) return acc

const abertura = parseDateLocal(visita.data_abertura)
const visitaData = parseDateLocal(visita.data_visita)

if(!abertura || !visitaData) return acc

const dias =
Math.abs(
visitaData.getTime() -
abertura.getTime()
)/(1000*60*60*24)

if(!acc[visita.escola])
acc[visita.escola]={escola:visita.escola,total:0,count:0}

acc[visita.escola].total+=dias
acc[visita.escola].count++

return acc

},{})



const slaArray =
Object.values(sla).map(s=>({
escola:s.escola,
tempo:(s.total/s.count).toFixed(1)
}))



/* TOTAL VISITAS */

const totalVisitas = visitasFiltradas.length



/* TECNICOS ATIVOS */

const tecnicosAtivos =
new Set(visitasFiltradas.map(v=>v.tecnico)).size



/* MEDIA AVALIACAO */

const avaliacoesTecnico =
tecnicoFiltro==="Todos"
? avaliacoes
: avaliacoes.filter(a=>a.tecnico===tecnicoFiltro)



const mediaAvaliacao =
avaliacoesTecnico.length
? avaliacoesTecnico.reduce(
(acc,a)=>acc+Number(a.nota_media||0),0
)/avaliacoesTecnico.length
:0



/* RANKING */

const ranking = tecnicos.map(t=>{

const visitasTec =
visitas.filter(v=>v.tecnico===t)

const aval =
avaliacoes.filter(a=>a.tecnico===t)

const media =
aval.length
? aval.reduce((a,b)=>a+Number(b.nota_media||0),0)/aval.length
:0

return{
tecnico:t,
visitas:visitasTec.length,
media
}

})
.filter(t=>t.tecnico!=="Todos")
.sort((a,b)=>b.media-a.media)



/* TEMPO MEDIO */

const tempo = tecnicos.map(t=>{

const visTec =
visitas.filter(v=>v.tecnico===t && v.data_visita)

const dias = visTec.map(v=>{

const abertura = parseDateLocal(v.data_abertura)
const visitaData = parseDateLocal(v.data_visita)

if(!abertura || !visitaData) return 0

return Math.abs(
visitaData.getTime() -
abertura.getTime()
)/(1000*60*60*24)

})

const media =
dias.length
? dias.reduce((a,b)=>a+b,0)/dias.length
:0

return{
tecnico:t,
tempo:media
}

})
.filter(t=>t.tecnico!=="Todos")



/* GRAFICO CATEGORIA */

const categoriaMap:Record<string,number> = {}

visitasFiltradas.forEach(v=>{

if(!categoriaMap[v.categoria])
categoriaMap[v.categoria]=0

categoriaMap[v.categoria]++

})



const graficoCategorias =
Object.entries(categoriaMap).map(([categoria,total])=>({
categoria,
total
}))



/* VISITAS POR MES */

const mesMap:Record<string,number> = {}

visitasFiltradas.forEach(v=>{

if(!v.data_visita) return

const data = parseDateLocal(v.data_visita)

if(!data) return

const mes =
data.toLocaleDateString("pt-BR",{month:"short"})

if(!mesMap[mes])
mesMap[mes]=0

mesMap[mes]++

})



const graficoMes =
Object.entries(mesMap).map(([mes,total])=>({
mes,
total
}))



/* PIZZA ESCOLAS */

const escolasAtendidas = escolasTecnico.size
const totalEscolas = 82

const pizzaData=[
{name:"Atendidas",value:escolasAtendidas},
{name:"Não atendidas",value:totalEscolas-escolasAtendidas}
]



return(

<div className="space-y-8">

<div className="flex justify-between items-center">

<h1 className="text-3xl font-bold">
Visão Geral - Atendimentos Field
</h1>

<select
value={tecnicoFiltro}
onChange={(e)=>setTecnicoFiltro(e.target.value)}
className="bg-[#020617] border border-slate-800 rounded-lg p-2"
>

{tecnicos.map(t=>
<option key={t}>{t}</option>
)}

</select>

</div>



{/* CARDS */}

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<Card title="Visitas realizadas" value={totalVisitas}/>

<Card title="Técnicos ativos" value={tecnicosAtivos}/>

<Card title="Avaliação média"
value={`${mediaAvaliacao.toFixed(1)} ⭐`}/>

<Card title="Escolas atendidas"
value={escolasTecnico.size}/>

</div>



{/* RANKING + TEMPO */}

<div className="grid xl:grid-cols-2 gap-6">

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="mb-4 font-semibold">
Ranking técnicos
</h3>

{ranking.map((r,i)=>

<div key={i}
className="p-3 border border-slate-800 rounded-xl flex justify-between mb-2">

<Link
href={`/fields/tecnico/${encodeURIComponent(r.tecnico)}`}
className="hover:text-blue-400 transition">

#{i+1} {r.tecnico}

</Link>

<p className="text-blue-400">
{r.media.toFixed(1)} ⭐
</p>

</div>

)}

</div>



<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="mb-4 font-semibold">
Tempo médio atendimento
</h3>

{tempo.map((t,i)=>

<div key={i}
className="p-3 border border-slate-800 rounded-xl flex justify-between mb-2">

<p>{t.tecnico}</p>

<p className="text-yellow-400">
{t.tempo.toFixed(1)} dias
</p>

</div>

)}

</div>

</div>



{/* GRAFICOS */}

<div className="grid xl:grid-cols-3 gap-6">

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="mb-4 font-semibold">
Chamados por categoria
</h3>

<div style={{height:300}}>

<ResponsiveContainer>

<BarChart data={graficoCategorias}>
<XAxis dataKey="categoria"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="total" fill="#3b82f6"/>
</BarChart>

</ResponsiveContainer>

</div>

</div>



<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="mb-4 font-semibold">
Visitas por mês
</h3>

<div style={{height:300}}>

<ResponsiveContainer>

<BarChart data={graficoMes}>
<XAxis dataKey="mes"/>
<YAxis/>
<Tooltip/>
<Bar dataKey="total" fill="#22c55e"/>
</BarChart>

</ResponsiveContainer>

</div>

</div>



<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="mb-4 font-semibold">
Cobertura das escolas
</h3>

<div style={{height:300}}>

<ResponsiveContainer>

<PieChart>

<Pie
data={pizzaData}
dataKey="value"
nameKey="name"
outerRadius={90}
label
>

<Cell fill="#22c55e"/>
<Cell fill="#ef4444"/>

</Pie>

<Tooltip/>

</PieChart>

</ResponsiveContainer>

</div>

</div>

</div>



{/* SLA */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h3 className="mb-4 font-semibold">
SLA por escola
</h3>

<div className="grid md:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto">

{slaArray.map((s)=>(

<div key={s.escola}
className="p-3 border border-slate-800 rounded-xl flex justify-between">

<p>{s.escola}</p>

<p className="text-orange-400">
{s.tempo} dias
</p>

</div>

))}

</div>

</div>

</div>

)

}



function Card({title,value}:{title:string,value:any}){

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