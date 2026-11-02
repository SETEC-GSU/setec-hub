"use client"

import { useMemo } from 'react'
import Modal from './ModalSaresp'
import styles from './PainelRemanejamento.module.css'
import { indicadoresRemanejamento, type PlanoDashboard } from '@/lib/saresp/indicadores'
import { formatarPeriodo, type DemandaConferencia, type EdicaoPeriodo } from '@/lib/saresp/operacao'

const numero = (n:number) => n.toLocaleString('pt-BR')
const statusNome:Record<string,string> = {sugerido:'Aguardando aprovação',aprovado:'Aprovados',concluido:'Concluídos'}

export default function DashboardRemanejamento({edicao,resultados,planos,onClose,onPdf}:{
  edicao:(EdicaoPeriodo & {titulo?:string|null})|null
  resultados:DemandaConferencia[]
  planos:PlanoDashboard[]
  onClose:()=>void
  onPdf:()=>void
}) {
  const dados = useMemo(()=>indicadoresRemanejamento(resultados,planos),[resultados,planos])
  const volta = 2*Math.PI*51
  const max = Math.max(1,...dados.porStatus.map(s=>s.quantidade))
  return <Modal title="Dashboard do remanejamento" onClose={onClose} maxWidth="max-w-7xl">
    <div className={styles.root}>
      <div className={styles.head}>
        <div><span className={styles.badge}>Edição selecionada</span><h3 style={{marginTop:12}}>{edicao?.titulo||'SARESP Digital'}</h3>
          <p>{formatarPeriodo(edicao?.data_prova_padrao,edicao?.data_prova_fim_padrao||edicao?.data_prova_padrao)}<br/>Cobertura, execução do plano e continuidade entre edições.</p></div>
        <button type="button" className={styles.primary} onClick={onPdf}>Salvar dashboard em PDF</button>
      </div>
      <div className={styles.kpis}>
        {[
          ['Equipamentos no plano',dados.quantidade,'Alocações desta edição'],['Operações ativas',dados.operacoes,`${dados.cedentes} cedente(s) → ${dados.contempladas} contemplada(s)`],
          ['Quantidade ainda necessária',dados.quantidadeFaltante,`${dados.pendentes} aplicação(ões) com falta`],['Cobertura prevista',`${dados.percentualCoberto}%`,`${dados.aplicacoes-dados.pendentes} de ${dados.aplicacoes} aplicações`],
          ['Empréstimos integrados',dados.integracoes,`${dados.equipamentosEmPermanencia} equipamentos em permanência planejada`],['Aguardam confirmação',dados.quantidadeSemConfirmacao,'Falta descontando apenas aprovados/concluídos'],
        ].map(([nome,valor,detalhe])=><div className={styles.kpi} key={String(nome)}><span>{nome}</span><strong>{typeof valor==='number'?numero(valor):valor}</strong><small>{detalhe}</small></div>)}
      </div>
      <div className={styles.columns}>
        <section className={styles.surface}><h4>Cobertura das aplicações</h4><div className={styles.ring}>
          <svg viewBox="0 0 130 130" role="img" aria-label={`${dados.percentualCoberto}% das aplicações têm cobertura prevista`}>
            <circle cx="65" cy="65" r="51" fill="none" stroke="#1e334d" strokeWidth="12"/>
            <circle cx="65" cy="65" r="51" fill="none" stroke="#22d3ee" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${volta*dados.percentualCoberto/100} ${volta}`} transform="rotate(-90 65 65)"/>
            <text x="65" y="66" textAnchor="middle" fill="white" fontSize="23" fontWeight="800">{dados.percentualCoberto}%</text>
            <text x="65" y="83" textAnchor="middle" fill="#94a3b8" fontSize="8">COBERTURA PREVISTA</text>
          </svg>
          <div className={styles.legend}><div><i style={{background:'#34d399'}}/>Capacidade própria<strong>{dados.capacidadePropria}</strong></div><div><i style={{background:'#22d3ee'}}/>Cobertas pelo plano<strong>{dados.cobertasPeloPlano}</strong></div><div><i style={{background:'#fb7185'}}/>Ainda precisam de apoio<strong>{dados.pendentes}</strong></div></div>
        </div></section>
        <section className={styles.surface}><h4>Equipamentos por situação do plano</h4>{dados.porStatus.map(s=><div className={styles.item} key={s.status}>
          <div className={styles.line}><strong>{statusNome[s.status]}</strong><span>{numero(s.quantidade)} · {s.operacoes} operação(ões)</span></div><div className={styles.track}><div className={styles.fill} style={{width:`${100*s.quantidade/max}%`}}/></div>
        </div>)}</section>
      </div>
      <div className={styles.columns}>
        <section className={styles.surface}><h4>Unidades contempladas</h4>{dados.principaisContempladas.slice(0,8).map(r=><div className={styles.item} key={r.nome}><div className={styles.line}><strong>{r.nome}</strong><span>{numero(r.quantidade)}</span></div></div>)}{!dados.contempladas&&<p className={styles.muted}>Nenhum empréstimo no plano.</p>}</section>
        <section className={styles.surface}><h4>Unidades cedentes</h4>{dados.principaisCedentes.slice(0,8).map(r=><div className={styles.item} key={r.nome}><div className={styles.line}><strong>{r.nome}</strong><span>{numero(r.quantidade)}</span></div></div>)}{!dados.cedentes&&<p className={styles.muted}>Nenhuma cedente no plano.</p>}</section>
      </div>
      <section className={styles.surface}><h4>Pontos de atenção</h4>
        {!dados.faltantes.length&&<div className={styles.notice}>As aplicações cadastradas têm cobertura prevista pelo cadastro próprio ou pelos empréstimos do plano.</div>}
        {dados.faltantes.slice(0,12).map(c=><div className={styles.item} key={c.demanda.demanda_id||`${c.demanda.cie}-${c.demanda.serie}`}><div className={styles.line}><strong>{c.demanda.escola_nome} · {c.demanda.serie}</strong><span style={{color:'#fda4af'}}>Faltam {numero(c.falta)}</span></div><p className={styles.muted}>Maior turno: {c.maiorTurno} · Cadastrados: {c.cadastrados} · Previsto: {c.previsto}</p></div>)}
        {!!dados.revisar.length&&<p className={styles.muted}>{dados.revisar.length} recebimento(s) acima da falta inicial precisam de conferência. Permanências integradas têm justificativa própria.</p>}
      </section>
      <div className={styles.notice}>Dados da edição inteira. “Previsto” inclui sugeridos, aprovados e concluídos. Status do Hub não comprova entrega física. Um empréstimo integrado aparece nos dois planos, com reserva física única no intervalo; não some as duas edições para medir estoque.</div>
    </div>
  </Modal>
}
