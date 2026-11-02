import {
  conferirDemandaSaresp,
  deslocarDiaUtil,
  fimPeriodo,
  formatarPeriodo,
  type DemandaConferencia,
  type EdicaoPeriodo,
  type PeriodoSaresp,
} from './operacao'
import type { IntegracaoSaresp } from './integracao'
import { indicadoresRemanejamento, temPermanenciaIntegrada } from './indicadores'
import { estilosDocumentoSaresp, estilosComplementaresSaresp } from './documentos-estilos'
import { BRASAO_SP } from './documentos-identidade'
import { paginacaoDocumentoSaresp } from './documentos-paginacao'

type EdicaoDocumento = EdicaoPeriodo & {
  titulo?: string | null
  ano?: number | null
}

type ItemDocumento = PeriodoSaresp & {
  id: string
  integracao_id?: string | null
  integracao?: IntegracaoSaresp | null
  edicao_id?: string | null
  escola_origem_id?: string | null
  escola_destino_id?: string | null
  escola_origem_nome: string | null
  escola_origem_cie?: string | null
  escola_destino_nome: string | null
  escola_destino_cie?: string | null
  quantidade: number | null
  turno_referencia?: string | null
  status: string
  observacao?: string | null
  distancia_km?: number | null
}

type EscolaContato = {
  nome_escola?: string | null
  cie?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
}

/** Escapa os dados das escolas antes de inseri-los no documento. */
export function htmlSeguro(valor: unknown) {
  return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere]!)
}

const data = (valor?: string | null) => valor ? formatarPeriodo(valor, valor) : 'A combinar'
const quantidade = (valor?: number | null) => Math.max(Number(valor) || 0, 0).toLocaleString('pt-BR')
const situacao = (valor: string) => ({
  sugerido: 'Sugerido - aguarda aprovação',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
})[valor] || valor
const turno = (valor?: string | null) => ({
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite',
})[valor || ''] || valor || 'A combinar'
const emissao = () => new Date().toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
})

function cabecalho(titulo: string, edicao: EdicaoDocumento | null, assunto: string) {
  const periodo = formatarPeriodo(
    edicao?.data_prova_padrao,
    edicao?.data_prova_fim_padrao || edicao?.data_prova_padrao,
  )

  return `
    <header class="cabecalho">
      <div class="institucional">
        <img class="brasao" src="${BRASAO_SP}" alt="Brasão do Estado de São Paulo" width="54" height="54">
        <div class="institucional-texto">
          <p>GOVERNO DO ESTADO DE SÃO PAULO</p>
          <p>SECRETARIA DE ESTADO DA EDUCAÇÃO</p>
          <p>UNIDADE REGIONAL DE ENSINO GUARULHOS SUL</p>
          <p>SEINTEC - SERVIÇO DE INFORMAÇÕES EDUCACIONAIS E TECNOLOGIA</p>
          <p>SETEC - SEÇÃO DE TECNOLOGIA</p>
        </div>
        <div aria-hidden="true"></div>
      </div>
      <div class="titulo-documento">
        <p class="sobretitulo">SARESP Digital / ${htmlSeguro(assunto)}</p>
        <h1>${htmlSeguro(titulo)}</h1>
        <p class="edicao">
          <strong>${htmlSeguro(edicao?.titulo || 'Edição selecionada')}</strong>
          <span class="metaperiodo">Aplicação: ${htmlSeguro(periodo)}</span>
        </p>
      </div>
    </header>
  `
}

function rodape(referencia: string, emitidoEm: string) {
  return `
    <footer>
      <span>URE Guarulhos Sul - SEINTEC / SETEC<br>${htmlSeguro(referencia)} | Emissão: ${htmlSeguro(emitidoEm)}</span>
      <span>Página 1 de 1</span>
    </footer>
  `
}

function documento(titulo: string, corpo: string, paisagem = false, compacto = false) {
  const largura = paisagem ? 267 : 180
  const altura = paisagem ? 180 : 267

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${htmlSeguro(titulo)}</title>
    <style>
      @page { size: A4 ${paisagem ? 'landscape' : 'portrait'}; margin: 15mm; }
      ${estilosDocumentoSaresp}
      ${estilosComplementaresSaresp}
    </style>
  </head>
  <body class="${paisagem ? 'plano' : 'guia'}${compacto ? ' documento-curto' : ''}">
    <div class="print-toolbar">
      <button id="imprimir-documento" type="button" disabled onclick="window.print()">Preparando documento...</button>
      <span id="estado-documento">Carregando o brasão e organizando as páginas.</span>
    </div>
    <p id="aviso-impressao" class="aviso-impressao" role="alert"></p>
    <main style="width:${largura}mm" data-altura="${altura}">${corpo}</main>
    ${paginacaoDocumentoSaresp}
  </body>
</html>`
}

function assinatura(titulo: string, detalhe: string) {
  return `<div class="assinatura"><strong>${titulo}</strong><span>${detalhe}</span></div>`
}

/** Plano operacional da edição. A conferência é emitida em outro documento. */
export function montarPlanoSaresp(
  edicao: EdicaoDocumento | null,
  itens: ItemDocumento[],
  demandas: DemandaConferencia[] = [],
) {
  const emitidoEm = emissao()
  const ativos = itens.filter(item => item.status !== 'cancelado')
  const total = ativos.reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0)
  const conferencias = demandas.map(demanda => ({
    demanda, ...conferirDemandaSaresp(demanda, ativos), integrado:temPermanenciaIntegrada(demanda,ativos),
  })).sort((a, b) => b.falta - a.falta || b.excedente - a.excedente ||
    String(a.demanda.escola_nome).localeCompare(String(b.demanda.escola_nome), 'pt-BR'))

  const linhasOperacoes = ativos.map((item, indice) => {
    const inicio = item.data_prova || edicao?.data_prova_padrao
    const fim = fimPeriodo(item, edicao)

    return `
      <tr>
        <td class="numero">${indice + 1}</td>
        <td><strong>${htmlSeguro(item.escola_origem_nome)}</strong><small>CIE ${htmlSeguro(item.escola_origem_cie || 'Não informado')}</small></td>
        <td><strong>${htmlSeguro(item.escola_destino_nome)}</strong><small>CIE ${htmlSeguro(item.escola_destino_cie || 'Não informado')}</small>${item.integracao ? `<small class="integrado">Mesmo empréstimo em: ${item.integracao.edicoes.map(e=>htmlSeguro(e.titulo)).join(' / ')}</small>` : ''}</td>
        <td class="numero"><strong>${quantidade(item.quantidade)}</strong></td>
        <td>${htmlSeguro(formatarPeriodo(inicio, fim))}<small>${htmlSeguro(turno(item.turno_referencia))}</small></td>
        <td>${data(item.integracao?.retirada || deslocarDiaUtil(inicio, -1))}</td>
        <td>${data(item.integracao?.devolucao || deslocarDiaUtil(fim, 1))}</td>
        <td class="status">${item.status === 'sugerido' ? 'Sugerido<small>Aguarda aprovação</small>' : htmlSeguro(situacao(item.status))}</td>
      </tr>
    `
  }).join('')

  const operacoes = `
    <section class="pagina" data-bloco="plano">
      ${cabecalho('Plano de remanejamento de equipamentos', edicao, 'Planejamento operacional')}
      <div class="resumo">
        <div><span>Operações ativas</span><strong>${ativos.length}</strong></div>
        <div><span>Equipamentos nas operações¹</span><strong>${quantidade(total)}</strong></div>
        <div><span>Operações aprovadas</span><strong>${ativos.filter(item => item.status === 'aprovado').length}</strong></div>
        <div><span>Aplicações com falta no plano</span><strong>${conferencias.filter(item => item.falta > 0).length}</strong></div>
      </div>
      <table>
        <colgroup>
          <col style="width:4%"><col style="width:19%"><col style="width:19%"><col style="width:6%">
          <col style="width:15%"><col style="width:12%"><col style="width:12%"><col style="width:13%">
        </colgroup>
        <thead><tr>
          <th>#</th><th>Unidade cedente</th><th>Unidade contemplada</th><th>Qtd.</th>
          <th>Aplicação</th><th>Retirada prevista</th><th>Devolução prevista</th><th>Situação</th>
        </tr></thead>
        <tbody>${linhasOperacoes || '<tr><td colspan="8" class="vazio">Nenhuma operação ativa registrada nesta edição.</td></tr>'}</tbody>
      </table>
      ${ativos.length ? `<div class="obs">
        <h2>Orientações para as unidades</h2>
        <p>Combinar os horários diretamente entre as escolas. Conferir funcionamento, acessórios, patrimônio e número de série na retirada e na devolução. Preencher e assinar duas vias da guia e encaminhá-la à SETEC após a retirada.</p>
        <p><strong>Logística:</strong> retirada no dia útil anterior ao início da aplicação e devolução no dia útil posterior ao término. As datas excluem fins de semana e feriados nacionais; alinhar feriados locais com as unidades.</p>
        <p>¹ A quantidade soma as operações do plano. Um equipamento pode ser reutilizado em períodos distintos; esse total não representa estoque único. A emissão do documento não altera inventários nem status. Integrações representam o mesmo empréstimo físico nos dois planos; a retirada e a devolução são as do conjunto.</p>
      </div>
      <div class="assinaturas">
        ${assinatura('SEINTEC', 'Conferência e ciência')}
        ${assinatura('SETEC', 'Registro e acompanhamento')}
      </div>` : ''}
      ${rodape('SETEC Hub | Plano operacional SARESP', emitidoEm)}
    </section>
  `

  return documento(`Plano SARESP Digital - ${edicao?.titulo || 'Edição'}`, operacoes, true, ativos.length <= 1)
}

/** Conferência independente, mantendo a mesma regra de necessidade por cadastrados. */
export function montarConferenciaSaresp(
  edicao: EdicaoDocumento | null,
  itens: ItemDocumento[],
  demandas: DemandaConferencia[] = [],
) {
  const emitidoEm = emissao()
  const ativos = itens.filter(item => item.status !== 'cancelado')
  const conferencias = demandas.map(demanda => ({
    demanda, ...conferirDemandaSaresp(demanda, ativos), integrado:temPermanenciaIntegrada(demanda,ativos),
  })).sort((a, b) => b.falta - a.falta || b.excedente - a.excedente ||
    String(a.demanda.escola_nome).localeCompare(String(b.demanda.escola_nome), 'pt-BR'))

  const linhasConferencia = conferencias.map(item => `
    <tr>
      <td><strong>${htmlSeguro(item.demanda.escola_nome)}</strong>
        <small>CIE ${htmlSeguro(item.demanda.cie || 'Não informado')} | ${htmlSeguro(item.demanda.serie || '')}</small>
        <small>${htmlSeguro(formatarPeriodo(item.demanda.data_prova, item.demanda.data_prova_fim))}</small>
      </td>
      <td class="numero">${quantidade(item.maiorTurno)}</td>
      <td class="numero"><strong>${quantidade(item.cadastrados)}</strong></td>
      <td class="numero">${quantidade(item.previsto)}</td>
      <td class="numero">${quantidade(item.confirmado)}</td>
      <td class="numero ${item.falta > 0 ? 'falta' : 'coberto'}"><strong>${quantidade(item.falta)}</strong></td>
      <td>${item.excedente > 0 ? `${quantidade(item.excedente)}<small>${item.integrado ? 'Permanência entre edições' : item.semNecessidade ? 'Sem déficit inicial' : 'Margem acima da falta'}</small>` : '-'}</td>
    </tr>
  `).join('')

  const conferencia = `
    <section class="pagina" data-bloco="conferencia">
      ${cabecalho('Conferência da necessidade e cobertura', edicao, 'Conferência do planejamento')}
      <div class="resumo">
        <div><span>Aplicações conferidas</span><strong>${conferencias.length}</strong></div>
        <div><span>Aplicações com falta</span><strong>${conferencias.filter(item => item.falta > 0).length}</strong></div>
        <div><span>Quantidade ainda necessária¹</span><strong>${quantidade(conferencias.reduce((soma, item) => soma + item.falta, 0))}</strong></div>
        <div><span>Recebimentos a rever</span><strong>${conferencias.filter(item => item.excedente > 0).length}</strong></div>
      </div>
      <p class="intro"><strong>Base: Equipamentos cadastrados, da planilha importada.</strong><br>Falta inicial = maior turno menos cadastrados. O inventário não substitui esse total no cálculo da necessidade.</p>
      <table>
        <colgroup>
          <col style="width:34%"><col style="width:10%"><col style="width:11%"><col style="width:10%">
          <col style="width:11%"><col style="width:10%"><col style="width:14%">
        </colgroup>
        <thead><tr>
          <th>Unidade / série / aplicação</th><th>Maior turno</th><th>Cadastrados</th><th>Previsto</th>
          <th>Confirmado</th><th>Ainda falta</th><th>A rever²</th>
        </tr></thead>
        <tbody>${linhasConferencia || '<tr><td colspan="7" class="vazio">Nenhuma demanda cadastrada nesta edição.</td></tr>'}</tbody>
      </table>
      <div class="obs">
        <h2>Como interpretar a conferência</h2>
        <p><strong>Previsto:</strong> sugeridos, aprovados e concluídos. <strong>Confirmado:</strong> aprovados e concluídos. Cancelados não são contabilizados. Em aplicações de dois dias, considera-se a menor cobertura diária do período.</p>
        <p>² Quantidade prevista acima da falta inicial, antes da margem opcional. Pode representar uma reserva deliberada, inclusive pelo maior quantitativo de duas edições integradas, e requer conferência. Nenhum plano é cancelado automaticamente. O registro não comprova a entrega física.</p>
        <p>¹ Soma de necessidades por aplicação, não de estoque único. A disponibilidade da cedente permanece limitada aos móveis funcionando, ao cadastro conhecido, ao uso próprio e às demais reservas.</p>
      </div>
      ${rodape('SETEC Hub | Conferência do planejamento SARESP', emitidoEm)}
    </section>
  `

  return documento(`Conferência SARESP Digital - ${edicao?.titulo || 'Edição'}`, conferencia, true)
}

/** Guia com numeração crescente e assinaturas apenas ao final. */
export function montarGuiaSaresp(edicao: EdicaoDocumento | null, item: ItemDocumento) {
  const vinculadas = item.integracao?.edicoes || []
  const inicio = vinculadas[0]?.data_prova || item.data_prova || edicao?.data_prova_padrao
  const fim = vinculadas.at(-1)?.data_prova_fim || fimPeriodo(item, edicao)
  const total = Math.max(Math.trunc(Number(item.integracao?.quantidade || item.quantidade) || 0), 1)
  const referencia = (item.integracao?.id || item.id).slice(0, 8).toUpperCase()
  const edicaoGuia = vinculadas.length ? {
    titulo:vinculadas.map(e=>e.titulo).join(' / '), data_prova_padrao:inicio, data_prova_fim_padrao:fim,
  } : edicao
  // Lista vertical em ordem crescente, contínua entre as páginas.
  const linhas = Array.from({ length: total }, (_, indice) =>
    `<tr><td class="numero">${indice + 1}</td><td></td><td></td></tr>`,
  ).join('')

  const corpo = `
    <section class="pagina" data-bloco="guia">
      ${cabecalho('Guia de remanejamento de equipamentos', edicaoGuia, 'Registro de entrega e recebimento')}
      <div class="ficha">
        <div><span class="rotulo">Unidade cedente - de</span><strong>${htmlSeguro(item.escola_origem_nome)}</strong><small>CIE ${htmlSeguro(item.escola_origem_cie || 'Não informado')}</small></div>
        <div><span class="rotulo">Unidade contemplada - para</span><strong>${htmlSeguro(item.escola_destino_nome)}</strong><small>CIE ${htmlSeguro(item.escola_destino_cie || 'Não informado')}</small></div>
      </div>
      ${vinculadas.length ? `<div class="periodos-integrados">${vinculadas.map(e=>`<div><strong>${htmlSeguro(e.titulo)}</strong><span>${htmlSeguro(formatarPeriodo(e.data_prova,e.data_prova_fim))}</span></div>`).join('')}<p>Empréstimo físico único de ${quantidade(total)} equipamentos, mantidos na contemplada entre as aplicações.</p></div>` : ''}
      <div class="resumo">
        <div><span>Quantidade total</span><strong>${quantidade(total)}</strong></div>
        <div><span>Aplicação</span><strong class="texto-data">${htmlSeguro(formatarPeriodo(inicio, fim))}</strong></div>
        <div><span>Retirada prevista</span><strong class="texto-data">${data(item.integracao?.retirada || deslocarDiaUtil(inicio, -1))}</strong></div>
        <div><span>Devolução prevista</span><strong class="texto-data">${data(item.integracao?.devolucao || deslocarDiaUtil(fim, 1))}</strong></div>
      </div>
      <div class="referencia"><span><strong>Referência:</strong> ${htmlSeguro(referencia)}</span><span><strong>Situação:</strong> ${htmlSeguro(situacao(item.status))}</span></div>
      <h2 class="titulo-secao">Relação de equipamentos</h2>
      <table class="serial">
        <colgroup>
          <col style="width:8%"><col style="width:42%"><col style="width:50%">
        </colgroup>
        <thead><tr><th>Nº</th><th>Modelo</th><th>Número de série</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="obs">
        <h2>Conferência e responsabilidade</h2>
        <p>Conferir modelo, número de série, funcionamento, acessórios e integridade na entrega e na devolução. Registrar divergências e comunicar às direções e à SETEC. Manter os equipamentos em local seguro.</p>
        <p>Combinar horários entre as unidades. Assinar duas vias e encaminhar à SETEC após a retirada. Preencher os responsáveis e assinar ao final da relação.</p>
      </div>
      <div class="assinaturas">
        ${assinatura('Unidade cedente', `${htmlSeguro(item.escola_origem_nome)}<br>Responsável / cargo: ______________________<br>Data: ____/____/________`)}
        ${assinatura('Unidade contemplada', `${htmlSeguro(item.escola_destino_nome)}<br>Responsável / cargo: ______________________<br>Data: ____/____/________`)}
      </div>
      ${rodape(`SETEC Hub | Guia ${referencia}`, emissao())}
    </section>
  `

  return documento(`Guia_SARESP_${referencia}`, corpo)
}

/** Rascunho padronizado. Nenhuma mensagem é enviada automaticamente. */
export function montarEmailSaresp(
  edicao: EdicaoDocumento | null, item: ItemDocumento,
  origem?: EscolaContato | null, destino?: EscolaContato | null,
) {
  const vinculadas = item.integracao?.edicoes || []
  const inicio = vinculadas[0]?.data_prova || item.data_prova || edicao?.data_prova_padrao
  const fim = vinculadas.at(-1)?.data_prova_fim || fimPeriodo(item,edicao)
  const de = origem?.nome_escola || item.escola_origem_nome || 'Unidade cedente'
  const para = destino?.nome_escola || item.escola_destino_nome || 'Unidade contemplada'
  const titulo = vinculadas.length ? vinculadas.map(e=>e.titulo).join(' / ') : edicao?.titulo || 'Edição selecionada'
  const qtd = item.integracao?.quantidade || item.quantidade
  const destinatarios = Array.from(new Set([origem?.email,destino?.email]
    .flatMap(v=>(v||'').split(/[;,\s]+/)).map(v=>v.trim())
    .filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))).join('; ')
  const assunto = `${de} → ${para} | REMANEJAMENTO DE EQUIPAMENTOS - SARESP DIGITAL | ${titulo}`
  const aplicacoes = vinculadas.length
    ? vinculadas.map(e=>`• ${e.titulo}: ${formatarPeriodo(e.data_prova,e.data_prova_fim)}.`).join('\n')
    : `• ${titulo}: ${formatarPeriodo(inicio,fim)}.`
  const corpo = `Prezados(as),

Encaminhamos o planejamento de empréstimo de equipamentos para o SARESP Digital.

EDIÇÃO / APLICAÇÃO
${aplicacoes}

RESUMO DO EMPRÉSTIMO
• Quantidade física: ${quantidade(qtd)} equipamento(s).
• Retirada prevista: ${data(item.integracao?.retirada || deslocarDiaUtil(inicio,-1))}.
• Devolução prevista: ${data(item.integracao?.devolucao || deslocarDiaUtil(fim,1))}.
${vinculadas.length ? `• Os mesmos ${quantidade(qtd)} equipamentos permanecerão na unidade contemplada entre as duas aplicações, com devolução após a última. O quantitativo considera a maior necessidade dos dois planos.\n` : `• Turno de referência: ${turno(item.turno_referencia)}.\n`}
UNIDADE CEDENTE
${de} — CIE ${origem?.cie || item.escola_origem_cie || 'não informado'}
Local de retirada: ${origem?.endereco || 'confirmar diretamente com a unidade'}
Telefone: ${origem?.telefone || 'não informado'}

UNIDADE CONTEMPLADA
${para} — CIE ${destino?.cie || item.escola_destino_cie || 'não informado'}
Telefone: ${destino?.telefone || 'não informado'}

PROVIDÊNCIAS
1. A unidade contemplada deverá combinar os horários de retirada e devolução diretamente com a cedente.
2. Conferir modelo, número de série, funcionamento, acessórios e integridade dos equipamentos. Preencher a guia, assinar duas vias ao final da relação e encaminhá-la à SETEC após a retirada.
3. Manter os itens em local seguro durante todo o período. Comunicar danos ou divergências à direção da cedente, com ciência à SETEC.
4. Devolver os equipamentos nas mesmas condições de recebimento, com nova conferência entre as unidades.

Solicitamos resposta a este e-mail confirmando o responsável, o horário combinado e, após a execução, a retirada e a devolução.

Referência do planejamento: ${(item.integracao?.id || item.id).slice(0,8).toUpperCase()}`
  return {assunto,corpo,destinatarios}
}

/** Dashboard da edição, gerado com a mesma base local da tela. */
export function montarDashboardSaresp(edicao:EdicaoDocumento|null,itens:ItemDocumento[],demandas:DemandaConferencia[]) {
  const d=indicadoresRemanejamento(demandas,itens),emitido=emissao(),volta=2*Math.PI*48
  const max=Math.max(1,...d.porStatus.map(s=>s.quantidade))
  const statusNome:Record<string,string>={sugerido:'Aguardando aprovação',aprovado:'Aprovados',concluido:'Concluídos'}
  const resumo=`<section class="pagina" data-bloco="dashboard-resumo">
    ${cabecalho('Dashboard do remanejamento',edicao,'Panorama da edição')}
    <div class="dashboard-kpis">${[
      ['Equipamentos no plano',d.quantidade],['Operações ativas',d.operacoes],['Unidades contempladas',d.contempladas],
      ['Quantidade ainda necessária',d.quantidadeFaltante],['Cobertura prevista',`${d.percentualCoberto}%`],['Empréstimos integrados',d.integracoes],
    ].map(([t,v])=>`<div><span>${htmlSeguro(t)}</span><strong>${typeof v==='number'?quantidade(v):htmlSeguro(v)}</strong></div>`).join('')}</div>
    <div class="dashboard-graficos"><div><h2>Cobertura das aplicações</h2><div class="dashboard-cobertura"><svg viewBox="0 0 120 120" role="img" aria-label="Cobertura prevista ${d.percentualCoberto}%"><circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="11"/><circle cx="60" cy="60" r="48" fill="none" stroke="#168eab" stroke-width="11" stroke-dasharray="${volta*d.percentualCoberto/100} ${volta}" transform="rotate(-90 60 60)"/><text x="60" y="62" text-anchor="middle" fill="#163d6a" font-size="23" font-weight="700">${d.percentualCoberto}%</text><text x="60" y="77" text-anchor="middle" fill="#56677c" font-size="7">COBERTURA PREVISTA</text></svg><div><p>Capacidade própria: <strong>${d.capacidadePropria}</strong></p><p>Cobertas pelo plano: <strong>${d.cobertasPeloPlano}</strong></p><p>Com falta: <strong>${d.pendentes}</strong></p></div></div></div>
    <div><h2>Equipamentos por situação</h2>${d.porStatus.map(s=>`<div class="dashboard-barra"><span>${statusNome[s.status]}</span><strong>${quantidade(s.quantidade)}</strong><div><i style="width:${100*s.quantidade/max}%"></i></div></div>`).join('')}</div></div>
    <p class="intro">${d.cedentes} cedente(s) · ${d.contempladas} contemplada(s) · ${d.equipamentosEmPermanencia} equipamento(s) em permanência integrada planejada. Os indicadores abrangem a edição selecionada.</p>
    ${rodape('SETEC Hub | Dashboard do remanejamento',emitido)}
  </section>`
  const linhas=d.faltantes.slice(0,10).map(c=>`<tr><td><strong>${htmlSeguro(c.demanda.escola_nome)}</strong><small>CIE ${htmlSeguro(c.demanda.cie)} | ${htmlSeguro(c.demanda.serie)}</small></td><td class="numero">${c.maiorTurno}</td><td class="numero">${c.cadastrados}</td><td class="numero">${c.previsto}</td><td class="numero falta">${c.falta}</td></tr>`).join('')
  const atencao=`<section class="pagina" data-bloco="dashboard-atencao">
    ${cabecalho('Cobertura e pontos de atenção',edicao,'Acompanhamento da edição')}
    <p class="intro">Aplicações com maior quantidade ainda necessária. ${d.faltantes.length>10?`Exibidas 10 de ${d.faltantes.length}; consulte a conferência para a relação completa.`:''}</p>
    <table><colgroup><col style="width:52%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col style="width:12%"></colgroup><thead><tr><th>Unidade / aplicação</th><th>Maior turno</th><th>Cadastrados</th><th>Previsto</th><th>Ainda falta</th></tr></thead><tbody>${linhas||'<tr><td colspan="5" class="vazio">As aplicações cadastradas têm cobertura prevista.</td></tr>'}</tbody></table>
    <div class="obs"><h2>Critérios de leitura</h2><p>Necessidade pela coluna Equipamentos cadastrados. Previsto inclui sugeridos, aprovados e concluídos; confirmado inclui aprovados e concluídos. Cancelados não entram. A cobertura de uma aplicação com dois dias considera o menor atendimento diário.</p><p>Empréstimos integrados correspondem ao mesmo conjunto físico nos dois planos. O maior quantitativo permanece reservado desde a retirada até a devolução final. Não some os dois planos para medir estoque físico. Os status do Hub não comprovam a entrega dos equipamentos.</p></div>
    ${rodape('SETEC Hub | Dashboard: pontos de atenção',emitido)}
  </section>`
  return documento(`Dashboard SARESP - ${edicao?.titulo||'Edição'}`,resumo+atencao,true)
}
