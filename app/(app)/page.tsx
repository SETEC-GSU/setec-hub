"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function Home() {

const supabase = createClient()

const [stats,setStats] = useState({
chamados:0,
visitas:0,
equipamentos:0,
escolas:0
})

const [tutoriais,setTutoriais] = useState<any[]>([])
const [visitas,setVisitas] = useState<any[]>([])
const [avisos,setAvisos] = useState<any[]>([])
const [inventarioPendentes,setInventarioPendentes] = useState(0)
const [tecnicos,setTecnicos] = useState<any[]>([])

async function carregar(){

const agoraTime = new Date().getTime()

const {data:chamados} = await supabase
.from("chamados")
.select("id,status")

const {data:visitasRealizadas} = await supabase
.from("fields_visitas")
.select("id,status")

const {data:equipamentos} = await supabase
.from("equipamentos_recebidos")
.select("quantidade_recebida")

const {data:escolas} = await supabase
.from("escolas")
.select("id,nome_escola")

const totalEscolas = escolas?.length || 0

const {data:inventariosRespondidos} = await supabase
.from("inventario_respostas")
.select("escola_nome")

const escolasRespondidas = [
...new Set(
inventariosRespondidos?.map((i:any)=>i.escola_nome)
)
]

const totalRespondidos = escolasRespondidas.length

setInventarioPendentes(totalEscolas - totalRespondidos)

const {data:tutoriaisData} = await supabase
.from("base_conhecimento")
.select("*")
.order("visualizacoes",{ascending:false})
.limit(5)

const {data:visitasData} = await supabase
.from("fields_visitas")
.select("*")
.order("data_visita",{ascending:false})
.limit(5)

const {data:todosTecnicos} = await supabase
.from("fields_visitas")
.select("tecnico")

const tecnicosUnicos = [
...new Set(
todosTecnicos?.map((v:any)=>v.tecnico).filter(Boolean)
)
]

setTecnicos(tecnicosUnicos)

// LÓGICA CORRIGIDA: Puxar tudo ativo e filtrar localmente para não dar bug de fuso horário no banco
const {data:avisosData} = await supabase
.from("avisos_setec")
.select("*")
.eq("ativo",true)
.order("created_at",{ascending:false})

const avisosValidos = (avisosData || []).filter(a => {
  const dtInicio = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
  const dtFim = a.data_fim ? new Date(a.data_fim).getTime() : Infinity;
  return dtInicio <= agoraTime && dtFim >= agoraTime;
}).slice(0, 3);

setStats({

chamados:chamados?.filter(c=>c.status==="resolvido").length || 0,

visitas:visitasRealizadas?.filter(v=>v.status==="REALIZADA").length || 0,

equipamentos:equipamentos?.reduce((acc:any,item:any)=>acc+item.quantidade_recebida,0) || 0,

escolas:totalEscolas

})

setTutoriais(tutoriaisData || [])
setVisitas(visitasData || [])
setAvisos(avisosValidos)

}

useEffect(()=>{carregar()},[])

return(

<div className="space-y-8">

<div>

<h1 className="text-2xl font-bold text-white">Central Operacional SETEC</h1>

<p className="text-slate-400 text-sm">
Painel de operação tecnológica
</p>

</div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<Card titulo="Chamados Atendidos" valor={stats.chamados} cor="green"/>
<Card titulo="Visitas Realizadas - FIELDs" valor={stats.visitas} cor="blue"/>
<Card titulo="Equipamentos Recebidos - Escolas" valor={stats.equipamentos} cor="purple"/>
<Card titulo="Escolas Cadastradas" valor={stats.escolas} cor="yellow"/>

</div>

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
🚨 Avisos Importantes - SETEC
</h2>

<div className="space-y-3">

{avisos.length === 0 ? (
  <p className="text-slate-500 text-sm">Nenhum aviso no momento.</p>
) : (
  avisos.map(a=>(

<div key={a.id} className="flex gap-3 bg-slate-900 p-3 rounded-lg">

<span className="text-xl">{a.emoji}</span>

<div>

<p className="text-white text-sm font-semibold flex items-center gap-2">
{a.titulo}

<span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
{a.tipo}
</span>

</p>

<p className="text-slate-400 text-xs">
{a.descricao}
</p>

</div>

</div>

)))}

</div>

</div>

<div>

<h2 className="text-white font-semibold mb-4">
⚡ Acesso rápido
</h2>

<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

<Quick href="/chamados" icon="🎫" label="Abrir Chamado com a SETEC"/>
<Quick href="/painel-chamados" icon="📊" label="Painel de Chamados"/>
<Quick href="/inventario" icon="💻" label="Inventário Tecnológico"/>
<Quick href="/apoio-usuario" icon="📚" label="Base de Conhecimento Tecnológico"/>
<Quick href="/fields/agenda-field" icon="📅" label="Agenda - FIELDs"/>
<Quick href="/dashboard-escolar" icon="🏫" label="Dashboard Escolar"/>

</div>

</div>

<div className="bg-red-900/20 border border-red-700 rounded-2xl p-6">

<h2 className="text-red-400 font-semibold mb-2">
📋 Inventários pendentes
</h2>

<p className="text-white text-2xl font-bold">
{inventarioPendentes} escolas ainda não atualizaram o inventário
<Link
href="/inventario/atualizar"
className="ml-4 text-red-300 text-sm underline hover:text-red-200 font-semibold"
>
CLIQUE AQUI PARA ATUALIZAR O INVENTÁRIO DA SUA ESCOLA
</Link>
</p>

</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
📚 Tutoriais mais acessados
</h2>

<div className="space-y-2">

{tutoriais.map(t=>(

<a key={t.id} href={t.arquivo_url} target="_blank"
className="block text-sm text-slate-300 hover:text-white">

{t.titulo} ({t.visualizacoes})

</a>

))}

</div>

</div>

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
🧑‍🔧 Técnicos FIELD
</h2>

<div className="space-y-2 text-slate-300 text-sm flex flex-col">

{tecnicos.map((t:any,i:number)=>(

<div key={i}>• {t}</div>

))}

</div>

</div>

</div>

<a
href="https://wa.me/551124422282?text=Olá%2C%20minha%20escola%20está%20sem%20rede%2C%20poderiam%20abrir%20um%20chamado%20com%20a%20FDE%3F"
target="_blank"
className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 animate-pulse"
>

📡🚨 Minha escola está sem internet

</a>

</div>

)

}

function Card({titulo,valor,cor}:any){

const cores:any={

blue:"text-blue-400 border-blue-500/30",
green:"text-green-400 border-green-500/30",
purple:"text-purple-400 border-purple-500/30",
yellow:"text-yellow-400 border-yellow-500/30"

}

return(

<div className={`border p-4 rounded-xl ${cores[cor]}`}>

<p className="text-xs text-slate-400">{titulo}</p>
<p className="text-2xl font-bold">{valor}</p>

</div>

)

}

function Quick({href,icon,label}:any){

return(

<Link href={href}
className="bg-[#020617] border border-slate-800 rounded-xl p-4 text-center hover:bg-slate-900 transition">

<p className="text-2xl">{icon}</p>
<p className="text-sm text-slate-300 mt-1">{label}</p>

</Link>

)

}