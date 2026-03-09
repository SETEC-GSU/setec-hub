"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { definirPrioridade } from "@/lib/prioridade"
import { getUser } from "@/lib/getUser"

export async function createChamado(formData: FormData) {
  const supabase = await createServerSupabase()
  const user = await getUser()

  if (!user) return

  const titulo = formData.get("titulo") as string
  const descricao = formData.get("descricao") as string
  const categoria = formData.get("categoria") as string
  const subcategoria = formData.get("subcategoria") as string
  const origem = formData.get("origem") as string
  const setor = formData.get("setor") as string
  const escola = formData.get("escola") as string
  const equipamento = formData.get("equipamento") as string

  const { prioridade, sla } = definirPrioridade(categoria)

  await supabase.from("chamados").insert({
    titulo,
    descricao,
    categoria,
    subcategoria,
    origem,
    prioridade,
    sla_horas: sla,
    solicitante_nome: user.nome,
    solicitante_email: user.email,
    setor,
    escola,
    equipamento,
  })

  revalidatePath("/chamados")
}