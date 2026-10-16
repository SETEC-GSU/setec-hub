"use server"

import { createServerSupabase } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { canAccess } from "@/lib/canAccess"
import { encontrarServico, type OrigemChamado } from "@/lib/chamados/catalogo"
import { dadosDoPedido, validarPedido, type PedidoChamado } from "@/lib/chamados/validacao"

export async function createChamado(formData: FormData) {
  try {
    const texto = (nome: string) => typeof formData.get(nome) === "string" ? String(formData.get(nome)).trim() : ""
    const origem = texto("origem") as OrigemChamado
    if (!["escola", "ure"].includes(origem)) return { ok: false as const, erro: "Origem inválida." }
    const raw = texto("respostas") || "{}"
    if (raw.length > 14000) return { ok: false as const, erro: "As informações complementares excederam o limite." }
    let respostas
    try { respostas = JSON.parse(raw) } catch { return { ok: false as const, erro: "As informações complementares são inválidas." } }
    const pedido: PedidoChamado = { origem, servicoId: texto("servico_id"), titulo: texto("titulo"), nome: texto("nome"),
      unidade: texto(origem === "escola" ? "escola" : "setor"), ambiente: texto("ambiente"), descricao: texto("descricao"), respostas }
    const erro = validarPedido(pedido)
    if (erro) return { ok: false as const, erro }
    const servico = encontrarServico(pedido.servicoId, origem)!
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { ok: false as const, erro: "Sua sessão expirou. Entre novamente; o preenchimento foi mantido." }
    const { data: perfil, error: perfilError } = await supabase.from("usuarios").select("role,ativo").eq("id", user.id).maybeSingle()
    const permissao = origem === "escola" ? "chamados.escola.create" : "chamados.ure.create"
    if (perfilError || !perfil?.role || perfil.ativo === false || !canAccess(perfil.role as Parameters<typeof canAccess>[0], permissao)) {
      return { ok: false as const, erro: "Seu perfil não possui permissão para abrir este tipo de chamado." }
    }
    const conteudo = dadosDoPedido(pedido, servico)
    const { data, error } = await supabase.from("chamados").insert({
      titulo: pedido.titulo, descricao: conteudo.descricao, categoria: servico.categoria, subcategoria: servico.subcategoria,
      servico_id: servico.id, dados_solicitacao: conteudo.dados, origem, tipo: origem,
      prioridade: servico.prioridade, sla_horas: servico.sla, solicitante_nome: pedido.nome,
      solicitante_email: user.email || null, usuario_id: user.id,
      escola: origem === "escola" ? pedido.unidade : null, setor: origem === "ure" ? pedido.unidade : null,
      equipamento: respostas.equipamento?.trim() || null,
      status: "aberto", visualizado_gestao: false, visualizado_pelo_usuario: true,
    }).select("id,codigo,titulo").single()
    if (error) {
      console.error("[Chamados/criar]", error.code, error.message)
      return { ok: false as const, erro: ["42703", "PGRST204"].includes(error.code) ? "Aplique primeiro a atualização SQL 006 do catálogo de chamados." : "Não foi possível registrar o chamado. Confira a conexão e as permissões; seus dados foram mantidos." }
    }
    if (!data?.id) return { ok: false as const, erro: "Não foi possível confirmar o protocolo. Confira Meus Chamados antes de reenviar." }
    revalidatePath("/chamados"); revalidatePath("/gestao-chamados"); revalidatePath("/painel-chamados")
    return { ok: true as const, chamado: { id: String(data.id), codigo: data.codigo as string | null, titulo: String(data.titulo || pedido.titulo) } }
  } catch (error) {
    console.error("[Chamados/criar]", error instanceof Error ? error.message : "Falha de cadastro")
    return { ok: false as const, erro: "Não foi possível confirmar a gravação. Consulte Meus Chamados antes de reenviar; o preenchimento foi mantido." }
  }
}
