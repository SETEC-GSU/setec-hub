"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDateLocal(dateStr: string | null) {
  if (!dateStr) return null
  const value = String(dateStr).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-")
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function calcBusinessDays(startStr: string | null, endStr: string | null): number {
  if (!startStr || !endStr) return 0

  const start = parseDateLocal(startStr)
  const end = parseDateLocal(endStr)

  if (!start || !end || start > end) return 0

  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count += 1
    current.setDate(current.getDate() + 1)
  }

  return count
}

function formatarDataBR(dateStr: string | null) {
  if (!dateStr) return "N/A"

  const d = parseDateLocal(dateStr)

  if (!d) return "N/A"

  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function normalizarDataKey(dateStr: string | null) {
  if (!dateStr) return ""

  const value = String(dateStr).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  const data = new Date(value)

  if (Number.isNaN(data.getTime())) return ""

  return data.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function getHojeInput() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value || "").trim()
  return text || fallback
}

function ordenarTexto(a: unknown, b: unknown) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  })
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isStatusPendente(status: unknown) {
  const statusNormalizado = normalizarTexto(status)

  return (
    statusNormalizado === "" ||
    statusNormalizado === "pendente" ||
    statusNormalizado === "pendentes"
  )
}

function isStatusFinalizado(status: unknown) {
  const statusNormalizado = normalizarTexto(status)

  return (
    statusNormalizado === "realizada" ||
    statusNormalizado === "realizado" ||
    statusNormalizado === "finalizado" ||
    statusNormalizado === "finalizada" ||
    statusNormalizado === "concluido" ||
    statusNormalizado === "concluído"
  )
}

function dateToInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatarMesAno(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
}

function adicionarMes(date: Date, quantidade: number) {
  return new Date(date.getFullYear(), date.getMonth() + quantidade, 1)
}

function getDiasCalendario(mesReferencia: Date, dataSelecionada: string) {
  const ano = mesReferencia.getFullYear()
  const mes = mesReferencia.getMonth()

  const primeiroDiaMes = new Date(ano, mes, 1)
  const inicioCalendario = new Date(primeiroDiaMes)
  inicioCalendario.setDate(primeiroDiaMes.getDate() - primeiroDiaMes.getDay())

  const hoje = getHojeInput()

  return Array.from({ length: 42 }, (_, index) => {
    const data = new Date(inicioCalendario)
    data.setDate(inicioCalendario.getDate() + index)

    const iso = dateToInput(data)

    return {
      data,
      iso,
      dia: data.getDate(),
      pertenceAoMes: data.getMonth() === mes,
      selecionado: iso === dataSelecionada,
      hoje: iso === hoje,
      fimDeSemana: data.getDay() === 0 || data.getDay() === 6,
    }
  })
}

function formatarNumero(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString("pt-BR") : "0"
}

function getInitials(name: unknown) {
  const clean = textoSeguro(name, "")
  if (!clean) return "FT"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getStatusClasses(status: unknown) {
  if (isStatusFinalizado(status)) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
  }

  if (isStatusPendente(status)) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/25"
  }

  return "bg-slate-500/10 text-slate-400 border-slate-500/25"
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível carregar os dados da página."
}

const SafeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  const nome =
    typeof label === "object"
      ? payload[0]?.name || "Item"
      : String(label || "Item")

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#020617] p-4 shadow-2xl shadow-slate-950/50">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {nome}
      </p>
      <p className="text-2xl font-black text-white">{String(payload[0].value)}</p>
      <p className="mt-1 text-[11px] font-semibold text-blue-300">
        Atendimento(s)
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function FieldsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [todasEscolas, setTodasEscolas] = useState<any[]>([])
  const [tecnicosAtivos, setTecnicosAtivos] = useState<any[]>([])
  const [tecnicoFiltro, setTecnicoFiltro] = useState("Todos")
  const [loading, setLoading] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState("")

  const [buscaChamado, setBuscaChamado] = useState("")
  const [filtroMesTabela, setFiltroMesTabela] = useState("Todos")
  const [filtroEscolaTabela, setFiltroEscolaTabela] = useState("Todas")
  const [filtroTecnicoTabela, setFiltroTecnicoTabela] = useState("Todos")

  const [chamadoSelecionado, setChamadoSelecionado] = useState<any | null>(null)

  const [modalListaAberto, setModalListaAberto] = useState(false)
  const [dataLista, setDataLista] = useState(getHojeInput())
  const [mesCalendario, setMesCalendario] = useState<Date>(() => {
    return parseDateLocal(getHojeInput()) || new Date()
  })
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [gerandoLista, setGerandoLista] = useState(false)
  const [listaGerada, setListaGerada] = useState("")
  const [listaCopiada, setListaCopiada] = useState(false)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setErroCarregamento("")

    try {
      const [visitasResult, avaliacoesResult, escolasResult, tecnicosResult] =
        await Promise.all([
          supabase
            .from("fields_visitas")
            .select("*")
            .order("data_visita", { ascending: false }),
          supabase
            .from("fields_avaliacoes")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("escolas")
            .select("nome_escola")
            .order("nome_escola", { ascending: true }),
          supabase
            .from("tecnicos")
            .select("id, nome, ativo, created_at")
            .eq("ativo", true)
            .order("nome", { ascending: true }),
        ])

      if (visitasResult.error) throw visitasResult.error
      if (avaliacoesResult.error) throw avaliacoesResult.error
      if (escolasResult.error) throw escolasResult.error

      if (tecnicosResult.error) {
        console.warn("[Fields] Não foi possível carregar técnicos ativos:", tecnicosResult.error)
        setTecnicosAtivos([])
      } else {
        setTecnicosAtivos(tecnicosResult.data || [])
      }

      setVisitas(visitasResult.data || [])
      setAvaliacoes(avaliacoesResult.data || [])
      setTodasEscolas(escolasResult.data || [])
    } catch (error) {
      console.error("[Fields] Erro ao carregar dados:", error)
      setErroCarregamento(getErrorMessage(error))
      setVisitas([])
      setAvaliacoes([])
      setTodasEscolas([])
      setTecnicosAtivos([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const tecnicosAtivosSet = useMemo(() => {
    return new Set(
      tecnicosAtivos
        .map((tecnico) => normalizarTexto(tecnico.nome))
        .filter(Boolean)
    )
  }, [tecnicosAtivos])

  const stats = useMemo(() => {
    const filtradas = (
      tecnicoFiltro === "Todos"
        ? visitas
        : visitas.filter((v) => v.tecnico === tecnicoFiltro)
    ).sort((a, b) => {
      const dataA = normalizarDataKey(a.data_visita || a.data_prevista || a.data_abertura)
      const dataB = normalizarDataKey(b.data_visita || b.data_prevista || b.data_abertura)

      if (dataA !== dataB) return dataB.localeCompare(dataA)

      const codA = String(a.chamado || "")
      const codB = String(b.chamado || "")
      return codB.localeCompare(codA, undefined, { numeric: true })
    })

    const avalFiltradas =
      tecnicoFiltro === "Todos"
        ? avaliacoes
        : avaliacoes.filter((a) => a.tecnico === tecnicoFiltro)

    const visitasComFinalizacao = filtradas.filter(
      (v) => v.data_visita && v.data_finalizacao
    )

    const somaDiasUteis = visitasComFinalizacao.reduce(
      (acc, v) => acc + calcBusinessDays(v.data_visita, v.data_finalizacao),
      0
    )

    const slaMedio =
      visitasComFinalizacao.length > 0
        ? (somaDiasUteis / visitasComFinalizacao.length).toFixed(1)
        : "0"

    const mediaAval = avalFiltradas.length
      ? (
          avalFiltradas.reduce(
            (acc, a) => acc + Number(a.nota_media || 0),
            0
          ) / avalFiltradas.length
        ).toFixed(1)
      : "0.0"

    const tecnicosHistorico = [...new Set(visitas.map((v) => v.tecnico))]
      .filter(Boolean)
      .map((t) => {
        const nome = String(t)
        const vTec = visitas.filter((v) => v.tecnico === nome)
        const aTec = avaliacoes.filter((a) => a.tecnico === nome)
        const media = aTec.length
          ? aTec.reduce((acc, a) => acc + Number(a.nota_media || 0), 0) / aTec.length
          : 0

        return {
          nome,
          total: vTec.length,
          media: media.toFixed(1),
          ativo: tecnicosAtivosSet.has(normalizarTexto(nome)),
        }
      })
      .sort((a, b) => b.total - a.total || ordenarTexto(a.nome, b.nome))

    const tecnicosAtivosSemAtendimento = tecnicosAtivos
      .map((item) => textoSeguro(item.nome, ""))
      .filter(Boolean)
      .filter((nome) => !visitas.some((v) => normalizarTexto(v.tecnico) === normalizarTexto(nome)))
      .sort(ordenarTexto)

    const rankingEscolas = Object.entries(
      filtradas.reduce((acc: any, v) => {
        if (v.escola) acc[v.escola] = (acc[v.escola] || 0) + 1
        return acc
      }, {})
    ).sort((a: any, b: any) => b[1] - a[1] || ordenarTexto(a[0], b[0]))

    const mesesMap: Record<string, { name: string; value: number; key: string }> = {}

    filtradas.forEach((v) => {
      if (!v.data_visita) return

      const data = parseDateLocal(v.data_visita)

      if (data) {
        const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
        const mesAno = data
          .toLocaleDateString("pt-BR", { month: "short" })
          .replace(".", "")
          .toUpperCase()

        mesesMap[key] = {
          key,
          name: mesAno,
          value: (mesesMap[key]?.value || 0) + 1,
        }
      }
    })

    const graficoMes = Object.values(mesesMap).sort((a, b) =>
      a.key.localeCompare(b.key)
    )

    const escolasAtendidasSet = new Set(
      filtradas
        .map((v) => v.escola)
        .filter((escola) => {
          if (!escola) return false
          return !String(escola).toUpperCase().includes("URE GUARULHOS SUL")
        })
    )

    const coberturaEscolas = escolasAtendidasSet.size

    const escolasValidasRede = todasEscolas.filter(
      (e) =>
        e.nome_escola &&
        !String(e.nome_escola).toUpperCase().includes("URE GUARULHOS SUL")
    )

    const totalEscolasRede =
      escolasValidasRede.length > 0 ? escolasValidasRede.length : 82

    const escolasNaoAtendidas = escolasValidasRede
      .filter((e) => !escolasAtendidasSet.has(e.nome_escola))
      .map((e) => e.nome_escola)
      .sort(ordenarTexto)

    const pendentes = filtradas.filter((v) => isStatusPendente(v.status)).length
    const finalizados = filtradas.filter((v) => isStatusFinalizado(v.status)).length

    const taxaConclusao =
      filtradas.length > 0 ? Math.round((finalizados / filtradas.length) * 100) : 0

    const coberturaPercentual =
      totalEscolasRede > 0 ? Math.round((coberturaEscolas / totalEscolasRede) * 100) : 0

    const tecnicoMaisAcionado = tecnicosHistorico[0] || null
    const escolaMaisAcionada = rankingEscolas[0] || null

    return {
      filtradas,
      totalVisitas: filtradas.length,
      tecnicosAtivos: tecnicosAtivos.length,
      tecnicosHistorico,
      tecnicosAtivosSemAtendimento,
      slaMedio,
      mediaAval,
      rankingTecnicos: tecnicosHistorico,
      rankingEscolas,
      graficoMes,
      coberturaEscolas,
      totalEscolasRede,
      escolasNaoAtendidas,
      pendentes,
      finalizados,
      taxaConclusao,
      coberturaPercentual,
      tecnicoMaisAcionado,
      escolaMaisAcionada,
    }
  }, [visitas, avaliacoes, tecnicoFiltro, todasEscolas, tecnicosAtivos, tecnicosAtivosSet])

  const tecnicosParaFiltro = useMemo(() => {
    const nomesHistorico = stats.rankingTecnicos.map((item) => item.nome)
    const nomesAtivos = tecnicosAtivos.map((item) => textoSeguro(item.nome, "")).filter(Boolean)

    return Array.from(new Set([...nomesAtivos, ...nomesHistorico])).sort((a, b) => {
      const aAtivo = tecnicosAtivosSet.has(normalizarTexto(a))
      const bAtivo = tecnicosAtivosSet.has(normalizarTexto(b))

      if (aAtivo !== bAtivo) return aAtivo ? -1 : 1

      return ordenarTexto(a, b)
    })
  }, [stats.rankingTecnicos, tecnicosAtivos, tecnicosAtivosSet])

  const chamadosTabela = useMemo(() => {
    return stats.filtradas.filter((v) => {
      const matchEscola =
        filtroEscolaTabela === "Todas" || v.escola === filtroEscolaTabela

      const matchTecnico =
        filtroTecnicoTabela === "Todos" || v.tecnico === filtroTecnicoTabela

      const termo = normalizarTexto(buscaChamado)

      const matchBusca =
        termo === "" ||
        [
          v.chamado,
          v.escola,
          v.status,
          v.categoria,
          v.subcategoria,
          v.tecnico,
          v.abertura_por,
        ]
          .map(normalizarTexto)
          .join(" ")
          .includes(termo)

      let matchMes = true

      if (filtroMesTabela !== "Todos") {
        if (!v.data_visita) {
          matchMes = false
        } else {
          const data = parseDateLocal(v.data_visita)

          if (data) {
            const mesAno = data
              .toLocaleDateString("pt-BR", { month: "short" })
              .replace(".", "")
              .toUpperCase()

            matchMes = mesAno === filtroMesTabela
          } else {
            matchMes = false
          }
        }
      }

      return matchEscola && matchTecnico && matchBusca && matchMes
    })
  }, [
    stats.filtradas,
    filtroEscolaTabela,
    filtroTecnicoTabela,
    filtroMesTabela,
    buscaChamado,
  ])

  const chamadosPrevistosParaData = useMemo(() => {
    return visitas
      .filter((v) => normalizarDataKey(v.data_prevista) === dataLista)
      .filter((v) => isStatusPendente(v.status))
      .sort((a, b) => {
        const tecnicoCompare = ordenarTexto(a.tecnico, b.tecnico)
        if (tecnicoCompare !== 0) return tecnicoCompare

        const escolaCompare = ordenarTexto(a.escola, b.escola)
        if (escolaCompare !== 0) return escolaCompare

        return ordenarTexto(a.chamado, b.chamado)
      })
  }, [visitas, dataLista])

  const tecnicosNaLista = useMemo(() => {
    return [
      ...new Set(
        chamadosPrevistosParaData.map((item) =>
          textoSeguro(item.tecnico, "Técnico não atribuído")
        )
      ),
    ]
  }, [chamadosPrevistosParaData])

  const escolasNaLista = useMemo(() => {
    return [
      ...new Set(
        chamadosPrevistosParaData.map((item) =>
          textoSeguro(item.escola, "Escola não informada")
        )
      ),
    ]
  }, [chamadosPrevistosParaData])

  const diasCalendario = useMemo(() => {
    return getDiasCalendario(mesCalendario, dataLista)
  }, [mesCalendario, dataLista])

  function selecionarDataCalendario(iso: string) {
    const novaData = parseDateLocal(iso)

    setDataLista(iso)
    setListaGerada("")
    setListaCopiada(false)
    setCalendarioAberto(false)

    if (novaData) {
      setMesCalendario(new Date(novaData.getFullYear(), novaData.getMonth(), 1))
    }
  }

  function abrirCalendarioLista() {
    const dataAtual = parseDateLocal(dataLista)

    if (dataAtual) {
      setMesCalendario(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1))
    }

    setCalendarioAberto(true)
  }

  function montarListaChamados(dataSelecionada: string) {
    const chamadosDoDia = visitas
      .filter((v) => normalizarDataKey(v.data_prevista) === dataSelecionada)
      .filter((v) => isStatusPendente(v.status))
      .sort((a, b) => {
        const tecnicoCompare = ordenarTexto(a.tecnico, b.tecnico)
        if (tecnicoCompare !== 0) return tecnicoCompare

        const escolaCompare = ordenarTexto(a.escola, b.escola)
        if (escolaCompare !== 0) return escolaCompare

        return ordenarTexto(a.chamado, b.chamado)
      })

    const dataFormatada = formatarDataBR(dataSelecionada)

    if (chamadosDoDia.length === 0) {
      return [
        `*CHAMADOS PENDENTES PARA ATENDIMENTO — ${dataFormatada}*`,
        "",
        "Prezados(as), boa tarde.",
        "",
        `Não foram localizados chamados pendentes com data prevista para atendimento no dia *${dataFormatada}*.`,
        "",
        "Atenciosamente,",
        "*SETEC/SEINTEC — URE Guarulhos Sul*",
      ].join("\n")
    }

    const grupos = new Map<string, any[]>()

    chamadosDoDia.forEach((chamado) => {
      const tecnico = textoSeguro(chamado.tecnico, "Técnico não atribuído")

      if (!grupos.has(tecnico)) {
        grupos.set(tecnico, [])
      }

      grupos.get(tecnico)?.push(chamado)
    })

    const linhas: string[] = [
      `*CHAMADOS PENDENTES PARA ATENDIMENTO — ${dataFormatada}*`,
      "",
      "Prezados(as), boa tarde.",
      "",
      `Seguem chamados pendentes previstos para atendimento no dia *${dataFormatada}*:`,
      "",
      `*Total de chamados pendentes:* ${chamadosDoDia.length}`,
      `*Total de técnico(s):* ${grupos.size}`,
      "",
    ]

    Array.from(grupos.entries()).forEach(([tecnico, chamados], grupoIndex) => {
      linhas.push(`*${grupoIndex + 1}. Técnico: ${tecnico}*`)

      chamados.forEach((item, index) => {
        linhas.push(
          "",
          `${index + 1}) *Chamado:* ${textoSeguro(item.chamado, "N/A")}`,
          `   *Escola:* ${textoSeguro(item.escola, "Não informada")}`,
          `   *Categoria:* ${textoSeguro(item.categoria, "Não informada")}`,
          `   *Subcategoria:* ${textoSeguro(item.subcategoria, "Não informada")}`
        )
      })

      linhas.push("")
    })

    linhas.push(
      "Solicitamos a gentileza de verificarem os atendimentos previstos e manterem os registros devidamente atualizados após a visita.",
      "",
      "Atenciosamente,",
      "*SETEC/SEINTEC — URE Guarulhos Sul*"
    )

    return linhas.join("\n")
  }

  async function gerarListaChamados() {
    if (!dataLista) return

    setGerandoLista(true)
    setListaGerada("")
    setListaCopiada(false)

    await new Promise((resolve) => window.setTimeout(resolve, 450))

    const texto = montarListaChamados(dataLista)

    setListaGerada(texto)
    setGerandoLista(false)
  }

  async function copiarLista() {
    if (!listaGerada) return

    try {
      await navigator.clipboard.writeText(listaGerada)
      setListaCopiada(true)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = listaGerada
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
      setListaCopiada(true)
    }

    window.setTimeout(() => {
      setListaCopiada(false)
    }, 2500)
  }

  function abrirModalLista() {
    setModalListaAberto(true)
    setCalendarioAberto(false)
    setListaGerada("")
    setListaCopiada(false)

    const dataAtual = parseDateLocal(dataLista)

    if (dataAtual) {
      setMesCalendario(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1))
    }
  }

  function fecharModalLista() {
    setModalListaAberto(false)
    setCalendarioAberto(false)
    setGerandoLista(false)
    setListaGerada("")
    setListaCopiada(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-[#0B1120]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Carregando painel dos Fields
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_32%)]" />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_520px] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                Fields
              </Badge>
              <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                Atendimento em campo
              </Badge>
              <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                Técnicos ativos preservados
              </Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Visão Geral dos{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                Fields
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Painel operacional para acompanhar chamados, cobertura das escolas,
              produtividade dos técnicos, SLA útil e pendências previstas para atendimento.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={abrirModalLista}
                className="group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700"
              >
                <span className="text-lg">📋</span>
                Gerar lista diária
              </button>

              <button
                type="button"
                onClick={carregarDados}
                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
              >
                <span>↻</span>
                Atualizar painel
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Filtro geral por técnico
            </label>

            <select
              value={tecnicoFiltro}
              onChange={(e) => setTecnicoFiltro(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="Todos">👨‍🔧 Todos os técnicos do histórico</option>
              {tecnicosParaFiltro.map((nome) => {
                const ativo = tecnicosAtivosSet.has(normalizarTexto(nome))

                return (
                  <option key={nome} value={nome}>
                    {ativo ? "🟢" : "⚪"} {nome}
                    {ativo ? "" : " — histórico"}
                  </option>
                )
              })}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniPanelStat
                label="Ativos"
                value={stats.tecnicosAtivos}
                helper="Tabela técnicos"
                tone="emerald"
              />
              <MiniPanelStat
                label="Histórico"
                value={stats.rankingTecnicos.length}
                helper="Com chamados"
                tone="blue"
              />
            </div>
          </div>
        </div>
      </section>

      {erroCarregamento && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {erroCarregamento}
        </div>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          title="Chamados"
          value={stats.totalVisitas}
          subtitle="Volume no recorte"
          color="blue"
        />
        <KpiCard
          title="Técnicos"
          value={stats.tecnicosAtivos}
          subtitle="Ativos cadastrados"
          color="purple"
        />
        <KpiCard
          title="SLA útil"
          value={`${stats.slaMedio}d`}
          subtitle="Média conclusão"
          color="yellow"
        />
        <KpiCard
          title="Média aval."
          value={`${stats.mediaAval} ⭐`}
          subtitle="Feedback escolas"
          color="emerald"
        />
        <KpiCard
          title="Escolas"
          value={`${stats.coberturaEscolas}/${stats.totalEscolasRede}`}
          subtitle={`${stats.coberturaPercentual}% cobertura`}
          color="blue"
        />
      </section>

      {/* INSIGHTS */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <InsightCard
          icon="✅"
          title="Conclusão operacional"
          value={`${stats.taxaConclusao}%`}
          description={`${stats.finalizados} finalizado(s) e ${stats.pendentes} pendente(s) no recorte atual.`}
          tone="emerald"
        />

        <InsightCard
          icon="👨‍🔧"
          title="Técnico mais acionado"
          value={stats.tecnicoMaisAcionado?.nome || "Sem histórico"}
          description={
            stats.tecnicoMaisAcionado
              ? `${stats.tecnicoMaisAcionado.total} chamado(s) registrados no histórico.`
              : "Ainda não há chamados cadastrados."
          }
          tone="blue"
        />

        <InsightCard
          icon="🏫"
          title="Escola com maior demanda"
          value={stats.escolaMaisAcionada ? String(stats.escolaMaisAcionada[0]) : "Sem dados"}
          description={
            stats.escolaMaisAcionada
              ? `${stats.escolaMaisAcionada[1]} chamado(s) no recorte atual.`
              : "Ainda não há escolas com chamados registrados."
          }
          tone="red"
        />
      </section>

      {/* GRÁFICO + ALERTAS */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <Glass title="Volume de atendimentos mensais" subtitle="Evolução baseada na data de visita">
          <div className="mt-5 h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.graficoMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<SafeTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.035)" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Glass>

        <Glass title="Leitura rápida" subtitle="Pontos que merecem acompanhamento">
          <div className="space-y-3">
            <QuickNote
              icon="📌"
              title="Chamados previstos hoje"
              description={`${chamadosPrevistosParaData.length} chamado(s) pendente(s) com data prevista para ${formatarDataBR(dataLista)}.`}
              tone="blue"
            />

            <QuickNote
              icon="🟡"
              title="Escolas não contempladas"
              description={`${stats.escolasNaoAtendidas.length} escola(s) ainda não aparecem como atendidas no recorte atual.`}
              tone="yellow"
            />

            <QuickNote
              icon="🟢"
              title="Técnicos ativos sem histórico"
              description={`${stats.tecnicosAtivosSemAtendimento.length} técnico(s) ativo(s) ainda sem chamados registrados no histórico carregado.`}
              tone="emerald"
            />
          </div>
        </Glass>
      </section>

      {/* RANKINGS */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Glass title="Performance por técnico" subtitle="Histórico preservado, com indicação de ativo/inativo">
          <div className="custom-scrollbar mt-2 max-h-[420px] divide-y divide-slate-800/50 overflow-y-auto pr-2">
            {stats.rankingTecnicos.length === 0 ? (
              <EmptyState
                icon="👨‍🔧"
                title="Sem histórico de técnicos"
                description="Nenhum atendimento de field foi encontrado."
              />
            ) : (
              stats.rankingTecnicos.map((t, i) => (
                <Link
                  href={`/fields/tecnico/${encodeURIComponent(t.nome)}`}
                  key={t.nome}
                  className="group flex items-center justify-between gap-4 rounded-2xl px-3 py-4 transition hover:bg-slate-800/35"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
                        i === 0
                          ? "border border-yellow-500/30 bg-yellow-500/15 text-yellow-300"
                          : i === 1
                            ? "border border-slate-300/25 bg-slate-300/10 text-slate-300"
                            : i === 2
                              ? "border border-amber-700/30 bg-amber-700/15 text-amber-500"
                              : "border border-slate-700 bg-slate-900 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white transition group-hover:text-blue-300 sm:text-base">
                        {t.nome}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                            t.ativo
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          {t.ativo ? "Ativo" : "Histórico"}
                        </span>
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-300">
                          {t.total} chamado(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black text-blue-400">{t.media}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      Média
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Glass>

        <Glass title="Escolas com maior demanda" subtitle="Ranking de chamados por unidade">
          <div className="custom-scrollbar mt-2 max-h-[420px] divide-y divide-slate-800/50 overflow-y-auto pr-2">
            {stats.rankingEscolas.length === 0 ? (
              <EmptyState
                icon="🏫"
                title="Sem escolas no recorte"
                description="Aplique outro filtro ou verifique os registros."
              />
            ) : (
              stats.rankingEscolas.slice(0, 30).map((e: any, index) => (
                <div
                  key={String(e[0])}
                  className="flex items-center justify-between gap-4 rounded-2xl px-3 py-4 transition hover:bg-slate-800/25"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-[11px] font-black text-red-300">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-bold text-slate-200">
                      {e[0]}
                    </span>
                  </div>

                  <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-300">
                    {e[1]} chamados
                  </span>
                </div>
              ))
            )}
          </div>
        </Glass>

        <Glass title="Pendentes de cobertura" subtitle="Escolas ainda não contempladas no recorte">
          <div className="custom-scrollbar mt-2 max-h-[420px] divide-y divide-slate-800/50 overflow-y-auto pr-2">
            {stats.escolasNaoAtendidas.length === 0 ? (
              <EmptyState
                icon="🎉"
                title="Cobertura completa"
                description="Todas as escolas aparecem como atendidas no recorte atual."
                success
              />
            ) : (
              stats.escolasNaoAtendidas.map((escola: string) => (
                <div
                  key={escola}
                  className="flex items-center rounded-2xl px-3 py-4 transition hover:bg-slate-800/25"
                >
                  <span className="relative mr-4 h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400">
                    <span className="absolute -inset-1 animate-ping rounded-full bg-yellow-400 opacity-20" />
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-300">
                    {escola}
                  </span>
                </div>
              ))
            )}
          </div>
        </Glass>
      </section>

      {/* TABELA DE CHAMADOS */}
      <Glass
        title="Lista de chamados atendidos"
        subtitle={`${chamadosTabela.length} registro(s) encontrado(s). Exibindo até 100 para preservar desempenho.`}
      >
        <div className="mt-2 flex flex-col flex-wrap gap-3 md:flex-row">
          <div className="relative min-w-[220px] flex-1">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar chamado, escola, técnico..."
              value={buscaChamado}
              onChange={(e) => setBuscaChamado(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 pl-11 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <select
            value={filtroMesTabela}
            onChange={(e) => setFiltroMesTabela(e.target.value)}
            className="min-w-[170px] rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="Todos">📅 Todos os meses</option>
            {stats.graficoMes.map((m) => (
              <option key={m.name} value={String(m.name)}>
                {String(m.name)}
              </option>
            ))}
          </select>

          <select
            value={filtroEscolaTabela}
            onChange={(e) => setFiltroEscolaTabela(e.target.value)}
            className="min-w-[240px] rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 md:max-w-[340px]"
          >
            <option value="Todas">🏫 Todas as escolas</option>
            {[...new Set(stats.filtradas.map((v) => v.escola))]
              .filter(Boolean)
              .sort(ordenarTexto)
              .map((e) => (
                <option key={String(e)} value={String(e)}>
                  {String(e)}
                </option>
              ))}
          </select>

          <select
            value={filtroTecnicoTabela}
            onChange={(e) => setFiltroTecnicoTabela(e.target.value)}
            className="min-w-[220px] rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="Todos">👨‍🔧 Todos os técnicos</option>
            {tecnicosParaFiltro.map((t) => {
              const ativo = tecnicosAtivosSet.has(normalizarTexto(t))

              return (
                <option key={String(t)} value={String(t)}>
                  {ativo ? "🟢" : "⚪"} {String(t)}
                  {ativo ? "" : " — histórico"}
                </option>
              )
            })}
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-800">
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-4 py-4 font-black">Código</th>
                  <th className="px-4 py-4 font-black">Escola</th>
                  <th className="px-4 py-4 font-black">Status</th>
                  <th className="px-4 py-4 font-black">Categoria</th>
                  <th className="px-4 py-4 font-black">Descrição / Resolução</th>
                  <th className="px-4 py-4 font-black">Técnico</th>
                  <th className="px-4 py-4 font-black">Aberto por</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/50 text-sm">
                {chamadosTabela.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      Nenhum chamado encontrado com estes filtros.
                    </td>
                  </tr>
                ) : (
                  chamadosTabela.slice(0, 100).map((v: any) => (
                    <tr key={v.id} className="transition hover:bg-slate-800/20">
                      <td className="px-4 py-4 text-xs font-black text-blue-400">
                        <button
                          onClick={() => setChamadoSelecionado(v)}
                          className="cursor-pointer transition hover:text-cyan-300 hover:underline"
                          title="Ver detalhes completos"
                        >
                          {v.chamado || "N/A"}
                        </button>
                      </td>

                      <td className="max-w-[260px] px-4 py-4">
                        <p className="truncate font-black text-slate-100">
                          {v.escola || "N/A"}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Prevista: {formatarDataBR(v.data_prevista)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClasses(
                            v.status
                          )}`}
                        >
                          {v.status || "Pendente"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-200">
                            {v.categoria || "N/A"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600">
                            {v.subcategoria || "N/A"}
                          </span>
                        </div>
                      </td>

                      <td className="max-w-[320px] px-4 py-4 text-slate-400">
                        <div className="flex flex-col gap-1">
                          <span className="truncate text-xs italic">
                            “{v.descricao || "Sem descrição"}”
                          </span>
                          <span className="truncate text-[10px] font-bold text-blue-400/80">
                            R: {v.resolucao || "Sem resolução"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-[11px] font-black text-blue-300">
                            {getInitials(v.tecnico)}
                          </span>
                          <div>
                            <p className="font-black text-slate-100">
                              {v.tecnico || "Não atribuído"}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                              {tecnicosAtivosSet.has(normalizarTexto(v.tecnico))
                                ? "Ativo"
                                : "Histórico"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                        {v.abertura_por || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Glass>

      {/* MODAL GERADOR DE LISTA DE CHAMADOS */}
      {modalListaAberto && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl">
            <div className="relative overflow-hidden border-b border-slate-800 bg-[#020617] p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_30%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                      Lista diária
                    </Badge>
                    <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-300">
                      Somente pendentes
                    </Badge>
                    <Badge className="border-slate-700 bg-slate-900 text-slate-400">
                      WhatsApp
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                    Gerar lista de chamados dos Fields
                  </h2>

                  <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400">
                    Selecione a data prevista de atendimento para gerar uma lista organizada
                    por técnico, contendo apenas chamados pendentes.
                  </p>
                </div>

                <button
                  onClick={fecharModalLista}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xl font-black text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
                >
                  X
                </button>
              </div>
            </div>

            <div className="custom-scrollbar overflow-y-auto p-5 sm:p-8">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_1fr]">
                <div className="space-y-5">
                  <div className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Data prevista de atendimento
                    </p>

                    <button
                      type="button"
                      onClick={abrirCalendarioLista}
                      className="mt-3 flex w-full items-center justify-between rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-4 text-left transition hover:border-blue-400/50 hover:bg-blue-500/15"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                          Clique para selecionar
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">
                          {formatarDataBR(dataLista)}
                        </p>
                      </div>
                      <span className="text-3xl">📅</span>
                    </button>

                    {calendarioAberto && (
                      <div className="mt-5 rounded-[1.5rem] border border-slate-800 bg-slate-950 p-4 shadow-2xl animate-fade-in">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setMesCalendario((prev) => adicionarMes(prev, -1))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#020617] text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                          >
                            ‹
                          </button>

                          <p className="text-center text-sm font-black uppercase tracking-widest text-white">
                            {formatarMesAno(mesCalendario)}
                          </p>

                          <button
                            type="button"
                            onClick={() => setMesCalendario((prev) => adicionarMes(prev, 1))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#020617] text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                          >
                            ›
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center">
                          {["D", "S", "T", "Q", "Q", "S", "S"].map((dia, index) => (
                            <div
                              key={`${dia}-${index}`}
                              className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
                            >
                              {dia}
                            </div>
                          ))}

                          {diasCalendario.map((dia) => (
                            <button
                              key={dia.iso}
                              type="button"
                              onClick={() => selecionarDataCalendario(dia.iso)}
                              className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-bold transition ${
                                dia.selecionado
                                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                                  : dia.pertenceAoMes
                                    ? "bg-[#020617] text-slate-300 hover:bg-slate-800 hover:text-white"
                                    : "bg-transparent text-slate-700 hover:bg-slate-900"
                              } ${
                                dia.hoje && !dia.selecionado
                                  ? "ring-1 ring-cyan-500/40"
                                  : ""
                              } ${
                                dia.fimDeSemana && !dia.selecionado
                                  ? "text-slate-500"
                                  : ""
                              }`}
                            >
                              {dia.dia}
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => selecionarDataCalendario(getHojeInput())}
                            className="flex-1 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                          >
                            Hoje
                          </button>

                          <button
                            type="button"
                            onClick={() => setCalendarioAberto(false)}
                            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MiniPanelStat
                      label="Pendentes"
                      value={chamadosPrevistosParaData.length}
                      helper="Na data"
                      tone="yellow"
                    />

                    <MiniPanelStat
                      label="Técnicos"
                      value={tecnicosNaLista.length}
                      helper="Com demanda"
                      tone="blue"
                    />

                    <div className="col-span-2">
                      <MiniPanelStat
                        label="Escolas previstas"
                        value={escolasNaLista.length}
                        helper="Unidades diferentes"
                        tone="emerald"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={gerarListaChamados}
                    disabled={!dataLista || gerandoLista}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/40 transition hover:scale-[1.01] hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400"
                  >
                    {gerandoLista ? "Gerando lista..." : "Gerar lista para copiar"}
                  </button>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs font-semibold leading-relaxed text-slate-500">
                      A lista considera somente chamados com{" "}
                      <span className="font-black text-amber-300">status pendente</span>{" "}
                      e com{" "}
                      <span className="font-black text-blue-300">data prevista</span>{" "}
                      igual à data selecionada.
                    </p>
                  </div>
                </div>

                <div className="min-h-[500px] rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5">
                  {gerandoLista && (
                    <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-blue-500/25 bg-blue-500/10">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      </div>
                      <h3 className="text-2xl font-black text-white">
                        Gerando lista de chamados
                      </h3>
                      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                        Organizando os chamados pendentes por técnico, escola, categoria e subcategoria.
                      </p>
                    </div>
                  )}

                  {!gerandoLista && listaGerada && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Prévia da mensagem
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-400">
                            Lista para {formatarDataBR(dataLista)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={copiarLista}
                          className={`rounded-xl px-5 py-3 text-sm font-black uppercase tracking-widest transition ${
                            listaCopiada
                              ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {listaCopiada ? "Lista copiada!" : "Copiar lista"}
                        </button>
                      </div>

                      <textarea
                        value={listaGerada}
                        onChange={(e) => setListaGerada(e.target.value)}
                        rows={22}
                        className="custom-scrollbar w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-slate-200 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                      />

                      <p className="text-xs text-slate-500">
                        Você pode ajustar o texto manualmente antes de copiar, caso necessário.
                      </p>
                    </div>
                  )}

                  {!gerandoLista && !listaGerada && (
                    <div>
                      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Prévia dos chamados pendentes
                          </p>
                          <h3 className="mt-1 text-xl font-black text-white">
                            {formatarDataBR(dataLista)}
                          </h3>
                        </div>

                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                          {chamadosPrevistosParaData.length} chamado(s)
                        </span>
                      </div>

                      {chamadosPrevistosParaData.length === 0 ? (
                        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-3xl">
                            📭
                          </div>
                          <p className="text-lg font-black text-white">
                            Nenhum chamado pendente encontrado
                          </p>
                          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                            Selecione outra data ou verifique se os chamados possuem data prevista e status pendente.
                          </p>
                        </div>
                      ) : (
                        <div className="custom-scrollbar max-h-[500px] space-y-3 overflow-y-auto pr-2">
                          {chamadosPrevistosParaData.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-blue-500/30 hover:bg-slate-900"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-black text-blue-400">
                                      {textoSeguro(item.chamado, "N/A")}
                                    </p>
                                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
                                      Pendente
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-white">
                                    {textoSeguro(item.escola, "Escola não informada")}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {textoSeguro(item.categoria)} / {textoSeguro(item.subcategoria)}
                                  </p>
                                </div>

                                <div className="shrink-0 text-left md:text-right">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Técnico
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-slate-300">
                                    {textoSeguro(item.tecnico, "Não atribuído")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900 p-4 sm:flex-row sm:justify-end">
              <button
                onClick={fecharModalLista}
                className="rounded-xl bg-slate-800 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO CHAMADO */}
      {chamadoSelecionado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl shadow-slate-950/70">
            {/* HEADER FIXO */}
            <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 px-5 py-5 sm:px-7 sm:py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_34%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                      {chamadoSelecionado.categoria || "Geral"}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClasses(
                        chamadoSelecionado.status
                      )}`}
                    >
                      {chamadoSelecionado.status || "Pendente"}
                    </span>
                  </div>

                  <h2 className="break-words text-xl font-black leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl">
                    <span className="text-blue-400">
                      {chamadoSelecionado.chamado || "N/A"}
                    </span>{" "}
                    <span className="text-slate-300">•</span>{" "}
                    {chamadoSelecionado.escola || "Escola não informada"}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-slate-500 sm:text-sm">
                    <span>
                      Técnico atribuído:{" "}
                      <strong className="font-black text-slate-300">
                        {chamadoSelecionado.tecnico || "Não informado"}
                      </strong>
                    </span>

                    <span className="hidden text-slate-700 sm:inline">|</span>

                    <span>
                      Aberto por:{" "}
                      <strong className="font-black text-slate-300">
                        {chamadoSelecionado.abertura_por || "Não informado"}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setChamadoSelecionado(null)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xl font-black text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
                  aria-label="Fechar detalhes do chamado"
                >
                  X
                </button>
              </div>
            </div>

            {/* CONTEÚDO COM SCROLL ISOLADO */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <DetailCard
                    label="Data abertura"
                    value={formatarDataBR(chamadoSelecionado.data_abertura)}
                    tone="slate"
                  />

                  <DetailCard
                    label="Data prevista"
                    value={formatarDataBR(chamadoSelecionado.data_prevista)}
                    tone="yellow"
                  />

                  <DetailCard
                    label="Data visita"
                    value={formatarDataBR(chamadoSelecionado.data_visita)}
                    tone="blue"
                  />

                  <DetailCard
                    label="Finalização"
                    value={formatarDataBR(chamadoSelecionado.data_finalizacao)}
                    tone="emerald"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailCard
                    label="Urgência / Impacto"
                    value={`${chamadoSelecionado.urgencia || "N/A"} / ${
                      chamadoSelecionado.impacto || "N/A"
                    }`}
                    tone="slate"
                  />

                  <DetailCard
                    label="Subcategoria"
                    value={chamadoSelecionado.subcategoria || "N/A"}
                    tone="blue"
                  />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#020617] p-5 sm:p-6">
                  <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <span className="text-lg">📝</span>
                    Descrição do problema
                  </p>

                  <div className="rounded-2xl border border-slate-900 bg-slate-950/50 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                      {chamadoSelecionado.descricao ||
                        "Sem descrição detalhada registrada."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 sm:p-6">
                  <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-300">
                    <span className="text-lg">🛠️</span>
                    Resolução aplicada
                  </p>

                  <div className="rounded-2xl border border-blue-500/10 bg-[#020617]/70 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-blue-100/80">
                      {chamadoSelecionado.resolucao ||
                        "Sem resolução registrada para este chamado ainda."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER FIXO */}
            <div className="shrink-0 border-t border-slate-800 bg-slate-950/95 px-5 py-4 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-600">
                  Visualização detalhada do atendimento Field.
                </p>

                <button
                  type="button"
                  onClick={() => setChamadoSelecionado(null)}
                  className="rounded-2xl bg-slate-800 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                >
                  Fechar detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
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

        .animate-fade-in {
          animation: fadeIn 0.18s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* COMPONENTES                                                                */
/* -------------------------------------------------------------------------- */

function Glass({
  children,
  title,
  subtitle,
  className = "",
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {title && (
        <div className="mb-5 border-b border-slate-800 pb-5">
          <h3 className="text-lg font-black text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
          )}
        </div>
      )}

      {children}
    </div>
  )
}

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

function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string | number
  subtitle: string
  color: "blue" | "purple" | "yellow" | "emerald"
}) {
  const gradients = {
    blue: "from-blue-600/20 to-transparent border-blue-500/30",
    purple: "from-purple-600/20 to-transparent border-purple-500/30",
    yellow: "from-yellow-600/20 to-transparent border-yellow-500/30",
    emerald: "from-emerald-600/20 to-transparent border-emerald-500/30",
  }

  const textColors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  }

  const accent = {
    blue: "from-blue-500",
    purple: "from-purple-500",
    yellow: "from-yellow-500",
    emerald: "from-emerald-500",
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1.7rem] border bg-[#020617] bg-gradient-to-br p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:shadow-2xl md:p-6 ${gradients[color]}`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accent[color]} to-transparent opacity-70`}
      />

      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className="mb-2 text-3xl font-black text-white md:text-4xl">
        {value}
      </p>

      <p
        className={`inline-block rounded-lg bg-black/20 px-2 py-1 text-[11px] font-black uppercase tracking-tight ${textColors[color]}`}
      >
        {subtitle}
      </p>
    </div>
  )
}

function MiniPanelStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  tone: "blue" | "emerald" | "yellow"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-85">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{formatarNumero(value)}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{helper}</p>
    </div>
  )
}

function InsightCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: string
  title: string
  value: string | number
  description: string
  tone: "blue" | "emerald" | "red"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
  }

  return (
    <div className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${styles[tone]}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function QuickNote({
  icon,
  title,
  description,
  tone,
}: {
  icon: string
  title: string
  description: string
  tone: "blue" | "yellow" | "emerald"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${styles[tone]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  success = false,
}: {
  icon: string
  title: string
  description: string
  success?: boolean
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center">
      <div className="mb-4 text-4xl">{icon}</div>
      <p className={`text-sm font-black uppercase tracking-widest ${success ? "text-emerald-300" : "text-white"}`}>
        {title}
      </p>
      <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function DetailCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "slate" | "yellow" | "blue" | "emerald"
}) {
  const styles = {
    slate: "border-slate-800 bg-[#020617] text-slate-300",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="text-base font-black text-white sm:text-lg">{value}</p>
    </div>
  )
}