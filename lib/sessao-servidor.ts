/* Usado somente nas verificações de sessão; não limita consultas de relatórios
   nem repete gravações ou chamadas de renovação de token por conta própria. */
export const LIMITE_SESSAO_MS = 10_000

export class SessaoIndisponivelError extends Error {
  readonly etapa: string

  constructor(etapa = "sessao") {
    super("Não foi possível verificar sua sessão agora. Tente novamente em alguns instantes.")
    this.name = "SessaoIndisponivelError"
    this.etapa = etapa
  }
}

export function sessaoAusenteOuInvalida(error: unknown) {
  if (!error || typeof error !== "object") return false

  const authError = error as { name?: string; code?: string; status?: number }
  return (
    authError.name === "AuthSessionMissingError" ||
    authError.name === "AuthInvalidJwtError" ||
    authError.status === 401 ||
    authError.status === 403 ||
    [
      "bad_jwt", "invalid_jwt", "session_not_found", "session_expired",
      "refresh_token_not_found", "refresh_token_already_used",
      "user_not_found", "user_banned",
    ].includes(authError.code || "")
  )
}

export function registrarFalhaSessao(etapa: string, error: unknown) {
  const info = (error && typeof error === "object" ? error : {}) as {
    name?: string; code?: string; status?: number
  }
  // Não registra cookies, tokens, senha, cabeçalhos ou conteúdo do usuário.
  console.error("[SETEC Sessão] Falha na verificação", {
    etapa,
    tipo: info.name || "Erro",
    codigo: info.code || null,
    status: info.status || null,
  })
}

/** O prazo vale para a operação inteira e também cancela o fetch pendente.
 * O cliente criado dentro da operação pertence exclusivamente à requisição.
 */
export async function comLimiteSessao<T>(
  trabalho: (fetchSessao: typeof fetch) => PromiseLike<T>,
  limiteMs = LIMITE_SESSAO_MS
): Promise<T> {
  const controller = new AbortController()
  const limpezas: Array<() => void> = []
  let timer: ReturnType<typeof setTimeout> | undefined

  const fetchSessao: typeof fetch = async (input, init) => {
    const originalSignal = init?.signal || (
      typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined
    )
    let signal = controller.signal

    if (originalSignal) {
      const combinado = new AbortController()
      const cancelarPrazo = () => combinado.abort(controller.signal.reason)
      const cancelarOrigem = () => combinado.abort(originalSignal.reason)

      if (controller.signal.aborted) cancelarPrazo()
      else if (originalSignal.aborted) cancelarOrigem()
      else {
        controller.signal.addEventListener("abort", cancelarPrazo, { once: true })
        originalSignal.addEventListener("abort", cancelarOrigem, { once: true })
        limpezas.push(() => {
          controller.signal.removeEventListener("abort", cancelarPrazo)
          originalSignal.removeEventListener("abort", cancelarOrigem)
        })
      }
      signal = combinado.signal
    }

    const response = await fetch(input, { ...init, cache: "no-store", signal })
    const url = typeof input === "string" || input instanceof URL ? String(input) : input.url

    /* Algumas versões compatíveis com o package.json recebido tratam um
       HTTP 500 na renovação como erro definitivo e apagam a sessão. Mantém
       falhas de infraestrutura/limite como temporárias para o próprio SDK.
       400/401/403 continuam intactos: token inválido segue sendo recusado. */
    if (
      new URL(url).pathname.endsWith("/auth/v1/token") &&
      (response.status >= 500 || response.status === 408 || response.status === 429)
    ) {
      return new Response(response.body, {
        status: 503,
        statusText: "Service Unavailable",
        headers: response.headers,
      })
    }
    return response
  }

  try {
    return await Promise.race([
      Promise.resolve().then(() => trabalho(fetchSessao)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new SessaoIndisponivelError("timeout")
          reject(error)
          controller.abort(error)
        }, limiteMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
    limpezas.forEach(limpar => limpar())
  }
}
