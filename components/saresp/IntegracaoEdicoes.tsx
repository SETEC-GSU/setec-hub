"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { CandidatoIntegracao, PreviaIntegracao } from '@/lib/saresp/integracao'
import type { PlanoDashboard } from '@/lib/saresp/indicadores'
import { formatarPeriodo } from '@/lib/saresp/operacao'
import Modal from './ModalSaresp'
import styles from './PainelRemanejamento.module.css'

function mensagem(erro:unknown) {
  const e=erro as {code?:string;message?:string}
  return ['PGRST202','42883','42703'].includes(e?.code||'')
    ? 'Para integrar as edições, aplique o SQL 015-saresp-integracao-edicoes.sql e atualize os planos.'
    : e?.message || 'Não foi possível concluir. Atualize os planos antes de tentar novamente.'
}

export default function IntegracaoEdicoes({edicaoId,planos,onClose,onAplicado}:{edicaoId:string;planos:PlanoDashboard[];onClose:()=>void;onAplicado:()=>void|Promise<void>}) {
  const supabase=useMemo(()=>createClient(),[])
  const [lista,setLista]=useState<CandidatoIntegracao[]>([]),[previa,setPrevia]=useState<PreviaIntegracao|null>(null)
  const [loading,setLoading]=useState(true),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[busca,setBusca]=useState(''),[limitado,setLimitado]=useState(false)
  const mutex=useRef(false)
  const existentes=useMemo(()=>Array.from(new Map(planos.filter(p=>p.integracao).map(p=>[p.integracao!.id,p.integracao!])).values()),[planos])
  useEffect(()=>{
    let ativo=true
    setLoading(true);setErro('')
    const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),25000)
    void (async()=>{
      try {
        const {data,error}=await supabase.rpc('hub_saresp_sugestoes_integracao',{p_edicao_id:edicaoId}).abortSignal(controller.signal)
        if(error)throw error
        if(!ativo)return
        setLista(data?.candidatos||[]);setLimitado(Boolean(data?.limitado))
      } catch(e) {
        if(!ativo)return
        if(!controller.signal.aborted)setErro(mensagem(e))
        else setErro('A análise demorou mais que o esperado. Feche e abra novamente.')
      } finally {window.clearTimeout(timer);if(ativo)setLoading(false)}
    })()

    return()=>{ativo=false;controller.abort();window.clearTimeout(timer)}
  },[supabase,edicaoId])
  async function analisar(c:CandidatoIntegracao) {
    if(mutex.current)return;mutex.current=true;setOcupado(true);setErro('')
    try {const {data,error}=await supabase.rpc('hub_saresp_avaliar_integracao',{p_plano_id:c.plano_id,p_demanda_id:c.demanda_id,p_seguinte_id:c.seguinte_id});if(error)throw error;setPrevia(data as PreviaIntegracao)}
    catch(e){setErro(mensagem(e))}finally{mutex.current=false;setOcupado(false)}
  }
  async function integrar() {
    if(!previa||!previa.viavel||mutex.current)return;mutex.current=true;setOcupado(true);setErro('')
    try {const {error}=await supabase.rpc('hub_saresp_integrar',{p_plano_id:previa.plano_id,p_demanda_id:previa.demanda_id,p_seguinte_id:previa.seguinte_id,p_revisao:previa.revisao});if(error)throw error;await onAplicado()}
    catch(e){setErro(mensagem(e));setPrevia(null)}finally{mutex.current=false;setOcupado(false)}
  }
  async function desfazer(id:string) {
    if(mutex.current||!window.confirm('Desfazer a integração e restaurar as quantidades anteriores? O registro incluído automaticamente na segunda edição, quando houver, será removido. Os e-mails já copiados precisarão ser revisados.'))return
    mutex.current=true;setOcupado(true);setErro('')
    try {const {error}=await supabase.rpc('hub_saresp_desfazer_integracao',{p_integracao_id:id});if(error)throw error;await onAplicado()}
    catch(e){setErro(mensagem(e))}finally{mutex.current=false;setOcupado(false)}
  }
  const recorte=lista.filter(c=>`${c.origem} ${c.destino} ${c.edicao_a} ${c.edicao_b}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))
  return <Modal title="Continuidade entre duas edições" onClose={()=>{if(!ocupado)onClose()}} maxWidth="max-w-6xl">
    <div className={styles.root}>
      <div className={styles.head}><div><h3>Uma retirada. Dois períodos.</h3><p>Mesma cedente e contemplada, com necessidade nas duas aplicações e próximo dia útil. O maior quantitativo fica com a escola até a última aplicação.</p></div></div>
      {erro&&<div role="alert" className={styles.error}>{erro}</div>}
      {previa ? <>
        <div className={styles.surface}><span className={styles.badge}>Prévia para conferência</span><h4 style={{marginTop:14}}>{previa.origem} → {previa.destino}</h4>
          <div className={styles.columns}><div><strong>{previa.edicao_a}</strong><p className={styles.muted}>{formatarPeriodo(previa.inicio_a,previa.fim_a)} · Necessidade: {previa.necessidade_a}<br/>Quantidade anterior deste plano: {previa.anterior_a}</p></div><div><strong>{previa.edicao_b}</strong><p className={styles.muted}>{formatarPeriodo(previa.inicio_b,previa.fim_b)} · Necessidade: {previa.necessidade_b}<br/>{previa.seguinte_id?`Quantidade anterior deste plano: ${previa.anterior_b}`:'O empréstimo será incluído no plano desta edição.'}</p></div></div>
        </div>
        <div className={styles.kpis}><div className={styles.kpi}><span>Empréstimo físico único</span><strong>{previa.quantidade}</strong><small>Mesmo quantitativo nos dois planos</small></div><div className={styles.kpi}><span>Retirada única</span><strong style={{fontSize:20}}>{formatarPeriodo(previa.retirada,previa.retirada)}</strong><small>Antes da primeira aplicação</small></div><div className={styles.kpi}><span>Devolução final</span><strong style={{fontSize:20}}>{formatarPeriodo(previa.devolucao,previa.devolucao)}</strong><small>Após a última aplicação</small></div></div>
        <div className={previa.viavel?styles.notice:styles.error}>{previa.motivo}<br/>Disponíveis durante todo o intervalo: <strong>{previa.disponivel}</strong>. Os outros empréstimos e a necessidade própria da cedente são protegidos.</div>
        <p className={styles.muted}>A quantidade mantém o maior valor já planejado ou necessário após considerar outros empréstimos. Os IDs existentes são preservados. As duas edições passam a exibir o mesmo empréstimo físico e a permitir um e-mail e uma guia com ambos os períodos.</p>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={()=>setPrevia(null)} disabled={ocupado}>Voltar</button><button type="button" className={styles.primary} disabled={ocupado||!previa.viavel} onClick={integrar}>{ocupado?'Integrando...':`Confirmar integração de ${previa.quantidade} equipamentos`}</button></div>
      </> : <>
        <input className={styles.input} placeholder="Buscar escola ou edição" value={busca} onChange={e=>setBusca(e.target.value)} aria-label="Buscar sugestões de continuidade"/>
        {loading&&<p className={styles.muted}>Procurando aplicações no próximo dia útil...</p>}
        {!loading&&!lista.length&&!erro&&<div className={styles.notice}>Não há pares novos elegíveis nesta edição. É necessário ter falta nas duas aplicações, com um plano da primeira edição e a mesma escola no próximo dia útil.</div>}
        <div className={styles.list}>{recorte.map(c=><div className={styles.candidate} key={`${c.plano_id}-${c.demanda_id}-${c.seguinte_id||'nova'}`}><h4>{c.origem} → {c.destino}</h4><p className={styles.muted}>{c.edicao_a} · {formatarPeriodo(c.inicio_a,c.inicio_a)}<br/>{c.edicao_b} · {formatarPeriodo(c.inicio_b,c.inicio_b)}</p><div className={styles.actions}><span className={styles.badge}>{c.seguinte_id?'Vincular dois planos existentes':'Aproveitar o empréstimo na próxima edição'}</span><button type="button" className={styles.secondary} disabled={ocupado} onClick={()=>analisar(c)}>Analisar continuidade</button></div></div>)}</div>
        {limitado&&<p className={styles.muted}>Exibidas as primeiras 200 sugestões. Integre ou revise os pares já analisados e atualize para consultar os demais.</p>}
      </>}
      {!!existentes.length&&<section className={styles.surface}><h4>Conjuntos desta edição</h4>{existentes.map(g=><div className={styles.item} key={g.id}><div className={styles.line}><strong>{g.quantidade} equipamentos · {g.edicoes.map(e=>e.titulo).join(' / ')}</strong><button type="button" className={styles.danger} disabled={ocupado} onClick={()=>desfazer(g.id)}>Desfazer integração</button></div><p className={styles.muted}>Retirada: {formatarPeriodo(g.retirada,g.retirada)} · Devolução: {formatarPeriodo(g.devolucao,g.devolucao)}</p></div>)}</section>}
    </div>
  </Modal>
}
