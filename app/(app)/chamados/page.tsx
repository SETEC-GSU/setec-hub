"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

export default function ChamadosPage() {
const supabase = createClient()

const [chamados, setChamados] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [role, setRole] = useState<string | null>(null)

async function carregarChamados() {
const {
data: { session },
} = await supabase.auth.getSession()

if (!session?.user) {
  setLoading(false)
  return
}

// ⭐ buscar role do usuário
const { data: usuario } = await supabase
  .from("usuarios")
  .select("role")
  .eq("id", session.user.id)
  .single()

setRole(usuario?.role ?? null)

const { data } = await supabase
  .from("chamados")
  .select("*")
  .eq("usuario_id", session.user.id)
  .order("created_at", { ascending: false })

setChamados(data || [])
setLoading(false)

}

useEffect(() => {
carregarChamados()
}, [])

function statusColor(s: string) {
if (s === "aberto") return "bg-blue-500/10 text-blue-400"
if (s === "assumido") return "bg-purple-500/10 text-purple-400"
if (s === "em_atendimento") return "bg-yellow-500/10 text-yellow-400"
if (s === "resolvido") return "bg-green-500/10 text-green-400"
return "bg-slate-500/10 text-slate-400"
}

function formatarData(data: string) {
return new Date(data).toLocaleString("pt-BR", {
timeZone: "America/Sao_Paulo",
})
}

// ⭐ controle botão escola
const podeAbrirEscola =
role === "gestao_escolas" || role === "admin"

// ⭐ controle botão URE
const podeAbrirURE = [
"admin",
"analista",
"chefia_ure",
"dirigente",
"seintec"
].includes(role ?? "")

return (
<div className="space-y-6">

  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-white">Chamados</h1>
      <p className="text-slate-400 text-sm">Seus chamados abertos</p>
    </div>

    <div className="flex gap-3">

      {podeAbrirURE && (
        <Link
          href="/chamados/ure"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold"
        >
          Novo chamado URE
        </Link>
      )}

      {podeAbrirEscola && (
        <Link
          href="/chamados/escola"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
        >
          Novo chamado Escola
        </Link>
      )}

    </div>
  </div>

  <div className="bg-[#020617] border border-slate-800 rounded-2xl overflow-hidden">
    <table className="w-full text-sm">
      <thead className="border-b border-slate-800 text-slate-400">
        <tr>
          <th className="px-6 py-4 text-left">ID</th>
          <th className="px-6 py-4 text-left">Título</th>
          <th className="px-6 py-4 text-left">Solicitante</th>
          <th className="px-6 py-4 text-left">Categoria</th>
          <th className="px-6 py-4 text-left">Status</th>
          <th className="px-6 py-4 text-left">Abertura</th>
        </tr>
      </thead>

      <tbody>
        {chamados.map((c: any) => (
          <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-900/40">

            <td className="px-6 py-4 text-slate-300 font-semibold">
              #{c.codigo}
            </td>

            <td className="px-6 py-4 text-white font-medium">
              <Link
                href={`/chamados/${encodeURIComponent(c.id)}`}
                className="hover:text-blue-400 underline"
              >
                {c.titulo}
              </Link>
            </td>

            <td className="px-6 py-4 text-slate-300">
              {c.solicitante_nome ?? "-"}
            </td>

            <td className="px-6 py-4 text-slate-300">{c.categoria}</td>

            <td className="px-6 py-4">
              <span className={`px-3 py-1 rounded-full text-xs ${statusColor(c.status)}`}>
                {c.status}
              </span>
            </td>

            <td className="px-6 py-4 text-slate-400">
              {formatarData(c.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

)
}