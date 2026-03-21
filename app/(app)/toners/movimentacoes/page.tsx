"use client"

import { useEffect,useState } from "react"
import { createClient } from "@/lib/supabase"

export default function HistoricoMovimentacoes(){

const supabase = createClient()

const [dados,setDados] = useState<any[]>([])
const [filtro,setFiltro] = useState("")
const [loading,setLoading] = useState(true)

/* filtros */

const [filtroTipo,setFiltroTipo] = useState("")
const [filtroToner,setFiltroToner] = useState("")
const [filtroUsuario,setFiltroUsuario] = useState("")

const [listaToners,setListaToners] = useState<string[]>([])
const [listaUsuarios,setListaUsuarios] = useState<string[]>([])

/* métricas */

const [totalEntradas,setTotalEntradas] = useState(0)
const [totalSaidas,setTotalSaidas] = useState(0)
const [mediaAtendimento,setMediaAtendimento] = useState(0)
const [totalChamados,setTotalChamados] = useState(0)

async function carregar(){

setLoading(true)

const {data,error} = await supabase
.from("tonners_movimentacoes_view")
.select("*")
.order("data_movimentacao",{ascending:false})

if(error){
console.error(error)
}

setDados(data || [])

/* listas de filtros */

const toners = [...new Set((data || []).map((d:any)=>d.tonner_nome).filter(Boolean))]
const usuarios = [...new Set((data || []).map((d:any)=>d.usuario_nome).filter(Boolean))]

setListaToners(toners)
setListaUsuarios(usuarios)

calcularMetricas(data || [])

setLoading(false)

}

/* métricas */

function calcularMetricas(lista:any[]){

let entradas = 0
let saidas = 0
let somaTempo = 0
let countTempo = 0
let chamados = 0

lista.forEach(m=>{

if(m.tipo_movimentacao === "ENTRADA"){

entradas += m.quantidade

if(m.numero_chamado) chamados++

if(m.data_abertura && m.data_movimentacao){

const abertura = new Date(m.data_abertura).getTime()
const recebimento = new Date(m.data_movimentacao).getTime()

if(!isNaN(abertura) && !isNaN(recebimento)){

const dias = (recebimento - abertura) / (1000*60*60*24)

if(dias >= 0){
somaTempo += dias
countTempo++
}

}

}

}

if(m.tipo_movimentacao === "SAIDA"){
saidas += m.quantidade
}

})

setTotalEntradas(entradas)
setTotalSaidas(saidas)
setTotalChamados(chamados)

if(countTempo > 0){
setMediaAtendimento(Number((somaTempo/countTempo).toFixed(1)))
}

}

useEffect(()=>{carregar()},[])

/* filtros */

const filtrados = dados.filter(m=>{

if(filtro && !(
m.impressora?.toLowerCase().includes(filtro.toLowerCase()) ||
m.numero_chamado?.includes(filtro)
)) return false

if(filtroTipo && m.tipo_movimentacao !== filtroTipo) return false

if(filtroToner && m.tonner_nome !== filtroToner) return false

if(filtroUsuario && m.usuario_nome !== filtroUsuario) return false

return true

})

return(

<div className="space-y-8">

<div>

<h1 className="text-2xl font-bold text-white">
📊 Histórico de Movimentações
</h1>

<p className="text-slate-400 text-sm">
Análise completa do fluxo de toners
</p>

</div>

<div className="flex justify-end gap-3 flex-wrap">

<select
value={filtroTipo}
onChange={e=>setFiltroTipo(e.target.value)}
className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm"
>
<option value="">Tipo</option>
<option value="ENTRADA">Entrada</option>
<option value="SAIDA">Saída</option>
</select>

<select
value={filtroToner}
onChange={e=>setFiltroToner(e.target.value)}
className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm"
>
<option value="">Toner</option>

{listaToners.map(t=>(
<option key={t}>{t}</option>
))}

</select>

<select
value={filtroUsuario}
onChange={e=>setFiltroUsuario(e.target.value)}
className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm"
>
<option value="">Usuário</option>

{listaUsuarios.map(u=>(
<option key={u}>{u}</option>
))}

</select>

</div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
<p className="text-xs text-slate-400">Toners recebidos</p>
<p className="text-2xl text-green-400 font-bold">{totalEntradas}</p>
</div>

<div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
<p className="text-xs text-slate-400">Toners utilizados</p>
<p className="text-2xl text-red-400 font-bold">{totalSaidas}</p>
</div>

<div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
<p className="text-xs text-slate-400">Tempo médio atendimento</p>
<p className="text-2xl text-blue-400 font-bold">{mediaAtendimento} dias</p>
</div>

<div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
<p className="text-xs text-slate-400">Chamados registrados</p>
<p className="text-2xl text-yellow-400 font-bold">{totalChamados}</p>
</div>

</div>

<div className="bg-[#020617] border border-slate-800 rounded-xl p-4">

<input
placeholder="🔎 Buscar por impressora ou chamado..."
value={filtro}
onChange={e=>setFiltro(e.target.value)}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg"
/>

</div>

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
📜 Movimentações
</h2>

<div className="overflow-x-auto">

<table className="w-full text-sm">

<thead className="text-slate-400">

<tr className="border-b border-slate-800">

<th className="text-left py-2">Tipo</th>
<th className="text-left py-2">Toner</th>
<th className="text-left py-2">Qtd</th>
<th className="text-left py-2">Impressora</th>
<th className="text-left py-2">Chamado</th>
<th className="text-left py-2">Abertura</th>
<th className="text-left py-2">Recebimento</th>
<th className="text-left py-2">Tempo</th>
<th className="text-left py-2">Usuário</th>

</tr>

</thead>

<tbody>

{filtrados.map(m=>{

let tempo = "-"

if(m.data_abertura && m.data_movimentacao){

const abertura = new Date(m.data_abertura)
const receb = new Date(m.data_movimentacao)

if(!isNaN(abertura.getTime()) && !isNaN(receb.getTime())){

const dias = Math.round((receb.getTime()-abertura.getTime())/(1000*60*60*24))
tempo = dias + "d"

}

}

return(

<tr key={m.id} className="border-b border-slate-900 hover:bg-slate-900/50">

<td className={m.tipo_movimentacao==="ENTRADA"?"text-green-400":"text-red-400"}>
{m.tipo_movimentacao}
</td>

<td className="text-white">
{m.tonner_nome}
</td>

<td className="text-slate-300">
{m.quantidade}
</td>

<td className="text-slate-400">
{m.impressora}
</td>

<td className="text-slate-300">
{m.numero_chamado || "-"}
</td>

{/* DATA DE ABERTURA CORRIGIDA */}
<td className="text-slate-400">
{m.data_abertura ? new Date(m.data_abertura).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
</td>

{/* DATA DE RECEBIMENTO CORRIGIDA */}
<td className="text-slate-400">
{new Date(m.data_movimentacao).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
</td>

<td className="text-blue-400">
{tempo}
</td>

<td className="text-blue-400 text-xs">
👤 {m.usuario_nome}
</td>

</tr>

)

})}

</tbody>

</table>

</div>

</div>

</div>

)

}