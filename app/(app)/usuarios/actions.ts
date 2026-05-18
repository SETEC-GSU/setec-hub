"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase-admin"

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase()
}

/* ========================================= */
/* ✅ CRIAR USUÁRIO */
/* ========================================= */

export async function createUser(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const nome = getFormString(formData, "nome")
  const email = normalizarEmail(getFormString(formData, "email"))
  const senha = getFormString(formData, "senha")
  const role = getFormString(formData, "role")
  const setor = getFormString(formData, "setor")

  if (!nome || !email || !senha || !role || !setor) {
    throw new Error("Dados obrigatórios não informados.")
  }

  if (senha.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.")
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome,
      role,
      setor,
    },
  })

  if (error || !data.user?.id) {
    console.error("[USUÁRIOS] Erro ao criar usuário:", error)
    throw new Error("Erro ao criar usuário.")
  }

  const { error: updateError } = await supabaseAdmin
    .from("usuarios")
    .update({
      nome,
      email,
      role,
      setor,
    })
    .eq("id", data.user.id)

  if (updateError) {
    console.error("[USUÁRIOS] Usuário criado no Auth, mas falhou ao atualizar tabela:", updateError)
    throw new Error("Usuário criado, mas houve erro ao atualizar os dados do perfil.")
  }

  revalidatePath("/usuarios")
}

/* ========================================= */
/* 🔥 ATUALIZAR PERFIL */
/* ========================================= */

export async function updateUser(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")
  const nome = getFormString(formData, "nome")
  const role = getFormString(formData, "role")
  const setor = getFormString(formData, "setor")

  if (!id || !nome || !role || !setor) {
    throw new Error("Dados obrigatórios não informados.")
  }

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update({
      nome,
      role,
      setor,
    })
    .eq("id", id)

  if (error) {
    console.error("[USUÁRIOS] Erro ao atualizar perfil:", error)
    throw new Error("Erro ao atualizar usuário.")
  }

  revalidatePath("/usuarios")
}

/* ========================================= */
/* 🔐 REDEFINIR SENHA */
/* ========================================= */

export async function resetPassword(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")
  const novaSenha = getFormString(formData, "novaSenha")

  if (!id || !novaSenha) {
    throw new Error("Dados obrigatórios não informados.")
  }

  if (novaSenha.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.")
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: novaSenha,
  })

  if (error) {
    console.error("[USUÁRIOS] Erro ao redefinir senha:", error)
    throw new Error("Erro ao redefinir senha.")
  }

  revalidatePath("/usuarios")
}

/* ========================================= */
/* 📧 ALTERAR EMAIL */
/* ========================================= */

export async function updateEmail(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")
  const email = normalizarEmail(getFormString(formData, "email"))

  if (!id || !email) {
    throw new Error("Dados obrigatórios não informados.")
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
  })

  if (authError) {
    console.error("[USUÁRIOS] Erro ao alterar e-mail no Auth:", authError)
    throw new Error("Erro ao alterar e-mail do usuário.")
  }

  const { error: tableError } = await supabaseAdmin
    .from("usuarios")
    .update({ email })
    .eq("id", id)

  if (tableError) {
    console.error("[USUÁRIOS] E-mail alterado no Auth, mas falhou na tabela:", tableError)
    throw new Error("E-mail alterado, mas houve erro ao atualizar a tabela de usuários.")
  }

  revalidatePath("/usuarios")
}

/* ========================================= */
/* ❌ EXCLUIR USUÁRIO */
/* ========================================= */

export async function deleteUser(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")

  if (!id) {
    throw new Error("ID do usuário não informado.")
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, role")
    .eq("id", id)
    .maybeSingle()

  if (usuarioError) {
    console.error("[USUÁRIOS] Erro ao validar usuário antes da exclusão:", usuarioError)
    throw new Error("Erro ao validar usuário antes da exclusão.")
  }

  if (!usuario) {
    throw new Error("Usuário não encontrado.")
  }

  if (usuario.role === "admin") {
    console.warn("[USUÁRIOS] Tentativa bloqueada de excluir usuário admin:", usuario.email)

    revalidatePath("/usuarios")
    return {
      ok: false,
      message: "Usuários administradores não podem ser excluídos pela interface do sistema.",
    }
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (authError) {
    console.error("[USUÁRIOS] Erro ao excluir usuário no Auth:", authError)
    throw new Error("Erro ao excluir usuário.")
  }

  await supabaseAdmin.from("usuarios").delete().eq("id", id)

  revalidatePath("/usuarios")

  return {
    ok: true,
    message: "Usuário excluído com sucesso.",
  }
}