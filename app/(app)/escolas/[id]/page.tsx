"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Escola = {
  id: string
  nome_escola: string | null
  cie?: string | number | null
  telefone?: string | null
  endereco?: string | null
  diretor?: string | null
  tipo_ensino?: string | null
  periodo?: string | null
  email?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  horario_abertura?: string | null
  horario_fechamento?: string | null
  total_alunos?: string | number | null
  qtd_salas?: string | number | null
  total_equipamentos_recebidos?: string | number | null
  total_equipamentos_funcionando?: string | number | null
  aps_instalados?: string | number | null
  status_conectividade?: string | null
  criticidade?: string | number | null
  ultima_visita?: string | null
  ultima_atualizacao?: string | null
  observacoes?: string | null
  tecnico_atribuido?: string | null
  created_at?: string | null
}

type Metrics = {
  salas: number
  aps: number
  alunos: number
  equipRecebidos: number
  equipFuncionando: number
  percentualFuncionando: number
  indiceAP: number
  indiceEquip: number
  score: number
  criticidade: "Crítica" | "Atenção" | "Saudável"
  apsFaltantes: number
  equipFaltantes: number
  wifiIdeal: number
  equipIdeal: number
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function numeroSeguro(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value || "").trim()
  return text || fallback
}

function formatarNumero(value: unknown) {
  return numeroSeguro(value).toLocaleString("pt-BR")
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function formatarPercentual(value: number) {
  const percent = Number.isFinite(value) ? value * 100 : 0
  return `${clamp(Math.round(percent), 0, 999)}%`
}

function formatarDataBR(value?: string | null) {
  if (!value) return "Não registrada"

  const text = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [y, m, d] = text.slice(0, 10).split("-")
    return `${d}/${m}/${y}`
  }

  const date = new Date(text)

  if (Number.isNaN(date.getTime())) return "Não registrada"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  })
}

function formatarDataHoraBR(value?: string | null) {
  if (!value) return "Não registrada"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return formatarDataBR(value)

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getInitials(name?: string | null) {
  const clean = textoSeguro(name, "")

  if (!clean) return "SE"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function calcMetrics(e: Escola): Metrics {
  const salas = numeroSeguro(e.qtd_salas)
  const aps = numeroSeguro(e.aps_instalados)
  const alunos = numeroSeguro(e.total_alunos)
  const equipRecebidos = numeroSeguro(e.total_equipamentos_recebidos)
  const equipFuncionando = numeroSeguro(
    e.total_equipamentos_funcionando ?? e.total_equipamentos_recebidos ?? 0
  )

  const wifiIdeal = salas > 0 ? salas / 2 : 1
  const equipIdeal = alunos > 0 ? alunos / 3 : 1

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equipFuncionando / equipIdeal, 1)

  const score = indiceEquip * 0.6 + indiceAP * 0.4

  let criticidade: Metrics["criticidade"] = "Saudável"

  if (score < 0.6) criticidade = "Crítica"
  else if (score < 0.8) criticidade = "Atenção"

  const percentualFuncionando =
    equipRecebidos > 0 ? equipFuncionando / equipRecebidos : 0

  return {
    salas,
    aps,
    alunos,
    equipRecebidos,
    equipFuncionando,
    percentualFuncionando,
    indiceAP,
    indiceEquip,
    score,
    criticidade,
    apsFaltantes: Math.max(Math.ceil(wifiIdeal - aps), 0),
    equipFaltantes: Math.max(Math.ceil(equipIdeal - equipFuncionando), 0),
    wifiIdeal,
    equipIdeal,
  }
}

function getCriticidadeConfig(criticidade: Metrics["criticidade"]) {
  if (criticidade === "Crítica") {
    return {
      icon: "🚨",
      label: "Crítica",
      badge: "border-red-500/30 bg-red-500/10 text-red-300",
      glow: "bg-red-500",
      card: "border-red-500/25 bg-red-500/10",
      text: "text-red-300",
      bar: "bg-red-500",
    }
  }

  if (criticidade === "Atenção") {
    return {
      icon: "⚠️",
      label: "Atenção",
      badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
      glow: "bg-yellow-500",
      card: "border-yellow-500/25 bg-yellow-500/10",
      text: "text-yellow-300",
      bar: "bg-yellow-500",
    }
  }

  return {
    icon: "✅",
    label: "Saudável",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    glow: "bg-emerald-500",
    card: "border-emerald-500/25 bg-emerald-500/10",
    text: "text-emerald-300",
    bar: "bg-emerald-500",
  }
}

function getOperacionalConfig(percentual: number) {
  if (percentual < 0.6) {
    return {
      label: "Crítico — grande parte do parque inoperante",
      color: "bg-red-500",
      text: "text-red-300",
      border: "border-red-500/25",
      bg: "bg-red-500/10",
    }
  }

  if (percentual < 0.8) {
    return {
      label: "Atenção — parte relevante do parque parada",
      color: "bg-yellow-500",
      text: "text-yellow-300",
      border: "border-yellow-500/25",
      bg: "bg-yellow-500/10",
    }
  }

  return {
    label: "Saudável — maioria dos equipamentos em operação",
    color: "bg-emerald-500",
    text: "text-emerald-300",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/10",
  }
}

function getConectividadeConfig(status?: string | null) {
  const text = String(status || "").toLowerCase()

  if (text.includes("crít") || text.includes("crit") || text.includes("offline")) {
    return "border-red-500/25 bg-red-500/10 text-red-300"
  }

  if (text.includes("aten") || text.includes("instável") || text.includes("instavel")) {
    return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
  }

  if (text.includes("online") || text.includes("ok") || text.includes("normal")) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getMapsUrl(escola: Escola) {
  const lat = textoSeguro(escola.latitude, "")
  const lng = textoSeguro(escola.longitude, "")

  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lat},${lng}`
    )}`
  }

  const endereco = textoSeguro(escola.endereco, "")

  if (!endereco) return ""

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${escola.nome_escola || ""} ${endereco}`
  )}`
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function EscolaDetalhePage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams()

  const id = useMemo(() => {
    const raw = params?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [escola, setEscola] = useState<Escola | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  const carregar = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setErro("")

    try {
      const { data, error } = await supabase
        .from("escolas")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setEscola(null)
        setMetrics(null)
        setErro("Unidade escolar não encontrada.")
        return
      }

      const escolaData = data as Escola

      setEscola(escolaData)
      setMetrics(calcMetrics(escolaData))
    } catch (error: any) {
      console.error("[Escola Detalhe] Erro ao carregar escola:", error)
      setErro(error?.message || "Não foi possível carregar os dados da unidade escolar.")
      setEscola(null)
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Carregando ficha tecnológica
          </p>
        </div>
      </div>
    )
  }

  if (erro || !escola || !metrics) {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <div className="rounded-[2rem] border border-red-500/25 bg-red-500/10 p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-black text-white">
            Não foi possível abrir a unidade
          </h1>
          <p className="mt-2 text-sm font-medium text-red-200/80">
            {erro || "Os dados da escola não foram localizados."}
          </p>

          <Link
            href="/escolas"
            className="mt-6 inline-flex rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-200 transition hover:bg-slate-800"
          >
            ← Voltar para escolas
          </Link>
        </div>
      </div>
    )
  }

  const criticidadeAtual = getCriticidadeConfig(metrics.criticidade)
  const operacional = getOperacionalConfig(metrics.percentualFuncionando)
  const mapaUrl = getMapsUrl(escola)
  const scorePercentual = clamp(metrics.score * 100)
  const indiceEquipPercentual = clamp(metrics.indiceEquip * 100)
  const indiceAPPercentual = clamp(metrics.indiceAP * 100)
  const percentualFuncionando = clamp(metrics.percentualFuncionando * 100)

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.23),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_32%)]" />
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full ${criticidadeAtual.glow} opacity-15 blur-3xl`}
        />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_460px] xl:items-end">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                Ficha da unidade
              </Badge>

              {escola.cie && (
                <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  CIE {escola.cie}
                </Badge>
              )}

              <Badge className={criticidadeAtual.badge}>
                {criticidadeAtual.icon} {criticidadeAtual.label}
              </Badge>

              <Badge className={getConectividadeConfig(escola.status_conectividade)}>
                {escola.status_conectividade || "Conectividade não informada"}
              </Badge>
            </div>

            <h1 className="break-words text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
              {escola.nome_escola || "Unidade escolar"}
            </h1>

            <p className="mt-4 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              📍 {escola.endereco || "Endereço não informado"}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/escolas"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
              >
                ← Voltar para escolas
              </Link>

              {mapaUrl ? (
                <a
                  href={mapaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  🗺️ Abrir mapa
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 text-sm font-black uppercase tracking-widest text-slate-600"
                >
                  🗺️ Mapa indisponível
                </button>
              )}

              <button
                type="button"
                onClick={carregar}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 text-sm font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20"
              >
                ↻ Atualizar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniHeroStat label="Alunos" value={metrics.alunos} helper="Total informado" tone="blue" />
            <MiniHeroStat label="Salas" value={metrics.salas} helper="Base AP" tone="cyan" />
            <MiniHeroStat label="Equip." value={metrics.equipFuncionando} helper="Funcionando" tone="emerald" />
            <MiniHeroStat label="APs" value={metrics.aps} helper="Instalados" tone="purple" />
          </div>
        </div>
      </section>

      {/* STATUS EXECUTIVO */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <Panel className={criticidadeAtual.card}>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-4xl">
              {criticidadeAtual.icon}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                Status geral
              </p>
              <h2 className={`mt-2 text-4xl font-black ${criticidadeAtual.text}`}>
                {metrics.criticidade}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                Score calculado com peso maior para parque tecnológico e peso complementar
                para cobertura Wi-Fi.
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-widest">
              <span className="text-slate-500">Score Tech</span>
              <span className={criticidadeAtual.text}>{formatarPercentual(metrics.score)}</span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-slate-950">
              <div
                className={`h-full rounded-full ${criticidadeAtual.bar}`}
                style={{ width: `${scorePercentual}%` }}
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                Recomendações automáticas
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Prioridades de ação
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
                As recomendações abaixo são calculadas com base na relação entre alunos,
                equipamentos funcionando, salas e APs instalados.
              </p>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 text-4xl">
              🎯
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ActionCard
              icon="💻"
              title="Equipamentos"
              value={
                metrics.equipFaltantes > 0
                  ? `${formatarNumero(metrics.equipFaltantes)} faltante(s)`
                  : "Sem déficit"
              }
              description={
                metrics.equipFaltantes > 0
                  ? "Quantidade estimada para atingir a proporção ideal de 1 equipamento para cada 3 alunos."
                  : "A unidade está acima ou dentro da referência operacional de equipamentos."
              }
              tone={metrics.equipFaltantes > 0 ? "yellow" : "emerald"}
            />

            <ActionCard
              icon="📡"
              title="Access Points"
              value={
                metrics.apsFaltantes > 0
                  ? `${formatarNumero(metrics.apsFaltantes)} faltante(s)`
                  : "Sem déficit"
              }
              description={
                metrics.apsFaltantes > 0
                  ? "Quantidade estimada para atingir a proporção ideal de 1 AP para cada 2 salas."
                  : "A unidade está acima ou dentro da referência operacional de Wi-Fi."
              }
              tone={metrics.apsFaltantes > 0 ? "yellow" : "emerald"}
            />
          </div>
        </Panel>
      </section>

      {/* ÍNDICES PRINCIPAIS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ScoreCard
          icon="💻"
          title="Índice Equipamentos"
          subtitle="Hardware • peso 60%"
          value={indiceEquipPercentual}
          color="indigo"
          description={`${formatarNumero(metrics.equipFuncionando)} funcionando para ${formatarNumero(metrics.alunos)} aluno(s).`}
        />

        <ScoreCard
          icon="📡"
          title="Índice AP"
          subtitle="Wi-Fi • peso 40%"
          value={indiceAPPercentual}
          color="cyan"
          description={`${formatarNumero(metrics.aps)} AP(s) para ${formatarNumero(metrics.salas)} sala(s).`}
        />

        <ScoreCard
          icon="🏆"
          title="Score Tech"
          subtitle="Média ponderada"
          value={scorePercentual}
          color="purple"
          description="Combinação do parque tecnológico com a cobertura de rede da unidade."
        />
      </section>

      {/* RAIO-X */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel>
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
                Parque tecnológico
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Equipamentos da unidade
              </h2>
            </div>

            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-300">
              {formatarNumero(metrics.alunos)} aluno(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricBox label="Recebidos" value={metrics.equipRecebidos} tone="slate" />
            <MetricBox label="Funcionando" value={metrics.equipFuncionando} tone="indigo" />
            <MetricBox
              label="Referência ideal"
              value={Math.ceil(metrics.equipIdeal)}
              tone="blue"
            />
          </div>

          <div className={`mt-6 rounded-2xl border p-5 ${operacional.border} ${operacional.bg}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">Capacidade operacional</p>
              <p className={`text-sm font-black ${operacional.text}`}>
                {formatarPercentual(metrics.percentualFuncionando)}
              </p>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-slate-950">
              <div
                className={`h-full rounded-full ${operacional.color}`}
                style={{ width: `${percentualFuncionando}%` }}
              />
            </div>

            <p className={`mt-3 text-sm font-semibold ${operacional.text}`}>
              {operacional.label}
            </p>
          </div>
        </Panel>

        <Panel>
          <div className="mb-6 border-b border-slate-800 pb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Infraestrutura de rede
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Cobertura Wi-Fi e salas
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricBox label="Salas" value={metrics.salas} tone="slate" />
            <MetricBox label="APs instalados" value={metrics.aps} tone="cyan" />
            <MetricBox label="Referência ideal" value={Math.ceil(metrics.wifiIdeal)} tone="blue" />
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
            <p className="text-sm font-black text-white">Leitura técnica</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-cyan-100/75">
              A referência usada nesta ficha considera a proporção de 1 Access Point para
              cada 2 salas. Essa métrica é uma estimativa operacional para priorização.
            </p>
          </div>
        </Panel>
      </section>

      {/* DADOS CADASTRAIS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <InfoCard title="Institucional" icon="🏫">
          <InfoRow label="Tipo ensino" value={escola.tipo_ensino || "-"} />
          <InfoRow label="Período" value={escola.periodo || "-"} />
          <InfoRow label="Diretor(a)" value={escola.diretor || "-"} />
          <InfoRow label="CIE" value={escola.cie || "-"} />
        </InfoCard>

        <InfoCard title="Contato" icon="📞">
          <InfoRow label="Telefone" value={escola.telefone || "-"} />
          <InfoRow label="E-mail" value={escola.email || "-"} breakValue />
          <InfoRow label="Endereço" value={escola.endereco || "-"} breakValue />
        </InfoCard>

        <InfoCard title="Operação" icon="⏰">
          <InfoRow label="Técnico Field" value={escola.tecnico_atribuido || "-"} highlight />
          <InfoRow label="Abertura" value={escola.horario_abertura || "-"} />
          <InfoRow label="Fechamento" value={escola.horario_fechamento || "-"} />
          <InfoRow label="Conectividade" value={escola.status_conectividade || "-"} />
        </InfoCard>
      </section>

      {/* OBSERVAÇÕES E RASTRO */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="mb-5 border-b border-slate-800 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Observações
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Registro complementar da unidade
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-400">
              {escola.observacoes || "Nenhuma observação registrada para esta unidade."}
            </p>
          </div>
        </Panel>

        <Panel>
          <div className="mb-5 border-b border-slate-800 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Rastreabilidade
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Atualização da ficha
            </h2>
          </div>

          <div className="space-y-3">
            <TraceItem label="Última visita" value={formatarDataBR(escola.ultima_visita)} />
            <TraceItem
              label="Última atualização"
              value={formatarDataHoraBR(escola.ultima_atualizacao)}
            />
            <TraceItem label="Cadastro criado" value={formatarDataHoraBR(escola.created_at)} />
            <TraceItem label="Criticidade cadastrada" value={escola.criticidade ?? "-"} />
          </div>
        </Panel>
      </section>

      {/* METODOLOGIA */}
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-5 md:p-6">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-2xl">
            🧮
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Metodologia de avaliação</h2>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
              Os indicadores são referenciais operacionais para apoiar priorização técnica.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MethodCard
            icon="📡"
            title="Índice AP"
            description="Considera 1 Access Point ideal para cada 2 salas de aula."
          />
          <MethodCard
            icon="💻"
            title="Índice Equipamentos"
            description="Considera 1 equipamento ideal para cada 3 alunos matriculados."
          />
          <MethodCard
            icon="🏆"
            title="Score Tech"
            description="Média ponderada entre Wi-Fi, com peso 40%, e equipamentos, com peso 60%."
          />
        </div>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}
    >
      {children}
    </span>
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
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500/25 to-transparent" />
      {children}
    </div>
  )
}

function MiniHeroStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  tone: "blue" | "cyan" | "emerald" | "purple"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-85">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {typeof value === "number" ? formatarNumero(value) : value}
      </p>
      <p className="mt-1 text-xs font-semibold opacity-80">{helper}</p>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: string
  title: string
  value: string
  description: string
  tone: "yellow" | "emerald"
}) {
  const styles = {
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-2xl border p-5 ${styles[tone]}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-2xl">
          {icon}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
            {title}
          </p>
          <p className="mt-2 text-xl font-black text-white">{value}</p>
          <p className="mt-2 text-sm font-medium leading-relaxed opacity-80">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  icon,
  title,
  subtitle,
  value,
  color,
  description,
}: {
  icon: string
  title: string
  subtitle: string
  value: number
  color: "indigo" | "cyan" | "purple"
  description: string
}) {
  const styles = {
    indigo: {
      border: "border-indigo-500/25",
      bg: "from-indigo-500/15",
      text: "text-indigo-300",
      ring: "#818cf8",
    },
    cyan: {
      border: "border-cyan-500/25",
      bg: "from-cyan-500/15",
      text: "text-cyan-300",
      ring: "#22d3ee",
    },
    purple: {
      border: "border-purple-500/25",
      bg: "from-purple-500/15",
      text: "text-purple-300",
      ring: "#c084fc",
    },
  }

  const current = styles[color]

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border ${current.border} bg-[#020617] bg-gradient-to-br ${current.bg} to-transparent p-6 shadow-xl shadow-slate-950/20`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-3xl">
          {icon}
        </div>

        <span className={`rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${current.text}`}>
          {subtitle}
        </span>
      </div>

      <div className="mt-8 flex items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            {title}
          </p>

          <p className={`mt-3 text-6xl font-black leading-none ${current.text}`}>
            {Math.round(value)}
            <span className="text-3xl opacity-50">%</span>
          </p>
        </div>

        <div
          className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-full sm:flex"
          style={{
            background: `conic-gradient(${current.ring} ${value * 3.6}deg, rgba(15,23,42,0.9) 0deg)`,
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#020617] text-sm font-black text-white">
            {Math.round(value)}%
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "slate" | "indigo" | "cyan" | "blue"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  }

  return (
    <div className={`rounded-2xl border p-5 text-center ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black text-white">
        {formatarNumero(value)}
      </p>
    </div>
  )
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
      <h3 className="mb-5 flex items-center gap-3 border-b border-slate-800 pb-5 text-xl font-black text-white">
        <span className="text-3xl">{icon}</span>
        {title}
      </h3>

      <div className="space-y-4">{children}</div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  breakValue = false,
  highlight = false,
}: {
  label: string
  value: React.ReactNode
  breakValue?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 pb-3 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-sm font-semibold text-slate-500">{label}</span>
      <span
        className={`text-right text-sm font-bold ${
          highlight ? "text-blue-300" : "text-slate-300"
        } ${breakValue ? "max-w-[70%] break-words" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}

function TraceItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function MethodCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-2xl">
        {icon}
      </div>
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}