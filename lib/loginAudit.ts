import type { Session } from "@supabase/supabase-js"
import type { createClient } from "@/lib/supabase"

type Cliente = ReturnType<typeof createClient>
const concluidas = new Set<string>()
const emCurso = new Map<string, Promise<boolean>>()

function chaveSessao(session: Session) {
  try {
    const parte = session.access_token.split(".")[1]
    const json = JSON.parse(atob(parte.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof json.session_id === "string" ? json.session_id : ""
  } catch {
    return ""
  }
}

// A chave local serve somente para evitar chamadas repetidas.
// A autorização, a sessão e a data são verificadas novamente pela RPC no banco.
export async function registrarLogin(
  cliente: Cliente,
  session: Session | null,
) {
  if (!session || typeof window === "undefined") return false
  const chave = chaveSessao(session)
  if (chave && concluidas.has(chave)) return true
  if (chave && emCurso.has(chave)) return emCurso.get(chave)!
  const pedido = (async () => {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), 8000)
    try {
      const { data, error } = await cliente
        .rpc("hub_registrar_login", {
          p_user_agent: navigator.userAgent.slice(0, 512),
        })
        .abortSignal(controle.signal)
      if (error) {
        console.warn("[Monitor de Acessos] Registro pendente:", error.code)
        return false
      }
      const resposta = data as { registrado?: boolean; motivo?: string } | null
      const terminado = Boolean(
        resposta?.registrado || resposta?.motivo === "sessao_anterior_coleta",
      )
      if (chave && terminado) concluidas.add(chave)
      return terminado
    } catch {
      return false
    } finally {
      clearTimeout(prazo)
    }
  })()
  if (chave) emCurso.set(chave, pedido)
  try {
    return await pedido
  } finally {
    if (chave) emCurso.delete(chave)
  }
}

// A indisponibilidade da coleta não impede a autenticação no Hub.
export async function registrarLoginComPrazo(
  cliente: Cliente,
  session: Session,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      registrarLogin(cliente, session),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1800)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
