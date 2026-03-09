"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

import {
Calendar,
dateFnsLocalizer
} from "react-big-calendar"

import { format } from "date-fns"
import { parse } from "date-fns"
import { startOfWeek } from "date-fns"
import { getDay } from "date-fns"
import { ptBR } from "date-fns/locale"

import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
"pt-BR": ptBR
}

const localizer = dateFnsLocalizer({
format,
parse,
startOfWeek,
getDay,
locales
})

function parseDateLocal(dateStr:string){

const [y,m,d] = dateStr.split("-")

return new Date(
Number(y),
Number(m)-1,
Number(d)
)

}

export default function AgendaFields(){

const supabase = createClient()

const [visitas,setVisitas] = useState<any[]>([])
const [eventos,setEventos] = useState<any[]>([])
const [tecnicoFiltro,setTecnicoFiltro] = useState("Todos")
const [statusFiltro,setStatusFiltro] = useState("Todos")



useEffect(()=>{

async function carregar(){

const {data} =
await supabase
.from("fields_visitas")
.select("*")

setVisitas(data || [])

}

carregar()

},[])



useEffect(()=>{

let filtrado = [...visitas]

if(tecnicoFiltro !== "Todos"){

filtrado = filtrado.filter(v =>
String(v.tecnico).toLowerCase() ===
tecnicoFiltro.toLowerCase()
)

}

if(statusFiltro !== "Todos"){

filtrado = filtrado.filter(v =>
String(v.status).toLowerCase() ===
statusFiltro.toLowerCase()
)

}



const eventosFormatados = filtrado
.map(v=>{

const status =
String(v.status).toLowerCase()

let dataEvento = null

if(status.includes("pendente"))
dataEvento = v.data_prevista

if(status.includes("realizada"))
dataEvento = v.data_visita

if(!dataEvento) return null

const data = parseDateLocal(dataEvento)

return{

title:`${v.escola}|${v.tecnico}|${status}`,
start:data,
end:data,
allDay:true

}

})
.filter(Boolean)

setEventos(eventosFormatados)

},[visitas,tecnicoFiltro,statusFiltro])



const tecnicos = [
"Todos",
...new Set(visitas.map(v=>v.tecnico))
]



return(

<div className="space-y-6">

<h1 className="text-3xl font-bold">
Agenda de Atendimentos Field
</h1>



{/* FILTROS */}

<div className="flex gap-4">

<select
value={tecnicoFiltro}
onChange={(e)=>setTecnicoFiltro(e.target.value)}
className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-2"
>

<option value="Todos">
Selecionar técnico
</option>

{tecnicos
.filter(t=>t!=="Todos")
.map(t=>(
<option key={t}>{t}</option>
))}

</select>



<select
value={statusFiltro}
onChange={(e)=>setStatusFiltro(e.target.value)}
className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-2"
>

<option value="Todos">
Selecionar status
</option>

<option value="Pendente">
Pendente
</option>

<option value="Realizada">
Realizada
</option>

</select>

</div>



{/* CALENDARIO */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<div style={{height:720}}>

<Calendar
localizer={localizer}
events={eventos}
startAccessor="start"
endAccessor="end"
culture="pt-BR"
popup
showAllEvents
views={["month","week","day","agenda"]}



/* ESTILO EVENTOS */

eventPropGetter={(event:any)=>{

const [escola,tecnico,status] =
event.title.split("|")

const pendente =
status.includes("pendente")

return{

style:{

backgroundColor: pendente
? "#facc15"
: "#22c55e",

color:"#020617",

borderRadius:"10px",

padding:"6px",

fontWeight:600,

border:"none"

}

}

}}



/* CONTEUDO EVENTO */

components={{

event:({event}:any)=>{

const [escola,tecnico,status] =
event.title.split("|")

const pendente =
status.includes("pendente")

return(

<div className="flex flex-col">

<span className="text-xs font-semibold">
🏫 {escola}
</span>

<span className="text-[11px] opacity-80">
👨‍🔧 {tecnico}
</span>

<span className={`text-[10px] font-bold mt-1 px-2 py-[2px] rounded-md w-fit
${pendente
? "bg-yellow-400 text-black"
: "bg-green-500 text-white"
}`}>

{pendente ? "Pendente" : "Realizada"}

</span>

</div>

)

}

}}

style={{height:"100%"}}

/>

</div>

</div>



<style jsx global>{`

.rbc-month-view{
background:#020617;
border:none;
}

.rbc-time-view{
background:#020617;
border:none;
}

.rbc-time-content{
display:none;
}

.rbc-time-gutter{
display:none;
}

.rbc-date-cell{
color:#94a3b8;
}

.rbc-today{
background:#0f172a !important;
}

.rbc-off-range-bg{
background:#020617;
}

.rbc-header{
color:#cbd5f5;
border-bottom:1px solid #1e293b;
}

.rbc-day-bg{
border-color:#1e293b;
}

`}</style>



</div>

)

}