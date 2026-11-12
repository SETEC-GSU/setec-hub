export const MAX_ARQUIVOS = 3
export const MAX_TAMANHO_ARQUIVO = 5 * 1024 * 1024

export function validarArquivos(arquivos: readonly File[]) {
  if (arquivos.length > MAX_ARQUIVOS) return `Você pode anexar até ${MAX_ARQUIVOS} arquivos. Remova um para adicionar outro.`
  const grande = arquivos.find(arquivo => arquivo.size > MAX_TAMANHO_ARQUIVO)
  return grande ? `O arquivo “${grande.name}” ultrapassa o limite de 5 MB.` : null
}

export function adicionarArquivos(atuais: readonly File[], novos: readonly File[]) {
  const arquivos = [...atuais], chaves = new Set(atuais.map(chaveArquivo))
  for (const arquivo of novos) {
    const chave = chaveArquivo(arquivo)
    if (!chaves.has(chave)) { arquivos.push(arquivo); chaves.add(chave) }
  }
  const erro = validarArquivos(arquivos)
  return erro ? { ok: false as const, erro } : { ok: true as const, arquivos }
}
function chaveArquivo(arquivo: File) {
  return JSON.stringify([arquivo.name, arquivo.size, arquivo.lastModified, arquivo.type])
}
export function tamanhoArquivo(bytes: number) {
  const valor = bytes < 1024 * 1024 ? Math.max(1, bytes / 1024) : bytes / (1024 * 1024)
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${bytes < 1024 * 1024 ? "KB" : "MB"}`
}
