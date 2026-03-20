"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function AdminAvisos() {

const supabase = createClient()

const [avisos,setAvisos] = useState<any[]>([])
const [titulo,setTitulo] = useState("")
const [descricao,setDescricao] = useState("")
const [emoji,setEmoji] = useState("⚠️")

/* NOVOS CAMPOS */

const [tipo,setTipo] = useState("informativo")
const [dataInicio,setDataInicio] = useState("")
const [dataFim,setDataFim] = useState("")

async function carregar(){

const {data} = await supabase
.from("avisos_setec")
.select("*")
.order("created_at",{ascending:false})

setAvisos(data || [])

}

async function criarAviso(){

if(!titulo || !descricao) return alert("Preencha os campos")

// CORREÇÃO: Pega o valor exato do input datetime-local sem converter para UTC forçado
// Se houver valor, adiciona o fuso horário de SP (-03:00) para salvar certo no banco
const dtInicioISO = dataInicio ? `${dataInicio}:00-03:00` : null;
const dtFimISO = dataFim ? `${dataFim}:00-03:00` : null;

await supabase.from("avisos_setec").insert({

titulo,
descricao,
emoji,
tipo,
data_inicio: dtInicioISO,
data_fim: dtFimISO,
ativo:true

})

setTitulo("")
setDescricao("")
setEmoji("⚠️")
setTipo("informativo")
setDataInicio("")
setDataFim("")

carregar()

}

async function alternarAviso(id:any,ativo:boolean){

await supabase
.from("avisos_setec")
.update({ativo:!ativo})
.eq("id",id)

carregar()

}

useEffect(()=>{carregar()},[])

// Helper para formatar data na tela
function formatarData(dataStr: string | null) {
  if (!dataStr) return "-";
  return new Date(dataStr).toLocaleString("pt-BR", { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' 
  });
}

// Helper para definir o status temporal
function getStatusTemporal(inicio: string | null, fim: string | null, ativo: boolean) {
  if (!ativo) return { texto: "Desativado Manualmente", cor: "text-red-400" };
  
  const agora = new Date().getTime();
  const dtInicio = inicio ? new Date(inicio).getTime() : 0;
  const dtFim = fim ? new Date(fim).getTime() : Infinity;

  if (dtInicio > agora) return { texto: "⏳ Agendado (Futuro)", cor: "text-yellow-400" };
  if (dtFim < agora) return { texto: "⏰ Expirado", cor: "text-slate-500" };
  return { texto: "🟢 Vigente", cor: "text-green-400" };
}

return(

<div className="space-y-8">

{/* HEADER */}

<div>

<h1 className="text-2xl font-bold text-white">
Gestão de Avisos SETEC
</h1>

<p className="text-slate-400 text-sm">
Avisos exibidos na página principal
</p>

</div>

{/* FORMULÁRIO */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-4">

<h2 className="text-white font-semibold">
Criar novo aviso
</h2>

<input
value={emoji}
onChange={(e)=>setEmoji(e.target.value)}
placeholder="Emoji"
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-blue-500 outline-none"
/>

<input
value={titulo}
onChange={(e)=>setTitulo(e.target.value)}
placeholder="Título do aviso"
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-blue-500 outline-none"
/>

<textarea
value={descricao}
onChange={(e)=>setDescricao(e.target.value)}
placeholder="Descrição"
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-blue-500 outline-none min-h-[100px]"
/>

{/* TIPO */}

<div className="space-y-1">
<label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tipo de Aviso</label>
<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-blue-500 outline-none"
>

<option value="informativo">ℹ️ Informativo</option>
<option value="alerta">⚠️ Alerta</option>
<option value="comunicado">📢 Comunicado</option>
<option value="urgente">🚨 Urgente</option>

</select>
</div>

{/* AGENDAMENTO */}

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

<div className="space-y-1">
<label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Data de Entrada (Opcional)</label>
<input
type="datetime-local"
value={dataInicio}
onChange={(e)=>setDataInicio(e.target.value)}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-blue-500 outline-none"
/>
</div>

<div className="space-y-1">
<label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Data de Expiração (Opcional)</label>
<input
type="datetime-local"
value={dataFim}
onChange={(e)=>setDataFim(e.target.value)}
className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white focus:border-blue-500 outline-none"
/>
</div>

</div>

<button
onClick={criarAviso}
className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg text-white font-bold transition-colors w-full md:w-auto"
>

Publicar aviso

</button>

</div>

{/* PREVIEW */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
Preview do Layout
</h2>

<div className="flex gap-3 bg-slate-900/50 border border-slate-800 p-4 rounded-xl">

<span className="text-2xl mt-1">{emoji}</span>

<div>

<p className="text-white text-base font-bold">
{titulo || "Título do aviso"}
</p>

<p className="text-slate-400 text-sm mt-1">
{descricao || "A descrição completa do seu aviso aparecerá aqui."}
</p>

</div>

</div>

</div>

{/* LISTA */}

<div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">

<h2 className="text-white font-semibold mb-4">
Avisos Existentes
</h2>

<div className="space-y-4">

{avisos.length === 0 && (
  <p className="text-slate-500 text-sm">Nenhum aviso registrado.</p>
)}

{avisos.map(a=>{
  const statusTemporal = getStatusTemporal(a.data_inicio, a.data_fim, a.ativo);

  return (

<div
key={a.id}
className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-xl gap-4 hover:border-slate-700 transition-colors"
>

<div className="flex gap-4">

<span className="text-3xl mt-1">
{a.emoji}
</span>

<div className="space-y-1">

<p className="text-white text-base font-bold">
{a.titulo}
</p>

<p className="text-slate-400 text-sm max-w-xl">
{a.descricao}
</p>

<div className="flex flex-wrap gap-3 mt-2">
  <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">
    {a.tipo}
  </span>
  <span className={`px-2 py-1 rounded text-xs font-bold bg-slate-800/50 border border-slate-700 ${statusTemporal.cor}`}>
    {statusTemporal.texto}
  </span>
</div>

<div className="flex gap-4 mt-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
  <p>Início: {formatarData(a.data_inicio)}</p>
  <p>Fim: {formatarData(a.data_fim)}</p>
</div>

</div>

</div>

<button
onClick={()=>alternarAviso(a.id,a.ativo)}
className={`px-4 py-2 rounded-lg text-xs font-bold shrink-0 shadow-sm transition-colors ${
a.ativo
? "bg-emerald-600 hover:bg-emerald-500 text-white"
: "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
}`}
>

{a.ativo ? "Desativar (Forçar)" : "Reativar"}

</button>

</div>

)})}

</div>

</div>

</div>

)

}