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

  // 1. Buscamos a finalidade cruzando com equipamentos_recebidos
  const { data: equipamentosBanco } = await supabaseAdmin
    .from("equipamentos_recebidos")
    .select(`
      id,
      equipamentos_modelos (
        finalidade
      )
    `)

  // 2. CRIAMOS O MAPA BLINDADO
  const mapFinalidade = new Map()
  if (equipamentosBanco) {
    equipamentosBanco.forEach((eq: any) => {
      const finalidade = eq.equipamentos_modelos?.finalidade || ""
      mapFinalidade.set(String(eq.id), finalidade) 
    })
  }

  const itens:any[] = []
  let totalFuncionandoGeral = 0 

  for (const [key] of formData.entries()) {

    if (!key.startsWith("modelo_")) continue

    const modeloId = String(key.replace("modelo_", "")) 

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

    // 3. A REGRA DE NEGÓCIO DA SOMA
    const finalidade = mapFinalidade.get(modeloId)
    const finalidadeLimpa = finalidade ? String(finalidade).toLowerCase() : ""
    
    if (!finalidadeLimpa.includes("carregamento")) {
      totalFuncionandoGeral += funcionando
    }

    itens.push({
      inventario_id: inventarioId,
      modelo_id: modeloId, 
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

  // 4. ATUALIZAMOS A ESCOLA COM O NÚMERO E A DATA DE AGORA
  if (escola) {
    try {
      const nomeEscolaLimpo = escola.trim()
      const totalLimpo = Math.round(Number(totalFuncionandoGeral))
      
      // Capturamos o exato momento do envio para salvar no banco
      const agora = new Date().toISOString()

      const { error: erroAtualizaEscola } = await supabaseAdmin
        .from("escolas")
        .update({ 
          total_equipamentos_funcionando: totalLimpo,
          ultima_atualizacao_inventario: agora // <--- A MÁGICA ACONTECE AQUI! ⭐
        }) 
        .eq("nome_escola", nomeEscolaLimpo)

      if (erroAtualizaEscola) {
        console.error("ERRO DB ao atualizar total na escola:", erroAtualizaEscola)
      } else {
        console.log(`Escola ${nomeEscolaLimpo} atualizada! Total: ${totalLimpo}. Data: ${agora}`)
      }
    } catch (err) {
      console.error("Falha de rede ao tentar atualizar a escola:", err)
    }
  }

  revalidatePath("/inventario")
  revalidatePath("/escolas")

}