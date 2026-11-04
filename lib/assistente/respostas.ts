import { NOME_ASSISTENTE } from './config'
import { CATALOGO, GUIAS, SUGESTOES_INICIAIS } from './catalogo'
import { normalizar } from './interpretar'
import type { BaseConsulta, Coluna, Consulta, DadosConsulta, Resposta } from './types'

const col=(chave:string,titulo:string,opcoes:Partial<Coluna>={}):Coluna=>({chave,titulo,...opcoes})
const ESCOLA=col('escola','Escola / unidade'),TECNICO=col('tecnico','Responsável'),DATA=col('data','Data',{data:true})
const COLUNAS:Record<Consulta['modulo'],Coluna[]>={
  chamados:[col('codigo','Chamado',{link:true}),col('titulo','Solicitação'),ESCOLA,TECNICO,col('categoria','Categoria'),col('status','Status'),DATA],
  fields:[col('chamado','Chamado'),ESCOLA,TECNICO,col('categoria','Categoria'),col('status','Status'),DATA],
  relatorios:[col('chamado','Chamado'),ESCOLA,TECNICO,col('situacao','Relatório'),col('status','Atendimento'),DATA],
  inventario:[ESCOLA,TECNICO,col('funcionando','Funcionando',{numero:true}),col('danificados','Danificados',{numero:true}),col('garantia','Garantia',{numero:true}),col('nao_localizados','Não localizados',{numero:true}),col('status','Inventário'),DATA],
  calendario:[col('titulo','Atividade'),col('tipo','Tipo'),col('setor','Setor'),TECNICO,col('inicio','Início',{data:true}),col('fim','Fim',{data:true}),col('status','Status'),col('equipamentos','Reservas')],
  saresp:[ESCOLA,col('edicao','Edição'),col('serie','Série'),col('maior_turno','Maior turno',{numero:true}),col('cadastrados','Cadastrados',{numero:true}),col('previsto','Cobertura prevista',{numero:true}),col('falta','Ainda faltam',{numero:true}),DATA],
  demandas:[ESCOLA,TECNICO,col('categoria','Categoria principal'),col('urgencia','Urgência'),col('status','Status'),DATA],
  conhecimento:[col('titulo','Tutorial'),col('categoria','Categoria'),col('visualizacoes','Visualizações',{numero:true}),DATA],
}
type ItemIndicador = [chave:string,nome:string,tom?:'cyan'|'amber'|'rose'|'green']
const INDICADORES:Record<Consulta['modulo'],ItemIndicador[]>={
  chamados:[['total','Abertos no período','cyan'],['pendentes','Em aberto','amber'],['concluidos','Concluídos','green'],['cancelados','Cancelados','rose']],
  fields:[['total','Atendimentos no período','cyan'],['concluidos','Realizados','green'],['pendentes','Em aberto','amber'],['cancelados','Cancelados','rose']],
  relatorios:[['realizados','Chamados realizados','cyan'],['pendentes','Relatórios pendentes','rose'],['entregues','Chamados com entrega','green'],['dispensados','Chamados dispensados','cyan'],['automaticos','Dispensas automáticas','cyan'],['em_atendimento','Ainda em atendimento','amber']],
  inventario:[['funcionando','Funcionando','green'],['danificados','Danificados','rose'],['garantia','Aguardando garantia','amber'],['nao_localizados','Não localizados','rose'],['escolas','Escolas no recorte','cyan'],['sem_inventario','Sem inventário com itens','amber']],
  calendario:[['total','Atividades no período','cyan'],['pendentes','A realizar / em curso','amber'],['concluidos','Concluídas','green'],['reservados','Alocações de equipamentos','cyan']],
  saresp:[['total','Aplicações no recorte','cyan'],['pendentes','Aplicações com falta','rose'],['falta','Quantidade ainda necessária','rose'],['cobertos','Aplicações cobertas','green']],
  demandas:[['total','Demandas cadastradas','cyan'],['pendentes','Em aberto','amber'],['criticas','Pendências críticas','rose'],['vencidas','Previsões vencidas','amber']],
  conhecimento:[['total','Tutoriais encontrados','cyan']],
}
const br=(s:string)=>s.slice(0,10).split('-').reverse().join('/')
const inteiro=(n:number)=>n.toLocaleString('pt-BR')
function linkMaterial(v:unknown){try{const u=new URL(String(v||''));return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
export const rotuloSituacao:Record<Consulta['situacao'],string>={todos:'Todas as situações',pendentes:'Pendentes / em aberto',concluidos:'Concluídos / regularizados',cancelados:'Cancelados',danificados:'Com danificados',garantia:'Com equipamentos em garantia',nao_localizados:'Com não localizados',funcionando:'Com equipamentos funcionando'}
export function descreverPeriodo(c:Consulta){return c.modulo==='inventario'?'Último inventário de cada escola':c.modulo==='conhecimento'?'Base de Conhecimento atual':br(c.inicio)+(c.fim!==c.inicio?' a '+br(c.fim):'')}
export function respostaDados(base:BaseConsulta,c:Consulta,pagina:number):Resposta {
 const d:DadosConsulta=base.dados,n=d.resumo,m=CATALOGO[c.modulo]
 let texto=`Encontrei ${inteiro(d.total)} registro(s) na seleção: ${descreverPeriodo(c)}.`
 if(c.modulo==='relatorios')texto=`Há ${inteiro(n.pendentes||0)} chamado(s) realizado(s) com relatório pendente no período. ${inteiro(n.entregues||0)} têm entrega e ${inteiro(n.dispensados||0)} estão dispensados. A lista segue a situação solicitada.`
 if(c.modulo==='inventario')texto=`O inventário atual do recorte informa ${inteiro(n.danificados||0)} equipamento(s) danificado(s), ${inteiro(n.garantia||0)} aguardando garantia e ${inteiro(n.nao_localizados||0)} não localizado(s). A lista está ordenada pelo indicador solicitado.`
 if(c.modulo==='saresp')texto=`A cobertura prevista ainda deixa ${inteiro(n.falta||0)} equipamento(s) necessário(s), somados por aplicação. ${inteiro(n.pendentes||0)} de ${inteiro(n.total||0)} aplicações do recorte precisam de complementação.`
 const notas=[...(d.notas||[]),'Indicadores abrangem o período e os filtros de escola, responsável e categoria. A lista e a distribuição também respeitam a situação solicitada.']
 if(c.modulo==='inventario')notas[notas.length-1]='Indicadores abrangem todas as escolas selecionadas. A lista destaca as escolas com o indicador solicitado; o período não se aplica ao inventário.'
 if(c.modulo==='conhecimento')notas[notas.length-1]='A busca utiliza o conteúdo cadastrado no Hub, sem pesquisa na internet.'
 const linhas=d.linhas.map(l=>{const material=c.modulo==='conhecimento'?linkMaterial(l.arquivo_url):null;return {...l,externo:Boolean(material),href:material|| (c.modulo==='chamados'?'/gestao-chamados/'+encodeURIComponent(String(l.id)):c.modulo==='inventario'?'/inventario/visao-geral?escola='+encodeURIComponent(String(l.escola)):m.href)}})
 return {id:crypto.randomUUID(),tipo:'dados',titulo:m.nome,texto,atualizadoEm:base.gerado_em,consulta:c,pagina,total:d.total,tamanho:25,
  indicadores:INDICADORES[c.modulo].map(([k,nome,tom])=>({nome,valor:Number(n[k]||0),tom:tom||'cyan'})),
  colunas:COLUNAS[c.modulo],linhas,grupos:d.grupos||[],notas,fontes:[{titulo:m.nome,href:m.href}],
  sugestoes:c.modulo==='inventario'?['Quais escolas têm mais equipamentos em garantia?','Mostre os equipamentos não localizados']:c.modulo==='relatorios'?['Mostre o ranking de relatórios pendentes','Como funciona a dispensa de relatório?']:[m.pergunta,'Como usar '+m.nome+'?']}
}
export function respostaOrientacao(texto:string,sugestoes:string[]):Resposta {return {id:crypto.randomUUID(),tipo:'orientacao',titulo:'Vamos ajustar a consulta',texto,atualizadoEm:new Date().toISOString(),pagina:1,total:0,tamanho:25,indicadores:[],colunas:[],linhas:[],grupos:[],notas:[],fontes:[],sugestoes}}
export function respostaAjuda(assunto:string):Resposta {
 const t=normalizar(assunto)
 const guias=t?GUIAS.map(g=>({...g,pontos:g.termos.filter(s=>t.includes(s)).length})).filter(g=>g.pontos>0).sort((a,b)=>b.pontos-a.pontos).slice(0,1):[]
 const g=guias[0]
 return {id:crypto.randomUUID(),tipo:'ajuda',titulo:g?.titulo||NOME_ASSISTENTE+' · seu ponto de consulta no Hub',texto:g?.texto||'Posso consultar os módulos do SETEC Hub, aplicar filtros e mostrar os registros que sustentam a resposta. Escreva o assunto e, se quiser, a escola, o responsável e o período. Exemplos: relatórios pendentes em outubro; equipamentos danificados; compromissos de hoje. Perguntas fora dos assuntos disponíveis recebem uma orientação para ajustar a consulta.',atualizadoEm:new Date().toISOString(),pagina:1,total:0,tamanho:25,indicadores:[],colunas:[],linhas:[],grupos:[],notas:['Orientação baseada nos fluxos atuais do Hub. Consulte os registros do módulo para conferir a situação operacional.'],fontes:g?[{titulo:g.titulo,href:g.href}]:[],sugestoes:g?[CATALOGO[g.chave].pergunta,'Buscar tutorial de '+g.chave]:SUGESTOES_INICIAIS}
}
export function textoResposta(r:Resposta){return [r.titulo,r.texto,r.consulta?'Recorte: '+descreverPeriodo(r.consulta):'',...r.indicadores.map(k=>`${k.nome}: ${inteiro(k.valor)}`),r.linhas.length?`Registros desta página (${r.pagina}):`:'',...r.linhas.map(l=>r.colunas.map(c=>c.titulo+': '+String(l[c.chave]??'—')).join(' | ')),r.total>r.linhas.length?`Total da seleção: ${r.total}. Texto inclui somente a página exibida.`:'',...r.notas,...r.fontes.map(f=>'Fonte: '+f.titulo+' ('+f.href+')'),'Consulta: '+r.atualizadoEm].filter(Boolean).join('\n\n')}
