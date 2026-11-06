import { CAMPOS_ESCOLA, FILTROS_INICIAIS, MODULOS, type CampoEscola, type Consulta, type Contexto, type Filtros, type Interpretacao, type Modulo, type Opcoes, type Periodo } from './types'
import { CATALOGO } from './catalogo'

export const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9/ -]/g,' ').replace(/\s+/g,' ').trim()
const palavrasDePedido=new Set('a as o os um uma uns umas de do da dos das e em no na nos nas para pra por sobre com que q eu vc vcs voce voces me mim meu minha meus minhas qual quais estao esta temos existem ha quero queria gostaria preciso precisava pode podem poderia posso consegue conseguir tem teria algum alguma alguns algumas saber como onde usar utilizar listar lista acessar favor pf pfv porfavor bom dia boa tarde noite buscar busque busca pesquisar pesquise pesquisa procurar procure encontrar encontre achar ache mostre mostra mostrar ver veja envie enviar mande manda trazer traga traz dar da de disponibilize tutorial tutoriais guia guias artigo artigos material materiais base conhecimento todo todos toda todas completo completa disponivel disponiveis cadastrado cadastrados'.split(' '))
export function extrairBuscaConhecimento(pergunta:string){return [...new Set(normalizar(pergunta).split(' ').filter(p=>p&&!palavrasDePedido.has(p)))].join(' ').slice(0,120)}
export function diaValido(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
const add=(s:string,n:number)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function mes(ano:number,m:number):Periodo {return {inicio:new Date(Date.UTC(ano,m,1,12)).toISOString().slice(0,10),fim:new Date(Date.UTC(ano,m+1,0,12)).toISOString().slice(0,10)}}
export function validarPeriodo(p:Periodo){return diaValido(p.inicio)&&diaValido(p.fim)&&p.inicio<=p.fim&&Number(p.inicio.slice(0,4))>=2000&&Number(p.fim.slice(0,4))<=2100&&(Date.parse(p.fim)-Date.parse(p.inicio))/86400000<=365}
export function filtrosValidos(v:unknown):Filtros|null {
  if(!v||typeof v!=='object'||Array.isArray(v))return null
  const f={...FILTROS_INICIAIS,...v} as Filtros
  if(![...MODULOS,'auto'].includes(f.modulo)||!['auto','hoje','mes','mes_anterior','ano','ultimos30','proximos7','personalizado'].includes(f.periodo))return null
  for(const k of ['inicio','fim','escola','tecnico','categoria','edicao'] as const)if(typeof f[k]!=='string'||f[k].length>160)return null
  if(f.periodo==='personalizado'&&f.modulo!=='escolas'&&!validarPeriodo(f))return null
  if([f.escola,f.edicao].some(s=>s&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)))return null
  return f
}
export function contextoValido(v:unknown):Contexto|null {
  if(!v||typeof v!=='object'||Array.isArray(v))return null
  const c=v as Contexto
  if(!MODULOS.includes(c.modulo)||!validarPeriodo(c)||!['todos','pendentes','concluidos','cancelados','danificados','garantia','nao_localizados','funcionando'].includes(c.situacao)||!['resumo','ranking','lista'].includes(c.foco)||!['categoria','escola','tecnico'].includes(c.agrupamento))return null
  for(const k of ['escola','tecnico','categoria','edicao','busca'] as const)if(typeof c[k]!=='string'||c[k].length>160)return null
  if(c.campoEscola!==undefined&&!CAMPOS_ESCOLA.includes(c.campoEscola))return null
  return c
}
function periodoManual(f:Filtros,hoje:string):Periodo|null {
  const a=Number(hoje.slice(0,4)),m=Number(hoje.slice(5,7))-1
  switch(f.periodo){case 'hoje':return {inicio:hoje,fim:hoje};case 'mes':return mes(a,m);case 'mes_anterior':return mes(a,m-1);case 'ano':return {inicio:a+'-01-01',fim:a+'-12-31'};case 'ultimos30':return {inicio:add(hoje,-29),fim:hoje};case 'proximos7':return {inicio:hoje,fim:add(hoje,6)};case 'personalizado':return {inicio:f.inicio,fim:f.fim};default:return null}
}
function periodoNaPergunta(t:string,hoje:string):Periodo|null {
  const ano=Number(hoje.slice(0,4)),m=Number(hoje.slice(5,7))-1
  const datas=[...t.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)].map(x=>`${x[3]}-${x[2]}-${x[1]}`)
  if(datas.length)return {inicio:datas[0],fim:datas[1]||datas[0]}
  const iso=[...t.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(x=>x[0]);if(iso.length)return {inicio:iso[0],fim:iso[1]||iso[0]}
  if(/\bamanha\b/.test(t))return {inicio:add(hoje,1),fim:add(hoje,1)}
  if(/\bontem\b/.test(t))return {inicio:add(hoje,-1),fim:add(hoje,-1)}
  if(/\bhoje\b/.test(t))return {inicio:hoje,fim:hoje}
  if(/\b(proximos|proximas) (7|sete) dias\b/.test(t))return {inicio:hoje,fim:add(hoje,6)}
  const ult=t.match(/\bultimos? (\d{1,3}) dias\b/);if(ult){const n=Number(ult[1]);return {inicio:add(hoje,-Math.max(0,n-1)),fim:n>0?hoje:''}}
  if(/\b(esta|nesta|essa|desta) semana\b|\bsemana atual\b/.test(t)){const d=new Date(hoje+'T12:00:00Z').getUTCDay();const i=add(hoje,-((d+6)%7));return {inicio:i,fim:add(i,6)}}
  if(/\bmes (passado|anterior)\b/.test(t))return mes(ano,m-1)
  if(/\b(este|neste|esse|deste) mes\b|\bmes atual\b/.test(t))return mes(ano,m)
  const meses=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const achado=meses.findIndex(nome=>new RegExp('\\b'+nome+'\\b').test(t))
  const a=t.match(/\b(20\d{2})\b/)
  if(achado>=0)return mes(a?Number(a[1]):ano,achado)
  if(/\bano (passado|anterior)\b/.test(t))return {inicio:(ano-1)+'-01-01',fim:(ano-1)+'-12-31'}
  if(a||/\b(ano atual|este ano|neste ano|anual)\b/.test(t)){const y=a?Number(a[1]):ano;return {inicio:y+'-01-01',fim:y+'-12-31'}}
  return null
}
export function campoEscolaNaPergunta(t:string):CampoEscola|null {
  if(/\bescolas (do|da|de) (tecnico|tecnica|field)\b/.test(t))return 'todos'
  if(/\b(dados completos|ficha completa|cadastro completo|todos os dados|dados cadastrais|informacoes cadastrais)\b/.test(t))return 'todos'
  const campos:[CampoEscola,RegExp][]=[
    ['diretor',/\b(diretor|diretora|direcao)\b/],['telefone',/\b(telefone|telefones|fone|contato telefonico)\b/],
    ['email',/\b(e[ -]?mails?|correio eletronico)\b/],['endereco',/\b(endereco|localizacao)\b|^onde (fica|esta|se localiza)\b/],
    ['tipo_ensino',/\b(tipo de ensino|tipos de ensino|ensino|modalidades?|etapas?)\b/],
    ['periodo',/\b(periodos?|turnos?)\b/],['horario',/\b(horarios?|horas?|abre|fecha|abertura|fechamento)\b/],
    ['tecnico',/\b(tecnico|tecnica|field)\b/],['total_alunos',/\b(alunos|estudantes|matriculas)\b/],['qtd_salas',/\bsalas\b/],
  ]
  const encontrados=campos.filter(([,re])=>re.test(t)).map(([campo])=>campo)
  if(/\bcie\b/.test(t)&&!/\bcie\s*\d+\b/.test(t))encontrados.push('cie')
  // Mais de um dado solicitado abre a ficha, sem deixar informações do pedido de fora.
  if(encontrados.length>1)return 'todos'
  if(encontrados.length)return encontrados[0]
  if(/\b(dados|informacoes|cadastro|ficha)\b/.test(t))return 'todos'
  return null
}
function pedidoCadastroEscola(t:string):boolean {
  if(/\b(tutorial|tutoriais|guia|guias|material|materiais)\b/.test(t))return false
  const atributo=/\b(diretor|diretora|direcao|telefones?|fone|endereco|localizacao|e[ -]?mails?|tipo de ensino|tipos de ensino|modalidades?|horarios?)\b/.test(t)||/\bcie\b/.test(t)&&!/\bcie\s*\d+\b/.test(t)
  if(atributo&&(/^(e |qual|quais|quem|onde|me |informe|mostre|consulte|quero|preciso|gostaria|pode|como entrar em contato)\b/.test(t)||/\b(da escola|de uma escola|da ee|dados da|contato da|cadastro da)\b/.test(t)))return true
  if(/^cie\s*\d+\b/.test(t)||/\b(qual|quais) (e |sao )?(a |as )?(escola|unidade)\b.*\bcie\s*\d+\b/.test(t))return true
  if(/\bescolas (do|da|de) (tecnico|tecnica|field)\b/.test(t))return true
  if(/\b(quem|qual) (e )?(o |a )?(tecnico|tecnica|field)\b.*\b(escola|ee|unidade)\b/.test(t))return true
  if(/^onde (fica|esta|se localiza)\b/.test(t)&&/\b(escola|ee|unidade)\b/.test(t))return true
  if(/\b(dados|informacoes|ficha|cadastro) (completos? |cadastrais? )?(da|de|do|das)\b/.test(t)&&/\b(escolas?|ee|unidades?)\b/.test(t))return true
  if(/\b(chamados?|relatorios?|inventarios?|equipamentos?|saresp|remanejamentos?|demandas?|agenda|eventos?|compromissos?|reservas?)\b/.test(t))return false
  return /\b(periodos?|turnos?|ensino|funcionamento|alunos|estudantes|salas)\b/.test(t)&&/\b(escola|ee|unidade)\b/.test(t)&&/^(e |qual|quais|quantos|quantas|como|me |mostre|informe|quero|preciso|pode)\b/.test(t)
}
function detectarModulo(t:string):Modulo|null {
  if(/\b(tutorial|tutoriais|guia|guias|material|materiais|base de conhecimento)\b/.test(t))return 'conhecimento'
  if(pedidoCadastroEscola(t))return 'escolas'
  if(/\bsaresp\b|\bremanejamentos?\b/.test(t))return 'saresp'
  if(/\b(relatorios?|pareceres?|dispensas?|cobranca)\b/.test(t))return 'relatorios'
  if(/\b(calendario|compromissos?|eventos?|agenda|reunioes|reuniao|aniversarios?|reservas?)\b/.test(t))return 'calendario'
  if(/\bdemandas?\b/.test(t))return 'demandas'
  if(/\bchamados?\b/.test(t))return /\bfields?\b/.test(t)?'fields':'chamados'
  if(/\b(inventarios?|danificados?|garantia|localizados?|funcionando|equipamentos?)\b/.test(t))return 'inventario'
  if(/\b(fields?|visitas?|atendimentos?|tecnicos?)\b/.test(t))return 'fields'
  if(/\bescolas?\b/.test(t)&&/\b(liste|listar|mostre|cadastradas?|cadastro|quais|quantas|todas)\b/.test(t))return 'escolas'
  if(/\b(chamados?|hub)\b/.test(t))return 'chamados'
  return null
}
const vazio=new Set(['da','de','do','dos','das','e','ee','escola','estadual','professor','professora','prof','doutor','dr'])
function entidade(t:string,nomes:{id:string;nome:string}[],curto=false) {
  const palavras=new Set(t.split(/\s+/))
  const hits=nomes.map(n=>{const tokens=normalizar(n.nome).split(' ').filter(p=>p.length>2&&!vazio.has(p));const acertos=tokens.filter(p=>palavras.has(p)).length;const exato=(' '+t+' ').includes(' '+normalizar(n.nome)+' ');return {...n,score:exato?100:acertos>=(curto?1:Math.min(2,tokens.length))&&(acertos/tokens.length>=0.6||curto&&palavras.has(tokens[0]))?acertos/tokens.length:0}}).filter(n=>n.score>0).sort((a,b)=>b.score-a.score)
  return hits.length&&(!hits[1]||hits[0].score>hits[1].score)?{id:hits[0].id}:hits.length?{ambiguos:hits.slice(0,4).map(h=>h.nome)}:null
}
function entidadeEscola(t:string,o:Opcoes){
  const e=entidade(t,o.escolas);if(e&&'ambiguos'in e)return e
  const palavras=new Set(t.split(' '))
  if(e&&typeof e.id==='string'){
    const nome=o.escolas.find(n=>n.id===e.id)!.nome,tokens=normalizar(nome).split(' ').filter(p=>p.length>2&&!vazio.has(p))
    if((' '+t+' ').includes(' '+normalizar(nome)+' ')||tokens.filter(p=>palavras.has(p)).length>=2)return e
  }
  const candidatas=o.escolas.filter(n=>normalizar(n.nome).split(' ').some(p=>p.length>=4&&!vazio.has(p)&&palavras.has(p)))
  return candidatas.length===1?{id:candidatas[0].id}:candidatas.length?{ambiguos:candidatas.slice(0,4).map(n=>n.nome)}:e
}
export function interpretar(pergunta:string,f:Filtros,o:Opcoes,anterior:Contexto|null):Interpretacao {
  const t=normalizar(pergunta)
  const pedidoTutorial=/\b(tutorial|tutoriais|guia|guias|material|materiais)\b/.test(t)||f.modulo==='conhecimento'
  const explicito=detectarModulo(t)||(campoEscolaNaPergunta(t)&&entidadeEscola(t,o)?'escolas':null)
  const cadastro=explicito==='escolas'||f.modulo==='escolas'
  if(/\b(senha|senhas|token|service role|chave secreta)\b/.test(t)&&!pedidoTutorial)return {esclarecer:'Credenciais e segredos não são consultados pelo assistente. Utilize o módulo autorizado de credenciais para esse atendimento.',sugestoes:['Como abrir um chamado?','Buscar tutorial de acesso']}
  if((/\b(apague|exclua|delete|atualize|cadastre|altere|dispare)\b/.test(t)||/\benvie\b/.test(t)&&!pedidoTutorial&&!cadastro)&&!/^como\b/.test(t))return {esclarecer:'Posso consultar os dados e orientar o procedimento. Para registrar alterações ou enviar mensagens, abra o módulo responsável.',sugestoes:['Como abrir um chamado?','Como atualizar o inventário?']}
  if(/^(oi|ola|bom dia|boa tarde|boa noite|ajuda|o que voce faz|o que posso perguntar|resumo geral|panorama geral)[ !?.]*$/.test(t))return {ajuda:true,assunto:''}
  if(!cadastro&&/^(como|onde|qual o procedimento|me explique|explique)\b/.test(t)&&!/quantos|quantas|estao|esta o|ranking/.test(t)&&(!pedidoTutorial||/^como (usar|utilizar|funciona) (a )?base de conhecimento/.test(t)))return {ajuda:true,assunto:t}
  const modulo=f.modulo!=='auto'?f.modulo:explicito||anterior?.modulo
  if(!modulo)return {esclarecer:'Posso consultar dados das escolas, chamados, Fields, relatórios, inventário, calendário, SARESP, demandas e tutoriais. Escolha um assunto ou detalhe sua pergunta.',sugestoes:Object.values(CATALOGO).slice(0,4).map(m=>m.pergunta)}
  const mesmo=anterior?.modulo===modulo
  const p=modulo==='escolas'?{inicio:o.hoje,fim:o.hoje}:periodoManual(f,o.hoje)||periodoNaPergunta(t,o.hoje)||(mesmo?{inicio:anterior.inicio,fim:anterior.fim}:null)||(modulo==='calendario'?{inicio:o.hoje,fim:o.hoje}:mes(Number(o.hoje.slice(0,4)),Number(o.hoje.slice(5,7))-1))
  if(!validarPeriodo(p))return {esclarecer:'Confira as datas. Posso consultar um período de até 366 dias, com início e fim válidos. Exemplo: de 01/10/2026 a 31/10/2026.',sugestoes:[CATALOGO[modulo].pergunta]}
  let escola=f.escola,tecnico=f.tecnico,categoria=f.categoria,edicao=f.edicao
  if(modulo!=='conhecimento'){
  const cie=t.match(/\bcie\s*(\d{1,8})\b/)
  if(!escola&&/\bcie\s*\d+/.test(t)&&!cie)return {esclarecer:'Confira o CIE informado ou selecione a escola nos filtros.',sugestoes:[]}
  if(!escola&&cie){const candidatas=o.escolas.filter(e=>String(e.cie||'').replace(/^0+(?=\d)/,'')===cie[1].replace(/^0+(?=\d)/,''));if(candidatas.length>1)return {esclarecer:'Esse CIE aparece em mais de um cadastro. Selecione a unidade correta no filtro de escola.',sugestoes:[]};escola=candidatas[0]?.id||'';if(!escola)return {esclarecer:'Não encontrei esse CIE no cadastro de escolas. Confira o número ou selecione a escola nos filtros.',sugestoes:[]}}
  if(!escola){const e=modulo==='escolas'?entidadeEscola(t,o):entidade(t,o.escolas);if(e&&typeof e.id==='string')escola=e.id;else if(e&&'ambiguos'in e)return {esclarecer:'Há mais de uma escola com esse nome. Selecione a unidade no filtro: '+e.ambiguos.join('; ')+'.',sugestoes:[]}}
  if(!tecnico&&(modulo!=='escolas'||/\bescolas? (do|da|de|pelo|pela) (tecnico|tecnica|field)\b/.test(t))){const e=entidade(t,o.tecnicos.map(x=>({id:x.nome,nome:x.nome})),true);if(e&&typeof e.id==='string')tecnico=e.id;else if(e&&'ambiguos'in e)return {esclarecer:'Encontrei nomes de técnicos semelhantes. Selecione o responsável nos filtros: '+e.ambiguos.join('; ')+'.',sugestoes:[]}}
  if(modulo==='escolas'&&!escola&&anterior?.escola&&(/\b(dela|dessa escola|desta escola|mesma escola)\b/.test(t)||/^e? ?(qual e |qual |quem e |quais sao )?(o |a |os |as )?(cie|diretor|diretora|direcao|telefones?|endereco|localizacao|e[ -]?mail|periodos?|turnos?|tipo de ensino|horarios?|dados completos)[ ?]*$/.test(t)))escola=anterior.escola
  if(!escola&&/\b(na escola|da escola|para a escola|na ee|da ee)\b/.test(t))return {esclarecer:'Selecione a escola no filtro para conferir o vínculo correto dessa consulta.',sugestoes:[]}
  if(modulo==='escolas'&&!escola&&/\b(escola|ee)\s+(?!cadastrad[ao]s?\b|no hub\b|do hub\b|deste hub\b)\S+/.test(t)&&!/\b(uma escola|dessa escola|desta escola|mesma escola)\b/.test(t))return {esclarecer:'Não identifiquei essa escola com segurança. Informe o CIE ou selecione a unidade em Filtros → Escola.',sugestoes:[]}
  }
  const categorias=o.categorias_modulos?.[modulo]||o.categorias
  if(!categoria&&['chamados','fields','relatorios','demandas'].includes(modulo)){
    categoria=categorias.find(c=>normalizar(c).length>3&&t.includes(normalizar(c)))||''
    if(!categoria){const tema=/\b(redes?|internet|conectividade)\b/.test(t)?/redes?|internet|conectividade/:/\bequipamentos?\b/.test(t)?/equipamento/:null;const candidatas=tema?categorias.filter(c=>tema.test(normalizar(c))):[];if(candidatas.length===1)categoria=candidatas[0];else if(candidatas.length>1)return {esclarecer:'Há mais de uma categoria relacionada. Selecione a categoria principal no filtro: '+candidatas.join('; ')+'.',sugestoes:[]}}
  }
  const referencia=t.match(/\bsti-?\d{2}\/[a-z0-9-]+\b/)
  const reaproveitar=mesmo&&!explicito&&/^(e |agora |dess|nest|apenas |so )/.test(t)
  if(reaproveitar){escola=escola||anterior.escola;tecnico=tecnico||anterior.tecnico;categoria=categoria||anterior.categoria;edicao=edicao||anterior.edicao}
  const campoEscola=modulo==='escolas'?campoEscolaNaPergunta(t)||(reaproveitar?anterior.campoEscola:undefined)||'todos':undefined
  if(modulo==='escolas'&&!escola&&campoEscola!=='todos'&&!/\b(escolas|unidades)\b/.test(t))return {esclarecer:'De qual escola você precisa desse dado? Escreva o nome ou o CIE, ou selecione a unidade em Filtros → Escola.',sugestoes:[CATALOGO.escolas.pergunta]}
  if(['calendario','conhecimento'].includes(modulo))escola=''
  if(modulo==='conhecimento')tecnico=''
  if(!['chamados','fields','relatorios','demandas'].includes(modulo))categoria=''
  if(modulo!=='saresp')edicao=''
  let situacao:Consulta['situacao']=reaproveitar?anterior.situacao:'todos'
  if(/\b(todos|todas as situacoes)\b/.test(t))situacao='todos'
  const aberturaNoPeriodo=/\b(foram|foram sendo|ja foram) abertos?\b|\b(data de abertura|total de aberturas|abertura de chamados)\b/.test(t)
  if(/\b(pendentes?|andamento|faltam|faltando|precisam|falta|necessitam)\b/.test(t)||!aberturaNoPeriodo&&/\babertos?\b/.test(t))situacao='pendentes'
  if(/\b(realizados?|concluidos?|finalizados?|atendidos?|entregues?)\b/.test(t))situacao='concluidos'
  if(/\bcancelad[oa]s?\b/.test(t))situacao='cancelados'
  if(modulo==='inventario'){if(/\bdanificad[oa]s?\b/.test(t))situacao='danificados';else if(/\bgarantia\b/.test(t))situacao='garantia';else if(/\bnao localizad[oa]s?\b/.test(t))situacao='nao_localizados';else if(/\bfuncionando\b/.test(t))situacao='funcionando'}
  if(['conhecimento','escolas'].includes(modulo))situacao='todos'
  const situacoes:Record<Modulo,string[]>={escolas:['todos'],chamados:['todos','pendentes','concluidos','cancelados'],fields:['todos','pendentes','concluidos','cancelados'],relatorios:['todos','pendentes','concluidos'],inventario:['todos','danificados','garantia','nao_localizados','funcionando'],calendario:['todos','pendentes','concluidos','cancelados'],saresp:['todos','pendentes'],demandas:['todos','pendentes','concluidos','cancelados'],conhecimento:['todos']}
  if(!situacoes[modulo].includes(situacao))return {esclarecer:'Essa situação não é usada nesta consulta. Escolha uma das sugestões para '+CATALOGO[modulo].nome+' ou abra o módulo para conferir os detalhes.',sugestoes:[CATALOGO[modulo].pergunta,'Como usar '+CATALOGO[modulo].nome+'?']}
  const busca=modulo==='conhecimento'?extrairBuscaConhecimento(pergunta):referencia?.[0].toUpperCase().replace(/^STI(\d)/,'STI-$1')||''
  const agrupamento:Consulta['agrupamento']=reaproveitar&&!/categoria|escola|tecnico|ranking/.test(t)?anterior.agrupamento:/\bcategorias?\b/.test(t)?'categoria':/\bescolas?\b/.test(t)&&/mais|maior|ranking/.test(t)?'escola':/\btecnicos?\b/.test(t)||modulo==='fields'?'tecnico':'categoria'
  return {consulta:{...p,modulo,escola,tecnico,categoria,edicao,situacao,agrupamento,foco:/ranking|mais |maior|categorias/.test(t)?'ranking':/quais|liste|mostre|listar/.test(t)?'lista':'resumo',busca,...(campoEscola?{campoEscola}:{})}}
}
