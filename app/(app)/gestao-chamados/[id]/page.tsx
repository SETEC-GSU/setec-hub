"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useParams } from "next/navigation"

export default function GestaoChamadoDetalhePage() {
  const supabase = createClient()
  const params = useParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [chamado, setChamado] = useState<any>(null)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [novaMsg, setNovaMsg] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("analista")
  const [anexos, setAnexos] = useState<any[]>([])

  const URE_ROLES = ["admin", "analista", "seintec", "chefia_ure", "dirigente"]

  const formatarStatus = (status: string) => {
    if (!status) return "CARREGANDO..."
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

    const roleAtual = userData?.role ?? "analista"
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
      .eq("chamado_id", id)

    setAnexos(anexosData || [])

    // LIMPEZA DA GESTÃO: Se abriu, tira do painel de "Aguardando Técnico"
    await supabase.from("chamados").update({ visualizado_gestao: true }).eq("id", id)
    
    // ⭐ CORREÇÃO AQUI: Só limpa a notificação do usuário se quem estiver lendo for o dono do chamado!
    if (chamadoData?.usuario_id === user.id) {
      await supabase.from("chamados").update({ visualizado_pelo_usuario: true }).eq("id", id)
    }
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
    // Se apertar Shift + Enter, o comportamento natural do textarea vai pular a linha
  }

  if (!chamado) return <div className="p-20 text-center text-blue-400 font-bold animate-pulse tracking-widest">PROCESSANDO DADOS DO CHAMADO...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-[#020617] p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-6 right-8 flex gap-2">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${
              chamado.status === 'aberto' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {formatarStatus(chamado.status)}
            </span>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <p className="text-blue-500 text-xs font-black uppercase tracking-widest">Protocolo #{chamado.codigo}</p>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    chamado.origem === "escola" ? "bg-purple-500/20 text-purple-300" : "bg-cyan-500/20 text-cyan-300"
                }`}>
                    {chamado.origem?.toUpperCase()}
                </span>
            </div>
            <h2 className="text-3xl font-black text-white leading-tight">{chamado.titulo}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm border-y border-slate-800/50 py-6">
            <div className="space-y-3">
              <p className="text-slate-400 font-medium"><span className="text-slate-500 text-[10px] block uppercase mb-0.5">Solicitante</span> {chamado.solicitante_nome ?? chamado.nome ?? "-"}</p>
              <p className="text-slate-400 font-medium"><span className="text-slate-500 text-[10px] block uppercase mb-0.5">Unidade / Escola</span> {chamado.escola || "URE (Sede)"}</p>
            </div>
            <div className="space-y-3">
              <p className="text-slate-400 font-medium"><span className="text-slate-500 text-[10px] block uppercase mb-0.5">Categoria</span> {chamado.categoria}</p>
            </div>
            <div className="space-y-3">
              <p className="text-slate-400 font-medium"><span className="text-slate-500 text-[10px] block uppercase mb-0.5">Prioridade</span> 
                <span className={`font-bold ${chamado.prioridade === 'Alta' ? 'text-red-400' : 'text-slate-200'}`}>{chamado.prioridade || "Não Definida"}</span>
              </p>
              <p className="text-slate-400 font-medium"><span className="text-slate-500 text-[10px] block uppercase mb-0.5">Abertura</span> {formatarData(chamado.created_at)}</p>
            </div>
          </div>

          <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Relato da Ocorrência</p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{chamado.descricao}</p>
          </div>

          {/* 🚀 LÓGICA DO RETORNO DEVOLUTIVO INSERIDA AQUI SEM QUEBRAR O LAYOUT */}
          {(chamado.status === 'resolvido' || chamado.status === 'encerrado') && chamado.retorno_devolutivo && (
            <div className="bg-emerald-950/20 p-6 rounded-2xl border border-emerald-500/30 relative overflow-hidden animate-fade-in shadow-lg shadow-emerald-900/10">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">✅</span>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Parecer Técnico Final (Resolução)</p>
              </div>
              <p className="text-emerald-50/90 text-sm leading-relaxed whitespace-pre-wrap pl-8">
                {chamado.retorno_devolutivo}
              </p>
            </div>
          )}

          {anexos.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documentos e Evidências</p>
              <div className="flex flex-wrap gap-2">
                {anexos.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" className="flex items-center gap-3 bg-blue-600/5 border border-blue-500/20 px-4 py-2.5 rounded-xl text-blue-400 text-xs font-bold hover:bg-blue-600/10 transition group">
                    <span className="group-hover:scale-110 transition-transform">📄</span>
                    {a.nome_arquivo}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#020617] rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden min-h-[550px]">
        <div className="p-5 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Canal de Atendimento Direto</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Tempo Real</span>
        </div>

        <div ref={scrollRef} className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
          {mensagens.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
              <span className="text-6xl mb-4">💬</span>
              <p className="text-white font-bold uppercase tracking-[0.2em]">Inicie o atendimento</p>
            </div>
          )}

          {mensagens.map((m) => {
            const isMe = m.usuario_id === userId
            const isUre = URE_ROLES.includes(m.usuarios?.role)

            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {!isMe && <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">{m.usuarios?.nome?.charAt(0)}</div>}
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{m.usuarios?.nome}</span>
                    {isUre && <span className="bg-blue-500/10 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-blue-500/20 uppercase">EQUIPE TÉCNICA</span>}
                  </div>
                  
                  {/* 🚀 CLASSE whitespace-pre-wrap ADICIONADA AQUI PARA MANTER A FORMATAÇÃO */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-lg whitespace-pre-wrap ${
                    isMe 
                      ? "bg-blue-600 text-white rounded-tr-none font-medium" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                  }`}>
                    {m.mensagem}
                  </div>
                  
                  <span className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-widest">{formatarData(m.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {chamado.status !== "encerrado" ? (
          <div className="p-6 bg-slate-900/40 border-t border-slate-800">
            <div className="flex gap-3 items-center bg-[#0B1120] border border-slate-700 rounded-2xl p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-inner">
              {/* 🚀 TROCADO INPUT POR TEXTAREA PARA SUPORTAR QUEBRA DE LINHA */}
              <textarea
                value={novaMsg}
                onChange={(e) => setNovaMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua resposta técnica..."
                rows={1}
                className="flex-1 bg-transparent border-none px-4 py-2 text-white text-sm outline-none placeholder:text-slate-700 custom-scrollbar resize-none max-h-32 min-h-[40px]"
              />
              <button 
                onClick={enviarMensagem} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20 self-end"
              >
                Responder
              </button>
            </div>
            <div className="flex justify-between mt-3 px-2">
                <p className="text-[9px] text-slate-600 font-bold uppercase italic">Enter para enviar | Shift + Enter para nova linha</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase italic">Setec Hub Management</p>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-red-500/5 text-red-400 text-center text-[10px] font-black border-t border-red-500/10 uppercase tracking-[0.3em]">
            Protocolo Finalizado - Chat Desativado
          </div>
        )}
      </div>
    </div>
  )
}