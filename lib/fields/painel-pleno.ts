// Usa a mesma permissão já existente na página Atendimento Fields.
export const PERMISSAO_PAINEL_PLENO = "fields.view" as const
export const ROTA_PAINEL_PLENO = "/fields/painel-atividades-pleno" as const

// URL pública de implantação; não contém credenciais do Hub ou do Google.
export const URL_PAINEL_PLENO =
  "https://script.google.com/macros/s/AKfycbz2q6nPymApmRnVBPesW7_ML_lcCmUzLdIWUlT9XJcdZNQqg3Q2eKvGEZzH-ViJQUtN2w/exec"

export function validarUrlPainelPleno(valor: string): string | null {
  try {
    const url = new URL(valor.trim())
    if (
      url.protocol !== "https:" ||
      url.hostname !== "script.google.com" ||
      url.port || url.username || url.password ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)
    ) return null
    return url.href
  } catch {
    return null
  }
}
