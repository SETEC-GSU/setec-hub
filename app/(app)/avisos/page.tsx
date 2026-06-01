"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { createClient } from "@/lib/supabase"

type AvisoSetec = {
  id: string
  titulo: string | null
  descricao: string | null
  emoji: string | null
  ativo: boolean | null
  created_at: string | null
  tipo: string | null
  data_inicio: string | null
  data_fim: string | null
}

type Feedback = {
  tipo: "success" | "error" | "info" | "warning"
  texto: string
} | null

const TIPOS_AVISO = [
  {
    value: "informativo",
    label: "Informativo",
    emoji: "ℹ️",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    card: "border-blue-500/25 bg-blue-500/10",
    glow: "from-blue-500/20",
  },
  {
    value: "alerta",
    label: "Alerta",
    emoji: "⚠️",
    badge: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    card: "border-yellow-500/25 bg-yellow-500/10",
    glow: "from-yellow-500/20",
  },
  {
    value: "comunicado",
    label: "Comunicado",
    emoji: "📢",
    badge: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    card: "border-cyan-500/25 bg-cyan-500/10",
    glow: "from-cyan-500/20",
  },
  {
    value: "urgente",
    label: "Urgente",
    emoji: "🚨",
    badge: "border-red-500/25 bg-red-500/10 text-red-300",
    card: "border-red-500/25 bg-red-500/10",
    glow: "from-red-500/20",
  },
  {
    value: "manutencao",
    label: "Manutenção",
    emoji: "🛠️",
    badge: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    card: "border-purple-500/25 bg-purple-500/10",
    glow: "from-purple-500/20",
  },
  {
    value: "sucesso",
    label: "Normalizado",
    emoji: "✅",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    card: "border-emerald-500/25 bg-emerald-500/10",
    glow: "from-emerald-500/20",
  },
]

const EMOJIS_RAPIDOS = ["⚠️", "ℹ️", "📢", "🚨", "🛠️", "✅", "📌", "💻", "🌐", "📅", "🔒", "📡"]

const MODELOS_PRONTOS = [
  {
    nome: "Comunicado geral",
    emoji: "📢",
    tipo: "comunicado",
    titulo: "Comunicado SETEC",
    descricao:
      "A Seção de Tecnologia informa que há uma nova orientação disponível para acompanhamento das unidades escolares.",
  },
  {
    nome: "Manutenção programada",
    emoji: "🛠️",
    tipo: "manutencao",
    titulo: "Manutenção programada",
    descricao:
      "Informamos que poderá ocorrer instabilidade temporária durante o período informado, em razão de manutenção programada.",
  },
  {
    nome: "Alerta operacional",
    emoji: "⚠️",
    tipo: "alerta",
    titulo: "Atenção às orientações",
    descricao:
      "Solicitamos atenção das unidades escolares quanto às orientações encaminhadas pela SETEC.",
  },
  {
    nome: "Urgente",
    emoji: "🚨",
    tipo: "urgente",
    titulo: "Aviso urgente",
    descricao:
      "Solicitamos prioridade no acompanhamento deste aviso, considerando a necessidade de atendimento dentro do prazo informado.",
  },
  {
    nome: "Normalização",
    emoji: "✅",
    tipo: "sucesso",
    titulo: "Serviço normalizado",
    descricao:
      "Informamos que a situação foi normalizada. Agradecemos o apoio e o acompanhamento das unidades escolares.",
  },
]

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function getTipoConfig(tipo: string | null | undefined) {
  const value = textoSeguro(tipo, "informativo")
  return TIPOS_AVISO.find((item) => item.value === value) || TIPOS_AVISO[0]
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toDateTimeLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function datetimeLocalFromDatabase(value: string | null | undefined) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return toDateTimeLocalInput(date)
}

function datetimeLocalToDatabase(value: string) {
  if (!value) return null

  return `${value}:00-03:00`
}

function formatarData(dataStr: string | null | undefined) {
  if (!dataStr) return "-"

  const date = new Date(dataStr)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusTemporal(
  inicio: string | null | undefined,
  fim: string | null | undefined,
  ativo: boolean | null | undefined
) {
  if (!ativo) {
    return {
      key: "desativado",
      texto: "Desativado",
      detalhe: "Não será exibido na tela principal.",
      dot: "bg-red-400",
      badge: "border-red-500/25 bg-red-500/10 text-red-300",
      card: "border-red-500/20 bg-red-500/5",
    }
  }

  const agora = Date.now()
  const dtInicio = inicio ? new Date(inicio).getTime() : 0
  const dtFim = fim ? new Date(fim).getTime() : Infinity

  if (dtInicio > agora) {
    return {
      key: "agendado",
      texto: "Agendado",
      detalhe: "Será exibido somente a partir da data de entrada.",
      dot: "bg-yellow-400",
      badge: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
      card: "border-yellow-500/20 bg-yellow-500/5",
    }
  }

  if (dtFim < agora) {
    return {
      key: "expirado",
      texto: "Expirado",
      detalhe: "Período de exibição encerrado.",
      dot: "bg-slate-500",
      badge: "border-slate-700 bg-slate-900 text-slate-400",
      card: "border-slate-800 bg-slate-950/60",
    }
  }

  return {
    key: "vigente",
    texto: "Vigente",
    detalhe: "Ativo e dentro do período de exibição.",
    dot: "bg-emerald-400",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    card: "border-emerald-500/20 bg-emerald-500/5",
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível concluir a operação."
}

export default function AdminAvisos() {
  const supabase = useMemo(() => createClient(), [])

  const [avisos, setAvisos] = useState<AvisoSetec[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [emoji, setEmoji] = useState("⚠️")
  const [tipo, setTipo] = useState("informativo")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [ativoInicial, setAtivoInicial] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [busca, setBusca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroStatus, setFiltroStatus] = useState("todos")

  const tipoConfigAtual = getTipoConfig(tipo)

  async function carregar() {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("avisos_setec")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setAvisos((data || []) as AvisoSetec[])
    } catch (error) {
      console.error("[Gestão de Avisos] Erro ao carregar:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  const indicadores = useMemo(() => {
    const vigentes = avisos.filter(
      (aviso) => getStatusTemporal(aviso.data_inicio, aviso.data_fim, aviso.ativo).key === "vigente"
    ).length

    const agendados = avisos.filter(
      (aviso) => getStatusTemporal(aviso.data_inicio, aviso.data_fim, aviso.ativo).key === "agendado"
    ).length

    const expirados = avisos.filter(
      (aviso) => getStatusTemporal(aviso.data_inicio, aviso.data_fim, aviso.ativo).key === "expirado"
    ).length

    const desativados = avisos.filter(
      (aviso) => getStatusTemporal(aviso.data_inicio, aviso.data_fim, aviso.ativo).key === "desativado"
    ).length

    return {
      total: avisos.length,
      vigentes,
      agendados,
      expirados,
      desativados,
    }
  }, [avisos])

  const avisosFiltrados = useMemo(() => {
    const termo = normalizar(busca)

    return avisos.filter((aviso) => {
      const status = getStatusTemporal(aviso.data_inicio, aviso.data_fim, aviso.ativo)

      const matchBusca = termo
        ? [aviso.titulo, aviso.descricao, aviso.tipo, aviso.emoji]
            .map(normalizar)
            .join(" ")
            .includes(termo)
        : true

      const matchTipo = filtroTipo === "todos" ? true : aviso.tipo === filtroTipo
      const matchStatus = filtroStatus === "todos" ? true : status.key === filtroStatus

      return matchBusca && matchTipo && matchStatus
    })
  }, [avisos, busca, filtroStatus, filtroTipo])

  function validarFormulario() {
    if (!titulo.trim() || !descricao.trim()) {
      setFeedback({
        tipo: "warning",
        texto: "Preencha o título e a descrição do aviso.",
      })
      return false
    }

    if (dataInicio && dataFim) {
      const inicio = new Date(datetimeLocalToDatabase(dataInicio) || "").getTime()
      const fim = new Date(datetimeLocalToDatabase(dataFim) || "").getTime()

      if (Number.isFinite(inicio) && Number.isFinite(fim) && fim < inicio) {
        setFeedback({
          tipo: "warning",
          texto: "A data de expiração não pode ser anterior à data de entrada.",
        })
        return false
      }
    }

    return true
  }

  function limparFormulario() {
    setTitulo("")
    setDescricao("")
    setEmoji("⚠️")
    setTipo("informativo")
    setDataInicio("")
    setDataFim("")
    setAtivoInicial(true)
    setEditandoId(null)
  }

  async function salvarAviso(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!validarFormulario()) return

    setSalvando(true)
    setFeedback(null)

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      emoji: textoSeguro(emoji, tipoConfigAtual.emoji),
      tipo,
      data_inicio: datetimeLocalToDatabase(dataInicio),
      data_fim: datetimeLocalToDatabase(dataFim),
      ativo: ativoInicial,
    }

    try {
      if (editandoId) {
        const { error } = await supabase
          .from("avisos_setec")
          .update(payload)
          .eq("id", editandoId)

        if (error) throw error

        setFeedback({
          tipo: "success",
          texto: "Aviso atualizado com sucesso.",
        })
      } else {
        const { error } = await supabase.from("avisos_setec").insert(payload)

        if (error) throw error

        setFeedback({
          tipo: "success",
          texto: ativoInicial
            ? "Aviso publicado com sucesso."
            : "Aviso salvo como inativo com sucesso.",
        })
      }

      limparFormulario()
      await carregar()
    } catch (error) {
      console.error("[Gestão de Avisos] Erro ao salvar:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAviso(id: string, ativo: boolean | null) {
    setFeedback(null)

    try {
      const { error } = await supabase
        .from("avisos_setec")
        .update({ ativo: !ativo })
        .eq("id", id)

      if (error) throw error

      setFeedback({
        tipo: "success",
        texto: ativo ? "Aviso desativado manualmente." : "Aviso reativado com sucesso.",
      })

      await carregar()
    } catch (error) {
      console.error("[Gestão de Avisos] Erro ao alternar:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    }
  }

  async function excluirAviso(aviso: AvisoSetec) {
    const confirmado = window.confirm(
      `Deseja realmente excluir o aviso "${textoSeguro(aviso.titulo, "sem título")}"?`
    )

    if (!confirmado) return

    setFeedback(null)

    try {
      const { error } = await supabase
        .from("avisos_setec")
        .delete()
        .eq("id", aviso.id)

      if (error) throw error

      setFeedback({
        tipo: "success",
        texto: "Aviso excluído com sucesso.",
      })

      if (editandoId === aviso.id) {
        limparFormulario()
      }

      await carregar()
    } catch (error) {
      console.error("[Gestão de Avisos] Erro ao excluir:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    }
  }

  function editarAviso(aviso: AvisoSetec) {
    setEditandoId(aviso.id)
    setTitulo(textoSeguro(aviso.titulo))
    setDescricao(textoSeguro(aviso.descricao))
    setEmoji(textoSeguro(aviso.emoji, getTipoConfig(aviso.tipo).emoji))
    setTipo(textoSeguro(aviso.tipo, "informativo"))
    setDataInicio(datetimeLocalFromDatabase(aviso.data_inicio))
    setDataFim(datetimeLocalFromDatabase(aviso.data_fim))
    setAtivoInicial(Boolean(aviso.ativo))

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    setFeedback({
      tipo: "info",
      texto: "Aviso carregado para edição.",
    })
  }

  function duplicarAviso(aviso: AvisoSetec) {
    setEditandoId(null)
    setTitulo(`${textoSeguro(aviso.titulo, "Aviso")} - cópia`)
    setDescricao(textoSeguro(aviso.descricao))
    setEmoji(textoSeguro(aviso.emoji, getTipoConfig(aviso.tipo).emoji))
    setTipo(textoSeguro(aviso.tipo, "informativo"))
    setDataInicio(datetimeLocalFromDatabase(aviso.data_inicio))
    setDataFim(datetimeLocalFromDatabase(aviso.data_fim))
    setAtivoInicial(false)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    setFeedback({
      tipo: "info",
      texto: "Aviso duplicado no formulário. Revise e publique quando desejar.",
    })
  }

  function aplicarModelo(modelo: (typeof MODELOS_PRONTOS)[number]) {
    setTitulo(modelo.titulo)
    setDescricao(modelo.descricao)
    setEmoji(modelo.emoji)
    setTipo(modelo.tipo)
  }

  function aplicarPeriodoRapido(modo: "hoje" | "24h" | "7d" | "30d") {
    const agora = new Date()
    agora.setSeconds(0, 0)

    const inicio = new Date(agora)
    const fim = new Date(agora)

    if (modo === "hoje") {
      fim.setHours(23, 59, 0, 0)
    }

    if (modo === "24h") {
      fim.setDate(fim.getDate() + 1)
    }

    if (modo === "7d") {
      fim.setDate(fim.getDate() + 7)
    }

    if (modo === "30d") {
      fim.setDate(fim.getDate() + 30)
    }

    setDataInicio(toDateTimeLocalInput(inicio))
    setDataFim(toDateTimeLocalInput(fim))
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/20 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_34%)]" />
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_620px] xl:items-end">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                Gestão
              </Badge>
              <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                Avisos SETEC
              </Badge>
              <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                Tela principal
              </Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Gestão de{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                Avisos
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Controle os comunicados exibidos na página principal do SETEC Hub, com
              agendamento, expiração, status, preview e gerenciamento rápido dos avisos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniStat label="Total" value={indicadores.total} tone="slate" />
            <MiniStat label="Vigentes" value={indicadores.vigentes} tone="emerald" />
            <MiniStat label="Agendados" value={indicadores.agendados} tone="yellow" />
            <MiniStat label="Expirados" value={indicadores.expirados} tone="blue" />
            <MiniStat label="Inativos" value={indicadores.desativados} tone="red" />
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            feedback.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : feedback.tipo === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : feedback.tipo === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {feedback.texto}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form
          onSubmit={salvarAviso}
          className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6"
        >
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tipoConfigAtual.glow} via-transparent to-transparent opacity-70`} />

          <div className="relative z-10">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  {editandoId ? "Editando aviso" : "Novo aviso"}
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  {editandoId ? "Atualizar comunicado" : "Criar novo aviso"}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Configure como o aviso será exibido na tela principal.
                </p>
              </div>

              {editandoId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-red-500/40 hover:text-red-300"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-5">
              {MODELOS_PRONTOS.map((modelo) => (
                <button
                  key={modelo.nome}
                  type="button"
                  onClick={() => aplicarModelo(modelo)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-left transition hover:border-blue-500/40 hover:bg-slate-900"
                >
                  <span className="text-xl">{modelo.emoji}</span>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {modelo.nome}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[120px_1fr]">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Emoji
                </label>

                <input
                  value={emoji}
                  onChange={(event) => setEmoji(event.target.value)}
                  placeholder="Emoji"
                  maxLength={4}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-center text-3xl text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Título do aviso
                </label>

                <input
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  placeholder="Ex.: Orientações importantes da SETEC"
                  maxLength={90}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                  Descrição
                </label>

                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {descricao.length}/500
                </span>
              </div>

              <textarea
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Escreva uma orientação objetiva para aparecer na tela principal..."
                maxLength={500}
                className="min-h-[128px] w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-medium leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Tipo de aviso
                </label>

                <select
                  value={tipo}
                  onChange={(event) => {
                    const novoTipo = event.target.value
                    const config = getTipoConfig(novoTipo)

                    setTipo(novoTipo)

                    if (!emoji.trim() || emoji === getTipoConfig(tipo).emoji) {
                      setEmoji(config.emoji)
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                >
                  {TIPOS_AVISO.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.emoji} {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Status ao salvar
                </label>

                <button
                  type="button"
                  onClick={() => setAtivoInicial((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-sm font-black uppercase tracking-widest transition ${
                    ativoInicial
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-950 text-slate-400"
                  }`}
                >
                  <span>{ativoInicial ? "Publicado / Ativo" : "Salvar inativo"}</span>
                  <span className={`h-3 w-3 rounded-full ${ativoInicial ? "bg-emerald-400" : "bg-slate-600"}`} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                Emojis rápidos
              </label>

              <div className="flex flex-wrap gap-2">
                {EMOJIS_RAPIDOS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEmoji(item)}
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl transition ${
                      emoji === item
                        ? "border-blue-500/60 bg-blue-500/15"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Agendamento
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Se não informar datas, o aviso ficará disponível enquanto estiver ativo.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <QuickDateButton onClick={() => aplicarPeriodoRapido("hoje")}>
                    Hoje
                  </QuickDateButton>
                  <QuickDateButton onClick={() => aplicarPeriodoRapido("24h")}>
                    24h
                  </QuickDateButton>
                  <QuickDateButton onClick={() => aplicarPeriodoRapido("7d")}>
                    7 dias
                  </QuickDateButton>
                  <QuickDateButton onClick={() => aplicarPeriodoRapido("30d")}>
                    30 dias
                  </QuickDateButton>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                    Data de entrada
                  </label>

                  <input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(event) => setDataInicio(event.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                    Data de expiração
                  </label>

                  <input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(event) => setDataFim(event.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {(dataInicio || dataFim) && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicio("")
                    setDataFim("")
                  }}
                  className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 transition hover:border-red-500/40 hover:text-red-300"
                >
                  Limpar agendamento
                </button>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={limparFormulario}
                disabled={salvando}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
              >
                Limpar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Publicar aviso"}
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Preview
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Tela principal
                </h2>
              </div>

              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tipoConfigAtual.badge}`}>
                {tipoConfigAtual.label}
              </span>
            </div>

            <div className={`relative overflow-hidden rounded-[1.75rem] border p-5 ${tipoConfigAtual.card}`}>
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tipoConfigAtual.glow} via-transparent to-transparent`} />

              <div className="relative z-10 flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#020617]/80 text-3xl shadow-inner">
                  {textoSeguro(emoji, tipoConfigAtual.emoji)}
                </div>

                <div className="min-w-0">
                  <p className="break-words text-lg font-black text-white">
                    {textoSeguro(titulo, "Título do aviso")}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-300">
                    {textoSeguro(
                      descricao,
                      "A descrição completa do seu aviso aparecerá aqui."
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {ativoInicial ? "Ativo ao salvar" : "Inativo ao salvar"}
                    </span>

                    {(dataInicio || dataFim) && (
                      <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                        Com período definido
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Regras de exibição
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <RuleCard
                title="Ativo + dentro do período"
                description="O aviso aparece na página principal."
                tone="green"
              />

              <RuleCard
                title="Agendado"
                description="Fica cadastrado, mas só aparece após a data de entrada."
                tone="yellow"
              />

              <RuleCard
                title="Expirado ou desativado"
                description="Permanece no histórico, mas não deve aparecer para o usuário."
                tone="red"
              />
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
              Histórico
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Avisos existentes
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {avisosFiltrados.length} aviso(s) encontrado(s) de {avisos.length} registrado(s).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto] xl:min-w-[900px]">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por título, descrição ou tipo..."
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
            />

            <select
              value={filtroTipo}
              onChange={(event) => setFiltroTipo(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="todos">Todos os tipos</option>
              {TIPOS_AVISO.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="todos">Todos os status</option>
              <option value="vigente">Vigentes</option>
              <option value="agendado">Agendados</option>
              <option value="expirado">Expirados</option>
              <option value="desativado">Desativados</option>
            </select>

            <button
              type="button"
              onClick={carregar}
              disabled={loading}
              className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-60"
            >
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-[1.75rem] border border-slate-800 bg-slate-950/60">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-500">
                Carregando avisos
              </p>
            </div>
          </div>
        ) : avisosFiltrados.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-3xl">
              📭
            </div>

            <p className="text-lg font-black text-white">Nenhum aviso encontrado</p>

            <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Ajuste os filtros ou crie um novo aviso para exibição na tela principal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {avisosFiltrados.map((aviso) => {
              const tipoConfig = getTipoConfig(aviso.tipo)
              const statusTemporal = getStatusTemporal(
                aviso.data_inicio,
                aviso.data_fim,
                aviso.ativo
              )

              return (
                <article
                  key={aviso.id}
                  className={`group relative overflow-hidden rounded-[1.75rem] border bg-slate-950/70 p-5 transition hover:-translate-y-[1px] hover:border-blue-500/35 ${statusTemporal.card}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tipoConfig.glow} via-transparent to-transparent opacity-60`} />

                  <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-3xl shadow-inner">
                        {textoSeguro(aviso.emoji, tipoConfig.emoji)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tipoConfig.badge}`}>
                            {tipoConfig.label}
                          </span>

                          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusTemporal.badge}`}>
                            <span className={`h-2 w-2 rounded-full ${statusTemporal.dot}`} />
                            {statusTemporal.texto}
                          </span>
                        </div>

                        <h3 className="break-words text-lg font-black text-white">
                          {textoSeguro(aviso.titulo, "Aviso sem título")}
                        </h3>

                        <p className="mt-2 max-w-5xl whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-400">
                          {textoSeguro(aviso.descricao, "Sem descrição.")}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 md:grid-cols-3">
                          <p>
                            Criado:{" "}
                            <span className="text-slate-400">
                              {formatarData(aviso.created_at)}
                            </span>
                          </p>

                          <p>
                            Início:{" "}
                            <span className="text-slate-400">
                              {formatarData(aviso.data_inicio)}
                            </span>
                          </p>

                          <p>
                            Fim:{" "}
                            <span className="text-slate-400">
                              {formatarData(aviso.data_fim)}
                            </span>
                          </p>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-slate-500">
                          {statusTemporal.detalhe}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]">
                      <ActionButton
                        onClick={() => editarAviso(aviso)}
                        className="border-blue-500/25 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                      >
                        Editar
                      </ActionButton>

                      <ActionButton
                        onClick={() => duplicarAviso(aviso)}
                        className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                      >
                        Duplicar
                      </ActionButton>

                      <ActionButton
                        onClick={() => alternarAviso(aviso.id, aviso.ativo)}
                        className={
                          aviso.ativo
                            ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20"
                            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        }
                      >
                        {aviso.ativo ? "Desativar" : "Reativar"}
                      </ActionButton>

                      <ActionButton
                        onClick={() => excluirAviso(aviso)}
                        className="border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      >
                        Excluir
                      </ActionButton>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <style jsx global>{`
        select option {
          background-color: #0f172a;
          color: #f8fafc;
        }

        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.7;
        }
      `}</style>
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "slate" | "emerald" | "yellow" | "blue" | "red"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
  }

  const bars = {
    slate: "bg-slate-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-400",
    blue: "bg-blue-500",
    red: "bg-red-500",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {value}
      </p>

      <div className={`mt-3 h-1 rounded-full ${bars[tone]}`} />
    </div>
  )
}

function QuickDateButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-700 bg-[#020617] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:border-blue-500/40 hover:text-blue-300"
    >
      {children}
    </button>
  )
}

function RuleCard({
  title,
  description,
  tone,
}: {
  title: string
  description: string
  tone: "green" | "yellow" | "red"
}) {
  const styles = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs font-medium leading-relaxed opacity-80">
        {description}
      </p>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[46px] rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-widest transition ${className}`}
    >
      {children}
    </button>
  )
}