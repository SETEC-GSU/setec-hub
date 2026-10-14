// Modelo institucional preservado integralmente da página enviada.
export type ParecerHistorico = {
  id: string;
  escola_id: string | null;
  local_atendimento?: "escola" | "ure";
  escola_nome: string;
  cie?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  tecnico_usuario_id?: string | null;
  tecnico_nome: string;
  tecnico_email?: string | null;
  data_atendimento: string;
  turno?: string | null;
  chamado_referencia?: string | null;
  resumo_atendimento?: string | null;
  observacoes_gerais?: string | null;
  status: "rascunho" | "finalizado";
  created_by_auth?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  finalized_at?: string | null;
  pareceres_tecnicos_itens?: Array<{
    id: string;
    modelo_id?: string | null;
    equipamento: string;
    marca_modelo?: string | null;
    patrimonio?: string | null;
    numero_serie?: string | null;
    problema_relatado?: string | null;
    possui_problema_fisico?: boolean | null;
    problema_fisico_descricao?: string | null;
    diagnostico?: string | null;
    acao_realizada?: string | null;
    resultado?: string | null;
    precisa_garantia?: boolean | null;
    registrado_bluemonitor?: boolean | null;
    observacao?: string | null;
  }>;
};

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Sem data";

  const data = new Date(`${dataIso}T00:00:00`);

  if (Number.isNaN(data.getTime())) return "Sem data";

  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(dataIso?: string | null) {
  if (!dataIso) return "Sem registro";

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) return "Sem registro";

  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataArquivo(dataIso?: string | null) {
  const data = dataIso ? new Date(`${dataIso}T00:00:00`) : new Date();

  if (Number.isNaN(data.getTime())) {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, "0");
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const ano = String(agora.getFullYear());
    return `${dia}-${mes}-${ano}`;
  }

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = String(data.getFullYear());

  return `${dia}-${mes}-${ano}`;
}

function sanitizarNomeArquivo(value: unknown) {
  const texto = String(value || "SETEC Hub")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .toUpperCase();

  return texto || "SETEC_HUB";
}

function getNomeArquivoParecer(parecer: ParecerHistorico) {
  const escola = sanitizarNomeArquivo(parecer.escola_nome || "SETEC Hub");
  const dataExecucao = formatarDataArquivo(
    parecer.data_atendimento || parecer.finalized_at || parecer.created_at,
  );

  return `Parecer_Tecnico_${escola}_${dataExecucao}`;
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(value: unknown) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function getResultadoClass(resultado?: string | null) {
  const texto = normalizarTexto(resultado);

  if (texto.includes("resolvido") && !texto.includes("parcial")) {
    return "success";
  }

  if (texto.includes("garantia") || texto.includes("fisico")) {
    return "danger";
  }

  if (texto.includes("nao localizado") || texto.includes("não localizado")) {
    return "warning";
  }

  if (texto.includes("pendente") || texto.includes("parcial")) {
    return "warning";
  }

  return "neutral";
}

export function montarHtmlPdf(parecer: ParecerHistorico) {
  const itens = parecer.pareceres_tecnicos_itens || [];

  const totalItens = itens.length;
  const totalGarantia = itens.filter((item) => item.precisa_garantia).length;
  const totalFisico = itens.filter(
    (item) => item.possui_problema_fisico,
  ).length;
  const totalBlueMonitor = itens.filter(
    (item) => item.registrado_bluemonitor,
  ).length;
  const totalResolvidos = itens.filter((item) =>
    normalizarTexto(item.resultado).includes("resolvido"),
  ).length;
  const nomeArquivoPdf = getNomeArquivoParecer(parecer);
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/brand/setec-hub-icon.png`
      : "/brand/setec-hub-icon.png";

  const itensHtml = itens
    .map((item, index) => {
      const resultadoClass = getResultadoClass(item.resultado);

      return `
        <section class="item">
          <div class="item-top">
            <div class="item-title">
              <span class="item-number">ITEM ${String(index + 1).padStart(2, "0")}</span>
              <h3>${escapeHtml(item.equipamento || "Equipamento não informado")}</h3>
              <p>${escapeHtml(item.marca_modelo || "Marca/modelo não informado")}</p>
            </div>

            <span class="tag ${resultadoClass}">
              ${escapeHtml(item.resultado || "Sem resultado")}
            </span>
          </div>

          <div class="mini-grid">
            <div class="mini-cell">
              <p class="label">Número de série</p>
              <p class="value mono">${escapeHtml(item.numero_serie || "Não informado")}</p>
            </div>

            <div class="mini-cell">
              <p class="label">Patrimônio</p>
              <p class="value mono">${escapeHtml(item.patrimonio || "Não informado")}</p>
            </div>

            <div class="mini-cell">
              <p class="label">BlueMonitor/DATAMOB</p>
              <p class="value">${item.registrado_bluemonitor ? "Sim" : "Não"}</p>
            </div>

            <div class="mini-cell">
              <p class="label">Garantia / tratativa</p>
              <p class="value">${item.precisa_garantia ? "Sim" : "Não"}</p>
            </div>
          </div>

          <div class="text-grid">
            <div class="text-box">
              <p class="label">Problema apresentado/identificado</p>
              <p>${nl2br(item.problema_relatado || "Não informado")}</p>
            </div>

            <div class="text-box">
              <p class="label">Ação realizada</p>
              <p>${nl2br(item.acao_realizada || "Não informado")}</p>
            </div>

            <div class="text-box full-width ${item.possui_problema_fisico ? "alert-box" : "ok-box"}">
              <p class="label">Condição física</p>
              <p>${
                item.possui_problema_fisico
                  ? nl2br(
                      item.problema_fisico_descricao ||
                        "Problema físico informado, sem detalhamento adicional.",
                    )
                  : "Não foi informado problema físico aparente no equipamento."
              }</p>
            </div>
          </div>

          ${
            item.observacao
              ? `
                <div class="observation">
                  <p class="label">Observações do item</p>
                  <p>${nl2br(item.observacao)}</p>
                </div>
              `
              : ""
          }
        </section>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(nomeArquivoPdf)}</title>

  <style>
    @page {
      size: A4;
      margin: 10mm 11mm 12mm 11mm;
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
      font-size: 10.8px;
      line-height: 1.38;
    }

    p,
    h1,
    h2,
    h3 {
      margin: 0;
    }

    .page {
      width: 100%;
    }

    .header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: start;
      padding: 0 0 10px;
      border-bottom: 2px solid #1d4ed8;
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .logo-image {
      width: 42px;
      height: 42px;
      display: block;
      object-fit: contain;
      flex: 0 0 auto;
    }

    .brand-title h1 {
      font-size: 18px;
      line-height: 1.1;
      color: #0f172a;
      letter-spacing: -0.4px;
      font-weight: 900;
    }

    .brand-title p {
      margin-top: 3px;
      font-size: 9px;
      color: #64748b;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.4px;
    }

    .doc-box {
      min-width: 180px;
      text-align: right;
      color: #475569;
      font-size: 9.5px;
      font-weight: 700;
    }

    .doc-box strong {
      color: #0f172a;
      font-weight: 900;
    }

    .doc-badge {
      display: inline-block;
      margin-top: 5px;
      padding: 5px 8px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 0.9px;
      text-transform: uppercase;
    }

    .headline {
      display: grid;
      grid-template-columns: 1.4fr 0.8fr;
      gap: 10px;
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .school-card,
    .service-card,
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .card-title {
      color: #1e3a8a;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.1px;
      text-transform: uppercase;
      margin-bottom: 7px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px 12px;
    }

    .info-grid.compact {
      grid-template-columns: 1fr;
    }

    .label {
      color: #64748b;
      font-size: 8.3px;
      line-height: 1.2;
      font-weight: 900;
      letter-spacing: 0.65px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .value {
      color: #0f172a;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .mono {
      font-family: "Courier New", Courier, monospace;
      font-weight: 800;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 7px;
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .metric {
      border: 1px solid #dbeafe;
      background: #eff6ff;
      border-radius: 11px;
      padding: 8px;
      min-height: 52px;
    }

    .metric strong {
      display: block;
      font-size: 17px;
      color: #1d4ed8;
      line-height: 1;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .metric span {
      display: block;
      font-size: 7.6px;
      color: #475569;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-card {
      margin-bottom: 10px;
      background: #f8fafc;
    }

    .summary-text {
      color: #1e293b;
      font-size: 10.4px;
      font-weight: 650;
      line-height: 1.45;
    }

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 10px 0 7px;
      color: #0f172a;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      break-after: avoid;
      page-break-after: avoid;
    }

    .section-title::after {
      content: "";
      height: 1px;
      background: #cbd5e1;
      flex: 1;
      margin-left: 10px;
    }

    .item {
      border: 1px solid #cbd5e1;
      border-radius: 13px;
      padding: 10px;
      margin-bottom: 9px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .item-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      padding-bottom: 7px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .item-number {
      display: inline-block;
      margin-bottom: 3px;
      color: #2563eb;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .item-title h3 {
      color: #0f172a;
      font-size: 13px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.2px;
    }

    .item-title p {
      margin-top: 2px;
      color: #64748b;
      font-size: 9.2px;
      font-weight: 800;
    }

    .tag {
      display: inline-block;
      max-width: 175px;
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 7.8px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: 0.55px;
      text-transform: uppercase;
      text-align: center;
      white-space: normal;
    }

    .tag.success {
      background: #dcfce7;
      color: #166534;
    }

    .tag.danger {
      background: #fee2e2;
      color: #991b1b;
    }

    .tag.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .tag.neutral {
      background: #e2e8f0;
      color: #334155;
    }

    .mini-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 7px;
      margin-bottom: 8px;
    }

    .mini-cell {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 10px;
      padding: 7px;
      min-height: 44px;
    }

    .text-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
    }

    .text-box,
    .observation {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 10px;
      padding: 8px;
      color: #1e293b;
      font-weight: 650;
      min-height: 54px;
      overflow-wrap: anywhere;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .alert-box {
      background: #fef2f2;
      border-color: #fecaca;
      color: #7f1d1d;
    }

    .ok-box {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #14532d;
    }

    .observation {
      margin-top: 7px;
      background: #fff7ed;
      border-color: #fed7aa;
      color: #7c2d12;
    }

    .footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: 82px;
      margin-top: 34px;
      padding-top: 26px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .signature {
      border-top: 1px solid #334155;
      padding-top: 10px;
      text-align: center;
      color: #334155;
      font-size: 9.8px;
      font-weight: 800;
      min-height: 62px;
    }

    .note {
      margin-top: 8px;
      padding-top: 7px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 8.5px;
      line-height: 1.35;
    }

    @media print {
      .no-print {
        display: none !important;
      }

      html,
      body {
        background: #ffffff;
      }

      .item,
      .school-card,
      .service-card,
      .summary-card,
      .footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>

<body>
  <main class="page">
    <header class="header">
      <div class="brand">
        <img
          class="logo-image"
          src="${escapeHtml(logoUrl)}"
          alt="SETEC Hub"
        />

        <div class="brand-title">
          <h1>Parecer Técnico de Atendimento</h1>
          <p>SETEC Hub • URE Guarulhos Sul</p>
        </div>
      </div>

      <div class="doc-box">
        <p><strong>Data:</strong> ${escapeHtml(formatarData(parecer.data_atendimento))}</p>
        <p><strong>Status:</strong> ${escapeHtml(parecer.status)}</p>
        <p><strong>Gerado:</strong> ${escapeHtml(formatarDataHora(new Date().toISOString()))}</p>
        <span class="doc-badge">Documento Institucional</span>
      </div>
    </header>

    <section class="headline">
      <div class="school-card">
        <h2 class="card-title">${parecer.local_atendimento === "ure" ? "Unidade Regional de Ensino" : "Unidade Escolar"}</h2>

        <div class="info-grid">
          <div>
            <p class="label">${parecer.local_atendimento === "ure" ? "Unidade" : "Escola"}</p>
            <p class="value">${escapeHtml(parecer.escola_nome || "Não informado")}</p>
          </div>

          <div>
            <p class="label">CIE</p>
            <p class="value">${escapeHtml(parecer.cie || "Não informado")}</p>
          </div>

          <div>
            <p class="label">Endereço</p>
            <p class="value">${escapeHtml(parecer.endereco || "Não informado")}</p>
          </div>

          <div>
            <p class="label">Contato</p>
            <p class="value">${escapeHtml(parecer.telefone || "Não informado")} • ${escapeHtml(parecer.email || "Não informado")}</p>
          </div>
        </div>
      </div>

      <div class="service-card">
        <h2 class="card-title">Atendimento</h2>

        <div class="info-grid compact">
          <div>
            <p class="label">Técnico responsável</p>
            <p class="value">${escapeHtml(parecer.tecnico_nome || "Não informado")}</p>
          </div>

          <div>
            <p class="label">E-mail técnico</p>
            <p class="value">${escapeHtml(parecer.tecnico_email || "Não informado")}</p>
          </div>

          <div>
            <p class="label">Turno / referência</p>
            <p class="value">${escapeHtml(parecer.turno || "Não informado")} • ${escapeHtml(parecer.chamado_referencia || (parecer.local_atendimento === "ure" ? "Atendimento interno — sem chamado" : "Sem referência"))}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="metrics">
      <div class="metric">
        <strong>${totalItens}</strong>
        <span>Equipamentos avaliados</span>
      </div>

      <div class="metric">
        <strong>${totalResolvidos}</strong>
        <span>Resolvidos</span>
      </div>

      <div class="metric">
        <strong>${totalGarantia}</strong>
        <span>Garantia / tratativa</span>
      </div>

      <div class="metric">
        <strong>${totalFisico}</strong>
        <span>Problema físico</span>
      </div>

      <div class="metric">
        <strong>${totalBlueMonitor}</strong>
        <span>BlueMonitor/DATAMOB</span>
      </div>
    </section>

    <section class="summary-card">
      <h2 class="card-title">Resumo Geral do Atendimento</h2>
      <div class="summary-text">
        ${nl2br(parecer.resumo_atendimento || "Sem resumo geral informado.")}
      </div>
    </section>

    <h2 class="section-title">Equipamentos Avaliados</h2>

    ${
      itensHtml ||
      `<section class="item"><p class="value">Nenhum equipamento informado.</p></section>`
    }

    ${
      parecer.observacoes_gerais
        ? `
          <section class="summary-card">
            <h2 class="card-title">Observações Gerais</h2>
            <div class="summary-text">${nl2br(parecer.observacoes_gerais)}</div>
          </section>
        `
        : ""
    }

    <footer class="footer">
      <div class="signature">
        ${escapeHtml(parecer.tecnico_nome || "Técnico responsável")}<br />
        Técnico Responsável
      </div>

      <div class="signature">
        ${parecer.local_atendimento === "ure" ? "Responsável pelo atendimento na URE" : "Responsável da Unidade Escolar"}<br />
        Assinatura / Carimbo
      </div>
    </footer>

    <p class="note">
      Documento gerado pelo SETEC Hub. Este relatório registra as informações técnicas declaradas no atendimento realizado pela equipe responsável.
    </p>
  </main>

  <div class="no-print" style="position: fixed; right: 16px; bottom: 16px; display: flex; gap: 8px; font-family: Arial, Helvetica, sans-serif;">
    <button onclick="window.print()" style="border: 0; border-radius: 12px; background: #1d4ed8; color: white; padding: 12px 16px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 30px rgba(15,23,42,.18);">
      Imprimir / Salvar PDF
    </button>
  </div>

  <script>
    window.addEventListener("load", function () {
      var imagens = Array.from(document.images || []);

      Promise.all(
        imagens.map(function (imagem) {
          if (imagem.complete) return Promise.resolve();

          return new Promise(function (resolve) {
            imagem.addEventListener("load", resolve, { once: true });
            imagem.addEventListener("error", resolve, { once: true });
          });
        }),
      ).then(function () {
        window.setTimeout(function () {
          try {
            window.focus();
            window.print();
          } catch (error) {
            console.error("Falha ao abrir impressão automática:", error);
          }
        }, 450);
      });
    });
  </script>
</body>
</html>
`;
}
