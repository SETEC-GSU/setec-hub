"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createClient } from "@/lib/supabase";

type UsuarioPerfil = {
  id: string;
  auth_user_id: string;
  nome: string | null;
  email: string | null;
  role?: string | null;
  setor?: string | null;
};

type Escola = {
  id: string;
  nome_escola: string | null;
  cie?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  tecnico_atribuido?: string | null;
  diretor?: string | null;
};

type EquipamentoModelo = {
  id: string;
  equipamento: string | null;
  tipo?: string | null;
  marca?: string | null;
  uso?: string | null;
  finalidade?: string | null;
  ano_recebimento?: number | null;
  imagem_url?: string | null;
};

type ItemParecer = {
  tempId: string;
  modelo_id: string;
  equipamento: string;
  marca_modelo: string;
  numero_serie: string;
  patrimonio: string;
  problema_relatado: string;
  possui_problema_fisico: boolean;
  problema_fisico_descricao: string;
  diagnostico: string;
  acao_realizada: string;
  resultado: string;
  precisa_garantia: boolean;
  registrado_bluemonitor: boolean;
  observacao: string;
};

type ParecerHistorico = {
  id: string;
  escola_id: string | null;
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

type MensagemTela = {
  tipo: "success" | "error" | "info";
  texto: string;
} | null;

type PdfPronto = {
  html: string;
  titulo: string;
  parecer: ParecerHistorico;
} | null;

type RetornoChamadoModal = {
  parecer: ParecerHistorico;
  texto: string;
} | null;

type PendenciaValidacao = {
  id: string;
  titulo: string;
  detalhe: string;
};

type SplashValidacao = {
  titulo: string;
  descricao: string;
  pendencias: PendenciaValidacao[];
} | null;

type DashboardGestaoDados = {
  totalPareceres: number;
  finalizados: number;
  rascunhos: number;
  totalItens: number;
  garantia: number;
  fisico: number;
  bluemonitor: number;
  naoLocalizados: number;
  topTecnicos: Array<{ nome: string; total: number }>;
  topResultados: Array<{ resultado: string; total: number }>;
  topEquipamentos: Array<{ nome: string; total: number }>;
  topEscolas: Array<{ nome: string; total: number }>;
  todosItens: Array<{
    id: string;
    parecer_id: string;
    parecer_status: "rascunho" | "finalizado";
    escola_nome: string;
    tecnico_nome: string;
    data_atendimento: string;
    equipamento: string;
    marca_modelo?: string | null;
    numero_serie?: string | null;
    resultado?: string | null;
    precisa_garantia?: boolean | null;
    registrado_bluemonitor?: boolean | null;
  }>;
};

const RESULTADOS = [
  "Resolvido",
  "Resolvido parcialmente",
  "Encaminhado para garantia",
  "Equipamento com problema físico",
  "Equipamento não localizado",
  "Equipamento sem condições de uso",
  "Equipamento faltando componentes",
  "Orientação realizada",
  "Pendente de nova visita",
];

function novoItem(): ItemParecer {
  return {
    tempId: crypto.randomUUID(),
    modelo_id: "",
    equipamento: "",
    marca_modelo: "",
    numero_serie: "",
    patrimonio: "",
    problema_relatado: "",
    possui_problema_fisico: false,
    problema_fisico_descricao: "",
    diagnostico: "",
    acao_realizada: "",
    resultado: "",
    precisa_garantia: false,
    registrado_bluemonitor: false,
    observacao: "",
  };
}

function hojeIso() {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = String(hoje.getMonth() + 1).padStart(2, "0");
  const day = String(hoje.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

function getInitials(nome: string) {
  const clean = String(nome || "").trim();

  if (!clean) return "TF";

  const partes = clean.split(" ").filter(Boolean);

  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  return clean.substring(0, 2).toUpperCase();
}

function getStatusClass(status: string) {
  if (status === "finalizado") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
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

function montarHtmlPdf(parecer: ParecerHistorico) {
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

    .logo {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: -0.6px;
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
        <div class="logo">SH</div>

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
        <h2 class="card-title">Unidade Escolar</h2>

        <div class="info-grid">
          <div>
            <p class="label">Escola</p>
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
            <p class="value">${escapeHtml(parecer.turno || "Não informado")} • ${escapeHtml(parecer.chamado_referencia || "Sem referência")}</p>
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
        Responsável da Unidade Escolar<br />
        Assinatura / Carimbo
      </div>
    </footer>

    <p class="note">
      Documento gerado pelo SETEC Hub. Este parecer registra as informações técnicas declaradas no atendimento realizado pela equipe responsável.
    </p>
  </main>

  <div class="no-print" style="position: fixed; right: 16px; bottom: 16px; display: flex; gap: 8px; font-family: Arial, Helvetica, sans-serif;">
    <button onclick="window.print()" style="border: 0; border-radius: 12px; background: #1d4ed8; color: white; padding: 12px 16px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 30px rgba(15,23,42,.18);">
      Imprimir / Salvar PDF
    </button>
  </div>

  <script>
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        try {
          window.focus();
          window.print();
        } catch (error) {
          console.error("Falha ao abrir impressão automática:", error);
        }
      }, 700);
    });
  </script>
</body>
</html>
`;
}

function abrirHtmlEmJanelaPdf(
  html: string,
  titulo = "Parecer Técnico - SETEC Hub",
  janela?: Window | null,
) {
  const printWindow =
    janela && !janela.closed ? janela : window.open("about:blank", "_blank");

  if (!printWindow) {
    return false;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = titulo;
    printWindow.focus();

    window.setTimeout(() => {
      try {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
        }
      } catch (error) {
        console.error("Erro ao acionar impressão do PDF:", error);
      }
    }, 900);

    return true;
  } catch (error) {
    console.error("Erro ao montar janela do PDF:", error);
    return false;
  }
}

function gerarPdfParecer(parecer: ParecerHistorico, janela?: Window | null) {
  const titulo = getNomeArquivoParecer(parecer);
  const html = montarHtmlPdf(parecer);
  const abriu = abrirHtmlEmJanelaPdf(html, titulo, janela);

  if (!abriu) {
    alert(
      "O navegador bloqueou a janela do PDF. Libere pop-ups para esta página ou tente novamente pelo botão PDF no histórico.",
    );
  }
}

function montarTextoRetornoChamado(parecer: ParecerHistorico) {
  const itens = parecer.pareceres_tecnicos_itens || [];
  const referencia = String(parecer.chamado_referencia || "").trim();

  const linhasEquipamentos = itens.length
    ? itens
        .map((item, index) => {
          const linhas = [
            `${index + 1}. ${item.equipamento || "Equipamento não informado"}`,
            `   Número de série: ${item.numero_serie || "Não informado"}`,
          ];

          if (item.marca_modelo) {
            linhas.push(`   Marca/modelo: ${item.marca_modelo}`);
          }

          if (item.patrimonio) {
            linhas.push(`   Patrimônio: ${item.patrimonio}`);
          }

          linhas.push(
            `   Problema apresentado/identificado: ${item.problema_relatado || "Não informado"}`,
            `   Ação realizada: ${item.acao_realizada || "Não informada"}`,
            `   Resultado: ${item.resultado || "Não informado"}`,
          );

          return linhas.join("\n");
        })
        .join("\n\n")
    : "Nenhum equipamento foi registrado neste relatório.";

  const introducaoReferencia = referencia
    ? ` referente ao chamado ${referencia}`
    : "";

  const observacoes = parecer.observacoes_gerais?.trim()
    ? `\n\nObservações gerais:\n${parecer.observacoes_gerais.trim()}`
    : "";

  return `Prezados(as), boa tarde.

Informamos que o atendimento técnico${introducaoReferencia} foi realizado na unidade ${parecer.escola_nome || "não informada"}, em ${formatarData(parecer.data_atendimento)}, pelo técnico ${parecer.tecnico_nome || "não informado"}.

Durante o atendimento, foram avaliados os seguintes equipamentos:

${linhasEquipamentos}

Resumo do atendimento:
${parecer.resumo_atendimento || "Sem resumo complementar informado."}${observacoes}

O relatório técnico do atendimento foi gerado e permanece disponível no SETEC Hub para consulta.

Atenciosamente,
${parecer.tecnico_nome || "Equipe técnica"}`;
}

export default function ParecerTecnicoPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [deletandoItemId, setDeletandoItemId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<MensagemTela>(null);
  const [pdfPronto, setPdfPronto] = useState<PdfPronto>(null);
  const [retornoChamadoModal, setRetornoChamadoModal] =
    useState<RetornoChamadoModal>(null);
  const [splashValidacao, setSplashValidacao] = useState<SplashValidacao>(null);

  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [modelos, setModelos] = useState<EquipamentoModelo[]>([]);
  const [historico, setHistorico] = useState<ParecerHistorico[]>([]);

  const [editandoParecerId, setEditandoParecerId] = useState<string | null>(
    null,
  );

  const [escolaDigitada, setEscolaDigitada] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState(hojeIso());
  const [turno, setTurno] = useState("");
  const [chamadoReferencia, setChamadoReferencia] = useState("");
  const [resumoAtendimento, setResumoAtendimento] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [itens, setItens] = useState<ItemParecer[]>([novoItem()]);

  const roleNormalizada = normalizarTexto(usuario?.role);
  const isGestao = roleNormalizada === "admin" || roleNormalizada === "seintec";

  const modelosPorId = useMemo(() => {
    return new Map(modelos.map((modelo) => [modelo.id, modelo]));
  }, [modelos]);

  const escolaSelecionada = useMemo(() => {
    if (!escolaDigitada.trim()) return null;

    return (
      escolas.find(
        (escola) =>
          normalizarTexto(escola.nome_escola) ===
          normalizarTexto(escolaDigitada),
      ) || null
    );
  }, [escolas, escolaDigitada]);

  const escolaInvalida = escolaDigitada.trim() && !escolaSelecionada;

  const totaisItens = useMemo(() => {
    const total = itens.length;
    const garantia = itens.filter((item) => item.precisa_garantia).length;
    const fisico = itens.filter((item) => item.possui_problema_fisico).length;
    const bluemonitor = itens.filter(
      (item) => item.registrado_bluemonitor,
    ).length;
    const naoLocalizados = itens.filter(
      (item) =>
        normalizarTexto(item.resultado) === "equipamento nao localizado",
    ).length;
    const resolvidos = itens.filter((item) =>
      normalizarTexto(item.resultado).includes("resolvido"),
    ).length;

    return { total, garantia, fisico, resolvidos, bluemonitor, naoLocalizados };
  }, [itens]);

  const parecerEmEdicao = useMemo(() => {
    if (!editandoParecerId) return null;
    return (
      historico.find((parecer) => parecer.id === editandoParecerId) || null
    );
  }, [editandoParecerId, historico]);

  const dashboardGestao = useMemo<DashboardGestaoDados>(() => {
    const itensComParecer = historico.flatMap((parecer) =>
      (parecer.pareceres_tecnicos_itens || []).map((item) => ({
        ...item,
        parecer,
      })),
    );

    const topTecnicosMap = new Map<string, number>();
    const topResultadosMap = new Map<string, number>();
    const topEquipamentosMap = new Map<string, number>();
    const topEscolasMap = new Map<string, number>();

    itensComParecer.forEach((item) => {
      const tecnico = item.parecer.tecnico_nome || "Técnico não informado";
      const resultado = item.resultado || "Sem resultado";
      const equipamento = item.equipamento || "Equipamento não informado";
      const escola = item.parecer.escola_nome || "Escola não informada";

      topTecnicosMap.set(tecnico, (topTecnicosMap.get(tecnico) || 0) + 1);
      topResultadosMap.set(
        resultado,
        (topResultadosMap.get(resultado) || 0) + 1,
      );
      topEquipamentosMap.set(
        equipamento,
        (topEquipamentosMap.get(equipamento) || 0) + 1,
      );
      topEscolasMap.set(escola, (topEscolasMap.get(escola) || 0) + 1);
    });

    const ordenarRanking = (mapa: Map<string, number>) =>
      Array.from(mapa.entries())
        .map(([nome, total]) => ({ nome, total }))
        .sort(
          (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"),
        )
        .slice(0, 10);

    const topTecnicos = ordenarRanking(topTecnicosMap);
    const topEquipamentos = ordenarRanking(topEquipamentosMap);
    const topEscolas = ordenarRanking(topEscolasMap);

    const topResultados = Array.from(topResultadosMap.entries())
      .map(([resultado, total]) => ({ resultado, total }))
      .sort(
        (a, b) =>
          b.total - a.total || a.resultado.localeCompare(b.resultado, "pt-BR"),
      )
      .slice(0, 8);

    const todosItens = itensComParecer
      .map((item) => ({
        id: item.id,
        parecer_id: item.parecer.id,
        parecer_status: item.parecer.status,
        escola_nome: item.parecer.escola_nome,
        tecnico_nome: item.parecer.tecnico_nome,
        data_atendimento: item.parecer.data_atendimento,
        equipamento: item.equipamento,
        marca_modelo: item.marca_modelo,
        numero_serie: item.numero_serie,
        resultado: item.resultado,
        precisa_garantia: item.precisa_garantia,
        registrado_bluemonitor: item.registrado_bluemonitor,
      }))
      .sort(
        (a, b) =>
          new Date(`${b.data_atendimento || "1970-01-01"}T00:00:00`).getTime() -
          new Date(`${a.data_atendimento || "1970-01-01"}T00:00:00`).getTime(),
      );

    return {
      totalPareceres: historico.length,
      finalizados: historico.filter(
        (parecer) => parecer.status === "finalizado",
      ).length,
      rascunhos: historico.filter((parecer) => parecer.status === "rascunho")
        .length,
      totalItens: itensComParecer.length,
      garantia: itensComParecer.filter((item) => item.precisa_garantia).length,
      fisico: itensComParecer.filter((item) => item.possui_problema_fisico)
        .length,
      bluemonitor: itensComParecer.filter((item) => item.registrado_bluemonitor)
        .length,
      naoLocalizados: itensComParecer.filter(
        (item) =>
          normalizarTexto(item.resultado) === "equipamento nao localizado",
      ).length,
      topTecnicos,
      topResultados,
      topEquipamentos,
      topEscolas,
      todosItens,
    };
  }, [historico]);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setMensagem(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user?.email) {
        throw new Error("Sessão não identificada. Faça login novamente.");
      }

      const [
        { data: perfilData },
        { data: escolasData, error: escolasError },
        { data: modelosData, error: modelosError },
      ] = await Promise.all([
        supabase
          .from("usuarios")
          .select("id, nome, email, role, setor")
          .eq("email", user.email)
          .maybeSingle(),
        supabase
          .from("escolas")
          .select(
            "id, nome_escola, cie, endereco, telefone, email, tecnico_atribuido, diretor",
          )
          .order("nome_escola", { ascending: true }),
        supabase
          .from("equipamentos_modelos")
          .select(
            "id, equipamento, tipo, marca, uso, finalidade, ano_recebimento, imagem_url",
          )
          .order("equipamento", { ascending: true }),
      ]);

      if (escolasError) throw escolasError;
      if (modelosError) throw modelosError;

      const perfil = perfilData as UsuarioPerfil | null;
      const rolePerfil = perfil?.role || null;
      const isGestaoLocal =
        normalizarTexto(rolePerfil) === "admin" ||
        normalizarTexto(rolePerfil) === "seintec";

      setUsuario({
        id: perfil?.id || user.id,
        auth_user_id: user.id,
        nome: perfil?.nome || user.email,
        email: user.email,
        role: rolePerfil,
        setor: perfil?.setor || null,
      });

      setEscolas((escolasData || []) as Escola[]);
      setModelos((modelosData || []) as EquipamentoModelo[]);

      let pareceresQuery = supabase
        .from("pareceres_tecnicos")
        .select(
          `
          *,
          pareceres_tecnicos_itens (*)
        `,
        )
        .order("created_at", { ascending: false });

      if (!isGestaoLocal) {
        pareceresQuery = pareceresQuery
          .or(`created_by_auth.eq.${user.id},tecnico_email.eq.${user.email}`)
          .limit(50);
      }

      const { data: pareceresData, error: pareceresError } =
        await pareceresQuery;

      if (pareceresError) throw pareceresError;

      const pareceresCarregados = (pareceresData || []) as ParecerHistorico[];
      const pareceresVisiveis = isGestaoLocal
        ? pareceresCarregados
        : pareceresCarregados.filter(
            (parecer) =>
              parecer.created_by_auth === user.id ||
              normalizarTexto(parecer.tecnico_email) ===
                normalizarTexto(user.email),
          );

      setHistorico(pareceresVisiveis);
    } catch (error: any) {
      console.error("Erro ao carregar parecer técnico:", error);

      setMensagem({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível carregar a página de parecer técnico.",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!mensagem) return;

    const timer = window.setTimeout(() => {
      setMensagem(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [mensagem]);

  function atualizarItem(
    tempId: string,
    campo: keyof ItemParecer,
    valor: string | boolean,
  ) {
    setItens((atual) =>
      atual.map((item) =>
        item.tempId === tempId ? { ...item, [campo]: valor } : item,
      ),
    );
  }

  function selecionarModelo(tempId: string, modeloId: string) {
    const modelo = modelosPorId.get(modeloId);

    setItens((atual) =>
      atual.map((item) => {
        if (item.tempId !== tempId) return item;

        return {
          ...item,
          modelo_id: modeloId,
          equipamento: modelo?.equipamento || "",
          marca_modelo: modelo?.marca || "",
        };
      }),
    );
  }

  function adicionarItem() {
    const itemCriado = novoItem();

    setItens((atual) => [...atual, itemCriado]);

    window.setTimeout(() => {
      document
        .getElementById(`equipamento-card-${itemCriado.tempId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }

  function removerItem(tempId: string) {
    setItens((atual) => {
      if (atual.length === 1) return atual;
      return atual.filter((item) => item.tempId !== tempId);
    });
  }

  function limparFormulario() {
    setEditandoParecerId(null);
    setEscolaDigitada("");
    setDataAtendimento(hojeIso());
    setTurno("");
    setChamadoReferencia("");
    setResumoAtendimento("");
    setObservacoesGerais("");
    setItens([novoItem()]);
    setSplashValidacao(null);
  }

  function cancelarEdicao() {
    limparFormulario();
    setMensagem({
      tipo: "info",
      texto: "Edição do rascunho cancelada.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function carregarRascunho(parecer: ParecerHistorico) {
    if (parecer.status !== "rascunho") {
      setMensagem({
        tipo: "error",
        texto: "Somente relatórios em rascunho podem ser editados.",
      });
      return;
    }

    if (
      usuario?.auth_user_id &&
      parecer.created_by_auth &&
      parecer.created_by_auth !== usuario.auth_user_id
    ) {
      setMensagem({
        tipo: "error",
        texto:
          "Este rascunho pertence a outro usuário e não pode ser editado por esta sessão.",
      });
      return;
    }

    setEditandoParecerId(parecer.id);
    setEscolaDigitada(parecer.escola_nome || "");
    setDataAtendimento(parecer.data_atendimento || hojeIso());
    setTurno(parecer.turno === "Noite" ? "" : parecer.turno || "");
    setChamadoReferencia(parecer.chamado_referencia || "");
    setResumoAtendimento(parecer.resumo_atendimento || "");
    setObservacoesGerais(parecer.observacoes_gerais || "");

    const itensDoParecer = parecer.pareceres_tecnicos_itens || [];

    if (itensDoParecer.length > 0) {
      setItens(
        itensDoParecer.map((item) => ({
          tempId: crypto.randomUUID(),
          modelo_id: item.modelo_id || "",
          equipamento: item.equipamento || "",
          marca_modelo: item.marca_modelo || "",
          numero_serie: item.numero_serie || "",
          patrimonio: item.patrimonio || "",
          problema_relatado: item.problema_relatado || "",
          possui_problema_fisico: Boolean(item.possui_problema_fisico),
          problema_fisico_descricao: item.problema_fisico_descricao || "",
          diagnostico: item.diagnostico || "",
          acao_realizada: item.acao_realizada || "",
          resultado: item.resultado || "",
          precisa_garantia: Boolean(item.precisa_garantia),
          registrado_bluemonitor: Boolean(item.registrado_bluemonitor),
          observacao: item.observacao || "",
        })),
      );
    } else {
      setItens([novoItem()]);
    }

    setMensagem({
      tipo: "info",
      texto:
        "Rascunho carregado para edição. Após ajustar, salve novamente ou finalize para gerar o PDF.",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function itemPossuiConteudo(item: ItemParecer) {
    return Boolean(
      item.modelo_id.trim() ||
      item.equipamento.trim() ||
      item.numero_serie.trim() ||
      item.patrimonio.trim() ||
      item.problema_relatado.trim() ||
      item.acao_realizada.trim() ||
      item.resultado.trim() ||
      item.problema_fisico_descricao.trim() ||
      item.observacao.trim() ||
      item.possui_problema_fisico ||
      item.precisa_garantia ||
      item.registrado_bluemonitor,
    );
  }

  function coletarPendencias(finalizar: boolean) {
    const pendencias: PendenciaValidacao[] = [];

    if (!usuario?.email) {
      pendencias.push({
        id: "parecer-tecnico-identificado",
        titulo: "Usuário técnico não identificado",
        detalhe:
          "Atualize a página ou faça login novamente antes de continuar.",
      });
    }

    if (!escolaSelecionada) {
      pendencias.push({
        id: "parecer-escola",
        titulo: "Unidade Escolar",
        detalhe:
          "Selecione uma escola válida exatamente como aparece na lista.",
      });
    }

    if (!dataAtendimento) {
      pendencias.push({
        id: "parecer-data",
        titulo: "Data do atendimento",
        detalhe: "Informe a data em que o atendimento foi realizado.",
      });
    }

    if (finalizar && resumoAtendimento.trim().length < 10) {
      pendencias.push({
        id: "parecer-resumo",
        titulo: "Resumo geral do atendimento",
        detalhe: "Preencha o resumo com pelo menos 10 caracteres.",
      });
    }

    const itensValidos = itens.filter(itemPossuiConteudo);

    if (itensValidos.length === 0) {
      pendencias.push({
        id: "equipamentos-avaliados",
        titulo: "Equipamento avaliado",
        detalhe: "Inclua pelo menos um equipamento no parecer.",
      });
    }

    if (finalizar) {
      itens.forEach((item, index) => {
        if (!itemPossuiConteudo(item)) return;

        const numero = index + 1;
        const prefixo = `Equipamento ${numero}`;

        if (!item.modelo_id.trim() || !item.equipamento.trim()) {
          pendencias.push({
            id: `item-${index}-modelo`,
            titulo: `${prefixo} — modelo`,
            detalhe:
              "Selecione um modelo cadastrado para identificar o equipamento.",
          });
        }

        if (!item.numero_serie.trim()) {
          pendencias.push({
            id: `item-${index}-serial`,
            titulo: `${prefixo} — número de série`,
            detalhe: "Informe o serial do equipamento.",
          });
        }

        if (!item.problema_relatado.trim()) {
          pendencias.push({
            id: `item-${index}-problema`,
            titulo: `${prefixo} — problema apresentado/identificado`,
            detalhe:
              "Descreva o problema apresentado pela escola ou identificado no atendimento.",
          });
        }

        if (!item.acao_realizada.trim()) {
          pendencias.push({
            id: `item-${index}-acao`,
            titulo: `${prefixo} — ação realizada`,
            detalhe: "Informe a ação técnica executada no equipamento.",
          });
        }

        if (!item.resultado.trim()) {
          pendencias.push({
            id: `item-${index}-resultado`,
            titulo: `${prefixo} — resultado`,
            detalhe: "Selecione o resultado final do atendimento.",
          });
        }

        if (
          item.possui_problema_fisico &&
          !item.problema_fisico_descricao.trim()
        ) {
          pendencias.push({
            id: `item-${index}-problema-fisico`,
            titulo: `${prefixo} — descrição do problema físico`,
            detalhe: "Detalhe o dano físico marcado neste equipamento.",
          });
        }
      });
    }

    return pendencias;
  }

  function irParaPendencia(id: string) {
    setSplashValidacao(null);

    window.setTimeout(() => {
      const elemento = document.getElementById(id);

      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", block: "center" });

        if ("focus" in elemento && typeof elemento.focus === "function") {
          elemento.focus({ preventScroll: true });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 120);
  }

  function validarFormulario(finalizar: boolean) {
    const pendencias = coletarPendencias(finalizar);

    if (pendencias.length === 0) {
      setSplashValidacao(null);
      return true;
    }

    if (finalizar) {
      setSplashValidacao({
        titulo: "Não foi possível finalizar o parecer",
        descricao:
          pendencias.length === 1
            ? "Existe 1 campo obrigatório pendente. Corrija a informação antes de gerar o PDF."
            : `Existem ${pendencias.length} campos obrigatórios pendentes. Corrija as informações antes de gerar o PDF.`,
        pendencias,
      });
    } else {
      setMensagem({
        tipo: "error",
        texto:
          pendencias[0]?.detalhe || "Revise os campos obrigatórios do parecer.",
      });
    }

    return false;
  }

  async function salvarParecer(status: "rascunho" | "finalizado") {
    if (salvandoRef.current) return;

    const finalizar = status === "finalizado";

    if (!validarFormulario(finalizar)) {
      if (!finalizar) {
        window.setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 50);
      }
      return;
    }

    salvandoRef.current = true;

    let janelaPdf: Window | null = null;

    if (finalizar) {
      janelaPdf = window.open("", "_blank");

      if (janelaPdf) {
        janelaPdf.document.open();
        janelaPdf.document.write(`
          <html>
            <body style="font-family: Arial; background:#020617; color:white; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
              <div style="text-align:center; max-width:520px; padding:24px;">
                <div style="width:42px; height:42px; border-radius:50%; border:3px solid #1e293b; border-top-color:#06b6d4; margin:0 auto 18px;"></div>
                <h2 style="margin:0 0 8px;">Gerando parecer técnico...</h2>
                <p style="color:#94a3b8; margin:0;">Aguarde enquanto o documento institucional é preparado.</p>
              </div>
            </body>
          </html>
        `);
        janelaPdf.document.close();
      }
    }

    setSalvando(true);

    try {
      const itensValidos = itens.filter(itemPossuiConteudo);

      const parecerPayload = {
        escola_id: escolaSelecionada!.id,
        escola_nome: escolaSelecionada!.nome_escola || "Escola não informada",
        cie: escolaSelecionada!.cie || null,
        endereco: escolaSelecionada!.endereco || null,
        telefone: escolaSelecionada!.telefone || null,
        email: escolaSelecionada!.email || null,

        tecnico_usuario_id: usuario?.id || null,
        tecnico_nome:
          usuario?.nome || usuario?.email || "Técnico não identificado",
        tecnico_email: usuario?.email || null,
        created_by_auth: usuario?.auth_user_id || null,

        data_atendimento: dataAtendimento,
        turno: turno || null,
        chamado_referencia: chamadoReferencia.trim() || null,
        resumo_atendimento: resumoAtendimento.trim() || null,
        observacoes_gerais: observacoesGerais.trim() || null,

        status,
        finalized_at: finalizar ? new Date().toISOString() : null,
      };

      let parecerCriado: any = null;

      if (editandoParecerId) {
        const { error: deleteItensError } = await supabase
          .from("pareceres_tecnicos_itens")
          .delete()
          .eq("parecer_id", editandoParecerId);

        if (deleteItensError) throw deleteItensError;

        const { data: parecerAtualizado, error: updateError } = await supabase
          .from("pareceres_tecnicos")
          .update(parecerPayload)
          .eq("id", editandoParecerId)
          .eq("status", "rascunho")
          .select("*")
          .single();

        if (updateError) throw updateError;

        parecerCriado = parecerAtualizado;
      } else {
        const { data: parecerNovo, error: parecerError } = await supabase
          .from("pareceres_tecnicos")
          .insert([parecerPayload])
          .select("*")
          .single();

        if (parecerError) throw parecerError;

        parecerCriado = parecerNovo;
      }

      const itensPayload = itensValidos.map((item) => ({
        parecer_id: parecerCriado.id,
        modelo_id: item.modelo_id || null,
        equipamento: item.equipamento.trim() || "Equipamento não informado",
        marca_modelo: item.marca_modelo.trim() || null,
        numero_serie: item.numero_serie.trim() || null,
        patrimonio: item.patrimonio.trim() || null,
        problema_relatado: item.problema_relatado.trim() || null,
        possui_problema_fisico: item.possui_problema_fisico,
        problema_fisico_descricao: item.possui_problema_fisico
          ? item.problema_fisico_descricao.trim() || null
          : null,
        diagnostico: item.diagnostico.trim() || null,
        acao_realizada: item.acao_realizada.trim() || null,
        resultado: item.resultado.trim() || null,
        precisa_garantia: item.precisa_garantia,
        registrado_bluemonitor: item.registrado_bluemonitor,
        observacao: item.observacao.trim() || null,
      }));

      const { data: itensCriados, error: itensError } = await supabase
        .from("pareceres_tecnicos_itens")
        .insert(itensPayload)
        .select("*");

      if (itensError) throw itensError;

      const parecerCompleto: ParecerHistorico = {
        ...(parecerCriado as ParecerHistorico),
        pareceres_tecnicos_itens: itensCriados || [],
      };

      setMensagem({
        tipo: "success",
        texto:
          status === "finalizado"
            ? "Parecer finalizado com sucesso. O PDF foi preparado."
            : editandoParecerId
              ? "Rascunho atualizado com sucesso."
              : "Rascunho salvo com sucesso.",
      });

      if (finalizar) {
        const htmlPdf = montarHtmlPdf(parecerCompleto);
        const tituloPdf = getNomeArquivoParecer(parecerCompleto);

        setPdfPronto({
          html: htmlPdf,
          titulo: tituloPdf,
          parecer: parecerCompleto,
        });

        const abriuPdf = abrirHtmlEmJanelaPdf(htmlPdf, tituloPdf, janelaPdf);

        if (!abriuPdf) {
          setMensagem({
            tipo: "info",
            texto:
              "Parecer finalizado com sucesso. O navegador bloqueou a abertura automática; use o botão Abrir PDF exibido na tela.",
          });
        }
      }

      limparFormulario();
      await carregar();
    } catch (error: any) {
      console.error("Erro ao salvar parecer técnico:", error);

      if (janelaPdf && !janelaPdf.closed) {
        janelaPdf.document.open();
        janelaPdf.document.write(`
          <html>
            <body style="font-family: Arial; background:#020617; color:white; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
              <div style="text-align:center; max-width:520px;">
                <h2 style="color:#f87171;">Erro ao gerar parecer</h2>
                <p style="color:#cbd5e1;">${escapeHtml(error?.message || "Falha ao salvar o parecer técnico.")}</p>
              </div>
            </body>
          </html>
        `);
        janelaPdf.document.close();
      }

      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível salvar o parecer técnico.",
      });
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  function handleSalvarRascunho(event: FormEvent) {
    event.preventDefault();
    salvarParecer("rascunho");
  }

  function handleFinalizar(event: FormEvent) {
    event.preventDefault();
    salvarParecer("finalizado");
  }

  function abrirRetornoChamado(parecer: ParecerHistorico) {
    if (parecer.status !== "finalizado") {
      setMensagem({
        tipo: "error",
        texto: "Finalize o relatório antes de gerar o retorno do chamado.",
      });
      return;
    }

    setRetornoChamadoModal({
      parecer,
      texto: montarTextoRetornoChamado(parecer),
    });
  }

  async function copiarRetornoChamado() {
    if (!retornoChamadoModal?.texto.trim()) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(retornoChamadoModal.texto);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = retornoChamadoModal.texto;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setMensagem({
        tipo: "success",
        texto: "Texto de retorno copiado. Agora basta colar no chamado.",
      });
    } catch (error) {
      console.error("Erro ao copiar retorno do chamado:", error);
      setMensagem({
        tipo: "error",
        texto: "Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.",
      });
    }
  }

  async function excluirEquipamentoGestao(itemId: string) {
    if (!isGestao) {
      setMensagem({
        tipo: "error",
        texto:
          "Apenas usuários SEINTEC ou admin podem excluir registros de equipamentos.",
      });
      return;
    }

    const confirmar = window.confirm(
      "Deseja realmente excluir este equipamento do parecer? Esta ação remove apenas este item e não exclui o parecer inteiro.",
    );

    if (!confirmar) return;

    try {
      setDeletandoItemId(itemId);

      const { error } = await supabase
        .from("pareceres_tecnicos_itens")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setHistorico((atual) =>
        atual.map((parecer) => ({
          ...parecer,
          pareceres_tecnicos_itens: (
            parecer.pareceres_tecnicos_itens || []
          ).filter((item) => item.id !== itemId),
        })),
      );

      setMensagem({
        tipo: "success",
        texto: "Equipamento excluído com sucesso do parecer técnico.",
      });
    } catch (error: any) {
      console.error("Erro ao excluir equipamento do parecer:", error);

      setMensagem({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível excluir o equipamento. Verifique a policy de exclusão para SEINTEC/admin no Supabase.",
      });
    } finally {
      setDeletandoItemId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[2rem] border border-slate-800 bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent shadow-[0_0_35px_rgba(6,182,212,0.25)]" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando relatórios técnicos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      <section
        id="parecer-tecnico-identificado"
        className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Parecer Técnico Field
              </span>

              {editandoParecerId && (
                <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
                  Rascunho em edição
                </span>
              )}

              {isGestao && (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Visão SEINTEC/Admin
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">
              Relatório Técnico de Equipamentos
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              Registre a visita, os equipamentos avaliados e finalize para gerar
              o PDF institucional.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("meus-relatorios")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:border-blue-500/45 hover:bg-blue-500/20"
            >
              <span aria-hidden="true">📁</span>
              {isGestao ? "Relatórios" : "Meus relatórios"}
            </button>

            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10 text-xs font-black text-cyan-300">
                {getInitials(usuario?.nome || usuario?.email || "TF")}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {usuario?.nome || "Usuário não identificado"}
                </p>
                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {usuario?.role || usuario?.email || "Perfil não informado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            mensagem.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : mensagem.tipo === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {isGestao && (
        <DashboardGestao
          dados={dashboardGestao}
          onDeleteItem={excluirEquipamentoGestao}
          deletingItemId={deletandoItemId}
        />
      )}

      {editandoParecerId && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
                Rascunho carregado para edição
              </p>
              <p className="mt-1 text-sm font-medium text-yellow-200/80">
                Você está editando um rascunho salvo anteriormente. Ao
                finalizar, ele será transformado em parecer finalizado e o PDF
                será gerado.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelarEdicao}
              className="rounded-xl border border-yellow-500/30 bg-[#020617] px-5 py-3 text-xs font-black uppercase tracking-widest text-yellow-300 transition-all hover:bg-yellow-500 hover:text-yellow-950"
            >
              Cancelar edição
            </button>
          </div>
        </div>
      )}

      <section className="rounded-[1.5rem] border border-slate-800 bg-[#020617] p-3 shadow-lg shadow-slate-950/20">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <MiniResumo label="Equipamentos" value={totaisItens.total} />
          <MiniResumo label="Resolvidos" value={totaisItens.resolvidos} />
          <MiniResumo label="Garantia" value={totaisItens.garantia} />
          <MiniResumo label="Dano físico" value={totaisItens.fisico} />
          <MiniResumo label="BlueMonitor" value={totaisItens.bluemonitor} />
          <MiniResumo
            label="Não localizado"
            value={totaisItens.naoLocalizados}
          />
        </div>
      </section>

      <form className="grid grid-cols-1 gap-7 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <Panel>
            <div className="mb-6">
              <h2 className="text-xl font-black text-white">
                Dados do atendimento
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Selecione a escola, informe a data e descreva o resumo geral da
                visita técnica.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Unidade Escolar *
                </label>

                <input
                  id="parecer-escola"
                  list="lista-escolas-parecer"
                  value={escolaDigitada}
                  onChange={(event) => setEscolaDigitada(event.target.value)}
                  placeholder="Digite para buscar a unidade escolar..."
                  className={`w-full rounded-2xl border bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:ring-1 ${
                    escolaInvalida
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500"
                  }`}
                />

                <datalist id="lista-escolas-parecer">
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.nome_escola || ""} />
                  ))}
                </datalist>

                {escolaInvalida && (
                  <p className="mt-2 text-xs font-bold text-red-400">
                    Escola não localizada. Selecione uma unidade exatamente como
                    aparece na lista.
                  </p>
                )}
              </div>

              {escolaSelecionada && (
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoBox
                      label="CIE"
                      value={escolaSelecionada.cie || "Não informado"}
                    />

                    <InfoBox
                      label="Telefone"
                      value={escolaSelecionada.telefone || "Não informado"}
                    />

                    <InfoBox
                      label="E-mail"
                      value={escolaSelecionada.email || "Não informado"}
                    />

                    <div className="md:col-span-3">
                      <InfoBox
                        label="Endereço"
                        value={escolaSelecionada.endereco || "Não informado"}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Data do atendimento *
                </label>

                <input
                  id="parecer-data"
                  type="date"
                  value={dataAtendimento}
                  onChange={(event) => setDataAtendimento(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Turno
                </label>

                <select
                  value={turno}
                  onChange={(event) => setTurno(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Selecione...</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Integral">Integral</option>
                  <option value="Atendimento na URE">Atendimento na URE</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Chamado / referência
                </label>

                <input
                  value={chamadoReferencia}
                  onChange={(event) => setChamadoReferencia(event.target.value)}
                  placeholder="Exemplo: STI-26/0000"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Resumo geral do atendimento *
                </label>

                <textarea
                  id="parecer-resumo"
                  rows={5}
                  value={resumoAtendimento}
                  onChange={(event) => setResumoAtendimento(event.target.value)}
                  placeholder="Descreva o contexto geral do atendimento realizado na escola..."
                  className="w-full resize-none rounded-2xl border border-slate-700/90 bg-slate-900/60 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)]"
                />
              </div>
            </div>
          </Panel>

          <div
            id="equipamentos-avaliados"
            className="mt-8 space-y-5 scroll-mt-24"
          >
            <div className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Equipamentos avaliados
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Preencha os equipamentos avaliados no atendimento técnico.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("finalizacao-relatorio")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500 hover:text-emerald-950"
                >
                  Ir para finalização
                </button>
              </div>
            </div>

            {itens.map((item, index) => {
              const modeloSelecionado = item.modelo_id
                ? modelosPorId.get(item.modelo_id)
                : null;

              return (
                <div
                  key={item.tempId}
                  id={`equipamento-card-${item.tempId}`}
                  className="scroll-mt-24"
                >
                  <Panel className="overflow-hidden border-slate-800/90 p-0 md:p-0">
                    <div className="relative overflow-hidden border-b border-slate-800 bg-slate-950/75 p-5 md:p-6">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_38%)]" />

                      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-black text-cyan-300 shadow-inner shadow-cyan-950/20">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                              Equipamento avaliado
                            </p>

                            <h3 className="mt-1 truncate text-xl font-black text-white">
                              {item.equipamento || "Novo equipamento"}
                            </h3>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                              {modeloSelecionado
                                ? [
                                    modeloSelecionado.marca,
                                    modeloSelecionado.tipo,
                                    modeloSelecionado.ano_recebimento,
                                  ]
                                    .filter(Boolean)
                                    .join(" • ") || "Modelo selecionado"
                                : "Selecione o modelo para preencher os dados automaticamente"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removerItem(item.tempId)}
                          disabled={itens.length === 1}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:border-red-500/50 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/40 disabled:text-slate-700"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5 p-5 md:p-6">
                      <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/35 p-4 md:p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-base">
                            🖥️
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                              Identificação do equipamento
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-slate-600">
                              Modelo, marca e identificadores patrimoniais.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                          <div className="lg:col-span-8">
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                              Modelo do equipamento *
                            </label>

                            <select
                              id={`item-${index}-modelo`}
                              value={item.modelo_id}
                              onChange={(event) =>
                                selecionarModelo(item.tempId, event.target.value)
                              }
                              className="min-h-[54px] w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            >
                              <option value="">
                                Selecione o modelo cadastrado...
                              </option>
                              {modelos.map((modelo) => (
                                <option key={modelo.id} value={modelo.id}>
                                  {modelo.equipamento || "Equipamento sem nome"}
                                  {modelo.marca ? ` • ${modelo.marca}` : ""}
                                  {modelo.ano_recebimento
                                    ? ` • ${modelo.ano_recebimento}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="lg:col-span-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                                Marca
                              </label>
                              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-cyan-300">
                                Automática
                              </span>
                            </div>

                            <div className="relative">
                              <input
                                value={item.marca_modelo}
                                readOnly
                                placeholder="Preenchida após selecionar o modelo"
                                className="min-h-[54px] w-full cursor-default rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 pr-11 text-sm font-bold text-cyan-100 outline-none placeholder:text-slate-700"
                              />
                              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-cyan-400/70">
                                ✓
                              </span>
                            </div>
                          </div>

                          <div className="lg:col-span-6">
                            <Campo
                              id={`item-${index}-serial`}
                              label="Número de série *"
                              value={item.numero_serie}
                              onChange={(value) =>
                                atualizarItem(item.tempId, "numero_serie", value)
                              }
                              placeholder="Serial do equipamento"
                            />
                          </div>

                          <div className="lg:col-span-6">
                            <Campo
                              label="Patrimônio"
                              value={item.patrimonio}
                              onChange={(value) =>
                                atualizarItem(item.tempId, "patrimonio", value)
                              }
                              placeholder="Número de patrimônio, se houver"
                            />
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/35 p-4 md:p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-base">
                            🛠️
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                              Atendimento técnico
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-slate-600">
                              Registre o resultado, o problema e a ação executada.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                              Resultado *
                            </label>

                            <select
                              id={`item-${index}-resultado`}
                              value={item.resultado}
                              onChange={(event) =>
                                atualizarItem(
                                  item.tempId,
                                  "resultado",
                                  event.target.value,
                                )
                              }
                              className="min-h-[54px] w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            >
                              <option value="">Selecione o resultado...</option>
                              {RESULTADOS.map((resultado) => (
                                <option key={resultado} value={resultado}>
                                  {resultado}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                            <div className="h-full [&>div]:flex [&>div]:h-full [&>div]:flex-col [&_textarea]:min-h-[170px] [&_textarea]:flex-1">
                              <Area
                                id={`item-${index}-problema`}
                                label="Problema apresentado/identificado *"
                                value={item.problema_relatado}
                                onChange={(value) =>
                                  atualizarItem(
                                    item.tempId,
                                    "problema_relatado",
                                    value,
                                  )
                                }
                                placeholder="Descreva o problema apresentado pela escola ou identificado durante a análise."
                              />
                            </div>

                            <div className="h-full [&>div]:flex [&>div]:h-full [&>div]:flex-col [&_textarea]:min-h-[170px] [&_textarea]:flex-1">
                              <Area
                                id={`item-${index}-acao`}
                                label="Ação realizada *"
                                value={item.acao_realizada}
                                onChange={(value) =>
                                  atualizarItem(
                                    item.tempId,
                                    "acao_realizada",
                                    value,
                                  )
                                }
                                placeholder="Informe objetivamente o procedimento executado no equipamento."
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/35 p-4 md:p-5">
                        <div className="mb-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                            Sinalizações complementares
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-600">
                            Marque somente as condições aplicáveis ao equipamento.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <CheckLinha
                            checked={item.possui_problema_fisico}
                            onChange={(checked) =>
                              atualizarItem(
                                item.tempId,
                                "possui_problema_fisico",
                                checked,
                              )
                            }
                            label="Problema físico aparente"
                            tone="red"
                          />

                          <CheckLinha
                            checked={item.precisa_garantia}
                            onChange={(checked) =>
                              atualizarItem(
                                item.tempId,
                                "precisa_garantia",
                                checked,
                              )
                            }
                            label="Garantia / tratativa"
                            tone="yellow"
                          />

                          <CheckLinha
                            checked={item.registrado_bluemonitor}
                            onChange={(checked) =>
                              atualizarItem(
                                item.tempId,
                                "registrado_bluemonitor",
                                checked,
                              )
                            }
                            label="BlueMonitor/DATAMOB"
                            tone="cyan"
                          />
                        </div>

                        {item.possui_problema_fisico && (
                          <div className="mt-4 border-t border-slate-800 pt-4 [&_textarea]:min-h-[130px]">
                            <Area
                              id={`item-${index}-problema-fisico`}
                              label="Descrição do problema físico *"
                              value={item.problema_fisico_descricao}
                              onChange={(value) =>
                                atualizarItem(
                                  item.tempId,
                                  "problema_fisico_descricao",
                                  value,
                                )
                              }
                              placeholder="Exemplo: tela quebrada, carcaça danificada, teclado arrancado ou conector quebrado."
                            />
                          </div>
                        )}
                      </section>

                      <details className="group rounded-[1.5rem] border border-slate-800 bg-slate-950/35 p-4 md:p-5">
                        <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-cyan-300">
                          <span className="flex items-center justify-between gap-3">
                            <span>
                              Observação adicional
                              <span className="ml-2 font-semibold normal-case tracking-normal text-slate-600">
                                opcional
                              </span>
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg transition group-open:rotate-45 group-open:border-cyan-500/30 group-open:text-cyan-300">
                              +
                            </span>
                          </span>
                        </summary>

                        <div className="mt-4 border-t border-slate-800 pt-4 [&_textarea]:min-h-[130px]">
                          <Area
                            label="Observação do equipamento"
                            value={item.observacao}
                            onChange={(value) =>
                              atualizarItem(item.tempId, "observacao", value)
                            }
                            placeholder="Registre somente informações complementares que não estejam nos campos anteriores."
                          />
                        </div>
                      </details>
                    </div>
                  </Panel>
                </div>
              );
            })}

            <div className="rounded-[2rem] border border-cyan-500/25 bg-cyan-500/[0.06] p-4 shadow-lg shadow-cyan-950/10 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">
                    Continuar o registro
                  </p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    Adicione outro equipamento ou avance diretamente para a finalização do relatório.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={adicionarItem}
                    className="min-h-[46px] rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950"
                  >
                    + Adicionar equipamento
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("finalizacao-relatorio")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="min-h-[46px] rounded-2xl bg-emerald-500 px-5 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-lg shadow-emerald-950/20 transition-all hover:bg-emerald-400"
                  >
                    Ir para finalização
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-7 xl:col-span-4">
          <div id="finalizacao-relatorio" className="scroll-mt-24">
            <Panel className="border-cyan-500/30 shadow-cyan-950/20">
            <div className="mb-5 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Etapa final
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Finalização do relatório
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-cyan-100/70">
                Revise as observações, salve como rascunho ou finalize para gerar o PDF institucional.
              </p>
            </div>

            {parecerEmEdicao && (
              <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-300">
                  Rascunho em edição
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-yellow-100">
                  {parecerEmEdicao.escola_nome}
                </p>
              </div>
            )}

            <div className="mt-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                Observações gerais
              </label>

              <textarea
                rows={6}
                value={observacoesGerais}
                onChange={(event) => setObservacoesGerais(event.target.value)}
                placeholder="Observações gerais do relatório, orientações à escola ou encaminhamentos finais..."
                className="w-full resize-none rounded-2xl border border-slate-700/90 bg-slate-900/60 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)]"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={salvando}
                className="min-h-[58px] rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black uppercase tracking-widest text-emerald-950 shadow-xl shadow-emerald-950/30 transition-all hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando
                  ? "Processando..."
                  : editandoParecerId
                    ? "Finalizar rascunho e gerar PDF"
                    : "Finalizar e gerar PDF"}
              </button>

              <button
                type="button"
                onClick={handleSalvarRascunho}
                disabled={salvando}
                className="rounded-2xl border border-slate-700 bg-[#020617] px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editandoParecerId ? "Atualizar rascunho" : "Salvar rascunho"}
              </button>

              {editandoParecerId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-yellow-300 transition-all hover:bg-yellow-500 hover:text-yellow-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar edição
                </button>
              )}

              <button
                type="button"
                onClick={limparFormulario}
                disabled={salvando}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar formulário
              </button>
            </div>
            </Panel>
          </div>

          <Panel id="meus-relatorios">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  {isGestao ? "Consulta geral" : "Acesso pessoal"}
                </p>
                <h2 className="text-xl font-black text-white">
                  {isGestao ? "Relatórios registrados" : "Meus relatórios"}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  {isGestao
                    ? "Relatórios de todos os técnicos, com PDF e retorno padronizado."
                    : "Somente os relatórios produzidos por você, com acesso rápido ao PDF e ao texto de retorno."}
                </p>
              </div>

              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">
                {historico.length}
              </span>
            </div>

            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {historico.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
                  <p className="text-3xl opacity-70">📭</p>
                  <p className="mt-2 text-sm font-black text-slate-400">
                    Nenhum relatório encontrado
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Os relatórios salvos aparecerão aqui.
                  </p>
                </div>
              ) : (
                historico.map((parecer) => {
                  const podeEditar =
                    parecer.status === "rascunho" &&
                    (!parecer.created_by_auth ||
                      parecer.created_by_auth === usuario?.auth_user_id);

                  return (
                    <div
                      key={parecer.id}
                      className={`rounded-2xl border p-4 ${
                        editandoParecerId === parecer.id
                          ? "border-yellow-500/40 bg-yellow-500/10"
                          : "border-slate-800 bg-slate-900/60"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-black text-white">
                            {parecer.escola_nome}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {formatarData(parecer.data_atendimento)} •{" "}
                            {parecer.tecnico_nome}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(
                            parecer.status,
                          )}`}
                        >
                          {parecer.status}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {parecer.resumo_atendimento || "Sem resumo informado."}
                      </p>

                      {(parecer.status === "finalizado" || podeEditar) && (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {parecer.status === "finalizado" && (
                            <>
                              <button
                                type="button"
                                onClick={() => gerarPdfParecer(parecer)}
                                className="min-h-[42px] rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950"
                              >
                                Abrir PDF
                              </button>

                              <button
                                type="button"
                                onClick={() => abrirRetornoChamado(parecer)}
                                className="min-h-[42px] rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-500 hover:text-white"
                              >
                                Gerar retorno
                              </button>
                            </>
                          )}

                          {podeEditar && (
                            <button
                              type="button"
                              onClick={() => carregarRascunho(parecer)}
                              className="min-h-[42px] rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-yellow-300 transition-all hover:bg-yellow-500 hover:text-yellow-950 sm:col-span-2"
                            >
                              Editar rascunho
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        </aside>
      </form>

      {splashValidacao && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020617]/95 p-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-validacao-parecer"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-red-500/30 bg-[#020617] shadow-2xl shadow-red-950/30"
          >
            <div className="relative overflow-hidden border-b border-slate-800 p-6 sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.20),transparent_38%)]" />

              <div className="relative z-10 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-2xl">
                  !
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
                    Campos obrigatórios pendentes
                  </p>
                  <h2
                    id="titulo-validacao-parecer"
                    className="text-2xl font-black tracking-tight text-white"
                  >
                    {splashValidacao.titulo}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                    {splashValidacao.descricao}
                  </p>
                </div>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-3">
                {splashValidacao.pendencias.map((pendencia, index) => (
                  <button
                    key={`${pendencia.id}-${index}`}
                    type="button"
                    onClick={() => irParaPendencia(pendencia.id)}
                    className="group flex w-full items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-left transition hover:border-red-500/40 hover:bg-red-500/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-xs font-black text-red-300">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-red-100">
                        {pendencia.titulo}
                      </span>
                      <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">
                        {pendencia.detalhe}
                      </span>
                    </span>
                    <span className="mt-1 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-red-300">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 sm:p-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSplashValidacao(null)}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    irParaPendencia(
                      splashValidacao.pendencias[0]?.id || "parecer-escola",
                    )
                  }
                  className="rounded-2xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500"
                >
                  Corrigir primeiro campo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {retornoChamadoModal && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#020617]/95 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRetornoChamadoModal(null);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-blue-500/30 bg-[#020617] shadow-2xl shadow-blue-950/30">
            <div className="relative shrink-0 overflow-hidden border-b border-slate-800 p-5 sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_38%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                    Retorno padronizado
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Texto pronto para o chamado
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                    O texto reúne escola, atendimento, equipamentos, números de série, ações e resultados. Ele pode ser ajustado antes de copiar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRetornoChamadoModal(null)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xl font-black text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoBox
                  label="Unidade Escolar"
                  value={retornoChamadoModal.parecer.escola_nome || "Não informada"}
                />
                <InfoBox
                  label="Data do atendimento"
                  value={formatarData(retornoChamadoModal.parecer.data_atendimento)}
                />
                <InfoBox
                  label="Equipamentos"
                  value={retornoChamadoModal.parecer.pareceres_tecnicos_itens?.length || 0}
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Texto do retorno
                </span>
                <textarea
                  value={retornoChamadoModal.texto}
                  onChange={(event) =>
                    setRetornoChamadoModal((atual) =>
                      atual ? { ...atual, texto: event.target.value } : atual,
                    )
                  }
                  rows={18}
                  className="custom-scrollbar w-full resize-y rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-sm font-medium leading-relaxed text-slate-200 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                />
              </label>
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 sm:p-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRetornoChamadoModal(null)}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => gerarPdfParecer(retornoChamadoModal.parecer)}
                  className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500 hover:text-cyan-950"
                >
                  Abrir PDF
                </button>

                <button
                  type="button"
                  onClick={copiarRetornoChamado}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
                >
                  Copiar texto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfPronto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-[#020617] shadow-2xl shadow-cyan-950/30">
            <div className="relative overflow-hidden border-b border-slate-800 p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_36%)]" />
              <div className="relative z-10">
                <p className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Parecer finalizado
                </p>

                <h2 className="text-2xl font-black tracking-tight text-white">
                  PDF pronto para impressão
                </h2>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  Caso a janela de impressão não tenha aberto automaticamente,
                  use o botão abaixo para abrir o documento e salvar em PDF.
                </p>
              </div>
            </div>

            <div className="space-y-3 p-6">
              <button
                type="button"
                onClick={() =>
                  abrirHtmlEmJanelaPdf(pdfPronto.html, pdfPronto.titulo)
                }
                className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400"
              >
                Abrir PDF / Imprimir
              </button>

              <button
                type="button"
                onClick={() => {
                  abrirRetornoChamado(pdfPronto.parecer);
                  setPdfPronto(null);
                }}
                className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-500 hover:text-white"
              >
                Gerar retorno para o chamado
              </button>

              <button
                type="button"
                onClick={() => setPdfPronto(null)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardGestao({
  dados,
  onDeleteItem,
  deletingItemId,
}: {
  dados: DashboardGestaoDados;
  onDeleteItem: (itemId: string) => void;
  deletingItemId: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [visualizacao, setVisualizacao] = useState<"lista" | "dashboard">(
    "lista",
  );
  const [filtroTecnico, setFiltroTecnico] = useState("Todos");
  const [filtroEquipamento, setFiltroEquipamento] = useState("Todos");
  const [filtroEscola, setFiltroEscola] = useState("Todos");
  const [buscaSerial, setBuscaSerial] = useState("");

  const tecnicos = useMemo(
    () =>
      Array.from(
        new Set(
          dados.todosItens
            .map((item) => item.tecnico_nome || "Técnico não informado")
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dados.todosItens],
  );

  const equipamentos = useMemo(
    () =>
      Array.from(
        new Set(
          dados.todosItens
            .map((item) => item.equipamento || "Equipamento não informado")
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dados.todosItens],
  );

  const escolas = useMemo(
    () =>
      Array.from(
        new Set(
          dados.todosItens
            .map((item) => item.escola_nome || "Escola não informada")
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dados.todosItens],
  );

  const itensFiltrados = useMemo(() => {
    const serial = normalizarTexto(buscaSerial);

    return dados.todosItens.filter((item) => {
      const matchTecnico =
        filtroTecnico === "Todos" || item.tecnico_nome === filtroTecnico;
      const matchEquipamento =
        filtroEquipamento === "Todos" || item.equipamento === filtroEquipamento;
      const matchEscola =
        filtroEscola === "Todos" || item.escola_nome === filtroEscola;
      const matchSerial = serial
        ? normalizarTexto(item.numero_serie).includes(serial)
        : true;

      return matchTecnico && matchEquipamento && matchEscola && matchSerial;
    });
  }, [
    buscaSerial,
    dados.todosItens,
    filtroEquipamento,
    filtroEscola,
    filtroTecnico,
  ]);

  const filtrosAtivos =
    Number(filtroTecnico !== "Todos") +
    Number(filtroEquipamento !== "Todos") +
    Number(filtroEscola !== "Todos") +
    Number(Boolean(buscaSerial.trim()));

  function limparFiltros() {
    setFiltroTecnico("Todos");
    setFiltroEquipamento("Todos");
    setFiltroEscola("Todos");
    setBuscaSerial("");
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-[#020617] shadow-xl shadow-emerald-950/10">
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              SEINTEC / Admin
            </div>

            <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">
              Central de equipamentos registrados
            </h2>

            <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              A relação completa fica recolhida para manter a página limpa. Abra
              quando precisar consultar, filtrar, excluir ou analisar os
              indicadores.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAberto((current) => !current)}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 text-xs font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500 hover:text-emerald-950"
          >
            {aberto ? "Ocultar central" : "Abrir relação e indicadores"}
            <span
              className={`text-base transition ${aberto ? "rotate-180" : ""}`}
            >
              ↓
            </span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <GestaoStat label="Relatórios" value={dados.totalPareceres} />
          <GestaoStat
            label="Equipamentos"
            value={dados.totalItens}
            tone="cyan"
          />
          <GestaoStat label="Garantia" value={dados.garantia} tone="orange" />
          <GestaoStat
            label="BlueMonitor"
            value={dados.bluemonitor}
            tone="blue"
          />
        </div>
      </div>

      {aberto && (
        <div className="border-t border-slate-800 bg-slate-950/35 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-2xl border border-slate-800 bg-[#020617] p-1">
              <button
                type="button"
                onClick={() => setVisualizacao("lista")}
                className={`flex-1 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition sm:flex-none ${
                  visualizacao === "lista"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                Relação completa
              </button>

              <button
                type="button"
                onClick={() => setVisualizacao("dashboard")}
                className={`flex-1 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition sm:flex-none ${
                  visualizacao === "dashboard"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/30"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                Rankings e métricas
              </button>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
              {visualizacao === "lista"
                ? `${itensFiltrados.length} de ${dados.todosItens.length} equipamento(s)`
                : "Indicadores consolidados dos registros carregados"}
            </p>
          </div>

          {visualizacao === "lista" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={filtroTecnico}
                    onChange={(event) => setFiltroTecnico(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="Todos">Todos os técnicos</option>
                    {tecnicos.map((tecnico) => (
                      <option key={tecnico} value={tecnico}>
                        {tecnico}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEquipamento}
                    onChange={(event) =>
                      setFiltroEquipamento(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="Todos">Todos os tipos de equipamento</option>
                    {equipamentos.map((equipamento) => (
                      <option key={equipamento} value={equipamento}>
                        {equipamento}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEscola}
                    onChange={(event) => setFiltroEscola(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="Todos">Todas as escolas</option>
                    {escolas.map((escola) => (
                      <option key={escola} value={escola}>
                        {escola}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <input
                      value={buscaSerial}
                      onChange={(event) => setBuscaSerial(event.target.value)}
                      placeholder="Pesquisar por serial..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pr-10 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                      ⌕
                    </span>
                  </div>
                </div>

                {filtrosAtivos > 0 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={limparFiltros}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      Limpar {filtrosAtivos} filtro(s)
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-[680px] overflow-y-auto rounded-2xl border border-slate-800 bg-[#020617] p-2 custom-scrollbar">
                {itensFiltrados.length === 0 ? (
                  <EmptyMini message="Nenhum equipamento corresponde aos filtros aplicados." />
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {itensFiltrados.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                {formatarData(item.data_atendimento)}
                              </p>
                              <h3 className="mt-1 break-words text-sm font-black text-white">
                                {item.equipamento}
                              </h3>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {item.marca_modelo ||
                                  "Marca/modelo não informado"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              disabled={deletingItemId === item.id}
                              className="shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                            >
                              {deletingItemId === item.id ? "..." : "Excluir"}
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <MobileInfo
                              label="Escola"
                              value={item.escola_nome}
                            />
                            <MobileInfo
                              label="Técnico"
                              value={item.tecnico_nome}
                            />
                            <MobileInfo
                              label="Serial"
                              value={item.numero_serie || "N/I"}
                              mono
                            />
                            <MobileInfo
                              label="Resultado"
                              value={item.resultado || "Sem resultado"}
                            />
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[1050px] border-separate border-spacing-y-2 text-left">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            <th className="px-3 py-2">Data</th>
                            <th className="px-3 py-2">Escola</th>
                            <th className="px-3 py-2">Técnico</th>
                            <th className="px-3 py-2">Equipamento</th>
                            <th className="px-3 py-2">Serial</th>
                            <th className="px-3 py-2">Resultado</th>
                            <th className="px-3 py-2">BlueMonitor</th>
                            <th className="px-3 py-2">Ação</th>
                          </tr>
                        </thead>

                        <tbody>
                          {itensFiltrados.map((item) => (
                            <tr
                              key={item.id}
                              className="bg-slate-900/60 text-sm text-slate-300"
                            >
                              <td className="rounded-l-2xl px-3 py-3 font-bold text-slate-500">
                                {formatarData(item.data_atendimento)}
                              </td>
                              <td className="max-w-[240px] px-3 py-3 font-bold text-white">
                                <span className="line-clamp-2">
                                  {item.escola_nome}
                                </span>
                              </td>
                              <td className="max-w-[190px] px-3 py-3">
                                <span className="line-clamp-2">
                                  {item.tecnico_nome}
                                </span>
                              </td>
                              <td className="max-w-[240px] px-3 py-3">
                                <span className="font-bold text-slate-200">
                                  {item.equipamento}
                                </span>
                                {item.marca_modelo ? (
                                  <span className="mt-1 block text-xs text-slate-600">
                                    {item.marca_modelo}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-cyan-200">
                                {item.numero_serie || "N/I"}
                              </td>
                              <td className="px-3 py-3">
                                <span className="inline-flex max-w-[190px] rounded-full border border-slate-700 bg-[#020617] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                                  {item.resultado || "Sem resultado"}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                                    item.registrado_bluemonitor
                                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                      : "border-slate-700 bg-slate-900 text-slate-600"
                                  }`}
                                >
                                  {item.registrado_bluemonitor ? "Sim" : "Não"}
                                </span>
                              </td>
                              <td className="rounded-r-2xl px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() => onDeleteItem(item.id)}
                                  disabled={deletingItemId === item.id}
                                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingItemId === item.id
                                    ? "Excluindo..."
                                    : "Excluir"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <RankingPanel
                  title="Equipamentos por técnico"
                  description="Quantidade de itens registrados em relatórios por profissional."
                  data={dados.topTecnicos}
                  tone="cyan"
                />

                <RankingPanel
                  title="Equipamentos mais atendidos"
                  description="Modelos/tipos com maior volume de registros técnicos."
                  data={dados.topEquipamentos}
                  tone="blue"
                />

                <RankingPanel
                  title="Escolas com mais itens"
                  description="Unidades com maior quantidade de equipamentos avaliados."
                  data={dados.topEscolas}
                  tone="emerald"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel>
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-white">
                      Resultados mais registrados
                    </h3>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Leitura consolidada dos desfechos informados nos itens.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {dados.topResultados.length === 0 ? (
                      <div className="sm:col-span-2">
                        <EmptyMini message="Sem resultados registrados." />
                      </div>
                    ) : (
                      dados.topResultados.map((item, index) => (
                        <RankingLinha
                          key={item.resultado}
                          posicao={index + 1}
                          titulo={item.resultado}
                          valor={item.total}
                        />
                      ))
                    )}
                  </div>
                </Panel>

                <Panel>
                  <h3 className="text-lg font-black text-white">
                    Leitura operacional
                  </h3>

                  <div className="mt-4 space-y-3">
                    <InsightLinha
                      label="Itens que exigem atenção"
                      value={
                        dados.garantia + dados.fisico + dados.naoLocalizados
                      }
                      description="Garantia, dano físico ou equipamento não localizado."
                      tone="red"
                    />
                    <InsightLinha
                      label="Cobertura BlueMonitor/DATAMOB"
                      value={
                        dados.totalItens > 0
                          ? `${Math.round((dados.bluemonitor / dados.totalItens) * 100)}%`
                          : "0%"
                      }
                      description="Percentual dos itens marcados como registrados."
                      tone="cyan"
                    />
                    <InsightLinha
                      label="Taxa de finalização"
                      value={
                        dados.totalPareceres > 0
                          ? `${Math.round((dados.finalizados / dados.totalPareceres) * 100)}%`
                          : "0%"
                      }
                      description="Relatórios finalizados sobre o total carregado."
                      tone="green"
                    />
                  </div>
                </Panel>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function GestaoStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "yellow" | "cyan" | "orange" | "red" | "blue";
}) {
  const classes = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/[0.07] text-yellow-300",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.07] text-cyan-300",
    orange: "border-orange-500/20 bg-orange-500/[0.07] text-orange-300",
    red: "border-red-500/20 bg-red-500/[0.07] text-red-300",
    blue: "border-blue-500/20 bg-blue-500/[0.07] text-blue-300",
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 ${classes}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MobileInfo({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-[#020617] p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-xs font-bold text-slate-300 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RankingPanel({
  title,
  description,
  data,
  tone,
}: {
  title: string;
  description: string;
  data: Array<{ nome: string; total: number }>;
  tone: "cyan" | "blue" | "emerald";
}) {
  const maior = Math.max(...data.map((item) => item.total), 1);

  return (
    <Panel>
      <div className="mb-5">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
          {description}
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyMini message="Sem dados suficientes para o ranking." />
      ) : (
        <div className="space-y-4">
          {data.slice(0, 8).map((item, index) => (
            <RankingBar
              key={item.nome}
              posicao={index + 1}
              titulo={item.nome}
              valor={item.total}
              percentual={(item.total / maior) * 100}
              tone={tone}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function RankingBar({
  posicao,
  titulo,
  valor,
  percentual,
  tone,
}: {
  posicao: number;
  titulo: string;
  valor: number;
  percentual: number;
  tone: "cyan" | "blue" | "emerald";
}) {
  const barClass = {
    cyan: "bg-cyan-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-400">
            {posicao}
          </span>
          <p
            className="truncate text-xs font-bold text-slate-300"
            title={titulo}
          >
            {titulo}
          </p>
        </div>
        <span className="text-sm font-black text-white">{valor}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.max(percentual, 4)}%` }}
        />
      </div>
    </div>
  );
}

function Panel({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`scroll-mt-5 rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function MiniResumo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300/80">
        {label}
      </p>

      <p
        className="mt-1 truncate text-sm font-bold text-slate-200"
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-2xl border border-slate-700/90 px-4 py-4 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)] ${
          readOnly ? "bg-slate-900/30 text-slate-400" : "bg-slate-900/60"
        }`}
      />
    </div>
  );
}

function Area({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>

      <textarea
        id={id}
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-slate-700/90 bg-slate-900/60 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)]"
      />
    </div>
  );
}

function CheckLinha({
  checked,
  onChange,
  label,
  tone = "cyan",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  tone?: "cyan" | "red" | "yellow";
}) {
  const toneClasses = {
    cyan: checked
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
      : "border-slate-800 bg-[#020617] text-slate-300",
    red: checked
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-slate-800 bg-[#020617] text-slate-300",
    yellow: checked
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-slate-800 bg-[#020617] text-slate-300",
  }[tone];

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all hover:border-slate-700 ${toneClasses}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-cyan-500"
      />

      <span className="text-xs font-bold">{label}</span>
    </label>
  );
}

function RankingLinha({
  posicao,
  titulo,
  valor,
}: {
  posicao: number;
  titulo: string;
  valor: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-black text-cyan-300">
          {posicao}
        </span>

        <p className="truncate text-sm font-bold text-slate-300">{titulo}</p>
      </div>

      <span className="text-lg font-black text-white">{valor}</span>
    </div>
  );
}

function InsightLinha({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  tone: "green" | "red" | "cyan";
}) {
  const colors = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${colors}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>

      <p className="mt-1 text-xs font-semibold leading-relaxed opacity-80">
        {description}
      </p>
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
      <p className="text-sm font-bold text-slate-500">{message}</p>
    </div>
  );
}
