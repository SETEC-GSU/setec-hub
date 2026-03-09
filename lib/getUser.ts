import { createServerSupabase } from "@/lib/supabase-server"
import type { Role } from "./roles"

type UserWithRole = {
  id: string
  email: string
  role: Role
  nome?: string | null
}

export async function getUser(): Promise<UserWithRole | null> {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from("usuarios")
    .select("id, email, role, nome")
    .eq("id", user.id)
    .single()

  if (error) {
    console.log("PROFILE ERROR:", error)
    return null
  }

  return profile as UserWithRole
}