import { STATUS_ESCOLA, type EscolaPainel } from "./modelo"
export type VistaMapa = { centro: [number, number]; zoom: number }
export type GrupoMapa = { id: string; escolas: EscolaPainel[]; ponto: [number, number]; status: EscolaPainel["indicadores"]["criticidade"] }
/** Agrupamento em células de tela. Depende apenas do zoom, sem consultas ou bibliotecas adicionais. */
export function agruparEscolas(escolas: EscolaPainel[], zoom: number, selecionada?: string | null): GrupoMapa[] {
  const grupos = new Map<string, EscolaPainel[]>()
  const escala = 256 * 2 ** Math.max(0, Math.min(20, zoom)), tamanho = 60
  for (const escola of escolas) {
    if (!escola.ponto) continue
    const [lat, lng] = escola.ponto, seno = Math.sin(lat * Math.PI / 180)
    const x = (lng + 180) / 360 * escala
    const y = (.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * escala
    const chave = escola.id === selecionada ? `selecionada:${escola.id}` : `${Math.floor(x / tamanho)}:${Math.floor(y / tamanho)}`
    const grupo = grupos.get(chave)
    if (grupo) grupo.push(escola); else grupos.set(chave, [escola])
  }
  return [...grupos.values()].map(lista => {
    const ordenadas = [...lista].sort((a, b) => a.id.localeCompare(b.id))
    return { id: ordenadas.map(e => e.id).join("|"), escolas: ordenadas,
      ponto: [lista.reduce((s, e) => s + e.ponto![0], 0) / lista.length, lista.reduce((s, e) => s + e.ponto![1], 0) / lista.length] as [number, number],
      status: lista.reduce((s, e) => STATUS_ESCOLA[e.indicadores.criticidade].ordem < STATUS_ESCOLA[s].ordem ? e.indicadores.criticidade : s, lista[0].indicadores.criticidade) }
  })
}
