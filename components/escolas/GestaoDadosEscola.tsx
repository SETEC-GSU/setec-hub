"use client"
import { useEffect,useRef,useState } from "react"
import { createPortal } from "react-dom"
import { History,Pencil,RefreshCw,Save,X } from "lucide-react"
import { CAMPOS_ESCOLA,ROTULOS_ESCOLA,validarAlteracoesEscola,type AlteracaoEscola } from "@/lib/escolas/edicao"
import { dataHoraBR,texto,type Escola } from "@/lib/escolas/modelo"
import { botaoEscola,campoEscola } from "./ElementosEscola"
import styles from "./ModalEscola.module.css"

export default function GestaoDadosEscola({escolaId,aoSalvar}:{escolaId:string;aoSalvar:()=>void}){
  const [permitido,setPermitido]=useState(false),[modal,setModal]=useState<"editar"|"historico"|null>(null)
  useEffect(()=>{const c=new AbortController();void fetch("/api/escolas/gestao?acao=acesso",{cache:"no-store",signal:c.signal}).then(async r=>{if(r.ok){const p=await r.json();if(!c.signal.aborted)setPermitido(p.podeEditar===true)}}).catch(()=>undefined);return()=>c.abort()},[])
  if(!permitido)return null
  return <><button type="button" className={botaoEscola} onClick={()=>setModal("editar")}><Pencil size={16} aria-hidden="true"/>Editar dados</button><button type="button" className={botaoEscola} onClick={()=>setModal("historico")}><History size={16} aria-hidden="true"/>Histórico</button>{modal==="editar"&&<Editor escolaId={escolaId} fechar={()=>setModal(null)} salvo={()=>{setModal(null);aoSalvar()}}/>}{modal==="historico"&&<Historico escolaId={escolaId} fechar={()=>setModal(null)}/>}</>
}
function usarDialogo(){
  const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),vivo=useRef(true)
  useEffect(()=>{vivo.current=true;const anterior=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{vivo.current=false;request.current?.abort();dialog.current?.close();anterior?.focus({preventScroll:true})}},[])
  return {dialog,request,vivo}
}
function inicial(escola:Escola){return Object.fromEntries(CAMPOS_ESCOLA.filter(c=>Object.hasOwn(escola,c.id)).map(c=>{const v=String((escola as Record<string,unknown>)[c.id]??"");return [c.id,c.tipo==="time"?v.slice(0,5):v]}))}
function Editor({escolaId,fechar,salvo}:{escolaId:string;fechar:()=>void;salvo:()=>void}){
  const {dialog,request,vivo}=usarDialogo(),[base,setBase]=useState<{escola:Escola;versao:string}|null>(null),[form,setForm]=useState<Record<string,string>>({})
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[erro,setErro]=useState(""),[aviso,setAviso]=useState(""),[descartar,setDescartar]=useState(false)
  const trava=useRef(false),referencia=base?inicial(base.escola):{},sujo=Object.keys(form).some(k=>form[k]!==referencia[k])
  async function carregar(preservar=false){
    if(trava.current)return;trava.current=true;setLoading(true);setErro("");const c=new AbortController();request.current?.abort();request.current=c
    const pendentes=preservar?Object.fromEntries(Object.entries(form).filter(([k,v])=>v!==referencia[k])):{}
    try{const r=await fetch(`/api/escolas/gestao?acao=editar&escolaId=${encodeURIComponent(escolaId)}`,{cache:"no-store",signal:c.signal}),p=await r.json();if(!r.ok)throw new Error(p.erro||"Não foi possível abrir a edição.");if(vivo.current&&!c.signal.aborted){setBase(p);setForm({...inicial(p.escola),...pendentes});setAviso(preservar?"Referência atualizada. Seus campos alterados foram preservados; confira os valores antes de salvar.":"")}}
    catch(e){if(vivo.current&&!c.signal.aborted)setErro(e instanceof Error?e.message:"Falha ao consultar a escola.")}
    finally{if(request.current===c){trava.current=false;if(vivo.current)setLoading(false)}}
  }
  useEffect(()=>{void carregar();return()=>{request.current?.abort();trava.current=false}},[]) // Instância criada para uma escola específica.
  function tentarFechar(){if(saving||loading)return;if(sujo){setDescartar(true);return}fechar()}
  async function salvar(){
    if(trava.current||!base||!sujo)return
    let dados;try{dados=validarAlteracoesEscola(Object.fromEntries(Object.entries(form).filter(([k,v])=>v!==referencia[k])))}catch(e){setErro(e instanceof Error?e.message:"Confira os campos.");return}
    trava.current=true;setSaving(true);setErro("");setAviso("");const c=new AbortController();request.current=c;const timer=setTimeout(()=>c.abort(),22000)
    try{const r=await fetch("/api/escolas/gestao",{method:"PATCH",headers:{"Content-Type":"application/json"},cache:"no-store",signal:c.signal,body:JSON.stringify({escolaId,versao:base.versao,dados})}),p=await r.json();if(!r.ok)throw new Error(p.erro||"Não foi possível confirmar a alteração.");if(vivo.current)salvo()}
    catch(e){if(vivo.current)setErro(c.signal.aborted?"Não foi possível confirmar a gravação. Recarregue a referência antes de tentar novamente; seu preenchimento foi mantido.":e instanceof Error?e.message:"Não foi possível salvar a escola.")}
    finally{clearTimeout(timer);trava.current=false;if(vivo.current)setSaving(false)}
  }
  return createPortal(<dialog ref={dialog} className={styles.janela} aria-labelledby="editar-escola-titulo" onCancel={e=>{e.preventDefault();tentarFechar()}}>
    <header className={styles.cabecalho}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">Administração / SEINTEC</p><h2 id="editar-escola-titulo" className="mt-2 text-xl font-bold text-white">Editar dados da escola</h2>{base&&<p className="mt-2 break-words text-sm text-slate-400">{base.escola.nome_escola} · CIE {base.escola.cie}</p>}</div><button type="button" autoFocus disabled={saving||loading} aria-label="Fechar edição da escola" onClick={tentarFechar} className={`${botaoEscola} h-11 w-11 shrink-0 !p-0`}><X size={18}/></button></div></header>
    <div className={`${styles.corpo} space-y-4`}>
      {loading&&<p role="status" className="text-sm text-slate-400">Consultando o cadastro atual…</p>}
      {erro&&<div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"><p>{erro}</p><button type="button" onClick={()=>void carregar(true)} disabled={saving||loading} className={`${botaoEscola} mt-3`}><RefreshCw size={15} aria-hidden="true"/>Recarregar referência</button></div>}
      {aviso&&<p role="status" className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-sm text-blue-100">{aviso}</p>}
      {descartar&&<div role="alert" className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100"><p>Há alterações ainda não salvas.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>setDescartar(false)} className={botaoEscola}>Continuar editando</button><button type="button" onClick={fechar} className={botaoEscola}>Descartar alterações</button></div></div>}
      {base&&<><fieldset disabled={saving||loading} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><legend className="sr-only">Dados cadastrais da escola</legend>{CAMPOS_ESCOLA.filter(c=>Object.hasOwn(form,c.id)).map(c=><label key={c.id} className={`min-w-0 text-sm font-semibold text-slate-300 ${c.tipo==="textarea"||c.id==="endereco"?"sm:col-span-2":""}`}>{c.label}{c.tipo==="textarea"?<textarea aria-label={c.label} value={form[c.id]} maxLength={c.max} rows={4} onChange={e=>setForm(f=>({...f,[c.id]:e.target.value}))} className={`${campoEscola} mt-2 font-normal`}/>:<input aria-label={c.label} value={form[c.id]} type={c.tipo==="coordenada"?"text":c.tipo} inputMode={c.tipo==="coordenada"?"decimal":undefined} step={c.tipo==="number"?1:undefined} min={c.tipo==="number"?0:undefined} max={c.tipo==="number"?1000000:undefined} maxLength={c.max} onChange={e=>setForm(f=>({...f,[c.id]:e.target.value}))} className={`${campoEscola} mt-2 font-normal`}/>}</label>)}</fieldset><p className="text-xs leading-relaxed text-slate-400">A alteração ficará registrada com seu usuário, data e campos alterados. Nome e CIE permanecem na identificação da unidade; ajustes nesses vínculos seguem pela Gestão de Escolas.</p></>}
    </div><footer className={styles.rodape}><button type="button" onClick={tentarFechar} disabled={saving||loading} className={botaoEscola}>Cancelar</button><button type="button" onClick={()=>void salvar()} disabled={saving||loading||!base||!sujo} className={`${botaoEscola} !border-blue-500 !bg-blue-600 !text-white`}><Save size={16} aria-hidden="true"/>{saving?"Salvando…":"Salvar alterações"}</button></footer>
  </dialog>,document.body)
}
function Historico({escolaId,fechar}:{escolaId:string;fechar:()=>void}){
  const {dialog,request,vivo}=usarDialogo(),[itens,setItens]=useState<AlteracaoEscola[]>([]),[proximo,setProximo]=useState<string|null>(null),[loading,setLoading]=useState(false),[erro,setErro]=useState("")
  const trava=useRef(false)
  async function carregar(cursor?:string){if(trava.current)return;trava.current=true;setLoading(true);setErro("");const c=new AbortController();request.current=c
    try{const r=await fetch(`/api/escolas/gestao?acao=historico&escolaId=${encodeURIComponent(escolaId)}${cursor?`&cursor=${cursor}`:""}`,{signal:c.signal,cache:"no-store"}),p=await r.json();if(!r.ok)throw new Error(p.erro||"Não foi possível consultar o histórico.");if(vivo.current){setItens(a=>cursor?[...a,...p.itens]:p.itens);setProximo(p.proximo)}}catch(e){if(vivo.current&&!c.signal.aborted)setErro(e instanceof Error?e.message:"Falha ao consultar o histórico.")}finally{if(request.current===c){trava.current=false;if(vivo.current)setLoading(false)}}}
  useEffect(()=>{void carregar();return()=>{request.current?.abort();trava.current=false}},[])
  return createPortal(<dialog ref={dialog} className={styles.janela} aria-labelledby="historico-escola-titulo" onCancel={e=>{e.preventDefault();fechar()}}><header className={styles.cabecalho}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">Restrito a admin e SEINTEC</p><h2 id="historico-escola-titulo" className="mt-2 text-xl font-bold text-white">Histórico de alterações</h2><p className="mt-2 text-sm text-slate-400">Autor, data e valores anteriores e novos do cadastro.</p></div><button type="button" autoFocus aria-label="Fechar histórico da escola" className={`${botaoEscola} h-11 w-11 shrink-0 !p-0`} onClick={fechar}><X size={18}/></button></div></header><div className={`${styles.corpo} space-y-4`}>
    {erro&&<p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p>}
    {itens.map(item=><article key={item.id} className="min-w-0 rounded-2xl border border-slate-800 p-4"><h3 className="break-words font-semibold text-slate-100">{item.usuario_nome}</h3><p className="mt-1 text-xs text-slate-400">{dataHoraBR(item.created_at)} · {item.usuario_role}</p><dl className="mt-4 space-y-4">{Object.entries(item.alteracoes).map(([key,v])=><div key={key} className="min-w-0"><dt className="text-sm font-semibold text-blue-200">{ROTULOS_ESCOLA[key]||key}</dt><dd className="mt-2 grid gap-2 sm:grid-cols-2">{[["Antes",v.antes],["Depois",v.depois]].map(([label,valor])=><div key={String(label)} className="min-w-0 rounded-xl bg-slate-950/70 p-3"><p className="text-xs text-slate-500">{String(label)}</p><p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-300 [overflow-wrap:anywhere]">{texto(valor,"Não informado")}</p></div>)}</dd></div>)}</dl></article>)}
    {!loading&&!erro&&!itens.length&&<p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">Nenhuma alteração registrada desde a ativação do histórico.</p>}{loading&&<p role="status" className="text-sm text-slate-400">Consultando histórico…</p>}
    {(proximo||erro)&&<button type="button" className={botaoEscola} disabled={loading} onClick={()=>void carregar(proximo||undefined)}>{erro?"Tentar novamente":"Carregar mais"}</button>}
    </div><footer className={styles.rodape}><button type="button" className={botaoEscola} onClick={fechar}>Fechar</button></footer></dialog>,document.body)
}
