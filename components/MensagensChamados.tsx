"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type ChamadoRelacionado =
  | {
      id: string
      codigo: string | null
      titulo?: string | null
      escola?: string | null
      usuario_id: string | null
      analista_responsavel: string | null
      status?: string | null
    }
  | Array<{
      id: string
      codigo: string | null
      titulo?: string | null
      escola?: string | null
      usuario_id: string | null
      analista_responsavel: string | null
      status?: string | null
    }>
  | null

type MensagemChamado = {
  id: string
  mensagem: string | null
  tipo?: string | null
  created_at: string | null
  usuario_id: string | null
  visualizado?: boolean | null
  chamados: ChamadoRelacionado
}

const ROLES_ATENDIMENTO = ["admin", "analista", "seintec"]
const ROLES_VISAO_URE = ["admin", "analista", "seintec", "chefia_ure", "dirigente"]

function getChamado(mensagem: MensagemChamado) {
  if (Array.isArray(mensagem.chamados)) {
    return mensagem.chamados[0] || null
  }

  return mensagem.chamados || null
}

function getBadgeCount(count: number) {
  if (count > 99) return "99+"
  return String(count)
}

function formatarTempoRelativo(dataIso?: string | null) {
  if (!dataIso) return "Agora"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Agora"

  const diffMs = Date.now() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Agora"
  if (diffMin < 60) return `${diffMin} min`

  const diffHoras = Math.floor(diffMin / 60)

  if (diffHoras < 24) return `${diffHoras}h`

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

function formatarDataHora(dataIso?: string | null) {
  if (!dataIso) return "Sem registro"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizarStatus(status?: string | null) {
  if (!status) return "Sem status"

  return status
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function cortarMensagem(texto?: string | null) {
  const clean = String(texto || "").trim()

  if (!clean) return "Mensagem sem conteúdo textual."

  return clean
}

export default function MensagensChamados() {
  const supabase = useMemo(() => createClient(), [])

  const [mensagens, setMensagens] = useState<MensagemChamado[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState("")
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef<string | null>(null)
  const roleRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const audioLiberadoRef = useRef(false)

  const isAtendimento = role ? ROLES_ATENDIMENTO.includes(role) : false

  const mensagensCount = mensagens.length

  const hrefGeral = isAtendimento ? "/gestao-chamados" : "/chamados"

  function liberarAudio() {
    audioLiberadoRef.current = true
  }

  function tocarSomNotificacao() {
    if (!audioLiberadoRef.current) return
    if (document.visibilityState !== "visible") return

    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext

      if (!AudioContext) return

      const context = new AudioContext()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(587.33, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        880,
        context.currentTime + 0.1
      )

      gainNode.gain.setValueAtTime(0.035, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.28
      )

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.28)

      window.setTimeout(() => {
        context.close().catch(() => null)
      }, 450)
    } catch {
      // Mantém silencioso para não quebrar em navegadores/rede que bloqueiam áudio.
    }
  }

  function getMensagemHref(mensagem: MensagemChamado) {
    const chamado = getChamado(mensagem)

    if (!chamado?.id) return hrefGeral

    if (role && ROLES_VISAO_URE.includes(role)) {
      return `/gestao-chamados/${chamado.id}`
    }

    return `/chamados/${chamado.id}`
  }

  function getDescricaoMensagem(mensagem: MensagemChamado) {
    const chamado = getChamado(mensagem)
    const souResponsavelTecnico =
      chamado?.analista_responsavel === userIdRef.current
    const souDonoDoChamado = chamado?.usuario_id === userIdRef.current

    if (isAtendimento && souResponsavelTecnico) {
      return "A unidade escolar ou setor solicitante enviou uma nova resposta."
    }

    if (souDonoDoChamado) {
      return "Há uma nova atualização no chat do seu chamado."
    }

    return "Nova movimentação registrada em um chamado."
  }

  const carregarDados = useCallback(
    async (modo: "inicial" | "manual" | "silencioso" = "silencioso") => {
      const userId = userIdRef.current
      const userRole = roleRef.current

      if (!userId || !userRole) return

      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setErro("")

      try {
        const { data: msgData, error: msgError } = await supabase
          .from("chamado_mensagens")
          .select(
            `
            id,
            mensagem,
            tipo,
            created_at,
            usuario_id,
            visualizado,
            chamados (
              id,
              codigo,
              titulo,
              escola,
              usuario_id,
              analista_responsavel,
              status
            )
          `
          )
          .eq("visualizado", false)
          .order("created_at", { ascending: false })
          .limit(60)

        if (msgError) throw msgError

        const dados = ((msgData || []) as MensagemChamado[]).filter(
          (mensagem) => {
            const chamado = getChamado(mensagem)

            if (!chamado) return false

            const souDonoDoChamado = chamado.usuario_id === userId
            const souResponsavelTecnico =
              chamado.analista_responsavel === userId
            const mensagemEnviadaPorMim = mensagem.usuario_id === userId

            if (mensagemEnviadaPorMim) return false

            if (ROLES_ATENDIMENTO.includes(userRole)) {
              if (souResponsavelTecnico) return true
            }

            if (souDonoDoChamado) return true

            return false
          }
        )

        if (!mountedRef.current) return

        setMensagens(dados)
        setLastUpdate(new Date().toISOString())
      } catch (error) {
        console.error("[MensagensChamados] Erro ao carregar mensagens:", error)

        if (!mountedRef.current) return

        setErro("Não foi possível carregar as mensagens.")
        setMensagens([])
      } finally {
        if (!mountedRef.current) return

        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  const carregarDebounced = useCallback(
    (comSom = false) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(async () => {
        await carregarDados("silencioso")

        if (comSom) {
          tocarSomNotificacao()
        }
      }, 350)
    },
    [carregarDados]
  )

  useEffect(() => {
    mountedRef.current = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function inicializar() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          setLoading(false)
          return
        }

        const { data: userProfile, error: profileError } = await supabase
          .from("usuarios")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) throw profileError

        const userRole = userProfile?.role || null

        userIdRef.current = user.id
        roleRef.current = userRole

        if (!mountedRef.current) return

        setRole(userRole)

        if (!userRole) {
          setLoading(false)
          return
        }

        await carregarDados("inicial")

        channel = supabase
          .channel(`mensagens-chamados-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "chamado_mensagens",
            },
            () => {
              carregarDebounced(true)
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "chamado_mensagens",
            },
            () => {
              carregarDebounced(false)
            }
          )
          .subscribe()
      } catch (error) {
        console.error("[MensagensChamados] Erro ao inicializar:", error)

        if (!mountedRef.current) return

        setErro("Falha ao iniciar mensagens.")
        setLoading(false)
      }
    }

    inicializar()

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        carregarDados("silencioso")
      }
    }

    window.addEventListener("pointerdown", liberarAudio, { once: true })
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      mountedRef.current = false

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (channel) {
        supabase.removeChannel(channel)
      }

      window.removeEventListener("pointerdown", liberarAudio)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [supabase, carregarDados, carregarDebounced])

  async function marcarComoLida(id: string) {
    const anterior = mensagens

    setMensagens((prev) => prev.filter((mensagem) => mensagem.id !== id))

    const { error } = await supabase
      .from("chamado_mensagens")
      .update({ visualizado: true })
      .eq("id", id)

    if (error) {
      console.error("[MensagensChamados] Erro ao marcar mensagem como lida:", error)

      setMensagens(anterior)
      setErro("Não foi possível marcar a mensagem como lida.")
    }
  }

  async function marcarTodasComoLidas() {
    if (mensagens.length === 0) return

    const ids = mensagens.map((mensagem) => mensagem.id)
    const anterior = mensagens

    setMensagens([])

    const { error } = await supabase
      .from("chamado_mensagens")
      .update({ visualizado: true })
      .in("id", ids)

    if (error) {
      console.error("[MensagensChamados] Erro ao marcar todas como lidas:", error)

      setMensagens(anterior)
      setErro("Não foi possível marcar todas como lidas.")
    }
  }

  if (!role) return null

  return (
    <div ref={containerRef} className="relative flex h-full items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          mensagensCount > 0
            ? `${mensagensCount} mensagem nova em chamados`
            : "Mensagens dos chamados"
        }
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 ${
          open
            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_22px_rgba(6,182,212,0.22)]"
            : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white"
        }`}
      >
        <InboxIcon className="h-5 w-5" />

        {mensagensCount > 0 && (
          <>
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.9)]" />

            <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-[#020617] bg-blue-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-lg">
              {getBadgeCount(mensagensCount)}
            </span>
          </>
        )}

        {loading && (
          <span className="absolute inset-0 rounded-2xl border border-cyan-500/20">
            <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
          </span>
        )}
      </button>

      {open && (
        <section className="fixed right-3 top-20 z-[999] w-[calc(100vw-1.5rem)] max-w-[430px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-2xl shadow-black/40 sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:w-[430px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.08),transparent_32%)]" />

          <div className="relative z-10 border-b border-slate-800 bg-slate-950/80 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                    <ChatIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">
                      Retornos no chat
                    </h3>

                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                      Mensagens não visualizadas nos chamados.
                    </p>
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  mensagensCount > 0
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {mensagensCount > 0 ? `${getBadgeCount(mensagensCount)} nova(s)` : "Em dia"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-slate-600">
                Atualizado:{" "}
                <span className="text-slate-400">
                  {lastUpdate ? formatarDataHora(lastUpdate) : "carregando..."}
                </span>
              </p>

              <div className="flex items-center gap-2">
                {mensagensCount > 0 && (
                  <button
                    type="button"
                    onClick={marcarTodasComoLidas}
                    className="hidden rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 sm:inline-flex"
                  >
                    Limpar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => carregarDados("manual")}
                  disabled={refreshing || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshIcon
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-h-[390px] overflow-y-auto custom-scrollbar">
            {erro ? (
              <div className="p-6">
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center">
                  <AlertIcon className="mx-auto h-7 w-7 text-red-300" />

                  <p className="mt-3 text-sm font-bold text-red-200">
                    Erro ao carregar
                  </p>

                  <p className="mt-1 text-xs font-medium leading-relaxed text-red-200/70">
                    {erro}
                  </p>

                  <button
                    type="button"
                    onClick={() => carregarDados("manual")}
                    className="mt-4 rounded-xl bg-red-500/15 px-4 py-2 text-xs font-bold text-red-200 transition-all hover:bg-red-500/25"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <LoadingItem key={index} />
                ))}
              </div>
            ) : mensagens.length > 0 ? (
              <div className="divide-y divide-slate-800/70">
                {mensagens.map((mensagem) => {
                  const chamado = getChamado(mensagem)
                  const href = getMensagemHref(mensagem)

                  return (
                    <Link
                      key={mensagem.id}
                      href={href}
                      onClick={() => {
                        marcarComoLida(mensagem.id)
                        setOpen(false)
                      }}
                      className="group block p-4 transition-all hover:bg-slate-900/75"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                          <ChatIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-300">
                              Chamado #{chamado?.codigo || "sem código"}
                            </span>

                            <span className="shrink-0 text-[10px] font-semibold text-slate-600">
                              {formatarTempoRelativo(mensagem.created_at)}
                            </span>
                          </div>

                          <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-slate-200 group-hover:text-white">
                            {getDescricaoMensagem(mensagem)}
                          </p>

                          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/55 p-3">
                            <p className="line-clamp-2 text-xs font-medium italic leading-relaxed text-slate-400">
                              “{cortarMensagem(mensagem.mensagem)}”
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {chamado?.escola && (
                              <span className="max-w-full truncate rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {chamado.escola}
                              </span>
                            )}

                            {chamado?.status && (
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {normalizarStatus(chamado.status)}
                              </span>
                            )}
                          </div>
                        </div>

                        <ExternalIcon className="mt-1 h-4 w-4 shrink-0 text-slate-700 transition-all group-hover:text-cyan-300" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-8">
                <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/45 p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                    <CheckIcon className="h-7 w-7" />
                  </div>

                  <p className="mt-4 text-sm font-bold text-white">
                    Nenhuma mensagem nova
                  </p>

                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                    Quando houver retorno no chat dos chamados, ele aparecerá aqui.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 border-t border-slate-800 bg-slate-950/90 p-3">
            <Link
              href={hrefGeral}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-blue-500"
            >
              {isAtendimento ? "Acessar Painel de Gestão" : "Ver Meus Chamados"}
              <ExternalIcon className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

function LoadingItem() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-800" />

        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-800" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-800" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-800" />
        </div>
      </div>
    </div>
  )
}

function SvgBase({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      {children}
    </svg>
  )
}

function InboxIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 12.75v3.75a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25v-3.75m19.5 0-3.658-6.401A2.25 2.25 0 0 0 15.938 5.25H8.062a2.25 2.25 0 0 0-1.954 1.099L2.25 12.75m19.5 0h-6.879a2.25 2.25 0 0 0-2.012 1.244l-.718 1.436a1.125 1.125 0 0 1-2.012 0l-.718-1.436A2.25 2.25 0 0 0 7.129 12.75H2.25"
      />
    </SvgBase>
  )
}

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12c0 4.142-4.03 7.5-9 7.5a10.76 10.76 0 0 1-3.55-.596L3 21l1.604-4.01A7.083 7.083 0 0 1 3 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5Z"
      />
    </SvgBase>
  )
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992M20.49 4.51v4.838h-4.838M7.977 14.652H2.985M3.51 19.49v-4.838h4.838m11.154-2.69a7.5 7.5 0 0 0-12.728-4.228M4.498 12.04a7.5 7.5 0 0 0 12.728 4.228"
      />
    </SvgBase>
  )
}

function ExternalIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H18m0 0v4.5M18 6l-6.75 6.75M6 7.5v10.5h10.5"
      />
    </SvgBase>
  )
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </SvgBase>
  )
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm-9.303 1.083 8.25-14.25a1.5 1.5 0 0 1 2.606 0l8.25 14.25A1.5 1.5 0 0 1 20.5 21h-17a1.5 1.5 0 0 1-1.303-2.167Z"
      />
    </SvgBase>
  )
}