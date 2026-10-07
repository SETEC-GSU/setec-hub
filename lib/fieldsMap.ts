export type EscolaMapa = {
  id: string
  nome_escola?: string | null
  cie?: string | number | null
  latitude?: string | number | null
  longitude?: string | number | null
  tecnico_atribuido?: string | null
}

export const SEM_TECNICO = "__sem_tecnico__"

export function textoSeguro(value: unknown, fallback = "") {
  return (
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ") || fallback
  )
}

export function normalizar(value: unknown) {
  return textoSeguro(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
}

export function getTecnicoId(value?: string | null) {
  const id = normalizar(value)
  return !id || id === "sem tecnico" || id === "sem atribuicao"
    ? SEM_TECNICO
    : id
}

export function getTecnicoVisual(value?: string | null) {
  const id = getTecnicoId(value)
  if (id === SEM_TECNICO) {
    return { id, nome: "Sem técnico", iniciais: "—", cor: "#64748b" }
  }

  const nome = textoSeguro(value)
  const partes = nome.split(" ").filter(Boolean)
  const iniciais = [
    partes[0],
    partes.length > 1 ? partes[partes.length - 1] : ""
  ]
    .map((parte) => Array.from(parte)[0] || "")
    .join("")
    .toLocaleUpperCase("pt-BR")

  // A cor depende somente do nome normalizado: filtros, ordem e novos
  // cadastros não alteram a cor dos demais técnicos. Cinza é só sem atribuição.
  let hash = 2166136261
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619)
  }
  const hue = (hash >>> 0) % 360
  // Amarelos, verdes e cianos precisam ser mais escuros para as iniciais brancas.
  const lightness = hue >= 36 && hue <= 200 ? 27 : 36
  return { id, nome, iniciais, cor: `hsl(${hue}, 72%, ${lightness}%)` }
}

function coordenada(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "number" && typeof value !== "string") return null
  const text = String(value).trim().replace(",", ".")
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function getCoordenadas(escola: EscolaMapa): [number, number] | null {
  const latitude = coordenada(escola.latitude)
  const longitude = coordenada(escola.longitude)
  if (latitude === null || longitude === null) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  if (latitude === 0 && longitude === 0) return null
  return [latitude, longitude]
}

export function getTecnicos(escolas: EscolaMapa[]) {
  const tecnicos = new Map<
    string,
    ReturnType<typeof getTecnicoVisual> & { quantidade: number }
  >()
  for (const escola of escolas) {
    const tecnico = getTecnicoVisual(escola.tecnico_atribuido)
    const anterior = tecnicos.get(tecnico.id)
    if (anterior) anterior.quantidade += 1
    else tecnicos.set(tecnico.id, { ...tecnico, quantidade: 1 })
  }
  return Array.from(tecnicos.values()).sort((a, b) => {
    if (a.id === SEM_TECNICO) return 1
    if (b.id === SEM_TECNICO) return -1
    return a.nome.localeCompare(b.nome, "pt-BR")
  })
}

export function filtrarEscolas(
  escolas: EscolaMapa[],
  busca: string,
  tecnicoId: string
) {
  const termos = normalizar(busca).split(" ").filter(Boolean)
  return escolas.filter((escola) => {
    if (tecnicoId && getTecnicoId(escola.tecnico_atribuido) !== tecnicoId) {
      return false
    }
    const conteudo = normalizar(
      [escola.nome_escola, escola.cie, escola.tecnico_atribuido].join(" ")
    )
    return termos.every((termo) => conteudo.includes(termo))
  })
}
