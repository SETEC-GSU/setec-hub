"use client"

import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { copiasSelecionadas,criarRascunho,dataBR,textoAssunto,textoCorpo } from '@/lib/fields-avisos/email'
import { ROTULOS_AVISOS,type AcaoAviso,type BaseAvisos,type FiltrosAvisos,type GrupoAviso,type RascunhoAviso } from '@/lib/fields-avisos/types'
import s from './AvisosVisita.module.css'

const INICIAL:FiltrosAvisos={inicio:'',fim:'',situacao:'pendentes',busca:''}
const assinatura=(g:GrupoAviso)=>[g.email,...g.chamados.map(c=>c.id+':'+c.versao+':'+c.tecnicoEmail)].join('|')
type Guardado={assinatura:string;valor:RascunhoAviso}
function Icone({tipo='mail'}:{tipo?:'mail'|'close'|'copy'|'refresh'|'arrow'}){return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tipo==='mail'?<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></>:tipo==='close'?<path d="m6 6 12 12M6 18 18 6"/>:tipo==='copy'?<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 4H5v12"/></>:tipo==='refresh'?<><path d="M20 4v6h-6M4 20v-6h6"/><path d="M5 8a7 7 0 0 1 12-3l3 5M4 14l3 5a7 7 0 0 0 12-3"/></>:<path d="M5 12h14m-6-6 6 6-6 6"/>}</svg>}
function statusGrupo(g:GrupoAviso){return g.pendentes?`${g.pendentes} aviso(s) pendente(s)`:g.enviados===g.total?'Envio confirmado':g.ignorados===g.total?'Aviso ignorado':'Controle concluído'}
async function lerResposta(res:Response){const body=await res.json();if(!res.ok)throw new Error(body.erro||'Não foi possível concluir.');return body}
async function copiarTexto(t:string){if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);return}const e=document.createElement('textarea');e.value=t;document.body.appendChild(e);e.select();const ok=document.execCommand('copy');e.remove();if(!ok)throw new Error('Não foi possível copiar. Selecione o texto do modelo e copie manualmente.')}

export default function AvisosVisita({fechar}:{fechar:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),controller=useRef<AbortController|null>(null),montado=useRef(true),seq=useRef(0),lock=useRef(false)
 const [base,setBase]=useState<BaseAvisos|null>(null),[filtros,setFiltros]=useState<FiltrosAvisos>({...INICIAL}),[aplicados,setAplicados]=useState<FiltrosAvisos>({...INICIAL})
 const [carregando,setCarregando]=useState(false),[salvando,setSalvando]=useState(false),[erro,setErro]=useState(''),[aviso,setAviso]=useState(''),[selecionado,setSelecionado]=useState('')
 const [rascunhos,setRascunhos]=useState<Record<string,Guardado>>({}),[acao,setAcao]=useState<AcaoAviso>('enviado'),[motivo,setMotivo]=useState('Atendimento em continuidade: a unidade já foi avisada.')
 const ocupado=carregando||salvando
 const carregar=useCallback(async(f:FiltrosAvisos,pagina=1)=>{
  controller.current?.abort();const ctrl=new AbortController();controller.current=ctrl;const atual=++seq.current;setCarregando(true);setErro('');const timer=setTimeout(()=>ctrl.abort(),28000)
  try{
   const q=new URLSearchParams({...f,pagina:String(pagina)});const b=await lerResposta(await fetch('/api/fields/avisos-visita?'+q,{cache:'no-store',credentials:'same-origin',signal:ctrl.signal})) as BaseAvisos
   if(!montado.current||atual!==seq.current)return
   if(b.versao!==1||!Array.isArray(b.grupos))throw new Error('Resposta incompatível. Atualize a página.')
   setBase(b);setAplicados({...f,inicio:b.inicio,fim:b.fim});setFiltros({...f,inicio:b.inicio,fim:b.fim});setSelecionado(id=>b.grupos.some(g=>g.id===id)?id:b.grupos[0]?.id||'')
  }catch(e){if(montado.current&&atual===seq.current)setErro(ctrl.signal.aborted?'A consulta demorou. Tente atualizar novamente; o modelo editado foi mantido.':e instanceof Error?e.message:'Não foi possível consultar os avisos.')}
  finally{clearTimeout(timer);if(montado.current&&atual===seq.current)setCarregando(false)}
 },[])
 useEffect(()=>{
  montado.current=true;const el=dialog.current,overflow=document.body.style.overflow,antes=document.activeElement instanceof HTMLElement?document.activeElement:null
  document.body.style.overflow='hidden';el?.showModal();void carregar({...INICIAL})
  return()=>{montado.current=false;seq.current++;controller.current?.abort();el?.close();document.body.style.overflow=overflow;antes?.focus()}
 },[carregar])
 const grupo=base?.grupos.find(g=>g.id===selecionado)||null,guardado=grupo?rascunhos[grupo.id]:undefined
 const rascunho=guardado?.valor||(grupo?criarRascunho(grupo):null),mudou=Boolean(grupo&&guardado&&guardado.assinatura!==assinatura(grupo))
 function editar(p:Partial<RascunhoAviso>){if(!grupo||!rascunho)return;setRascunhos(r=>({...r,[grupo.id]:{assinatura:guardado?.assinatura||assinatura(grupo),valor:{...rascunho,...p}}}))}
 function restaurar(){if(!grupo)return;setRascunhos(r=>({...r,[grupo.id]:{assinatura:assinatura(grupo),valor:criarRascunho(grupo)}}));setErro('');setAviso('Modelo recriado com todos os chamados da escola nesta data.')}
 function filtrosSubmit(e:FormEvent){e.preventDefault();if(ocupado)return;setAviso('');void carregar(filtros)}
 function mudarGrupo(id:string){setSelecionado(id);setAcao('enviado');setErro('');setAviso('')}
 async function usarEmail(tipo:'assunto'|'corpo'){
  if(!grupo||!rascunho)return;setErro('');setAviso('')
  try{
   if(mudou)throw new Error('A programação mudou. Recrie o modelo para incluir os dados atuais.')
   await copiarTexto(tipo==='assunto'?textoAssunto(rascunho):textoCorpo(rascunho))
   setAviso(tipo==='assunto'?'Assunto copiado. Cole no campo Assunto do seu e-mail.':'Corpo do e-mail copiado. Cole na mensagem; destinatários e assunto ficam nos campos próprios do e-mail.')
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível copiar. Selecione o texto do campo e copie manualmente.')}
 }
 async function registrar(){
  if(!grupo||!grupo.editavel||lock.current)return
  setErro('');setAviso('')
  if(acao==='ignorado'&&!motivo.trim()){setErro('Informe o motivo para ignorar o aviso.');return}
  if(acao==='enviado'&&mudou){setErro('A programação mudou. Confira e recrie o modelo antes de confirmar o envio.');return}
  const itens=grupo.chamados.filter(c=>c.editavel).map(c=>({id:c.id,revisao:c.revisao}));if(!itens.length)return
  lock.current=true;setSalvando(true);const ctrl=new AbortController();controller.current=ctrl;const timer=setTimeout(()=>ctrl.abort(),28000)
  try{
   await lerResposta(await fetch('/api/fields/avisos-visita',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({itens,situacao:acao,motivo:acao==='ignorado'?motivo:''}),signal:ctrl.signal}))
   if(!montado.current)return
   setAviso(acao==='enviado'?'Confirmação de envio registrada.':acao==='ignorado'?'Aviso ignorado para esta escola e data. Os outros dias continuam independentes.':acao==='concluido'?'Controle concluído manualmente, sem declarar envio de e-mail.':'Aviso reaberto para conferência.')
   await carregar(aplicados,base?.pagina||1)
  }catch(e){if(montado.current)setErro(ctrl.signal.aborted?'A confirmação demorou. Atualize os avisos para verificar se foi registrada antes de repetir.':e instanceof Error?e.message:'Não foi possível registrar. Atualize para conferir.')}
  finally{clearTimeout(timer);lock.current=false;if(montado.current)setSalvando(false)}
 }
 return createPortal(<dialog ref={dialog} className={s.dialog} aria-labelledby="avisos-titulo" onCancel={e=>{e.preventDefault();if(!ocupado)fechar()}}>
  <div className={s.shell}>
   <header className={s.header}><div className={s.headerIcon}><Icone/></div><div><span className={s.eyebrow}>SETEC HUB · COMUNICAÇÃO COM AS ESCOLAS</span><h2 id="avisos-titulo">Avisos de visita FIELD</h2><p>Uma escola, uma data, um e-mail com todos os chamados e técnicos.</p></div><button type="button" className={s.iconButton} onClick={fechar} disabled={ocupado} aria-label="Fechar avisos"><Icone tipo="close"/></button></header>
   <div className={s.scroll}>
    <div className={s.intro}><span className={s.pill}>Controle a partir de {base?dataBR(base.inicioControle):'05/11/2026'}</span><p>Datas anteriores aparecem como histórico concluído. Copiar o modelo não confirma envio e não altera o status do atendimento.</p></div>
    <form onSubmit={filtrosSubmit} className={s.filters}><fieldset disabled={ocupado}><label>Data prevista inicial<input type="date" required value={filtros.inicio} onChange={e=>setFiltros(f=>({...f,inicio:e.target.value}))}/></label><label>Data prevista final<input type="date" required min={filtros.inicio} value={filtros.fim} onChange={e=>setFiltros(f=>({...f,fim:e.target.value}))}/></label><label>Situação do aviso<select value={filtros.situacao} onChange={e=>setFiltros(f=>({...f,situacao:e.target.value as FiltrosAvisos['situacao']}))}><option value="pendentes">Com avisos pendentes</option><option value="resolvidos">Resolvidos / histórico</option><option value="todos">Todas as situações</option></select></label><label className={s.search}>Escola, técnico ou chamado<input type="search" maxLength={160} value={filtros.busca} placeholder="Buscar na programação" onChange={e=>setFiltros(f=>({...f,busca:e.target.value}))}/></label><button className={s.button} type="submit"><Icone tipo="refresh"/>Consultar</button></fieldset><small>Até 93 dias por consulta. A busca encontra o grupo e preserva todos os chamados da escola na mesma data.</small></form>
    {base&&<div className={s.metrics}><div><span>Escolas / dias no recorte</span><strong>{base.resumo.grupos.toLocaleString('pt-BR')}</strong></div><div data-tone="amber"><span>Com aviso pendente</span><strong>{base.resumo.pendentes.toLocaleString('pt-BR')}</strong></div><div data-tone="green"><span>Controle resolvido</span><strong>{base.resumo.resolvidos.toLocaleString('pt-BR')}</strong></div><div><span>Chamados programados</span><strong>{base.resumo.chamados.toLocaleString('pt-BR')}</strong></div></div>}
    {erro&&<div role="alert" className={s.error}>{erro}</div>}{aviso&&<div role="status" className={s.success}>{aviso}</div>}
    {carregando&&<p role="status" className={s.loading}>Consultando a programação…</p>}
    {base&&!base.grupos.length&&!carregando&&<div className={s.empty}><Icone/><h3>Nenhum grupo encontrado</h3><p>Confira o período, a busca e a situação. Somente registros com data prevista entram no controle; cancelados são desconsiderados.</p></div>}
    {!!base?.grupos.length&&<div className={s.workspace}>
     <aside className={s.list} aria-label="Escolas e datas da programação"><div className={s.listTitle}><strong>Programação</strong><span>{base.total.toLocaleString('pt-BR')} grupo(s)</span></div><label className={s.mobilePicker}>Selecionar escola e data<select disabled={ocupado} value={selecionado} onChange={e=>mudarGrupo(e.target.value)}>{base.grupos.map(g=><option key={g.id} value={g.id}>{dataBR(g.data)} · {g.escola} · {g.total} chamado(s)</option>)}</select></label><div className={s.groupList}>{base.grupos.map(g=><button type="button" disabled={ocupado} key={g.id} className={`${s.group} ${g.id===selecionado?s.selected:''}`} aria-pressed={g.id===selecionado} onClick={()=>mudarGrupo(g.id)}><span className={s.groupDate}>{dataBR(g.data)}<span data-pending={g.pendentes>0}>{g.pendentes?'Pendente':'Resolvido'}</span></span><strong>{g.escola}</strong><small>{g.total} chamado(s) · {new Set(g.chamados.map(c=>c.tecnico)).size} técnico(s)</small><span className={s.groupState}>{statusGrupo(g)}</span></button>)}</div><div className={s.pagination}><button className={s.button} type="button" disabled={ocupado||base.pagina<=1} onClick={()=>void carregar(aplicados,base.pagina-1)}>Anterior</button><span>{base.pagina} / {Math.max(1,Math.ceil(base.total/25))}</span><button className={s.button} type="button" disabled={ocupado||base.pagina*25>=base.total} onClick={()=>void carregar(aplicados,base.pagina+1)}>Próxima</button></div></aside>
     {grupo&&rascunho&&<section className={s.detail} aria-label="Detalhes e e-mail da visita"><div className={s.detailTitle}><span className={s.eyebrow}>PROGRAMAÇÃO COMPILADA</span><h3>{grupo.escola}</h3><p>{dataBR(grupo.data)} · {grupo.total} chamado(s) · {statusGrupo(grupo)}</p></div>
      <div className={s.calls}>{grupo.chamados.map(c=><details key={c.id}><summary><span><strong>{c.chamado}</strong><small>{c.tecnico}</small></span><span className={s.state} data-status={c.situacao}>{ROTULOS_AVISOS[c.situacao]}</span></summary><div className={s.callBody}><p><b>Abertura por</b>{c.aberturaPor}</p><p><b>Técnico responsável</b>{c.tecnico}</p><p><b>Status do atendimento</b>{c.status||'Não informado'}</p><p><b>Descrição</b>{c.descricao||'Sem descrição cadastrada.'}</p>{c.motivo&&<p><b>Motivo do aviso ignorado</b>{c.motivo}</p>}{c.atualizadoEm&&<p><b>Última marcação</b>{c.atualizadoPor} · {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(c.atualizadoEm))}</p>}</div></details>)}</div>
      {grupo.editavel?<>
       <div className={s.sectionHead}><div><h4>Modelo do e-mail</h4><p>Confira o modelo e copie assunto e corpo separadamente.</p></div><button type="button" className={s.quiet} disabled={ocupado} onClick={restaurar}>Recriar modelo</button></div>
       {mudou&&<div role="alert" className={s.warning}>A programação foi alterada desde a edição do modelo. Use Recriar modelo para incluir todos os dados atuais.</div>}
       {!grupo.email&&<div className={s.warning}>{grupo.escolas_correspondentes>1?'Há cadastros de escola com nomes equivalentes.':'Não há e-mail único disponível para esta escola.'} Informe o destinatário abaixo; o cadastro da escola será preservado.</div>}
       <fieldset className={s.emailFields} disabled={ocupado}><label>Para — e-mail(s) da unidade<input type="text" value={rascunho.para} maxLength={1500} placeholder="email.administrativo@educacao.sp.gov.br" onChange={e=>editar({para:e.target.value})}/></label>
        <div className={s.cc}><strong>Técnicos em cópia (opcional)</strong><p>Marque quem deve receber e use os endereços de Cópias selecionadas no campo Cc do seu e-mail. Você pode conferir ou preencher os endereços manualmente.</p>{rascunho.copias.map((t,i)=><div className={s.ccRow} key={t.nome}><label><input type="checkbox" checked={t.selecionado} onChange={e=>editar({copias:rascunho.copias.map((c,j)=>j===i?{...c,selecionado:e.target.checked}:c)})}/><span>{t.nome}</span></label><input type="text" aria-label={'E-mail em cópia de '+t.nome} value={t.email} maxLength={500} placeholder="Sem vínculo de e-mail — preencher" onChange={e=>editar({copias:rascunho.copias.map((c,j)=>j===i?{...c,email:e.target.value}:c)})}/></div>)}</div>
        <label>Outras cópias (opcional)<input value={rascunho.copiasExtras} maxLength={1500} placeholder="Separe os endereços por ponto e vírgula" onChange={e=>editar({copiasExtras:e.target.value})}/></label>{copiasSelecionadas(rascunho)&&<label>Cópias selecionadas — selecione o campo e copie para Cc<input readOnly value={copiasSelecionadas(rascunho)} onFocus={e=>e.currentTarget.select()}/></label>}<label>Assunto<input value={rascunho.assunto} maxLength={300} onChange={e=>editar({assunto:e.target.value})}/></label><label>Corpo do e-mail<textarea value={rascunho.corpo} rows={17} onChange={e=>editar({corpo:e.target.value})}/></label>
       </fieldset>
       <div className={s.emailActions}><button type="button" className={s.button} disabled={ocupado||mudou} onClick={()=>void usarEmail('assunto')}><Icone tipo="copy"/>Copiar assunto</button><button type="button" className={s.primary} disabled={ocupado||mudou} onClick={()=>void usarEmail('corpo')}><Icone tipo="copy"/>Copiar corpo do e-mail</button></div><p className={s.help}>Use os endereços acima nos campos Para e Cc. Cole assunto e corpo nos campos correspondentes do seu e-mail e, após enviar, confirme no controle abaixo.</p>
       <div className={s.control}><div><span className={s.eyebrow}>CONTROLE MANUAL</span><h4>Registrar situação do aviso</h4><p>A marcação vale para os chamados deste grupo. Outros dias da mesma escola permanecem independentes.</p></div><label>Ação<select value={acao} disabled={ocupado} onChange={e=>setAcao(e.target.value as AcaoAviso)}><option value="enviado">Confirmar envio — já enviei o e-mail</option><option value="ignorado">Ignorar aviso — unidade já comunicada / continuidade</option><option value="concluido">Concluir controle — apenas marcar, sem confirmar envio</option><option value="pendente">Reabrir aviso — voltar para pendente</option></select></label>{acao==='ignorado'&&<label>Motivo<textarea rows={2} maxLength={400} value={motivo} disabled={ocupado} onChange={e=>setMotivo(e.target.value)}/></label>}<button type="button" className={s.primary} disabled={ocupado} onClick={()=>void registrar()}>{salvando?'Registrando…':acao==='enviado'?'Confirmar envio':acao==='ignorado'?'Registrar aviso ignorado':acao==='concluido'?'Concluir controle':'Reabrir aviso'}<Icone tipo="arrow"/></button></div>
      </>:<div className={s.readonly}><h4>Controle encerrado</h4><p>Datas anteriores ao início do controle são concluídas como histórico, sem declaração de envio. Atendimentos já finalizados também não geram uma nova pendência de aviso.</p></div>}
     </section>}
    </div>}
   </div>
   <footer className={s.footer}><span>SEINTEC / SETEC · avisos independentes do status do chamado</span><button type="button" className={s.button} onClick={fechar} disabled={ocupado}>Fechar</button></footer>
  </div>
 </dialog>,document.body)
}
