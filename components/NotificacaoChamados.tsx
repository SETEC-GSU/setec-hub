"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function NotificacaoChamados() {
  const supabase = createClient()
  const [count, setCount] = useState(0)
  const [role, setRole] = useState<string | null>(null)

  async function carregarRole() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single()

    setRole(data?.role || null)
  }

  async function carregar() {
    const { data } = await supabase
      .from("chamados")
      .select("id")
      .eq("status", "aberto")
      .eq("visualizado_gestao", false)

    setCount(data?.length || 0)
  }

  useEffect(() => {
    carregarRole()
    carregar()

    const channel = supabase
      .channel("notificacao-chamados")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chamados" },
        () => carregar()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ⭐ BLOQUEIO POR ROLE
  if (role !== "admin" && role !== "analista") return null

  return (
    <Link href="/gestao-chamados" className="relative">
      <span className="text-slate-300 hover:text-white transition">🔔</span>

      {count > 0 && (
        <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
          {count}
        </span>
      )}
    </Link>
  )
}