"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

export default function ChamadoDetalhePage() {
  const supabase = createClient()
  const params = useParams()

  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [chamado, setChamado] = useState<any>(null)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [novaMsg, setNovaMsg] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("usuario")

  // ⭐ ADICIONADO — estado para anexos
  const [anexos, setAnexos] = useState<any[]>([])

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    })
  }

  async function carregar() {
    if (!id) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setUserId(user.id)

    const { data: userData } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    setUserRole(userData?.role ?? "usuario")

    const { data: chamadoData } = await supabase
      .from("chamados")
      .select("*")
      .eq("id", id)
      .single()

    setChamado(chamadoData)

    const { data: msgs } = await supabase
      .from("chamado_mensagens")
      .select(`
        *,
        usuarios(nome, role)
      `)
      .eq("chamado_id", id)
      .order("created_at", { ascending: true })

    setMensagens(msgs || [])

    // ⭐ ADICIONADO — buscar anexos
    const { data: anexosData } = await supabase
      .from("chamados_anexos")
      .select("*")
      .eq("chamado_id", id)

    setAnexos(anexosData || [])
  }

  useEffect(() => {
    if (id) carregar()
  }, [id])

  async function enviarMensagem() {
    if (!novaMsg.trim()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const tipo =
      userRole === "admin" || userRole === "analista"
        ? "analista"
        : "usuario"

    const { error } = await supabase
      .from("chamado_mensagens")
      .insert({
        chamado_id: id,
        usuario_id: user.id,
        mensagem: novaMsg,
        tipo,
      })

    if (error) {
      alert(error.message)
      return
    }

    setNovaMsg("")
    carregar()
  }

  if (!chamado) return <p className="text-white">Carregando...</p>

  return (
    <div className="space-y-6">

      {/* CARD CHAMADO */}
      <div className="bg-[#020617] p-6 rounded-2xl border border-slate-800 space-y-2">

        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">
            Chamado #{chamado.codigo}
          </h2>

          {/* ⭐ BADGE ESCOLA */}
          {chamado.origem === "escola" && (
            <span className="px-2 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-300">
              ESCOLA
            </span>
          )}

          {chamado.origem === "ure" && (
            <span className="px-2 py-1 text-xs rounded-lg bg-blue-500/20 text-blue-300">
              URE
            </span>
          )}
        </div>

        <p className="text-slate-300">Título: {chamado.titulo}</p>
        <p className="text-slate-300">Categoria: {chamado.categoria}</p>

        {/* ⭐ SUBCATEGORIA FIELD */}
        {chamado.subcategoria && (
          <p className="text-slate-300">
            Subcategoria: {chamado.subcategoria}
          </p>
        )}

        {/* ⭐ ESCOLA */}
        {chamado.escola && (
          <p className="text-slate-300">Escola: {chamado.escola}</p>
        )}

        <p className="text-slate-300">
          Nome do solicitante: {chamado.solicitante_nome ?? chamado.nome ?? "-"}
        </p>

        <p className="text-slate-300">Prioridade: {chamado.prioridade}</p>
        <p className="text-slate-300">Status: {chamado.status}</p>
        <p className="text-slate-300">Descrição: {chamado.descricao}</p>

        {/* ⭐ ADICIONADO — EXIBIR ANEXOS */}
        {anexos.length > 0 && (
          <div className="pt-4 space-y-2">
            <p className="text-white font-semibold">📎 Anexos</p>

            {anexos.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                className="block text-blue-400 text-sm hover:underline"
              >
                📄 {a.nome_arquivo}
              </a>
            ))}
          </div>
        )}

      </div>

      {/* CHAT */}
      <div className="bg-[#020617] p-6 rounded-2xl border border-slate-800 space-y-4 max-h-[400px] overflow-y-auto">
        <h3 className="text-white font-semibold">Chat</h3>

        {mensagens.map((m) => {
          const isMe = m.usuario_id === userId

          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-md ${
                isMe ? "ml-auto items-end" : "items-start"
              }`}
            >
              <span className="text-xs text-slate-400 mb-1">
                {m.usuarios?.nome ?? "Usuário"}
              </span>

              <div
                className={`p-3 rounded-xl text-sm ${
                  isMe
                    ? "bg-blue-500/10 text-blue-300"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {m.mensagem}
              </div>

              <span className="text-xs opacity-50 mt-1">
                {formatarData(m.created_at)}
              </span>
            </div>
          )
        })}
      </div>

      {/* INPUT */}
      <div className="flex gap-2">
        <input
          value={novaMsg}
          onChange={(e) => setNovaMsg(e.target.value)}
          placeholder="Responder chamado..."
          className="flex-1 bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
        />

        <button
          onClick={enviarMensagem}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}