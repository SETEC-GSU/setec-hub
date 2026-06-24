"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"
import {
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react"

type AvaliacaoField = {
  id?: string | number | null
  escola?: string | null
  data_visita?: string | null
  tecnico?: string | null
  nota_media?: string | number | null
  nome_responsavel?: string | null
  cargo_responsavel?: string | null
  escopo?: string | number | null
  organizacao?: string | number | null
  conhecimento?: string | number | null
  comunicacao?: string | number | null
  postura?: string | number | null
  satisfacao?: string | number | null
  uniformizado?: boolean | string | number | null
  cracha?: boolean | string | number | null
  apresentacao?: boolean | string | number | null
  elogios?: string | null
  sugestoes?: string | null
  reclamacoes?: string | null
  created_at?: string | null
}

type AbaAtiva = "visao-geral" | "historico"
type FiltroNota = "todas" | "excelencia" | "positivas" | "atencao" | "criticas"
type FiltroComentario = "todos" | "elogios" | "sugestoes" | "reclamacoes"
type OrdenacaoHistorico = "recentes" | "maior-nota" | "menor-nota" | "tecnico"

type MensagemTela = {
  tipo: "error" | "info"
  texto: string
} | null

type CriterioResumo = {
  chave: keyof Pick<
    AvaliacaoField,
    "escopo" | "organizacao" | "conhecimento" | "comunicacao" | "postura" | "satisfacao"
  >
  label: string
  media: number
  total: number
}

const CRITERIOS: Array<{
  chave: CriterioResumo["chave"]
  label: string
}> = [
  { chave: "escopo", label: "Escopo resolvido" },
  { chave: "organizacao", label: "Organização" },
  { chave: "conhecimento", label: "Conhecimento" },
  { chave: "comunicacao", label: "Comunicação" },
  { chave: "postura", label: "Postura profissional" },
  { chave: "satisfacao", label: "Satisfação geral" },
]

const LIMITE_INICIAL_HISTORICO = 12

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function numeroSeguro(value: unknown) {
  const numero = Number(value)
  return Number.isFinite(numero) ? numero : 0
}

function textoPreenchido(value: unknown) {
  return String(value ?? "").trim()
}

function booleanoSeguro(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1

  const normalizado = normalizarTexto(value)

  return ["sim", "true", "1", "yes", "ok", "x"].includes(normalizado)
}

function parseDataLocal(value?: string | null) {
  if (!value) return null

  const dataLimpa = String(value).trim()
  const somenteData = dataLimpa.includes("T") ? dataLimpa.split("T")[0] : dataLimpa
  const partes = somenteData.split("-").map(Number)

  if (partes.length === 3 && partes.every((item) => Number.isFinite(item))) {
    const [ano, mes, dia] = partes
    const data = new Date(ano, mes - 1, dia)

    if (!Number.isNaN(data.getTime())) return data
  }

  const data = new Date(dataLimpa)
  return Number.isNaN(data.getTime()) ? null : data
}

function formatarData(value?: string | null) {
  const data = parseDataLocal(value)

  if (!data) return "Não informada"

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatarDataLonga(value?: string | null) {
  const data = parseDataLocal(value)

  if (!data) return "Data não informada"

  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatarDataHora(value?: string | null) {
  if (!value) return "Não informado"

  const data = new Date(value)

  if (Number.isNaN(data.getTime())) return "Não informado"

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getInitials(nome?: string | null) {
  const partes = String(nome || "Técnico")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) return "TF"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

function getNotaTone(nota: number) {
  if (nota >= 4.5) {
    return {
      border: "border-emerald-500/25",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
      label: "Excelente",
    }
  }

  if (nota >= 4) {
    return {
      border: "border-blue-500/25",
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      dot: "bg-blue-400",
      label: "Positiva",
    }
  }

  if (nota >= 3) {
    return {
      border: "border-yellow-500/25",
      bg: "bg-yellow-500/10",
      text: "text-yellow-300",
      dot: "bg-yellow-400",
      label: "Atenção",
    }
  }

  return {
    border: "border-red-500/25",
    bg: "bg-red-500/10",
    text: "text-red-300",
    dot: "bg-red-400",
    label: "Crítica",
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Erro inesperado.")
  }

  return "Não foi possível carregar as avaliações."
}

function RenderStars({ nota, size = 14 }: { nota: number; size?: number }) {
  const notaSegura = numeroSeguro(nota)

  return (
    <div className="flex items-center gap-0.5" aria-label={`Nota ${notaSegura.toFixed(1)} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const value = notaSegura - index

        if (value >= 1) {
          return (
            <Star
              key={index}
              size={size}
              className="shrink-0 fill-yellow-400 text-yellow-400"
            />
          )
        }

        if (value >= 0.5) {
          return (
            <span
              key={index}
              className="relative block shrink-0"
              style={{ width: size, height: size }}
            >
              <Star
                size={size}
                className="absolute inset-0 text-slate-700"
              />
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                <Star
                  size={size}
                  className="fill-yellow-400 text-yellow-400"
                />
              </span>
            </span>
          )
        }

        return <Star key={index} size={size} className="shrink-0 text-slate-700" />
      })}
    </div>
  )
}

export default function AvaliacoesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoField[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<AvaliacaoField | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("visao-geral")
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null)

  const [busca, setBusca] = useState("")
  const [filtroTecnico, setFiltroTecnico] = useState("")
  const [filtroNota, setFiltroNota] = useState<FiltroNota>("todas")
  const [filtroComentario, setFiltroComentario] = useState<FiltroComentario>("todos")
  const [dataInicial, setDataInicial] = useState("")
  const [dataFinal, setDataFinal] = useState("")
  const [ordenacao, setOrdenacao] = useState<OrdenacaoHistorico>("recentes")
  const [limiteHistorico, setLimiteHistorico] = useState(LIMITE_INICIAL_HISTORICO)

  const carregarAvaliacoes = useCallback(
    async (modoAtualizacao = false) => {
      try {
        if (modoAtualizacao) {
          setAtualizando(true)
        } else {
          setLoading(true)
        }

        setMensagem(null)

        const { data, error } = await supabase
          .from("fields_avaliacoes")
          .select("*")
          .order("data_visita", { ascending: false })

        if (error) throw error

        setAvaliacoes((data || []) as AvaliacaoField[])
        setUltimaAtualizacao(new Date().toISOString())
      } catch (error) {
        console.error("Erro ao buscar avaliações:", error)
        setMensagem({
          tipo: "error",
          texto: getErrorMessage(error),
        })
      } finally {
        setLoading(false)
        setAtualizando(false)
      }
    },
    [supabase],
  )

  useEffect(() => {
    carregarAvaliacoes()
  }, [carregarAvaliacoes])

  useEffect(() => {
    if (!selectedAvaliacao) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedAvaliacao(null)
    }

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleEscape)

    return () => {
      document.body.style.overflow = overflowAnterior
      window.removeEventListener("keydown", handleEscape)
    }
  }, [selectedAvaliacao])

  const avaliacoesComNota = useMemo(
    () =>
      avaliacoes
        .map((avaliacao) => ({
          ...avaliacao,
          notaCalculada: numeroSeguro(avaliacao.nota_media),
        }))
        .filter((avaliacao) => avaliacao.notaCalculada > 0),
    [avaliacoes],
  )

  const totalAvaliacoes = avaliacoes.length
  const totalNotasValidas = avaliacoesComNota.length

  const mediaGeral = useMemo(() => {
    if (totalNotasValidas === 0) return 0

    const soma = avaliacoesComNota.reduce(
      (total, avaliacao) => total + avaliacao.notaCalculada,
      0,
    )

    return soma / totalNotasValidas
  }, [avaliacoesComNota, totalNotasValidas])

  const taxaExcelencia = useMemo(() => {
    if (totalNotasValidas === 0) return 0

    const excelentes = avaliacoesComNota.filter(
      (avaliacao) => avaliacao.notaCalculada >= 4.5,
    ).length

    return Math.round((excelentes / totalNotasValidas) * 100)
  }, [avaliacoesComNota, totalNotasValidas])

  const avaliacoesAtencao = useMemo(
    () =>
      avaliacoesComNota.filter((avaliacao) => avaliacao.notaCalculada < 4).length,
    [avaliacoesComNota],
  )

  const totalComentarios = useMemo(
    () =>
      avaliacoes.filter(
        (avaliacao) =>
          textoPreenchido(avaliacao.elogios) ||
          textoPreenchido(avaliacao.sugestoes) ||
          textoPreenchido(avaliacao.reclamacoes),
      ).length,
    [avaliacoes],
  )

  const distribuicao = useMemo(() => {
    const resultado: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    }

    avaliacoesComNota.forEach((avaliacao) => {
      const notaArredondada = Math.min(5, Math.max(1, Math.round(avaliacao.notaCalculada))) as
        | 1
        | 2
        | 3
        | 4
        | 5

      resultado[notaArredondada] += 1
    })

    return resultado
  }, [avaliacoesComNota])

  const faixaPredominante = useMemo(() => {
    const faixas = ([5, 4, 3, 2, 1] as const).map((nota) => ({
      nota,
      total: distribuicao[nota],
    }))

    const principal = faixas.sort(
      (a, b) => b.total - a.total || b.nota - a.nota,
    )[0]

    return {
      nota: principal?.nota || 0,
      total: principal?.total || 0,
      percentual:
        totalNotasValidas > 0
          ? Math.round(((principal?.total || 0) / totalNotasValidas) * 100)
          : 0,
    }
  }, [distribuicao, totalNotasValidas])

  const criteriosResumo = useMemo<CriterioResumo[]>(() => {
    return CRITERIOS.map((criterio) => {
      const notas = avaliacoes
        .map((avaliacao) => numeroSeguro(avaliacao[criterio.chave]))
        .filter((nota) => nota > 0)

      const media =
        notas.length > 0
          ? notas.reduce((total, nota) => total + nota, 0) / notas.length
          : 0

      return {
        chave: criterio.chave,
        label: criterio.label,
        media,
        total: notas.length,
      }
    })
  }, [avaliacoes])

  const melhorCriterio = useMemo(
    () => [...criteriosResumo].filter((item) => item.total > 0).sort((a, b) => b.media - a.media)[0],
    [criteriosResumo],
  )

  const criterioAtencao = useMemo(
    () => [...criteriosResumo].filter((item) => item.total > 0).sort((a, b) => a.media - b.media)[0],
    [criteriosResumo],
  )

  const rankingTecnicos = useMemo(() => {
    const mapa = new Map<string, { total: number; soma: number }>()

    avaliacoesComNota.forEach((avaliacao) => {
      const nome = textoPreenchido(avaliacao.tecnico)
      if (!nome) return

      const atual = mapa.get(nome) || { total: 0, soma: 0 }
      atual.total += 1
      atual.soma += avaliacao.notaCalculada
      mapa.set(nome, atual)
    })

    return Array.from(mapa.entries())
      .map(([nome, dados]) => ({
        nome,
        media: dados.soma / dados.total,
        avaliacoes: dados.total,
      }))
      .sort(
        (a, b) =>
          b.media - a.media ||
          b.avaliacoes - a.avaliacoes ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      )
      .slice(0, 5)
  }, [avaliacoesComNota])

  const tecnicosUnicos = useMemo(
    () =>
      Array.from(
        new Set(
          avaliacoes
            .map((avaliacao) => textoPreenchido(avaliacao.tecnico))
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [avaliacoes],
  )

  const escolasUnicas = useMemo(
    () =>
      new Set(
        avaliacoes
          .map((avaliacao) => textoPreenchido(avaliacao.escola))
          .filter(Boolean),
      ).size,
    [avaliacoes],
  )

  const avaliacoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca)
    const inicio = parseDataLocal(dataInicial)
    const fim = parseDataLocal(dataFinal)

    const filtradas = avaliacoes.filter((avaliacao) => {
      const nota = numeroSeguro(avaliacao.nota_media)
      const dataVisita = parseDataLocal(avaliacao.data_visita)

      const textoBusca = normalizarTexto(
        `${avaliacao.escola || ""} ${avaliacao.tecnico || ""} ${avaliacao.nome_responsavel || ""} ${avaliacao.cargo_responsavel || ""} ${avaliacao.elogios || ""} ${avaliacao.sugestoes || ""} ${avaliacao.reclamacoes || ""}`,
      )

      const matchBusca = termo ? textoBusca.includes(termo) : true
      const matchTecnico = filtroTecnico
        ? textoPreenchido(avaliacao.tecnico) === filtroTecnico
        : true

      const matchNota =
        filtroNota === "todas"
          ? true
          : filtroNota === "excelencia"
            ? nota >= 4.5
            : filtroNota === "positivas"
              ? nota >= 4 && nota < 4.5
              : filtroNota === "atencao"
                ? nota >= 3 && nota < 4
                : nota > 0 && nota < 3

      const matchComentario =
        filtroComentario === "todos"
          ? true
          : filtroComentario === "elogios"
            ? Boolean(textoPreenchido(avaliacao.elogios))
            : filtroComentario === "sugestoes"
              ? Boolean(textoPreenchido(avaliacao.sugestoes))
              : Boolean(textoPreenchido(avaliacao.reclamacoes))

      const matchDataInicial =
        inicio && dataVisita ? dataVisita.getTime() >= inicio.getTime() : !inicio
      const matchDataFinal =
        fim && dataVisita ? dataVisita.getTime() <= fim.getTime() : !fim

      return (
        matchBusca &&
        matchTecnico &&
        matchNota &&
        matchComentario &&
        matchDataInicial &&
        matchDataFinal
      )
    })

    return filtradas.sort((a, b) => {
      if (ordenacao === "maior-nota") {
        return numeroSeguro(b.nota_media) - numeroSeguro(a.nota_media)
      }

      if (ordenacao === "menor-nota") {
        return numeroSeguro(a.nota_media) - numeroSeguro(b.nota_media)
      }

      if (ordenacao === "tecnico") {
        return textoPreenchido(a.tecnico).localeCompare(
          textoPreenchido(b.tecnico),
          "pt-BR",
        )
      }

      const dataA = parseDataLocal(a.data_visita)?.getTime() || 0
      const dataB = parseDataLocal(b.data_visita)?.getTime() || 0
      return dataB - dataA
    })
  }, [
    avaliacoes,
    busca,
    dataFinal,
    dataInicial,
    filtroComentario,
    filtroNota,
    filtroTecnico,
    ordenacao,
  ])

  const filtrosAtivos = useMemo(() => {
    let total = 0
    if (busca.trim()) total += 1
    if (filtroTecnico) total += 1
    if (filtroNota !== "todas") total += 1
    if (filtroComentario !== "todos") total += 1
    if (dataInicial) total += 1
    if (dataFinal) total += 1
    if (ordenacao !== "recentes") total += 1
    return total
  }, [busca, dataFinal, dataInicial, filtroComentario, filtroNota, filtroTecnico, ordenacao])

  const avaliacoesVisiveis = avaliacoesFiltradas.slice(0, limiteHistorico)

  function limparFiltros() {
    setBusca("")
    setFiltroTecnico("")
    setFiltroNota("todas")
    setFiltroComentario("todos")
    setDataInicial("")
    setDataFinal("")
    setOrdenacao("recentes")
    setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
  }

  function mudarAba(aba: AbaAtiva) {
    setAbaAtiva(aba)
    if (aba === "historico") setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
  }

  if (loading) {
    return (
      <div className="flex min-h-[620px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-slate-800 bg-[#020617] px-10 py-8 shadow-2xl shadow-slate-950/30">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Carregando avaliações Field
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-[1650px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.10),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                <Star size={12} className="fill-blue-300/20" />
                Avaliações Field
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {totalAvaliacoes} feedbacks • {escolasUnicas} escolas
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Qualidade dos atendimentos
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Indicadores de satisfação das Unidades Escolares, desempenho técnico e pontos de atenção do atendimento presencial.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {ultimaAtualizacao && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                  Última atualização
                </p>
                <p className="mt-1 text-xs font-bold text-slate-300">
                  {formatarDataHora(ultimaAtualizacao)}
                </p>
              </div>
            )}

            <a
              href="https://forms.gle/WVVmFS31Eyuk8wEx7"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
            >
              <ExternalLink size={16} />
              Formulário de avaliação
            </a>

            <button
              type="button"
              onClick={() => carregarAvaliacoes(true)}
              disabled={atualizando}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={atualizando ? "animate-spin" : ""} />
              {atualizando ? "Atualizando" : "Atualizar"}
            </button>
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            mensagem.tipo === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          icon={<TrendingUp size={19} />}
          label="Média geral"
          value={mediaGeral.toFixed(1)}
          helper="de 5 pontos"
          tone="blue"
          extra={<RenderStars nota={mediaGeral} />}
        />

        <KpiCard
          icon={<MessageSquare size={19} />}
          label="Avaliações"
          value={totalAvaliacoes}
          helper={`${totalComentarios} com comentários`}
          tone="cyan"
        />

        <KpiCard
          icon={<Award size={19} />}
          label="Excelência"
          value={`${taxaExcelencia}%`}
          helper="notas iguais ou superiores a 4,5"
          tone="emerald"
          progress={taxaExcelencia}
        />

        <KpiCard
          icon={<AlertCircle size={19} />}
          label="Pontos de atenção"
          value={avaliacoesAtencao}
          helper="avaliações com nota abaixo de 4"
          tone={avaliacoesAtencao > 0 ? "yellow" : "slate"}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-800 bg-[#020617] p-4 shadow-xl shadow-slate-950/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex rounded-2xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => mudarAba("visao-geral")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition lg:flex-none ${
              abaAtiva === "visao-geral"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            <BarChart3 size={15} />
            Visão geral
          </button>

          <button
            type="button"
            onClick={() => mudarAba("historico")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition lg:flex-none ${
              abaAtiva === "historico"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/30"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            <MessageSquare size={15} />
            Histórico
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <CompactInfo label="Escolas" value={escolasUnicas} />
          <CompactInfo label="Técnicos" value={tecnicosUnicos.length} />
          <CompactInfo label="Comentários" value={totalComentarios} />
          <CompactInfo label="Notas válidas" value={totalNotasValidas} />
        </div>
      </section>

      {abaAtiva === "visao-geral" ? (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
            <Panel className="flex h-full flex-col">
              <SectionHeader
                icon={<Star size={18} />}
                eyebrow="Distribuição"
                title="Satisfação geral"
                description="Concentração das avaliações por faixa de nota."
              />

              <div className="mt-5 flex flex-1 flex-col">
                <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                      Nota média
                    </p>
                    <p className="mt-3 text-5xl font-black leading-none text-white">
                      {mediaGeral.toFixed(1)}
                    </p>
                    <div className="mt-3 flex justify-center">
                      <RenderStars nota={mediaGeral} size={16} />
                    </div>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {totalNotasValidas} nota(s) válida(s)
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((estrela) => {
                      const count = distribuicao[estrela as 1 | 2 | 3 | 4 | 5]
                      const percentual =
                        totalNotasValidas > 0 ? (count / totalNotasValidas) * 100 : 0

                      return (
                        <div
                          key={estrela}
                          className="grid grid-cols-[42px_minmax(0,1fr)_58px] items-center gap-3"
                        >
                          <div className="flex items-center gap-1 text-xs font-black text-slate-400">
                            {estrela}
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                estrela >= 4
                                  ? "bg-emerald-500"
                                  : estrela === 3
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${percentual}%` }}
                            />
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-black text-white">{count}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                              {percentual.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                        Faixa predominante
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {faixaPredominante.nota > 0
                          ? `${faixaPredominante.nota} estrelas`
                          : "Sem dados"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-500">
                        {faixaPredominante.total} avaliação(ões) • {faixaPredominante.percentual}% do total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
                      <Sparkles size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                        Índice de excelência
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {taxaExcelencia}%
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-500">
                        Notas iguais ou superiores a 4,5
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel className="h-full">
              <SectionHeader
                icon={<Award size={18} />}
                eyebrow="Desempenho"
                title="Ranking de técnicos"
                description="Ordenação por média e, em caso de empate, volume de avaliações."
              />

              <div className="mt-6 space-y-3">
                {rankingTecnicos.length === 0 ? (
                  <EmptyState
                    icon={<Users size={28} />}
                    title="Ranking ainda indisponível"
                    description="São necessárias avaliações válidas para calcular o desempenho."
                  />
                ) : (
                  rankingTecnicos.map((tecnico, index) => (
                    <div
                      key={tecnico.nome}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 transition hover:border-blue-500/25"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <RankingPosition position={index + 1} />

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-black text-blue-300">
                          {getInitials(tecnico.nome)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {tecnico.nome}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {tecnico.avaliacoes} avaliação(ões)
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xl font-black text-white">
                          {tecnico.media.toFixed(1)}
                        </p>
                        <RenderStars nota={tecnico.media} size={12} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>

          <Panel>
            <SectionHeader
              icon={<SlidersHorizontal size={18} />}
              eyebrow="Critérios"
              title="Leitura por dimensão avaliada"
              description="Médias consolidadas dos seis critérios usados no formulário de satisfação."
            />

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {criteriosResumo.map((criterio) => {
                  const percentual = Math.min(100, Math.max(0, (criterio.media / 5) * 100))
                  const tone = getNotaTone(criterio.media)

                  return (
                    <div
                      key={criterio.chave}
                      className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-white">{criterio.label}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {criterio.total} resposta(s)
                          </p>
                        </div>

                        <span className={`text-xl font-black ${tone.text}`}>
                          {criterio.media > 0 ? criterio.media.toFixed(1) : "—"}
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className={`h-full rounded-full ${tone.dot}`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3">
                <InsightBox
                  icon={<Sparkles size={18} />}
                  label="Maior destaque"
                  value={melhorCriterio?.label || "Sem dados"}
                  helper={
                    melhorCriterio
                      ? `Média ${melhorCriterio.media.toFixed(1)} de 5`
                      : "Aguardando respostas válidas"
                  }
                  tone="emerald"
                />

                <InsightBox
                  icon={<TrendingDown size={18} />}
                  label="Critério a acompanhar"
                  value={criterioAtencao?.label || "Sem dados"}
                  helper={
                    criterioAtencao
                      ? `Média ${criterioAtencao.media.toFixed(1)} de 5`
                      : "Aguardando respostas válidas"
                  }
                  tone={criterioAtencao && criterioAtencao.media < 4 ? "yellow" : "blue"}
                />

                <InsightBox
                  icon={<MessageSquare size={18} />}
                  label="Participação qualitativa"
                  value={`${totalComentarios} comentários`}
                  helper={`${totalAvaliacoes - totalComentarios} avaliação(ões) sem comentário textual`}
                  tone="blue"
                />
              </div>
            </div>
          </Panel>
        </section>
      ) : (
        <section className="space-y-5">
          <Panel>
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-start xl:justify-between">
              <SectionHeader
                icon={<Filter size={18} />}
                eyebrow="Consulta"
                title="Histórico de avaliações"
                description={`${avaliacoesFiltradas.length} registro(s) encontrado(s) com os filtros atuais.`}
              />

              {filtrosAtivos > 0 && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-xs font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20"
                >
                  <RotateCcw size={15} />
                  Limpar filtros ({filtrosAtivos})
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative md:col-span-2">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value)
                    setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
                  }}
                  placeholder="Buscar escola, técnico, responsável ou comentário..."
                  className="input-filter pl-11"
                />
              </label>

              <select
                value={filtroTecnico}
                onChange={(event) => {
                  setFiltroTecnico(event.target.value)
                  setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
                }}
                className="input-filter"
              >
                <option value="">Todos os técnicos</option>
                {tecnicosUnicos.map((tecnico) => (
                  <option key={tecnico} value={tecnico}>
                    {tecnico}
                  </option>
                ))}
              </select>

              <select
                value={ordenacao}
                onChange={(event) => setOrdenacao(event.target.value as OrdenacaoHistorico)}
                className="input-filter"
              >
                <option value="recentes">Mais recentes</option>
                <option value="maior-nota">Maior nota</option>
                <option value="menor-nota">Menor nota</option>
                <option value="tecnico">Nome do técnico</option>
              </select>

              <select
                value={filtroNota}
                onChange={(event) => {
                  setFiltroNota(event.target.value as FiltroNota)
                  setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
                }}
                className="input-filter"
              >
                <option value="todas">Todas as notas</option>
                <option value="excelencia">Excelência (4,5 a 5)</option>
                <option value="positivas">Positivas (4 a 4,4)</option>
                <option value="atencao">Atenção (3 a 3,9)</option>
                <option value="criticas">Críticas (abaixo de 3)</option>
              </select>

              <select
                value={filtroComentario}
                onChange={(event) => {
                  setFiltroComentario(event.target.value as FiltroComentario)
                  setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
                }}
                className="input-filter"
              >
                <option value="todos">Todos os comentários</option>
                <option value="elogios">Com elogio</option>
                <option value="sugestoes">Com sugestão</option>
                <option value="reclamacoes">Com reclamação</option>
              </select>

              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Data inicial
                </span>
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(event) => {
                    setDataInicial(event.target.value)
                    setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
                  }}
                  className="input-filter"
                  style={{ colorScheme: "dark" }}
                />
              </label>

              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Data final
                </span>
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(event) => {
                    setDataFinal(event.target.value)
                    setLimiteHistorico(LIMITE_INICIAL_HISTORICO)
                  }}
                  className="input-filter"
                  style={{ colorScheme: "dark" }}
                />
              </label>
            </div>
          </Panel>

          <div className="space-y-3">
            {avaliacoesVisiveis.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={<MessageSquare size={30} />}
                  title="Nenhuma avaliação encontrada"
                  description={
                    avaliacoes.length === 0
                      ? "Ainda não há feedbacks registrados na tabela fields_avaliacoes."
                      : "Ajuste ou limpe os filtros para ampliar os resultados."
                  }
                />
              </Panel>
            ) : (
              avaliacoesVisiveis.map((avaliacao, index) => {
                const nota = numeroSeguro(avaliacao.nota_media)
                const tone = getNotaTone(nota)
                const temElogio = Boolean(textoPreenchido(avaliacao.elogios))
                const temSugestao = Boolean(textoPreenchido(avaliacao.sugestoes))
                const temReclamacao = Boolean(textoPreenchido(avaliacao.reclamacoes))

                return (
                  <button
                    type="button"
                    key={String(avaliacao.id ?? `${avaliacao.data_visita}-${avaliacao.tecnico}-${index}`)}
                    onClick={() => setSelectedAvaliacao(avaliacao)}
                    className="group w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#020617] text-left shadow-lg shadow-slate-950/10 transition hover:border-blue-500/30 hover:bg-slate-950/70"
                  >
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_150px] md:items-center md:p-5">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${tone.border} ${tone.bg} ${tone.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            {tone.label}
                          </span>

                          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {formatarData(avaliacao.data_visita)}
                          </span>
                        </div>

                        <p className="truncate text-base font-black text-white transition group-hover:text-blue-300">
                          {textoPreenchido(avaliacao.escola) || "Escola não informada"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Users size={13} />
                            {textoPreenchido(avaliacao.tecnico) || "Técnico não informado"}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <User size={13} />
                            {textoPreenchido(avaliacao.nome_responsavel) || "Responsável não informado"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-center">
                        {temElogio && (
                          <CommentBadge
                            icon={<ThumbsUp size={11} />}
                            label="Elogio"
                            tone="emerald"
                          />
                        )}
                        {temSugestao && (
                          <CommentBadge
                            icon={<Lightbulb size={11} />}
                            label="Sugestão"
                            tone="yellow"
                          />
                        )}
                        {temReclamacao && (
                          <CommentBadge
                            icon={<AlertCircle size={11} />}
                            label="Reclamação"
                            tone="red"
                          />
                        )}
                        {!temElogio && !temSugestao && !temReclamacao && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                            Sem comentário textual
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 md:justify-end">
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-black text-white">{nota.toFixed(1)}</p>
                          <RenderStars nota={nota} size={12} />
                        </div>

                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-500 transition group-hover:border-blue-500/30 group-hover:text-blue-300">
                          <ChevronRight size={17} />
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {avaliacoesFiltradas.length > limiteHistorico && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setLimiteHistorico((atual) => atual + LIMITE_INICIAL_HISTORICO)}
                className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
              >
                Mostrar mais avaliações
              </button>
            </div>
          )}
        </section>
      )}

      {selectedAvaliacao && (
        <AvaliacaoModal
          avaliacao={selectedAvaliacao}
          onClose={() => setSelectedAvaliacao(null)}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.35);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(51, 65, 85, 0.95);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(71, 85, 105, 1);
        }

        .input-filter {
          width: 100%;
          min-height: 48px;
          border-radius: 1rem;
          border: 1px solid rgb(51 65 85);
          background: rgba(15, 23, 42, 0.82);
          padding: 0.75rem 1rem;
          color: rgb(226 232 240);
          font-size: 0.875rem;
          font-weight: 600;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .input-filter:focus {
          border-color: rgba(59, 130, 246, 0.8);
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.45);
        }
      `}</style>
    </div>
  )
}

function AvaliacaoModal({
  avaliacao,
  onClose,
}: {
  avaliacao: AvaliacaoField
  onClose: () => void
}) {
  const nota = numeroSeguro(avaliacao.nota_media)
  const tone = getNotaTone(nota)

  const criterios = CRITERIOS.map((criterio) => ({
    ...criterio,
    valor: numeroSeguro(avaliacao[criterio.chave]),
  }))

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-3 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#020617] shadow-2xl shadow-slate-950/80">
        <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.10),transparent_30%)]" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${tone.border} ${tone.bg} ${tone.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                  {tone.label}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Avaliação Field
                </span>
              </div>

              <h2 className="break-words text-2xl font-black tracking-tight text-white sm:text-4xl">
                {textoPreenchido(avaliacao.escola) || "Escola não informada"}
              </h2>

              <p className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Calendar size={13} />
                {formatarDataLonga(avaliacao.data_visita)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-300"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div
              className={`rounded-3xl border p-5 ${tone.border} ${tone.bg}`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest ${tone.text}`}>
                Média do atendimento
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-black leading-none text-white">
                  {nota.toFixed(1)}
                </span>
                <span className="mb-1 text-sm font-bold text-slate-500">/ 5</span>
              </div>

              <div className="mt-4">
                <RenderStars nota={nota} size={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ModalInfoBox
                icon={<User size={16} />}
                label="Preenchido por"
                value={textoPreenchido(avaliacao.nome_responsavel) || "Não informado"}
                helper={textoPreenchido(avaliacao.cargo_responsavel) || "Cargo não informado"}
              />

              <ModalInfoBox
                icon={<Users size={16} />}
                label="Técnico avaliado"
                value={textoPreenchido(avaliacao.tecnico) || "Não informado"}
                helper={`Visita em ${formatarData(avaliacao.data_visita)}`}
              />
            </div>
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  Critérios avaliados
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  Desempenho por dimensão
                </h3>
              </div>

              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                Escala de 1 a 5
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {criterios.map((criterio) => {
                const criterioTone = getNotaTone(criterio.valor)

                return (
                  <div
                    key={criterio.chave}
                    className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        {criterio.label}
                      </p>
                      <span className={`text-lg font-black ${criterioTone.text}`}>
                        {criterio.valor > 0 ? criterio.valor.toFixed(1) : "—"}
                      </span>
                    </div>

                    <div className="mt-3">
                      <RenderStars nota={criterio.valor} size={12} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Identificação e apresentação
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CheckCard label="Uniformizado" checked={booleanoSeguro(avaliacao.uniformizado)} />
              <CheckCard label="Com crachá" checked={booleanoSeguro(avaliacao.cracha)} />
              <CheckCard label="Apresentou-se" checked={booleanoSeguro(avaliacao.apresentacao)} />
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            {textoPreenchido(avaliacao.elogios) && (
              <CommentBox
                icon={<ThumbsUp size={15} />}
                title="Elogio registrado"
                text={textoPreenchido(avaliacao.elogios)}
                tone="emerald"
              />
            )}

            {textoPreenchido(avaliacao.sugestoes) && (
              <CommentBox
                icon={<Lightbulb size={15} />}
                title="Sugestão registrada"
                text={textoPreenchido(avaliacao.sugestoes)}
                tone="yellow"
              />
            )}

            {textoPreenchido(avaliacao.reclamacoes) && (
              <CommentBox
                icon={<AlertCircle size={15} />}
                title="Reclamação registrada"
                text={textoPreenchido(avaliacao.reclamacoes)}
                tone="red"
              />
            )}

            {!textoPreenchido(avaliacao.elogios) &&
              !textoPreenchido(avaliacao.sugestoes) &&
              !textoPreenchido(avaliacao.reclamacoes) && (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                  <MessageSquare size={24} className="mx-auto text-slate-700" />
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    A unidade não registrou comentários textuais.
                  </p>
                </div>
              )}
          </section>

          {avaliacao.created_at && (
            <div className="flex items-center gap-2 border-t border-slate-800 pt-5 text-xs font-medium text-slate-600">
              <Clock3 size={14} />
              Registro recebido em {formatarDataHora(avaliacao.created_at)}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Fechar detalhes
          </button>
        </div>
      </div>
    </div>
  )
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      {children}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  tone,
  extra,
  progress,
}: {
  icon: ReactNode
  label: string
  value: string | number
  helper: string
  tone: "blue" | "cyan" | "emerald" | "yellow" | "slate"
  extra?: ReactNode
  progress?: number
}) {
  const styles = {
    blue: "border-blue-500/20 bg-blue-500/[0.07] text-blue-300",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.07] text-cyan-300",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/[0.07] text-yellow-300",
    slate: "border-slate-800 bg-[#020617] text-slate-400",
  }

  const progressStyles = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-500",
    slate: "bg-slate-600",
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg sm:p-5 ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-85">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black leading-none text-white sm:text-4xl">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-current/10">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex min-h-[28px] flex-col justify-end gap-2">
        {extra}
        <p className="text-[10px] font-bold leading-relaxed text-slate-500 sm:text-xs">
          {helper}
        </p>
      </div>

      {typeof progress === "number" && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-900">
          <div
            className={`h-full rounded-full ${progressStyles[tone]}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function CompactInfo({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function RankingPosition({ position }: { position: number }) {
  const styles =
    position === 1
      ? "border-yellow-500/30 bg-yellow-500/15 text-yellow-300"
      : position === 2
        ? "border-slate-400/30 bg-slate-400/10 text-slate-300"
        : position === 3
          ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
          : "border-slate-700 bg-slate-900 text-slate-500"

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${styles}`}>
      {position}º
    </div>
  )
}

function InsightBox({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  helper: string
  tone: "emerald" | "yellow" | "blue"
}) {
  const styles = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/[0.07] text-yellow-300",
    blue: "border-blue-500/20 bg-blue-500/[0.07] text-blue-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-base font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{helper}</p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-700">
        {icon}
      </div>
      <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-300">
        {title}
      </p>
      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function CommentBadge({
  icon,
  label,
  tone,
}: {
  icon: ReactNode
  label: string
  tone: "emerald" | "yellow" | "red"
}) {
  const styles = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${styles[tone]}`}>
      {icon}
      {label}
    </span>
  )
}

function ModalInfoBox({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
        {icon}
        {label}
      </p>
      <p className="mt-3 break-words text-sm font-black text-white">{value}</p>
      <p className="mt-1 break-words text-xs font-medium text-slate-500">{helper}</p>
    </div>
  )
}

function CheckCard({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 ${
        checked
          ? "border-emerald-500/20 bg-emerald-500/[0.07]"
          : "border-red-500/15 bg-red-500/[0.04]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
          checked
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/20 bg-red-500/10 text-red-300"
        }`}
      >
        {checked ? <CheckCircle2 size={19} /> : <X size={18} />}
      </div>

      <div>
        <p className="text-sm font-black text-white">{label}</p>
        <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${checked ? "text-emerald-400" : "text-red-400"}`}>
          {checked ? "Sim" : "Não"}
        </p>
      </div>
    </div>
  )
}

function CommentBox({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode
  title: string
  text: string
  tone: "emerald" | "yellow" | "red"
}) {
  const styles = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/[0.06] text-yellow-300",
    red: "border-red-500/20 bg-red-500/[0.06] text-red-300",
  }

  return (
    <div className={`rounded-2xl border p-5 ${styles[tone]}`}>
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
        {icon}
        {title}
      </p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-300">
        “{text}”
      </p>
    </div>
  )
}
