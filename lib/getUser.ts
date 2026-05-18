import { cache } from "react"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

type AppUser = {
  id: string
  nome: string | null
  email: string | null
  role: string
  setor: string | null
}

const IS_DEV = process.env.NODE_ENV !== "production"
const GET_USER_TIMEOUT_MS = IS_DEV ? 3500 : 10000

function getFallbackDevUser(): AppUser {
  return {
    id: "dev-local",
    nome: "SETEC - URE Guarulhos Sul",
    email: "dev.local@educacao.sp.gov.br",
    role: "admin",
    setor: "URE GUARULHOS SUL",
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error || "")
}

async function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      Promise.resolve(promiseLike),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label}: timeout após ${ms}ms`))
        }, ms)
      }),
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export const getUser = cache(async (): Promise<AppUser | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[getUser] Variáveis de ambiente do Supabase ausentes.")

    if (IS_DEV) return getFallbackDevUser()

    return null
  }

  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            /*
              Em Server Components, o Next pode bloquear escrita de cookies.
              Ignoramos para não quebrar renderização.
            */
          }
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await withTimeout(
      supabase.auth.getUser(),
      GET_USER_TIMEOUT_MS,
      "getUser Supabase Auth"
    )

    if (authError || !user) {
      if (authError) {
        console.error("[getUser] Erro Auth:", authError.message)
      }

      if (IS_DEV) return getFallbackDevUser()

      return null
    }

    const { data: profile, error: profileError } = await withTimeout(
      supabase
        .from("usuarios")
        .select("id, nome, email, role, setor")
        .eq("id", user.id)
        .maybeSingle(),
      GET_USER_TIMEOUT_MS,
      "getUser Profile"
    )

    if (profileError || !profile?.role) {
      if (profileError) {
        console.error("[getUser] Erro perfil:", profileError.message)
      }

      if (IS_DEV) {
        return {
          ...getFallbackDevUser(),
          id: user.id,
          email: user.email || "dev.local@educacao.sp.gov.br",
        }
      }

      return null
    }

    return {
      id: profile.id,
      nome: profile.nome,
      email: profile.email || user.email || null,
      role: profile.role,
      setor: profile.setor,
    }
  } catch (error) {
    console.error("[getUser] Falha ao carregar usuário:", getErrorMessage(error))

    if (IS_DEV) return getFallbackDevUser()

    return null
  }
})