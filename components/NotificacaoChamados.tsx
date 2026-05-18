"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type ChamadoNotificacao = {
  id: string
  codigo: string | null
  titulo?: string | null
  escola: string | null
  categoria: string | null
  prioridade?: string | null
  status: string | null
  created_at: string | null
  updated_at?: string | null
  usuario_id: string | null
  analista_responsavel: string | null
  visualizado_pelo_usuario?: boolean | null
}

const GESTAO_ATENDIMENTO = ["admin", "analista", "seintec"]
const VISAO_URE = ["admin", "analista", "seintec", "chefia_ure", "dirigente"]

function normalizarStatus(status?: string | null) {
  if (!status) return "Sem status"

  return status
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

function getPrioridadeClass(prioridade?: string | null) {
  const value = String(prioridade || "").toLowerCase()

  if (value.includes("alta") || value.includes("urgente") || value.includes("crítica") || value.includes("critica")) {
    return "border-red-500/30 bg-red-500/10 text-red-300"
  }

  if (value.includes("média") || value.includes("media")) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
  }

  if (value.includes("baixa")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getStatusClass(status?: string | null) {
  const value = String(status || "").toLowerCase()

  if (value === "aberto") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300"
  }

  if (value.includes("andamento") || value.includes("em_atendimento")) {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
  }

  if (value.includes("resolvido") || value.includes("fechado") || value.includes("concluido")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (value.includes("devolutiva") || value.includes("pendente")) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getBadgeCount(count: number) {
  if (count > 99) return "99+"
  return String(count)
}

export default function NotificacaoChamados() {
  const supabase = useMemo(() => createClient(), [])

  const [count, setCount] = useState(0)
  const [role, setRole] = useState<string | null>(null)
  const [chamados, setChamados] = useState<ChamadoNotificacao[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState("")
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const userIdRef = useRef<string | null>(null)
  const roleRef = useRef<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const isGestao = role ? GESTAO_ATENDIMENTO.includes(role) : false

  const hrefGeral = isGestao ? "/gestao-chamados" : "/chamados"

  function getChamadoHref(chamadoId: string) {
    if (role && VISAO_URE.includes(role)) {
      return `/gestao-chamados/${chamadoId}`
    }

    return `/chamados/${chamadoId}`
  }

  const carregar = useCallback(
    async (modo: "inicial" | "manual" | "silencioso" = "silencioso") => {
      const uId = userIdRef.current
      const uRole = roleRef.current

      if (!uId || !uRole) return

      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setErro("")

      try {
        let result

        if (GESTAO_ATENDIMENTO.includes(uRole)) {
          result = await supabase
            .from("chamados")
            .select(
              "id, codigo, titulo, escola, categoria, prioridade, status, created_at, updated_at, usuario_id, analista_responsavel",
              { count: "exact" }
            )
            .eq("status", "aberto")
            .is("analista_responsavel", null)
            .order("created_at", { ascending: false })
            .limit(8)
        } else {
          result = await supabase
            .from("chamados")
            .select(
              "id, codigo, titulo, escola, categoria, prioridade, status, created_at, updated_at, usuario_id, analista_responsavel, visualizado_pelo_usuario",
              { count: "exact" }
            )
            .eq("usuario_id", uId)
            .eq("visualizado_pelo_usuario", false)
            .neq("status", "aberto")
            .order("updated_at", { ascending: false })
            .limit(8)
        }

        if (result.error) {
          throw result.error
        }

        if (!mountedRef.current) return

        setChamados((result.data || []) as ChamadoNotificacao[])
        setCount(typeof result.count === "number" ? result.count : result.data?.length || 0)
        setLastUpdate(new Date().toISOString())
      } catch (error) {
        console.error("[NotificacaoChamados] Erro ao carregar notificações:", error)

        if (!mountedRef.current) return

        setErro("Não foi possível carregar as notificações.")
        setChamados([])
        setCount(0)
      } finally {
        if (!mountedRef.current) return

        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  const carregarDebounced = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      carregar("silencioso")
    }, 350)
  }, [carregar])

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

        const { data: profile, error: profileError } = await supabase
          .from("usuarios")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) throw profileError

        const roleAtual = profile?.role || null

        userIdRef.current = user.id
        roleRef.current = roleAtual

        if (!mountedRef.current) return

        setRole(roleAtual)

        if (!roleAtual) {
          setLoading(false)
          return
        }

        await carregar("inicial")

        channel = supabase
          .channel(`notificacoes-chamados-${user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "chamados" },
            () => {
              carregarDebounced()
            }
          )
          .subscribe()
      } catch (error) {
        console.error("[NotificacaoChamados] Erro ao inicializar:", error)

        if (!mountedRef.current) return

        setErro("Falha ao iniciar notificações.")
        setLoading(false)
      }
    }

    inicializar()

    function handleFora(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        carregar("silencioso")
      }
    }

    document.addEventListener("mousedown", handleFora)
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

      document.removeEventListener("mousedown", handleFora)
      document.removeEventListener("keydown", handleEsc)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [supabase, carregar, carregarDebounced])

  if (!role) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={
          count > 0
            ? `${count} notificação de chamado`
            : "Notificações de chamados"
        }
        aria-expanded={isOpen}
        className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 ${
          isOpen
            ? "border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-[0_0_22px_rgba(37,99,235,0.22)]"
            : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white"
        }`}
      >
        <BellIcon className="h-5 w-5" />

        {count > 0 && (
          <>
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.9)]" />

            <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-[#020617] bg-red-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-lg">
              {getBadgeCount(count)}
            </span>
          </>
        )}

        {loading && (
          <span className="absolute inset-0 rounded-2xl border border-blue-500/20">
            <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400" />
          </span>
        )}
      </button>

      {isOpen && (
        <section className="fixed right-3 top-20 z-[999] w-[calc(100vw-1.5rem)] max-w-[430px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-2xl shadow-black/40 sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:w-[430px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_32%)]" />

          <div className="relative z-10 border-b border-slate-800 bg-slate-950/80 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
                    <BellIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">
                      {isGestao ? "Fila de chamados" : "Atualizações dos chamados"}
                    </h3>

                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                      {isGestao
                        ? "Chamados abertos aguardando responsável."
                        : "Movimentações recentes nos seus registros."}
                    </p>
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  count > 0
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {count > 0 ? `${getBadgeCount(count)} alerta(s)` : "Em dia"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-slate-600">
                Atualizado:{" "}
                <span className="text-slate-400">
                  {lastUpdate ? formatarDataHora(lastUpdate) : "carregando..."}
                </span>
              </p>

              <button
                type="button"
                onClick={() => carregar("manual")}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-300 transition-all hover:border-blue-500/40 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Atualizar
              </button>
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
                    onClick={() => carregar("manual")}
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
            ) : chamados.length > 0 ? (
              <div className="divide-y divide-slate-800/70">
                {chamados.map((chamado) => {
                  const dataReferencia = chamado.updated_at || chamado.created_at

                  return (
                    <Link
                      key={chamado.id}
                      href={getChamadoHref(chamado.id)}
                      onClick={() => setIsOpen(false)}
                      className="group block p-4 transition-all hover:bg-slate-900/75"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                            isGestao
                              ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          <TicketIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span
                              className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${
                                isGestao
                                  ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                                  : getStatusClass(chamado.status)
                              }`}
                            >
                              {isGestao
                                ? "Aguardando técnico"
                                : normalizarStatus(chamado.status)}
                            </span>

                            <span className="shrink-0 text-[10px] font-semibold text-slate-600">
                              {formatarTempoRelativo(dataReferencia)}
                            </span>
                          </div>

                          <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-slate-200 group-hover:text-white">
                            {isGestao ? (
                              <>
                                Chamado{" "}
                                <span className="text-blue-300">
                                  {chamado.codigo || "sem código"}
                                </span>{" "}
                                entrou na fila sem responsável.
                              </>
                            ) : (
                              <>
                                Seu chamado{" "}
                                <span className="text-emerald-300">
                                  {chamado.codigo || "sem código"}
                                </span>{" "}
                                recebeu atualização.
                              </>
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {chamado.escola && (
                              <span className="max-w-full truncate rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {chamado.escola}
                              </span>
                            )}

                            {chamado.categoria && (
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {chamado.categoria}
                              </span>
                            )}

                            {chamado.prioridade && (
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getPrioridadeClass(
                                  chamado.prioridade
                                )}`}
                              >
                                {chamado.prioridade}
                              </span>
                            )}
                          </div>
                        </div>

                        <ExternalIcon className="mt-1 h-4 w-4 shrink-0 text-slate-700 transition-all group-hover:text-blue-300" />
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
                    Nenhuma notificação nova
                  </p>

                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                    {isGestao
                      ? "Não há chamados abertos sem técnico responsável no momento."
                      : "Você está em dia com as atualizações dos seus chamados."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 border-t border-slate-800 bg-slate-950/90 p-3">
            <Link
              href={hrefGeral}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-blue-500"
            >
              {isGestao ? "Acessar Painel de Gestão" : "Ver Meus Chamados"}
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

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a3 3 0 1 1-5.714 0"
      />
    </SvgBase>
  )
}

function TicketIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 6.75V5.25A2.25 2.25 0 0 0 14.25 3h-4.5A2.25 2.25 0 0 0 7.5 5.25v1.5M3.75 8.25h16.5v9A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25v-9ZM9 12h6"
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