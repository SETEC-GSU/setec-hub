import { createServerSupabase } from "@/lib/supabase-server"

export default async function Greeting() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", user?.id)
    .single()

  const hour = new Date().getHours()

  let message = "Boa noite"

  if (hour >= 5 && hour < 12) message = "Bom dia"
  if (hour >= 12 && hour < 18) message = "Boa tarde"

  return (
    <div className="text-lg text-slate-400 mt-1">
      {message}, <span className="text-white font-semibold">{profile?.nome}</span>
    </div>
  )
}