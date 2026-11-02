import { conferirDemandaSaresp, type DemandaConferencia, type PlanoConferencia } from './operacao'
import type { IntegracaoSaresp } from './integracao'

export type PlanoDashboard = PlanoConferencia & {
  id: string
  escola_origem_id?: string | null
  escola_origem_nome?: string | null
  integracao_id?: string | null
  integracao?: IntegracaoSaresp | null
}

export function temPermanenciaIntegrada(demanda: DemandaConferencia, planos: PlanoDashboard[]) {
  return planos.some(p => p.status !== 'cancelado' && p.integracao && p.edicao_id === demanda.edicao_id &&
    p.escola_destino_id === demanda.escola_id)
}

/** Indicadores locais; não faz consultas nem confunde alocações com estoque físico. */
export function indicadoresRemanejamento(demandas: DemandaConferencia[], planos: PlanoDashboard[]) {
  const ativos = planos.filter(p => ['sugerido','aprovado','concluido'].includes(p.status))
  const cobertura = demandas.map(d => ({ demanda:d, ...conferirDemandaSaresp(d,ativos), integrado:temPermanenciaIntegrada(d,ativos) }))
  const grupos = new Map<string, number>()
  const origens = new Map<string, {nome:string;quantidade:number}>()
  const destinos = new Map<string, {nome:string;quantidade:number}>()
  const porStatus = ['sugerido','aprovado','concluido'].map(status => ({
    status, operacoes:ativos.filter(p => p.status===status).length,
    quantidade:ativos.filter(p => p.status===status).reduce((s,p)=>s+Number(p.quantidade||0),0),
  }))
  for (const p of ativos) {
    if (p.integracao_id) grupos.set(p.integracao_id,Math.max(grupos.get(p.integracao_id)||0,Number(p.quantidade||0)))
    const origem=p.escola_origem_id||p.escola_origem_nome||'Sem unidade', destino=p.escola_destino_id||p.escola_destino_nome||'Sem unidade'
    origens.set(origem,{nome:p.escola_origem_nome||'Unidade cedente',quantidade:(origens.get(origem)?.quantidade||0)+Number(p.quantidade||0)})
    destinos.set(destino,{nome:p.escola_destino_nome||'Unidade contemplada',quantidade:(destinos.get(destino)?.quantidade||0)+Number(p.quantidade||0)})
  }
  const faltantes=cobertura.filter(c=>c.falta>0).sort((a,b)=>b.falta-a.falta)
  return {
    operacoes:ativos.length, quantidade:ativos.reduce((s,p)=>s+Number(p.quantidade||0),0),
    cedentes:origens.size, contempladas:destinos.size, aplicacoes:demandas.length,
    capacidadePropria:cobertura.filter(c=>c.deficit===0).length,
    cobertasPeloPlano:cobertura.filter(c=>c.deficit>0&&c.falta===0).length,
    pendentes:faltantes.length, quantidadeFaltante:faltantes.reduce((s,c)=>s+c.falta,0),
    quantidadeSemConfirmacao:cobertura.reduce((s,c)=>s+c.faltaConfirmar,0),
    integracoes:grupos.size, equipamentosEmPermanencia:[...grupos.values()].reduce((s,q)=>s+q,0),
    percentualCoberto:demandas.length?Math.round((demandas.length-faltantes.length)*100/demandas.length):0,
    revisar:cobertura.filter(c=>c.excedente>0&&!c.integrado), cobertura,faltantes,porStatus,
    principaisCedentes:[...origens.values()].sort((a,b)=>b.quantidade-a.quantidade),
    principaisContempladas:[...destinos.values()].sort((a,b)=>b.quantidade-a.quantidade),
  }
}
