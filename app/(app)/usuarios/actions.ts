"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase-admin"

export type UserActionResult = {
  ok: boolean
  message: string
}

function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase()
}

function sucesso(message: string): UserActionResult {
  return { ok: true, message }
}

function falha(message: string): UserActionResult {
  return { ok: false, message }
}

function logErro(contexto: string, error: unknown) {
  console.error(`[USUÁRIOS] ${contexto}:`, error)
}

function mensagemDuplicidade(error: any) {
  const mensagem = String(error?.message || "").toLowerCase()

  return (
    mensagem.includes("already registered") ||
    mensagem.includes("already been registered") ||
    mensagem.includes("user already registered") ||
    mensagem.includes("duplicate") ||
    mensagem.includes("unique")
  )
}

/* ========================================= */
/* ✅ CRIAR USUÁRIO */
/* ========================================= */

export async function createUser(formData: FormData): Promise<UserActionResult> {
  const supabaseAdmin = createAdminClient()

  const nome = getFormString(formData, "nome")
  const email = normalizarEmail(getFormString(formData, "email"))
  const senha = getFormString(formData, "senha")
  const role = getFormString(formData, "role")
  const setor = getFormString(formData, "setor")

  if (!nome || !email || !senha || !role || !setor) {
    return falha("Preencha todos os campos obrigatórios.")
  }

  if (senha.length < 6) {
    return falha("A senha deve ter pelo menos 6 caracteres.")
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
    logErro("Erro ao criar usuário no Auth", error)

    if (mensagemDuplicidade(error)) {
      return falha("Já existe um usuário cadastrado com este e-mail.")
    }

    return falha("Não foi possível criar o usuário no serviço de autenticação.")
  }

  const userId = data.user.id

  /*
   * UPSERT é proposital.
   * A versão anterior usava UPDATE logo após criar o usuário no Auth.
   * Se o trigger/perfil ainda não tivesse criado a linha em `usuarios`,
   * o UPDATE afetava 0 linhas sem necessariamente gerar erro.
   */
  const { error: perfilError } = await supabaseAdmin
    .from("usuarios")
    .upsert(
      {
        id: userId,
        nome,
        email,
        role,
        setor,
      },
      { onConflict: "id" }
    )

  if (perfilError) {
    logErro("Usuário criado no Auth, mas falhou ao gravar o perfil", perfilError)

    // Evita deixar usuário órfão no Auth quando o perfil não é criado.
    const { error: rollbackError } =
      await supabaseAdmin.auth.admin.deleteUser(userId)

    if (rollbackError) {
      logErro("Falha ao desfazer criação do usuário no Auth", rollbackError)
    }

    return falha(
      "Não foi possível concluir o cadastro do usuário. Nenhuma alteração foi mantida."
    )
  }

  revalidatePath("/usuarios")
  return sucesso("Usuário criado com sucesso.")
}

/* ========================================= */
/* 🔥 ATUALIZAR PERFIL */
/* ========================================= */

export async function updateUser(formData: FormData): Promise<UserActionResult> {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")
  const nome = getFormString(formData, "nome")
  const role = getFormString(formData, "role")
  const setor = getFormString(formData, "setor")

  if (!id || !nome || !role || !setor) {
    return falha("Preencha todos os campos obrigatórios.")
  }

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .update({
      nome,
      role,
      setor,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) {
    logErro("Erro ao atualizar perfil", error)
    return falha("Não foi possível atualizar os dados do usuário.")
  }

  if (!data?.id) {
    return falha("Usuário não encontrado na tabela de perfis.")
  }

  revalidatePath("/usuarios")
  return sucesso("Dados gerais atualizados com sucesso.")
}

/* ========================================= */
/* 🔐 REDEFINIR SENHA */
/* ========================================= */

export async function resetPassword(
  formData: FormData
): Promise<UserActionResult> {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")
  const novaSenha = getFormString(formData, "novaSenha")

  if (!id || !novaSenha) {
    return falha("Informe a nova senha.")
  }

  if (novaSenha.length < 6) {
    return falha("A nova senha deve ter pelo menos 6 caracteres.")
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: novaSenha,
  })

  if (error) {
    logErro("Erro ao redefinir senha", error)
    return falha("Não foi possível redefinir a senha do usuário.")
  }

  revalidatePath("/usuarios")
  return sucesso("Senha redefinida com sucesso.")
}

/* ========================================= */
/* 📧 ALTERAR EMAIL */
/* ========================================= */

export async function updateEmail(
  formData: FormData
): Promise<UserActionResult> {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")
  const email = normalizarEmail(getFormString(formData, "email"))

  if (!id || !email) {
    return falha("Informe um e-mail válido.")
  }

  const { data: perfilAtual, error: perfilAtualError } = await supabaseAdmin
    .from("usuarios")
    .select("email")
    .eq("id", id)
    .maybeSingle()

  if (perfilAtualError) {
    logErro("Erro ao consultar e-mail atual", perfilAtualError)
    return falha("Não foi possível validar o usuário antes da alteração.")
  }

  const emailAnterior = normalizarEmail(String(perfilAtual?.email || ""))

  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      email_confirm: true,
    })

  if (authError) {
    logErro("Erro ao alterar e-mail no Auth", authError)

    if (mensagemDuplicidade(authError)) {
      return falha("Este e-mail já está sendo utilizado por outro usuário.")
    }

    return falha("Não foi possível alterar o e-mail do usuário.")
  }

  const { data: perfilAtualizado, error: tableError } = await supabaseAdmin
    .from("usuarios")
    .update({ email })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (tableError || !perfilAtualizado?.id) {
    logErro(
      "E-mail alterado no Auth, mas falhou ao atualizar a tabela",
      tableError
    )

    // Tenta devolver o Auth ao estado anterior para não deixar os dados divergentes.
    if (emailAnterior) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.updateUserById(id, {
          email: emailAnterior,
          email_confirm: true,
        })

      if (rollbackError) {
        logErro("Falha ao restaurar e-mail anterior no Auth", rollbackError)
      }
    }

    return falha(
      "Não foi possível concluir a alteração do e-mail. Os dados anteriores foram preservados sempre que possível."
    )
  }

  revalidatePath("/usuarios")
  return sucesso("E-mail atualizado com sucesso.")
}

/* ========================================= */
/* ❌ EXCLUIR USUÁRIO */
/* ========================================= */

export async function deleteUser(
  formData: FormData
): Promise<UserActionResult> {
  const supabaseAdmin = createAdminClient()

  const id = getFormString(formData, "id")

  if (!id) {
    return falha("ID do usuário não informado.")
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, role, setor")
    .eq("id", id)
    .maybeSingle()

  if (usuarioError) {
    logErro("Erro ao validar usuário antes da exclusão", usuarioError)
    return falha("Não foi possível validar o usuário antes da exclusão.")
  }

  if (!usuario) {
    return falha("Usuário não encontrado.")
  }

  if (usuario.role === "admin") {
    console.warn(
      "[USUÁRIOS] Tentativa bloqueada de excluir usuário admin:",
      usuario.email
    )

    return falha(
      "Usuários administradores não podem ser excluídos pela interface do sistema."
    )
  }

  /*
   * Primeiro removemos o perfil.
   *
   * Motivo:
   * - se existirem FKs/restrições vinculadas a `usuarios`, a operação para aqui;
   * - o usuário continua com acesso e não ficamos com Auth excluído + perfil órfão;
   * - a versão anterior ignorava o erro desta exclusão, podendo retornar sucesso
   *   mesmo com a linha ainda aparecendo na página.
   */
  const { data: perfilRemovido, error: perfilDeleteError } = await supabaseAdmin
    .from("usuarios")
    .delete()
    .eq("id", id)
    .select("id")

  if (perfilDeleteError) {
    logErro("Erro ao excluir perfil da tabela usuarios", perfilDeleteError)

    const codigo = String((perfilDeleteError as any)?.code || "")

    if (codigo === "23503") {
      return falha(
        "Este usuário possui registros vinculados no sistema e não pode ser removido sem preservar essas referências."
      )
    }

    return falha("Não foi possível remover o perfil do usuário.")
  }

  if (!perfilRemovido || perfilRemovido.length === 0) {
    return falha("O perfil do usuário não foi removido.")
  }

  const { error: authError } =
    await supabaseAdmin.auth.admin.deleteUser(id)

  if (authError) {
    logErro("Perfil removido, mas falhou ao excluir usuário no Auth", authError)

    // Rollback do perfil para evitar que o usuário permaneça no Auth
    // sem aparecer na gestão de usuários.
    const { error: rollbackError } = await supabaseAdmin
      .from("usuarios")
      .upsert(
        {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          setor: usuario.setor,
        },
        { onConflict: "id" }
      )

    if (rollbackError) {
      logErro("Falha ao restaurar perfil após erro no Auth", rollbackError)
      return falha(
        "A exclusão não foi concluída e ocorreu uma falha ao restaurar o perfil. Verifique o usuário no Supabase."
      )
    }

    return falha(
      "Não foi possível excluir o acesso no Auth. O perfil foi restaurado e nenhuma exclusão foi concluída."
    )
  }

  revalidatePath("/usuarios")
  return sucesso("Usuário excluído com sucesso.")
}
