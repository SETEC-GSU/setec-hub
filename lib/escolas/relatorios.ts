import { indicadoresEscola, normalizar, prepararEscola, texto, type Escola, type EscolaPainel } from "./modelo"

export type FiltrosEscolas = { busca: string; status: string; tecnico: string; ordem: string }
export type PedidoRelatorioEscolar = { escolaId?: string; escopo: "todas" | "filtradas" | "individual"; detalhar: boolean; filtros: FiltrosEscolas }
export type ModeloFonte = { id?: string | null; equipamento?: string | null; tipo?: string | null; finalidade?: string | null; uso?: string | null; ano_recebimento?: string | number | null }
export type RecebidoFonte = { id: string; escola_nome: string | null; quantidade_recebida: number | null; equipamentos_modelos?: ModeloFonte | ModeloFonte[] | null }
export const SITUACOES_INVENTARIO = ["funcionando", "aguardando_garantia", "danificados_mau_uso", "nao_localizado"] as const
export type SituacaoInventario = typeof SITUACOES_INVENTARIO[number]
export type ItemFonte = { modelo_id: string | null } & Record<SituacaoInventario, number | null>
export type RespostaFonte = { id: string; escola_nome: string | null; created_at: string; responsavel_nome: string | null; responsavel_cargo: string | null; observacao: string | null; inventario_itens?: ItemFonte[] | null }
export type FonteInventario = { equipamentos: RecebidoFonte[]; inventarios: RespostaFonte[] }
export type LinhaInventarioEscola = { id: string; nome: string; tipo: string; finalidade: string; uso: string; ano: string; recebido: number | null; plataforma: boolean; declarado: boolean; conferir: number | null } & Record<SituacaoInventario, number | null>
export type TotaisEscola = Record<SituacaoInventario, number> & { recebido: number; plataformas: number; conferir: number; modelos: number; semDeclaracao: number; semRecebimento: number; divergencias: number }
export type FichaRelatorioEscola = { escola: EscolaPainel; inventario: LinhaInventarioEscola[]; ultimaResposta: RespostaFonte | null; totais: TotaisEscola; alertas: string[]; indiceInventario: ReturnType<typeof indicadoresEscola> }
export type BaseRelatorioEscolar = { fichas: FichaRelatorioEscola[]; totais: TotaisEscola; porModelo: LinhaInventarioEscola[]; semEnvio: number; geradoEm: string; solicitante: string; pedido: PedidoRelatorioEscolar; assinatura: string }
export type PreviaRelatorioEscolar = { assinatura: string; geradoEm: string; escolas: number; modelos: number; totais: TotaisEscola; semEnvio: number; alertas: number; individual: boolean; nome?: string }
const chaveEscola = (nome: unknown) => normalizar(nome).replace(/\s+/g, " ")
export function validarPedidoRelatorio(valor: unknown): PedidoRelatorioEscolar {
  const p = valor as Partial<PedidoRelatorioEscolar> | null
  if (!p || !["todas", "filtradas", "individual"].includes(String(p.escopo)) || typeof p.detalhar !== "boolean") throw new Error("Confira as opções do relatório.")
  if (p.escopo === "individual" && (typeof p.escolaId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.escolaId))) throw new Error("Selecione uma escola válida.")
  const f = p.filtros as FiltrosEscolas | undefined
  if (!f || typeof f.busca !== "string" || f.busca.length > 180 || typeof f.tecnico !== "string" || f.tecnico.length > 160 || !["todas","critica","atencao","saudavel","sem_dados"].includes(f.status) || !["nome","prioridade","visita"].includes(f.ordem)) throw new Error("Os filtros do relatório são inválidos.")
  return { escopo: p.escopo!, escolaId: p.escopo === "individual" ? p.escolaId : undefined, detalhar: p.escopo === "individual" ? true : p.detalhar, filtros: { busca: f.busca.trim(), tecnico: f.tecnico, status: f.status, ordem: f.ordem } }
}
export function filtrarEscolasRelatorio(escolas: Escola[], pedido: PedidoRelatorioEscolar) {
  const f = pedido.filtros, termos = normalizar(f.busca).split(/\s+/).filter(Boolean)
  return escolas.map(prepararEscola).filter(e => pedido.escopo === "individual" ? e.id === pedido.escolaId : pedido.escopo === "todas" ||
    termos.every(t => e.busca.includes(t)) && (f.status === "todas" || e.indicadores.criticidade === f.status) && (f.tecnico === "todos" || (f.tecnico === "sem_tecnico" ? !texto(e.tecnico_atribuido, "") : texto(e.tecnico_atribuido, "") === f.tecnico)))
    .sort((a,b) => texto(a.nome_escola).localeCompare(texto(b.nome_escola), "pt-BR") || a.id.localeCompare(b.id))
}
function quantidadeFonte(v: unknown, permitirAusente = false): number | null {
  if (v === null || v === undefined) { if (permitirAusente) return null; throw new Error("Há quantidades de recebimento ausentes. Confira a base antes de emitir.") }
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new Error("Há quantidades inválidas no inventário. Nenhum relatório parcial foi emitido.")
  return v
}
function vazio(): TotaisEscola { return { recebido:0, plataformas:0, conferir:0, modelos:0, semDeclaracao:0, semRecebimento:0, divergencias:0, funcionando:0, aguardando_garantia:0, danificados_mau_uso:0, nao_localizado:0 } }
const N1110_CONSOLIDADO = "Notebook Positivo N1110 - LOTES 1 E 2"
const IDS_N1110 = new Set(["0e1e7331-8550-41bd-b1e2-9ba37e6087eb", "80f610df-bb29-459e-a397-f58a13746fa8"])
const NOMES_N1110 = new Set([
  "Notebook Positivo N1110 - 32GB - LOTE 1",
  "Notebook Positivo N1110 - 64GB - LOTE 1",
  "Notebook Positivo N1110 - 64GB - LOTE 2",
  N1110_CONSOLIDADO,
].map(chaveEscola))

function modeloRecebido(recebido: RecebidoFonte): ModeloFonte {
  const relacao = recebido.equipamentos_modelos
  if (Array.isArray(relacao) && relacao.length > 1) throw new Error("Há recebimento com mais de um modelo vinculado. Confira o cadastro antes de emitir.")
  const modelo = Array.isArray(relacao) ? relacao[0] : relacao
  if (!modelo || !texto(modelo.equipamento, "")) throw new Error("Há equipamento recebido sem identificação de modelo. Confira o cadastro antes de emitir o relatório.")
  return modelo
}

function nomeModelo(modelo: ModeloFonte) {
  return IDS_N1110.has(texto(modelo.id, "")) || NOMES_N1110.has(chaveEscola(modelo.equipamento))
    ? N1110_CONSOLIDADO
    : texto(modelo.equipamento).replace(/\s+/g, " ")
}

function unirMetadados(a: string, b: string) {
  return [...new Set([a, b].flatMap(v => v.split(" / ")).map(v => v.trim()).filter(Boolean))]
    .sort((x, y) => x.localeCompare(y, "pt-BR", { numeric: true }) || (x < y ? -1 : x > y ? 1 : 0)).join(" / ")
}

function mesclarMetadados(linha: LinhaInventarioEscola, outra: Pick<LinhaInventarioEscola, "nome" | "tipo" | "finalidade" | "uso" | "ano">) {
  // Um nome normalizado tem apresentação estável mesmo se a ordem da consulta mudar.
  if (outra.nome < linha.nome) linha.nome = outra.nome
  for (const campo of ["tipo", "finalidade", "uso", "ano"] as const) linha[campo] = unirMetadados(linha[campo], outra[campo])
}

function ultimaRespostaValida(envios: RespostaFonte[]) {
  const validos = envios.filter(r => Array.isArray(r.inventario_itens) && r.inventario_itens.length > 0)
  if (validos.some(r => !Number.isFinite(Date.parse(r.created_at)))) throw new Error("Há inventários sem data válida. Confira a base.")
  validos.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))
  return { ultima: validos[0] || null, ignorados: envios.length - validos.length }
}

export function referenciasInventarioAusentes(escolas: EscolaPainel[], fonte: FonteInventario) {
  const idsRecebidos = new Set(fonte.equipamentos.map(r => r.id))
  const selecionadas = new Set(escolas.map(e => chaveEscola(e.nome_escola)))
  const envios = new Map<string, RespostaFonte[]>()
  for (const resposta of fonte.inventarios) {
    const chave = chaveEscola(resposta.escola_nome)
    if (!selecionadas.has(chave)) continue
    const lista = envios.get(chave) || []
    lista.push(resposta)
    envios.set(chave, lista)
  }
  const faltantes = new Set<string>()
  for (const lista of envios.values()) for (const item of ultimaRespostaValida(lista).ultima?.inventario_itens || []) {
    if (item.modelo_id && !idsRecebidos.has(item.modelo_id)) faltantes.add(item.modelo_id)
  }
  return [...faltantes].sort()
}

export function totalizarInventario(linhas: LinhaInventarioEscola[]) {
  const t = vazio()
  for (const m of linhas) {
    t.modelos++
    if (m.plataforma) { t.plataformas += m.recebido ?? 0; continue }
    if (m.recebido === null) t.semRecebimento++; else t.recebido += m.recebido
    if (!m.declarado) t.semDeclaracao++
    for (const c of SITUACOES_INVENTARIO) t[c] += m[c] ?? 0
    t.conferir += m.conferir ?? 0
    if (m.recebido !== null && SITUACOES_INVENTARIO.reduce((s,c) => s + (m[c] ?? 0), 0) > m.recebido) t.divergencias++
  }
  return t
}
export function montarFichas(escolas: EscolaPainel[], todasEscolas: Escola[], fonte: FonteInventario): FichaRelatorioEscola[] {
  if (!fonte || !Array.isArray(fonte.equipamentos) || !Array.isArray(fonte.inventarios)) throw new Error("A consulta de inventário retornou um formato incompleto.")
  const nomes = new Map<string, Set<string>>()
  todasEscolas.forEach(e => { const k=chaveEscola(e.nome_escola); if(k){const ids=nomes.get(k)||new Set<string>();ids.add(e.id);nomes.set(k,ids)} })
  const recebidos = new Map<string, RecebidoFonte[]>(), respostas = new Map<string, RespostaFonte[]>(), idsRecebidos = new Map<string, RecebidoFonte>()
  for(const r of fonte.equipamentos){ if(!r.id||idsRecebidos.has(r.id))throw new Error("A base de recebimentos contém registros duplicados. Confira o inventário.");idsRecebidos.set(r.id,r);const k=chaveEscola(r.escola_nome);const lista=recebidos.get(k)||[];lista.push(r);recebidos.set(k,lista) }
  for(const r of fonte.inventarios){ const k=chaveEscola(r.escola_nome);const lista=respostas.get(k)||[];lista.push(r);respostas.set(k,lista) }
  return escolas.map(escola => {
    const chave=chaveEscola(escola.nome_escola), recepcao=recebidos.get(chave)||[], envios=respostas.get(chave)||[]
    if ((nomes.get(chave)?.size||0)>1 && (recepcao.length||envios.length)) throw new Error(`O nome “${texto(escola.nome_escola)}” identifica mais de uma escola. Confira o vínculo do inventário antes da emissão.`)
    const {ultima:ultimaResposta,ignorados}=ultimaRespostaValida(envios)
    const linhas=new Map<string,LinhaInventarioEscola>(), vinculos=new Map<string,LinhaInventarioEscola>(), alertas:string[]=[]
    for(const r of recepcao){
      const m=modeloRecebido(r), nome=nomeModelo(m), finalidade=texto(m.finalidade,""), plataforma=normalizar(finalidade).includes("carregamento")
      const id=`${plataforma?"recarga":"equipamento"}:${chaveEscola(nome)}`
      const descricao={nome,tipo:texto(m.tipo,""),finalidade,uso:texto(m.uso,""),ano:texto(m.ano_recebimento,"")}
      let l=linhas.get(id)
      if(!l){l={id,...descricao,recebido:0,plataforma,declarado:false,conferir:null,funcionando:null,aguardando_garantia:null,danificados_mau_uso:null,nao_localizado:null};linhas.set(id,l)}
      else mesclarMetadados(l,descricao)
      l.recebido=(l.recebido??0)+quantidadeFonte(r.quantidade_recebida)!
      // Neste banco, inventario_itens.modelo_id referencia equipamentos_recebidos.id.
      // O modelo do catálogo só é alcançado por meio desse recebimento da escola.
      vinculos.set(r.id,l)
    }
    const declarados=new Set<string>()
    const completosPorModelo=new Map<string,boolean>()
    for(const item of ultimaResposta?.inventario_itens||[]){
      if(!item.modelo_id)throw new Error(`Há item sem modelo no último inventário de ${texto(escola.nome_escola)}.`)
      if(declarados.has(item.modelo_id))throw new Error(`Há recebimento repetido no último inventário de ${texto(escola.nome_escola)}. Confira as quantidades.`)
      declarados.add(item.modelo_id)
      const l=vinculos.get(item.modelo_id)
      if(!l){
        if(idsRecebidos.has(item.modelo_id))throw new Error(`O inventário de ${texto(escola.nome_escola)} referencia um recebimento de outra escola. Confira o vínculo antes de emitir.`)
        throw new Error(`Há item do último inventário de ${texto(escola.nome_escola)} sem recebimento localizado. Confira o vínculo em equipamentos_recebidos antes de emitir; nenhum modelo foi inventado.`)
      }
      let completo=true
      for(const c of SITUACOES_INVENTARIO){const n=quantidadeFonte(item[c],true);if(n===null)completo=false;else l[c]=(l[c]??0)+n}
      completosPorModelo.set(l.id,(completosPorModelo.get(l.id)??true)&&completo)
    }
    for(const l of linhas.values())l.declarado=completosPorModelo.get(l.id)??false
    for(const l of linhas.values())if(l.recebido!==null)l.conferir=Math.max(0,l.recebido-SITUACOES_INVENTARIO.reduce((s,c)=>s+(l[c]??0),0))
    const inventario=[...linhas.values()].sort((a,b)=>Number(a.plataforma)-Number(b.plataforma)||a.tipo.localeCompare(b.tipo,"pt-BR")||a.nome.localeCompare(b.nome,"pt-BR")||a.id.localeCompare(b.id)), totais=totalizarInventario(inventario)
    if(!ultimaResposta)alertas.push("Sem levantamento válido de inventário. Quantidades de situação não foram presumidas.")
    if(ignorados)alertas.push(`${ignorados} envio(s) sem itens ignorado(s).`)
    if(totais.semDeclaracao)alertas.push(`${totais.semDeclaracao} modelo(s) com situação ausente ou incompleta.`)
    if(totais.semRecebimento)alertas.push(`${totais.semRecebimento} modelo(s) declarado(s) sem recebimento vinculado.`)
    if(totais.divergencias)alertas.push(`${totais.divergencias} modelo(s) com soma de situações superior ao recebido.`)
    if(totais.conferir)alertas.push(`${totais.conferir.toLocaleString("pt-BR")} equipamento(s) a classificar.`)
    const completos=!!ultimaResposta&&inventario.some(m=>!m.plataforma)&&!totais.semDeclaracao&&!totais.semRecebimento&&!totais.divergencias
    const indiceInventario=indicadoresEscola({...escola,total_equipamentos_funcionando:completos?totais.funcionando:null,total_equipamentos_recebidos:totais.recebido})
    return {escola,inventario,ultimaResposta,totais,alertas,indiceInventario}
  })
}
export function consolidarFichas(fichas: FichaRelatorioEscola[]) {
  const totais=vazio(), mapa=new Map<string,LinhaInventarioEscola>()
  for(const ficha of fichas){for(const k of Object.keys(totais) as (keyof TotaisEscola)[])totais[k]+=ficha.totais[k]
    for(const m of ficha.inventario){const a=mapa.get(m.id);if(!a){mapa.set(m.id,{...m});continue}mesclarMetadados(a,m);a.recebido=a.recebido===null&&m.recebido===null?null:(a.recebido??0)+(m.recebido??0);for(const c of SITUACOES_INVENTARIO)a[c]=a[c]===null&&m[c]===null?null:(a[c]??0)+(m[c]??0);a.conferir=(a.conferir??0)+(m.conferir??0);a.declarado=a.declarado&&m.declarado}
  }
  return {totais,porModelo:[...mapa.values()].sort((a,b)=>Number(a.plataforma)-Number(b.plataforma)||a.nome.localeCompare(b.nome,"pt-BR")),semEnvio:fichas.filter(f=>!f.ultimaResposta).length}
}
