"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { CATALOGO, SUGESTOES_INICIAIS } from '@/lib/assistente/catalogo'
import { NOME_ASSISTENTE, NOME_COMPLETO_ASSISTENTE } from '@/lib/assistente/config'
import { filtrosValidos, interpretar } from '@/lib/assistente/interpretar'
import { descreverPeriodo, respostaAjuda, respostaOrientacao, rotuloSituacao, textoResposta } from '@/lib/assistente/respostas'
import { FILTROS_INICIAIS, MODULOS, type Consulta, type Filtros, type Opcoes, type Resposta } from '@/lib/assistente/types'
import s from './AssistenteHub.module.css'

type Mensagem={id:string;pergunta:string;resposta:Resposta}
function Icone({tipo='spark',size=20}:{tipo?:string;size?:number}){
 const paths:Record<string,ReactNode>={school:<><path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M9 21v-7h6v7M7 10h.01M17 10h.01M12 7h.01"/></>,spark:<><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z"/><path d="m20 2 .8 1.2L22 4l-1.2.8L20 6l-.8-1.2L18 4l1.2-.8Z"/></>,send:<><path d="m3 3 19 9-19 9 4-9-4-9Z"/><path d="M7 12h15"/></>,filter:<><path d="M4 5h16M7 12h10M10 19h4"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="12" r="2"/></>,arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,copy:<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 4H5v12"/></>,refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 11-2l3 7M4 12l3 7a7 7 0 0 0 11-2"/></>,book:<><path d="M12 5v16M12 5C9 2 5 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-2-1-6-2-9 1Z"/></>,device:<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-12 4h3m3 0h3"/></>,ticket:<><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Z"/><path d="M15 5v14"/></>,field:<><circle cx="9" cy="6" r="3"/><path d="M3 20v-4a6 6 0 0 1 12 0v4m2-17 4 4-4 4m0 3h4v6h-4"/></>,report:<><path d="M5 3h10l4 4v14H5V3Z"/><path d="M9 17v-4m4 4V9m4 8v-6"/></>,transfer:<><path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/></>,list:<><path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/></>,close:<path d="m6 6 12 12M6 18 18 6"/>,check:<path d="m5 12 4 4L19 6"/>}
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[tipo]||paths.spark}</svg>
}
function data(v:unknown){const t=String(v||'');if(!t)return '—';if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t.split('-').reverse().join('/');const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(d):t}
function valor(v:unknown,numero=false){return v===null||v===undefined||v===''?'—':numero?Number(v).toLocaleString('pt-BR'):typeof v==='boolean'?v?'Sim':'Não':String(v)}
const etiquetas:Record<string,string>={pendente:'Sem relatório',rascunho:'Em rascunho',aguardando_aprovacao:'Aguardando análise SETEC',aguardando_atendimento:'Em atendimento',entregue:'Entregue',dispensado:'Dispensado'}

export default function AssistenteHub({opcoes}:{opcoes:Opcoes}){
 const [filtros,setFiltros]=useState<Filtros>({...FILTROS_INICIAIS}),[pergunta,setPergunta]=useState(''),[mensagens,setMensagens]=useState<Mensagem[]>([])
 const [assuntosAbertos,setAssuntosAbertos]=useState(false),[pendente,setPendente]=useState('')
 const [aberto,setAberto]=useState(false),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[copiado,setCopiado]=useState(''),[aviso,setAviso]=useState('')
 const controller=useRef<AbortController|null>(null),sequencia=useRef(0),mutex=useRef(false),campo=useRef<HTMLTextAreaElement>(null),ultima=useRef<HTMLDivElement>(null),conversa=useRef<HTMLDivElement>(null)
 const anterior=[...mensagens].reverse().find(m=>m.resposta.consulta)?.resposta.consulta||null
 useEffect(()=>()=>{sequencia.current++;controller.current?.abort()},[])
 useEffect(()=>{if(pendente){const area=conversa.current;if(area)area.scrollTo({top:area.scrollHeight,behavior:'smooth'})}},[pendente])
 useEffect(()=>{const area=conversa.current,turno=ultima.current;if(mensagens.length&&area&&turno)area.scrollTo({top:area.scrollTop+turno.getBoundingClientRect().top-area.getBoundingClientRect().top-16,behavior:'smooth'})},[mensagens.length])
 const mudar=<K extends keyof Filtros>(k:K,v:Filtros[K])=>setFiltros(f=>({...f,[k]:v}))
 async function consultar(c:Consulta,pagina=1){
  const ctrl=new AbortController();controller.current=ctrl;const timer=window.setTimeout(()=>ctrl.abort(),28000)
  try{const res=await fetch('/api/assistente',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({consulta:c,pagina}),signal:ctrl.signal})
   if(res.redirected)throw new Error('Seu acesso mudou. Atualize a página para conferir a sessão.')
   const body=await res.json();if(!res.ok)throw new Error(body.erro||'Não foi possível concluir a consulta.');if(!body.id||!Array.isArray(body.linhas))throw new Error('A resposta da consulta está incompatível. Atualize a página.')
   return body as Resposta
  }catch(e){if(ctrl.signal.aborted)throw new Error('A consulta demorou mais que o esperado. Tente novamente; sua pergunta foi mantida.');throw e}
  finally{window.clearTimeout(timer);if(controller.current===ctrl)controller.current=null}
 }
 async function enviar(texto=pergunta,ajustes:Partial<Filtros>={}){
  const textoLimpo=texto.trim();if(!textoLimpo||mutex.current)return
  if(textoLimpo.length>500){setErro('Escreva uma pergunta de até 500 caracteres.');return}
  const val=filtrosValidos({...filtros,...ajustes});if(!val){setErro('Confira os filtros e as datas personalizadas.');return}
  setErro('');setAviso('');setPergunta(textoLimpo);mutex.current=true;setOcupado(true);setPendente(textoLimpo);const seq=++sequencia.current
  try{
   const resultado=interpretar(textoLimpo,val,opcoes,anterior)
   const resposta='consulta'in resultado?await consultar(resultado.consulta):'ajuda'in resultado?respostaAjuda(resultado.assunto):respostaOrientacao(resultado.esclarecer,resultado.sugestoes)
   if(seq!==sequencia.current)return
   setMensagens(ms=>[...ms,{id:crypto.randomUUID(),pergunta:textoLimpo,resposta}].slice(-20));setPergunta('')
   if(mensagens.length>=20)setAviso('A conversa mantém as 20 consultas mais recentes enquanto esta página estiver aberta.')
  }catch(e){if(seq===sequencia.current)setErro(e instanceof Error?e.message:'Não foi possível consultar. Tente novamente.')}
  finally{if(seq===sequencia.current){mutex.current=false;setOcupado(false);setPendente('')}}
 }
 async function paginar(m:Mensagem,pagina:number){
  if(mutex.current||!m.resposta.consulta)return;mutex.current=true;setOcupado(true);setErro('');const seq=++sequencia.current
  try{const r=await consultar(m.resposta.consulta,pagina);if(seq===sequencia.current)setMensagens(ms=>ms.map(x=>x.id===m.id?{...x,resposta:r}:x))}
  catch(e){if(seq===sequencia.current)setErro(e instanceof Error?e.message:'Não foi possível atualizar. A resposta anterior foi mantida.')}
  finally{if(seq===sequencia.current){mutex.current=false;setOcupado(false)}}
 }
 async function copiar(r:Resposta){try{const texto=textoResposta(r);if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(texto);else{const t=document.createElement('textarea');t.value=texto;document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw new Error()}setCopiado(r.id);window.setTimeout(()=>setCopiado(''),2500)}catch{setErro('Não foi possível copiar automaticamente. Selecione o texto da resposta para copiar.')}}
 function limpar(){if(ocupado)return;setMensagens([]);setErro('');setAviso('');setPergunta('');campo.current?.focus()}
 function submit(e:FormEvent){e.preventDefault();void enviar()}
 const escolaNome=(id:string)=>opcoes.escolas.find(e=>e.id===id)?.nome||id
 const temFiltros=Object.entries(filtros).some(([k,v])=>v!==FILTROS_INICIAIS[k as keyof Filtros])
 return <div className={s.root}>
  <header className={s.hero}>
   <span className={s.heroIcon}><Icone size={30}/></span>
   <div className={s.heroCopy}><span className={s.eyebrow}>SETEC HUB · {NOME_ASSISTENTE}</span><h1>Converse com os dados do Hub.</h1><p>{NOME_COMPLETO_ASSISTENTE}</p></div>
   <span className={s.heroStatus}><span className={s.sinal}/>Informações da plataforma</span>
  </header>
  <div className={s.workspace}>
   <aside className={s.side} data-open={assuntosAbertos} id="assistente-assuntos">
    <div className={s.sideTitle}><Icone tipo="book"/><h2>O que você precisa?</h2><button className={`${s.iconButton} ${s.mobileOnly}`} type="button" aria-label="Fechar assuntos" onClick={()=>setAssuntosAbertos(false)}><Icone tipo="close" size={18}/></button></div>
    <p className={s.muted}>Escolha um assunto ou pergunte no chat.</p>
    <nav className={s.modules} aria-label="Assuntos do assistente">{MODULOS.map(k=><button type="button" disabled={ocupado} key={k} data-active={anterior?.modulo===k} onClick={()=>{setAssuntosAbertos(false);void enviar(CATALOGO[k].pergunta,{modulo:k})}} className={s.module}><span className={s.moduleIcon}><Icone tipo={CATALOGO[k].icone}/></span><span><strong>{CATALOGO[k].nome}</strong><small>{CATALOGO[k].descricao}</small></span><Icone tipo="arrow" size={16}/></button>)}</nav>
    <div className={s.sideNote}><span className={s.sinal}/>Respostas com fonte<p>O S.E.T.H. consulta os registros do Hub quando você pergunta. Confira a fonte e a data em cada resposta.</p></div>
   </aside>
   <section className={s.chat} aria-label="Conversa com o assistente">
    <div className={s.toolbar}>
     <div className={s.assistantName}><span className={s.avatar}><Icone/></span><div><h2>{NOME_ASSISTENTE}</h2><small>Seu assistente no SETEC Hub</small></div></div>
     <div className={s.toolbarActions}>
      <button type="button" className={`${s.button} ${s.mobileOnly}`} aria-expanded={assuntosAbertos} aria-controls="assistente-assuntos" onClick={()=>setAssuntosAbertos(x=>!x)}><Icone tipo="book" size={17}/><span>Assuntos</span></button>
      <button type="button" aria-expanded={aberto} aria-controls="assistente-filtros" onClick={()=>setAberto(x=>!x)} className={`${s.button} ${temFiltros?s.active:''}`}><Icone tipo="filter" size={17}/><span>Filtros</span>{temFiltros&&<span className={s.dot}/>}</button>
      <button type="button" disabled={ocupado||!mensagens.length} onClick={limpar} className={s.quiet} title="Limpar esta conversa"><Icone tipo="refresh" size={17}/><span>Limpar</span></button>
     </div>
    </div>
    {aberto&&<div className={s.filters} id="assistente-filtros">
     <div className={s.filterIntro}><strong>Filtros para a próxima pergunta</strong><button className={s.quiet} type="button" onClick={()=>setFiltros({...FILTROS_INICIAIS})}>Restaurar</button></div>
     <div className={s.filterGrid}>
      <label>Assunto<select value={filtros.modulo} onChange={e=>mudar('modulo',e.target.value as Filtros['modulo'])}><option value="auto">Identificar pela pergunta</option>{MODULOS.map(k=><option key={k} value={k}>{CATALOGO[k].nome}</option>)}</select></label>
      <label>Escola<select value={filtros.escola} onChange={e=>mudar('escola',e.target.value)}><option value="">Todas as escolas</option>{opcoes.escolas.map(e=><option value={e.id} key={e.id}>{e.nome}{e.cie?' · '+e.cie:''}</option>)}</select></label>
      <label>Período<select disabled={filtros.modulo==='escolas'} value={filtros.periodo} onChange={e=>mudar('periodo',e.target.value as Filtros['periodo'])}><option value="auto">Pela pergunta / contexto</option><option value="hoje">Hoje</option><option value="mes">Mês atual</option><option value="mes_anterior">Mês anterior</option><option value="ano">Ano atual</option><option value="ultimos30">Últimos 30 dias</option><option value="proximos7">Próximos 7 dias</option><option value="personalizado">Personalizado</option></select></label>
      <label>Técnico / responsável<select value={filtros.tecnico} onChange={e=>mudar('tecnico',e.target.value)}><option value="">Todos os responsáveis</option>{opcoes.tecnicos.map(t=><option key={t.nome} value={t.nome}>{t.nome}</option>)}</select></label>
      {filtros.periodo==='personalizado'&&filtros.modulo!=='escolas'&&<><label>Data inicial<input type="date" value={filtros.inicio} onChange={e=>mudar('inicio',e.target.value)}/></label><label>Data final<input type="date" value={filtros.fim} min={filtros.inicio} onChange={e=>mudar('fim',e.target.value)}/></label></>}
      <label>Categoria principal<select value={filtros.categoria} onChange={e=>mudar('categoria',e.target.value)}><option value="">Todas as categorias</option>{opcoes.categorias.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      <label>Edição SARESP<select value={filtros.edicao} onChange={e=>mudar('edicao',e.target.value)}><option value="">Edições do período</option>{opcoes.edicoes.map(e=><option key={e.id} value={e.id}>{e.titulo}</option>)}</select></label>
     </div>
     <p>Os filtros escolhidos aqui prevalecem sobre a pergunta. Escolas, inventário e tutoriais usam o cadastro atual. Sem período informado: mês atual para atendimentos e demandas; hoje para calendário.</p>
    </div>}
    <div className={s.conversation} ref={conversa} tabIndex={0} aria-label="Histórico da conversa; role para consultar as respostas" aria-busy={ocupado}>
     {!mensagens.length&&!pendente&&<div className={s.welcome}>
      <span className={s.welcomeIcon}><Icone size={30}/></span><h3>Olá, {opcoes.nome.split(' ')[0]||'equipe'}. Vamos consultar?</h3>
      <p>Pergunte com suas palavras. Informe o nome da escola ou o CIE quando quiser consultar uma unidade.</p>
      <div className={s.suggestionGrid}>{SUGESTOES_INICIAIS.map((q,i)=><button type="button" key={q} disabled={ocupado} onClick={()=>void enviar(q)}><small>{['DADOS DAS ESCOLAS','RELATÓRIOS','INVENTÁRIO','CALENDÁRIO'][i]}</small><span>{q}<Icone tipo="arrow" size={18}/></span></button>)}</div>
      <p className={s.example}>Depois de consultar uma escola, experimente: “E o telefone?”</p>
     </div>}
     {mensagens.map((m,index)=>{
      const r=m.resposta,max=Math.max(1,...r.grupos.map(g=>g.total)),escolas=r.consulta?.modulo==='escolas'
      const paginacao=<div className={s.pagination}><span>{(r.pagina-1)*r.tamanho+1}–{Math.min(r.pagina*r.tamanho,r.total)} de {r.total.toLocaleString('pt-BR')}</span>{r.total>r.tamanho&&<div><button type="button" className={s.button} disabled={ocupado||r.pagina<=1} onClick={()=>void paginar(m,r.pagina-1)}>Anterior</button><button type="button" className={s.button} disabled={ocupado||r.pagina*r.tamanho>=r.total} onClick={()=>void paginar(m,r.pagina+1)}>Próxima</button></div>}</div>
      return <div className={s.turn} key={m.id} ref={index===mensagens.length-1?ultima:undefined}>
       <div className={s.question}><span>Você</span><p>{m.pergunta}</p></div>
       <div className={s.assistantMessage}><span className={s.messageAvatar}><Icone size={20}/></span>
        <article className={s.answer} data-resposta={r.id}>
         <div className={s.answerHead}><div><span className={s.eyebrow}>{NOME_ASSISTENTE} · {r.tipo==='dados'?'CONSULTA AO HUB':'ORIENTAÇÃO'}</span><h3>{r.titulo}</h3></div><button type="button" className={s.copyButton} onClick={()=>void copiar(r)} aria-label="Copiar resposta"><Icone tipo={copiado===r.id?'check':'copy'} size={17}/><span>{copiado===r.id?'Copiado':'Copiar'}</span></button></div>
         <p className={s.answerText}>{r.texto}</p>
         {r.consulta&&<div className={s.scope}><span>{descreverPeriodo(r.consulta)}</span>{r.consulta.situacao!=='todos'&&<span>{rotuloSituacao[r.consulta.situacao]}</span>}{r.consulta.escola&&!escolas&&<span>{escolaNome(r.consulta.escola)}</span>}{r.consulta.tecnico&&<span>{r.consulta.tecnico}</span>}{r.consulta.categoria&&<span>{r.consulta.categoria}</span>}{r.consulta.edicao&&<span>{opcoes.edicoes.find(e=>e.id===r.consulta?.edicao)?.titulo||'Edição selecionada'}</span>}</div>}
         {!!r.indicadores.length&&<div className={s.kpis} data-count={r.indicadores.length}>{r.indicadores.map(k=><div key={k.nome} className={s.kpi} data-tom={k.tom}><small>{k.nome}</small><strong>{k.valor.toLocaleString('pt-BR')}{k.sufixo}</strong></div>)}</div>}
         {escolas&&<section className={s.schoolRecords} aria-label="Dados cadastrais das escolas">
          {r.linhas.length?r.linhas.map(l=>{
           const campos=r.colunas.filter(c=>c.chave!=='escola'),compacta=r.total>1&&campos.length>4
           const principais=compacta?campos.filter(c=>['cie','diretor','periodo','tipo_ensino'].includes(c.chave)):campos
           const complementares=compacta?campos.filter(c=>!principais.includes(c)):[]
           const fichas=(cols:typeof campos)=><dl className={s.schoolFacts} data-single={cols.length===1}>{cols.map(c=><div key={c.chave} data-wide={['endereco','horario'].includes(c.chave)}><dt>{c.titulo}</dt><dd data-missing={l[c.chave]===null||l[c.chave]===undefined||String(l[c.chave]).trim()===''}>{l[c.chave]===null||l[c.chave]===undefined||String(l[c.chave]).trim()===''?'Não informado no cadastro':valor(l[c.chave],c.numero)}</dd></div>)}</dl>
           return <article className={s.schoolCard} key={String(l.id)}><header><span className={s.moduleIcon}><Icone tipo="school"/></span><h4>{String(l.escola)}</h4></header>{fichas(principais)}{!!complementares.length&&<details className={s.schoolMore}><summary>Contatos e outros dados</summary>{fichas(complementares)}</details>}<div className={s.schoolActions}><Link href={String(l.href)} prefetch={false}>Conferir cadastro<Icone tipo="arrow" size={16}/></Link>{(r.consulta?.campoEscola!=='todos'||r.total>1)&&<button type="button" disabled={ocupado} onClick={()=>void enviar('Mostre os dados completos de '+String(l.escola),{modulo:'escolas',escola:String(l.id)})}>Ver ficha completa<Icone tipo="arrow" size={16}/></button>}</div></article>
          }):<div className={s.empty}>Nenhuma escola encontrada com esses filtros. Confira a unidade e o responsável selecionados.</div>}
          {!!r.linhas.length&&r.total>1&&paginacao}
         </section>}
         {!!r.grupos.length&&<details className={s.distribution} open={r.consulta?.foco==='ranking'}><summary>Distribuição dos resultados <span>Até 12 grupos</span></summary><div className={s.distributionBody}>{r.grupos.map((g,i)=><div key={g.nome} className={s.barRow}><span className={s.barPosition}>{String(i+1).padStart(2,'0')}</span><div><div className={s.barLabel}><span>{g.nome}</span><strong>{g.total.toLocaleString('pt-BR')}</strong></div><div className={s.track}><i style={{width:Math.max(1,100*g.total/max)+'%'}}/></div></div></div>)}</div></details>}
         {r.tipo==='dados'&&!escolas&&<details className={s.records} open={r.consulta?.foco==='lista'||r.consulta?.modulo==='conhecimento'}><summary>Conferir os registros <span>{r.total.toLocaleString('pt-BR')} na seleção</span></summary><div className={s.recordsBody}>{r.linhas.length?<>
          <div className={s.tableScroll} tabIndex={0} aria-label="Tabela de registros; role horizontalmente para consultar todas as colunas"><table><thead><tr>{r.colunas.map(c=><th key={c.chave} className={c.numero?s.num:''}>{c.titulo}</th>)}<th>Conferir</th></tr></thead><tbody>{r.linhas.map((l,li)=><tr key={String(l.id||l.chamado||li)}>{r.colunas.map(c=><td key={c.chave} className={c.numero?s.num:''}>{c.link?<Link href={String(l.href)} prefetch={false}>{valor(l[c.chave])}</Link>:c.data?data(l[c.chave]):(c.chave==='situacao'&&r.consulta?.modulo==='relatorios'?etiquetas[String(l[c.chave])]:undefined)||valor(l[c.chave],c.numero)}</td>)}<td><Link className={s.recordLink} href={String(l.href)} prefetch={false} target={l.externo?'_blank':undefined} rel={l.externo?'noopener noreferrer':undefined}>{r.consulta?.modulo==='conhecimento'?l.externo?'Abrir tutorial':'Ver na base':'Abrir'}<Icone tipo="arrow" size={15}/></Link>{Boolean(l.descricao||l.resolucao)&&<details className={s.details}><summary>Detalhes</summary>{l.descricao&&<p><strong>Descrição</strong>{String(l.descricao)}</p>}{l.resolucao&&<p><strong>Devolutiva</strong>{String(l.resolucao)}</p>}</details>}</td></tr>)}</tbody></table></div>{paginacao}
         </>:<div className={s.empty}>Nenhum registro encontrado nessa seleção. Confira o período e os filtros.</div>}</div></details>}
         {!!r.notas.length&&<details className={s.method}><summary>Como esta resposta foi calculada</summary>{r.notas.map(n=><p key={n}>{n}</p>)}</details>}
         <footer className={s.answerFooter}><div>{r.fontes.map(f=><Link key={f.href} href={f.href} prefetch={false}><Icone tipo="book" size={15}/>{f.titulo}<Icone tipo="arrow" size={15}/></Link>)}</div><small>{r.tipo==='dados'?'Consultado':'Orientação'} em {data(r.atualizadoEm)}</small></footer>
         {index===mensagens.length-1&&<div className={s.followups}>{r.sugestoes.map(q=><button type="button" key={q} disabled={ocupado} onClick={()=>void enviar(q)}>{q}<Icone tipo="arrow" size={15}/></button>)}</div>}
        </article>
       </div>
      </div>
     })}
     {pendente&&<div className={s.turn}><div className={s.question}><span>Você</span><p>{pendente}</p></div></div>}
     {ocupado&&<div className={s.loading} role="status"><span/>{pendente?'Consultando os registros do Hub…':'Atualizando os resultados…'}</div>}
     {aviso&&<p className={s.muted} role="status">{aviso}</p>}
    </div>
    <div className={s.composerWrap}>
     {erro&&<div role="alert" className={s.error}>{erro}</div>}
     <form onSubmit={submit} className={s.composer}><label className={s.srOnly} htmlFor="pergunta-assistente">Sua pergunta para o assistente</label><textarea id="pergunta-assistente" ref={campo} value={pergunta} readOnly={ocupado} maxLength={500} rows={2} placeholder="Ex.: qual é o telefone da escola…" onChange={e=>setPergunta(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void enviar()}}}/><button type="submit" disabled={ocupado||!pergunta.trim()} aria-label="Enviar pergunta"><Icone tipo="send" size={20}/><span>Enviar</span></button></form>
     <div className={s.composerInfo}><span>Enter para enviar · Shift + Enter para nova linha</span><span>{pergunta.length}/500</span></div>
    </div>
   </section>
  </div>
 </div>
}
