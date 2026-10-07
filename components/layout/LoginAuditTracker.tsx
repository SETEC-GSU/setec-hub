"use client"

import { useEffect, useMemo } from "react"
import type { Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import { registrarLogin } from "@/lib/loginAudit"

export default function LoginAuditTracker() {
  const cliente = useMemo(() => createClient(), [])
  useEffect(() => {
    let vivo = true
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const agendar = (session: Session | null) => {
      if (!session || !vivo) return
      // Fora do callback de Auth: evita disputar o lock interno da sessão.
      const timer = setTimeout(() => {
        timers.delete(timer)
        if (vivo) void registrarLogin(cliente, session)
      }, 0)
      timers.add(timer)
    }
    const {
      data: { subscription },
    } = cliente.auth.onAuthStateChange((evento, session) => {
      if (
        evento === "INITIAL_SESSION" ||
        evento === "SIGNED_IN" ||
        evento === "TOKEN_REFRESHED"
      )
        agendar(session)
    })
    const tentar = () => {
      if (document.visibilityState === "hidden") return
      void cliente.auth
        .getSession()
        .then(({ data }) => agendar(data.session))
        .catch(() => {})
    }
    tentar()
    const intervalo = setInterval(tentar, 60000)
    window.addEventListener("focus", tentar)
    return () => {
      vivo = false
      subscription.unsubscribe()
      clearInterval(intervalo)
      timers.forEach(clearTimeout)
      window.removeEventListener("focus", tentar)
    }
  }, [cliente])
  return null
}
