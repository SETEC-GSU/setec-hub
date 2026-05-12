"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

export default function ChamadoDetalhePage() {
  const supabase = createClient()
  const params = useParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [chamado, setChamado] = useState<any>(null)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [novaMsg, setNovaMsg] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("usuario")
  const [anexos, setAnexos] = useState<any[]>([])

  // Roles URE
  const URE_ROLES = ["admin", "analista", "seintec", "chefia_ure", "dirigente"]

  // Helper para formatar o status sem quebrar o código
  const formatarStatus = (status: string) => {
    if (!status) return "Carregando..."
    return status.replace('_', ' ').toUpperCase()
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  async function carregar() {
    if (!id) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: userData } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    const roleAtual = userData?.role ?? "usuario"
    setUserRole(roleAtual)

    const { data: chamadoData } = await supabase
      .from("chamados")
      .select("*")
      .eq("id", id)
      .single()

    setChamado(chamadoData)

    const { data: msgs } = await supabase
      .from("chamado_mensagens")
      .select(`*, usuarios(nome, role)`)
      .eq("chamado_id", id)
      .order("created_at", { ascending: true })

    setMensagens(msgs || [])

    const { data: anexosData } = await supabase
      .from("chamados_anexos")
      .select("*")
      .eq("id", id) // Se a FK for chamado_id na sua tabela, mude aqui

    setAnexos(anexosData || [])

    // --- Lógica de Limpar Notificações ---
    // Limpa para a URE
    if (URE_ROLES.includes(roleAtual)) {
      await supabase.from("chamados").update({ visualizado_gestao: true }).eq("id", id)
    } 
    // Limpa para o Usuário
    await supabase.from("chamados").update({ visualizado_pelo_usuario: true }).eq("id", id)
  }

  useEffect(() => {
    if (id) carregar()
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [mensagens])

  async function enviarMensagem() {
    if (!novaMsg.trim()) return
    if (chamado?.status === "encerrado") return

    const tipo = URE_ROLES.includes(userRole) ? "analista" : "usuario"

    const { error } = await supabase.from("chamado_mensagens").insert({
      chamado_id: id,
      usuario_id: userId,
      mensagem: novaMsg,
      tipo,
    })

    if (error) return

    setNovaMsg("")
    carregar()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Se apertou Enter SEM o Shift, ele envia a mensagem.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  // 🚀 Loading mantido para evitar crashes
  if (!chamado) return <div className="p-20 text-center text-blue-400 font-bold animate-pulse">Carregando detalhes...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">

      {/* CABEÇALHO */}
      <div className="bg-[#020617] p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4">
            <span className="px-4 py-1.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {formatarStatus(chamado.status)}
            </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-1">Protocolo {chamado.codigo}</p>
            <h2 className="text-2xl font-black text-white leading-tight">{chamado.titulo}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-slate-400"><strong className="text-slate-200">Categoria:</strong> {chamado.categoria}</p>
              <p className="text-slate-400"><strong className="text-slate-200">Solicitante:</strong> {chamado.solicitante_nome ?? "-"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400"><strong className="text-slate-200">Unidade:</strong> {chamado.escola || "URE"}</p>
              <p className="text-slate-400"><strong className="text-slate-200">Origem:</strong> {chamado.origem?.toUpperCase()}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Descrição</p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{chamado.descricao}</p>
          </div>

          {/* 🚀 DESTAQUE DO PARECER TÉCNICO (RETORNO DEVOLUTIVO) */}
          {(chamado.status === 'resolvido' || chamado.status === 'encerrado') && chamado.retorno_devolutivo && (
            <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden shadow-lg shadow-emerald-900/10 mt-4">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✅</span>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Solução Técnica</p>
              </div>
              <p className="text-emerald-50/90 text-sm leading-relaxed whitespace-pre-wrap pl-7">
                {chamado.retorno_devolutivo}
              </p>
            </div>
          )}

          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {anexos.map((a) => (
                <a key={a.id} href={a.url} target="_blank" className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 px-3 py-2 rounded-xl text-blue-400 text-xs hover:bg-blue-500/10 transition">
                  📄 {a.nome_arquivo}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div className="bg-[#020617] rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/20 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <h3 className="text-white font-bold text-sm">Histórico de Atendimento</h3>
        </div>

        <div ref={scrollRef} className="p-6 space-y-6 h-[450px] overflow-y-auto custom-scrollbar">
          {mensagens.map((m) => {
            const isMe = m.usuario_id === userId
            const isUre = URE_ROLES.includes(m.usuarios?.role)

            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.usuarios?.nome}</span>
                    {isUre && <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Suporte</span>}
                  </div>
                  
                  {/* 🚀 CLASSE whitespace-pre-wrap ADICIONADA AQUI */}
                  <div className={`p-4 rounded-2xl text-sm whitespace-pre-wrap ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"}`}>
                    {m.mensagem}
                  </div>
                  
                  <span className="text-[9px] text-slate-600 mt-1.5">{formatarData(m.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {chamado.status !== "encerrado" ? (
          <div className="p-4 bg-slate-900/40 border-t border-slate-800">
            <div className="flex gap-2 items-center bg-[#0B1120] border border-slate-700 rounded-2xl p-2 focus-within:border-blue-500 transition-all">
              
              {/* 🚀 TROCADO PARA TEXTAREA E ADICIONADO onKeyDown */}
              <textarea
                value={novaMsg}
                onChange={(e) => setNovaMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva sua mensagem (Shift+Enter para nova linha)..."
                rows={1}
                className="flex-1 bg-transparent border-none px-3 py-2 text-white text-sm outline-none resize-none custom-scrollbar max-h-32 min-h-[40px]"
              />
              
              <button onClick={enviarMensagem} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 self-end">
                Enviar
              </button>
            </div>
            <div className="flex justify-between mt-2 px-2">
                <p className="text-[9px] text-slate-600 font-bold uppercase italic">Enter para enviar</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-red-500/5 text-red-400 text-center text-xs font-bold border-t border-red-500/10">
            CHAMADO ENCERRADO
          </div>
        )}
      </div>
    </div>
  )
}