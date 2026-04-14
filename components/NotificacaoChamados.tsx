"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function NotificacaoChamados() {
  const supabase = createClient()
  const [count, setCount] = useState(0)
  const [role, setRole] = useState<string | null>(null)
  const [chamados, setChamados] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  // Refs para estado sempre atual no Realtime
  const userIdRef = useRef<string | null>(null)
  const roleRef = useRef<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // GRUPOS DE ROLES
  const GESTAO_ATENDIMENTO = ["admin", "analista", "seintec"];
  const VISÃO_URE = ["admin", "analista", "seintec", "chefia_ure", "dirigente"];
  const ROLE_ESCOLA = "gestao_escolas";

  // ⭐ NOVA LÓGICA DE CARREGAMENTO BLINDADA
  async function carregar() {
    const uId = userIdRef.current
    const uRole = roleRef.current
    
    if (!uId || !uRole) return

    let data = null
    let total = 0

    if (GESTAO_ATENDIMENTO.includes(uRole)) {
      // QUERY GESTÃO: Direta e simples
      const result = await supabase
        .from("chamados")
        .select("id, codigo, escola, categoria, status, created_at, usuario_id, analista_responsavel", { count: 'exact' })
        .eq("status", "aberto")
        .is("analista_responsavel", null)
        .order("created_at", { ascending: false })
        .limit(5)
      
      data = result.data
      total = result.count || 0

    } else {
      // QUERY USUÁRIO: Direta e simples, focando na flag de visualização
      const result = await supabase
        .from("chamados")
        .select("id, codigo, escola, categoria, status, created_at, usuario_id, analista_responsavel", { count: 'exact' })
        .eq("usuario_id", uId)
        .eq("visualizado_pelo_usuario", false)
        .neq("status", "aberto") // Se não for aberto, assumimos que houve mudança
        .order("created_at", { ascending: false })
        .limit(5)

      data = result.data
      total = result.count || 0
    }

    setCount(total)
    setChamados(data || [])
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("usuarios").select("role").eq("id", user.id).single()
      
      const roleAtual = profile?.role || null
      userIdRef.current = user.id
      roleRef.current = roleAtual
      setRole(roleAtual)

      // Carga inicial
      carregar()

      // Canal Realtime unificado e direto (SEM SOM)
      const channel = supabase
        .channel(`sino-global`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chamados" },
          () => {
            carregar()
          }
        )
        .subscribe()

      return channel
    }

    const res = inicializar()

    const handleFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleFora)

    return () => {
      res.then(channel => channel && supabase.removeChannel(channel))
      document.removeEventListener("mousedown", handleFora)
    }
  }, [])

  if (!role) return null
  const isGestao = GESTAO_ATENDIMENTO.includes(role)

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-slate-400 hover:text-white transition outline-none">
        <span className="text-xl">🔔</span>
        {count > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold border-2 border-[#020617] animate-pulse">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl z-[999] overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-sm font-bold text-white">
              {isGestao ? "Novos Chamados" : "Atualizações"}
            </h3>
            <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
              {count} Alertas
            </span>
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {chamados.length > 0 ? (
              chamados.map((c) => (
                <Link 
                  key={c.id} 
                  href={VISÃO_URE.includes(role) ? `/gestao-chamados/${c.id}` : `/chamados/${c.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isGestao ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {isGestao ? "Aguardando Técnico" : `Status: ${c.status?.replace('_', ' ')}`}
                    </span>
                    <span className="text-[9px] text-slate-500">{new Date(c.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {isGestao 
                      ? <>Chamado <span className="text-blue-400 font-semibold">{c.codigo}</span> de <span className="font-semibold">{c.escola}</span> entrou na fila.</>
                      : <>Seu chamado <span className="text-emerald-400 font-semibold">{c.codigo}</span> agora está <span className="font-semibold">{c.status?.replace('_', ' ')}</span>.</>
                    }
                  </p>
                </Link>
              ))
            ) : (
              <div className="p-10 text-center text-slate-500 text-xs italic">Nenhuma notificação nova.</div>
            )}
          </div>

          <Link 
            href={isGestao ? "/gestao-chamados" : "/chamados"} 
            onClick={() => setIsOpen(false)} 
            className="block p-3 text-center text-xs font-bold text-blue-400 hover:bg-slate-800 transition bg-slate-900/80 border-t border-slate-800"
          >
            {isGestao ? "Acessar Painel de Gestão" : "Ver Meus Chamados"}
          </Link>
        </div>
      )}
    </div>
  )
}