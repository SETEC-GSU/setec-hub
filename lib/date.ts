export function formatarDataBR(data: string | null | undefined) {
  if (!data) return ""

  const date = new Date(data)

  const dia = date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })

  const hora = date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
  })

  return `${dia}, ${hora}`
}