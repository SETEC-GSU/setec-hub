"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase-admin"
import { createServerSupabase } from "@/lib/supabase-server"
import { rolePermissions } from "@/lib/permissions"

export type UserActionResult = { ok: boolean; message: string }
type AdminContext = { actorId: string; admin: ReturnType<typeof createAdminClient> }
const sucesso = (message: string): UserActionResult => ({ ok: true, message })
const falha = (message: string): UserActionResult => ({ ok: false, message })

function texto(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === "string" ? v.trim() : ""
}
function senha(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === "string" ? v : ""
}
function uuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
function emailValido(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function perfilValido(role: string) { return Object.prototype.hasOwnProperty.call(rolePermissions, role) }
function duplicado(error: unknown) {
  const e = error as { message?: string; code?: string } | null
  return e?.code === "23505" || /already.*registered|already.*exists|duplicate|unique/i.test(e?.message || "")
}
function registrar(contexto: string, error: unknown) {
  const e = error as { message?: string; code?: string } | null
  console.error(`[Usuários] ${contexto}:`, e?.code || "", e?.message || "Falha de operação")
}
function atualizarPaginas() {
  for (const p of ["/usuarios", "/fields/inventario", "/inventario/visao-geral"]) revalidatePath(p)
  revalidatePath("/", "layout")
}

// A autorização usa a sessão real. O fallback de desenvolvimento de getUser
// não concede acesso às chaves administrativas.
async function comoAdmin(tarefa: (contexto: AdminContext) => Promise<UserActionResult>) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return falha("Sua sessão expirou. Entre novamente para administrar os usuários.")
    const { data: perfil, error: perfilError } = await supabase.from("usuarios")
      .select("role").eq("id", user.id).maybeSingle()
    if (perfilError || perfil?.role !== "admin") return falha("Apenas administradores podem administrar usuários.")
    return await tarefa({ actorId: user.id, admin: createAdminClient() })
  } catch (error) {
    registrar("Falha de administração", error)
    return falha("Não foi possível confirmar a operação. Confira os dados atuais e tente novamente.")
  }
}

export async function createUser(formData: FormData): Promise<UserActionResult> {
  return comoAdmin(async ({ admin }) => {
    const nome = texto(formData, "nome"), email = texto(formData, "email").toLowerCase()
    const password = senha(formData, "senha"), role = texto(formData, "role"), setor = texto(formData, "setor")
    if (!nome || !email || !password || !role || !setor) return falha("Preencha todos os campos obrigatórios.")
    if (!emailValido(email)) return falha("Informe um e-mail válido.")
    if (!perfilValido(role)) return falha("Selecione um perfil válido, incluindo Field quando necessário.")
    if (nome.length > 180 || setor.length > 240) return falha("O nome ou setor ultrapassa o limite de caracteres.")
    if (password.length < 6) return falha("A senha deve ter pelo menos 6 caracteres.")
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome, role, setor } })
    if (error || !data.user?.id) {
      registrar("Cadastro no Auth", error)
      return falha(duplicado(error) ? "Já existe um usuário cadastrado com este e-mail." : "Não foi possível criar o acesso do usuário.")
    }
    const { error: perfilError } = await admin.from("usuarios")
      .upsert({ id: data.user.id, nome, email, role, setor }, { onConflict: "id" })
    if (perfilError) {
      registrar("Cadastro do perfil", perfilError)
      const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id)
      if (rollbackError) {
        registrar("Desfazer cadastro no Auth", rollbackError)
        return falha("O acesso foi criado no Auth, mas o perfil não foi concluído e o desfazimento falhou. Confira esse e-mail no Supabase antes de tentar novamente.")
      }
      return falha(perfilError.code === "23514" && role === "field"
        ? "A role Field ainda não está habilitada no banco. Aplique o SQL do upgrade de inventário antes de cadastrar esse perfil."
        : "O perfil não pôde ser gravado. O acesso criado nesta tentativa foi removido.")
    }
    atualizarPaginas()
    return sucesso(role === "field" ? "Field cadastrado. Vincule a conta ao técnico em Inventário Field → Vínculos de acesso." : "Usuário criado com sucesso.")
  })
}

export async function updateUser(formData: FormData): Promise<UserActionResult> {
  return comoAdmin(async ({ admin, actorId }) => {
    const id = texto(formData, "id"), nome = texto(formData, "nome"), role = texto(formData, "role"), setor = texto(formData, "setor")
    if (!uuid(id) || !nome || !setor) return falha("Informe o usuário, nome e setor corretamente.")
    if (!perfilValido(role)) return falha("Selecione um perfil válido.")
    if (nome.length > 180 || setor.length > 240) return falha("O nome ou setor ultrapassa o limite de caracteres.")
    if (id === actorId && role !== "admin") return falha("Mantenha seu próprio perfil como administrador. Use outra conta administrativa para alterar esse acesso.")
    const { data, error } = await admin.from("usuarios").update({ nome, role, setor }).eq("id", id).select("id").maybeSingle()
    if (error) { registrar("Atualização de perfil", error); return falha("Não foi possível atualizar os dados do usuário.") }
    if (!data?.id) return falha("Usuário não encontrado na tabela de perfis.")
    atualizarPaginas()
    return sucesso("Dados gerais atualizados com sucesso.")
  })
}

export async function resetPassword(formData: FormData): Promise<UserActionResult> {
  return comoAdmin(async ({ admin }) => {
    const id = texto(formData, "id"), password = senha(formData, "novaSenha")
    if (!uuid(id) || !password) return falha("Informe o usuário e a nova senha.")
    if (password.length < 6) return falha("A nova senha deve ter pelo menos 6 caracteres.")
    const { data: perfil, error: perfilError } = await admin.from("usuarios").select("id").eq("id", id).maybeSingle()
    if (perfilError || !perfil) return falha("Não foi possível localizar o perfil para redefinir a senha.")
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) { registrar("Redefinição de senha", error); return falha("Não foi possível redefinir a senha do usuário.") }
    atualizarPaginas()
    return sucesso("Senha redefinida com sucesso.")
  })
}

export async function updateEmail(formData: FormData): Promise<UserActionResult> {
  return comoAdmin(async ({ admin }) => {
    const id = texto(formData, "id"), email = texto(formData, "email").toLowerCase()
    if (!uuid(id) || !emailValido(email)) return falha("Informe o usuário e um e-mail válido.")
    const { data: perfil, error: perfilError } = await admin.from("usuarios").select("id,email").eq("id", id).maybeSingle()
    if (perfilError || !perfil) return falha("Não foi possível localizar o perfil antes da alteração.")
    const { data: authAtual, error: consultaError } = await admin.auth.admin.getUserById(id)
    if (consultaError || !authAtual.user?.email) return falha("Não foi possível validar o acesso atual. O e-mail não foi alterado.")
    const emailAnterior = authAtual.user.email
    const { error: authError } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
    if (authError) { registrar("Alteração de e-mail no Auth", authError); return falha(duplicado(authError) ? "Este e-mail já está sendo utilizado por outro usuário." : "Não foi possível alterar o e-mail do usuário.") }
    const { data: atualizado, error: tableError } = await admin.from("usuarios").update({ email }).eq("id", id).select("id").maybeSingle()
    if (tableError || !atualizado) {
      registrar("Sincronização de e-mail do perfil", tableError)
      const { data: confirmar } = await admin.from("usuarios").select("email").eq("id", id).maybeSingle()
      if (confirmar?.email?.toLowerCase() === email) { atualizarPaginas(); return sucesso("E-mail atualizado com sucesso.") }
      const { error: rollbackError } = await admin.auth.admin.updateUserById(id, { email: emailAnterior, email_confirm: true })
      if (rollbackError) {
        registrar("Restauração de e-mail", rollbackError)
        return falha("O e-mail mudou no Auth, mas o perfil não foi sincronizado e a restauração falhou. Confira o acesso no Supabase antes de tentar novamente.")
      }
      return falha("A atualização do perfil falhou. O e-mail anterior do Auth foi restaurado.")
    }
    atualizarPaginas()
    return sucesso("E-mail atualizado com sucesso.")
  })
}

export async function deleteUser(formData: FormData): Promise<UserActionResult> {
  return comoAdmin(async ({ admin, actorId }) => {
    const id = texto(formData, "id")
    if (!uuid(id)) return falha("ID do usuário inválido.")
    const { data: usuario, error } = await admin.from("usuarios").select("id,role").eq("id", id).maybeSingle()
    if (error || !usuario) return falha("Não foi possível localizar o usuário antes da exclusão.")
    if (usuario.role === "admin" || id === actorId) return falha("Usuários administradores não podem ser excluídos pela interface do sistema.")
    // O diagnóstico confirmou usuarios.id → auth.users(id) ON DELETE CASCADE.
    // Uma única exclusão no Auth deixa o banco aplicar as FKs. Se o usuário tem
    // inventários vinculados, a restrição impede a exclusão inteira, preservando
    // também o vínculo tecnico.usuario_id. Não apagamos o perfil antes do Auth.
    const { error: authError } = await admin.auth.admin.deleteUser(id)
    if (authError) {
      registrar("Exclusão do acesso", authError)
      return falha("Não foi possível excluir o acesso. O usuário pode ter registros vinculados que precisam ser preservados. O perfil não foi removido por esta ação.")
    }
    const { data: restante, error: verificarError } = await admin.from("usuarios").select("id").eq("id", id).maybeSingle()
    if (verificarError || restante) {
      atualizarPaginas()
      return falha("O acesso foi removido do Auth, mas não foi possível confirmar a remoção do perfil. Confira esse usuário antes de repetir a operação.")
    }
    atualizarPaginas()
    return sucesso("Usuário excluído com sucesso.")
  })
}
