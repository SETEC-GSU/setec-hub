"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase"
import { prepararEscola, type Escola, type EscolaPainel } from "./modelo"

// Mantém a leitura da tabela atual e o RLS do cliente autenticado. Sem polling,
// service-role, cache global entre perfis ou consulta adicional por escola.
export function useEscolas(id?: string) {
  const supabase = useMemo(() => createClient(), [])
  const chave = id ?? "lista", requisicao = useRef<AbortController | null>(null)
  const [estado, setEstado] = useState<{ chave: string; escolas: EscolaPainel[]; loading: boolean; erro: string; consultado: Date | null }>({ chave, escolas: [], loading: true, erro: "", consultado: null })
  const carregar = useCallback(async () => {
    requisicao.current?.abort()
    const controller = new AbortController(); requisicao.current = controller
    setEstado(e => ({ ...e, chave, escolas: e.chave === chave ? e.escolas : [], loading: true, erro: "" }))
    try {
      const linhas: Escola[] = []
      if (id !== undefined) {
        if (!id.trim()) throw new Error("Unidade escolar não encontrada.")
        const { data, error } = await supabase.from("escolas").select("*").eq("id", id).abortSignal(controller.signal).maybeSingle()
        if (error) throw error
        if (!data) throw new Error("Unidade escolar não encontrada ou sem acesso para este perfil.")
        linhas.push(data as Escola)
      } else {
        const lote = 500
        for (let inicio = 0; ; inicio += lote) {
          const { data, error } = await supabase.from("escolas").select("*").order("nome_escola", { ascending: true }).order("id", { ascending: true }).range(inicio, inicio + lote - 1).abortSignal(controller.signal)
          if (error) throw error
          if (controller.signal.aborted) return
          linhas.push(...(data || []) as Escola[])
          if (!data || data.length < lote) break
        }
      }
      if (!controller.signal.aborted) setEstado({ chave, escolas: linhas.map(prepararEscola), loading: false, erro: "", consultado: new Date() })
    } catch (error) {
      if (controller.signal.aborted) return
      console.error("[Escolas] Falha na consulta", error)
      const erro = "Não foi possível atualizar os dados das escolas. Tente novamente."
      const mensagem = error instanceof Error && error.message.startsWith("Unidade escolar não encontrada") ? error.message : erro
      setEstado(e => ({ ...e, chave, escolas: e.chave === chave ? e.escolas : [], loading: false, erro: mensagem }))
    }
  }, [chave, id, supabase])
  useEffect(() => { void carregar(); return () => requisicao.current?.abort() }, [carregar])
  return { ...(estado.chave === chave ? estado : { chave, escolas: [], loading: true, erro: "", consultado: null }), carregar }
}
