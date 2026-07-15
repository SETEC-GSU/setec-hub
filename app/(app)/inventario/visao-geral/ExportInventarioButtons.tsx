"use client"

import { useMemo, useState } from "react"

type ResumoExportacao = {
  escolaSelecionada: string
  anoSelecionado: string
  modeloSelecionado: string
  statusSelecionado: string
  totalEquipamentos: number
  totalPlataformasRecebidas: number
  totalPlataformasRespondidas: number
  totalGarantiaGeral: number
  percentualGarantia: string
  totalEscolas: number
  totalEnviados: number
  progressoInventario: number
}

type ModeloExportacao = {
  modelo: string
  recebido: number
  respondido: number
  funcionando: number
  garantia: number
  danificados: number
  naoLocalizado: number
  ano: string
  uso: string
  tipo: string
  finalidade: string
}

type RankingExportacao = {
  posicao: number
  escola: string
  total: number
}

type RecertificacaoExportacao = {
  escola: string
  status: string
}

type SaudeExportacao = {
  escola: string
  saude: number
  recebido: number
  funcionando: number
}

type ResponsavelExportacao = {
  escola: string
  responsavel: string
  cargo: string
  dataEnvio: string
  observacao: string
} | null

type ExportInventarioButtonsProps = {
  resumo: ResumoExportacao
  modelos: ModeloExportacao[]
  ranking: RankingExportacao[]
  recertificacao: RecertificacaoExportacao[]
  saude: SaudeExportacao[]
  responsavel: ResponsavelExportacao
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 90)
}

function dataArquivo() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function dataHoraArquivo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const mapa = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  )

  return `${mapa.year}-${mapa.month}-${mapa.day}_${mapa.hour}-${mapa.minute}`
}

function dataHoraIso() {
  return new Date().toISOString()
}

function dataHoraBR() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function labelStatus(status: string) {
  const labels: Record<string, string> = {
    funcionando: "Funcionando",
    aguardando_garantia: "Aguardando garantia",
    danificados_mau_uso: "Danificados / mau uso",
    nao_localizado: "Não localizado",
  }

  return labels[status] || "Todos os status"
}

function labelFiltro(value: string, fallback: string) {
  return value && value.trim() !== "" ? value : fallback
}

function sheetName(name: string) {
  return escapeXml(name.replace(/[\\\/\?\*\[\]\:]/g, "").slice(0, 31))
}

function cellXml(
  value: string | number,
  style = "Text",
  forcedType?: "String" | "Number"
) {
  const isNumber =
    typeof value === "number" && Number.isFinite(value) && forcedType !== "String"

  const type = forcedType || (isNumber ? "Number" : "String")

  return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(
    value
  )}</Data></Cell>`
}

function rowXml(cells: string[], height?: number) {
  return `<Row${height ? ` ss:Height="${height}"` : ""}>${cells.join("")}</Row>`
}

type WorksheetConfig = {
  name: string
  widths: number[]
  rows: string[]
  freezeRows?: number
  autoFilterRange?: string
  landscape?: boolean
}

function worksheetXml({
  name,
  widths,
  rows,
  freezeRows = 0,
  autoFilterRange,
  landscape = true,
}: WorksheetConfig) {
  const columns = widths.map((width) => `<Column ss:Width="${width}"/>`).join("")

  const freezeOptions =
    freezeRows > 0
      ? `
        <FreezePanes/>
        <FrozenNoSplit/>
        <SplitHorizontal>${freezeRows}</SplitHorizontal>
        <TopRowBottomPane>${freezeRows}</TopRowBottomPane>
        <ActivePane>2</ActivePane>
      `
      : ""

  const autoFilter = autoFilterRange
    ? `<AutoFilter x:Range="${autoFilterRange}" xmlns="urn:schemas-microsoft-com:office:excel"/>`
    : ""

  return `
    <Worksheet ss:Name="${sheetName(name)}">
      <Table x:FullColumns="1" x:FullRows="1">
        ${columns}
        ${rows.join("")}
      </Table>

      ${autoFilter}

      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <DoNotDisplayGridlines/>
        ${freezeOptions}
        <PageSetup>
          <Layout x:Orientation="${landscape ? "Landscape" : "Portrait"}"/>
          <Header x:Margin="0.25"/>
          <Footer x:Margin="0.25"/>
          <PageMargins x:Bottom="0.5" x:Left="0.35" x:Right="0.35" x:Top="0.5"/>
        </PageSetup>
        <FitToPage/>
        <Print>
          <FitWidth>1</FitWidth>
          <FitHeight>0</FitHeight>
          <ValidPrinterInfo/>
          <HorizontalResolution>600</HorizontalResolution>
          <VerticalResolution>600</VerticalResolution>
        </Print>
        <ProtectObjects>False</ProtectObjects>
        <ProtectScenarios>False</ProtectScenarios>
      </WorksheetOptions>
    </Worksheet>
  `
}

function somar(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
}

function calcularIndicadoresExecutivos(props: ExportInventarioButtonsProps) {
  const totalRecebidoModelos = somar(props.modelos.map((item) => item.recebido))
  const totalRespondidoModelos = somar(props.modelos.map((item) => item.respondido))
  const totalFuncionandoModelos = somar(props.modelos.map((item) => item.funcionando))
  const totalRecebidoSaude = somar(props.saude.map((item) => item.recebido))
  const totalFuncionandoSaude = somar(props.saude.map((item) => item.funcionando))

  const coberturaDeclarada =
    totalRecebidoModelos > 0
      ? Math.min(100, Math.round((totalRespondidoModelos / totalRecebidoModelos) * 100))
      : 0

  const saudeMedia =
    totalRecebidoSaude > 0
      ? Math.min(100, Math.round((totalFuncionandoSaude / totalRecebidoSaude) * 100))
      : totalRecebidoModelos > 0
        ? Math.min(100, Math.round((totalFuncionandoModelos / totalRecebidoModelos) * 100))
        : 0

  const garantiaPercentual = Number.parseFloat(props.resumo.percentualGarantia) || 0
  const escolasCriticas = props.saude.filter((item) => item.saude < 50).length
  const escolasAtencao = props.saude.filter(
    (item) => item.saude >= 50 && item.saude < 80
  ).length
  const pendenciasInventario = Math.max(
    0,
    props.resumo.totalEscolas - props.resumo.totalEnviados
  )

  const leituras: Array<{
    titulo: string
    texto: string
    status: "positivo" | "atencao" | "critico" | "neutro"
  }> = []

  if (props.resumo.progressoInventario >= 90) {
    leituras.push({
      titulo: "Cobertura de inventário",
      texto: `A rede apresenta ${props.resumo.progressoInventario}% de inventários ativos, indicando alta aderência ao ciclo de atualização.`,
      status: "positivo",
    })
  } else if (props.resumo.progressoInventario >= 70) {
    leituras.push({
      titulo: "Cobertura de inventário",
      texto: `A cobertura está em ${props.resumo.progressoInventario}%. Ainda existem ${pendenciasInventario} unidade(s) pendente(s) ou com inventário vencido.`,
      status: "atencao",
    })
  } else {
    leituras.push({
      titulo: "Cobertura de inventário",
      texto: `A cobertura está em ${props.resumo.progressoInventario}%, com ${pendenciasInventario} unidade(s) ainda sem inventário ativo.`,
      status: "critico",
    })
  }

  if (garantiaPercentual >= 5) {
    leituras.push({
      titulo: "Equipamentos em garantia",
      texto: `${props.resumo.totalGarantiaGeral} equipamento(s), equivalentes a ${props.resumo.percentualGarantia}% do parque filtrado, aguardam tratativa de garantia.`,
      status: "critico",
    })
  } else {
    leituras.push({
      titulo: "Equipamentos em garantia",
      texto: `${props.resumo.totalGarantiaGeral} equipamento(s) aguardam garantia, representando ${props.resumo.percentualGarantia}% do parque filtrado.`,
      status: props.resumo.totalGarantiaGeral > 0 ? "atencao" : "positivo",
    })
  }

  if (props.saude.length === 0) {
    leituras.push({
      titulo: "Saúde operacional",
      texto: "Ainda não existem dados suficientes para consolidar a saúde operacional das unidades no recorte atual.",
      status: "neutro",
    })
  } else if (saudeMedia >= 80 && escolasCriticas === 0) {
    leituras.push({
      titulo: "Saúde operacional",
      texto: `A saúde operacional média está em ${saudeMedia}%, sem unidades abaixo de 50% no recorte selecionado.`,
      status: "positivo",
    })
  } else {
    leituras.push({
      titulo: "Saúde operacional",
      texto: `A saúde operacional média está em ${saudeMedia}%. Há ${escolasCriticas} unidade(s) em nível crítico e ${escolasAtencao} em atenção.`,
      status: escolasCriticas > 0 ? "critico" : "atencao",
    })
  }

  return {
    totalRecebidoModelos,
    totalRespondidoModelos,
    totalFuncionandoModelos,
    coberturaDeclarada,
    saudeMedia,
    garantiaPercentual,
    escolasCriticas,
    escolasAtencao,
    pendenciasInventario,
    totalModelos: props.modelos.length,
    totalUnidadesComSaude: props.saude.length,
    leituras,
  }
}

function buildExcelXml(props: ExportInventarioButtonsProps) {
  const { resumo, modelos, ranking, saude, responsavel } = props
  const indicadores = calcularIndicadoresExecutivos(props)

  const escolaTitulo = resumo.escolaSelecionada || "Todas as UEs"
  const dataGeracao = dataHoraBR()
  const dataGeracaoIso = dataHoraIso()
  const subtitulo = `SETEC Hub · URE Guarulhos Sul · Exportado em ${dataGeracao}`

  const resumoRows: string[] = [
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(
        `Relatório Executivo de Inventário — ${escolaTitulo}`
      )}</Data></Cell>`,
    ], 34),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(
        subtitulo
      )}</Data></Cell>`,
    ], 25),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="ExportDate"><Data ss:Type="String">${escapeXml(
        `Data e hora da exportação: ${dataGeracao}`
      )}</Data></Cell>`,
    ], 22),
    rowXml([cellXml("", "Text")]),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Section"><Data ss:Type="String">Filtros aplicados</Data></Cell>`,
    ], 24),
    rowXml([
      cellXml("Escola", "FilterLabel"),
      `<Cell ss:MergeAcross="1" ss:StyleID="FilterValue"><Data ss:Type="String">${escapeXml(
        labelFiltro(resumo.escolaSelecionada, "Todas as UEs")
      )}</Data></Cell>`,
    ]),
    rowXml([
      cellXml("Ano/Lote", "FilterLabel"),
      `<Cell ss:MergeAcross="1" ss:StyleID="FilterValue"><Data ss:Type="String">${escapeXml(
        labelFiltro(resumo.anoSelecionado, "Todo o histórico")
      )}</Data></Cell>`,
    ]),
    rowXml([
      cellXml("Modelo", "FilterLabel"),
      `<Cell ss:MergeAcross="1" ss:StyleID="FilterValue"><Data ss:Type="String">${escapeXml(
        labelFiltro(resumo.modeloSelecionado, "Todos os modelos")
      )}</Data></Cell>`,
    ]),
    rowXml([
      cellXml("Status", "FilterLabel"),
      `<Cell ss:MergeAcross="1" ss:StyleID="FilterValue"><Data ss:Type="String">${escapeXml(
        labelStatus(resumo.statusSelecionado)
      )}</Data></Cell>`,
    ]),
    rowXml([cellXml("", "Text")]),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Section"><Data ss:Type="String">Indicadores executivos</Data></Cell>`,
    ], 24),
    rowXml([
      cellXml("Indicador", "Header"),
      cellXml("Valor", "Header"),
      cellXml("Leitura", "Header"),
    ], 28),
    rowXml([
      cellXml("Total de equipamentos", "KpiBlue"),
      cellXml(resumo.totalEquipamentos, "NumberStrong"),
      cellXml("Parque filtrado, sem plataformas de carregamento", "TextBorder"),
    ]),
    rowXml([
      cellXml("Modelos consolidados", "KpiBlue"),
      cellXml(indicadores.totalModelos, "NumberStrong"),
      cellXml("Quantidade de modelos presentes no recorte", "TextBorder"),
    ]),
    rowXml([
      cellXml("Plataformas recebidas", "KpiCyan"),
      cellXml(resumo.totalPlataformasRecebidas, "NumberStrong"),
      cellXml("Itens classificados como carregamento", "TextBorder"),
    ]),
    rowXml([
      cellXml("Plataformas respondidas", "KpiCyan"),
      cellXml(resumo.totalPlataformasRespondidas, "NumberStrong"),
      cellXml("Conforme o último inventário válido", "TextBorder"),
    ]),
    rowXml([
      cellXml("Equipamentos em garantia", "KpiYellow"),
      cellXml(resumo.totalGarantiaGeral, "NumberStrong"),
      cellXml(`${resumo.percentualGarantia}% do parque filtrado`, "TextBorder"),
    ]),
    rowXml([
      cellXml("Inventários ativos", "KpiGreen"),
      cellXml(`${resumo.totalEnviados} / ${resumo.totalEscolas}`, "TextStrongBorder"),
      cellXml(`${resumo.progressoInventario}% de cobertura`, "TextBorder"),
    ]),
    rowXml([
      cellXml("Saúde operacional média", indicadores.saudeMedia >= 80 ? "KpiGreen" : indicadores.saudeMedia >= 50 ? "KpiYellow" : "KpiRed"),
      cellXml(`${indicadores.saudeMedia}%`, "TextStrongBorder"),
      cellXml(`${indicadores.escolasCriticas} unidade(s) crítica(s) e ${indicadores.escolasAtencao} em atenção`, "TextBorder"),
    ]),
    rowXml([cellXml("", "Text")]),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Section"><Data ss:Type="String">Leitura executiva</Data></Cell>`,
    ], 24),
    ...indicadores.leituras.map((item) =>
      rowXml([
        cellXml(item.titulo, `Insight${item.status[0].toUpperCase()}${item.status.slice(1)}`),
        `<Cell ss:MergeAcross="1" ss:StyleID="InsightText"><Data ss:Type="String">${escapeXml(
          item.texto
        )}</Data></Cell>`,
      ], 34)
    ),
  ]

  if (responsavel) {
    resumoRows.push(
      rowXml([cellXml("", "Text")]),
      rowXml([
        `<Cell ss:MergeAcross="2" ss:StyleID="Section"><Data ss:Type="String">Último responsável do inventário selecionado</Data></Cell>`,
      ], 24),
      rowXml([cellXml("Escola", "FilterLabel"), cellXml(responsavel.escola, "FilterValue"), cellXml("", "FilterValue")]),
      rowXml([cellXml("Responsável", "FilterLabel"), cellXml(responsavel.responsavel, "FilterValue"), cellXml("", "FilterValue")]),
      rowXml([cellXml("Cargo/Função", "FilterLabel"), cellXml(responsavel.cargo, "FilterValue"), cellXml("", "FilterValue")]),
      rowXml([cellXml("Data de envio", "FilterLabel"), cellXml(responsavel.dataEnvio, "FilterValue"), cellXml("", "FilterValue")]),
      rowXml([
        cellXml("Observação", "FilterLabel"),
        `<Cell ss:MergeAcross="1" ss:StyleID="FilterValue"><Data ss:Type="String">${escapeXml(
          responsavel.observacao || "Sem observações"
        )}</Data></Cell>`,
      ], 34)
    )
  }

  resumoRows.push(
    rowXml([cellXml("", "Text")]),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="FooterNote"><Data ss:Type="String">${escapeXml(
        `Documento exportado em ${dataGeracao}. Fonte: SETEC Hub — URE Guarulhos Sul.`
      )}</Data></Cell>`,
    ], 24)
  )

  const modelosOrdenados = [...modelos].sort(
    (a, b) => b.recebido - a.recebido || a.modelo.localeCompare(b.modelo, "pt-BR")
  )

  const modelosRows: string[] = [
    rowXml([
      `<Cell ss:MergeAcross="10" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(
        `Modelos Consolidados — ${escolaTitulo}`
      )}</Data></Cell>`,
    ], 34),
    rowXml([
      `<Cell ss:MergeAcross="10" ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(
        subtitulo
      )}</Data></Cell>`,
    ], 25),
    rowXml([
      `<Cell ss:MergeAcross="10" ss:StyleID="ExportDate"><Data ss:Type="String">${escapeXml(
        `Data e hora da exportação: ${dataGeracao}`
      )}</Data></Cell>`,
    ], 22),
    rowXml([cellXml("", "Text")]),
    rowXml([
      cellXml("Modelo", "Header"),
      cellXml("Recebido", "Header"),
      cellXml("Respondido", "Header"),
      cellXml("Funcionando", "Header"),
      cellXml("Garantia", "Header"),
      cellXml("Danificados", "Header"),
      cellXml("Não localizado", "Header"),
      cellXml("Ano", "Header"),
      cellXml("Uso", "Header"),
      cellXml("Tipo", "Header"),
      cellXml("Finalidade", "Header"),
    ], 32),
    ...modelosOrdenados.map((item, index) =>
      rowXml([
        cellXml(item.modelo, index % 2 === 0 ? "TextBorder" : "TextAltBorder"),
        cellXml(item.recebido, index % 2 === 0 ? "Number" : "NumberAlt"),
        cellXml(item.respondido, index % 2 === 0 ? "Number" : "NumberAlt"),
        cellXml(item.funcionando, index % 2 === 0 ? "NumberGreen" : "NumberGreenAlt"),
        cellXml(item.garantia, index % 2 === 0 ? "NumberYellow" : "NumberYellowAlt"),
        cellXml(item.danificados, index % 2 === 0 ? "NumberRed" : "NumberRedAlt"),
        cellXml(item.naoLocalizado, index % 2 === 0 ? "NumberSlate" : "NumberSlateAlt"),
        cellXml(item.ano, index % 2 === 0 ? "TextCenterBorder" : "TextCenterAltBorder"),
        cellXml(item.uso, index % 2 === 0 ? "TextBorder" : "TextAltBorder"),
        cellXml(item.tipo, index % 2 === 0 ? "TextBorder" : "TextAltBorder"),
        cellXml(item.finalidade, index % 2 === 0 ? "TextBorder" : "TextAltBorder"),
      ], 26)
    ),
  ]

  modelosRows.push(
    rowXml([
      cellXml("TOTAL", "TotalLabel"),
      cellXml(somar(modelos.map((item) => item.recebido)), "TotalNumber"),
      cellXml(somar(modelos.map((item) => item.respondido)), "TotalNumber"),
      cellXml(somar(modelos.map((item) => item.funcionando)), "TotalNumberGreen"),
      cellXml(somar(modelos.map((item) => item.garantia)), "TotalNumberYellow"),
      cellXml(somar(modelos.map((item) => item.danificados)), "TotalNumberRed"),
      cellXml(somar(modelos.map((item) => item.naoLocalizado)), "TotalNumber"),
      cellXml("", "TotalNumber"),
      cellXml("", "TotalNumber"),
      cellXml("", "TotalNumber"),
      cellXml(`Exportado em ${dataGeracao}`, "TotalNote"),
    ], 28)
  )

  const rankingOrdenado = [...ranking].sort((a, b) => a.posicao - b.posicao)
  const rankingRows: string[] = [
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(
        `Ranking de Escolas — ${escolaTitulo}`
      )}</Data></Cell>`,
    ], 34),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(
        subtitulo
      )}</Data></Cell>`,
    ], 25),
    rowXml([
      `<Cell ss:MergeAcross="2" ss:StyleID="ExportDate"><Data ss:Type="String">${escapeXml(
        `Data e hora da exportação: ${dataGeracao}`
      )}</Data></Cell>`,
    ], 22),
    rowXml([cellXml("", "Text")]),
    rowXml([
      cellXml("Posição", "Header"),
      cellXml("Escola", "Header"),
      cellXml("Total de equipamentos", "Header"),
    ], 30),
    ...rankingOrdenado.map((item, index) =>
      rowXml([
        cellXml(item.posicao, index < 3 ? "RankingTop" : index % 2 === 0 ? "Number" : "NumberAlt"),
        cellXml(item.escola, index % 2 === 0 ? "TextBorder" : "TextAltBorder"),
        cellXml(item.total, index < 3 ? "RankingTop" : index % 2 === 0 ? "NumberStrong" : "NumberStrongAlt"),
      ], 26)
    ),
  ]

  const saudeOrdenada = [...saude].sort(
    (a, b) => a.saude - b.saude || a.escola.localeCompare(b.escola, "pt-BR")
  )
  const saudeRows: string[] = [
    rowXml([
      `<Cell ss:MergeAcross="3" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(
        `Saúde Operacional por UE — ${escolaTitulo}`
      )}</Data></Cell>`,
    ], 34),
    rowXml([
      `<Cell ss:MergeAcross="3" ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(
        `${subtitulo} · Ordenação: menor saúde primeiro`
      )}</Data></Cell>`,
    ], 25),
    rowXml([
      `<Cell ss:MergeAcross="3" ss:StyleID="ExportDate"><Data ss:Type="String">${escapeXml(
        `Data e hora da exportação: ${dataGeracao}`
      )}</Data></Cell>`,
    ], 22),
    rowXml([cellXml("", "Text")]),
    rowXml([
      cellXml("Escola", "Header"),
      cellXml("Saúde operacional", "Header"),
      cellXml("Recebidos", "Header"),
      cellXml("Funcionando", "Header"),
    ], 30),
    ...saudeOrdenada.map((item, index) => {
      const statusStyle =
        item.saude >= 80 ? "StatusOk" : item.saude >= 50 ? "StatusWarn" : "StatusBad"
      const textStyle = index % 2 === 0 ? "TextBorder" : "TextAltBorder"
      const numberStyle = index % 2 === 0 ? "Number" : "NumberAlt"

      return rowXml([
        cellXml(item.escola, textStyle),
        cellXml(`${item.saude}%`, statusStyle),
        cellXml(item.recebido, numberStyle),
        cellXml(item.funcionando, item.saude >= 80 ? "NumberGreen" : item.saude >= 50 ? "NumberYellow" : "NumberRed"),
      ], 26)
    }),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">

  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>SETEC Hub</Author>
    <Title>Relatório Executivo de Inventário</Title>
    <Subject>Inventário Tecnológico — URE Guarulhos Sul</Subject>
    <Company>URE Guarulhos Sul</Company>
    <Created>${dataGeracaoIso}</Created>
    <LastSaved>${dataGeracaoIso}</LastSaved>
  </DocumentProperties>

  <CustomDocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <DataExportacao dt:dt="string" xmlns:dt="urn:schemas-microsoft-com:datatypes">${escapeXml(
      dataGeracao
    )}</DataExportacao>
    <Sistema dt:dt="string" xmlns:dt="urn:schemas-microsoft-com:datatypes">SETEC Hub</Sistema>
  </CustomDocumentProperties>

  <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
    <WindowHeight>12300</WindowHeight>
    <WindowWidth>24750</WindowWidth>
    <ProtectStructure>False</ProtectStructure>
    <ProtectWindows>False</ProtectWindows>
  </ExcelWorkbook>

  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#0F172A"/>
    </Style>

    <Style ss:ID="Title">
      <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="1"/>
      <Font ss:FontName="Aptos Display" ss:Size="17" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0B1F4D" ss:Pattern="Solid"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#38BDF8"/></Borders>
    </Style>

    <Style ss:ID="Subtitle">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#1D4ED8"/>
      <Interior ss:Color="#EAF2FF" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="ExportDate">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="9" ss:Italic="1" ss:Color="#475569"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Section">
      <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>
      <Font ss:FontName="Aptos" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Header">
      <Alignment ss:Vertical="Center" ss:Horizontal="Center" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
      </Borders>
    </Style>

    <Style ss:ID="Text"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="10" ss:Color="#0F172A"/></Style>
    <Style ss:ID="TextAlt"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="10" ss:Color="#0F172A"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="TextStrong"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/></Style>

    <Style ss:ID="TextBorder"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#0F172A"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="TextAltBorder"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#0F172A"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="TextCenterBorder"><Alignment ss:Vertical="Center" ss:Horizontal="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#0F172A"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="TextCenterAltBorder"><Alignment ss:Vertical="Center" ss:Horizontal="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#0F172A"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="TextStrongBorder"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>

    <Style ss:ID="FilterLabel"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#1E3A8A"/><Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/></Borders></Style>
    <Style ss:ID="FilterValue"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>

    <Style ss:ID="Number"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#0F172A"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="NumberAlt"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#0F172A"/><NumberFormat ss:Format="0"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="NumberStrong"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="NumberStrongAlt"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/><NumberFormat ss:Format="0"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>

    <Style ss:ID="NumberGreen"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#047857"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/></Borders></Style>
    <Style ss:ID="NumberGreenAlt"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#047857"/><NumberFormat ss:Format="0"/><Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/></Borders></Style>
    <Style ss:ID="NumberYellow"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/></Borders></Style>
    <Style ss:ID="NumberYellowAlt"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/><NumberFormat ss:Format="0"/><Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/></Borders></Style>
    <Style ss:ID="NumberRed"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B91C1C"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/></Borders></Style>
    <Style ss:ID="NumberRedAlt"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B91C1C"/><NumberFormat ss:Format="0"/><Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/></Borders></Style>
    <Style ss:ID="NumberSlate"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#475569"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="NumberSlateAlt"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#475569"/><NumberFormat ss:Format="0"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>

    <Style ss:ID="KpiBlue"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#1D4ED8"/><Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/></Borders></Style>
    <Style ss:ID="KpiCyan"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#0369A1"/><Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/></Borders></Style>
    <Style ss:ID="KpiGreen"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/></Borders></Style>
    <Style ss:ID="KpiYellow"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/></Borders></Style>
    <Style ss:ID="KpiRed"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/></Borders></Style>

    <Style ss:ID="StatusOk"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/></Borders></Style>
    <Style ss:ID="StatusWarn"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/></Borders></Style>
    <Style ss:ID="StatusBad"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/></Borders></Style>

    <Style ss:ID="InsightPositivo"><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/></Borders></Style>
    <Style ss:ID="InsightAtencao"><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/></Borders></Style>
    <Style ss:ID="InsightCritico"><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/></Borders></Style>
    <Style ss:ID="InsightNeutro"><Font ss:FontName="Aptos" ss:Size="9" ss:Bold="1" ss:Color="#475569"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>
    <Style ss:ID="InsightText"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="9" ss:Color="#334155"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>

    <Style ss:ID="RankingTop"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/></Borders></Style>

    <Style ss:ID="TotalLabel"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/></Borders></Style>
    <Style ss:ID="TotalNumber"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1E293B" ss:Pattern="Solid"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/></Borders></Style>
    <Style ss:ID="TotalNumberGreen"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#86EFAC"/><Interior ss:Color="#1E293B" ss:Pattern="Solid"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/></Borders></Style>
    <Style ss:ID="TotalNumberYellow"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#FCD34D"/><Interior ss:Color="#1E293B" ss:Pattern="Solid"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/></Borders></Style>
    <Style ss:ID="TotalNumberRed"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#FCA5A5"/><Interior ss:Color="#1E293B" ss:Pattern="Solid"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/></Borders></Style>
    <Style ss:ID="TotalNote"><Alignment ss:Horizontal="Right" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="8" ss:Italic="1" ss:Color="#CBD5E1"/><Interior ss:Color="#1E293B" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/></Borders></Style>
    <Style ss:ID="FooterNote"><Alignment ss:Horizontal="Center" ss:WrapText="1"/><Font ss:FontName="Aptos" ss:Size="8" ss:Italic="1" ss:Color="#64748B"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
  </Styles>

  ${worksheetXml({
    name: "Resumo Executivo",
    widths: [190, 125, 390],
    rows: resumoRows,
    freezeRows: 3,
    landscape: false,
  })}
  ${worksheetXml({
    name: "Modelos Consolidados",
    widths: [280, 76, 80, 86, 72, 82, 92, 58, 105, 95, 210],
    rows: modelosRows,
    freezeRows: 5,
    autoFilterRange: `R5C1:R${Math.max(5, modelosOrdenados.length + 5)}C11`,
  })}
  ${worksheetXml({
    name: "Ranking Escolas",
    widths: [70, 360, 135],
    rows: rankingRows,
    freezeRows: 5,
    autoFilterRange: `R5C1:R${Math.max(5, rankingOrdenado.length + 5)}C3`,
    landscape: false,
  })}
  ${worksheetXml({
    name: "Saude UE",
    widths: [360, 135, 105, 115],
    rows: saudeRows,
    freezeRows: 5,
    autoFilterRange: `R5C1:R${Math.max(5, saudeOrdenada.length + 5)}C4`,
    landscape: false,
  })}
</Workbook>`
}


function buildPdfHtml(
  props: ExportInventarioButtonsProps,
  logoUrl: string
) {
  const { resumo, modelos, ranking, saude, responsavel } = props
  const indicadores = calcularIndicadoresExecutivos(props)

  const escolaTitulo = resumo.escolaSelecionada || "Todas as UEs"
  const dataGeracao = dataHoraBR()
  const dataExportacaoArquivo = dataArquivo()

  const modelosOrdenados = [...modelos].sort(
    (a, b) => b.recebido - a.recebido || a.modelo.localeCompare(b.modelo, "pt-BR")
  )
  const rankingOrdenado = [...ranking].sort((a, b) => a.posicao - b.posicao)
  const saudeOrdenada = [...saude].sort(
    (a, b) => a.saude - b.saude || a.escola.localeCompare(b.escola, "pt-BR")
  )

  const modelosRows = modelosOrdenados.length
    ? modelosOrdenados
        .map(
          (item) => `
            <tr>
              <td class="left strong">${escapeHtml(item.modelo)}</td>
              <td>${item.recebido}</td>
              <td>${item.respondido}</td>
              <td class="ok">${item.funcionando}</td>
              <td class="warn">${item.garantia}</td>
              <td class="bad">${item.danificados}</td>
              <td class="muted">${item.naoLocalizado}</td>
              <td>${escapeHtml(item.ano)}</td>
              <td class="left">${escapeHtml(item.finalidade)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="9" class="empty">Nenhum modelo encontrado para os filtros aplicados.</td></tr>`

  const rankingRows = rankingOrdenado.length
    ? rankingOrdenado
        .map(
          (item) => `
            <tr>
              <td><span class="position ${item.posicao <= 3 ? "top" : ""}">${item.posicao}</span></td>
              <td class="left strong">${escapeHtml(item.escola)}</td>
              <td>${item.total}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="3" class="empty">Nenhuma escola encontrada no recorte atual.</td></tr>`

  const saudeRows = saudeOrdenada.length
    ? saudeOrdenada
        .map((item) => {
          const cls =
            item.saude >= 80
              ? "pill ok-pill"
              : item.saude >= 50
                ? "pill warn-pill"
                : "pill bad-pill"

          return `
            <tr>
              <td class="left strong">${escapeHtml(item.escola)}</td>
              <td><span class="${cls}">${item.saude}%</span></td>
              <td>${item.recebido}</td>
              <td class="${item.saude >= 80 ? "ok" : item.saude >= 50 ? "warn" : "bad"}">${item.funcionando}</td>
            </tr>
          `
        })
        .join("")
    : `<tr><td colspan="4" class="empty">Ainda não existem dados suficientes para calcular a saúde operacional.</td></tr>`

  const leiturasHtml = indicadores.leituras
    .map(
      (item) => `
        <article class="insight ${item.status}">
          <div class="insight-dot"></div>
          <div>
            <h3>${escapeHtml(item.titulo)}</h3>
            <p>${escapeHtml(item.texto)}</p>
          </div>
        </article>
      `
    )
    .join("")

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Relatório Executivo de Inventário - ${escapeHtml(escolaTitulo)} - ${escapeHtml(dataExportacaoArquivo)}</title>

    <style>
      @page {
        size: A4 landscape;
        margin: 9mm 9mm 15mm;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9px;
        line-height: 1.35;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      .document {
        width: 100%;
      }

      .cover {
        overflow: hidden;
        margin-bottom: 10px;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        background: #ffffff;
        page-break-inside: avoid;
      }

      .cover-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 245px;
        gap: 22px;
        align-items: start;
        padding: 16px 18px;
        background: linear-gradient(135deg, #020617 0%, #0b1f4d 48%, #075985 100%);
        color: #ffffff;
      }

      .brand-logo {
        display: block;
        width: 230px;
        max-width: 100%;
        height: auto;
        margin-bottom: 9px;
        object-fit: contain;
        object-position: left center;
      }

      .brand-fallback {
        display: none;
        margin-bottom: 9px;
        color: #ffffff;
        font-size: 21px;
        font-weight: 900;
      }

      .brand-fallback span {
        display: block;
        margin-top: 3px;
        color: #7dd3fc;
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 1.4px;
      }

      .eyebrow {
        display: inline-block;
        margin-bottom: 7px;
        padding: 4px 8px;
        border: 1px solid rgba(125, 211, 252, 0.32);
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.12);
        color: #bae6fd;
        font-size: 7.5px;
        font-weight: 900;
        letter-spacing: 1.2px;
        text-transform: uppercase;
      }

      .cover h1 {
        font-size: 22px;
        line-height: 1.08;
        letter-spacing: -0.4px;
      }

      .cover-subtitle {
        max-width: 700px;
        margin-top: 6px;
        color: #cbd5e1;
        font-size: 9.5px;
        line-height: 1.5;
      }

      .meta-card {
        padding: 10px 11px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.38);
        color: #dbeafe;
      }

      .meta-card h2 {
        margin-bottom: 7px;
        color: #ffffff;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.9px;
      }

      .meta-line {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }

      .meta-line:last-child {
        border-bottom: 0;
      }

      .meta-label {
        color: #94a3b8;
        font-size: 7.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .meta-value {
        color: #ffffff;
        font-size: 8px;
        font-weight: 800;
        text-align: right;
      }

      .filters {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 7px;
        padding: 9px 12px;
        background: #f8fafc;
      }

      .filter-card {
        min-width: 0;
        padding: 7px 8px;
        border: 1px solid #dbe4f0;
        border-radius: 9px;
        background: #ffffff;
      }

      .filter-label {
        color: #64748b;
        font-size: 6.8px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.85px;
      }

      .filter-value {
        margin-top: 2px;
        color: #0f172a;
        font-size: 8.4px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .kpis {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 7px;
        margin-bottom: 10px;
        page-break-inside: avoid;
      }

      .kpi {
        min-height: 64px;
        padding: 8px 9px;
        border: 1px solid #dbe4f0;
        border-radius: 11px;
        background: #f8fafc;
      }

      .kpi.blue { background: #eff6ff; border-color: #bfdbfe; }
      .kpi.cyan { background: #ecfeff; border-color: #a5f3fc; }
      .kpi.green { background: #ecfdf5; border-color: #bbf7d0; }
      .kpi.yellow { background: #fffbeb; border-color: #fde68a; }
      .kpi.red { background: #fef2f2; border-color: #fecaca; }

      .kpi-label {
        min-height: 18px;
        color: #64748b;
        font-size: 6.8px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .kpi-value {
        margin-top: 3px;
        color: #020617;
        font-size: 18px;
        line-height: 1;
        font-weight: 900;
      }

      .kpi-note {
        margin-top: 4px;
        color: #64748b;
        font-size: 7px;
        font-weight: 700;
      }

      .executive-summary {
        margin-bottom: 10px;
        padding: 9px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: #f8fafc;
        page-break-inside: avoid;
      }

      .summary-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 7px;
      }

      .summary-heading h2 {
        color: #0f172a;
        font-size: 11px;
        font-weight: 900;
      }

      .summary-heading span {
        color: #64748b;
        font-size: 7px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .insights {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 7px;
      }

      .insight {
        display: grid;
        grid-template-columns: 7px 1fr;
        gap: 7px;
        min-height: 56px;
        padding: 8px;
        border: 1px solid #dbe4f0;
        border-radius: 9px;
        background: #ffffff;
      }

      .insight-dot {
        width: 7px;
        height: 7px;
        margin-top: 2px;
        border-radius: 999px;
        background: #64748b;
      }

      .insight.positivo { border-color: #bbf7d0; background: #f0fdf4; }
      .insight.positivo .insight-dot { background: #10b981; }
      .insight.atencao { border-color: #fde68a; background: #fffbeb; }
      .insight.atencao .insight-dot { background: #f59e0b; }
      .insight.critico { border-color: #fecaca; background: #fef2f2; }
      .insight.critico .insight-dot { background: #ef4444; }
      .insight.neutro { border-color: #cbd5e1; background: #f8fafc; }

      .insight h3 {
        margin-bottom: 3px;
        color: #0f172a;
        font-size: 8px;
        font-weight: 900;
      }

      .insight p {
        color: #475569;
        font-size: 7.4px;
        line-height: 1.4;
      }

      .responsavel {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 7px;
        margin-bottom: 10px;
        padding: 8px;
        border: 1px solid #bfdbfe;
        border-radius: 11px;
        background: #eff6ff;
        page-break-inside: avoid;
      }

      .responsavel-item {
        min-width: 0;
      }

      .responsavel-item.wide {
        grid-column: span 2;
      }

      .responsavel-label {
        color: #1d4ed8;
        font-size: 6.7px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .responsavel-value {
        margin-top: 2px;
        color: #1e3a8a;
        font-size: 8px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 0.86fr 1.14fr;
        gap: 10px;
        align-items: start;
      }

      .section {
        margin-top: 9px;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 5px;
        padding: 6px 8px;
        border-radius: 8px;
        background: #0f172a;
        color: #ffffff;
        break-after: avoid;
        page-break-after: avoid;
      }

      .section-header h2 {
        font-size: 9.5px;
        font-weight: 900;
      }

      .section-header span {
        color: #94a3b8;
        font-size: 6.8px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .table-wrap {
        overflow: hidden;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }

      th {
        padding: 5px 4px;
        border-right: 1px solid #475569;
        background: #1e293b;
        color: #ffffff;
        font-size: 6.8px;
        font-weight: 900;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.45px;
      }

      th:last-child {
        border-right: 0;
      }

      td {
        padding: 4.5px 4px;
        border-top: 1px solid #e2e8f0;
        border-right: 1px solid #e2e8f0;
        color: #334155;
        font-size: 7.2px;
        text-align: center;
        vertical-align: middle;
        word-break: break-word;
      }

      td:last-child {
        border-right: 0;
      }

      tbody tr:nth-child(even) td {
        background: #f8fafc;
      }

      .left { text-align: left; }
      .strong { color: #0f172a; font-weight: 800; }
      .ok { color: #047857; font-weight: 900; }
      .warn { color: #b45309; font-weight: 900; }
      .bad { color: #b91c1c; font-weight: 900; }
      .muted { color: #475569; font-weight: 900; }

      .pill {
        display: inline-block;
        min-width: 46px;
        padding: 2px 5px;
        border: 1px solid transparent;
        border-radius: 999px;
        font-size: 6.8px;
        font-weight: 900;
      }

      .ok-pill { background: #dcfce7; color: #047857; border-color: #86efac; }
      .warn-pill { background: #fef3c7; color: #b45309; border-color: #fcd34d; }
      .bad-pill { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

      .position {
        display: inline-flex;
        width: 19px;
        height: 19px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #e2e8f0;
        color: #334155;
        font-size: 7px;
        font-weight: 900;
      }

      .position.top {
        background: #fef3c7;
        color: #92400e;
      }

      .empty {
        padding: 16px;
        color: #64748b;
        font-style: italic;
        text-align: center;
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
        color: #64748b;
        font-size: 6.8px;
      }

      .legend span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .legend i {
        width: 6px;
        height: 6px;
        border-radius: 999px;
      }

      .print-footer {
        position: fixed;
        right: 0;
        bottom: -10mm;
        left: 0;
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding-top: 5px;
        border-top: 1px solid #cbd5e1;
        color: #64748b;
        font-size: 6.8px;
      }

      .no-print {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 10;
      }

      .no-print button {
        border: 0;
        border-radius: 10px;
        background: #1d4ed8;
        color: #ffffff;
        padding: 10px 13px;
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.2);
      }

      @media print {
        .no-print { display: none !important; }
        .section-header,
        .cover,
        .kpis,
        .executive-summary,
        .responsavel {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    </style>
  </head>

  <body>
    <main class="document">
      <section class="cover">
        <div class="cover-top">
          <div>
            <img
              class="brand-logo"
              src="${escapeHtml(logoUrl)}"
              alt="SETEC Hub — URE Guarulhos Sul"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            />
            <div class="brand-fallback">
              SETEC Hub
              <span>URE Guarulhos Sul</span>
            </div>

            <span class="eyebrow">Inventário Tecnológico</span>
            <h1>Relatório Executivo de Inventário</h1>
            <p class="cover-subtitle">
              Consolidação gerencial dos equipamentos recebidos, inventário declarado, garantia e saúde operacional das unidades escolares.
            </p>
          </div>

          <aside class="meta-card">
            <h2>Identificação do documento</h2>
            <div class="meta-line">
              <span class="meta-label">Exportado em</span>
              <span class="meta-value">${escapeHtml(dataGeracao)}</span>
            </div>
            <div class="meta-line">
              <span class="meta-label">Recorte</span>
              <span class="meta-value">${escapeHtml(escolaTitulo)}</span>
            </div>
            <div class="meta-line">
              <span class="meta-label">Fonte</span>
              <span class="meta-value">SETEC Hub</span>
            </div>
            <div class="meta-line">
              <span class="meta-label">Unidade</span>
              <span class="meta-value">URE Guarulhos Sul</span>
            </div>
          </aside>
        </div>

        <div class="filters">
          <div class="filter-card">
            <div class="filter-label">Escola</div>
            <div class="filter-value">${escapeHtml(labelFiltro(resumo.escolaSelecionada, "Todas as UEs"))}</div>
          </div>
          <div class="filter-card">
            <div class="filter-label">Ano/Lote</div>
            <div class="filter-value">${escapeHtml(labelFiltro(resumo.anoSelecionado, "Todo o histórico"))}</div>
          </div>
          <div class="filter-card">
            <div class="filter-label">Modelo</div>
            <div class="filter-value">${escapeHtml(labelFiltro(resumo.modeloSelecionado, "Todos os modelos"))}</div>
          </div>
          <div class="filter-card">
            <div class="filter-label">Status</div>
            <div class="filter-value">${escapeHtml(labelStatus(resumo.statusSelecionado))}</div>
          </div>
        </div>
      </section>

      <section class="kpis">
        <article class="kpi blue">
          <div class="kpi-label">Equipamentos</div>
          <div class="kpi-value">${resumo.totalEquipamentos}</div>
          <div class="kpi-note">Parque sem plataformas</div>
        </article>
        <article class="kpi blue">
          <div class="kpi-label">Modelos consolidados</div>
          <div class="kpi-value">${indicadores.totalModelos}</div>
          <div class="kpi-note">Modelos no recorte</div>
        </article>
        <article class="kpi yellow">
          <div class="kpi-label">Em garantia</div>
          <div class="kpi-value">${resumo.totalGarantiaGeral}</div>
          <div class="kpi-note">${resumo.percentualGarantia}% do parque</div>
        </article>
        <article class="kpi green">
          <div class="kpi-label">Inventário ativo</div>
          <div class="kpi-value">${resumo.progressoInventario}%</div>
          <div class="kpi-note">${resumo.totalEnviados} de ${resumo.totalEscolas} UEs</div>
        </article>
        <article class="kpi ${indicadores.saudeMedia >= 80 ? "green" : indicadores.saudeMedia >= 50 ? "yellow" : "red"}">
          <div class="kpi-label">Saúde operacional</div>
          <div class="kpi-value">${indicadores.saudeMedia}%</div>
          <div class="kpi-note">Média ponderada</div>
        </article>
        <article class="kpi ${indicadores.escolasCriticas > 0 ? "red" : "cyan"}">
          <div class="kpi-label">Unidades críticas</div>
          <div class="kpi-value">${indicadores.escolasCriticas}</div>
          <div class="kpi-note">Saúde abaixo de 50%</div>
        </article>
      </section>

      <section class="executive-summary">
        <div class="summary-heading">
          <h2>Leitura executiva do recorte</h2>
          <span>Indicadores calculados no momento da exportação</span>
        </div>
        <div class="insights">${leiturasHtml}</div>
      </section>

      ${
        responsavel
          ? `
            <section class="responsavel">
              <div class="responsavel-item">
                <div class="responsavel-label">Responsável</div>
                <div class="responsavel-value">${escapeHtml(responsavel.responsavel)}</div>
              </div>
              <div class="responsavel-item">
                <div class="responsavel-label">Cargo/Função</div>
                <div class="responsavel-value">${escapeHtml(responsavel.cargo)}</div>
              </div>
              <div class="responsavel-item">
                <div class="responsavel-label">Escola</div>
                <div class="responsavel-value">${escapeHtml(responsavel.escola)}</div>
              </div>
              <div class="responsavel-item">
                <div class="responsavel-label">Data do envio</div>
                <div class="responsavel-value">${escapeHtml(responsavel.dataEnvio)}</div>
              </div>
              <div class="responsavel-item wide">
                <div class="responsavel-label">Observação</div>
                <div class="responsavel-value">${escapeHtml(responsavel.observacao || "Sem observações")}</div>
              </div>
            </section>
          `
          : ""
      }

      <div class="grid-2">
        <section class="section">
          <div class="section-header">
            <h2>Ranking de escolas por equipamentos</h2>
            <span>${rankingOrdenado.length} unidade(s)</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 48px;">Pos.</th>
                  <th>Escola</th>
                  <th style="width: 72px;">Total</th>
                </tr>
              </thead>
              <tbody>${rankingRows}</tbody>
            </table>
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <h2>Saúde operacional por UE</h2>
            <span>Menor índice primeiro</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th style="width: 66px;">Saúde</th>
                  <th style="width: 66px;">Recebidos</th>
                  <th style="width: 74px;">Funcionando</th>
                </tr>
              </thead>
              <tbody>${saudeRows}</tbody>
            </table>
          </div>
          <div class="legend">
            <span><i style="background:#10b981;"></i> 80% ou mais</span>
            <span><i style="background:#f59e0b;"></i> 50% a 79%</span>
            <span><i style="background:#ef4444;"></i> abaixo de 50%</span>
          </div>
        </section>
      </div>

      <section class="section">
        <div class="section-header">
          <h2>Modelos consolidados</h2>
          <span>${modelosOrdenados.length} modelo(s)</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 218px;">Modelo</th>
                <th>Recebido</th>
                <th>Respondido</th>
                <th>Func.</th>
                <th>Garantia</th>
                <th>Danif.</th>
                <th>Não loc.</th>
                <th>Ano</th>
                <th style="width: 168px;">Finalidade</th>
              </tr>
            </thead>
            <tbody>${modelosRows}</tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="print-footer">
      <span>SETEC Hub · URE Guarulhos Sul · Relatório Executivo de Inventário</span>
      <span>Exportado em ${escapeHtml(dataGeracao)}</span>
    </footer>

    <div class="no-print">
      <button onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>

    <script>
      window.addEventListener("load", function () {
        var imagens = Array.prototype.slice.call(document.images || []);
        var aguardando = imagens.map(function (imagem) {
          if (imagem.complete) return Promise.resolve();

          return new Promise(function (resolve) {
            imagem.onload = resolve;
            imagem.onerror = resolve;
          });
        });

        Promise.all(aguardando).finally(function () {
          setTimeout(function () {
            try {
              window.focus();
              window.print();
            } catch (error) {
              console.error("Falha ao abrir impressão automática:", error);
            }
          }, 500);
        });
      });
    </script>
  </body>
</html>`
}


function downloadFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

export default function ExportInventarioButtons(props: ExportInventarioButtonsProps) {
  const [erro, setErro] = useState<string | null>(null)

  const escolaTitulo = props.resumo.escolaSelecionada || "Todas_as_UEs"

  const nomeArquivoBase = useMemo(() => {
    return `Inventario_${safeFileName(escolaTitulo)}_${dataHoraArquivo()}`
  }, [escolaTitulo])

  function gerarExcel() {
    setErro(null)

    const xml = buildExcelXml(props)

    downloadFile(
      xml,
      `${nomeArquivoBase}.xls`,
      "application/vnd.ms-excel;charset=utf-8"
    )
  }

  function gerarPdf() {
    setErro(null)

    const logoUrl = new URL(
      "/brand/setec-hub-logo-horizontal-dark.png",
      window.location.origin
    ).toString()

    const html = buildPdfHtml(props, logoUrl)
    const janela = window.open("", "_blank", "width=1280,height=900")

    if (!janela) {
      setErro("O navegador bloqueou a janela de impressão. Libere pop-ups para gerar o PDF.")
      return
    }

    janela.document.open()
    janela.document.write(html)
    janela.document.close()
    janela.focus()
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={gerarExcel}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
      >
        📊 Gerar Excel
      </button>

      <button
        type="button"
        onClick={gerarPdf}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
      >
        📄 Gerar PDF
      </button>

      {erro && (
        <p className="text-xs font-semibold text-red-300 sm:max-w-xs">{erro}</p>
      )}
    </div>
  )
}