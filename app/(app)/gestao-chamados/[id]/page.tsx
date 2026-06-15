"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"

type Feedback = {
  tipo: "success" | "error" | "warning" | "info"
  texto: string
} | null

const URE_ROLES = [
  "admin",
  "analista",
  "seintec",
  "setec",
  "chefia_ure",
  "chefia-ure",
  "dirigente",
  "analista-pleno",
  "analista-jr",
]

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function getInitials(name: unknown) {
  const clean = textoSeguro(name, "")

  if (!clean) return "US"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatarStatus(status: string | null | undefined) {
  if (!status) return "CARREGANDO..."
  return status.replaceAll("_", " ").toUpperCase()
}

function formatarDataHora(data?: string | null) {
  if (!data) return "Não informado"

  const date = new Date(data)

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

function formatarDataMensagem(data?: string | null) {
  if (!data) return "Sem data"

  const date = new Date(data)

  if (Number.isNaN(date.getTime())) return "Sem data"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function dataSeparador(data?: string | null) {
  if (!data) return "Sem data"

  const date = new Date(data)

  if (Number.isNaN(date.getTime())) return "Sem data"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function dataKey(data?: string | null) {
  if (!data) return ""

  const date = new Date(data)

  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}

function getStatusClasses(status: string | null | undefined) {
  const value = normalizarTexto(status)

  if (value === "aberto") {
    return "border-red-500/25 bg-red-500/10 text-red-300"
  }

  if (
    value === "em atendimento" ||
    value === "em_atendimento" ||
    value === "andamento"
  ) {
    return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
  }

  if (value === "resolvido" || value === "concluido" || value === "concluído") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  if (value === "encerrado") {
    return "border-slate-600 bg-slate-900 text-slate-300"
  }

  return "border-blue-500/25 bg-blue-500/10 text-blue-300"
}

function getPrioridadeClasses(prioridade: string | null | undefined) {
  const value = normalizarTexto(prioridade)

  if (value === "alta" || value === "urgente") {
    return "border-red-500/25 bg-red-500/10 text-red-300"
  }

  if (value === "media" || value === "média") {
    return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
  }

  if (value === "baixa") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getOrigemClasses(origem: string | null | undefined) {
  const value = normalizarTexto(origem)

  if (value === "escola") {
    return "border-purple-500/25 bg-purple-500/10 text-purple-300"
  }

  if (value === "ure" || value === "sede") {
    return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function isStatusConcluido(status: unknown) {
  const value = normalizarTexto(status)

  return (
    value === "resolvido" ||
    value === "concluido" ||
    value === "concluído" ||
    value === "encerrado"
  )
}

function isStatusEncerrado(status: unknown) {
  return normalizarTexto(status) === "encerrado"
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível concluir a operação."
}

export default function GestaoChamadoDetalhePage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  const id = useMemo(() => {
    const raw = params?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [chamado, setChamado] = useState<any>(null)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [novaMsg, setNovaMsg] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("analista")
  const [anexos, setAnexos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false)
  const [parecerFinal, setParecerFinal] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)

  const podeConcluir = URE_ROLES.includes(userRole)
  const chamadoConcluido = isStatusConcluido(chamado?.status)
  const chamadoEncerrado = isStatusEncerrado(chamado?.status)

  const scrollToBottom = useCallback(() => {
    window.setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 80)
  }, [])

  const carregar = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setFeedback(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setFeedback({
          tipo: "warning",
          texto: "Sessão não localizada. Faça login novamente.",
        })
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data: userData } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      const roleAtual = userData?.role ?? "analista"
      setUserRole(roleAtual)

      const { data: chamadoData, error: chamadoError } = await supabase
        .from("chamados")
        .select("*")
        .eq("id", id)
        .single()

      if (chamadoError) throw chamadoError

      setChamado(chamadoData)
      setParecerFinal(chamadoData?.retorno_devolutivo || "")

      const { data: msgs, error: msgsError } = await supabase
        .from("chamado_mensagens")
        .select(`*, usuarios(nome, role)`)
        .eq("chamado_id", id)
        .order("created_at", { ascending: true })

      if (msgsError) throw msgsError

      setMensagens(msgs || [])

      const { data: anexosData, error: anexosError } = await supabase
        .from("chamados_anexos")
        .select("*")
        .eq("chamado_id", id)

      if (anexosError) throw anexosError

      setAnexos(anexosData || [])

      await supabase.from("chamados").update({ visualizado_gestao: true }).eq("id", id)

      if (chamadoData?.usuario_id === user.id) {
        await supabase
          .from("chamados")
          .update({ visualizado_pelo_usuario: true })
          .eq("id", id)
      }
    } catch (error) {
      console.error("[Detalhe Chamado] Erro ao carregar:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
      setChamado(null)
      setMensagens([])
      setAnexos([])
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    scrollToBottom()
  }, [mensagens, scrollToBottom])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  async function enviarMensagem() {
    if (!novaMsg.trim()) return
    if (chamadoEncerrado) return
    if (!userId || !id) return

    setEnviando(true)
    setFeedback(null)

    const tipo = URE_ROLES.includes(userRole) ? "analista" : "usuario"

    try {
      const { error } = await supabase.from("chamado_mensagens").insert({
        chamado_id: id,
        usuario_id: userId,
        mensagem: novaMsg.trim(),
        tipo,
      })

      if (error) throw error

      setNovaMsg("")
      await carregar()
    } catch (error) {
      console.error("[Detalhe Chamado] Erro ao enviar mensagem:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setEnviando(false)
    }
  }

  async function concluirChamado() {
    if (!id) return

    const parecer = parecerFinal.trim()

    if (!parecer) {
      setFeedback({
        tipo: "warning",
        texto: "Informe o parecer técnico final antes de concluir o chamado.",
      })
      return
    }

    setConcluindo(true)
    setFeedback(null)

    try {
      const { error } = await supabase
        .from("chamados")
        .update({
          status: "resolvido",
          retorno_devolutivo: parecer,
        })
        .eq("id", id)

      if (error) throw error

      setFeedback({
        tipo: "success",
        texto: "Chamado concluído como resolvido com sucesso.",
      })

      setModalConcluirAberto(false)
      await carregar()
    } catch (error) {
      console.error("[Detalhe Chamado] Erro ao concluir chamado:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setConcluindo(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-slate-800 bg-[#020617] px-10 py-8 shadow-2xl shadow-slate-950/30">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Processando dados do chamado
          </p>
        </div>
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="mx-auto max-w-4xl pb-12">
        <div className="rounded-[2rem] border border-red-500/25 bg-red-500/10 p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-black text-white">
            Chamado não localizado
          </h1>
          <p className="mt-2 text-sm font-medium text-red-200/80">
            Não foi possível carregar os dados deste protocolo.
          </p>

          <Link
            href="/gestao-chamados"
            className="mt-6 inline-flex rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-200 transition hover:bg-slate-800"
          >
            ← Voltar para gestão
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
      <section className="rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/gestao-chamados"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
              >
                ← Voltar
              </Link>

              <button
                type="button"
                onClick={carregar}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
              >
                ↻ Atualizar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex min-h-[42px] items-center rounded-2xl border px-4 text-xs font-black uppercase tracking-widest ${getStatusClasses(
                  chamado.status
                )}`}
              >
                {formatarStatus(chamado.status)}
              </span>

              {podeConcluir && !chamadoConcluido && (
                <button
                  type="button"
                  onClick={() => setModalConcluirAberto(true)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-700"
                >
                  ✅ Concluir
                </button>
              )}

              {podeConcluir && chamadoConcluido && (
                <button
                  type="button"
                  onClick={() => setModalConcluirAberto(true)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-xs font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  ✏️ Revisar parecer
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                Protocolo #{chamado.codigo || "N/A"}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getOrigemClasses(
                  chamado.origem
                )}`}
              >
                {textoSeguro(chamado.origem, "Origem não informada").toUpperCase()}
              </span>
            </div>

            <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-white md:text-4xl">
              {chamado.titulo || "Chamado sem título"}
            </h1>

            <p className="mt-3 text-sm font-medium text-slate-500">
              Acompanhamento do protocolo, mensagens, anexos e devolutiva técnica.
            </p>
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

      <section
        className={`grid grid-cols-1 gap-5 ${
          anexos.length > 0 ? "xl:grid-cols-[1fr_420px]" : ""
        }`}
      >
        <Panel>
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-800 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                Dados do chamado
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Resumo da ocorrência
              </h2>
            </div>

            <span
              className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${getStatusClasses(
                chamado.status
              )}`}
            >
              {formatarStatus(chamado.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoBox
              label="Solicitante"
              value={chamado.solicitante_nome ?? chamado.nome ?? "-"}
            />

            <InfoBox label="Unidade / Escola" value={chamado.escola || "URE (Sede)"} />

            <InfoBox label="Categoria" value={chamado.categoria || "-"} />

            <InfoBox
              label="Prioridade"
              value={chamado.prioridade || "Não definida"}
              highlight={normalizarTexto(chamado.prioridade) === "alta"}
            />

            <InfoBox label="Origem" value={chamado.origem || "-"} />

            <InfoBox label="Criado em" value={formatarDataHora(chamado.created_at)} />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Relato da ocorrência
            </p>

            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-300">
              {chamado.descricao || "Sem descrição registrada."}
            </p>
          </div>

          {(chamado.status === "resolvido" || chamado.status === "encerrado") &&
            chamado.retorno_devolutivo && (
              <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    Parecer técnico final
                  </p>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-emerald-50/90">
                  {chamado.retorno_devolutivo}
                </p>
              </div>
            )}
        </Panel>

        {anexos.length > 0 && (
          <Panel>
            <div className="mb-5 border-b border-slate-800 pb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                Evidências
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Anexos do chamado
              </h2>
            </div>

            <div className="space-y-3">
              {anexos.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-300 transition hover:bg-blue-500/20"
                >
                  <span className="text-xl transition-transform group-hover:scale-110">📄</span>
                  <span className="min-w-0 flex-1 truncate">
                    {a.nome_arquivo || "Arquivo anexado"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200/70">
                    Abrir
                  </span>
                </a>
              ))}
            </div>
          </Panel>
        )}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/70 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              <div className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/40" />
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Canal de atendimento direto
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Histórico com data, horário, autor e identificação da equipe técnica.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {mensagens.length} mensagem(ns)
          </span>
        </div>

        <div
          ref={scrollRef}
          className="custom-scrollbar min-h-[520px] max-h-[680px] space-y-6 overflow-y-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] p-5 [background-position:center] [background-size:20px_20px] md:p-8"
        >
          {mensagens.length === 0 && (
            <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-slate-800 bg-slate-950 text-5xl">
                💬
              </div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
                Nenhuma mensagem registrada
              </p>
              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                Use o campo abaixo para iniciar o acompanhamento técnico deste chamado.
              </p>
            </div>
          )}

          {mensagens.map((m, index) => {
            const isMe = m.usuario_id === userId
            const isUre = URE_ROLES.includes(m.usuarios?.role)
            const atualKey = dataKey(m.created_at)
            const anteriorKey = index > 0 ? dataKey(mensagens[index - 1]?.created_at) : ""
            const mostrarSeparador = atualKey !== anteriorKey

            return (
              <div key={m.id || `${m.created_at}-${index}`} className="space-y-5">
                {mostrarSeparador && (
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {dataSeparador(m.created_at)}
                    </span>
                    <div className="h-px flex-1 bg-slate-800" />
                  </div>
                )}

                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex max-w-[88%] flex-col md:max-w-[76%] ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`mb-2 flex items-center gap-2 px-1 ${
                        isMe ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                          isUre
                            ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                            : "border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {getInitials(m.usuarios?.nome)}
                      </div>

                      <div className={isMe ? "text-right" : "text-left"}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {m.usuarios?.nome || "Usuário"}
                          </span>

                          {isUre && (
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-300">
                              Equipe técnica
                            </span>
                          )}
                        </div>

                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                          {formatarDataMensagem(m.created_at)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${
                        isMe
                          ? "rounded-tr-none bg-blue-600 text-white shadow-blue-950/20"
                          : "rounded-tl-none border border-slate-700 bg-slate-800 text-slate-200 shadow-slate-950/20"
                      }`}
                    >
                      {m.mensagem}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {!chamadoEncerrado ? (
          <div className="border-t border-slate-800 bg-slate-950/80 p-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-[#0B1120] p-3 shadow-inner transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 md:flex-row md:items-end">
              <textarea
                value={novaMsg}
                onChange={(e) => setNovaMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua resposta técnica..."
                rows={2}
                className="custom-scrollbar min-h-[52px] max-h-40 flex-1 resize-none border-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-700"
              />

              <button
                type="button"
                onClick={enviarMensagem}
                disabled={enviando || !novaMsg.trim()}
                className="min-h-[48px] rounded-2xl bg-blue-600 px-7 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {enviando ? "Enviando..." : "Responder"}
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-1 px-2 text-[9px] font-bold uppercase tracking-widest text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>Enter para enviar | Shift + Enter para nova linha</p>
              <p>SETEC Hub Management</p>
            </div>
          </div>
        ) : (
          <div className="border-t border-red-500/10 bg-red-500/5 p-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
            Protocolo finalizado — chat desativado
          </div>
        )}
      </section>

      {modalConcluirAberto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#020617] shadow-2xl shadow-slate-950/80">
            <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 px-5 py-5 sm:px-7 sm:py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.12),transparent_34%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    Conclusão técnica
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Registrar parecer final do chamado
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                    O chamado será marcado como resolvido e o parecer ficará registrado na área de devolutiva técnica.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalConcluirAberto(false)}
                  disabled={concluindo}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xl font-black text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                >
                  X
                </button>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Chamado
                </p>
                <p className="mt-2 break-words text-lg font-black text-white">
                  #{chamado.codigo || "N/A"} — {chamado.titulo || "Chamado sem título"}
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Parecer técnico final / devolutiva
                </span>

                <textarea
                  value={parecerFinal}
                  onChange={(e) => setParecerFinal(e.target.value)}
                  placeholder="Descreva a ação realizada, orientação aplicada, solução ou encaminhamento final..."
                  rows={10}
                  className="custom-scrollbar w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm font-medium leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs font-semibold leading-relaxed text-emerald-100/80">
                  Esse registro será salvo em <strong>retorno_devolutivo</strong> e o status será atualizado para <strong>resolvido</strong>.
                  O status <strong>encerrado</strong> continuará sendo o responsável por bloquear definitivamente o chat.
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-5 py-4 sm:px-7">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalConcluirAberto(false)}
                  disabled={concluindo}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={concluirChamado}
                  disabled={concluindo || !parecerFinal.trim()}
                  className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {concluindo ? "Concluindo..." : "Concluir chamado"}
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
      `}</style>
    </div>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
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

function InfoBox({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-red-500/25 bg-red-500/10"
          : "border-slate-800 bg-slate-950/70"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-black ${
          highlight ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}