"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"

export default function EscolaDetalhePage() {

const supabase = createClient()
const params = useParams()
const id = Array.isArray(params.id) ? params.id[0] : params.id

const [escola, setEscola] = useState<any>(null)
const [metrics, setMetrics] = useState<any>(null)

function calcMetrics(e: any) {

const salas = Number(e.qtd_salas || 0)
const aps = Number(e.aps_instalados || 0)
const alunos = Number(e.total_alunos || 0)

const equipRecebidos = Number(e.total_equipamentos_recebidos || 0)

const equipFuncionando = Number(
e.total_equipamentos_funcionando ??
equipRecebidos ??
0
)

const wifiIdeal = salas / 2 || 1
const equipIdeal = alunos / 3 || 1

const indiceAP = Math.min(aps / wifiIdeal, 1)
const indiceEquip = Math.min(equipFuncionando / equipIdeal, 1)

/* PESO INVERTIDO — EQUIPAMENTOS MAIS IMPORTANTES */
const score = indiceEquip * 0.6 + indiceAP * 0.4

let criticidade = "Saudável"

if (score < 0.5) criticidade = "Crítica"
else if (score < 0.8) criticidade = "Atenção"

const percentualFuncionando =
equipRecebidos > 0
? equipFuncionando / equipRecebidos
: 0

return {

salas,
aps,
alunos,

equipRecebidos,
equipFuncionando,

percentualFuncionando,

indiceAP,
indiceEquip,
score,
criticidade,

apsFaltantes: Math.max(Math.ceil(wifiIdeal - aps), 0),
equipFaltantes: Math.max(Math.ceil(equipIdeal - equipFuncionando), 0),

}

}

async function carregar() {

const { data } = await supabase
.from("escolas")
.select("*")
.eq("id", id)
.single()

if (data) {
setEscola(data)
setMetrics(calcMetrics(data))
}

}

useEffect(() => {
if (id) carregar()
}, [id])

if (!escola || !metrics)
return <p className="text-white">Carregando...</p>

function badge(c: string) {

if (c === "Crítica")
return "bg-red-500/20 text-red-400"

if (c === "Atenção")
return "bg-yellow-500/20 text-yellow-400"

return "bg-green-500/20 text-green-400"

}

function statusEquipamentos() {

const p = metrics.percentualFuncionando

if (p < 0.6)
return "Crítico — grande parte do parque está inoperante"

if (p < 0.8)
return "Atenção — parte relevante dos equipamentos está parada"

return "Saudável — maioria dos equipamentos em funcionamento"

}

return (

<div className="space-y-8">

{/* HEADER */}

<div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">

<div>
<h1 className="text-3xl font-bold text-white">
{escola.nome_escola}
</h1>

{escola.cie && (
<p className="text-slate-400 text-sm">
CIE: {escola.cie}
</p>
)}

</div>

<div className="flex gap-2">

<span className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-xs">
Unidade Escolar
</span>

<span className={`px-4 py-2 rounded-xl text-xs ${badge(metrics.criticidade)}`}>
{metrics.criticidade}
</span>

</div>

</div>


{/* INDICES GERAIS */}

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

<Metric
title="Índice AP"
value={`${(metrics.indiceAP * 100).toFixed(0)}%`}
color="green"
/>

<Metric
title="Índice Equipamentos"
value={`${(metrics.indiceEquip * 100).toFixed(0)}%`}
color="purple"
/>

<Metric
title="Score Tech"
value={`${(metrics.score * 100).toFixed(0)}%`}
color="pink"
/>

</div>


{/* INFRAESTRUTURA WIFI */}

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

<Metric title="Salas" value={metrics.salas} color="yellow" />

<Metric title="APs instalados" value={metrics.aps} color="green" />

</div>


{/* INFRAESTRUTURA EQUIPAMENTOS */}

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

<Metric title="Alunos" value={metrics.alunos} color="blue" />

<Metric
title="Equip. recebidos"
value={metrics.equipRecebidos}
color="purple"
/>

<Metric
title="Equip. funcionando"
value={metrics.equipFuncionando}
color="purple"
/>

</div>


{/* STATUS PARQUE TECNOLÓGICO */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-5 space-y-3">

<p className="text-sm text-slate-400">
Parque tecnológico
</p>

<div className="flex items-center justify-between">

<p className="text-lg font-semibold text-white">
{(metrics.percentualFuncionando * 100).toFixed(0)}% dos equipamentos estão funcionando
</p>

</div>

<div className="w-full bg-slate-800 rounded-full h-2">

<div
className="bg-indigo-500 h-2 rounded-full"
style={{
width: `${metrics.percentualFuncionando * 100}%`
}}
/>

</div>

<p className="text-sm text-slate-400">
{statusEquipamentos()}
</p>

</div>


{/* ALERTAS */}

{(metrics.apsFaltantes > 0 || metrics.equipFaltantes > 0) && (

<div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-yellow-400 space-y-1">

{metrics.apsFaltantes > 0 && (
<p>
📡 Recomendação: instalar <b>{metrics.apsFaltantes}</b> AP(s)
</p>
)}

{metrics.equipFaltantes > 0 && (
<p>
💻 Recomendação: enviar <b>{metrics.equipFaltantes}</b> equipamentos
</p>
)}

</div>

)}


{/* GRID INFO ESCOLA */}

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

<Card titulo="Dados institucionais">

<Item label="Tipo ensino" value={escola.tipo_ensino} />
<Item label="Período" value={escola.periodo} />
<Item label="Diretor" value={escola.diretor} />

</Card>

<Card titulo="Contato">

<Item label="Endereço" value={escola.endereco} />
<Item label="Telefone" value={escola.telefone} />
<Item label="Email" value={escola.email} />

</Card>

<Card titulo="Funcionamento" full>

<Item label="Abertura" value={escola.horario_abertura} />
<Item label="Fechamento" value={escola.horario_fechamento} />

</Card>

</div>


{/* EXPLICAÇÃO */}

<div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-slate-400 text-sm space-y-2">

<p>
<b>Índice AP:</b> considera 1 Access Point ideal para cada 2 salas.
</p>

<p>
<b>Índice Equipamentos:</b> considera 1 equipamento ideal para cada 3 alunos.
</p>

<p>
<b>Score Tech:</b> média ponderada entre infraestrutura Wi-Fi (40%) e equipamentos (60%).
</p>

</div>

</div>

)
}


/* COMPONENTES */

function Card({ titulo, children, full }: any) {

return (

<div className={`bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-4 ${full ? "md:col-span-2" : ""}`}>

<h3 className="text-white font-semibold">{titulo}</h3>

{children}

</div>

)

}

function Item({ label, value }: any) {

if (!value) return null

return (

<div className="flex justify-between text-sm">

<span className="text-slate-400">{label}</span>

<span className="text-white">{value}</span>

</div>

)

}

function Metric({ title, value, color }: any) {

const colors: any = {
blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
green: "bg-green-500/10 border-green-500/30 text-green-400",
pink: "bg-pink-500/10 border-pink-500/30 text-pink-400",
}

return (

<div className={`p-4 rounded-2xl border ${colors[color]}`}>

<p className="text-xs text-slate-400">{title}</p>

<p className="text-xl font-bold">{value ?? 0}</p>

</div>

)

}