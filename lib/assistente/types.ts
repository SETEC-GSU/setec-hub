export const MODULOS = ['chamados','fields','relatorios','inventario','calendario','saresp','demandas','conhecimento'] as const
export type Modulo = typeof MODULOS[number]
export type Periodo = { inicio: string; fim: string }
export type Filtros = {
  modulo: Modulo | 'auto'; periodo: 'auto' | 'hoje' | 'mes' | 'mes_anterior' | 'ano' | 'ultimos30' | 'proximos7' | 'personalizado'
  inicio: string; fim: string; escola: string; tecnico: string; categoria: string; edicao: string
}
export type Opcoes = {
  versao: 1; usuario_id: string; nome: string; hoje: string
  escolas: {id:string; nome:string; cie:string|null}[]
  tecnicos: {nome:string}[]; categorias: string[]; categorias_modulos?:Partial<Record<Modulo,string[]>>; edicoes: {id:string; titulo:string; inicio:string|null; fim:string|null}[]
}
export type Consulta = Periodo & {
  modulo: Modulo; escola: string; tecnico: string; categoria: string; edicao: string
  situacao: 'todos' | 'pendentes' | 'concluidos' | 'cancelados' | 'danificados' | 'garantia' | 'nao_localizados' | 'funcionando'
  foco: 'resumo' | 'ranking' | 'lista'; agrupamento:'categoria'|'escola'|'tecnico'; busca: string
}
export type Contexto = Consulta
export type Interpretacao = {consulta:Consulta} | {ajuda:true; assunto:string} | {esclarecer:string; sugestoes:string[]}
export type Linha = Record<string,string|number|boolean|null>
export type DadosConsulta = {
  resumo: Record<string,number>; linhas:Linha[]; total:number
  grupos?:{nome:string;total:number}[]; notas?:string[]
}
export type BaseConsulta = {
  versao:1; usuario_id:string; gerado_em:string; modulo:Modulo; dados:DadosConsulta
}
export type Coluna = { chave:string; titulo:string; numero?:boolean; data?:boolean; link?:boolean }
export type Resposta = {
  id:string; tipo:'dados'|'ajuda'|'orientacao'; titulo:string; texto:string; atualizadoEm:string
  consulta?:Consulta; pagina:number; total:number; tamanho:number
  indicadores:{nome:string;valor:number;sufixo?:string;tom?:'cyan'|'amber'|'rose'|'green'}[]
  colunas:Coluna[]; linhas:Linha[]; grupos:{nome:string;total:number}[]; notas:string[]
  fontes:{titulo:string;href:string}[]; sugestoes:string[]
}
export const FILTROS_INICIAIS: Filtros = {modulo:'auto',periodo:'auto',inicio:'',fim:'',escola:'',tecnico:'',categoria:'',edicao:''}
