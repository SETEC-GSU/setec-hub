import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

type ServerSupabaseOptions = { fetch?: typeof fetch }

export async function createServerSupabase(options: ServerSupabaseOptions = {}) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            /* Server Components só podem ler cookies. Nesse contexto, a
               renovação é persistida pelo middleware. Em Actions e Route
               Handlers, o mesmo cliente pode gravar os cookies normalmente. */
          }
        },
      },
    }
  )
}
