"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation" // 🚀 NOVO IMPORT PARA A NAVEGAÇÃO DA LINHA
import { createClient } from "@/lib/supabase"

export default function ChamadosPage() {
  const supabase = createClient()
  const router = useRouter() // 🚀 INICIALIZA O ROUTER

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
    if (s === "aberto") return "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    if (s === "assumido") return "bg-purple-500/10 text-purple-400 border border-purple-500/20"
    if (s === "em_atendimento") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
    if (s === "resolvido") return "bg-green-500/10 text-green-400 border border-green-500/20"
    return "bg-slate-500/10 text-slate-400 border border-slate-500/20"
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })
  }

  // ⭐ controle botão escola
  const podeAbrirEscola = role === "gestao_escolas" || role === "admin"

  // ⭐ controle botão URE
  const podeAbrirURE = [
    "admin",
    "analista",
    "chefia_ure",
    "dirigente",
    "seintec"
  ].includes(role ?? "")

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">Meus Chamados</h1>
          <p className="text-slate-400 text-sm mt-1">Acompanhe o andamento das suas solicitações</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {podeAbrirURE && (
            <Link
              href="/chamados/ure"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Novo chamado URE
            </Link>
          )}

          {podeAbrirEscola && (
            <Link
              href="/chamados/escola"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Novo chamado Escola
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : chamados.length === 0 ? (
        <div className="bg-[#020617] border border-slate-800 border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-800">
            <span className="text-4xl opacity-50 grayscale">📝</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nenhum chamado aberto</h3>
          <p className="text-slate-400 font-medium max-w-sm">Você ainda não possui nenhum ticket de suporte registrado. Utilize os botões acima para abrir uma nova solicitação.</p>
        </div>
      ) : (
        <div className="bg-[#020617] border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-5 rounded-tl-2xl">ID</th>
                <th className="px-6 py-5">Título</th>
                <th className="px-6 py-5 hidden sm:table-cell">Solicitante</th>
                <th className="px-6 py-5 hidden md:table-cell">Categoria</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 hidden lg:table-cell">Abertura</th>
                <th className="px-6 py-5 rounded-tr-2xl text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {chamados.map((c: any) => (
                <tr 
                  key={c.id} 
                  onClick={() => router.push(`/chamados/${encodeURIComponent(c.id)}`)} // 🚀 LINHA INTEIRA CLICÁVEL
                  className="group hover:bg-slate-800/40 transition-all cursor-pointer hover:shadow-lg"
                >
                  <td className="px-6 py-5 text-slate-500 font-black tracking-wider group-hover:text-blue-400 transition-colors">
                    #{c.codigo}
                  </td>

                  <td className="px-6 py-5 text-white font-bold max-w-[200px] sm:max-w-[300px] truncate group-hover:text-blue-300 transition-colors">
                     {c.titulo}
                  </td>

                  <td className="px-6 py-5 text-slate-400 hidden sm:table-cell truncate max-w-[150px]">
                    {c.solicitante_nome ?? "-"}
                  </td>

                  <td className="px-6 py-5 text-slate-400 hidden md:table-cell">
                     <span className="bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50 text-xs font-medium">
                        {c.categoria}
                     </span>
                  </td>

                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusColor(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-slate-500 hidden lg:table-cell font-medium">
                    {formatarData(c.created_at)}
                  </td>

                  {/* 🚀 SETA INDICATIVA DE CLIQUE */}
                  <td className="px-6 py-5 text-right text-slate-600 group-hover:text-blue-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 inline-block">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}