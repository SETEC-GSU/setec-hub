"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase-admin"
import { createServerSupabase } from "@/lib/supabase-server"

const ADMIN_ROLES = new Set(["admin", "seintec"])

type ActionResult<T = undefined> = {
  ok: boolean
  message: string
  data?: T
}

function text(value: unknown) {
  return String(value ?? "").trim()
}

function normalizeRole(value: unknown) {
  return text(value).toLowerCase().replace(/[\s-]+/g, "_")
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "")
}

function boolFromForm(value: FormDataEntryValue | null) {
  const normalized = text(value).toLowerCase()
  return ["1", "true", "sim", "yes", "on"].includes(normalized)
}

function defaultFwLink(cie: string) {
  const clean = digits(cie)
  if (!clean) return ""
  return `https://fw-${clean.padStart(6, "0")}/`
}

async function getCurrentProfile() {
  const supabase = await createServerSupabase()
  const admin = createAdminClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("[SAI-BL] Erro de autenticação:", authError)
  }

  if (!user) return null

  const { data: profile, error } = await admin
    .from("usuarios")
    .select("id,nome,email,role,setor")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[SAI-BL] Erro ao buscar perfil:", error)
  }

  return {
    id: user.id,
    email: profile?.email || user.email || null,
    nome: profile?.nome || user.email || "Usuário",
    role: normalizeRole(profile?.role),
    setor: profile?.setor || null,
  }
}

function isAdminRole(role: string) {
  return ADMIN_ROLES.has(normalizeRole(role))
}

export async function carregarSaibl(): Promise<ActionResult<any>> {
  const profile = await getCurrentProfile()

  if (!profile) {
    return {
      ok: false,
      message: "Usuário não autenticado.",
    }
  }

  const admin = createAdminClient()
  const adminView = isAdminRole(profile.role)

  if (adminView) {
    const [{ data: rows, error }, { data: escolas, error: escolasError }] =
      await Promise.all([
        admin
          .from("saibl_status")
          .select(`
            id,
            escola_id,
            escola,
            cie,
            link_fw,
            status_saibl,
            online_fw,
            velocidade_saibl,
            possui_terceiro_link_piec,
            terceiro_link_detalhes,
            situacao_internal3,
            necessita_field,
            observacao_setec,
            data_validacao,
            validado_por,
            ativo,
            created_at,
            updated_at,
            updated_by
          `)
          .order("escola", { ascending: true }),
        admin
          .from("escolas")
          .select("id,nome_escola,cie")
          .order("nome_escola", { ascending: true }),
      ])

    if (error) {
      console.error("[SAI-BL] Erro ao carregar base:", error)
      return { ok: false, message: "Erro ao carregar a base SAI-BL." }
    }

    if (escolasError) {
      console.error("[SAI-BL] Erro ao carregar escolas de referência:", escolasError)
    }

    return {
      ok: true,
      message: "Base carregada.",
      data: {
        profile,
        adminView: true,
        rows: rows || [],
        escolasReferencia: escolas || [],
      },
    }
  }

  /*
   * Consulta pública/autenticada:
   * NÃO devolve link_fw, observações internas, situação Internal 3,
   * flags FIELD ou dados de auditoria administrativa.
   */
  const { data: rows, error } = await admin
    .from("saibl_status")
    .select(`
      id,
      escola,
      cie,
      status_saibl,
      online_fw,
      velocidade_saibl,
      possui_terceiro_link_piec,
      updated_at
    `)
    .eq("ativo", true)
    .order("escola", { ascending: true })

  if (error) {
    console.error("[SAI-BL] Erro ao carregar consulta:", error)
    return { ok: false, message: "Erro ao carregar a consulta SAI-BL." }
  }

  return {
    ok: true,
    message: "Consulta carregada.",
    data: {
      profile,
      adminView: false,
      rows: rows || [],
      escolasReferencia: [],
    },
  }
}

export async function salvarSaibl(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile()

  if (!profile || !isAdminRole(profile.role)) {
    return {
      ok: false,
      message: "Apenas ADMIN e SEINTEC podem alterar a base SAI-BL.",
    }
  }

  const admin = createAdminClient()

  const id = text(formData.get("id"))
  const escolaId = text(formData.get("escola_id"))

  const statusSaibl = text(formData.get("status_saibl"))
  const velocidade = text(formData.get("velocidade_saibl"))
  const terceiroLinkDetalhes = text(formData.get("terceiro_link_detalhes"))
  const situacaoInternal3 = text(formData.get("situacao_internal3"))
  const observacaoSetec = text(formData.get("observacao_setec"))

  const allowedStatus = new Set(["INSTALADA", "PREVISTA", "NÃO INSTALADA"])
  const allowedInternal = new Set([
    "NAO_SE_APLICA",
    "A_VALIDAR",
    "CONECTADO_INTERNAL_3",
    "FORA_INTERNAL_3",
    "AJUSTE_NECESSARIO",
  ])

  if (!escolaId) {
    return { ok: false, message: "Selecione uma unidade escolar." }
  }

  if (!allowedStatus.has(statusSaibl)) {
    return { ok: false, message: "Status SAI-BL inválido." }
  }

  if (!allowedInternal.has(situacaoInternal3)) {
    return { ok: false, message: "Situação da Internal 3 inválida." }
  }

  const { data: escola, error: escolaError } = await admin
    .from("escolas")
    .select("id,nome_escola,cie")
    .eq("id", escolaId)
    .maybeSingle()

  if (escolaError || !escola) {
    console.error("[SAI-BL] Escola inválida:", escolaError)
    return { ok: false, message: "Não foi possível localizar a escola selecionada." }
  }

  const cie = digits(escola.cie)
  const linkFwInformado = text(formData.get("link_fw"))

  const payload = {
    escola_id: escola.id,
    escola: text(escola.nome_escola) || "Escola sem nome",
    cie,
    link_fw: linkFwInformado || defaultFwLink(cie),
    status_saibl: statusSaibl,
    online_fw: boolFromForm(formData.get("online_fw")),
    velocidade_saibl: velocidade || null,
    possui_terceiro_link_piec: boolFromForm(
      formData.get("possui_terceiro_link_piec")
    ),
    terceiro_link_detalhes: terceiroLinkDetalhes || null,
    situacao_internal3: situacaoInternal3,
    necessita_field: boolFromForm(formData.get("necessita_field")),
    observacao_setec: observacaoSetec || null,
    data_validacao:
      text(formData.get("marcar_validado")) === "sim"
        ? new Date().toISOString()
        : null,
    validado_por:
      text(formData.get("marcar_validado")) === "sim" ? profile.id : null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
    ativo: true,
  }

  if (id) {
    const { error } = await admin
      .from("saibl_status")
      .update(payload)
      .eq("id", id)

    if (error) {
      console.error("[SAI-BL] Erro ao atualizar:", error)

      if (String((error as any)?.code || "") === "23505") {
        return {
          ok: false,
          message: "Já existe um registro SAI-BL para esta escola/CIE.",
        }
      }

      return { ok: false, message: "Não foi possível atualizar o registro." }
    }

    revalidatePath("/segundo-link")
    return { ok: true, message: "Registro SAI-BL atualizado com sucesso." }
  }

  const { error } = await admin.from("saibl_status").insert(payload)

  if (error) {
    console.error("[SAI-BL] Erro ao criar:", error)

    if (String((error as any)?.code || "") === "23505") {
      return {
        ok: false,
        message: "Esta escola já possui um registro no acompanhamento SAI-BL.",
      }
    }

    return { ok: false, message: "Não foi possível criar o registro." }
  }

  revalidatePath("/segundo-link")
  return { ok: true, message: "Escola adicionada ao acompanhamento SAI-BL." }
}

export async function arquivarSaibl(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile()

  if (!profile || !isAdminRole(profile.role)) {
    return { ok: false, message: "Operação não autorizada." }
  }

  const id = text(formData.get("id"))
  if (!id) return { ok: false, message: "Registro inválido." }

  const admin = createAdminClient()

  const { error } = await admin
    .from("saibl_status")
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id)

  if (error) {
    console.error("[SAI-BL] Erro ao arquivar:", error)
    return { ok: false, message: "Não foi possível arquivar o registro." }
  }

  revalidatePath("/segundo-link")
  return { ok: true, message: "Registro arquivado com sucesso." }
}

export async function restaurarSaibl(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile()

  if (!profile || !isAdminRole(profile.role)) {
    return { ok: false, message: "Operação não autorizada." }
  }

  const id = text(formData.get("id"))
  if (!id) return { ok: false, message: "Registro inválido." }

  const admin = createAdminClient()

  const { error } = await admin
    .from("saibl_status")
    .update({
      ativo: true,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id)

  if (error) {
    console.error("[SAI-BL] Erro ao restaurar:", error)
    return { ok: false, message: "Não foi possível restaurar o registro." }
  }

  revalidatePath("/segundo-link")
  return { ok: true, message: "Registro restaurado com sucesso." }
}
