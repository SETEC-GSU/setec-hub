import Card from "@/components/ui/Card"
import { createServerSupabase } from "@/lib/supabase-server"

export default async function DiretoriaPage(){

const supabase = await createServerSupabase()

// EQUIPAMENTOS RECEBIDOS (BASE REAL DA DIRETORIA)
const { data: equipamentos } = await supabase
.from("equipamentos_recebidos")
.select(`
escola_nome,
quantidade_recebida,
equipamentos_modelos(
equipamento,
finalidade
)
`)
.gt("quantidade_recebida",0)


// INVENTÁRIO OPERACIONAL
const { data: itens } = await supabase
.from("inventario_itens")
.select(`
funcionando,
aguardando_garantia,
danificados_mau_uso,
nao_localizado
`)


// ESCOLAS QUE JÁ ENVIARAM INVENTÁRIO
const { data: inventarios } = await supabase
.from("inventario_respostas")
.select("escola_nome")


// TOTAIS OPERACIONAIS

let totalFuncionando = 0
let totalGarantia = 0
let totalDanificados = 0
let totalNaoLocalizados = 0

itens?.forEach((item:any)=>{

totalFuncionando += item.funcionando || 0
totalGarantia += item.aguardando_garantia || 0
totalDanificados += item.danificados_mau_uso || 0
totalNaoLocalizados += item.nao_localizado || 0

})


// BASE DE EQUIPAMENTOS

let totalEquipamentos = 0
let totalPlataformas = 0

const modelos:any = {}
const ranking:any = {}

equipamentos?.forEach((item:any)=>{

const finalidade = item.equipamentos_modelos?.finalidade
const modelo = item.equipamentos_modelos?.equipamento
const quantidade = item.quantidade_recebida
const escola = item.escola_nome

// SEPARA PLATAFORMAS
if(finalidade === "Carregamento móvel"){

totalPlataformas += quantidade
return

}

// TOTAL DIRETORIA
totalEquipamentos += quantidade


// DISTRIBUIÇÃO POR MODELO

if(!modelos[modelo]){

modelos[modelo] = 0

}

modelos[modelo] += quantidade


// RANKING ESCOLAS

if(!ranking[escola]){

ranking[escola] = 0

}

ranking[escola] += quantidade

})


// SAÚDE OPERACIONAL

const saudeGeral =
totalEquipamentos > 0
? Math.round((totalFuncionando / totalEquipamentos) * 100)
: 0


// RANKING ORDENADO

const rankingOrdenado = Object.entries(ranking)
.sort((a:any,b:any)=>b[1]-a[1])
.slice(0,10)


// ESCOLAS COM INVENTÁRIO PENDENTE

const escolasComEquipamentos = [
...new Set(equipamentos?.map((e:any)=>e.escola_nome))
]

const escolasComInventario = [
...new Set(inventarios?.map((i:any)=>i.escola_nome))
]

const escolasPendentes = escolasComEquipamentos.filter(
(escola:any)=>!escolasComInventario.includes(escola)
)



return(

<div className="space-y-8">

<h1 className="text-3xl font-bold text-white">
Visão Completa do Inventário das UEs
</h1>


<div className="grid grid-cols-5 gap-4">

<Card>
<p className="text-xs text-slate-400">Equipamentos</p>
<p className="text-3xl font-bold text-white">
{totalEquipamentos}
</p>
</Card>

<Card>
<p className="text-xs text-slate-400">Funcionando</p>
<p className="text-3xl font-bold text-green-400">
{totalFuncionando}
</p>
</Card>

<Card>
<p className="text-xs text-slate-400">Garantia</p>
<p className="text-3xl font-bold text-yellow-400">
{totalGarantia}
</p>
</Card>

<Card>
<p className="text-xs text-slate-400">Danificados</p>
<p className="text-3xl font-bold text-red-400">
{totalDanificados}
</p>
</Card>

<Card>
<p className="text-xs text-slate-400">Não localizados</p>
<p className="text-3xl font-bold text-gray-400">
{totalNaoLocalizados}
</p>
</Card>

</div>


<Card>

<h2 className="text-xl font-semibold mb-4">
Saúde Operacional da Rede
</h2>

<div className="w-full bg-slate-800 rounded-full h-4">

<div
className="bg-cyan-400 h-4 rounded-full"
style={{width:`${saudeGeral}%`}}
/>

</div>

<p className="text-sm text-cyan-300 mt-2">
{saudeGeral}% do parque tecnológico operacional
</p>

</Card>


<Card>

<h2 className="text-xl font-semibold mb-4">
Plataformas de carregamento
</h2>

<p className="text-3xl font-bold text-blue-400">
{totalPlataformas}
</p>

<p className="text-xs text-slate-400">
Equipamentos de suporte (não entram no cálculo de dispositivos de rede)
</p>

</Card>


<Card>

<h2 className="text-xl font-semibold mb-4">
Distribuição por modelo
</h2>

<div className="grid grid-cols-3 gap-4">

{Object.entries(modelos).map(([modelo,total]:any)=>(

<div
key={modelo}
className="bg-slate-900 border border-slate-800 rounded-xl p-3"
>

<p className="text-xs text-slate-400">
{modelo}
</p>

<p className="text-xl font-bold text-white">
{total}
</p>

</div>

))}

</div>

</Card>


<Card>

<h2 className="text-xl font-semibold mb-4">
Ranking de escolas com mais equipamentos
</h2>

<div className="space-y-2">

{rankingOrdenado.map(([escola,total]:any,i:number)=>(

<div
key={escola}
className="flex justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2"
>

<p className="text-slate-300">
{i+1}º {escola}
</p>

<p className="text-white font-semibold">
{total}
</p>

</div>

))}

</div>

</Card>


<Card>

<h2 className="text-xl font-semibold mb-4">
Inventários pendentes
</h2>

{escolasPendentes.length > 0 ? (

<div className="space-y-2">

{escolasPendentes.map((escola:any,i:number)=>(

<div
key={i}
className="flex justify-between bg-slate-900 border border-red-900 rounded-xl px-4 py-2"
>

<p className="text-red-300">
{escola}
</p>

<p className="text-red-400 font-semibold">
Pendente
</p>

</div>

))}

</div>

) : (

<p className="text-green-400">
Todas as escolas já enviaram inventário.
</p>

)}

</Card>

</div>

)

}