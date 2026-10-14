// Modelo institucional preservado integralmente da página enviada.
type ItemRedeBanco = {
  id: string
  ordem: number
  tipo_componente: string
  identificacao?: string | null
  ambiente?: string | null
  rack_origem?: string | null
  porta_ponto?: string | null
  sintoma: string
  testes_realizados?: string[] | null
  testes_outro?: string | null
  diagnostico?: string | null
  acao_realizada: string
  resultado: string
  necessita_nova_visita?: boolean | null
  necessita_infraestrutura?: boolean | null
  necessita_manutencao_ponto?: boolean | null
  acionamento_fde?: boolean | null
  acionamento_operadora?: boolean | null
  necessita_garantia?: boolean | null
  escola_orientada?: boolean | null
  qtd_pontos_rede?: number | null
  qtd_pontos_eletricos?: number | null
  qtd_infra_aps?: number | null
  ambientes_infra?: string | null
  justificativa_infra?: string | null
  chamado_infra?: string | null
  observacao?: string | null
}

export type RelatorioRedeHistorico = {
  id: string
  field_visita_id?: string | null
  escola_id?: string | null
  local_atendimento?: "escola" | "ure";
  escola_nome: string
  cie?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  chamado_referencia?: string | null
  categoria: string
  subcategoria?: string | null
  descricao_demanda?: string | null
  resolucao_origem?: string | null
  data_atendimento: string
  turno?: string | null
  tecnico_usuario_id?: string | null
  tecnico_nome: string
  tecnico_email?: string | null
  resumo_atendimento?: string | null
  observacoes_gerais?: string | null
  status: "rascunho" | "finalizado"
  created_by_auth?: string | null
  created_at?: string | null
  updated_at?: string | null
  finalized_at?: string | null
  updated_by_nome?: string | null
  relatorios_redes_itens?: ItemRedeBanco[]
}

function hojeIso() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function unirTextosUnicos(
  ...values: Array<string | null | undefined>
) {
  const textos = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)

  return textos
    .filter(
      (texto, index, lista) =>
        lista.findIndex(
          (outro) => normalizarTexto(outro) === normalizarTexto(texto),
        ) === index,
    )
    .join("\n\n")
}

function resumoUnificadoRelatorio(relatorio: RelatorioRedeHistorico) {
  return (
    unirTextosUnicos(
      relatorio.descricao_demanda,
      relatorio.resumo_atendimento,
    ) || "Resumo não informado."
  )
}

function parseDateLocal(value?: string | null) {
  if (!value) return null
  const raw = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatarData(value?: string | null) {
  const date = parseDateLocal(value)
  if (!date) return "Não informado"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })
}

function formatarDataHora(value?: string | null) {
  if (!value) return "Não informado"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Não informado"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function nl2br(value: unknown) {
  return escapeHtml(value).replace(/\n/g, "<br />")
}

function slugArquivo(value: unknown) {
  return normalizarTexto(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
}

function getNomeArquivo(relatorio: RelatorioRedeHistorico) {
  const escola = slugArquivo(relatorio.escola_nome || "ESCOLA")
  const data = String(relatorio.data_atendimento || hojeIso())
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("-")

  return `Relatorio_Redes_${escola}_${data}.pdf`
}

function getResultadoPdfClass(resultado: unknown) {
  const value = normalizarTexto(resultado)

  if (value === "resolvido") return "success"
  if (value.includes("infraestrutura") || value.includes("retorno")) return "warning"
  if (
    value.includes("nao foi possivel") ||
    value.includes("garantia") ||
    value.includes("operadora")
  ) {
    return "danger"
  }
  return "neutral"
}

function sinalizacoesItem(item: ItemRedeBanco) {
  const sinais: string[] = []
  if (item.necessita_nova_visita) sinais.push("Necessita nova visita")
  if (item.necessita_infraestrutura) sinais.push("Necessita infraestrutura")
  if (item.necessita_manutencao_ponto) sinais.push("Manutenção de ponto")
  if (item.acionamento_fde) sinais.push("Acionamento FDE")
  if (item.acionamento_operadora) sinais.push("Acionamento de operadora")
  if (item.necessita_garantia) sinais.push("Garantia / substituição")
  if (item.escola_orientada) sinais.push("Escola orientada")
  return sinais
}

export function montarHtmlPdf(relatorio: RelatorioRedeHistorico) {
  const itens = relatorio.relatorios_redes_itens || []
  const totalResolvidos = itens.filter(
    (item) => normalizarTexto(item.resultado) === "resolvido",
  ).length
  const totalRetornos = itens.filter((item) => item.necessita_nova_visita).length
  const totalInfra = itens.filter((item) => item.necessita_infraestrutura).length
  const totalExternos = itens.filter(
    (item) => item.acionamento_fde || item.acionamento_operadora,
  ).length
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/brand/setec-hub-icon.png`
      : "/brand/setec-hub-icon.png"

  const itensHtml = itens
    .slice()
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map((item, index) => {
      const testes = Array.isArray(item.testes_realizados)
        ? item.testes_realizados
        : []
      const sinais = sinalizacoesItem(item)
      const resultadoClass = getResultadoPdfClass(item.resultado)

      return `
        <section class="item">
          <div class="item-top">
            <div class="item-title">
              <span class="item-number">ITEM ${String(index + 1).padStart(2, "0")}</span>
              <h3>${escapeHtml(item.tipo_componente || "Componente não informado")}</h3>
              <p>${escapeHtml(item.identificacao || item.ambiente || "Identificação não informada")}</p>
            </div>

            <span class="tag ${resultadoClass}">
              ${escapeHtml(item.resultado || "Sem resultado")}
            </span>
          </div>

          <div class="mini-grid">
            <div class="mini-cell">
              <p class="label">Ambiente</p>
              <p class="value">${escapeHtml(item.ambiente || "Não informado")}</p>
            </div>
            <div class="mini-cell">
              <p class="label">Rack / origem</p>
              <p class="value mono">${escapeHtml(item.rack_origem || "Não informado")}</p>
            </div>
            <div class="mini-cell">
              <p class="label">Porta / ponto</p>
              <p class="value mono">${escapeHtml(item.porta_ponto || "Não informado")}</p>
            </div>
            <div class="mini-cell">
              <p class="label">Testes registrados</p>
              <p class="value">${testes.length}</p>
            </div>
          </div>

          <div class="text-grid">
            <div class="text-box">
              <p class="label">Situação encontrada</p>
              <p>${nl2br(item.sintoma || "Não informado")}</p>
            </div>
            <div class="text-box">
              <p class="label">Testes realizados</p>
              <p>${nl2br(
                [...testes, item.testes_outro || ""].filter(Boolean).join("; ") ||
                  "Não informado",
              )}</p>
            </div>
            <div class="text-box text-box-wide">
              <p class="label">Ações realizadas</p>
              <p>${nl2br(item.acao_realizada || "Não informado")}</p>
            </div>
          </div>

          ${
            sinais.length
              ? `<div class="signals"><p class="label">Sinalizações</p><p>${escapeHtml(sinais.join(" • "))}</p></div>`
              : ""
          }

          ${
            item.necessita_infraestrutura
              ? `
              <div class="infra-box">
                <p class="label">Levantamento de infraestrutura</p>
                <div class="infra-grid">
                  <span><strong>${item.qtd_pontos_rede || 0}</strong> ponto(s) de rede</span>
                  <span><strong>${item.qtd_pontos_eletricos || 0}</strong> ponto(s) elétrico(s)</span>
                  <span><strong>${item.qtd_infra_aps || 0}</strong> infraestrutura(s) para AP</span>
                </div>
                <p><strong>Ambientes:</strong> ${escapeHtml(item.ambientes_infra || "Não informado")}</p>
                <p><strong>Justificativa:</strong> ${nl2br(item.justificativa_infra || "Não informada")}</p>
              </div>`
              : ""
          }

          ${
            item.observacao
              ? `<div class="observation"><p class="label">Observações do item</p><p>${nl2br(item.observacao)}</p></div>`
              : ""
          }
        </section>
      `
    })
    .join("")

  const nomeArquivo = getNomeArquivo(relatorio)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(nomeArquivo)}</title>
  <style>
    @page { size: A4; margin: 10mm 11mm 12mm 11mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 10.7px; line-height: 1.38; }
    p, h1, h2, h3 { margin: 0; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; padding-bottom: 10px; border-bottom: 2px solid #0f766e; margin-bottom: 10px; break-inside: avoid; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 42px; height: 42px; object-fit: contain; }
    .brand h1 { font-size: 18px; line-height: 1.1; font-weight: 900; letter-spacing: -.4px; }
    .brand p { margin-top: 3px; color: #64748b; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.35px; }
    .doc { min-width: 185px; text-align: right; color: #475569; font-size: 9.5px; font-weight: 700; }
    .doc strong { color: #0f172a; }
    .doc-badge { display: inline-block; margin-top: 5px; padding: 5px 8px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .8px; }
    .headline { display: grid; grid-template-columns: 1.4fr .8fr; gap: 10px; margin-bottom: 10px; break-inside: avoid; }
    .card, .summary-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; background: #fff; break-inside: avoid; }
    .card-title { color: #0f766e; font-size: 9px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 7px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 12px; }
    .info-grid.compact { grid-template-columns: 1fr; }
    .label { color: #64748b; font-size: 8.2px; font-weight: 900; text-transform: uppercase; letter-spacing: .65px; margin-bottom: 2px; }
    .value { color: #0f172a; font-weight: 800; overflow-wrap: anywhere; }
    .mono { font-family: "Courier New", monospace; }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-bottom: 10px; break-inside: avoid; }
    .metric { border: 1px solid #ccfbf1; background: #f0fdfa; border-radius: 11px; padding: 8px; min-height: 52px; }
    .metric strong { display: block; font-size: 17px; color: #0f766e; line-height: 1; font-weight: 900; margin-bottom: 4px; }
    .metric span { font-size: 7.5px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: .45px; }
    .summary-card { margin-bottom: 10px; background: #f8fafc; }
    .summary-text { color: #1e293b; font-size: 10.3px; font-weight: 650; line-height: 1.45; }
    .section-title { display: flex; align-items: center; margin: 10px 0 7px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .9px; break-after: avoid; }
    .section-title:after { content: ""; height: 1px; background: #cbd5e1; flex: 1; margin-left: 10px; }
    .item { border: 1px solid #cbd5e1; border-radius: 13px; padding: 10px; margin-bottom: 9px; break-inside: avoid; }
    .item-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding-bottom: 7px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .item-number { display: inline-block; margin-bottom: 3px; color: #0f766e; font-size: 8px; font-weight: 900; letter-spacing: 1px; }
    .item-title h3 { font-size: 13px; font-weight: 900; line-height: 1.15; }
    .item-title p { margin-top: 2px; color: #64748b; font-size: 9.2px; font-weight: 800; }
    .tag { max-width: 180px; border-radius: 999px; padding: 5px 8px; font-size: 7.7px; font-weight: 900; text-transform: uppercase; text-align: center; }
    .tag.success { background: #dcfce7; color: #166534; }
    .tag.warning { background: #fef3c7; color: #92400e; }
    .tag.danger { background: #fee2e2; color: #991b1b; }
    .tag.neutral { background: #e2e8f0; color: #334155; }
    .mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 8px; }
    .mini-cell, .text-box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 10px; padding: 7px; min-height: 44px; }
    .text-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .text-box { min-height: 58px; color: #1e293b; font-weight: 650; overflow-wrap: anywhere; }
    .text-box-wide { grid-column: 1 / -1; }
    .signals, .observation, .infra-box { margin-top: 7px; border-radius: 10px; padding: 8px; }
    .signals { border: 1px solid #bfdbfe; background: #eff6ff; color: #1e3a8a; }
    .infra-box { border: 1px solid #fed7aa; background: #fff7ed; color: #7c2d12; }
    .infra-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 5px 0; }
    .observation { border: 1px solid #ddd6fe; background: #f5f3ff; color: #4c1d95; }
    .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 82px; margin-top: 34px; padding-top: 26px; break-inside: avoid; }
    .signature { border-top: 1px solid #334155; padding-top: 10px; text-align: center; color: #334155; font-size: 9.8px; font-weight: 800; min-height: 62px; }
    .note { margin-top: 8px; padding-top: 7px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 8.5px; }
    @media print { .no-print { display: none !important; } .item, .card, .summary-card, .footer { break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <header class="header">
      <div class="brand">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="SETEC Hub" />
        <div>
          <h1>Relatório Técnico de Atendimento de Redes</h1>
          <p>SETEC Hub • URE Guarulhos Sul</p>
        </div>
      </div>
      <div class="doc">
        <p><strong>Data:</strong> ${escapeHtml(formatarData(relatorio.data_atendimento))}</p>
        <p><strong>Status:</strong> ${escapeHtml(relatorio.status)}</p>
        <p><strong>Gerado:</strong> ${escapeHtml(formatarDataHora(new Date().toISOString()))}</p>
        <span class="doc-badge">Documento Institucional</span>
      </div>
    </header>

    <section class="headline">
      <div class="card">
        <h2 class="card-title">${relatorio.local_atendimento === "ure" ? "Unidade Regional de Ensino" : "Unidade Escolar"}</h2>
        <div class="info-grid">
          <div><p class="label">${relatorio.local_atendimento === "ure" ? "Unidade" : "Escola"}</p><p class="value">${escapeHtml(relatorio.escola_nome)}</p></div>
          <div><p class="label">CIE</p><p class="value">${escapeHtml(relatorio.cie || "Não informado")}</p></div>
          <div><p class="label">Endereço</p><p class="value">${escapeHtml(relatorio.endereco || "Não informado")}</p></div>
          <div><p class="label">Contato</p><p class="value">${escapeHtml(relatorio.telefone || "Não informado")} • ${escapeHtml(relatorio.email || "Não informado")}</p></div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">Atendimento</h2>
        <div class="info-grid compact">
          <div><p class="label">Técnico responsável</p><p class="value">${escapeHtml(relatorio.tecnico_nome)}</p></div>
          <div><p class="label">Turno / chamado</p><p class="value">${escapeHtml(relatorio.turno || "Não informado")} • ${escapeHtml(relatorio.chamado_referencia || (relatorio.local_atendimento === "ure" ? "Atendimento interno — sem chamado" : "Sem referência"))}</p></div>
          <div><p class="label">Classificação</p><p class="value">${escapeHtml(relatorio.categoria)} • ${escapeHtml(relatorio.subcategoria || "Não informada")}</p></div>
        </div>
      </div>
    </section>

    <section class="metrics">
      <div class="metric"><strong>${itens.length}</strong><span>Itens avaliados</span></div>
      <div class="metric"><strong>${totalResolvidos}</strong><span>Resolvidos</span></div>
      <div class="metric"><strong>${totalRetornos}</strong><span>Nova visita</span></div>
      <div class="metric"><strong>${totalInfra}</strong><span>Infraestrutura</span></div>
      <div class="metric"><strong>${totalExternos}</strong><span>Escalonamentos</span></div>
    </section>

    <section class="summary-card">
      <h2 class="card-title">Resumo Geral da Demanda e do Atendimento</h2>
      <div class="summary-text">${nl2br(resumoUnificadoRelatorio(relatorio))}</div>
    </section>

    <h2 class="section-title">Itens de Rede Avaliados</h2>
    ${itensHtml || '<section class="item"><p class="value">Nenhum item informado.</p></section>'}

    ${
      relatorio.observacoes_gerais
        ? `<section class="summary-card"><h2 class="card-title">Observações Gerais</h2><div class="summary-text">${nl2br(relatorio.observacoes_gerais)}</div></section>`
        : ""
    }

    <footer class="footer">
      <div class="signature">${escapeHtml(relatorio.tecnico_nome)}<br />Técnico Responsável</div>
      <div class="signature">${relatorio.local_atendimento === "ure" ? "Responsável pelo atendimento na URE" : "Responsável da Unidade Escolar"}<br />Assinatura / Carimbo</div>
    </footer>

    <p class="note">Documento gerado pelo SETEC Hub. Este relatório registra as informações técnicas declaradas no atendimento de redes.</p>
  </main>
  <div class="no-print" style="position:fixed;right:16px;bottom:16px">
    <button onclick="window.print()" style="border:0;border-radius:12px;background:#0f766e;color:#fff;padding:12px 16px;font-weight:900;cursor:pointer">Imprimir / Salvar PDF</button>
  </div>
  <script>
    window.addEventListener('load', function () {
      Promise.all(Array.from(document.images || []).map(function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })).then(function () {
        window.setTimeout(function () { window.focus(); window.print(); }, 450);
      });
    });
  </script>
</body>
</html>`
}
