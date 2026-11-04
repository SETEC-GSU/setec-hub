export type SituacaoAviso = 'pendente' | 'enviado' | 'ignorado' | 'concluido' | 'historico' | 'atendido'
export type AcaoAviso = 'pendente' | 'enviado' | 'ignorado' | 'concluido'
export type ChamadoAviso = {
 id:string; chamado:string; descricao:string; aberturaPor:string; tecnico:string; tecnicoEmail:string|null
 status:string; situacao:SituacaoAviso; editavel:boolean; versao:string; revisao:string; motivo:string
 atualizadoPor:string|null; atualizadoEm:string|null
}
export type GrupoAviso = {
 id:string; escola:string; data:string; email:string|null; escolas_correspondentes:number
 total:number; pendentes:number; enviados:number; ignorados:number; concluidos:number; editavel:boolean; chamados:ChamadoAviso[]
}
export type BaseAvisos = {
 versao:1; usuarioId:string; hoje:string; inicioControle:string; inicio:string; fim:string
 pagina:number; tamanho:25; total:number; resumo:{grupos:number;pendentes:number;resolvidos:number;chamados:number}; grupos:GrupoAviso[]
}
export type FiltrosAvisos={inicio:string;fim:string;situacao:'pendentes'|'resolvidos'|'todos';busca:string}
export type CopiaTecnico={nome:string;email:string;selecionado:boolean}
export type RascunhoAviso={para:string;assunto:string;corpo:string;copias:CopiaTecnico[];copiasExtras:string}
export const ROTULOS_AVISOS:Record<SituacaoAviso,string>={pendente:'Aviso pendente',enviado:'Envio confirmado',ignorado:'Aviso ignorado',concluido:'Controle concluído',historico:'Concluído — histórico',atendido:'Atendimento já concluído'}
