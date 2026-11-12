import type { OrigemChamado } from "./catalogo"

type PerfilUsuario = {
  id: string
  nome: string | null
  email: string | null
  role: string
  setor: string | null
}

/** Somente os dados necessários ao preenchimento, sem repassar id ou role ao formulário. */
export type DadosPerfilChamado = {
  nome: string
  email: string
  unidade: string
  disponivel: boolean
}

export function dadosPerfilChamado(
  perfil: PerfilUsuario | null,
  origem: OrigemChamado
): DadosPerfilChamado {
  if (!perfil || perfil.id === "dev-local" || perfil.email === "dev.local@educacao.sp.gov.br") {
    return { nome: "", email: "", unidade: "", disponivel: false }
  }

  const setor = (perfil.setor || "").trim()
  const setorNormalizado = setor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
  const vinculoEscolar = perfil.role === "gestao_escolas" && !setorNormalizado.startsWith("URE ")

  return {
    nome: (perfil.nome || "").trim(),
    email: (perfil.email || "").trim(),
    // No cadastro atual, a escola está em usuarios.setor. Roles da equipe não
    // identificam uma escola nem um departamento: não inferir esse vínculo.
    unidade: origem === "escola" ? (vinculoEscolar ? setor : "") : (perfil.role === "gestao_escolas" ? "" : setor),
    disponivel: true,
  }
}

export function identificacaoCompleta(nome: string, unidade: string, origem: OrigemChamado) {
  return nome.trim().length >= 3 && nome.length <= 120 &&
    unidade.trim().length >= (origem === "escola" ? 3 : 2) && unidade.length <= 160
}
