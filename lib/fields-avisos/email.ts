import type { GrupoAviso, RascunhoAviso } from './types'

export function dataBR(data:string){return /^\d{4}-\d{2}-\d{2}$/.test(data)?data.split('-').reverse().join('/'):data}
export function separarEmails(texto:string):string[]{return [...new Set(texto.split(/[;,\s]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))]}
export function emailValido(email:string){return email.length<=254&&/^[^\s@<>(),;:]+@[^\s@<>(),;:]+\.[^\s@<>(),;:]+$/.test(email)}
export function criarRascunho(g:GrupoAviso):RascunhoAviso{
 const nomes=[...new Set(g.chamados.map(c=>c.tecnico))].sort((a,b)=>a.localeCompare(b,'pt-BR'))
 const copias=nomes.map(nome=>{const emails=[...new Set(g.chamados.filter(c=>c.tecnico===nome).map(c=>c.tecnicoEmail).filter((e):e is string=>Boolean(e)))];return {nome,email:emails.length===1?emails[0]:'',selecionado:false}})
 return {para:g.email||'',copias,copiasExtras:'',assunto:`Visita técnica FIELD — ${dataBR(g.data)} — ${g.escola}`,
 corpo:[
 'Prezada equipe gestora,',
 `Informamos a programação de visita técnica FIELD à unidade ${g.escola}, com data prevista para ${dataBR(g.data)}.`,
 'A visita integra o Projeto de Suporte Técnico de TI para manutenção dos recursos tecnológicos da unidade, conforme diretrizes da SEDUC e FDE.',
 `${nomes.length===1?'Técnico responsável':'Técnicos responsáveis'}: ${nomes.join('; ')}.`,
 g.chamados.length===1?'A programação contempla o seguinte chamado da unidade:':'A programação reúne os seguintes chamados da unidade:',
 ...g.chamados.map((c,i)=>`${i+1}. Chamado: ${c.chamado}\nTécnico responsável: ${c.tecnico}\nAbertura por: ${c.aberturaPor}\nDescrição do atendimento solicitado:\n${c.descricao.trim()||'Descrição não cadastrada; conferir o chamado com a SETEC.'}`),
 nomes.length===1?'O técnico se apresentará identificado e uniformizado à equipe gestora, atuará exclusivamente nas atividades dos chamados relacionados e registrará as tratativas no sistema oficial de atendimento.':'Os técnicos se apresentarão identificados e uniformizados à equipe gestora, atuarão exclusivamente nas atividades dos chamados relacionados e registrarão as tratativas no sistema oficial de atendimento.',
 'Solicitamos que um responsável da unidade acompanhe o atendimento e apoie o acesso aos ambientes e equipamentos necessários.',
 'Eventuais alterações na programação serão comunicadas à unidade por e-mail. Em caso de impedimento para a data prevista, entre em contato com a SETEC para alinhamento.'
 ].join('\n\n')}
}
export function textoAssunto(r:RascunhoAviso){const assunto=r.assunto.trim();if(!assunto||/[\r\n]/.test(assunto)||assunto.length>300)throw new Error('Informe um assunto de até 300 caracteres, sem quebras de linha.');return assunto}
export function textoCorpo(r:RascunhoAviso){if(!r.corpo.trim())throw new Error('O corpo do e-mail está vazio.');return r.corpo}
export function copiasSelecionadas(r:RascunhoAviso){const para=separarEmails(r.para);return separarEmails([...r.copias.filter(t=>t.selecionado).map(t=>t.email),r.copiasExtras].join(';')).filter(e=>!para.includes(e)).join('; ')}
export function destinatarios(r:RascunhoAviso){
 const para=separarEmails(r.para),cc=separarEmails([...r.copias.filter(t=>t.selecionado).map(t=>t.email),r.copiasExtras].join(';')).filter(e=>!para.includes(e))
 if(!para.length||!para.every(emailValido))throw new Error('Informe um e-mail válido da escola. Você pode separar endereços por ponto e vírgula.')
 if(r.copias.some(t=>t.selecionado&&(!separarEmails(t.email).length||!separarEmails(t.email).every(emailValido)))||!cc.every(emailValido))throw new Error('Confira os e-mails dos técnicos selecionados em cópia.')
 if(!r.assunto.trim()||/[\r\n]/.test(r.assunto)||r.assunto.length>300)throw new Error('Informe um assunto de até 300 caracteres, sem quebras de linha.')
 if(!r.corpo.trim())throw new Error('O corpo do e-mail está vazio.')
 return {para,cc}
}
export function linkEmail(r:RascunhoAviso){const {para,cc}=destinatarios(r);return `mailto:${para.join(',')}?${new URLSearchParams({subject:r.assunto,body:r.corpo,...(cc.length?{cc:cc.join(',')}:{})}).toString().replace(/\+/g,'%20')}`}
export function textoEmail(r:RascunhoAviso){const {para,cc}=destinatarios(r);return [`Para: ${para.join('; ')}`,cc.length?`Cc: ${cc.join('; ')}`:'',`Assunto: ${r.assunto}`,'',r.corpo].filter((x,i)=>x||i===3).join('\n')}
function base64(s:string){return btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''))}
function assuntoMIME(s:string){let parte='',palavras:string[]=[];for(const c of s){if(new TextEncoder().encode(parte+c).length>42){palavras.push('=?UTF-8?B?'+base64(parte)+'?=');parte=''}parte+=c}if(parte)palavras.push('=?UTF-8?B?'+base64(parte)+'?=');return palavras.join('\r\n ')}
export function arquivoEmail(r:RascunhoAviso){const {para,cc}=destinatarios(r);return ['X-Unsent: 1',`To: ${para.join(', ')}`,...(cc.length?[`Cc: ${cc.join(', ')}`]:[]),`Subject: ${assuntoMIME(r.assunto)}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',(base64(r.corpo.replace(/\r?\n/g,'\r\n')).match(/.{1,76}/g)||[]).join('\r\n'),''].join('\r\n')}
export function nomeArquivo(g:GrupoAviso){return `Aviso_FIELD_${g.data}_${g.escola.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80)}.eml`}
