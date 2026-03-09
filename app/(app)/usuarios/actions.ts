"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase-admin"

export async function createUser(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const nome = formData.get("nome") as string
  const email = formData.get("email") as string
  const senha = formData.get("senha") as string
  const role = formData.get("role") as string

  if (!email || !senha || !role) {
    throw new Error("Dados obrigatórios não informados.")
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

  if (error) throw new Error("Erro ao criar usuário")

  await supabaseAdmin
    .from("usuarios")
    .update({ nome, role })
    .eq("id", data.user.id)

  revalidatePath("/usuarios")
}

/* ========================================= */
/* 🔥 ATUALIZAR PERFIL */
/* ========================================= */

export async function updateUser(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = formData.get("id") as string
  const nome = formData.get("nome") as string
  const role = formData.get("role") as string

  await supabaseAdmin
    .from("usuarios")
    .update({ nome, role })
    .eq("id", id)

  revalidatePath("/usuarios")
}

/* ========================================= */
/* 🔐 REDEFINIR SENHA */
/* ========================================= */

export async function resetPassword(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = formData.get("id") as string
  const novaSenha = formData.get("novaSenha") as string

  await supabaseAdmin.auth.admin.updateUserById(id, {
    password: novaSenha,
  })

  revalidatePath("/usuarios")
}

/* ========================================= */
/* 📧 ALTERAR EMAIL */
/* ========================================= */

export async function updateEmail(formData: FormData) {
  const supabaseAdmin = createAdminClient()

  const id = formData.get("id") as string
  const email = formData.get("email") as string

  await supabaseAdmin.auth.admin.updateUserById(id, {
    email,
  })

  await supabaseAdmin
    .from("usuarios")
    .update({ email })
    .eq("id", id)

  revalidatePath("/usuarios")
}

/* ========================================= */
/* ❌ EXCLUIR USUÁRIO */
/* ========================================= */

export async function deleteUser(formData: FormData) {
  const supabaseAdmin = createAdminClient()
  const id = formData.get("id") as string

  await supabaseAdmin.auth.admin.deleteUser(id)

  revalidatePath("/usuarios")
}