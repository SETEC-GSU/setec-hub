"use client"

import { useEffect,useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function RegistrarEntrada(){

const supabase = createClient()
const router = useRouter()

const [tipos,setTipos] = useState<any[]>([])
const [tipo,setTipo] = useState("")
const [impressora,setImpressora] = useState("")
const [numeroChamado,setNumeroChamado] = useState("")
const [quantidade,setQuantidade] = useState(1)
const [dataAbertura,setDataAbertura] = useState("")
const [loading,setLoading] = useState(false)

async function carregarTipos(){

const {data,error} = await supabase
.from("tonner_tipos")
.select("*")
.order("nome")

if(error){
console.error("Erro carregando tipos:",error)
}

setTipos(data || [])

}

useEffect(()=>{
carregarTipos()
},[])

async function registrar(e:any){

e.preventDefault()

if(loading) return
setLoading(true)

try{

const {data:userData,error:userError} = await supabase.auth.getUser()

if(userError){
console.error("Erro pegando usuário:",userError)
alert("Erro ao identificar usuário")
setLoading(false)
return
}

const userId = userData.user?.id

const payload = {

tipo_movimentacao: "ENTRADA",

tonner_tipo: tipo,

quantidade: quantidade,

impressora: impressora,

numero_chamado: numeroChamado || null,

data_abertura: dataAbertura,

data_movimentacao: new Date().toISOString(),

registrado_por: userId

}

console.log("Payload enviado:",payload)

const {error} = await supabase
.from("tonners_movimentacoes")
.insert(payload)

if(error){

console.error("Erro no insert:",error)
alert("Erro ao registrar entrada. Veja o console.")
setLoading(false)
return

}

router.push("/toners")

}catch(err){

console.error("Erro inesperado:",err)
alert("Erro inesperado")

}

setLoading(false)

}

return(

<div className="max-w-xl space-y-6">

<h1 className="text-2xl font-bold text-white">
📦 Registrar Entrada de Toner
</h1>

<form
onSubmit={registrar}
className="bg-[#020617] border border-slate-800 rounded-xl p-6 space-y-4"
>

{/* TONER */}

<select
value={tipo}
onChange={e=>setTipo(e.target.value)}
required
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-slate-300"
>

<option value="" disabled>
🖨️ Selecione o tipo de toner
</option>

{tipos.map(t=>(
<option key={t.id} value={t.id}>
{t.nome}
</option>
))}

</select>

{/* IMPRESSORA */}

<select
value={impressora}
onChange={e=>setImpressora(e.target.value)}
required
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-slate-300"
>

<option value="" disabled>
🖨️ Impressora de destino
</option>

<option>ASSESSORIA</option>
<option>CAF</option>
<option>CRH</option>
<option>NRM</option>

</select>

{/* CHAMADO */}

<input
type="text"
placeholder="🎫 Número do chamado"
value={numeroChamado}
onChange={e=>setNumeroChamado(e.target.value)}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg"
/>

{/* DATA ABERTURA */}

<div className="space-y-1">

<label className="text-sm text-slate-400">
📅 Data de abertura do chamado
</label>

<input
type="date"
value={dataAbertura}
onChange={e=>setDataAbertura(e.target.value)}
required
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg"
/>

</div>

{/* QUANTIDADE */}

<div className="space-y-1">

<label className="text-sm text-slate-400">
📦 Quantidade de toners recebidos
</label>

<input
type="number"
min="1"
value={quantidade}
onChange={e=>setQuantidade(Number(e.target.value))}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg"
/>

</div>

<button
disabled={loading}
className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold disabled:opacity-50"
>
{loading ? "Registrando..." : "Registrar Entrada"}
</button>

</form>

</div>

)

}