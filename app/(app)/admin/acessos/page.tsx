import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import MonitorAcessosClient from "./MonitorAcessosClient"

export const dynamic = "force-dynamic"

export default async function MonitorAcessosPage() {
  const cookieStore = await cookies()
  const cliente = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Em Server Components, a atualização dos cookies fica com o middleware.
          }
        },
      },
    },
  )
  const {
    data: { user },
    error,
  } = await cliente.auth.getUser()
  if (error || !user) redirect("/login")
  const { data: perfil, error: perfilError } = await cliente
    .from("usuarios")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle()
  if (perfilError || perfil?.role !== "admin") redirect("/")
  const contexto = await cliente.rpc("hub_login_contexto")
  if (!contexto.error && !contexto.data?.permitido) redirect("/")
  return <MonitorAcessosClient />
}
