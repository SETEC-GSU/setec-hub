"use client"

import { useEffect, useState } from "react"
import Card from "@/components/ui/Card"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TutoriaisPopulares(){

const [topTutoriais,setTopTutoriais] = useState<any[]>([])
const [porCategoria,setPorCategoria] = useState<any[]>([])
const [estatisticas,setEstatisticas] = useState<any>({
totalTutoriais:0,
totalViews:0
})

/* NOVOS ESTADOS */

const [problemasRecorrentes,setProblemasRecorrentes] = useState<any[]>([])
const [equipamentosSuporte,setEquipamentosSuporte] = useState<any[]>([])
const [tutoriaisNaoUsados,setTutoriaisNaoUsados] = useState<any[]>([])

async function carregar(){

/* TOP TUTORIAIS */

const { data:top } = await supabase
.from("base_conhecimento")
.select("*")
.order("visualizacoes",{ascending:false})
.limit(10)

/* TODOS PARA ESTATÍSTICA */

const { data:todos } = await supabase
.from("base_conhecimento")
.select("*")

/* AGRUPAR POR CATEGORIA */

const categorias:any = {}

todos?.forEach((item:any)=>{

if(!categorias[item.categoria]){
categorias[item.categoria] = 0
}

categorias[item.categoria] += item.visualizacoes || 0

})

const rankingCategorias = Object.entries(categorias)
.map(([categoria,views])=>({categoria,views}))
.sort((a:any,b:any)=>b.views-a.views)

/* PROBLEMAS MAIS RECORRENTES */

const recorrentes = [...(todos || [])]
.sort((a:any,b:any)=>(b.visualizacoes||0)-(a.visualizacoes||0))
.slice(0,5)

/* EQUIPAMENTOS QUE MAIS GERAM SUPORTE */

const equipamentos:any = {}

todos?.forEach((item:any)=>{

if(item.categoria === "EQUIPAMENTOS"){

const sub = item.subcategoria || "Outros"

if(!equipamentos[sub]){
equipamentos[sub] = 0
}

equipamentos[sub] += item.visualizacoes || 0

}

})

const rankingEquipamentos = Object.entries(equipamentos)
.map(([equip,views])=>({equip,views}))
.sort((a:any,b:any)=>b.views-a.views)

/* TUTORIAIS NUNCA UTILIZADOS */

const naoUsados = (todos || [])
.filter((item:any)=>(item.visualizacoes || 0) === 0)
.slice(0,6)

setTopTutoriais(top || [])
setPorCategoria(rankingCategorias)

setProblemasRecorrentes(recorrentes)
setEquipamentosSuporte(rankingEquipamentos)
setTutoriaisNaoUsados(naoUsados)

setEstatisticas({
totalTutoriais:todos?.length || 0,
totalViews:todos?.reduce((acc:any,i:any)=>acc+(i.visualizacoes||0),0)
})

}

useEffect(()=>{
carregar()
},[])


/* CONTADOR DE VISUALIZAÇÃO */

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

window.open(item.arquivo_url,"_blank")

carregar()

}


return(

<div className="space-y-10">

<h1 className="text-3xl font-bold text-white flex items-center gap-2">
🔥 Tutoriais mais acessados
</h1>


{/* ESTATÍSTICAS */}

<div className="grid md:grid-cols-3 gap-6">

<Card>

<p className="text-sm text-slate-400">
Total de tutoriais
</p>

<p className="text-3xl font-bold text-white">
{estatisticas.totalTutoriais}
</p>

</Card>

<Card>

<p className="text-sm text-slate-400">
Total de acessos
</p>

<p className="text-3xl font-bold text-white">
{estatisticas.totalViews}
</p>

</Card>

<Card>

<p className="text-sm text-slate-400">
Média de acessos
</p>

<p className="text-3xl font-bold text-white">
{estatisticas.totalTutoriais
? (estatisticas.totalViews/estatisticas.totalTutoriais).toFixed(1)
: 0}
</p>

</Card>

</div>


{/* TOP TUTORIAIS */}

<Card>

<h2 className="text-xl font-semibold mb-6">
🏆 Top Tutoriais da Rede
</h2>

<div className="space-y-3">

{topTutoriais.map((item:any,index)=>(

<button
key={item.id}
onClick={()=>registrarVisualizacao(item)}
className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-cyan-500 transition text-left"
>

<div>

<p className="text-white font-semibold">
#{index+1} {item.titulo}
</p>

<p className="text-xs text-slate-400">
{item.categoria} • {item.subcategoria || "Geral"}
</p>

</div>

<div className="text-cyan-400 font-semibold">
{item.visualizacoes || 0} acessos
</div>

</button>

))}

</div>

</Card>


{/* RANKING POR CATEGORIA */}

<Card>

<h2 className="text-xl font-semibold mb-6">
📊 Categorias mais consultadas
</h2>

<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

{porCategoria.map((cat:any)=>(

<div
key={cat.categoria}
className="bg-slate-900 border border-slate-800 rounded-xl p-5"
>

<p className="text-white font-semibold">
{cat.categoria}
</p>

<p className="text-cyan-400 text-lg font-bold">
{cat.views} acessos
</p>

</div>

))}

</div>

</Card>


{/* PROBLEMAS MAIS RECORRENTES */}

<Card>

<h2 className="text-xl font-semibold mb-6">
🧠 Problemas mais recorrentes da rede
</h2>

<div className="space-y-3">

{problemasRecorrentes.map((item:any,index)=>(

<div
key={item.id}
className="flex justify-between bg-slate-900 border border-slate-800 rounded-xl p-4"
>

<p className="text-white">
#{index+1} {item.titulo}
</p>

<span className="text-cyan-400 font-semibold">
{item.visualizacoes || 0}
</span>

</div>

))}

</div>

</Card>


{/* EQUIPAMENTOS QUE MAIS GERAM SUPORTE */}

<Card>

<h2 className="text-xl font-semibold mb-6">
💻 Equipamentos que mais geram suporte
</h2>

<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

{equipamentosSuporte.map((equip:any)=>(

<div
key={equip.equip}
className="bg-slate-900 border border-slate-800 rounded-xl p-5"
>

<p className="text-white font-semibold">
{equip.equip}
</p>

<p className="text-cyan-400 font-bold">
{equip.views} acessos
</p>

</div>

))}

</div>

</Card>


{/* TUTORIAIS NUNCA UTILIZADOS */}

<Card>

<h2 className="text-xl font-semibold mb-6">
📉 Tutoriais ainda não utilizados
</h2>

<div className="space-y-2">

{tutoriaisNaoUsados.map((item:any)=>(

<div
key={item.id}
className="text-slate-300 bg-slate-900 border border-slate-800 rounded-xl p-3"
>

📄 {item.titulo}

</div>

))}

</div>

</Card>

</div>

)

}