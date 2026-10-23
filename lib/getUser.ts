import { cache } from "react"
import { createServerSupabase } from "@/lib/supabase-server"
import {
  comLimiteSessao,
  registrarFalhaSessao,
  sessaoAusenteOuInvalida,
  SessaoIndisponivelError,
} from "@/lib/sessao-servidor"

type AppUser = {
  id: string
  nome: string | null
  email: string | null
  role: string
  setor: string | null
}

const IS_DEV = process.env.NODE_ENV !== "production"

function getFallbackDevUser(): AppUser {
  return {
    id: "dev-local",
    nome: "SETEC - URE Guarulhos Sul",
    email: "dev.local@educacao.sp.gov.br",
    role: "admin",
    setor: "URE GUARULHOS SUL",
  }
}

// React cache deduplica somente dentro da renderização da requisição.
// Não existe cache global de perfis nem compartilhamento de sessão entre usuários.
export const getUser = cache(async (): Promise<AppUser | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    registrarFalhaSessao("ambiente", new Error("Configuração ausente"))
    if (IS_DEV) return getFallbackDevUser()
    throw new SessaoIndisponivelError("ambiente")
  }

  let etapa = "autenticacao"

  try {
    return await comLimiteSessao(async fetchSessao => {
      const supabase = await createServerSupabase({ fetch: fetchSessao })

      /* Valida a assinatura do JWT, sem confiar no usuário de getSession().
         Para chaves assimétricas, evita repetir o getUser remoto que já é
         executado no middleware. Com chave simétrica, o SDK valida no Auth. */
      const { data, error: authError } = await supabase.auth.getClaims()

      if (authError) {
        if (sessaoAusenteOuInvalida(authError)) {
          return IS_DEV ? getFallbackDevUser() : null
        }
        registrarFalhaSessao(etapa, authError)
        throw new SessaoIndisponivelError(etapa)
      }

      const claims = data?.claims
      if (!claims?.sub || typeof claims.sub !== "string") {
        return IS_DEV ? getFallbackDevUser() : null
      }
      const identidade = {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
      }

      etapa = "perfil"
      const { data: profile, error: profileError } = await supabase
        .from("usuarios")
        .select("id, nome, email, role, setor")
        .eq("id", claims.sub)
        .maybeSingle()

      if (profileError) {
        registrarFalhaSessao(etapa, profileError)
        throw new SessaoIndisponivelError(etapa)
      }

      if (!profile?.role) {
        if (IS_DEV) {
          return {
            ...getFallbackDevUser(),
            id: claims.sub,
            email: identidade.email || "dev.local@educacao.sp.gov.br",
          }
        }
        return null
      }

      // Permissões continuam vindo da tabela atual, nunca do role do JWT.
      return {
        id: profile.id,
        nome: profile.nome,
        email: profile.email || identidade.email || null,
        role: profile.role,
        setor: profile.setor,
      }
    })
  } catch (error) {
    if (!(error instanceof SessaoIndisponivelError) || error.etapa === "timeout") {
      registrarFalhaSessao(etapa, error)
    }
    if (IS_DEV) return getFallbackDevUser()

    /* Não devolve null em erro de rede: layouts costumam interpretar null
       como logout e redirecionar ao login. A proteção continua fechada e a
       falha temporária é tratada pelo error boundary existente do Next. */
    throw error instanceof SessaoIndisponivelError ? error : new SessaoIndisponivelError(etapa)
  }
})
