"use client"

import { useEffect,useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function TonersDashboard(){

const supabase = createClient()

const [estoque,setEstoque] = useState<any[]>([])
const [movimentacoes,setMovimentacoes] = useState<any[]>([])

async function carregar(){

const {data:estoqueData} = await supabase
.from("tonners_estoque_atual")
.select("*")

/* ordenar toners manualmente */

const ordem = [
"BLACK MONO",
"BLACK COLOR",
"CIANO",
"MAGENTA",
"YELLOW"
]

const estoqueOrdenado = (estoqueData || []).sort(
(a:any,b:any)=> ordem.indexOf(a.tonner_tipo) - ordem.indexOf(b.tonner_tipo)
)

const {data:movData} = await supabase
.from("tonners_movimentacoes_view")
.select("*")
.order("data_movimentacao",{ascending:false})
.limit(5)

setEstoque(estoqueOrdenado)
setMovimentacoes(movData || [])

}

useEffect(()=>{carregar()},[])

/* cores dos toners */

function corToner(tipo:string){

switch(tipo){

case "BLACK MONO":
return "border-gray-600 bg-gray-900 text-gray-200"

case "BLACK COLOR":
return "border-black bg-black text-white"

case "CIANO":
return "border-cyan-500 bg-cyan-900/40 text-cyan-300"

case "MAGENTA":
return "border-pink-500 bg-pink-900/40 text-pink-300"

case "YELLOW":
return "border-yellow-500 bg-yellow-900/40 text-yellow-300"

default:
return "border-slate-700 bg-slate-900 text-white"

}

}

return(

<div className="space-y-8">

{/* HEADER */}

<div>

<h1 className="text-2xl font-bold text-white">
🖨️ Gestão de Impressoras - URE GUARULHOS SUL
</h1>

<p className="text-slate-400 text-sm">
Controle de suprimentos de impressão - URE
</p>

</div>

{/* AÇÕES */}

<div className="grid grid-cols-2 md:grid-cols-3 gap-4">

<Link
href="toners/entrada"
className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl text-center"
>
📦 Registrar Entrada
</Link>

<Link
href="toners/saida"
className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl text-center"
>
📤 Registrar Saída
</Link>

<Link
href="toners/movimentacoes"
className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl text-center"
>
📜 Histórico
</Link>

</div>

{/* ACESSOS RÁPIDOS */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<div className="flex items-center justify-between mb-4">

<h2 className="text-white font-semibold">
🖥️ Acesso rápido às impressoras
</h2>

<span className="text-xs text-slate-500">
Uso exclusivo na rede local da URE
</span>

</div>

<div className="grid grid-cols-2 md:grid-cols-3 gap-4">

<a
href="http://10.180.112.23/general/status.html"
target="_blank"
className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"
>
🖨️ Impressora ASSESSORIA
</a>

<a
href="http://10.180.112.35/general/status.html"
target="_blank"
className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"
>
🖨️ Impressora CAF
</a>

<a
href="http://10.180.112.24/general/status.html"
target="_blank"
className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"
>
🖨️ Impressora CRH
</a>

<a
href="http://10.180.112.22/general/status.html"
target="_blank"
className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"
>
🖨️ Impressora NRM
</a>

<a
href="http://10.180.113.19/impressoras/"
target="_blank"
className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"
>
📊 Contador de Impressões
</a>

<a
href="https://chamado-kersis.com.br/kersiswebdesk/Login.aspx"
target="_blank"
className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"
>
📨 Portal de Chamados - KERSIS
</a>

</div>

</div>

{/* ESTOQUE */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
📦 Estoque atual
</h2>

<div className="grid grid-cols-2 md:grid-cols-5 gap-4">

{estoque.map(e=>(

<div
key={e.tonner_tipo_id}
className={`border rounded-xl p-4 text-center transition hover:scale-105 ${corToner(e.tonner_tipo)}`}
>

<p className="text-sm font-semibold tracking-wide">
{e.tonner_tipo}
</p>

<p className="text-3xl font-bold mt-1">
{e.estoque_atual}
</p>

</div>

))}

</div>

</div>

{/* ÚLTIMAS MOVIMENTAÇÕES */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
📜 Últimas movimentações
</h2>

<div className="space-y-2">

{movimentacoes.map(m=>(

<div
key={m.id}
className="grid grid-cols-4 items-center bg-slate-900 p-3 rounded-lg text-sm"
>

<span
className={`font-semibold ${
m.tipo_movimentacao === "ENTRADA"
? "text-green-400"
: "text-red-400"
}`}
>
{m.tipo_movimentacao}
</span>

<span className="text-slate-400">
{m.impressora}
</span>

<span className="text-slate-300 text-xs">
{new Date(m.data_movimentacao).toLocaleDateString("pt-BR")}
</span>

<span className="text-blue-400 text-xs text-right">
👤 {m.usuario_nome}
</span>

</div>

))}

</div>

</div>

</div>

)

}