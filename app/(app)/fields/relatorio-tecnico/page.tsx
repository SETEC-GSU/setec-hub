"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type UsuarioPerfil = {
  id: string
  auth_user_id: string
  nome: string | null
  email: string | null
  role?: string | null
  setor?: string | null
}

type Escola = {
  id: string
  nome_escola: string | null
  cie?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  tecnico_atribuido?: string | null
  diretor?: string | null
}

type EquipamentoModelo = {
  id: string
  equipamento: string | null
  tipo?: string | null
  marca?: string | null
  uso?: string | null
  finalidade?: string | null
  ano_recebimento?: number | null
  imagem_url?: string | null
}

type ItemParecer = {
  tempId: string
  modelo_id: string
  equipamento: string
  marca_modelo: string
  numero_serie: string
  patrimonio: string
  problema_relatado: string
  possui_problema_fisico: boolean
  problema_fisico_descricao: string
  diagnostico: string
  acao_realizada: string
  resultado: string
  precisa_garantia: boolean
  registrado_bluemonitor: boolean
  observacao: string
}

type ParecerHistorico = {
  id: string
  escola_id: string | null
  escola_nome: string
  cie?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  tecnico_usuario_id?: string | null
  tecnico_nome: string
  tecnico_email?: string | null
  data_atendimento: string
  turno?: string | null
  chamado_referencia?: string | null
  resumo_atendimento?: string | null
  observacoes_gerais?: string | null
  status: "rascunho" | "finalizado"
  created_by_auth?: string | null
  created_at?: string | null
  finalized_at?: string | null
  pareceres_tecnicos_itens?: Array<{
    id: string
    modelo_id?: string | null
    equipamento: string
    marca_modelo?: string | null
    patrimonio?: string | null
    numero_serie?: string | null
    problema_relatado?: string | null
    possui_problema_fisico?: boolean | null
    problema_fisico_descricao?: string | null
    diagnostico?: string | null
    acao_realizada?: string | null
    resultado?: string | null
    precisa_garantia?: boolean | null
    registrado_bluemonitor?: boolean | null
    observacao?: string | null
  }>
}

type MensagemTela = {
  tipo: "success" | "error" | "info"
  texto: string
} | null

type DashboardGestaoDados = {
  totalPareceres: number
  finalizados: number
  rascunhos: number
  totalItens: number
  garantia: number
  fisico: number
  bluemonitor: number
  naoLocalizados: number
  topTecnicos: Array<{ nome: string; total: number }>
  topResultados: Array<{ resultado: string; total: number }>
  ultimosItens: Array<{
    id: string
    parecer_id: string
    parecer_status: "rascunho" | "finalizado"
    escola_nome: string
    tecnico_nome: string
    data_atendimento: string
    equipamento: string
    marca_modelo?: string | null
    numero_serie?: string | null
    resultado?: string | null
    precisa_garantia?: boolean | null
    registrado_bluemonitor?: boolean | null
  }>
}

const RESULTADOS = [
  "Resolvido",
  "Resolvido parcialmente",
  "Encaminhado para garantia",
  "Equipamento com problema físico",
  "Equipamento não localizado",
  "Equipamento sem solução local",
  "Equipamento substituído",
  "Orientação realizada",
  "Pendente de nova visita",
]

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
  }
}

function hojeIso() {
  const hoje = new Date()
  const year = hoje.getFullYear()
  const month = String(hoje.getMonth() + 1).padStart(2, "0")
  const day = String(hoje.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Sem data"

  const data = new Date(`${dataIso}T00:00:00`)

  if (Number.isNaN(data.getTime())) return "Sem data"

  return data.toLocaleDateString("pt-BR")
}

function formatarDataHora(dataIso?: string | null) {
  if (!dataIso) return "Sem registro"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function nl2br(value: unknown) {
  return escapeHtml(value).replaceAll("\n", "<br />")
}

function getInitials(nome: string) {
  const clean = String(nome || "").trim()

  if (!clean) return "TF"

  const partes = clean.split(" ").filter(Boolean)

  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

function getStatusClass(status: string) {
  if (status === "finalizado") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
}

function getResultadoClass(resultado?: string | null) {
  const texto = normalizarTexto(resultado)

  if (texto.includes("resolvido") && !texto.includes("parcial")) {
    return "success"
  }

  if (texto.includes("garantia") || texto.includes("fisico")) {
    return "danger"
  }

  if (texto.includes("nao localizado") || texto.includes("não localizado")) {
    return "warning"
  }

  if (texto.includes("pendente") || texto.includes("parcial")) {
    return "warning"
  }

  return "neutral"
}

function montarHtmlPdf(parecer: ParecerHistorico) {
  const itens = parecer.pareceres_tecnicos_itens || []

  const itensHtml = itens
    .map((item, index) => {
      const resultadoClass = getResultadoClass(item.resultado)

      return `
        <section class="item">
          <div class="item-header">
            <div>
              <p class="eyebrow">Equipamento ${index + 1}</p>
              <h3>${escapeHtml(item.equipamento || "Equipamento não informado")}</h3>
            </div>
            <span class="tag ${resultadoClass}">
              ${escapeHtml(item.resultado || "Sem resultado")}
            </span>
          </div>

          <div class="grid">
            <div>
              <p class="label">Modelo do equipamento</p>
              <p>${escapeHtml(item.equipamento || "Não informado")}</p>
            </div>
            <div>
              <p class="label">Marca</p>
              <p>${escapeHtml(item.marca_modelo || "Não informado")}</p>
            </div>
            <div>
              <p class="label">Número de série</p>
              <p>${escapeHtml(item.numero_serie || "Não informado")}</p>
            </div>
            <div>
              <p class="label">Patrimônio</p>
              <p>${escapeHtml(item.patrimonio || "Não informado")}</p>
            </div>
            <div>
              <p class="label">Registro BlueMonitor/DATAMOB</p>
              <p>${item.registrado_bluemonitor ? "Sim" : "Não"}</p>
            </div>
            <div>
              <p class="label">Garantia / tratativa</p>
              <p>${item.precisa_garantia ? "Sim" : "Não"}</p>
            </div>
          </div>

          <div class="block">
            <p class="label">Problema relatado</p>
            <p>${nl2br(item.problema_relatado || "Não informado")}</p>
          </div>

          <div class="block">
            <p class="label">Diagnóstico técnico</p>
            <p>${nl2br(item.diagnostico || "Não informado")}</p>
          </div>

          <div class="block">
            <p class="label">Ação realizada</p>
            <p>${nl2br(item.acao_realizada || "Não informado")}</p>
          </div>

          ${
            item.possui_problema_fisico
              ? `
              <div class="block danger-box">
                <p class="label">Problema físico identificado</p>
                <p>${nl2br(item.problema_fisico_descricao || "Problema físico informado, sem detalhamento adicional.")}</p>
              </div>
            `
              : `
              <div class="block success-box">
                <p class="label">Problema físico</p>
                <p>Não foi informado problema físico aparente no equipamento.</p>
              </div>
            `
          }

          ${
            item.observacao
              ? `
              <div class="block">
                <p class="label">Observações do item</p>
                <p>${nl2br(item.observacao)}</p>
              </div>
            `
              : ""
          }
        </section>
      `
    })
    .join("")

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Parecer Técnico - ${escapeHtml(parecer.escola_nome)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm;
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
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
    }

    .header {
      border-bottom: 3px solid #1d4ed8;
      padding-bottom: 16px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      break-inside: avoid;
    }

    .brand {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .logo {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: linear-gradient(135deg, #1d4ed8, #06b6d4);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      letter-spacing: -1px;
      font-size: 16px;
    }

    .title h1 {
      margin: 0;
      font-size: 22px;
      color: #0f172a;
      letter-spacing: -0.3px;
    }

    .title p {
      margin: 3px 0 0;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .doc-info {
      text-align: right;
      min-width: 190px;
    }

    .doc-info p {
      margin: 0 0 4px;
      color: #475569;
      font-size: 11px;
    }

    .doc-info strong {
      color: #0f172a;
    }

    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-weight: 900;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 6px;
    }

    .panel {
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .panel-title {
      margin: 0 0 10px;
      color: #1e3a8a;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 900;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 16px;
    }

    .label {
      margin: 0 0 3px;
      color: #64748b;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .8px;
    }

    p {
      margin: 0;
    }

    .value {
      color: #0f172a;
      font-weight: 700;
    }

    .summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      color: #1e293b;
      font-weight: 600;
    }

    .item {
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .eyebrow {
      margin: 0 0 3px;
      color: #2563eb;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    h3 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
    }

    .tag {
      border-radius: 999px;
      padding: 6px 9px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .7px;
      white-space: nowrap;
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

    .block {
      margin-top: 12px;
      padding: 10px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .danger-box {
      background: #fef2f2;
      border-color: #fecaca;
      color: #7f1d1d;
    }

    .success-box {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #14532d;
    }

    .footer {
      margin-top: 26px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .signature {
      padding-top: 38px;
      border-top: 1px solid #334155;
      text-align: center;
      font-size: 11px;
      color: #334155;
      font-weight: 700;
    }

    .note {
      margin-top: 16px;
      font-size: 10px;
      color: #64748b;
      text-align: center;
    }

    @media print {
      body {
        background: white;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <div class="logo">SETEC</div>
      <div class="title">
        <h1>Parecer Técnico de Atendimento</h1>
        <p>SETEC Hub • URE Guarulhos Sul</p>
      </div>
    </div>

    <div class="doc-info">
      <p><strong>Data:</strong> ${escapeHtml(formatarData(parecer.data_atendimento))}</p>
      <p><strong>Status:</strong> ${escapeHtml(parecer.status)}</p>
      <p><strong>Gerado em:</strong> ${escapeHtml(formatarDataHora(new Date().toISOString()))}</p>
      <span class="badge">Documento Institucional</span>
    </div>
  </header>

  <section class="panel">
    <h2 class="panel-title">Dados da Unidade Escolar</h2>
    <div class="grid">
      <div>
        <p class="label">Unidade Escolar</p>
        <p class="value">${escapeHtml(parecer.escola_nome)}</p>
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
        <p class="label">Contato da Escola</p>
        <p class="value">${escapeHtml(parecer.telefone || "Não informado")} • ${escapeHtml(parecer.email || "Não informado")}</p>
      </div>
    </div>
  </section>

  <section class="panel">
    <h2 class="panel-title">Dados do Atendimento</h2>
    <div class="grid">
      <div>
        <p class="label">Técnico Responsável</p>
        <p class="value">${escapeHtml(parecer.tecnico_nome)}</p>
      </div>
      <div>
        <p class="label">E-mail do Técnico</p>
        <p class="value">${escapeHtml(parecer.tecnico_email || "Não informado")}</p>
      </div>
      <div>
        <p class="label">Turno</p>
        <p class="value">${escapeHtml(parecer.turno || "Não informado")}</p>
      </div>
      <div>
        <p class="label">Chamado / Referência</p>
        <p class="value">${escapeHtml(parecer.chamado_referencia || "Não informado")}</p>
      </div>
    </div>
  </section>

  <section class="panel">
    <h2 class="panel-title">Resumo Geral do Atendimento</h2>
    <div class="summary">${nl2br(parecer.resumo_atendimento || "Sem resumo geral informado.")}</div>
  </section>

  <section>
    <h2 class="panel-title">Equipamentos Avaliados</h2>
    ${itensHtml || `<div class="panel"><p>Nenhum equipamento informado.</p></div>`}
  </section>

  ${
    parecer.observacoes_gerais
      ? `
      <section class="panel">
        <h2 class="panel-title">Observações Gerais</h2>
        <div class="summary">${nl2br(parecer.observacoes_gerais)}</div>
      </section>
    `
      : ""
  }

  <footer class="footer">
    <div class="signature">
      ${escapeHtml(parecer.tecnico_nome)}<br />
      Técnico Responsável
    </div>
    <div class="signature">
      Responsável da Unidade Escolar<br />
      Assinatura / Carimbo
    </div>
  </footer>

  <p class="note">
    Documento gerado pelo SETEC Hub. Este parecer registra as informações técnicas declaradas no atendimento realizado.
  </p>

</body>
</html>
`
}

function gerarPdfParecer(parecer: ParecerHistorico, janela?: Window | null) {
  const printWindow = janela && !janela.closed ? janela : window.open("", "_blank")

  if (!printWindow) {
    alert("O navegador bloqueou a janela do PDF. Libere pop-ups para esta página e tente novamente.")
    return
  }

  const html = montarHtmlPdf(parecer)

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  window.setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (error) {
      console.error("Erro ao acionar impressão do PDF:", error)
      alert("O parecer foi gerado, mas o navegador bloqueou a impressão automática. Use Ctrl+P na janela aberta para salvar em PDF.")
    }
  }, 900)
}

export default function ParecerTecnicoPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  const [deletandoItemId, setDeletandoItemId] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null)
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [modelos, setModelos] = useState<EquipamentoModelo[]>([])
  const [historico, setHistorico] = useState<ParecerHistorico[]>([])

  const [editandoParecerId, setEditandoParecerId] = useState<string | null>(null)

  const [escolaDigitada, setEscolaDigitada] = useState("")
  const [dataAtendimento, setDataAtendimento] = useState(hojeIso())
  const [turno, setTurno] = useState("")
  const [chamadoReferencia, setChamadoReferencia] = useState("")
  const [resumoAtendimento, setResumoAtendimento] = useState("")
  const [observacoesGerais, setObservacoesGerais] = useState("")
  const [itens, setItens] = useState<ItemParecer[]>([novoItem()])

  const roleNormalizada = normalizarTexto(usuario?.role)
  const isGestao = roleNormalizada === "admin" || roleNormalizada === "seintec"

  const modelosPorId = useMemo(() => {
    return new Map(modelos.map((modelo) => [modelo.id, modelo]))
  }, [modelos])

  const escolaSelecionada = useMemo(() => {
    if (!escolaDigitada.trim()) return null

    return (
      escolas.find(
        (escola) =>
          normalizarTexto(escola.nome_escola) === normalizarTexto(escolaDigitada)
      ) || null
    )
  }, [escolas, escolaDigitada])

  const escolaInvalida = escolaDigitada.trim() && !escolaSelecionada

  const totaisItens = useMemo(() => {
    const total = itens.length
    const garantia = itens.filter((item) => item.precisa_garantia).length
    const fisico = itens.filter((item) => item.possui_problema_fisico).length
    const bluemonitor = itens.filter((item) => item.registrado_bluemonitor).length
    const naoLocalizados = itens.filter(
      (item) => normalizarTexto(item.resultado) === "equipamento nao localizado"
    ).length
    const resolvidos = itens.filter((item) =>
      normalizarTexto(item.resultado).includes("resolvido")
    ).length

    return { total, garantia, fisico, resolvidos, bluemonitor, naoLocalizados }
  }, [itens])

  const parecerEmEdicao = useMemo(() => {
    if (!editandoParecerId) return null
    return historico.find((parecer) => parecer.id === editandoParecerId) || null
  }, [editandoParecerId, historico])

  const dashboardGestao = useMemo<DashboardGestaoDados>(() => {
    const todosItens = historico.flatMap((parecer) =>
      (parecer.pareceres_tecnicos_itens || []).map((item) => ({
        ...item,
        parecer,
      }))
    )

    const topTecnicosMap = new Map<string, number>()
    const topResultadosMap = new Map<string, number>()

    historico.forEach((parecer) => {
      const tecnico = parecer.tecnico_nome || "Técnico não informado"
      topTecnicosMap.set(tecnico, (topTecnicosMap.get(tecnico) || 0) + 1)
    })

    todosItens.forEach((item) => {
      const resultado = item.resultado || "Sem resultado"
      topResultadosMap.set(resultado, (topResultadosMap.get(resultado) || 0) + 1)
    })

    const topTecnicos = Array.from(topTecnicosMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)

    const topResultados = Array.from(topResultadosMap.entries())
      .map(([resultado, total]) => ({ resultado, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)

    const ultimosItens = todosItens.slice(0, 50).map((item) => ({
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

    return {
      totalPareceres: historico.length,
      finalizados: historico.filter((parecer) => parecer.status === "finalizado").length,
      rascunhos: historico.filter((parecer) => parecer.status === "rascunho").length,
      totalItens: todosItens.length,
      garantia: todosItens.filter((item) => item.precisa_garantia).length,
      fisico: todosItens.filter((item) => item.possui_problema_fisico).length,
      bluemonitor: todosItens.filter((item) => item.registrado_bluemonitor).length,
      naoLocalizados: todosItens.filter(
        (item) => normalizarTexto(item.resultado) === "equipamento nao localizado"
      ).length,
      topTecnicos,
      topResultados,
      ultimosItens,
    }
  }, [historico])

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setMensagem(null)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user?.email) {
        throw new Error("Sessão não identificada. Faça login novamente.")
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
          .select("id, nome_escola, cie, endereco, telefone, email, tecnico_atribuido, diretor")
          .order("nome_escola", { ascending: true }),
        supabase
          .from("equipamentos_modelos")
          .select("id, equipamento, tipo, marca, uso, finalidade, ano_recebimento, imagem_url")
          .order("equipamento", { ascending: true }),
      ])

      if (escolasError) throw escolasError
      if (modelosError) throw modelosError

      const perfil = perfilData as UsuarioPerfil | null
      const rolePerfil = perfil?.role || null
      const isGestaoLocal =
        normalizarTexto(rolePerfil) === "admin" ||
        normalizarTexto(rolePerfil) === "seintec"

      setUsuario({
        id: perfil?.id || user.id,
        auth_user_id: user.id,
        nome: perfil?.nome || user.email,
        email: user.email,
        role: rolePerfil,
        setor: perfil?.setor || null,
      })

      setEscolas((escolasData || []) as Escola[])
      setModelos((modelosData || []) as EquipamentoModelo[])

      const { data: pareceresData, error: pareceresError } = await supabase
        .from("pareceres_tecnicos")
        .select(`
          *,
          pareceres_tecnicos_itens (*)
        `)
        .order("created_at", { ascending: false })
        .limit(isGestaoLocal ? 200 : 12)

      if (pareceresError) throw pareceresError

      setHistorico((pareceresData || []) as ParecerHistorico[])
    } catch (error: any) {
      console.error("Erro ao carregar parecer técnico:", error)

      setMensagem({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível carregar a página de parecer técnico.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  function atualizarItem(
    tempId: string,
    campo: keyof ItemParecer,
    valor: string | boolean
  ) {
    setItens((atual) =>
      atual.map((item) =>
        item.tempId === tempId ? { ...item, [campo]: valor } : item
      )
    )
  }

  function selecionarModelo(tempId: string, modeloId: string) {
    const modelo = modelosPorId.get(modeloId)

    setItens((atual) =>
      atual.map((item) => {
        if (item.tempId !== tempId) return item

        return {
          ...item,
          modelo_id: modeloId,
          equipamento: modelo?.equipamento || "",
          marca_modelo: modelo?.marca || "",
        }
      })
    )
  }

  function adicionarItem() {
    setItens((atual) => [...atual, novoItem()])
  }

  function removerItem(tempId: string) {
    setItens((atual) => {
      if (atual.length === 1) return atual
      return atual.filter((item) => item.tempId !== tempId)
    })
  }

  function limparFormulario() {
    setEditandoParecerId(null)
    setEscolaDigitada("")
    setDataAtendimento(hojeIso())
    setTurno("")
    setChamadoReferencia("")
    setResumoAtendimento("")
    setObservacoesGerais("")
    setItens([novoItem()])
  }

  function cancelarEdicao() {
    limparFormulario()
    setMensagem({
      tipo: "info",
      texto: "Edição do rascunho cancelada.",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function carregarRascunho(parecer: ParecerHistorico) {
    if (parecer.status !== "rascunho") {
      setMensagem({
        tipo: "error",
        texto: "Somente pareceres em rascunho podem ser editados.",
      })
      return
    }

    if (
      usuario?.auth_user_id &&
      parecer.created_by_auth &&
      parecer.created_by_auth !== usuario.auth_user_id
    ) {
      setMensagem({
        tipo: "error",
        texto: "Este rascunho pertence a outro usuário e não pode ser editado por esta sessão.",
      })
      return
    }

    setEditandoParecerId(parecer.id)
    setEscolaDigitada(parecer.escola_nome || "")
    setDataAtendimento(parecer.data_atendimento || hojeIso())
    setTurno(parecer.turno || "")
    setChamadoReferencia(parecer.chamado_referencia || "")
    setResumoAtendimento(parecer.resumo_atendimento || "")
    setObservacoesGerais(parecer.observacoes_gerais || "")

    const itensDoParecer = parecer.pareceres_tecnicos_itens || []

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
        }))
      )
    } else {
      setItens([novoItem()])
    }

    setMensagem({
      tipo: "info",
      texto: "Rascunho carregado para edição. Após ajustar, salve novamente ou finalize para gerar o PDF.",
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function validarFormulario(finalizar: boolean) {
    if (!usuario?.email) {
      setMensagem({
        tipo: "error",
        texto: "Usuário logado não identificado. Faça login novamente.",
      })
      return false
    }

    if (!escolaSelecionada) {
      setMensagem({
        tipo: "error",
        texto: "Selecione uma escola válida da lista.",
      })
      return false
    }

    if (!dataAtendimento) {
      setMensagem({
        tipo: "error",
        texto: "Informe a data do atendimento.",
      })
      return false
    }

    if (finalizar && resumoAtendimento.trim().length < 10) {
      setMensagem({
        tipo: "error",
        texto: "Informe um resumo geral do atendimento com pelo menos 10 caracteres.",
      })
      return false
    }

    const itensValidos = itens.filter(
      (item) =>
        item.modelo_id.trim() ||
        item.equipamento.trim() ||
        item.numero_serie.trim() ||
        item.patrimonio.trim() ||
        item.diagnostico.trim() ||
        item.acao_realizada.trim()
    )

    if (itensValidos.length === 0) {
      setMensagem({
        tipo: "error",
        texto: "Inclua pelo menos um equipamento avaliado no parecer.",
      })
      return false
    }

    if (finalizar) {
      const itemIncompleto = itensValidos.find(
        (item) =>
          !item.modelo_id.trim() ||
          !item.equipamento.trim() ||
          !item.numero_serie.trim() ||
          !item.diagnostico.trim() ||
          !item.acao_realizada.trim() ||
          !item.resultado.trim()
      )

      if (itemIncompleto) {
        setMensagem({
          tipo: "error",
          texto:
            "Para finalizar, cada equipamento precisa ter modelo, número de série, diagnóstico, ação realizada e resultado.",
        })
        return false
      }
    }

    return true
  }

  async function salvarParecer(status: "rascunho" | "finalizado") {
    if (salvandoRef.current) return

    const finalizar = status === "finalizado"

    if (!validarFormulario(finalizar)) return

    salvandoRef.current = true

    let janelaPdf: Window | null = null

    if (finalizar) {
      janelaPdf = window.open("", "_blank")

      if (janelaPdf) {
        janelaPdf.document.write(`
          <html>
            <body style="font-family: Arial; background:#020617; color:white; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
              <div style="text-align:center;">
                <h2>Gerando parecer técnico...</h2>
                <p style="color:#94a3b8;">Aguarde enquanto o documento institucional é preparado.</p>
              </div>
            </body>
          </html>
        `)
      }
    }

    setSalvando(true)

    try {
      const itensValidos = itens.filter(
        (item) =>
          item.modelo_id.trim() ||
          item.equipamento.trim() ||
          item.numero_serie.trim() ||
          item.patrimonio.trim() ||
          item.diagnostico.trim() ||
          item.acao_realizada.trim()
      )

      const parecerPayload = {
        escola_id: escolaSelecionada!.id,
        escola_nome: escolaSelecionada!.nome_escola || "Escola não informada",
        cie: escolaSelecionada!.cie || null,
        endereco: escolaSelecionada!.endereco || null,
        telefone: escolaSelecionada!.telefone || null,
        email: escolaSelecionada!.email || null,

        tecnico_usuario_id: usuario?.id || null,
        tecnico_nome: usuario?.nome || usuario?.email || "Técnico não identificado",
        tecnico_email: usuario?.email || null,

        data_atendimento: dataAtendimento,
        turno: turno || null,
        chamado_referencia: chamadoReferencia.trim() || null,
        resumo_atendimento: resumoAtendimento.trim() || null,
        observacoes_gerais: observacoesGerais.trim() || null,

        status,
        finalized_at: finalizar ? new Date().toISOString() : null,
      }

      let parecerCriado: any = null

      if (editandoParecerId) {
        const { error: deleteItensError } = await supabase
          .from("pareceres_tecnicos_itens")
          .delete()
          .eq("parecer_id", editandoParecerId)

        if (deleteItensError) throw deleteItensError

        const { data: parecerAtualizado, error: updateError } = await supabase
          .from("pareceres_tecnicos")
          .update(parecerPayload)
          .eq("id", editandoParecerId)
          .eq("status", "rascunho")
          .select("*")
          .single()

        if (updateError) throw updateError

        parecerCriado = parecerAtualizado
      } else {
        const { data: parecerNovo, error: parecerError } = await supabase
          .from("pareceres_tecnicos")
          .insert([parecerPayload])
          .select("*")
          .single()

        if (parecerError) throw parecerError

        parecerCriado = parecerNovo
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
      }))

      const { data: itensCriados, error: itensError } = await supabase
        .from("pareceres_tecnicos_itens")
        .insert(itensPayload)
        .select("*")

      if (itensError) throw itensError

      const parecerCompleto: ParecerHistorico = {
        ...(parecerCriado as ParecerHistorico),
        pareceres_tecnicos_itens: itensCriados || [],
      }

      setMensagem({
        tipo: "success",
        texto:
          status === "finalizado"
            ? "Parecer finalizado com sucesso. O PDF foi preparado."
            : editandoParecerId
              ? "Rascunho atualizado com sucesso."
              : "Rascunho salvo com sucesso.",
      })

      if (finalizar) {
        gerarPdfParecer(parecerCompleto, janelaPdf)
      }

      limparFormulario()
      await carregar()
    } catch (error: any) {
      console.error("Erro ao salvar parecer técnico:", error)

      if (janelaPdf && !janelaPdf.closed) {
        janelaPdf.document.open()
        janelaPdf.document.write(`
          <html>
            <body style="font-family: Arial; background:#020617; color:white; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
              <div style="text-align:center; max-width:520px;">
                <h2 style="color:#f87171;">Erro ao gerar parecer</h2>
                <p style="color:#cbd5e1;">${escapeHtml(error?.message || "Falha ao salvar o parecer técnico.")}</p>
              </div>
            </body>
          </html>
        `)
        janelaPdf.document.close()
      }

      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível salvar o parecer técnico.",
      })
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  function handleSalvarRascunho(event: FormEvent) {
    event.preventDefault()
    salvarParecer("rascunho")
  }

  function handleFinalizar(event: FormEvent) {
    event.preventDefault()
    salvarParecer("finalizado")
  }

  async function excluirEquipamentoGestao(itemId: string) {
    if (!isGestao) {
      setMensagem({
        tipo: "error",
        texto: "Apenas usuários SEINTEC ou admin podem excluir registros de equipamentos.",
      })
      return
    }

    const confirmar = window.confirm(
      "Deseja realmente excluir este equipamento do parecer? Esta ação remove apenas este item e não exclui o parecer inteiro."
    )

    if (!confirmar) return

    try {
      setDeletandoItemId(itemId)

      const { error } = await supabase
        .from("pareceres_tecnicos_itens")
        .delete()
        .eq("id", itemId)

      if (error) throw error

      setHistorico((atual) =>
        atual.map((parecer) => ({
          ...parecer,
          pareceres_tecnicos_itens: (parecer.pareceres_tecnicos_itens || []).filter(
            (item) => item.id !== itemId
          ),
        }))
      )

      setMensagem({
        tipo: "success",
        texto: "Equipamento excluído com sucesso do parecer técnico.",
      })
    } catch (error: any) {
      console.error("Erro ao excluir equipamento do parecer:", error)

      setMensagem({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível excluir o equipamento. Verifique a policy de exclusão para SEINTEC/admin no Supabase.",
      })
    } finally {
      setDeletandoItemId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-cyan-500" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando parecer técnico
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Parecer Técnico
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Atendimento Field
              </span>

              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">
                SETEC Hub
              </span>

              {editandoParecerId && (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">
                  Editando rascunho
                </span>
              )}

              {isGestao && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Visão gestão
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Parecer Técnico de Equipamentos
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Registro técnico padronizado para atendimentos realizados em visitas,
              com identificação automática do técnico, dados da escola, modelos
              cadastrados, número de série obrigatório, BlueMonitor/DATAMOB e
              geração de PDF institucional.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Técnico identificado
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-sm font-black text-cyan-300">
                {getInitials(usuario?.nome || usuario?.email || "TF")}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {usuario?.nome || "Usuário não identificado"}
                </p>

                <p className="truncate text-xs font-medium text-slate-500">
                  {usuario?.email || "Sem e-mail"}
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
                Você está editando um rascunho salvo anteriormente. Ao finalizar,
                ele será transformado em parecer finalizado e o PDF será gerado.
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

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <ResumoCard
          label="Equipamentos"
          value={totaisItens.total}
          description="Itens no parecer atual"
          tone="blue"
        />

        <ResumoCard
          label="Resolvidos"
          value={totaisItens.resolvidos}
          description="Com resultado resolvido"
          tone="green"
        />

        <ResumoCard
          label="Garantia"
          value={totaisItens.garantia}
          description="Itens marcados para garantia"
          tone="yellow"
        />

        <ResumoCard
          label="Dano físico"
          value={totaisItens.fisico}
          description="Itens com dano físico"
          tone="red"
        />

        <ResumoCard
          label="BlueMonitor/DATAMOB"
          value={totaisItens.bluemonitor}
          description="Itens registrados"
          tone="cyan"
        />

        <ResumoCard
          label="Não localizado"
          value={totaisItens.naoLocalizados}
          description="Itens não encontrados"
          tone="orange"
        />
      </section>

      <form className="grid grid-cols-1 gap-8 xl:grid-cols-12">
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
                    <option
                      key={escola.id}
                      value={escola.nome_escola || ""}
                    />
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
                  <option value="Noite">Noite</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Chamado / referência
                </label>

                <input
                  value={chamadoReferencia}
                  onChange={(event) => setChamadoReferencia(event.target.value)}
                  placeholder="Exemplo: SEE-0000000, chamado interno, OS, visita programada..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Resumo geral do atendimento *
                </label>

                <textarea
                  rows={5}
                  value={resumoAtendimento}
                  onChange={(event) => setResumoAtendimento(event.target.value)}
                  placeholder="Descreva o contexto geral do atendimento realizado na escola..."
                  className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </Panel>

          <div className="mt-8 space-y-5">
            <div className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Equipamentos avaliados
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Modelo vindo da tabela equipamentos_modelos, marca automática
                    e número de série obrigatório.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={adicionarItem}
                  className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950"
                >
                  + Adicionar equipamento
                </button>
              </div>
            </div>

            {itens.map((item, index) => {
              const modeloSelecionado = item.modelo_id
                ? modelosPorId.get(item.modelo_id)
                : null

              return (
                <Panel key={item.tempId}>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                        Equipamento {index + 1}
                      </p>

                      <h3 className="mt-1 text-lg font-black text-white">
                        {item.equipamento || "Novo equipamento"}
                      </h3>

                      {modeloSelecionado && (
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {modeloSelecionado.marca || "Marca não informada"}
                          {modeloSelecionado.tipo ? ` • ${modeloSelecionado.tipo}` : ""}
                          {modeloSelecionado.ano_recebimento
                            ? ` • ${modeloSelecionado.ano_recebimento}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removerItem(item.tempId)}
                      disabled={itens.length === 1}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                        Modelo do equipamento *
                      </label>

                      <select
                        value={item.modelo_id}
                        onChange={(event) =>
                          selecionarModelo(item.tempId, event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="">Selecione o modelo cadastrado...</option>
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

                    <Campo
                      label="Marca"
                      value={item.marca_modelo}
                      onChange={(value) =>
                        atualizarItem(item.tempId, "marca_modelo", value)
                      }
                      placeholder="Preenchida automaticamente pela tabela"
                      readOnly
                    />

                    <Campo
                      label="Número de série *"
                      value={item.numero_serie}
                      onChange={(value) =>
                        atualizarItem(item.tempId, "numero_serie", value)
                      }
                      placeholder="Serial do equipamento"
                    />

                    <Campo
                      label="Patrimônio"
                      value={item.patrimonio}
                      onChange={(value) =>
                        atualizarItem(item.tempId, "patrimonio", value)
                      }
                      placeholder="Número de patrimônio, se houver"
                    />

                    <Area
                      label="Problema relatado"
                      value={item.problema_relatado}
                      onChange={(value) =>
                        atualizarItem(item.tempId, "problema_relatado", value)
                      }
                      placeholder="Informe o problema relatado pela escola ou identificado inicialmente."
                    />

                    <Area
                      label="Diagnóstico técnico *"
                      value={item.diagnostico}
                      onChange={(value) =>
                        atualizarItem(item.tempId, "diagnostico", value)
                      }
                      placeholder="Descreva o diagnóstico após análise técnica."
                    />

                    <Area
                      label="Ação realizada *"
                      value={item.acao_realizada}
                      onChange={(value) =>
                        atualizarItem(item.tempId, "acao_realizada", value)
                      }
                      placeholder="Informe o que foi feito no equipamento."
                    />

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                        Resultado *
                      </label>

                      <select
                        value={item.resultado}
                        onChange={(event) =>
                          atualizarItem(item.tempId, "resultado", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="">Selecione...</option>
                        {RESULTADOS.map((resultado) => (
                          <option key={resultado} value={resultado}>
                            {resultado}
                          </option>
                        ))}
                      </select>

                      <div className="mt-4 space-y-3">
                        <CheckLinha
                          checked={item.possui_problema_fisico}
                          onChange={(checked) =>
                            atualizarItem(
                              item.tempId,
                              "possui_problema_fisico",
                              checked
                            )
                          }
                          label="Possui problema físico aparente"
                          tone="red"
                        />

                        <CheckLinha
                          checked={item.precisa_garantia}
                          onChange={(checked) =>
                            atualizarItem(item.tempId, "precisa_garantia", checked)
                          }
                          label="Precisa de acionamento de garantia / tratativa"
                          tone="yellow"
                        />

                        <CheckLinha
                          checked={item.registrado_bluemonitor}
                          onChange={(checked) =>
                            atualizarItem(
                              item.tempId,
                              "registrado_bluemonitor",
                              checked
                            )
                          }
                          label="Registrado no BlueMonitor/DATAMOB"
                          tone="cyan"
                        />
                      </div>
                    </div>

                    {item.possui_problema_fisico && (
                      <div className="md:col-span-2">
                        <Area
                          label="Descrição do problema físico"
                          value={item.problema_fisico_descricao}
                          onChange={(value) =>
                            atualizarItem(
                              item.tempId,
                              "problema_fisico_descricao",
                              value
                            )
                          }
                          placeholder="Exemplo: tela quebrada, carcaça danificada, teclado arrancado, conector quebrado..."
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <Area
                        label="Observação do equipamento"
                        value={item.observacao}
                        onChange={(value) =>
                          atualizarItem(item.tempId, "observacao", value)
                        }
                        placeholder="Registre qualquer observação adicional sobre este equipamento."
                      />
                    </div>
                  </div>
                </Panel>
              )
            })}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={adicionarItem}
                className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-4 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950"
              >
                + Adicionar outro equipamento
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-8 xl:col-span-4">
          <Panel>
            <h2 className="text-xl font-black text-white">
              Finalização do parecer
            </h2>

            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
              Ao finalizar, o sistema salva o parecer e prepara automaticamente
              um documento institucional para impressão ou salvamento em PDF.
            </p>

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
                placeholder="Observações gerais do parecer, orientações à escola ou encaminhamentos finais..."
                className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniResumo label="Itens" value={totaisItens.total} />
              <MiniResumo label="Garantia" value={totaisItens.garantia} />
              <MiniResumo label="BlueMonitor" value={totaisItens.bluemonitor} />
              <MiniResumo label="Não localizado" value={totaisItens.naoLocalizados} />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={salvando}
                className="rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
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

              <button
                type="button"
                onClick={adicionarItem}
                disabled={salvando}
                className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Adicionar equipamento
              </button>
            </div>
          </Panel>

          <Panel>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">
                  Histórico recente
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Últimos pareceres técnicos registrados.
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
                    Nenhum parecer registrado
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Os pareceres salvos aparecerão aqui.
                  </p>
                </div>
              ) : (
                historico.map((parecer) => {
                  const podeEditar =
                    parecer.status === "rascunho" &&
                    (!parecer.created_by_auth ||
                      parecer.created_by_auth === usuario?.auth_user_id)

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
                            parecer.status
                          )}`}
                        >
                          {parecer.status}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {parecer.resumo_atendimento || "Sem resumo informado."}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {parecer.status === "finalizado" && (
                          <button
                            type="button"
                            onClick={() => gerarPdfParecer(parecer)}
                            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950"
                          >
                            PDF
                          </button>
                        )}

                        {podeEditar && (
                          <button
                            type="button"
                            onClick={() => carregarRascunho(parecer)}
                            className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-yellow-300 transition-all hover:bg-yellow-500 hover:text-yellow-950"
                          >
                            Editar
                          </button>
                        )}

                        <Link
                          href="/fields/agenda-field"
                          className="rounded-xl border border-slate-700 bg-[#020617] px-3 py-2 text-center text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
                        >
                          Agenda
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Panel>
        </aside>
      </form>
    </div>
  )
}

function DashboardGestao({
  dados,
  onDeleteItem,
  deletingItemId,
}: {
  dados: DashboardGestaoDados
  onDeleteItem: (itemId: string) => void
  deletingItemId: string | null
}) {
  return (
    <section className="space-y-6 rounded-[2rem] border border-emerald-500/20 bg-[#020617] p-5 shadow-2xl md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
            Dashboard SEINTEC/Admin
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            Acompanhamento dos pareceres técnicos
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Visão consolidada dos equipamentos preenchidos pelos técnicos nos pareceres.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        <ResumoCard
          label="Pareceres"
          value={dados.totalPareceres}
          description="Registros carregados"
          tone="blue"
        />

        <ResumoCard
          label="Finalizados"
          value={dados.finalizados}
          description="Com PDF disponível"
          tone="green"
        />

        <ResumoCard
          label="Rascunhos"
          value={dados.rascunhos}
          description="Ainda editáveis"
          tone="yellow"
        />

        <ResumoCard
          label="Equipamentos"
          value={dados.totalItens}
          description="Itens avaliados"
          tone="cyan"
        />

        <ResumoCard
          label="Garantia"
          value={dados.garantia}
          description="Itens sinalizados"
          tone="orange"
        />

        <ResumoCard
          label="Dano físico"
          value={dados.fisico}
          description="Com problema físico"
          tone="red"
        />

        <ResumoCard
          label="BlueMonitor"
          value={dados.bluemonitor}
          description="Registrados"
          tone="cyan"
        />

        <ResumoCard
          label="Não localizados"
          value={dados.naoLocalizados}
          description="Resultado informado"
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel>
          <h3 className="mb-4 text-lg font-black text-white">
            Técnicos com mais pareceres
          </h3>

          <div className="space-y-3">
            {dados.topTecnicos.length === 0 ? (
              <EmptyMini message="Sem dados de técnicos." />
            ) : (
              dados.topTecnicos.map((item, index) => (
                <RankingLinha
                  key={item.nome}
                  posicao={index + 1}
                  titulo={item.nome}
                  valor={item.total}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 text-lg font-black text-white">
            Resultados mais registrados
          </h3>

          <div className="space-y-3">
            {dados.topResultados.length === 0 ? (
              <EmptyMini message="Sem resultados registrados." />
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
          <h3 className="mb-4 text-lg font-black text-white">
            Leitura operacional
          </h3>

          <div className="space-y-3">
            <InsightLinha
              label="Itens que exigem atenção"
              value={dados.garantia + dados.fisico + dados.naoLocalizados}
              description="Garantia, dano físico ou não localizado."
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
              description="Pareceres finalizados sobre o total carregado."
              tone="green"
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4">
          <h3 className="text-lg font-black text-white">
            Últimos equipamentos preenchidos
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Amostra recente dos itens informados nos pareceres técnicos.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Escola</th>
                <th className="px-3 py-2">Técnico</th>
                <th className="px-3 py-2">Equipamento</th>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Resultado</th>
                <th className="px-3 py-2">BlueMonitor</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {dados.ultimosItens.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyMini message="Nenhum equipamento preenchido encontrado." />
                  </td>
                </tr>
              ) : (
                dados.ultimosItens.map((item) => (
                  <tr
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 text-sm text-slate-300"
                  >
                    <td className="rounded-l-2xl px-3 py-3 font-bold text-slate-500">
                      {formatarData(item.data_atendimento)}
                    </td>
                    <td className="px-3 py-3 font-bold text-white">
                      {item.escola_nome}
                    </td>
                    <td className="px-3 py-3">{item.tecnico_nome}</td>
                    <td className="px-3 py-3">
                      {item.equipamento}
                      {item.marca_modelo ? (
                        <span className="ml-1 text-slate-500">
                          • {item.marca_modelo}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {item.numero_serie || "N/I"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-slate-700 bg-[#020617] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {item.resultado || "Sem resultado"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                          item.registrado_bluemonitor
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                            : "border-slate-700 bg-slate-900 text-slate-500"
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
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        title="Excluir apenas este equipamento do parecer"
                      >
                        {deletingItemId === item.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function ResumoCard({
  label,
  value,
  description,
  tone,
}: {
  label: string
  value: string | number
  description: string
  tone: "blue" | "green" | "yellow" | "red" | "cyan" | "orange"
}) {
  const colors = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 shadow-lg ${colors}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-4xl font-black">{value}</p>

      <p className="mt-1 text-xs font-bold opacity-80">{description}</p>
    </div>
  )
}

function MiniResumo({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300/80">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-200" title={value}>
        {value}
      </p>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  readOnly?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-2xl border border-slate-700 px-4 py-4 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${
          readOnly ? "bg-slate-900/30 text-slate-400" : "bg-slate-900/60"
        }`}
      />
    </div>
  )
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>

      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
      />
    </div>
  )
}

function CheckLinha({
  checked,
  onChange,
  label,
  tone = "cyan",
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  tone?: "cyan" | "red" | "yellow"
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
  }[tone]

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
  )
}

function RankingLinha({
  posicao,
  titulo,
  valor,
}: {
  posicao: number
  titulo: string
  valor: number
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
  )
}

function InsightLinha({
  label,
  value,
  description,
  tone,
}: {
  label: string
  value: string | number
  description: string
  tone: "green" | "red" | "cyan"
}) {
  const colors = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  }[tone]

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
  )
}

function EmptyMini({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
      <p className="text-sm font-bold text-slate-500">{message}</p>
    </div>
  )
}