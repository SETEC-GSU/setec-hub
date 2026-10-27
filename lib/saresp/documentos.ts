import {
  conferirDemandaSaresp,
  deslocarDiaUtil,
  fimPeriodo,
  formatarPeriodo,
  type DemandaConferencia,
  type EdicaoPeriodo,
  type PeriodoSaresp,
} from './operacao'
import { estilosDocumentoSaresp } from './documentos-estilos'
import { BRASAO_SP } from './documentos-identidade'
import { paginacaoDocumentoSaresp } from './documentos-paginacao'

type EdicaoDocumento = EdicaoPeriodo & {
  titulo?: string | null
  ano?: number | null
}

type ItemDocumento = PeriodoSaresp & {
  id: string
  edicao_id?: string | null
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
    demanda, ...conferirDemandaSaresp(demanda, ativos),
  })).sort((a, b) => b.falta - a.falta || b.excedente - a.excedente ||
    String(a.demanda.escola_nome).localeCompare(String(b.demanda.escola_nome), 'pt-BR'))

  const linhasOperacoes = ativos.map((item, indice) => {
    const inicio = item.data_prova || edicao?.data_prova_padrao
    const fim = fimPeriodo(item, edicao)

    return `
      <tr>
        <td class="numero">${indice + 1}</td>
        <td><strong>${htmlSeguro(item.escola_origem_nome)}</strong><small>CIE ${htmlSeguro(item.escola_origem_cie || 'Não informado')}</small></td>
        <td><strong>${htmlSeguro(item.escola_destino_nome)}</strong><small>CIE ${htmlSeguro(item.escola_destino_cie || 'Não informado')}</small></td>
        <td class="numero"><strong>${quantidade(item.quantidade)}</strong></td>
        <td>${htmlSeguro(formatarPeriodo(inicio, fim))}<small>${htmlSeguro(turno(item.turno_referencia))}</small></td>
        <td>${data(deslocarDiaUtil(inicio, -1))}</td>
        <td>${data(deslocarDiaUtil(fim, 1))}</td>
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
        <p>¹ A quantidade soma as operações do plano. Um equipamento pode ser reutilizado em períodos distintos; esse total não representa estoque único. A emissão do documento não altera inventários nem status.</p>
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
    demanda, ...conferirDemandaSaresp(demanda, ativos),
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
      <td>${item.excedente > 0 ? `${quantidade(item.excedente)}<small>${item.semNecessidade ? 'Sem déficit inicial' : 'Margem acima da falta'}</small>` : '-'}</td>
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
        <p>² Quantidade prevista acima da falta inicial, antes da margem opcional. Pode representar uma reserva deliberada e requer conferência. Nenhum plano é cancelado automaticamente. O registro não comprova a entrega física.</p>
        <p>¹ Soma de necessidades por aplicação, não de estoque único. A disponibilidade da cedente permanece limitada aos móveis funcionando, ao cadastro conhecido, ao uso próprio e às demais reservas.</p>
      </div>
      ${rodape('SETEC Hub | Conferência do planejamento SARESP', emitidoEm)}
    </section>
  `

  return documento(`Conferência SARESP Digital - ${edicao?.titulo || 'Edição'}`, conferencia, true)
}

/** Guia com espaço para conferência manual e assinatura em todas as folhas. */
export function montarGuiaSaresp(edicao: EdicaoDocumento | null, item: ItemDocumento) {
  const inicio = item.data_prova || edicao?.data_prova_padrao
  const fim = fimPeriodo(item, edicao)
  const total = Math.max(Math.trunc(Number(item.quantidade) || 0), 1)
  const referencia = item.id.slice(0, 8).toUpperCase()
  const indices = Array.from({ length: total }, (_, indice) => indice + 1)
  const linhas = Array.from({ length: Math.ceil(total / 2) }, (_, linha) => `
    <tr>${[indices[linha * 2], indices[linha * 2 + 1]].map(numero =>
      numero ? `<td class="numero">${numero}</td><td></td><td></td>` : '<td></td><td></td><td></td>',
    ).join('')}</tr>
  `).join('')

  const corpo = `
    <section class="pagina" data-bloco="guia">
      ${cabecalho('Guia de remanejamento de equipamentos', edicao, 'Registro de entrega e recebimento')}
      <div class="ficha">
        <div><span class="rotulo">Unidade cedente - de</span><strong>${htmlSeguro(item.escola_origem_nome)}</strong><small>CIE ${htmlSeguro(item.escola_origem_cie || 'Não informado')}</small></div>
        <div><span class="rotulo">Unidade contemplada - para</span><strong>${htmlSeguro(item.escola_destino_nome)}</strong><small>CIE ${htmlSeguro(item.escola_destino_cie || 'Não informado')}</small></div>
      </div>
      <div class="resumo">
        <div><span>Quantidade total</span><strong>${quantidade(item.quantidade)}</strong></div>
        <div><span>Aplicação</span><strong class="texto-data">${htmlSeguro(formatarPeriodo(inicio, fim))}</strong></div>
        <div><span>Retirada prevista</span><strong class="texto-data">${data(deslocarDiaUtil(inicio, -1))}</strong></div>
        <div><span>Devolução prevista</span><strong class="texto-data">${data(deslocarDiaUtil(fim, 1))}</strong></div>
      </div>
      <div class="referencia"><span><strong>Referência:</strong> ${htmlSeguro(referencia)}</span><span><strong>Situação:</strong> ${htmlSeguro(situacao(item.status))}</span></div>
      <h2 class="titulo-secao">Conferência dos equipamentos 1 a ${total}</h2>
      <table class="serial">
        <colgroup>
          <col style="width:6%"><col style="width:28%"><col style="width:16%">
          <col style="width:6%"><col style="width:28%"><col style="width:16%">
        </colgroup>
        <thead><tr><th>#</th><th>Número de série</th><th>Patrimônio</th><th>#</th><th>Número de série</th><th>Patrimônio</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="obs">
        <h2>Conferência e responsabilidade</h2>
        <p>Conferir funcionamento, acessórios, patrimônio e integridade na entrega e na devolução. Registrar divergências e comunicar às direções e à SETEC. Manter os equipamentos em local seguro.</p>
        <p>Combinar horários entre as unidades. Assinar duas vias e encaminhar à SETEC após a retirada. Preencher os responsáveis em todas as folhas.</p>
      </div>
      <div class="assinaturas">
        ${assinatura('Entregue por', 'Nome / cargo: ______________________<br>Data: ____/____/________')}
        ${assinatura('Recebido por', 'Nome / cargo: ______________________<br>Data: ____/____/________')}
      </div>
      ${rodape(`SETEC Hub | Guia ${referencia}`, emissao())}
    </section>
  `

  return documento(`Guia_SARESP_${referencia}`, corpo)
}

/** Rascunho de e-mail. Nenhuma mensagem é enviada automaticamente. */
export function montarEmailSaresp(edicao: EdicaoDocumento | null, item: ItemDocumento, origem?: EscolaContato | null, destino?: EscolaContato | null) {
 const ini=item.data_prova||edicao?.data_prova_padrao, fim=fimPeriodo(item,edicao)
 const de=origem?.nome_escola||item.escola_origem_nome||'Unidade cedente', para=destino?.nome_escola||item.escola_destino_nome||'Unidade contemplada'
 const destinatarios=Array.from(new Set([origem?.email,destino?.email].flatMap(v=>(v||'').split(/[;,\s]+/)).map(v=>v.trim()).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))).join('; ')
 const assunto=`SARESP Digital | ${quantidade(item.quantidade)} equipamentos | ${formatarPeriodo(ini,fim)} | ${para}`
 const corpo=`Prezados(as),

Encaminhamos o planejamento de empréstimo de equipamentos para a aplicação do SARESP Digital — ${edicao?.titulo||'edição selecionada'}.
${item.status==='sugerido'?'Esta proposta está sujeita à aprovação da SETEC. Aguarde a confirmação antes de realizar a movimentação.':`Situação do registro: ${situacao(item.status)}.`}

RESUMO DO EMPRÉSTIMO
• Quantidade: ${quantidade(item.quantidade)} equipamento(s).
• Aplicação: ${formatarPeriodo(ini,fim)}.
• Turno de referência: ${turno(item.turno_referencia)}.
• Retirada prevista: ${data(deslocarDiaUtil(ini,-1))}.
• Devolução prevista: ${data(deslocarDiaUtil(fim,1))}.

UNIDADE CEDENTE
${de} — CIE ${origem?.cie||item.escola_origem_cie||'não informado'}
Local de retirada: ${origem?.endereco||'confirmar diretamente com a unidade'}
Telefone: ${origem?.telefone||'não informado'}

UNIDADE CONTEMPLADA
${para} — CIE ${destino?.cie||item.escola_destino_cie||'não informado'}
Telefone: ${destino?.telefone||'não informado'}

PROVIDÊNCIAS
1. A unidade contemplada deverá alinhar os horários de retirada e devolução diretamente com a cedente. As datas acima são previsões que excluem fins de semana e feriados nacionais; ajustar feriados locais e particularidades com ciência à SETEC.
2. Na retirada, conferir funcionamento, acessórios, patrimônio, número de série e integridade dos equipamentos. Preencher a Guia de Remanejamento, assinar duas vias e encaminhar à SETEC.
3. Manter os itens em local seguro durante todo o período. Qualquer dano ou divergência deverá ser comunicado imediatamente à direção da cedente, com ciência à SETEC.
4. Devolver os equipamentos nas mesmas condições de recebimento, com nova conferência entre as unidades.

Solicitamos que respondam a este e-mail confirmando o responsável, o horário combinado e, após a execução, a retirada e a devolução.

Atenciosamente,
SEINTEC / SETEC
Unidade Regional de Ensino de Guarulhos Sul

Referência do planejamento: ${item.id.slice(0,8).toUpperCase()}`
 return {assunto,corpo,destinatarios}
}
