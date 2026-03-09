import { createServerSupabase } from "@/lib/supabase-server"

export async function logAction(
  usuarioId: string,
  acao: string,
  entidade: string,
  entidadeId?: string
) {
  const supabase = await createServerSupabase()

  await supabase.from("auditoria").insert({
    usuario_id: usuarioId,
    acao,
    entidade,
    entidade_id: entidadeId ?? null,
  })
}
