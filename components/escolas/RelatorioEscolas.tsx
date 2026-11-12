"use client"
import { useEffect,useRef,useState } from "react"
import { createPortal } from "react-dom"
import { Download,FileChartColumn,RefreshCw,X } from "lucide-react"
import { numero,dataHoraBR } from "@/lib/escolas/modelo"
import type { FiltrosEscolas,PedidoRelatorioEscolar,PreviaRelatorioEscolar } from "@/lib/escolas/relatorios"
import { botaoEscola } from "./ElementosEscola"
import styles from "./ModalEscola.module.css"
const PADRAO:FiltrosEscolas={busca:"",status:"todas",tecnico:"todos",ordem:"nome"}
export default function RelatorioEscolas({escolaId,filtros=PADRAO,total,filtradas,className}:{escolaId?:string;filtros?:FiltrosEscolas;total?:number;filtradas?:number;className?:string}){
  const [aberto,setAberto]=useState(false)
  return <><button type="button" onClick={()=>setAberto(true)} className={className||botaoEscola}><FileChartColumn size={17} aria-hidden="true"/>Gerar PDF</button>{aberto&&<ModalRelatorio escolaId={escolaId} filtros={filtros} total={total} filtradas={filtradas} fechar={()=>setAberto(false)}/>}</>
}
function ModalRelatorio({escolaId,filtros,total,filtradas,fechar}:{escolaId?:string;filtros:FiltrosEscolas;total?:number;filtradas?:number;fechar:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),vivo=useRef(true),trava=useRef(false)
  const [escopo,setEscopo]=useState<PedidoRelatorioEscolar["escopo"]>(escolaId?"individual":"todas"),[detalhar,setDetalhar]=useState(true)
  const [previa,setPrevia]=useState<PreviaRelatorioEscolar|null>(null),[ocupado,setOcupado]=useState<"previa"|"pdf"|null>(null),[erro,setErro]=useState(""),[aviso,setAviso]=useState("")
  useEffect(()=>{vivo.current=true;const anterior=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{vivo.current=false;request.current?.abort();dialog.current?.close();anterior?.focus({preventScroll:true})}},[])
  function alterar(mudanca:()=>void){request.current?.abort();mudanca();setPrevia(null);setErro("");setAviso("")}
  async function solicitar(acao:"previa"|"pdf"){
    if(trava.current||acao==="pdf"&&!previa)return
    trava.current=true;setOcupado(acao);setErro("");setAviso("")
    const c=new AbortController();request.current=c;const timer=setTimeout(()=>c.abort(),acao==="pdf"?65000:30000)
    try{
      const res=await fetch("/api/escolas/relatorios",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({acao,pedido:{escolaId,escopo,detalhar,filtros},assinatura:previa?.assinatura}),signal:c.signal,cache:"no-store"})
      if(!res.ok){const r=await res.json().catch(()=>null);if([401,403,409].includes(res.status))setPrevia(null);throw new Error(r?.erro||"Não foi possível gerar o relatório.")}
      if(acao==="previa"){const r=await res.json();if(vivo.current&&!c.signal.aborted)setPrevia(r)}
      else{if(!res.headers.get("content-type")?.includes("application/pdf"))throw new Error("A resposta não é um PDF válido.");const blob=await res.blob();if(!vivo.current||c.signal.aborted)return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1]||"SETEC_Escolas.pdf";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setAviso("PDF preparado para download.")}
    }catch(e){if(vivo.current)setErro(c.signal.aborted?"A geração foi interrompida. As opções foram mantidas; tente novamente.":e instanceof Error?e.message:"Falha ao gerar o PDF.")}
    finally{clearTimeout(timer);trava.current=false;if(vivo.current)setOcupado(null)}
  }
  return createPortal(<dialog ref={dialog} aria-labelledby="escola-pdf-titulo" onCancel={e=>{e.preventDefault();fechar()}} className={styles.janela}>
    <header className={styles.cabecalho}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">SETEC / SEINTEC · Escolas</p><h2 id="escola-pdf-titulo" className="mt-2 text-xl font-bold text-white sm:text-2xl">{escolaId?"Relatório da escola":"Relatório consolidado das escolas"}</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Cadastro, infraestrutura e inventário sincronizado no padrão institucional.</p></div><button autoFocus type="button" aria-label="Fechar relatório escolar" onClick={fechar} className={`${botaoEscola} h-11 w-11 shrink-0 !p-0`}><X size={19}/></button></div></header>
    <div className={`${styles.corpo} space-y-5`}>
      <fieldset disabled={!!ocupado} className="space-y-4 disabled:opacity-60"><legend className="sr-only">Configurar relatório escolar</legend>
        {!escolaId&&<div className="grid gap-3 sm:grid-cols-2">{([{id:"todas",label:"Todas as escolas",sub:`${numero(total)} unidades no painel`},{id:"filtradas",label:"Filtros atuais do painel",sub:`${numero(filtradas)} unidades no recorte`}]as const).map(o=><button key={o.id} type="button" aria-pressed={escopo===o.id} onClick={()=>alterar(()=>setEscopo(o.id))} className={`rounded-2xl border p-4 text-left ${escopo===o.id?"border-blue-400 bg-blue-500/10":"border-slate-700 bg-slate-950/40"}`}><strong className="text-sm text-white">{o.label}</strong><span className="mt-2 block text-xs text-slate-400">{o.sub}</span></button>)}</div>}
        {!escolaId&&<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 p-4"><input type="checkbox" checked={detalhar} onChange={e=>alterar(()=>setDetalhar(e.target.checked))} className="mt-1 h-4 w-4 accent-blue-500"/><span><strong className="text-sm text-slate-200">Incluir fichas e inventário de cada escola</strong><span className="mt-1 block text-xs leading-relaxed text-slate-400">Adiciona contatos, infraestrutura, observações e todos os modelos por unidade ao consolidado.</span></span></label>}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-400">Inclui equipamentos funcionando, aguardando garantia, danificados, não localizados e saldo a classificar. As plataformas de recarga aparecem separadamente.</div>
      </fieldset>
      {erro&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</p>}
      {previa&&<section aria-label="Prévia do relatório escolar" className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4"><h3 className="font-semibold text-white">{previa.nome||"Resumo da emissão"}</h3><p className="mt-1 text-xs text-slate-400">Conferido em {dataHoraBR(previa.geradoEm)}</p><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{[["Escolas",previa.escolas],["Modelos",previa.modelos],["Recebidos",previa.totais.recebido],["Funcionando declarados",previa.totais.funcionando],["Plataformas",previa.totais.plataformas],["A classificar",previa.totais.conferir]].map(([k,v])=><div key={k} className="rounded-xl bg-slate-950/60 p-3"><dt className="text-xs text-slate-400">{k}</dt><dd className="mt-1 text-xl font-bold text-white">{numero(v)}</dd></div>)}</dl>{previa.alertas>0&&<p className="mt-4 text-xs leading-relaxed text-amber-200">{previa.alertas} apontamento(s) de conferência no recorte; {previa.semEnvio} escola(s) sem levantamento válido. Os detalhes constam no PDF.</p>}</section>}
      {aviso&&<p role="status" className="text-sm text-emerald-300">{aviso}</p>}
    </div><footer className={styles.rodape}><button type="button" disabled={!!ocupado} onClick={()=>void solicitar("previa")} className={botaoEscola}><RefreshCw size={16} aria-hidden="true"/>{ocupado==="previa"?"Consultando…":previa?"Atualizar prévia":"Conferir dados"}</button><button type="button" disabled={!!ocupado||!previa} onClick={()=>void solicitar("pdf")} className={`${botaoEscola} !border-blue-500 !bg-blue-600 !text-white disabled:!bg-slate-800`}><Download size={16} aria-hidden="true"/>{ocupado==="pdf"?"Gerando PDF…":"Baixar PDF"}</button></footer>
  </dialog>,document.body)
}
