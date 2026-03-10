"use server"

import { createAdminClient } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { createServerSupabase } from "@/lib/supabase-server"

export async function salvarInventario(formData: FormData) {

  const supabaseAdmin = createAdminClient()
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Usuário não autenticado")

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("setor")
    .eq("id", user.id)
    .single()

  const escola = perfil?.setor

  const responsavel_nome = formData.get("responsavel_nome") as string
  const responsavel_cargo = formData.get("responsavel_cargo") as string

  // cria inventário
  const { data: resposta, error: erroResposta } = await supabaseAdmin
    .from("inventario_respostas")
    .insert({
      escola_nome: escola,
      usuario_id: user.id,
      responsavel_nome,
      responsavel_cargo
    })
    .select()
    .single()

  if (erroResposta) {
    console.error("ERRO inventario_respostas:", erroResposta)
    throw new Error("Erro ao criar inventário")
  }

  const inventarioId = resposta.id

  const itens:any[] = []

  for (const [key] of formData.entries()) {

    if (!key.startsWith("modelo_")) continue

    const modeloId = key.replace("modelo_", "")

    const recebido = Number(formData.get(`recebido_${modeloId}`))
    const funcionando = Number(formData.get(`funcionando_${modeloId}`))
    const garantia = Number(formData.get(`garantia_${modeloId}`))
    const danificados = Number(formData.get(`danificados_${modeloId}`))
    const nao_localizados = Number(formData.get(`nao_localizados_${modeloId}`))

    const soma =
      funcionando +
      garantia +
      danificados +
      nao_localizados

    if (soma !== recebido) {

      throw new Error(
        "Inventário incorreto. A soma deve ser igual à quantidade recebida."
      )

    }

    itens.push({
      inventario_id: inventarioId,
      modelo_id: modeloId, // UUID CORRETO
      quantidade_recebida: recebido,
      funcionando: funcionando,
      aguardando_garantia: garantia,
      danificados_mau_uso: danificados,
      nao_localizado: nao_localizados
    })

  }

  if (itens.length === 0) {
    throw new Error("Nenhum item encontrado para salvar")
  }

  const { error: erroItens } = await supabaseAdmin
    .from("inventario_itens")
    .insert(itens)

  if (erroItens) {
    console.error("ERRO SUPABASE:", erroItens)
    throw erroItens
  }

  revalidatePath("/inventario")

}