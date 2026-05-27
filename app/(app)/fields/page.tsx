"use client"

import { useEffect, useState, useMemo } from "react"
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
  const [y, m, d] = dateStr.split("-")
  return new Date(Number(y), Number(m) - 1, Number(d))
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
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
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

const SafeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const nome =
    typeof label === "object"
      ? payload[0]?.name || "Item"
      : String(label || "Item")

  return (
    <div className="bg-[#020617] border border-slate-800 p-3 rounded-xl shadow-2xl">
      <p className="text-slate-400 text-[10px] uppercase mb-1">{nome}</p>
      <p className="text-white text-lg font-bold">{String(payload[0].value)}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function FieldsPage() {
  const supabase = createClient()

  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [todasEscolas, setTodasEscolas] = useState<any[]>([])
  const [tecnicoFiltro, setTecnicoFiltro] = useState("Todos")
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    async function carregar() {
      const { data: vData } = await supabase.from("fields_visitas").select("*")
      const { data: aData } = await supabase.from("fields_avaliacoes").select("*")
      const { data: eData } = await supabase
        .from("escolas")
        .select("nome_escola")

      setVisitas(vData || [])
      setAvaliacoes(aData || [])
      setTodasEscolas(eData || [])
      setLoading(false)
    }

    carregar()
  }, [])

  const stats = useMemo(() => {
    const filtradas = (
      tecnicoFiltro === "Todos"
        ? visitas
        : visitas.filter((v) => v.tecnico === tecnicoFiltro)
    ).sort((a, b) => {
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

    const rankingTecnicos = [...new Set(visitas.map((v) => v.tecnico))]
      .filter(Boolean)
      .map((t) => {
        const vTec = visitas.filter((v) => v.tecnico === t)
        const aTec = avaliacoes.filter((a) => a.tecnico === t)
        const media = aTec.length
          ? aTec.reduce((acc, a) => acc + a.nota_media, 0) / aTec.length
          : 0

        return {
          nome: String(t),
          total: vTec.length,
          media: media.toFixed(1),
        }
      })
      .sort((a, b) => b.total - a.total)

    const rankingEscolas = Object.entries(
      filtradas.reduce((acc: any, v) => {
        if (v.escola) acc[v.escola] = (acc[v.escola] || 0) + 1
        return acc
      }, {})
    ).sort((a: any, b: any) => b[1] - a[1])

    const mesesMap: any = {}

    filtradas.forEach((v) => {
      if (!v.data_visita) return

      const data = parseDateLocal(v.data_visita)

      if (data) {
        const mesAno = data
          .toLocaleDateString("pt-BR", { month: "short" })
          .toUpperCase()

        mesesMap[mesAno] = (mesesMap[mesAno] || 0) + 1
      }
    })

    const graficoMes = Object.entries(mesesMap).map(([name, value]) => ({
      name,
      value,
    }))

    const escolasAtendidasSet = new Set(
      filtradas
        .map((v) => v.escola)
        .filter((escola) => {
          if (!escola) return false
          return !escola.toUpperCase().includes("URE GUARULHOS SUL")
        })
    )

    const coberturaEscolas = escolasAtendidasSet.size

    const escolasValidasRede = todasEscolas.filter(
      (e) =>
        e.nome_escola &&
        !e.nome_escola.toUpperCase().includes("URE GUARULHOS SUL")
    )

    const totalEscolasRede =
      escolasValidasRede.length > 0 ? escolasValidasRede.length : 82

    const escolasNaoAtendidas = escolasValidasRede
      .filter((e) => !escolasAtendidasSet.has(e.nome_escola))
      .map((e) => e.nome_escola)
      .sort((a, b) => a.localeCompare(b))

    return {
      filtradas,
      totalVisitas: filtradas.length,
      tecnicosAtivos: rankingTecnicos.length,
      slaMedio,
      mediaAval,
      rankingTecnicos,
      rankingEscolas,
      graficoMes,
      coberturaEscolas,
      totalEscolasRede,
      escolasNaoAtendidas,
    }
  }, [visitas, avaliacoes, tecnicoFiltro, todasEscolas])

  const chamadosTabela = useMemo(() => {
    return stats.filtradas.filter((v) => {
      const matchEscola =
        filtroEscolaTabela === "Todas" || v.escola === filtroEscolaTabela

      const matchTecnico =
        filtroTecnicoTabela === "Todos" || v.tecnico === filtroTecnicoTabela

      const matchBusca =
        buscaChamado === "" ||
        String(v.chamado || "")
          .toLowerCase()
          .includes(buscaChamado.toLowerCase())

      let matchMes = true

      if (filtroMesTabela !== "Todos") {
        if (!v.data_visita) {
          matchMes = false
        } else {
          const data = parseDateLocal(v.data_visita)

          if (data) {
            const mesAno = data
              .toLocaleDateString("pt-BR", { month: "short" })
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

    await new Promise((resolve) => window.setTimeout(resolve, 650))

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

  if (loading)
    return (
      <div className="flex items-center justify-center h-full bg-[#0B1120]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    )

  return (
    <div className="space-y-10">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-blue-500">●</span> Visão Geral - Atendimentos dos Fields
          </h2>
          <p className="text-slate-400 mt-1">
            Análise operacional e estratégica do suporte em campo da SETEC
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={abrirModalLista}
            className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-blue-600/15 px-5 py-3 text-left shadow-lg shadow-blue-950/30 transition-all hover:border-blue-400/60 hover:bg-blue-600/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:min-w-[275px]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.18),transparent_35%)] opacity-80" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/15 text-xl">
                📋
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  Lista diária
                </p>
                <p className="truncate text-sm font-black text-white">
                  Gerar chamados pendentes
                </p>
              </div>
            </div>
          </button>

          <select
            value={tecnicoFiltro}
            onChange={(e) => setTecnicoFiltro(e.target.value)}
            className="bg-[#020617] border border-slate-800 text-white rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-w-[260px] font-bold cursor-pointer"
          >
            <option value="Todos">👨‍🔧 Todos os Técnicos</option>
            {stats.rankingTecnicos.map((t) => (
              <option key={t.nome} value={t.nome}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard title="Chamados" value={stats.totalVisitas} subtitle="Volume total" color="blue" />
        <KpiCard title="Técnicos" value={stats.tecnicosAtivos} subtitle="Equipe campo" color="purple" />
        <KpiCard title="SLA Útil" value={stats.slaMedio + "d"} subtitle="Média conclusão" color="yellow" />
        <KpiCard title="Média Aval." value={stats.mediaAval + " ⭐"} subtitle="Feedback escolas" color="emerald" />
        <KpiCard title="Escolas" value={`${stats.coberturaEscolas}/${stats.totalEscolasRede}`} subtitle="Atendidas" color="blue" />
      </div>

      {/* GRÁFICO MENSAL */}
      <Glass title="Volume de Atendimentos Mensais">
        <div className="h-[340px] w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.graficoMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip content={<SafeTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <Glass title="🏆 Performance por Técnico">
          <div className="divide-y divide-slate-800/50 mt-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.rankingTecnicos.map((t, i) => (
              <Link
                href={`/fields/tecnico/${encodeURIComponent(t.nome)}`}
                key={t.nome}
                className="flex items-center justify-between py-5 hover:bg-slate-800/30 px-4 rounded-2xl transition group"
              >
                <div className="flex items-center gap-5">
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                        : i === 1
                          ? "bg-slate-300/20 text-slate-300 border border-slate-300/30"
                          : i === 2
                            ? "bg-amber-700/20 text-amber-600 border border-amber-700/30"
                            : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-slate-100 group-hover:text-blue-400 font-bold transition-colors text-base sm:text-lg truncate">
                    {t.nome}
                  </span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-blue-400 text-xl font-bold">{t.media}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    {t.total} CHAMADOS
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Glass>

        <Glass title="🚩 Escolas com Maior Demanda">
          <div className="divide-y divide-slate-800/50 mt-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.rankingEscolas.map((e: any) => (
              <div key={String(e[0])} className="flex items-center justify-between py-4 px-4 hover:bg-slate-800/20 rounded-xl transition-colors">
                <span className="text-slate-200 font-bold truncate max-w-[280px]">{e[0]}</span>
                <span className="bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-[11px] font-bold border border-red-500/20 shrink-0">
                  {e[1]} CHAMADOS
                </span>
              </div>
            ))}
          </div>
        </Glass>

        <Glass title="🎯 Pendentes (Não Contempladas)">
          <div className="divide-y divide-slate-800/50 mt-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {stats.escolasNaoAtendidas.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <span className="text-4xl mb-3">🎉</span>
                <p className="text-emerald-500 text-sm font-bold uppercase tracking-widest">
                  Cobertura de 100%!
                </p>
                <p className="text-slate-500 text-xs mt-1">Todas as escolas foram visitadas.</p>
              </div>
            ) : (
              stats.escolasNaoAtendidas.map((escola: string) => (
                <div key={escola} className="flex items-center py-4 px-4 hover:bg-slate-800/20 rounded-xl transition-colors">
                  <span className="w-2 h-2 rounded-full bg-green-700 mr-4 shrink-0 relative">
                    <span className="animate-ping absolute -inset-1 rounded-full bg-green-500 opacity-20"></span>
                  </span>
                  <span className="text-slate-300 font-medium truncate text-sm">{escola}</span>
                </div>
              ))
            )}
          </div>
        </Glass>
      </div>

      {/* TABELA DE CHAMADOS */}
      <Glass title="📋 Lista de Chamados Atendidos">
        <div className="flex flex-col md:flex-row flex-wrap gap-3 mb-6 mt-2">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar chamado (ex: STI-26...)"
              value={buscaChamado}
              onChange={(e) => setBuscaChamado(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold placeholder:text-slate-600"
            />
          </div>

          <select
            value={filtroMesTabela}
            onChange={(e) => setFiltroMesTabela(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold min-w-[150px] cursor-pointer"
          >
            <option value="Todos">📅 Todos os Meses</option>
            {stats.graficoMes.map((m) => (
              <option key={m.name} value={String(m.name)}>
                {String(m.name)}
              </option>
            ))}
          </select>

          <select
            value={filtroEscolaTabela}
            onChange={(e) => setFiltroEscolaTabela(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold w-full md:flex-1 max-w-[300px] truncate cursor-pointer"
          >
            <option value="Todas">🏫 Todas as Escolas</option>
            {[...new Set(stats.filtradas.map((v) => v.escola))]
              .filter(Boolean)
              .sort()
              .map((e) => (
                <option key={String(e)} value={String(e)}>
                  {String(e)}
                </option>
              ))}
          </select>

          <select
            value={filtroTecnicoTabela}
            onChange={(e) => setFiltroTecnicoTabela(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-xs font-bold min-w-[180px] cursor-pointer"
          >
            <option value="Todos">👨‍🔧 Todos os Técnicos</option>
            {[...new Set(stats.filtradas.map((v) => v.tecnico))]
              .filter(Boolean)
              .sort()
              .map((t) => (
                <option key={String(t)} value={String(t)}>
                  {String(t)}
                </option>
              ))}
          </select>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[11px] uppercase tracking-widest">
                <th className="py-4 px-4 font-bold">Código</th>
                <th className="py-4 px-4 font-bold">Escola</th>
                <th className="py-4 px-4 font-bold">Status</th>
                <th className="py-4 px-4 font-bold">Categoria</th>
                <th className="py-4 px-4 font-bold">Descrição / Resolução</th>
                <th className="py-4 px-4 font-bold">Técnico</th>
                <th className="py-4 px-4 font-bold">Aberto por</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/50">
              {chamadosTabela.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                    Nenhum chamado encontrado com estes filtros.
                  </td>
                </tr>
              ) : (
                chamadosTabela.slice(0, 100).map((v: any) => {
                  const statusNormalizado = (v.status || "").toLowerCase().trim()
                  const isVerde = statusNormalizado === "realizada" || statusNormalizado === "finalizado"
                  const isAmarelo = statusNormalizado === "pendente"

                  return (
                    <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-4 text-blue-400 text-xs font-bold">
                        <button
                          onClick={() => setChamadoSelecionado(v)}
                          className="hover:underline hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Ver detalhes completos"
                        >
                          {v.chamado || "N/A"}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-slate-200 font-bold">{v.escola}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                            isVerde
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : isAmarelo
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {v.status || "Pendente"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-300">{v.categoria}</span>
                          <span className="text-[10px] opacity-60 italic">{v.subcategoria}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400 max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <span className="truncate text-xs italic">" {v.descricao} "</span>
                          <span className="text-[10px] text-blue-500/80 truncate font-bold">R: {v.resolucao}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-200 font-bold">{v.tecnico}</td>
                      <td className="py-4 px-4 text-slate-500 text-xs">{v.abertura_por}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Glass>

      {/* MODAL GERADOR DE LISTA DE CHAMADOS */}
      {modalListaAberto && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl">
            <div className="relative overflow-hidden border-b border-slate-800 bg-[#020617] p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_30%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                      Lista diária
                    </span>
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Somente pendentes
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      WhatsApp
                    </span>
                  </div>

                  <h2 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                    Gerar lista de chamados dos Fields
                  </h2>

                  <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400">
                    Selecione a data prevista de atendimento para gerar uma lista organizada por técnico, contendo apenas chamados pendentes.
                  </p>
                </div>

                <button
                  onClick={fecharModalLista}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-slate-400 transition-all hover:bg-red-500/20 hover:text-red-400"
                >
                  X
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5 sm:p-8 custom-scrollbar">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_1fr]">
                <div className="space-y-5">
                  <div className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Data prevista de atendimento
                    </p>

                    <button
                      type="button"
                      onClick={abrirCalendarioLista}
                      className="mt-3 flex w-full items-center justify-between rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-4 text-left transition-all hover:border-blue-400/50 hover:bg-blue-500/15"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
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
                              className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${
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
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                        Pendentes
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {chamadosPrevistosParaData.length}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                        Técnicos
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {tecnicosNaLista.length}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-slate-800 bg-[#020617] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Escolas previstas
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {escolasNaLista.length}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={gerarListaChamados}
                    disabled={!dataLista || gerandoLista}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.01] hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400"
                  >
                    {gerandoLista ? "Gerando lista..." : "Gerar lista para copiar"}
                  </button>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs font-semibold leading-relaxed text-slate-500">
                      A lista considera somente chamados com <span className="font-black text-amber-300">status pendente</span> e com <span className="font-black text-blue-300">data prevista</span> igual à data selecionada.
                    </p>
                  </div>
                </div>

                <div className="min-h-[500px] rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5">
                  {gerandoLista && (
                    <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-blue-500/25 bg-blue-500/10">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                      <h3 className="text-2xl font-black text-white">
                        Gerando lista de chamados
                      </h3>
                      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                        Estamos organizando os chamados pendentes por técnico, escola, categoria e subcategoria.
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
                          className={`rounded-xl px-5 py-3 text-sm font-black uppercase tracking-widest transition-all ${
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
                        className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-slate-200 outline-none transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 custom-scrollbar"
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
                        <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
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
                className="rounded-xl bg-slate-800 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPLASH PAGE DE DETALHES DO CHAMADO */}
      {chamadoSelecionado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="bg-slate-900/80 border-b border-slate-800 p-6 sm:p-8 flex justify-between items-start">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest">
                    {chamadoSelecionado.categoria || "Geral"}
                  </span>
                  <span
                    className={`px-3 py-1 rounded text-xs font-black uppercase tracking-widest ${
                      (chamadoSelecionado.status || "").toLowerCase() === "realizada" ||
                      (chamadoSelecionado.status || "").toLowerCase() === "finalizado"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : (chamadoSelecionado.status || "").toLowerCase() === "pendente"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {chamadoSelecionado.status || "Pendente"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  <span className="text-blue-500">
                    {chamadoSelecionado.chamado || "N/A"}
                  </span>{" "}
                  • {chamadoSelecionado.escola}
                </h2>
                <p className="text-slate-500 font-mono text-xs sm:text-sm mt-2">
                  Técnico Atribuído:{" "}
                  <span className="text-slate-300">
                    {chamadoSelecionado.tecnico}
                  </span>{" "}
                  | Aberto por:{" "}
                  <span className="text-slate-300">
                    {chamadoSelecionado.abertura_por}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setChamadoSelecionado(null)}
                className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all text-xl shrink-0"
              >
                X
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-col gap-6 flex">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                    Data Abertura
                  </p>
                  <p className="text-base sm:text-lg font-bold text-white">
                    {formatarDataBR(chamadoSelecionado.data_abertura)}
                  </p>
                </div>
                <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                    Data Prevista
                  </p>
                  <p className="text-base sm:text-lg font-bold text-slate-300">
                    {formatarDataBR(chamadoSelecionado.data_prevista)}
                  </p>
                </div>
                <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                    Data Visita
                  </p>
                  <p className="text-base sm:text-lg font-bold text-blue-400">
                    {formatarDataBR(chamadoSelecionado.data_visita)}
                  </p>
                </div>
                <div className="bg-[#020617] border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                    Data Finalização
                  </p>
                  <p className="text-base sm:text-lg font-bold text-emerald-400">
                    {formatarDataBR(chamadoSelecionado.data_finalizacao)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                    Urgência / Impacto
                  </p>
                  <p className="text-lg font-bold text-white">
                    {chamadoSelecionado.urgencia || "N/A"}{" "}
                    <span className="text-slate-600 font-light mx-1">/</span>{" "}
                    {chamadoSelecionado.impacto || "N/A"}
                  </p>
                </div>
                <div className="bg-[#020617] border border-slate-800 p-5 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                    Subcategoria
                  </p>
                  <p className="text-lg font-bold text-white">
                    {chamadoSelecionado.subcategoria || "N/A"}
                  </p>
                </div>
              </div>

              <div className="bg-[#020617] border border-slate-800 p-6 rounded-2xl">
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-lg">📝</span> Descrição do Problema
                </p>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {chamadoSelecionado.descricao ||
                    "Sem descrição detalhada registrada."}
                </p>
              </div>

              <div className="bg-[#020617] border border-blue-900/30 p-6 rounded-2xl">
                <p className="text-xs text-blue-400 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-lg">🛠️</span> Resolução Aplicada
                </p>
                <p className="text-blue-100/80 leading-relaxed whitespace-pre-wrap text-sm font-medium">
                  {chamadoSelecionado.resolucao ||
                    "Sem resolução registrada para este chamado ainda."}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-end">
              <button
                onClick={() => setChamadoSelecionado(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}

function Glass({ children, title, className = "" }: any) {
  return (
    <div className={`bg-[#020617] border border-slate-800 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
      {title && (
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

function KpiCard({ title, value, subtitle, color }: any) {
  const gradients: any = {
    blue: "from-blue-600/20 to-transparent border-blue-500/30",
    purple: "from-purple-600/20 to-transparent border-purple-500/30",
    yellow: "from-yellow-600/20 to-transparent border-yellow-500/30",
    emerald: "from-emerald-600/20 to-transparent border-emerald-500/30",
  }

  const textColors: any = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  }

  return (
    <div className={`bg-[#020617] border rounded-[2rem] p-7 shadow-2xl relative overflow-hidden transition-all hover:scale-[1.02] ${gradients[color]}`}>
      <div className={`absolute top-0 left-0 h-full w-1 bg-gradient-to-b ${color === "blue" ? "from-blue-500" : color === "purple" ? "from-purple-500" : color === "yellow" ? "from-yellow-500" : "from-emerald-500"} to-transparent opacity-70`}></div>
      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">
        {title}
      </p>
      <p className="text-4xl text-white font-bold mb-2">{value}</p>
      <p className={`text-[11px] font-bold uppercase tracking-tight opacity-90 ${textColors[color]} bg-black/20 py-1 px-2 rounded-md inline-block`}>
        {subtitle}
      </p>
    </div>
  )
}