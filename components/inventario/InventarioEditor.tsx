"use client"

import {useEffect,useRef,useState,type FormEvent} from 'react'
import {CAMPOS_INVENTARIO,formatarDataInventario,type CampoInventario,type ContextoInventario,type EscolaInventario,type PayloadInventario,type ResultadoInventario} from '@/lib/inventario-field'

type Valores=Record<string,Record<CampoInventario,string>>;
type Rascunho={base:string|null;estoque:string;valores:Valores;nome:string;cargo:string;observacao:string;envio:string};
function iniciar(e:EscolaInventario):Valores{return Object.fromEntries(e.modelos.map(m=>[m.id,Object.fromEntries(CAMPOS_INVENTARIO.map(c=>[c.key,String(m[c.key]??0)]))])) as Valores;}

export default function InventarioEditor({escola,contexto,onSalvar,onSucesso,onRecarregar,onOcupado}:{
  escola:EscolaInventario;contexto:ContextoInventario;onSalvar:(p:PayloadInventario)=>Promise<ResultadoInventario>;
  onSucesso:()=>void;onRecarregar?:()=>void;onOcupado?:(ocupado:boolean)=>void;
}){
  const [valores,setValores]=useState<Valores>(()=>iniciar(escola));
  const [nome,setNome]=useState(contexto.role==='field'?(contexto.nome||''):(escola.ultima_resposta?.responsavel_nome||''));
  const [cargo,setCargo]=useState(contexto.role==='field'?'Técnico Field':(escola.ultima_resposta?.responsavel_cargo||''));
  const [observacao,setObservacao]=useState(escola.ultima_resposta?.observacao||'');
  const [erro,setErro]=useState('');const [conflito,setConflito]=useState(false);
  const [enviando,setEnviando]=useState(false);const [sucesso,setSucesso]=useState(false);
  const [rascunho,setRascunho]=useState<Rascunho|null>(null);const [avisoRascunho,setAvisoRascunho]=useState('');
  const envio=useRef('');const bloqueio=useRef(false);const alterado=useRef(false);const pronto=useRef(false);
  const chave=`setec:inventario:v1:${contexto.user_id}:${escola.id}`;
  const base=escola.ultima_resposta?.id||null;
  useEffect(()=>{
    envio.current=crypto.randomUUID();
    try{const salvo=sessionStorage.getItem(chave);if(salvo){const d=JSON.parse(salvo) as Rascunho;
      if(d.base===base&&d.estoque===escola.estoque_assinatura&&d.valores&&typeof d.nome==='string'&&typeof d.cargo==='string'&&typeof d.observacao==='string'&&typeof d.envio==='string')setRascunho(d);
      else setAvisoRascunho('Existe um rascunho anterior, mas a base mudou. Confira os valores atuais antes de continuar.');
    }}catch{/* Armazenamento opcional; o formulário continua disponível. */}pronto.current=true;
  },[chave,base,escola.estoque_assinatura]);
  useEffect(()=>{
    if(!pronto.current||!alterado.current||sucesso)return;
    try{sessionStorage.setItem(chave,JSON.stringify({base,estoque:escola.estoque_assinatura,valores,nome,cargo,observacao,envio:envio.current}));}catch{/* Estado permanece na tela. */}
  },[base,chave,escola.estoque_assinatura,valores,nome,cargo,observacao,sucesso]);
  useEffect(()=>{const proteger=(e:BeforeUnloadEvent)=>{if(alterado.current&&!sucesso){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',proteger);return()=>window.removeEventListener('beforeunload',proteger);},[sucesso]);
  function mudar(id:string,campo:CampoInventario,valor:string){if(!/^\d{0,9}$/.test(valor))return;alterado.current=true;setValores(v=>({...v,[id]:{...v[id],[campo]:valor}}));}
  function soma(id:string){return CAMPOS_INVENTARIO.reduce((s,c)=>s+Number(valores[id]?.[c.key]||0),0);}
  const completos=escola.modelos.filter(m=>soma(m.id)===m.recebido).length;
  async function enviar(event:FormEvent){
    event.preventDefault();if(bloqueio.current)return;setErro('');setConflito(false);
    const invalido=escola.modelos.find(m=>soma(m.id)!==m.recebido||CAMPOS_INVENTARIO.some(c=>!/^\d+$/.test(valores[m.id]?.[c.key]??'')||!Number.isSafeInteger(Number(valores[m.id][c.key]))));
    if(invalido){setErro(`Revise ${invalido.nome}: a soma deve ser ${invalido.recebido}. Atualmente: ${soma(invalido.id)}.`);document.getElementById('modelo-'+invalido.id)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(!envio.current)envio.current=crypto.randomUUID();bloqueio.current=true;setEnviando(true);onOcupado?.(true);
    const payload:PayloadInventario={envio_id:envio.current,base_id:base,estoque_assinatura:escola.estoque_assinatura,
      responsavel_nome:nome.trim(),responsavel_cargo:cargo.trim(),observacao:observacao.trim(),
      itens:escola.modelos.map(m=>({id:m.id,...Object.fromEntries(CAMPOS_INVENTARIO.map(c=>[c.key,Number(valores[m.id][c.key])]))})) as PayloadInventario['itens']};
    try{const r=await onSalvar(payload);if(!r.ok){setErro(r.mensagem);setConflito(!!r.conflito);return;}
      alterado.current=false;setSucesso(true);try{sessionStorage.removeItem(chave);}catch{/* Sem impacto no registro. */}
    }catch{setErro('Não foi possível confirmar o envio. Seus dados foram mantidos. Tente novamente.');}
    finally{bloqueio.current=false;setEnviando(false);onOcupado?.(false);}
  }
  if(sucesso)return <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-7 text-center" role="status">
    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-3xl text-emerald-300">✓</div>
    <h3 className="text-2xl font-bold text-white">Inventário atualizado</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">Os dados de {escola.nome} foram registrados na base principal e já alimentam a Visão Geral.</p>
    <button type="button" onClick={onSucesso} className="mt-6 min-h-11 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950">Concluir e atualizar painel</button>
  </div>;
  if(!escola.pode_editar)return <p role="alert" className="rounded-2xl border border-amber-500/30 p-5 text-amber-100">{escola.aviso||'Este inventário está disponível apenas para consulta no seu perfil.'}</p>;
  if(!escola.modelos.length)return <p className="rounded-2xl border border-slate-700 p-5 text-slate-300">Esta escola não possui equipamentos recebidos com quantidade maior que zero.</p>;
  return <form onSubmit={enviar} className="space-y-5" aria-label="Preenchimento do inventário">
    <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
      {escola.ultima_resposta?<>Os valores do último inventário ({formatarDataInventario(escola.ultima_resposta.created_at)}) estão preenchidos. <strong>Confira cada modelo e atualize o que mudou.</strong></>:<>Primeiro levantamento desta escola. Distribua a quantidade recebida entre as quatro situações.</>}
    </div>
    {rascunho&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"><span>Há um preenchimento salvo nesta aba.</span><div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>{alterado.current=true;setValores({...iniciar(escola),...rascunho.valores});setNome(rascunho.nome);setCargo(rascunho.cargo);setObservacao(rascunho.observacao);envio.current=rascunho.envio;setRascunho(null);}} className="min-h-11 rounded-xl bg-amber-400 px-4 font-bold text-slate-950">Recuperar rascunho</button>
      <button type="button" onClick={()=>{setRascunho(null);try{sessionStorage.removeItem(chave);}catch{}}} className="min-h-11 rounded-xl border border-amber-500/30 px-4">Usar valores atuais</button></div></div>}
    {avisoRascunho&&<p className="rounded-xl border border-amber-500/30 p-3 text-sm text-amber-200">{avisoRascunho}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-slate-200">Conferência dos modelos</span><span className="text-slate-400">{completos} de {escola.modelos.length} com soma correta</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{width:`${completos/escola.modelos.length*100}%`}}/></div>
    <fieldset disabled={enviando} className="min-w-0 space-y-4 disabled:opacity-70">
      {escola.modelos.map(m=>{const preenchido=soma(m.id),correto=preenchido===m.recebido;return <section id={'modelo-'+m.id} key={m.id} className="scroll-mt-6 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4 sm:p-5">
        <div className="mb-5 flex items-start gap-3">
          {m.imagem_url&&<img src={m.imagem_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1"/>}
          <div className="min-w-0 flex-1"><h3 className="break-words font-bold leading-snug text-white">{m.nome}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{m.tipo}{m.ano_recebimento?` · ${m.ano_recebimento}`:''} · Recebidos: <strong className="text-slate-200">{m.recebido}</strong></p>
            <p aria-live="polite" className={`mt-2 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${correto?'bg-emerald-500/10 text-emerald-300':preenchido>m.recebido?'bg-rose-500/10 text-rose-300':'bg-cyan-500/10 text-cyan-300'}`}>{preenchido} / {m.recebido} distribuídos{correto?' · Conferido':''}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{CAMPOS_INVENTARIO.map(c=><label key={c.key} htmlFor={`${m.id}-${c.key}`} className="min-w-0"><span className={`mb-2 block min-h-9 text-xs font-semibold leading-4 sm:min-h-0 ${c.texto}`}>{c.label}</span>
          <input id={`${m.id}-${c.key}`} aria-label={`${c.label} — ${m.nome}`} type="number" min={0} max={m.recebido} step={1} inputMode="numeric" required value={valores[m.id]?.[c.key]??''} onChange={e=>mudar(m.id,c.key,e.target.value)} className="min-h-12 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-base font-semibold text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"/>
        </label>)}</div>
      </section>})}
      <section className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4 sm:p-5"><h3 className="mb-4 font-bold text-white">Responsável pelo levantamento</h3>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">Nome completo<input required minLength={3} maxLength={180} value={nome} onChange={e=>{alterado.current=true;setNome(e.target.value)}} autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-base text-white outline-none focus:border-cyan-400"/></label>
          <label className="text-sm text-slate-300">Cargo<input required minLength={2} maxLength={120} value={cargo} onChange={e=>{alterado.current=true;setCargo(e.target.value)}} className="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-base text-white outline-none focus:border-cyan-400"/></label></div>
        <label className="mt-4 block text-sm text-slate-300">Observações <span className="text-slate-500">· opcional</span><textarea maxLength={5000} rows={4} value={observacao} onChange={e=>{alterado.current=true;setObservacao(e.target.value)}} placeholder="Indique danos recorrentes, encaminhamentos de garantia e ações de localização." className="mt-2 w-full resize-y rounded-xl border border-slate-600 bg-slate-950 p-3 text-base text-white outline-none focus:border-cyan-400"/></label>
        <p className="mt-3 text-xs leading-5 text-slate-400">O envio registra a conta autenticada, o responsável informado e a data. Confira os dados antes de confirmar.</p>
      </section>
    </fieldset>
    {erro&&<div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200">{erro}{conflito&&onRecarregar&&<button type="button" onClick={onRecarregar} className="mt-3 block min-h-11 rounded-xl border border-rose-400/40 px-4 font-bold">Recarregar valores atuais</button>}</div>}
    <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-4"><p className="mb-3 text-xs leading-5 text-slate-400 sm:mb-0">{escola.modelos.length} modelos · a soma deve corresponder ao recebido.</p>
      <button type="submit" disabled={enviando} className="min-h-12 w-full rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{enviando?'Registrando inventário…':'Confirmar inventário'}</button>
    </div>
  </form>;
}
