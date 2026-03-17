"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function MensagensChamados() {
  const supabase = createClient()
  const [mensagens, setMensagens] = useState<any[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // --- CONFIGURAÇÃO DE GRUPOS ---
  const ROLES_ATENDIMENTO = ["admin", "analista", "seintec"];
  const ROLES_VISAO_URE = ["admin", "analista", "seintec", "chefia_ure", "dirigente"];
  const ROLE_ESCOLA = "gestao_escolas";

  const tocarSomNotificacao = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, context.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.1); 

      gainNode.gain.setValueAtTime(0.05, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3); 
    } catch (e) {}
  };

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userProfile } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = userProfile?.role
    setRole(userRole)

    const { data: msgData } = await supabase
      .from("chamado_mensagens")
      .select(`
        id,
        mensagem,
        created_at,
        usuario_id,
        chamados (
          id,
          codigo,
          usuario_id,
          analista_responsavel
        )
      `)
      .eq("visualizado", false)
      .order("created_at", { ascending: false })

    if (!msgData) return

    // --- LÓGICA DE FILTRAGEM (URE ATENDE + URE ABRE + ESCOLA ABRE) ---
    const filtrado = msgData.filter((m: any) => {
      const souDonoDoChamado = m.chamados?.usuario_id === user.id;
      const souResponsavelTecnico = m.chamados?.analista_responsavel === user.id;
      const mensagemEnviadaPorMim = m.usuario_id === user.id;

      if (mensagemEnviadaPorMim) return false;

      // 1. Se sou do TIME DE ATENDIMENTO, vejo se a Escola (ou outro user da URE) me respondeu
      if (ROLES_ATENDIMENTO.includes(userRole || "")) {
        if (souResponsavelTecnico) return true;
      }

      // 2. Se sou QUALQUER UM que abriu o chamado (Escola, Chefia ou Dirigente)
      // quero saber se houve um retorno do suporte
      if (souDonoDoChamado) return true;

      return false;
    })

    setMensagens(filtrado)
  }

  useEffect(() => {
    carregarDados()

    const channel = supabase
      .channel("mensagens-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chamado_mensagens" }, () => {
        carregarDados();
        tocarSomNotificacao();
      })
      .subscribe()

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  async function marcarComoLida(id: string) {
    await supabase.from("chamado_mensagens").update({ visualizado: true }).eq("id", id)
    setMensagens(prev => prev.filter(m => m.id !== id))
  }

  if (!role) return null;

  return (
    <div ref={containerRef} className="relative flex items-center h-full">
      
      <button onClick={() => setOpen(!open)} className="relative p-2 text-slate-300 hover:text-white transition outline-none">
        <span className="text-xl">📬</span>
        {mensagens.length > 0 && (
          <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold border-2 border-[#020617] animate-pulse">
            {mensagens.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl z-[999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-sm font-bold text-white">Retornos no Chat</h3>
            {mensagens.length > 0 && (
              <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                {mensagens.length}
              </span>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {mensagens.length > 0 ? (
              mensagens.map((m) => (
                <Link
                  key={m.id}
                  // Se for URE (Atendimento ou Chefia), vai para a visão gestão
                  href={ROLES_VISAO_URE.includes(role) 
                    ? `/gestao-chamados/${m.chamados.id}` 
                    : `/chamados/${m.chamados.id}`
                  }
                  onClick={() => {
                    marcarComoLida(m.id);
                    setOpen(false);
                  }}
                  className="block p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      Chamado #{m.chamados.codigo}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {ROLES_ATENDIMENTO.includes(role) && m.chamados?.analista_responsavel === role // Simplificação lógica
                      ? "A unidade escolar/setor enviou uma resposta."
                      : "Há uma nova atualização no seu chamado."
                    }
                  </p>
                  
                  <p className="text-[10px] italic text-slate-500 mt-2 truncate bg-slate-900/30 p-1.5 rounded">
                    "{m.mensagem}"
                  </p>
                </Link>
              ))
            ) : (
              <div className="p-10 text-center text-slate-500">
                <p className="text-sm">Nenhuma mensagem nova.</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-center">
             <p className="text-[10px] text-slate-500 italic uppercase tracking-widest font-bold">Setec Hub</p>
          </div>
        </div>
      )}
    </div>
  )
}