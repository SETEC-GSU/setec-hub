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

function worksheetXml(name: string, widths: number[], rows: string[]) {
  const columns = widths.map((width) => `<Column ss:Width="${width}"/>`).join("")

  return `
    <Worksheet ss:Name="${sheetName(name)}">
      <Table>
        ${columns}
        ${rows.join("")}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <ProtectObjects>False</ProtectObjects>
        <ProtectScenarios>False</ProtectScenarios>
      </WorksheetOptions>
    </Worksheet>
  `
}

function buildExcelXml(props: ExportInventarioButtonsProps) {
  const { resumo, modelos, ranking, recertificacao, saude, responsavel } = props

  const escolaTitulo = resumo.escolaSelecionada || "Todas as UEs"
  const dataGeracao = dataHoraBR()
  const subtitulo = `Gerado em ${dataGeracao} · SETEC Hub · URE Guarulhos Sul`

  const resumoRows: string[] = [
    rowXml([cellXml(`Relatório Executivo de Inventário - ${escolaTitulo}`, "Title")], 30),
    rowXml([cellXml(subtitulo, "Subtitle")], 24),
    rowXml([cellXml("", "Text")]),
    rowXml([cellXml("Filtros aplicados", "Section")]),
    rowXml([cellXml("Escola", "Header"), cellXml(labelFiltro(resumo.escolaSelecionada, "Todas as UEs"), "Text")]),
    rowXml([cellXml("Ano/Lote", "Header"), cellXml(labelFiltro(resumo.anoSelecionado, "Todo o histórico"), "Text")]),
    rowXml([cellXml("Modelo", "Header"), cellXml(labelFiltro(resumo.modeloSelecionado, "Todos os modelos"), "Text")]),
    rowXml([cellXml("Status", "Header"), cellXml(labelStatus(resumo.statusSelecionado), "Text")]),
    rowXml([cellXml("", "Text")]),
    rowXml([cellXml("Indicadores executivos", "Section")]),
    rowXml([cellXml("Indicador", "Header"), cellXml("Valor", "Header"), cellXml("Observação", "Header")]),
    rowXml([cellXml("Total de equipamentos", "KpiBlue"), cellXml(resumo.totalEquipamentos, "NumberStrong"), cellXml("Exclui plataformas de carregamento", "Text")]),
    rowXml([cellXml("Plataformas recebidas", "KpiCyan"), cellXml(resumo.totalPlataformasRecebidas, "NumberStrong"), cellXml("Itens classificados como carregamento", "Text")]),
    rowXml([cellXml("Plataformas respondidas", "KpiCyan"), cellXml(resumo.totalPlataformasRespondidas, "NumberStrong"), cellXml("Conforme último inventário válido", "Text")]),
    rowXml([cellXml("Equipamentos em garantia", "KpiYellow"), cellXml(resumo.totalGarantiaGeral, "NumberStrong"), cellXml(`${resumo.percentualGarantia}% do parque filtrado`, "Text")]),
    rowXml([cellXml("Inventário ativo", "KpiGreen"), cellXml(`${resumo.totalEnviados} / ${resumo.totalEscolas}`, "TextStrong"), cellXml(`${resumo.progressoInventario}% de recertificação`, "Text")]),
  ]

  if (responsavel) {
    resumoRows.push(
      rowXml([cellXml("", "Text")]),
      rowXml([cellXml("Último responsável do inventário selecionado", "Section")]),
      rowXml([cellXml("Escola", "Header"), cellXml(responsavel.escola, "Text")]),
      rowXml([cellXml("Responsável", "Header"), cellXml(responsavel.responsavel, "Text")]),
      rowXml([cellXml("Cargo/Função", "Header"), cellXml(responsavel.cargo, "Text")]),
      rowXml([cellXml("Data de envio", "Header"), cellXml(responsavel.dataEnvio, "Text")]),
      rowXml([cellXml("Observação", "Header"), cellXml(responsavel.observacao || "Sem observações", "Text")])
    )
  }

  const modelosRows: string[] = [
    rowXml([cellXml(`Modelos Consolidados - ${escolaTitulo}`, "Title")], 30),
    rowXml([cellXml(subtitulo, "Subtitle")], 24),
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
    ]),
    ...modelos.map((item, index) =>
      rowXml([
        cellXml(item.modelo, index % 2 === 0 ? "Text" : "TextAlt"),
        cellXml(item.recebido, "Number"),
        cellXml(item.respondido, "Number"),
        cellXml(item.funcionando, "NumberGreen"),
        cellXml(item.garantia, "NumberYellow"),
        cellXml(item.danificados, "NumberRed"),
        cellXml(item.naoLocalizado, "NumberSlate"),
        cellXml(item.ano, "Text"),
        cellXml(item.uso, "Text"),
        cellXml(item.tipo, "Text"),
        cellXml(item.finalidade, "Text"),
      ])
    ),
  ]

  const rankingRows: string[] = [
    rowXml([cellXml(`Ranking de Escolas - ${escolaTitulo}`, "Title")], 30),
    rowXml([cellXml(subtitulo, "Subtitle")], 24),
    rowXml([cellXml("", "Text")]),
    rowXml([
      cellXml("Posição", "Header"),
      cellXml("Escola", "Header"),
      cellXml("Total de equipamentos", "Header"),
    ]),
    ...ranking.map((item) =>
      rowXml([
        cellXml(item.posicao, "NumberStrong"),
        cellXml(item.escola, "Text"),
        cellXml(item.total, "NumberStrong"),
      ])
    ),
  ]

  const recertificacaoRows: string[] = [
    rowXml([cellXml(`Recertificação de Inventário - ${escolaTitulo}`, "Title")], 30),
    rowXml([cellXml(subtitulo, "Subtitle")], 24),
    rowXml([cellXml("", "Text")]),
    rowXml([cellXml("Escola", "Header"), cellXml("Status", "Header")]),
    ...recertificacao.map((item) => {
      const style =
        item.status === "Enviado"
          ? "StatusOk"
          : item.status === "Vencido"
            ? "StatusWarn"
            : "StatusBad"

      return rowXml([cellXml(item.escola, "Text"), cellXml(item.status, style)])
    }),
  ]

  const saudeRows: string[] = [
    rowXml([cellXml(`Saúde Operacional por UE - ${escolaTitulo}`, "Title")], 30),
    rowXml([cellXml(subtitulo, "Subtitle")], 24),
    rowXml([cellXml("", "Text")]),
    rowXml([
      cellXml("Escola", "Header"),
      cellXml("Saúde operacional", "Header"),
      cellXml("Recebidos", "Header"),
      cellXml("Funcionando", "Header"),
    ]),
    ...saude.map((item) => {
      const style =
        item.saude >= 80 ? "StatusOk" : item.saude >= 50 ? "StatusWarn" : "StatusBad"

      return rowXml([
        cellXml(item.escola, "Text"),
        cellXml(`${item.saude}%`, style),
        cellXml(item.recebido, "Number"),
        cellXml(item.funcionando, "NumberGreen"),
      ])
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
    <Subject>Inventário Tecnológico - URE Guarulhos Sul</Subject>
    <Company>URE Guarulhos Sul</Company>
  </DocumentProperties>

  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/>
    </Style>

    <Style ss:ID="Title">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Subtitle">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#475569"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Section">
      <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Header">
      <Alignment ss:Vertical="Center" ss:Horizontal="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Text">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/>
    </Style>

    <Style ss:ID="TextAlt">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TextStrong">
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
    </Style>

    <Style ss:ID="Number">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/>
      <NumberFormat ss:Format="0"/>
    </Style>

    <Style ss:ID="NumberStrong">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
      <NumberFormat ss:Format="0"/>
    </Style>

    <Style ss:ID="NumberGreen">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#047857"/>
      <NumberFormat ss:Format="0"/>
    </Style>

    <Style ss:ID="NumberYellow">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>
      <NumberFormat ss:Format="0"/>
    </Style>

    <Style ss:ID="NumberRed">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>
      <NumberFormat ss:Format="0"/>
    </Style>

    <Style ss:ID="NumberSlate">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#475569"/>
      <NumberFormat ss:Format="0"/>
    </Style>

    <Style ss:ID="KpiBlue">
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#1D4ED8"/>
      <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="KpiCyan">
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#0369A1"/>
      <Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="KpiGreen">
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#047857"/>
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="KpiYellow">
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="StatusOk">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#047857"/>
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="StatusWarn">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="StatusBad">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
    </Style>
  </Styles>

  ${worksheetXml("Resumo Executivo", [270, 170, 330], resumoRows)}
  ${worksheetXml("Modelos Consolidados", [310, 80, 85, 95, 85, 95, 105, 70, 120, 110, 210], modelosRows)}
  ${worksheetXml("Ranking Escolas", [80, 340, 140], rankingRows)}
  ${worksheetXml("Recertificacao", [360, 150], recertificacaoRows)}
  ${worksheetXml("Saude UE", [360, 140, 110, 120], saudeRows)}
</Workbook>`
}

function buildPdfHtml(props: ExportInventarioButtonsProps) {
  const { resumo, modelos, ranking, recertificacao, saude, responsavel } = props

  const escolaTitulo = resumo.escolaSelecionada || "Todas as UEs"
  const dataGeracao = dataHoraBR()

  const recertificacaoOrdenada = [...recertificacao].sort((a, b) => {
    const peso: Record<string, number> = {
      Pendente: 0,
      Vencido: 1,
      Enviado: 2,
    }

    return (
      (peso[a.status] ?? 9) -
        (peso[b.status] ?? 9) ||
      a.escola.localeCompare(b.escola)
    )
  })

  const modelosRows = modelos
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

  const rankingRows = ranking
    .map(
      (item) => `
        <tr>
          <td>${item.posicao}</td>
          <td class="left strong">${escapeHtml(item.escola)}</td>
          <td>${item.total}</td>
        </tr>
      `
    )
    .join("")

  const saudeRows = saude
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
          <td class="ok">${item.funcionando}</td>
        </tr>
      `
    })
    .join("")

  const recertificacaoRows = recertificacaoOrdenada
    .map((item) => {
      const cls =
        item.status === "Enviado"
          ? "pill ok-pill"
          : item.status === "Vencido"
            ? "pill warn-pill"
            : "pill bad-pill"

      return `
        <tr>
          <td class="left strong">${escapeHtml(item.escola)}</td>
          <td><span class="${cls}">${escapeHtml(item.status)}</span></td>
        </tr>
      `
    })
    .join("")

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Relatório de Inventário - ${escapeHtml(escolaTitulo)}</title>

    <style>
      @page {
        size: A4 landscape;
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }

      .cover {
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        overflow: hidden;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }

      .cover-top {
        background: linear-gradient(135deg, #020617 0%, #1d4ed8 62%, #0891b2 100%);
        color: white;
        padding: 22px 24px;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
      }

      .badge {
        display: inline-block;
        border: 1px solid rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.12);
        color: #e0f2fe;
        border-radius: 999px;
        padding: 5px 9px;
        font-size: 9px;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        font-weight: 800;
        margin-bottom: 10px;
      }

      h1 {
        margin: 0;
        font-size: 25px;
        line-height: 1.15;
      }

      .cover-subtitle {
        color: #cbd5e1;
        margin-top: 8px;
        font-size: 11px;
        line-height: 1.5;
      }

      .meta {
        min-width: 250px;
        text-align: right;
        font-size: 10.5px;
        line-height: 1.6;
        color: #dbeafe;
      }

      .filters {
        padding: 12px 16px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        background: #f8fafc;
      }

      .filter-card {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 8px;
        background: #ffffff;
      }

      .filter-label {
        font-size: 8px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .filter-value {
        margin-top: 3px;
        font-size: 10px;
        font-weight: 700;
        color: #0f172a;
      }

      .kpis {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }

      .kpi {
        border: 1px solid #cbd5e1;
        border-radius: 13px;
        padding: 10px;
        background: #f8fafc;
      }

      .kpi.blue { background: #eff6ff; border-color: #bfdbfe; }
      .kpi.green { background: #ecfdf5; border-color: #bbf7d0; }
      .kpi.yellow { background: #fffbeb; border-color: #fde68a; }
      .kpi.red { background: #fef2f2; border-color: #fecaca; }
      .kpi.cyan { background: #ecfeff; border-color: #a5f3fc; }

      .kpi-label {
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #64748b;
        font-weight: 800;
      }

      .kpi-value {
        margin-top: 5px;
        font-size: 21px;
        line-height: 1;
        font-weight: 900;
        color: #020617;
      }

      .kpi-note {
        margin-top: 5px;
        font-size: 8.5px;
        color: #64748b;
        font-weight: 600;
      }

      .section {
        margin-top: 12px;
        page-break-inside: avoid;
      }

      .section-title {
        margin: 0 0 8px;
        padding: 8px 10px;
        border-radius: 10px;
        color: #ffffff;
        background: #0f172a;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.3px;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        align-items: start;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: 8px;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }

      th {
        background: #1e293b;
        color: #ffffff;
        border: 1px solid #334155;
        padding: 6px 5px;
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
      }

      td {
        border: 1px solid #cbd5e1;
        padding: 5px;
        font-size: 8.5px;
        text-align: center;
        vertical-align: middle;
        word-break: break-word;
      }

      tbody tr:nth-child(even) td {
        background: #f8fafc;
      }

      .left {
        text-align: left;
      }

      .strong {
        font-weight: 800;
      }

      .ok {
        color: #047857;
        font-weight: 800;
      }

      .warn {
        color: #b45309;
        font-weight: 800;
      }

      .bad {
        color: #b91c1c;
        font-weight: 800;
      }

      .muted {
        color: #475569;
        font-weight: 800;
      }

      .pill {
        display: inline-block;
        border-radius: 999px;
        padding: 3px 7px;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ok-pill {
        background: #dcfce7;
        color: #047857;
        border: 1px solid #86efac;
      }

      .warn-pill {
        background: #fef3c7;
        color: #b45309;
        border: 1px solid #fcd34d;
      }

      .bad-pill {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fca5a5;
      }

      .responsavel {
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        border-radius: 13px;
        padding: 10px;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }

      .responsavel p {
        margin: 3px 0;
        font-size: 10px;
        color: #1e3a8a;
      }

      .footer {
        margin-top: 14px;
        border-top: 1px solid #cbd5e1;
        padding-top: 8px;
        font-size: 8.5px;
        color: #64748b;
      }
    </style>
  </head>

  <body>
    <div class="cover">
      <div class="cover-top">
        <div>
          <span class="badge">SETEC Hub · Inventário Tecnológico</span>
          <h1>Relatório Executivo de Inventário</h1>
          <div class="cover-subtitle">
            Visão consolidada da rede — equipamentos recebidos, inventário declarado, recertificação das unidades, garantia e saúde operacional.
          </div>
        </div>

        <div class="meta">
          <strong>URE Guarulhos Sul</strong><br />
          Gerado em ${escapeHtml(dataGeracao)}<br />
          Fonte: SETEC Hub<br />
          Recorte: ${escapeHtml(escolaTitulo)}
        </div>
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
    </div>

    <div class="kpis">
      <div class="kpi blue">
        <div class="kpi-label">Equipamentos</div>
        <div class="kpi-value">${resumo.totalEquipamentos}</div>
        <div class="kpi-note">Sem plataformas</div>
      </div>
      <div class="kpi cyan">
        <div class="kpi-label">Plataformas recebidas</div>
        <div class="kpi-value">${resumo.totalPlataformasRecebidas}</div>
        <div class="kpi-note">Carregamento</div>
      </div>
      <div class="kpi cyan">
        <div class="kpi-label">Plataformas respondidas</div>
        <div class="kpi-value">${resumo.totalPlataformasRespondidas}</div>
        <div class="kpi-note">Inventário</div>
      </div>
      <div class="kpi yellow">
        <div class="kpi-label">Garantia</div>
        <div class="kpi-value">${resumo.totalGarantiaGeral}</div>
        <div class="kpi-note">${resumo.percentualGarantia}% do parque</div>
      </div>
      <div class="kpi green">
        <div class="kpi-label">Inventário ativo</div>
        <div class="kpi-value">${resumo.progressoInventario}%</div>
        <div class="kpi-note">${resumo.totalEnviados} / ${resumo.totalEscolas} UEs</div>
      </div>
      <div class="kpi red">
        <div class="kpi-label">Pendência estimada</div>
        <div class="kpi-value">${Math.max(0, resumo.totalEscolas - resumo.totalEnviados)}</div>
        <div class="kpi-note">UEs pendentes/vencidas</div>
      </div>
    </div>

    ${
      responsavel
        ? `
          <div class="responsavel">
            <p><strong>Inventário respondido por:</strong> ${escapeHtml(responsavel.responsavel)}</p>
            <p><strong>Cargo/Função:</strong> ${escapeHtml(responsavel.cargo)}</p>
            <p><strong>Escola:</strong> ${escapeHtml(responsavel.escola)}</p>
            <p><strong>Data de envio:</strong> ${escapeHtml(responsavel.dataEnvio)}</p>
            <p><strong>Observação:</strong> ${escapeHtml(responsavel.observacao || "Sem observações")}</p>
          </div>
        `
        : ""
    }

    <div class="grid-2">
      <div class="section">
        <h2 class="section-title">Ranking de escolas com mais equipamentos</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 52px;">Pos.</th>
              <th>Escola</th>
              <th style="width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>${rankingRows}</tbody>
        </table>
      </div>

      <div class="section">
        <h2 class="section-title">Saúde operacional por UE</h2>
        <table>
          <thead>
            <tr>
              <th>Escola</th>
              <th style="width: 80px;">Saúde</th>
              <th style="width: 75px;">Recebidos</th>
              <th style="width: 85px;">Funcionando</th>
            </tr>
          </thead>
          <tbody>${saudeRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Modelos consolidados</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 230px;">Modelo</th>
            <th>Recebido</th>
            <th>Respondido</th>
            <th>Func.</th>
            <th>Garantia</th>
            <th>Danif.</th>
            <th>Não loc.</th>
            <th>Ano</th>
            <th style="width: 180px;">Finalidade</th>
          </tr>
        </thead>
        <tbody>${modelosRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Recertificação e status das unidades</h2>
      <table>
        <thead>
          <tr>
            <th>Escola</th>
            <th style="width: 120px;">Status</th>
          </tr>
        </thead>
        <tbody>${recertificacaoRows}</tbody>
      </table>
    </div>

    <div class="footer">
      Relatório gerado automaticamente pelo SETEC Hub. Os dados refletem o recorte filtrado na tela no momento da exportação.
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 350);
      };
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
    return `Inventario_${safeFileName(escolaTitulo)}_${dataArquivo()}`
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

    const html = buildPdfHtml(props)
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