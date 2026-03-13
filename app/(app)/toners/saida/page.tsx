"use client"

import { useEffect,useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function RegistrarSaida(){

const supabase = createClient()
const router = useRouter()

const [tipos,setTipos] = useState<any[]>([])
const [tipo,setTipo] = useState("")
const [impressora,setImpressora] = useState("")
const [quantidade,setQuantidade] = useState(1)
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

tipo_movimentacao: "SAIDA",

tonner_tipo: tipo,

quantidade: quantidade,

impressora: impressora,

data_movimentacao: new Date().toISOString(),

registrado_por: userId

}

console.log("Payload enviado:",payload)

const {error} = await supabase
.from("tonners_movimentacoes")
.insert(payload)

if(error){

console.error("Erro no insert:",error)
alert("Erro ao registrar saída. Veja o console.")
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
📤 Registrar Saída de Toner
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

{/* QUANTIDADE */}

<div className="space-y-1">

<label className="text-sm text-slate-400">
📦 Quantidade de toners utilizados
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
className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold disabled:opacity-50"
>
{loading ? "Registrando..." : "Registrar Saída"}
</button>

</form>

</div>

)
}