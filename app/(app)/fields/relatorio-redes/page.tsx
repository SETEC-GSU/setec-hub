"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"

type UsuarioPerfil = {
  id: string
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
}

type ItemRede = {
  tempId: string
  tipoOption: string
  tipoOutro: string
  identificacao: string
  ambiente: string
  rackOrigem: string
  portaPonto: string
  sintoma: string
  testesRealizados: string[]
  testesOutro: string
  acaoRealizada: string
  resultadoOption: string
  resultadoOutro: string
  necessitaNovaVisita: boolean
  necessitaInfraestrutura: boolean
  necessitaManutencaoPonto: boolean
  acionamentoFde: boolean
  acionamentoOperadora: boolean
  necessitaGarantia: boolean
  escolaOrientada: boolean
  qtdPontosRede: number
  qtdPontosEletricos: number
  qtdInfraAps: number
  ambientesInfra: string
  justificativaInfra: string
  observacao: string
}

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

type RelatorioRedeHistorico = {
  id: string
  field_visita_id?: string | null
  escola_id?: string | null
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

type MensagemTela = {
  tipo: "success" | "error" | "info"
  texto: string
} | null

type FormSnapshot = {
  version: 1
  savedAt: string
  userId: string
  editandoId: string | null
  escolaDigitada: string
  dataAtendimento: string
  turno: string
  chamadoReferencia: string
  categoriaOption: string
  categoriaOutro: string
  subcategoriaOption: string
  subcategoriaOutro: string
  descricaoDemanda?: string
  resumoAtendimento: string
  observacoesGerais: string
  itens: ItemRede[]
}

const CATEGORIAS = ["Redes/Conectividade", "Infraestrutura", "Outro"]

const SUBCATEGORIAS = [
  "Falha na rede interna",
  "Intermitência",
  "Queda de Link",
  "Lentidão",
  "Reparo em Pontos de Rede",
  "Instalação de Cabeamento",
  "Outro",
]

const TIPOS_COMPONENTE = [
  "Access Point / Wi-Fi",
  "Switch",
  "Uplink",
  "Link de internet",
  "Segundo link / SD-WAN",
  "Firewall",
  "Roteador",
  "Rack",
  "Ponto de rede",
  "Cabeamento",
  "Energia / nobreak",
  "Configuração lógica / IP",
  "Avaliação geral da rede",
  "Outro",
]

const TESTES_REDE = [
  "Inspeção visual",
  "Teste de energia",
  "Teste com testador de cabos",
  "Teste de uplink",
  "Troca de porta",
  "Troca de cabo / patch cord",
  "Ping",
  "Tracert",
  "Validação de IP",
  "Validação de DHCP / DNS",
  "Reinicialização",
  "Reset do equipamento",
  "Teste de velocidade / duplex",
  "Validação com FDE / analista",
  "Teste do segundo link",
  "Validação de firewall / roteamento",
  "Levantamento de infraestrutura",
  "Outro",
]

const RESULTADOS_REDE = [
  "Resolvido",
  "Resolvido parcialmente",
  "Pendente de retorno",
  "Escalonado para FDE",
  "Dependente da operadora",
  "Solicitação de infraestrutura",
  "Encaminhado para garantia / substituição",
  "Orientação realizada",
  "Falha não identificada",
  "Equipamento / ativo não localizado",
  "Não foi possível concluir",
  "Outro",
]

const MODELOS_SINTOMA = [
  {
    rotulo: "Sem conectividade",
    texto:
      "O ambiente informado encontra-se sem conectividade com a rede institucional.",
  },
  {
    rotulo: "Intermitência",
    texto:
      "A conexão apresenta oscilações e interrupções durante o uso.",
  },
  {
    rotulo: "Lentidão",
    texto:
      "A rede apresenta desempenho abaixo do esperado e lentidão durante a navegação.",
  },
  {
    rotulo: "Ativo offline",
    texto:
      "O ativo de rede encontra-se offline ou inacessível para gerenciamento.",
  },
  {
    rotulo: "Porta sem link",
    texto:
      "A porta ou o ponto de rede não apresenta link físico ativo.",
  },
  {
    rotulo: "Mesh / baixa velocidade",
    texto:
      "O Access Point está conectado em Mesh ou negociando velocidade abaixo do padrão esperado.",
  },
  {
    rotulo: "Instalação de novo AP",
    texto:
      "Foi identificada a necessidade de instalação de um novo Access Point para ampliar ou restabelecer a cobertura Wi-Fi no ambiente informado.",
  },
  {
    rotulo: "AP com infraestrutura disponível",
    texto:
      "O ambiente possui infraestrutura disponível para instalação do Access Point, permanecendo pendente a instalação, ativação e validação do equipamento.",
  },
  {
    rotulo: "Infra FDE — sem ponto",
    texto:
      "Foi identificada a necessidade de levantamento de infraestrutura para instalação de ponto oficial da FDE/SEDUC, pois o ambiente não possui ponto de rede disponível.",
  },
  {
    rotulo: "Infra FDE — ponto fora do padrão",
    texto:
      "Foi identificada a necessidade de adequação para ponto oficial da FDE/SEDUC, pois os pontos existentes no ambiente estão fora do padrão institucional vigente.",
  },
]

const MODELOS_ACAO = [
  {
    rotulo: "Testes gerais",
    texto:
      "Foram realizados testes de conectividade, alimentação, cabeamento e comunicação entre os ativos de rede.",
  },
  {
    rotulo: "Reinicialização",
    texto:
      "O ativo foi reinicializado de forma controlada e o funcionamento foi validado após a normalização.",
  },
  {
    rotulo: "Reconfiguração",
    texto:
      "Foram revisadas e ajustadas as configurações do ativo, seguidas de novos testes de conectividade.",
  },
  {
    rotulo: "Uplink",
    texto:
      "Foi validado o uplink, incluindo origem, destino, continuidade física, negociação e comunicação do enlace.",
  },
  {
    rotulo: "Troca de cabo",
    texto:
      "Foi realizada a substituição do cabo ou patch cord, seguida de novo teste de conectividade e estabilidade.",
  },
  {
    rotulo: "Troca de porta",
    texto:
      "O ativo foi remanejado para outra porta do switch e a comunicação foi testada novamente.",
  },
  {
    rotulo: "AP / Mesh",
    texto:
      "Foram verificados alimentação, uplink, negociação da porta e comunicação do Access Point com a rede institucional.",
  },
  {
    rotulo: "Instalação de AP",
    texto:
      "Foi realizada a instalação física do Access Point, com conexão ao ponto de rede, energização, ativação e validação da cobertura Wi-Fi no ambiente.",
  },
  {
    rotulo: "IP / DHCP / DNS",
    texto:
      "Foram validados endereçamento IP, gateway, DHCP e DNS, com correção dos parâmetros identificados como inconsistentes.",
  },
  {
    rotulo: "Segundo link",
    texto:
      "Foram realizados testes no segundo link, roteador e caminho de contingência, com validação do comportamento de failover.",
  },
  {
    rotulo: "Operadora",
    texto:
      "A falha foi validada como externa e o atendimento foi direcionado à operadora responsável pelo link.",
  },
  {
    rotulo: "FDE / analista",
    texto:
      "O cenário foi validado com a FDE ou analista responsável, seguindo os testes e procedimentos orientados.",
  },
  {
    rotulo: "Infraestrutura",
    texto:
      "Foi realizado levantamento técnico da infraestrutura necessária, com registro dos ambientes, pontos e adequações requeridas.",
  },
  {
    rotulo: "Ponto oficial FDE",
    texto:
      "Foi realizado levantamento para implantação ou adequação de ponto oficial da FDE/SEDUC, incluindo ambiente, trajeto, ponto de rede, ponto elétrico e infraestrutura necessária.",
  },
  {
    rotulo: "Orientação à escola",
    texto:
      "A equipe da unidade escolar foi orientada quanto ao uso correto, organização dos ativos e procedimentos para acompanhamento da demanda.",
  },
]

const AUTOSAVE_VERSION = 1 as const
const AUTOSAVE_DELAY = 900

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

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value ?? "").trim()
  return text || fallback
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


function resolveOption(value: unknown, options: string[]) {
  const text = String(value ?? "").trim()
  const found = options.find(
    (option) => normalizarTexto(option) === normalizarTexto(text),
  )

  if (found) return { option: found, other: "" }
  return { option: text ? "Outro" : options[0], other: text }
}

function novoItemRede(): ItemRede {
  return {
    tempId: crypto.randomUUID(),
    tipoOption: "Avaliação geral da rede",
    tipoOutro: "",
    identificacao: "",
    ambiente: "",
    rackOrigem: "",
    portaPonto: "",
    sintoma: "",
    testesRealizados: [],
    testesOutro: "",
    acaoRealizada: "",
    resultadoOption: "Resolvido",
    resultadoOutro: "",
    necessitaNovaVisita: false,
    necessitaInfraestrutura: false,
    necessitaManutencaoPonto: false,
    acionamentoFde: false,
    acionamentoOperadora: false,
    necessitaGarantia: false,
    escolaOrientada: false,
    qtdPontosRede: 0,
    qtdPontosEletricos: 0,
    qtdInfraAps: 0,
    ambientesInfra: "",
    justificativaInfra: "",
    observacao: "",
  }
}

function itemTemDados(item?: ItemRede | null) {
  if (!item) return false

  return Boolean(
    item.identificacao.trim() ||
      item.ambiente.trim() ||
      item.rackOrigem.trim() ||
      item.portaPonto.trim() ||
      item.sintoma.trim() ||
      item.testesRealizados.length ||
      item.testesOutro.trim() ||
      item.acaoRealizada.trim() ||
      item.observacao.trim(),
  )
}

function tipoFinal(item: ItemRede) {
  return item.tipoOption === "Outro"
    ? item.tipoOutro.trim()
    : item.tipoOption
}

function resultadoFinal(item: ItemRede) {
  return item.resultadoOption === "Outro"
    ? item.resultadoOutro.trim()
    : item.resultadoOption
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

function montarHtmlPdf(relatorio: RelatorioRedeHistorico) {
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
        <h2 class="card-title">Unidade Escolar</h2>
        <div class="info-grid">
          <div><p class="label">Escola</p><p class="value">${escapeHtml(relatorio.escola_nome)}</p></div>
          <div><p class="label">CIE</p><p class="value">${escapeHtml(relatorio.cie || "Não informado")}</p></div>
          <div><p class="label">Endereço</p><p class="value">${escapeHtml(relatorio.endereco || "Não informado")}</p></div>
          <div><p class="label">Contato</p><p class="value">${escapeHtml(relatorio.telefone || "Não informado")} • ${escapeHtml(relatorio.email || "Não informado")}</p></div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">Atendimento</h2>
        <div class="info-grid compact">
          <div><p class="label">Técnico responsável</p><p class="value">${escapeHtml(relatorio.tecnico_nome)}</p></div>
          <div><p class="label">Turno / chamado</p><p class="value">${escapeHtml(relatorio.turno || "Não informado")} • ${escapeHtml(relatorio.chamado_referencia || "Sem referência")}</p></div>
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
      <div class="signature">Responsável da Unidade Escolar<br />Assinatura / Carimbo</div>
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

function abrirPdf(relatorio: RelatorioRedeHistorico) {
  const janela = window.open("about:blank", "_blank")
  if (!janela) {
    alert("O navegador bloqueou a janela do PDF. Libere pop-ups e tente novamente.")
    return
  }

  janela.document.open()
  janela.document.write(montarHtmlPdf(relatorio))
  janela.document.close()
  janela.document.title = getNomeArquivo(relatorio)
}

function montarRetorno(relatorio: RelatorioRedeHistorico) {
  const itens = relatorio.relatorios_redes_itens || []
  const itensTexto = itens.length
    ? itens
        .slice()
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map((item, index) => {
          const testes = Array.isArray(item.testes_realizados)
            ? item.testes_realizados.join(", ")
            : "Não informados"
          const sinais = sinalizacoesItem(item)

          return `${index + 1}. ${item.tipo_componente || "Item de rede"}${item.identificacao ? ` - ${item.identificacao}` : ""}
   Ambiente: ${item.ambiente || "Não informado"}
   Situação encontrada: ${item.sintoma || "Não informada"}
   Testes realizados: ${testes || "Não informados"}${item.testes_outro ? `; ${item.testes_outro}` : ""}
   Ações realizadas: ${item.acao_realizada || "Não informadas"}
   Resultado: ${item.resultado || "Não informado"}${sinais.length ? `
   Sinalizações: ${sinais.join(", ")}` : ""}`
        })
        .join("\n\n")
    : "Nenhum item técnico foi registrado."

  return `Prezados(as), boa tarde.

Informamos que o atendimento técnico de redes${relatorio.chamado_referencia ? ` referente ao chamado ${relatorio.chamado_referencia}` : ""} foi realizado na unidade ${relatorio.escola_nome}, em ${formatarData(relatorio.data_atendimento)}, pelo técnico ${relatorio.tecnico_nome}.

Resumo geral da demanda e do atendimento:
${resumoUnificadoRelatorio(relatorio)}

Itens avaliados:

${itensTexto}${relatorio.observacoes_gerais ? `

Observações gerais:
${relatorio.observacoes_gerais}` : ""}

Com base nos testes e procedimentos registrados, este é o retorno técnico para atualização do chamado. O relatório completo permanece disponível no SETEC Hub para consulta.

Atenciosamente,
${relatorio.tecnico_nome}`
}

export default function RelatorioTecnicoRedesPage() {
  const supabase = useMemo(() => createClient(), [])
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null)
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [historico, setHistorico] = useState<RelatorioRedeHistorico[]>([])

  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [buscaHistorico, setBuscaHistorico] = useState("")
  const [statusHistorico, setStatusHistorico] = useState<
    "todos" | "rascunho" | "finalizado"
  >("todos")
  const [retornoModal, setRetornoModal] = useState<{
    relatorio: RelatorioRedeHistorico
    texto: string
  } | null>(null)
  const [relatorioFinalizadoModal, setRelatorioFinalizadoModal] =
    useState<RelatorioRedeHistorico | null>(null)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [escolaDigitada, setEscolaDigitada] = useState("")
  const [dataAtendimento, setDataAtendimento] = useState(hojeIso())
  const [turno, setTurno] = useState("")
  const [chamadoReferencia, setChamadoReferencia] = useState("")
  const [categoriaOption, setCategoriaOption] = useState("Redes/Conectividade")
  const [categoriaOutro, setCategoriaOutro] = useState("")
  const [subcategoriaOption, setSubcategoriaOption] = useState(
    "Falha na rede interna",
  )
  const [subcategoriaOutro, setSubcategoriaOutro] = useState("")
  const [resumoAtendimento, setResumoAtendimento] = useState("")
  const [observacoesGerais, setObservacoesGerais] = useState("")
  const [itens, setItens] = useState<ItemRede[]>([novoItemRede()])
  const [adicionarModalAberto, setAdicionarModalAberto] = useState(false)

  const [snapshotRecuperavel, setSnapshotRecuperavel] =
    useState<FormSnapshot | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<
    "aguardando" | "salvando" | "salvo" | "erro"
  >("aguardando")

  const roleNormalizada = normalizarTexto(usuario?.role)
  const isGestao = roleNormalizada === "admin" || roleNormalizada === "seintec"

  const categoriaFinal =
    categoriaOption === "Outro" ? categoriaOutro.trim() : categoriaOption
  const subcategoriaFinal =
    subcategoriaOption === "Outro"
      ? subcategoriaOutro.trim()
      : subcategoriaOption

  const escolaSelecionada = useMemo(() => {
    return (
      escolas.find(
        (escola) =>
          normalizarTexto(escola.nome_escola) ===
          normalizarTexto(escolaDigitada),
      ) || null
    )
  }, [escolaDigitada, escolas])


  const ultimoItem = itens[itens.length - 1] || null

  const formularioSnapshot = useMemo<FormSnapshot | null>(() => {
    if (!usuario) return null

    return {
      version: AUTOSAVE_VERSION,
      savedAt: new Date().toISOString(),
      userId: usuario.id,
      editandoId,
      escolaDigitada,
      dataAtendimento,
      turno,
      chamadoReferencia,
      categoriaOption,
      categoriaOutro,
      subcategoriaOption,
      subcategoriaOutro,
      resumoAtendimento,
      observacoesGerais,
      itens,
    }
  }, [
    categoriaOption,
    categoriaOutro,
    chamadoReferencia,
    dataAtendimento,
    editandoId,
    escolaDigitada,
    itens,
    observacoesGerais,
    resumoAtendimento,
    subcategoriaOption,
    subcategoriaOutro,
    turno,
    usuario,
  ])

  const autosaveKey = usuario
    ? `setec-hub:relatorio-redes:${usuario.id}`
    : ""

  const carregarHistorico = useCallback(async () => {
    const { data, error } = await supabase
      .from("relatorios_redes")
      .select(`
        *,
        relatorios_redes_itens (*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao carregar relatórios de redes:", error)
      return
    }

    setHistorico((data || []) as RelatorioRedeHistorico[])
  }, [supabase])

  const carregarTudo = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Não foi possível identificar o usuário autenticado.")
      }

      let perfil: UsuarioPerfil | null = null

      const perfilId = await supabase
        .from("usuarios")
        .select("id, nome, email, role, setor")
        .eq("id", user.id)
        .maybeSingle()

      if (perfilId.data) {
        perfil = perfilId.data as UsuarioPerfil
      } else if (user.email) {
        const perfilEmail = await supabase
          .from("usuarios")
          .select("id, nome, email, role, setor")
          .ilike("email", user.email)
          .maybeSingle()

        perfil = (perfilEmail.data || null) as UsuarioPerfil | null
      }

      if (!perfil) {
        perfil = {
          id: user.id,
          nome: user.user_metadata?.nome || user.email || "Técnico",
          email: user.email || null,
          role: null,
          setor: null,
        }
      }

      setUsuario(perfil)

      const escolasResult = await supabase
        .from("escolas")
        .select("id, nome_escola, cie, endereco, telefone, email")
        .order("nome_escola", { ascending: true })

      if (escolasResult.error) throw escolasResult.error

      setEscolas((escolasResult.data || []) as Escola[])

      await carregarHistorico()

      const key = `setec-hub:relatorio-redes:${perfil.id}`
      const local = window.localStorage.getItem(key)

      if (local) {
        try {
          const snapshot = JSON.parse(local) as FormSnapshot
          if (
            snapshot.version === AUTOSAVE_VERSION &&
            snapshot.userId === perfil.id
          ) {
            setSnapshotRecuperavel(snapshot)
          }
        } catch (error) {
          console.warn("Autosave local inválido:", error)
          window.localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.error(error)
      setMensagem({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a página.",
      })
    } finally {
      setLoading(false)
    }
  }, [carregarHistorico, supabase])

  useEffect(() => {
    carregarTudo()
  }, [carregarTudo])

  useEffect(() => {
    const channel = supabase
      .channel("relatorios-redes-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "relatorios_redes" },
        () => {
          if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
          realtimeTimerRef.current = setTimeout(() => carregarHistorico(), 300)
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "relatorios_redes_itens" },
        () => {
          if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
          realtimeTimerRef.current = setTimeout(() => carregarHistorico(), 300)
        },
      )
      .subscribe()

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [carregarHistorico, supabase])

  useEffect(() => {
    if (!autosaveKey || !formularioSnapshot || loading) return

    const possuiConteudo = Boolean(
      formularioSnapshot.escolaDigitada.trim() ||
        formularioSnapshot.chamadoReferencia.trim() ||
        formularioSnapshot.resumoAtendimento.trim() ||
        formularioSnapshot.itens.some(itemTemDados),
    )

    if (!possuiConteudo) {
      window.localStorage.removeItem(autosaveKey)
      setAutosaveStatus("aguardando")
      return
    }

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    setAutosaveStatus("salvando")

    autosaveTimerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          autosaveKey,
          JSON.stringify({ ...formularioSnapshot, savedAt: new Date().toISOString() }),
        )
        setAutosaveStatus("salvo")
      } catch (error) {
        console.error("Erro ao salvar cópia local:", error)
        setAutosaveStatus("erro")
      }
    }, AUTOSAVE_DELAY)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [autosaveKey, formularioSnapshot, loading])

  useEffect(() => {
    const possuiConteudo = Boolean(
      escolaDigitada.trim() ||
        chamadoReferencia.trim() ||
        resumoAtendimento.trim() ||
        itens.some(itemTemDados),
    )

    function beforeUnload(event: BeforeUnloadEvent) {
      if (!possuiConteudo || salvando) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [chamadoReferencia, escolaDigitada, itens, resumoAtendimento, salvando])

  useEffect(() => {
    if (!mensagem) return
    const timer = window.setTimeout(() => setMensagem(null), 6000)
    return () => clearTimeout(timer)
  }, [mensagem])


  const historicoFiltrado = useMemo(() => {
    const termo = normalizarTexto(buscaHistorico)

    return historico.filter((relatorio) => {
      if (statusHistorico !== "todos" && relatorio.status !== statusHistorico) {
        return false
      }

      if (!termo) return true

      return normalizarTexto(
        [
          relatorio.escola_nome,
          relatorio.chamado_referencia,
          relatorio.tecnico_nome,
          relatorio.categoria,
          relatorio.subcategoria,
          relatorio.resumo_atendimento,
        ].join(" "),
      ).includes(termo)
    })
  }, [buscaHistorico, historico, statusHistorico])

  const totais = useMemo(() => {
    const finalizados = historico.filter((item) => item.status === "finalizado").length
    const rascunhos = historico.length - finalizados
    const itensTotal = historico.reduce(
      (acc, item) => acc + (item.relatorios_redes_itens?.length || 0),
      0,
    )
    const infra = historico.reduce(
      (acc, item) =>
        acc +
        (item.relatorios_redes_itens || []).filter(
          (registro) => registro.necessita_infraestrutura,
        ).length,
      0,
    )

    return { total: historico.length, finalizados, rascunhos, itensTotal, infra }
  }, [historico])

  function aplicarSnapshot(snapshot: FormSnapshot) {
    setEditandoId(snapshot.editandoId)
    setEscolaDigitada(snapshot.escolaDigitada)
    setDataAtendimento(snapshot.dataAtendimento)
    setTurno(snapshot.turno)
    setChamadoReferencia(snapshot.chamadoReferencia)
    setCategoriaOption(snapshot.categoriaOption)
    setCategoriaOutro(snapshot.categoriaOutro)
    setSubcategoriaOption(snapshot.subcategoriaOption)
    setSubcategoriaOutro(snapshot.subcategoriaOutro)
    setResumoAtendimento(
      unirTextosUnicos(
        snapshot.descricaoDemanda,
        snapshot.resumoAtendimento,
      ),
    )
    setObservacoesGerais(snapshot.observacoesGerais)
    setItens(snapshot.itens?.length ? snapshot.itens : [novoItemRede()])
    setSnapshotRecuperavel(null)
    setMensagem({ tipo: "info", texto: "Cópia local restaurada." })
  }

  function descartarSnapshot() {
    if (autosaveKey) window.localStorage.removeItem(autosaveKey)
    setSnapshotRecuperavel(null)
  }

  function limparFormulario() {
    setEditandoId(null)
    setEscolaDigitada("")
    setDataAtendimento(hojeIso())
    setTurno("")
    setChamadoReferencia("")
    setCategoriaOption("Redes/Conectividade")
    setCategoriaOutro("")
    setSubcategoriaOption("Falha na rede interna")
    setSubcategoriaOutro("")
    setResumoAtendimento("")
    setObservacoesGerais("")
    setItens([novoItemRede()])
    if (autosaveKey) window.localStorage.removeItem(autosaveKey)
  }

  function atualizarItem(tempId: string, patch: Partial<ItemRede>) {
    setItens((atuais) =>
      atuais.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)),
    )
  }

  function alternarTeste(tempId: string, teste: string) {
    setItens((atuais) =>
      atuais.map((item) => {
        if (item.tempId !== tempId) return item
        const selecionado = item.testesRealizados.includes(teste)
        return {
          ...item,
          testesRealizados: selecionado
            ? item.testesRealizados.filter((atual) => atual !== teste)
            : [...item.testesRealizados, teste],
        }
      }),
    )
  }

  function removerItem(tempId: string) {
    if (itens.length === 1) return
    setItens((atuais) => atuais.filter((item) => item.tempId !== tempId))
  }

  function adicionarEmBranco() {
    const novo = novoItemRede()
    setItens((atuais) => [...atuais, novo])
    setAdicionarModalAberto(false)
    setTimeout(() => {
      document
        .getElementById(`item-rede-${novo.tempId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 120)
  }

  function reaproveitarAnterior() {
    if (!ultimoItem || !itemTemDados(ultimoItem)) {
      adicionarEmBranco()
      return
    }

    const novo: ItemRede = {
      ...ultimoItem,
      tempId: crypto.randomUUID(),
      identificacao: "",
      ambiente: "",
      rackOrigem: "",
      portaPonto: "",
    }

    setItens((atuais) => [...atuais, novo])
    setAdicionarModalAberto(false)
    setMensagem({
      tipo: "info",
      texto:
        "Testes e procedimentos do item anterior foram reaproveitados. Preencha a nova identificação, ambiente e porta.",
    })

    setTimeout(() => {
      document
        .getElementById(`item-rede-${novo.tempId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 120)
  }

  function validarFormulario() {
    const erros: string[] = []

    if (!escolaDigitada.trim()) erros.push("Selecione a unidade escolar.")
    if (!dataAtendimento) erros.push("Informe a data do atendimento.")
    if (!categoriaFinal) erros.push("Informe a categoria.")
    if (!subcategoriaFinal) erros.push("Informe a subcategoria.")
    if (!resumoAtendimento.trim()) erros.push("Preencha o resumo geral da demanda e do atendimento.")

    itens.forEach((item, index) => {
      const prefixo = `Item ${index + 1}`
      if (!tipoFinal(item)) erros.push(`${prefixo}: informe o tipo de componente.`)
      if (!item.sintoma.trim()) erros.push(`${prefixo}: descreva a situação encontrada.`)
      if (!item.acaoRealizada.trim()) erros.push(`${prefixo}: informe as ações realizadas.`)
      if (!resultadoFinal(item)) erros.push(`${prefixo}: informe o resultado.`)
      if (item.necessitaInfraestrutura && !item.justificativaInfra.trim()) {
        erros.push(`${prefixo}: descreva a justificativa da infraestrutura.`)
      }
    })

    return erros
  }

  async function salvar(status: "rascunho" | "finalizado") {
    if (salvando) return

    const erros = validarFormulario()
    if (erros.length) {
      setMensagem({ tipo: "error", texto: erros.slice(0, 4).join(" ") })
      document.getElementById("inicio-relatorio-redes")?.scrollIntoView({
        behavior: "smooth",
      })
      return
    }

    setSalvando(true)
    setMensagem(null)

    try {
      const payloadRelatorio = {
        id: editandoId,
        field_visita_id: null,
        escola_id: escolaSelecionada?.id || null,
        escola_nome: escolaDigitada.trim(),
        cie: escolaSelecionada?.cie || null,
        endereco: escolaSelecionada?.endereco || null,
        telefone: escolaSelecionada?.telefone || null,
        email: escolaSelecionada?.email || null,
        chamado_referencia: chamadoReferencia.trim() || null,
        categoria: categoriaFinal,
        subcategoria: subcategoriaFinal,
        descricao_demanda: null,
        resolucao_origem: null,
        data_atendimento: dataAtendimento,
        turno: turno || null,
        resumo_atendimento: resumoAtendimento.trim(),
        observacoes_gerais: observacoesGerais.trim() || null,
        status,
      }

      const payloadItens = itens.map((item, index) => ({
        ordem: index,
        tipo_componente: tipoFinal(item),
        identificacao: item.identificacao.trim() || null,
        ambiente: item.ambiente.trim() || null,
        rack_origem: item.rackOrigem.trim() || null,
        porta_ponto: item.portaPonto.trim() || null,
        sintoma: item.sintoma.trim(),
        testes_realizados: item.testesRealizados.filter((teste) => teste !== "Outro"),
        testes_outro: item.testesOutro.trim() || null,
        diagnostico: null,
        acao_realizada: item.acaoRealizada.trim(),
        resultado: resultadoFinal(item),
        necessita_nova_visita: item.necessitaNovaVisita,
        necessita_infraestrutura: item.necessitaInfraestrutura,
        necessita_manutencao_ponto: item.necessitaManutencaoPonto,
        acionamento_fde: item.acionamentoFde,
        acionamento_operadora: item.acionamentoOperadora,
        necessita_garantia: item.necessitaGarantia,
        escola_orientada: item.escolaOrientada,
        qtd_pontos_rede: item.qtdPontosRede,
        qtd_pontos_eletricos: item.qtdPontosEletricos,
        qtd_infra_aps: item.qtdInfraAps,
        ambientes_infra: item.ambientesInfra.trim() || null,
        justificativa_infra: item.justificativaInfra.trim() || null,
        chamado_infra: null,
        observacao: item.observacao.trim() || null,
      }))

      const { data: idSalvo, error } = await supabase.rpc(
        "salvar_relatorio_redes",
        {
          p_relatorio: payloadRelatorio,
          p_itens: payloadItens,
        },
      )

      if (error) throw error

      await carregarHistorico()

      if (status === "rascunho") {
        setEditandoId(String(idSalvo))
        setMensagem({
          tipo: "success",
          texto: "Rascunho salvo com segurança.",
        })
      } else {
        const { data: relatorioFinalizado, error: relatorioError } =
          await supabase
            .from("relatorios_redes")
            .select(`
              *,
              relatorios_redes_itens (*)
            `)
            .eq("id", String(idSalvo))
            .single()

        if (relatorioError) {
          console.warn(
            "Relatório finalizado, mas não foi possível recarregar os dados:",
            relatorioError,
          )
        }

        setMensagem({
          tipo: "success",
          texto: "Relatório de redes finalizado com sucesso.",
        })

        if (relatorioFinalizado) {
          setRelatorioFinalizadoModal(
            relatorioFinalizado as RelatorioRedeHistorico,
          )
        }

        limparFormulario()
      }
    } catch (error) {
      console.error("Erro ao salvar relatório de redes:", error)
      setMensagem({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o relatório.",
      })
    } finally {
      setSalvando(false)
    }
  }

  function carregarRascunho(relatorio: RelatorioRedeHistorico) {
    if (relatorio.status !== "rascunho") return

    const categoria = resolveOption(relatorio.categoria, CATEGORIAS)
    const subcategoria = resolveOption(relatorio.subcategoria, SUBCATEGORIAS)

    setEditandoId(relatorio.id)
    setEscolaDigitada(relatorio.escola_nome)
    setDataAtendimento(relatorio.data_atendimento)
    setTurno(relatorio.turno || "")
    setChamadoReferencia(relatorio.chamado_referencia || "")
    setCategoriaOption(categoria.option)
    setCategoriaOutro(categoria.other)
    setSubcategoriaOption(subcategoria.option)
    setSubcategoriaOutro(subcategoria.other)
    setResumoAtendimento(
      resumoUnificadoRelatorio(relatorio),
    )
    setObservacoesGerais(relatorio.observacoes_gerais || "")
    setItens(
      (relatorio.relatorios_redes_itens || []).map((item) => {
        const tipo = resolveOption(item.tipo_componente, TIPOS_COMPONENTE)
        const resultado = resolveOption(item.resultado, RESULTADOS_REDE)

        return {
          tempId: crypto.randomUUID(),
          tipoOption: tipo.option,
          tipoOutro: tipo.other,
          identificacao: item.identificacao || "",
          ambiente: item.ambiente || "",
          rackOrigem: item.rack_origem || "",
          portaPonto: item.porta_ponto || "",
          sintoma: item.sintoma || "",
          testesRealizados: Array.isArray(item.testes_realizados)
            ? item.testes_realizados
            : [],
          testesOutro: item.testes_outro || "",
          acaoRealizada: item.acao_realizada || "",
          resultadoOption: resultado.option,
          resultadoOutro: resultado.other,
          necessitaNovaVisita: Boolean(item.necessita_nova_visita),
          necessitaInfraestrutura: Boolean(item.necessita_infraestrutura),
          necessitaManutencaoPonto: Boolean(item.necessita_manutencao_ponto),
          acionamentoFde: Boolean(item.acionamento_fde),
          acionamentoOperadora: Boolean(item.acionamento_operadora),
          necessitaGarantia: Boolean(item.necessita_garantia),
          escolaOrientada: Boolean(item.escola_orientada),
          qtdPontosRede: Number(item.qtd_pontos_rede || 0),
          qtdPontosEletricos: Number(item.qtd_pontos_eletricos || 0),
          qtdInfraAps: Number(item.qtd_infra_aps || 0),
          ambientesInfra: item.ambientes_infra || "",
          justificativaInfra: item.justificativa_infra || "",
          observacao: item.observacao || "",
        }
      }),
    )
    setHistoricoAberto(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function excluirRascunho(relatorio: RelatorioRedeHistorico) {
    const confirmado = window.confirm(
      `Excluir o rascunho da escola ${relatorio.escola_nome}?`,
    )
    if (!confirmado) return

    const { data, error } = await supabase.rpc("excluir_relatorio_redes", {
      p_id: relatorio.id,
    })

    if (error || data !== true) {
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível excluir o rascunho.",
      })
      return
    }

    if (editandoId === relatorio.id) limparFormulario()
    await carregarHistorico()
    setMensagem({ tipo: "success", texto: "Rascunho excluído." })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-[2rem] border border-slate-800 bg-[#020617] p-8 text-center shadow-2xl">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Carregando relatório de redes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div id="inicio-relatorio-redes" className="mx-auto w-full max-w-[1800px] space-y-7 pb-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/25 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.08),transparent_29%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Atendimento de redes
              </span>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Relatório técnico
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 sm:flex">
                <NetworkIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  Relatório Técnico de Redes
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Registre componentes, situações encontradas, testes, ações e resultados das demandas de conectividade atendidas pelos técnicos Field.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:items-end">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                Técnico responsável
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {usuario?.nome || usuario?.email || "Usuário"}
              </p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                {autosaveStatus === "salvando"
                  ? "Salvando cópia local"
                  : autosaveStatus === "salvo"
                    ? "Cópia local salva"
                    : autosaveStatus === "erro"
                      ? "Falha no autosave"
                      : "Autosave local"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHistoricoAberto(true)}
              className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
            >
              <HistoryIcon className="h-5 w-5" />
              Relatórios registrados
              <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px]">
                {totais.total}
              </span>
            </button>
          </div>
        </div>
      </section>

      {snapshotRecuperavel && (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-amber-200">
              Cópia local encontrada
            </p>
            <p className="mt-1 text-xs font-medium text-amber-300/65">
              Salva em {formatarDataHora(snapshotRecuperavel.savedAt)}. Você pode restaurar o preenchimento anterior.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => descartarSnapshot()}
              className="h-10 rounded-xl border border-amber-500/20 bg-[#020617] px-4 text-xs font-black text-amber-300"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => aplicarSnapshot(snapshotRecuperavel)}
              className="h-10 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950"
            >
              Restaurar
            </button>
          </div>
        </section>
      )}

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            mensagem.tipo === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : mensagem.tipo === "error"
                ? "border-red-500/25 bg-red-500/10 text-red-300"
                : "border-blue-500/25 bg-blue-500/10 text-blue-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <form
        className="space-y-7"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          salvar("rascunho")
        }}
      >
        <Panel className="border-blue-500/30 bg-[linear-gradient(145deg,rgba(8,20,46,0.98),rgba(2,6,23,1))]">
          <div className="mb-6 rounded-2xl border border-blue-500/25 bg-blue-500/[0.08] p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Etapa inicial
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              Dados do atendimento
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-blue-100/60">
              Identifique a unidade, informe o chamado atendido e registre os dados gerais da demanda de redes.
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Unidade escolar" required>
                <input
                  list="escolas-redes-list"
                  value={escolaDigitada}
                  onChange={(event) => setEscolaDigitada(event.target.value)}
                  placeholder="Selecione ou digite a escola"
                  className={inputClassName}
                />
                <datalist id="escolas-redes-list">
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.nome_escola || ""} />
                  ))}
                </datalist>
              </Field>

              <Field label="Data do atendimento" required>
                <input
                  type="date"
                  value={dataAtendimento}
                  onChange={(event) => setDataAtendimento(event.target.value)}
                  className={inputClassName}
                />
              </Field>

              <Field label="Turno">
                <select
                  value={turno}
                  onChange={(event) => setTurno(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecione</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Integral">Integral</option>
                </select>
              </Field>

              <Field label="Chamado de referência">
                <input
                  value={chamadoReferencia}
                  onChange={(event) => setChamadoReferencia(event.target.value)}
                  placeholder="STI-XX/XXXX"
                  className={inputClassName}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Categoria" required>
                <select
                  value={categoriaOption}
                  onChange={(event) => setCategoriaOption(event.target.value)}
                  className={inputClassName}
                >
                  {CATEGORIAS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                {categoriaOption === "Outro" && (
                  <input
                    value={categoriaOutro}
                    onChange={(event) => setCategoriaOutro(event.target.value)}
                    placeholder="Descreva a categoria"
                    className={`${inputClassName} mt-2`}
                  />
                )}
              </Field>

              <Field label="Subcategoria" required>
                <select
                  value={subcategoriaOption}
                  onChange={(event) => setSubcategoriaOption(event.target.value)}
                  className={inputClassName}
                >
                  {SUBCATEGORIAS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                {subcategoriaOption === "Outro" && (
                  <input
                    value={subcategoriaOutro}
                    onChange={(event) => setSubcategoriaOutro(event.target.value)}
                    placeholder="Descreva a subcategoria"
                    className={`${inputClassName} mt-2`}
                  />
                )}
              </Field>
            </div>

            <Field label="Resumo geral da demanda e do atendimento" required>
              <textarea
                value={resumoAtendimento}
                onChange={(event) => setResumoAtendimento(event.target.value)}
                rows={7}
                placeholder="Descreva a solicitação do chamado e os principais pontos de atenção."
                className={textareaClassName}
              />
            </Field>
          </div>
        </Panel>

        <section>
          <div className="mb-5 flex flex-col gap-4 rounded-[1.5rem] border border-slate-800 bg-[#020617] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
                Registro técnico estruturado
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Itens de rede avaliados
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Registre separadamente cada AP, switch, uplink, link, rack, ponto ou outro componente analisado.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                itemTemDados(ultimoItem)
                  ? setAdicionarModalAberto(true)
                  : adicionarEmBranco()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <PlusIcon className="h-4 w-4" />
              Adicionar item
            </button>
          </div>

          <div className="space-y-6">
            {itens.map((item, index) => (
              <article
                id={`item-rede-${item.tempId}`}
                key={item.tempId}
                className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-xl shadow-slate-950/15"
              >
                <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/55 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-black text-cyan-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400">
                        Item técnico de rede
                      </p>
                      <h3 className="mt-1 text-lg font-black text-white">
                        {tipoFinal(item) || "Novo item"}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removerItem(item.tempId)}
                    disabled={itens.length === 1}
                    className="h-10 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Remover
                  </button>
                </div>

                <div className="space-y-7 p-5 sm:p-6">
                  <SubPanel
                    title="Identificação do componente"
                    description="Classifique e identifique o ativo, ambiente, rack e porta analisados."
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Tipo de componente" required>
                        <select
                          value={item.tipoOption}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              tipoOption: event.target.value,
                            })
                          }
                          className={inputClassName}
                        >
                          {TIPOS_COMPONENTE.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                        {item.tipoOption === "Outro" && (
                          <input
                            value={item.tipoOutro}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                tipoOutro: event.target.value,
                              })
                            }
                            placeholder="Descreva o componente"
                            className={`${inputClassName} mt-2`}
                          />
                        )}
                      </Field>

                      <Field label="Identificação técnica">
                        <input
                          value={item.identificacao}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              identificacao: event.target.value,
                            })
                          }
                          placeholder="Ex.: AP07, SW04, Segundo Link REDFOX"
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Ambiente / local">
                        <input
                          value={item.ambiente}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              ambiente: event.target.value,
                            })
                          }
                          placeholder="Ex.: Secretaria, Sala 12"
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Rack / origem">
                        <input
                          value={item.rackOrigem}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              rackOrigem: event.target.value,
                            })
                          }
                          placeholder="Ex.: RK01 / SW02"
                          className={inputClassName}
                        />
                      </Field>
                    </div>

                    <div className="mt-4 max-w-xl">
                      <Field label="Porta, ponto ou enlace">
                        <input
                          value={item.portaPonto}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              portaPonto: event.target.value,
                            })
                          }
                          placeholder="Ex.: RK01-PP01-PT17, SW02-PT19"
                          className={inputClassName}
                        />
                      </Field>
                    </div>
                  </SubPanel>

                  <SubPanel
                    title="Situação encontrada e testes"
                    description="Descreva o cenário observado e marque os procedimentos executados durante o atendimento."
                  >
                    <div>
                      <Field label="Situação encontrada" required>
                        <textarea
                          value={item.sintoma}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              sintoma: event.target.value,
                            })
                          }
                          rows={7}
                          placeholder="Descreva o problema apresentado, a necessidade de instalação ou a condição da infraestrutura identificada durante o atendimento."
                          className={textareaClassName}
                        />
                      </Field>
                      <QuickModels
                        models={MODELOS_SINTOMA}
                        onApply={(text) =>
                          atualizarItem(item.tempId, {
                            sintoma: item.sintoma.trim()
                              ? `${item.sintoma.trim()}\n${text}`
                              : text,
                          })
                        }
                      />
                    </div>

                    <div className="mt-6 border-t border-slate-800 pt-5">
                      <FieldLabel
                        label="Testes realizados"
                        description="Selecione todos os procedimentos executados no item"
                      />
                      <div className="flex flex-wrap gap-2">
                        {TESTES_REDE.map((teste) => {
                          const active = item.testesRealizados.includes(teste)
                          return (
                            <button
                              key={teste}
                              type="button"
                              onClick={() => alternarTeste(item.tempId, teste)}
                              className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition ${
                                active
                                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                                  : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                              }`}
                            >
                              {teste}
                            </button>
                          )
                        })}
                      </div>

                      {item.testesRealizados.includes("Outro") && (
                        <textarea
                          value={item.testesOutro}
                          onChange={(event) =>
                            atualizarItem(item.tempId, {
                              testesOutro: event.target.value,
                            })
                          }
                          rows={3}
                          placeholder="Descreva os outros testes realizados"
                          className={`${textareaClassName} mt-3`}
                        />
                      )}
                    </div>
                  </SubPanel>

                  <SubPanel
                    title="Ação e resultado"
                    description="Registre o procedimento executado, o resultado obtido e as sinalizações do atendimento."
                  >
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div>
                        <Field label="Ações realizadas" required>
                          <textarea
                            value={item.acaoRealizada}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                acaoRealizada: event.target.value,
                              })
                            }
                            rows={6}
                            placeholder="Descreva os procedimentos executados em ordem lógica, incluindo ajustes, substituições, validações e orientações realizadas."
                            className={textareaClassName}
                          />
                        </Field>
                        <QuickModels
                          models={MODELOS_ACAO}
                          onApply={(text) =>
                            atualizarItem(item.tempId, {
                              acaoRealizada: item.acaoRealizada.trim()
                                ? `${item.acaoRealizada.trim()}\n${text}`
                                : text,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Field label="Resultado" required>
                          <select
                            value={item.resultadoOption}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                resultadoOption: event.target.value,
                              })
                            }
                            className={inputClassName}
                          >
                            {RESULTADOS_REDE.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                          {item.resultadoOption === "Outro" && (
                            <input
                              value={item.resultadoOutro}
                              onChange={(event) =>
                                atualizarItem(item.tempId, {
                                  resultadoOutro: event.target.value,
                                })
                              }
                              placeholder="Descreva o resultado"
                              className={`${inputClassName} mt-2`}
                            />
                          )}
                        </Field>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <CheckOption
                            label="Necessita nova visita"
                            checked={item.necessitaNovaVisita}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                necessitaNovaVisita: checked,
                              })
                            }
                          />
                          <CheckOption
                            label="Necessita infraestrutura"
                            checked={item.necessitaInfraestrutura}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                necessitaInfraestrutura: checked,
                              })
                            }
                          />
                          <CheckOption
                            label="Manutenção de ponto"
                            checked={item.necessitaManutencaoPonto}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                necessitaManutencaoPonto: checked,
                              })
                            }
                          />
                          <CheckOption
                            label="Acionamento FDE"
                            checked={item.acionamentoFde}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                acionamentoFde: checked,
                              })
                            }
                          />
                          <CheckOption
                            label="Acionamento de operadora"
                            checked={item.acionamentoOperadora}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                acionamentoOperadora: checked,
                              })
                            }
                          />
                          <CheckOption
                            label="Garantia / substituição"
                            checked={item.necessitaGarantia}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                necessitaGarantia: checked,
                              })
                            }
                          />
                          <CheckOption
                            label="Escola orientada"
                            checked={item.escolaOrientada}
                            onChange={(checked) =>
                              atualizarItem(item.tempId, {
                                escolaOrientada: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </SubPanel>

                  {item.necessitaInfraestrutura && (
                    <SubPanel
                      title="Levantamento de infraestrutura"
                      description="Detalhe os pontos, ambientes e justificativas necessárias para encaminhamento."
                      tone="amber"
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field label="Pontos de rede">
                          <input
                            type="number"
                            min="0"
                            value={item.qtdPontosRede}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                qtdPontosRede: Math.max(0, Number(event.target.value)),
                              })
                            }
                            className={inputClassName}
                          />
                        </Field>
                        <Field label="Pontos elétricos">
                          <input
                            type="number"
                            min="0"
                            value={item.qtdPontosEletricos}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                qtdPontosEletricos: Math.max(0, Number(event.target.value)),
                              })
                            }
                            className={inputClassName}
                          />
                        </Field>
                        <Field label="Infraestruturas para AP">
                          <input
                            type="number"
                            min="0"
                            value={item.qtdInfraAps}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                qtdInfraAps: Math.max(0, Number(event.target.value)),
                              })
                            }
                            className={inputClassName}
                          />
                        </Field>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Field label="Ambientes">
                          <textarea
                            value={item.ambientesInfra}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                ambientesInfra: event.target.value,
                              })
                            }
                            rows={4}
                            placeholder="Liste os ambientes contemplados"
                            className={textareaClassName}
                          />
                        </Field>
                        <Field label="Justificativa técnica" required>
                          <textarea
                            value={item.justificativaInfra}
                            onChange={(event) =>
                              atualizarItem(item.tempId, {
                                justificativaInfra: event.target.value,
                              })
                            }
                            rows={4}
                            placeholder="Explique a necessidade e o impacto observado"
                            className={textareaClassName}
                          />
                        </Field>
                      </div>
                    </SubPanel>
                  )}

                  <Field label="Observações do item">
                    <textarea
                      value={item.observacao}
                      onChange={(event) =>
                        atualizarItem(item.tempId, {
                          observacao: event.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Informações complementares que não se encaixam nos campos anteriores"
                      className={textareaClassName}
                    />
                  </Field>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[2rem] border border-cyan-500/25 bg-cyan-500/[0.06] p-4 shadow-lg shadow-cyan-950/10 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  Continuar o atendimento
                </p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                  Adicione outro componente de rede ou avance para revisar e finalizar o relatório.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    itemTemDados(ultimoItem)
                      ? setAdicionarModalAberto(true)
                      : adicionarEmBranco()
                  }
                  className="min-h-[46px] rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 text-xs font-black uppercase tracking-widest text-cyan-300 transition-all hover:bg-cyan-500 hover:text-cyan-950"
                >
                  + Adicionar item de rede
                </button>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("finalizacao-relatorio-redes")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="min-h-[46px] rounded-2xl bg-emerald-500 px-5 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-lg shadow-emerald-950/20 transition-all hover:bg-emerald-400"
                >
                  Ir para finalização
                </button>
              </div>
            </div>
          </div>
        </section>

        <div id="finalizacao-relatorio-redes" className="scroll-mt-24">
        <Panel className="border-cyan-500/30 shadow-cyan-950/20">
          <div className="mb-5 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Etapa final
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              Finalização do relatório
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-cyan-100/70">
              Revise as informações, salve como rascunho ou finalize para gerar o PDF e o retorno do chamado.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <Field label="Observações gerais">
              <textarea
                value={observacoesGerais}
                onChange={(event) => setObservacoesGerais(event.target.value)}
                rows={5}
                placeholder="Registre orientações gerais, pendências ou informações para acompanhamento da SETEC."
                className={textareaClassName}
              />
            </Field>

            <div className="min-w-0 rounded-[1.5rem] border border-slate-800 bg-slate-950/65 p-3 sm:min-w-[360px] sm:p-4">
              <p className="mb-3 px-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                Ações do relatório
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="group flex min-h-[62px] w-full items-center gap-3 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/[0.12] to-cyan-500/[0.07] px-4 text-left transition hover:border-blue-400/50 hover:from-blue-500/[0.18] hover:to-cyan-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 transition group-hover:bg-blue-500/20">
                    {salvando ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200/30 border-t-blue-200" />
                    ) : (
                      <SaveIcon className="h-5 w-5" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black uppercase tracking-widest text-blue-200">
                      {salvando ? "Salvando..." : "Salvar rascunho"}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold text-slate-500">
                      Continuar o preenchimento em outro momento
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => salvar("finalizado")}
                  className="group flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-emerald-300/35 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-4 text-left text-white shadow-[0_16px_36px_rgba(16,185,129,0.22)] transition hover:-translate-y-0.5 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-400 hover:shadow-[0_20px_42px_rgba(16,185,129,0.30)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 shadow-inner">
                    <CheckIcon className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black uppercase tracking-widest">
                      Finalizar relatório
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold text-emerald-950/75">
                      Gerar PDF e retorno para o chamado atendido
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Panel>
        </div>
      </form>

      {relatorioFinalizadoModal && (
        <ModalOverlay onClose={() => setRelatorioFinalizadoModal(null)}>
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-[#020617] shadow-2xl shadow-cyan-950/30">
            <div className="relative overflow-hidden border-b border-slate-800 p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_38%)]" />
              <div className="relative z-10">
                <p className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Relatório finalizado
                </p>

                <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                  Atendimento de redes registrado
                </h2>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  O relatório da escola {relatorioFinalizadoModal.escola_nome} foi salvo. Agora você pode abrir o PDF ou gerar o texto de retorno para o chamado atendido.
                </p>

                {relatorioFinalizadoModal.chamado_referencia && (
                  <p className="mt-3 inline-flex rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-300">
                    Chamado: {relatorioFinalizadoModal.chamado_referencia}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 p-6">
              <button
                type="button"
                onClick={() => abrirPdf(relatorioFinalizadoModal)}
                className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
              >
                Abrir PDF / Imprimir
              </button>

              <button
                type="button"
                onClick={() => {
                  setRetornoModal({
                    relatorio: relatorioFinalizadoModal,
                    texto: montarRetorno(relatorioFinalizadoModal),
                  })
                  setRelatorioFinalizadoModal(null)
                }}
                className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500 hover:text-white"
              >
                Gerar retorno para o chamado
              </button>

              <button
                type="button"
                onClick={() => setRelatorioFinalizadoModal(null)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {adicionarModalAberto && (
        <ModalOverlay onClose={() => setAdicionarModalAberto(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-500/25 bg-[#020617] shadow-2xl">
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
                Novo item técnico
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Como deseja adicionar?
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Você pode iniciar um item vazio ou reaproveitar os testes e procedimentos do registro anterior.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <button
                type="button"
                onClick={adicionarEmBranco}
                className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left transition hover:border-cyan-500/40"
              >
                <PlusIcon className="h-6 w-6 text-cyan-300" />
                <p className="mt-4 font-black text-white">Adicionar em branco</p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                  Cria um novo item sem informações preenchidas.
                </p>
              </button>
              <button
                type="button"
                onClick={reaproveitarAnterior}
                className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.08] p-5 text-left transition hover:border-blue-400/50"
              >
                <ReuseIcon className="h-6 w-6 text-blue-300" />
                <p className="mt-4 font-black text-white">Reaproveitar anterior</p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                  Copia tipo, situação, testes, ações, resultado e sinalizações. Identificação, ambiente, rack e porta ficam vazios.
                </p>
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {historicoAberto && (
        <div className="fixed inset-0 z-[9998] flex justify-end bg-[#020617]/80 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setHistoricoAberto(false)}
            aria-label="Fechar histórico"
          />
          <aside className="relative z-10 flex h-full w-full max-w-5xl flex-col border-l border-slate-800 bg-[#020617] shadow-2xl shadow-black/60">
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                    Consulta geral
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Relatórios de redes registrados
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {isGestao
                      ? "Visão de todos os técnicos."
                      : "Seus rascunhos e relatórios finalizados."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoricoAberto(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg font-black text-slate-500 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <DrawerMetric label="Total" value={totais.total} />
                <DrawerMetric label="Finalizados" value={totais.finalizados} />
                <DrawerMetric label="Rascunhos" value={totais.rascunhos} />
                <DrawerMetric label="Itens" value={totais.itensTotal} />
                <DrawerMetric label="Infraestrutura" value={totais.infra} />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    value={buscaHistorico}
                    onChange={(event) => setBuscaHistorico(event.target.value)}
                    placeholder="Buscar escola, chamado, técnico ou categoria..."
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-sm font-semibold text-white outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusHistorico}
                  onChange={(event) =>
                    setStatusHistorico(
                      event.target.value as "todos" | "rascunho" | "finalizado",
                    )
                  }
                  className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-white"
                >
                  <option value="todos">Todos os status</option>
                  <option value="finalizado">Finalizados</option>
                  <option value="rascunho">Rascunhos</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {historicoFiltrado.map((relatorio) => (
                  <article
                    key={relatorio.id}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {relatorio.escola_nome}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          {formatarData(relatorio.data_atendimento)} • {relatorio.tecnico_nome}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
                          relatorio.status === "finalizado"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {relatorio.status}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-xs font-medium leading-relaxed text-slate-500">
                      {resumoUnificadoRelatorio(relatorio)}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <SmallInfo label="Chamado" value={relatorio.chamado_referencia || "-"} />
                      <SmallInfo label="Categoria" value={relatorio.subcategoria || relatorio.categoria} />
                      <SmallInfo label="Itens" value={String(relatorio.relatorios_redes_itens?.length || 0)} />
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                      {relatorio.status === "finalizado" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => abrirPdf(relatorio)}
                            className="h-10 rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20"
                          >
                            Abrir PDF
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRetornoModal({
                                relatorio,
                                texto: montarRetorno(relatorio),
                              })
                            }
                            className="h-10 rounded-xl border border-blue-500/25 bg-blue-500/10 text-[10px] font-black uppercase tracking-widest text-blue-300 hover:bg-blue-500/20"
                          >
                            Gerar retorno
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => carregarRascunho(relatorio)}
                            className="h-10 rounded-xl border border-blue-500/25 bg-blue-500/10 text-[10px] font-black uppercase tracking-widest text-blue-300"
                          >
                            Continuar edição
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirRascunho(relatorio)}
                            className="h-10 rounded-xl border border-red-500/20 bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-300"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {historicoFiltrado.length === 0 && (
                <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-center text-sm font-medium text-slate-600">
                  Nenhum relatório encontrado.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {retornoModal && (
        <ModalOverlay onClose={() => setRetornoModal(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-blue-500/25 bg-[#020617] shadow-2xl">
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                Retorno padronizado
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {retornoModal.relatorio.escola_nome}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <textarea
                value={retornoModal.texto}
                onChange={(event) =>
                  setRetornoModal({
                    ...retornoModal,
                    texto: event.target.value,
                  })
                }
                className="min-h-[420px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm font-medium leading-relaxed text-slate-200 outline-none"
              />
            </div>
            <div className="flex gap-3 border-t border-slate-800 p-5 sm:p-6">
              <button
                type="button"
                onClick={() => setRetornoModal(null)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-5 text-xs font-black text-slate-300"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(retornoModal.texto)
                  setMensagem({ tipo: "success", texto: "Retorno copiado." })
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500"
              >
                <CopyIcon className="h-4 w-4" />
                Copiar retorno
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

const inputClassName =
  "h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"

const textareaClassName =
  "w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/15 sm:p-6 lg:p-7 ${className}`}
    >
      {children}
    </section>
  )
}

function SubPanel({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string
  description: string
  children: ReactNode
  tone?: "default" | "amber"
}) {
  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 ${
        tone === "amber"
          ? "border-amber-500/20 bg-amber-500/[0.04]"
          : "border-slate-800 bg-slate-950/45"
      }`}
    >
      <div className="mb-5">
        <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-200">
          {title}
        </h4>
        <p className="mt-1 text-xs font-medium text-slate-600">
          {description}
        </p>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-cyan-400">*</span>}
      </span>
      {children}
    </label>
  )
}

function FieldLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[10px] font-medium text-slate-600">
        {description}
      </p>
    </div>
  )
}

function QuickModels({
  models,
  onApply,
}: {
  models: Array<{ rotulo: string; texto: string }>
  onApply: (text: string) => void
}) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {models.map((model) => (
        <button
          key={model.rotulo}
          type="button"
          onClick={() => onApply(model.texto)}
          className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 transition hover:border-cyan-500/30 hover:text-cyan-300"
        >
          {model.rotulo}
        </button>
      ))}
    </div>
  )
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
        checked
          ? "border-cyan-500/30 bg-cyan-500/[0.08] text-cyan-200"
          : "border-slate-800 bg-slate-950/60 text-slate-500"
      }`}
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

function DrawerMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  )
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}

function SvgBase({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.9}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function NetworkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 13.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 8.25v3.75h6V9m0 3v3.75" />
    </SvgBase>
  )
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z" />
    </SvgBase>
  )
}

function HistoryIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.708M3 4.5v4.5h4.5M12 7.5V12l3 1.5" />
    </SvgBase>
  )
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </SvgBase>
  )
}

function SaveIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75h12l3 3v13.5h-15V3.75Zm3 0V9h7.5V3.75M8.25 15h7.5" />
    </SvgBase>
  )
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 4.5 4.5 10.5-10.5" />
    </SvgBase>
  )
}

function ReuseIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.75v4.5h-4.5M3.75 17.25v-4.5h4.5M5.69 9A7.5 7.5 0 0 1 18 6.75l2.25 4.5M18.31 15A7.5 7.5 0 0 1 6 17.25l-2.25-4.5" />
    </SvgBase>
  )
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 8.25h11.25V19.5H8.25V8.25Zm-3.75 7.5V4.5h11.25" />
    </SvgBase>
  )
}
