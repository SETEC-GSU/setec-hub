"use client"
import { useEffect, useState } from "react"
export function useRelogioSLA() {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const atualizar = () => { if (document.visibilityState === "visible") setAgora(Date.now()) }
    const timer = window.setInterval(atualizar, 60_000)
    document.addEventListener("visibilitychange", atualizar)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", atualizar) }
  }, [])
  return agora
}
