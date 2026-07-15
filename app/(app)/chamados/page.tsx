"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

type Chamado = {
  id: string | number
  codigo?: string | number | null
  titulo?: string | null
  solicitante_nome?: string | null
  categoria?: string | null
  status?: string | null
  created_at?: string | null
}

type StatusFiltro =
  | "todos"
  | "aberto"
  | "assumido"
  | "em_atendimento"
  | "resolvido"

type MensagemTela = {
  tipo: "error" | "success" | "info"
  texto: string
} | null

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  assumido: "Assumido",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
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

function formatarData(data?: string | null) {
  if (!data) return "Sem data"

  const date = new Date(data)

  if (Number.isNaN(date.getTime())) return "Sem data"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusLabel(status?: string | null) {
  const key = normalizarTexto(status)
  return STATUS_LABELS[key] || textoSeguro(status, "Sem status").replaceAll("_", " ")
}

function getStatusClass(status?: string | null) {
  const key = normalizarTexto(status)

  if (key === "aberto") {
    return "border-blue-500/25 bg-blue-500/10 text-blue-300"
  }

  if (key === "assumido") {
    return "border-violet-500/25 bg-violet-500/10 text-violet-300"
  }

  if (key === "em_atendimento") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300"
  }

  if (key === "resolvido") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getStatusDot(status?: string | null) {
  const key = normalizarTexto(status)

  if (key === "aberto") return "bg-blue-400"
  if (key === "assumido") return "bg-violet-400"
  if (key === "em_atendimento") return "bg-amber-400"
  if (key === "resolvido") return "bg-emerald-400"

  return "bg-slate-500"
}

export default function ChamadosPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [chamados, setChamados] = useState<Chamado[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos")
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const carregarChamados = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setMensagem(null)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!session?.user) {
          setChamados([])
          setRole(null)
          return
        }

        const [usuarioResult, chamadosResult] = await Promise.all([
          supabase
            .from("usuarios")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("chamados")
            .select("*")
            .eq("usuario_id", session.user.id)
            .order("created_at", { ascending: false }),
        ])

        if (usuarioResult.error) {
          console.warn("[Meus Chamados] Não foi possível carregar a role:", usuarioResult.error)
        }

        if (chamadosResult.error) throw chamadosResult.error

        setRole(usuarioResult.data?.role ?? null)
        setChamados((chamadosResult.data || []) as Chamado[])

        if (modo === "manual") {
          setMensagem({
            tipo: "success",
            texto: "Lista de chamados atualizada.",
          })
        }
      } catch (error) {
        console.error("[Meus Chamados] Erro ao carregar:", error)

        setMensagem({
          tipo: "error",
          texto:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os chamados.",
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase],
  )

  useEffect(() => {
    carregarChamados("inicial")
  }, [carregarChamados])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  const stats = useMemo(() => {
    const total = chamados.length
    const abertos = chamados.filter(
      (chamado) => normalizarTexto(chamado.status) === "aberto",
    ).length
    const emAndamento = chamados.filter((chamado) =>
      ["assumido", "em_atendimento"].includes(normalizarTexto(chamado.status)),
    ).length
    const resolvidos = chamados.filter(
      (chamado) => normalizarTexto(chamado.status) === "resolvido",
    ).length

    return { total, abertos, emAndamento, resolvidos }
  }, [chamados])

  const chamadosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    return chamados.filter((chamado) => {
      const matchStatus =
        statusFiltro === "todos" ||
        normalizarTexto(chamado.status) === statusFiltro

      if (!matchStatus) return false
      if (!termo) return true

      const conteudo = [
        chamado.codigo,
        chamado.titulo,
        chamado.solicitante_nome,
        chamado.categoria,
        chamado.status,
      ]
        .map(normalizarTexto)
        .join(" ")

      return conteudo.includes(termo)
    })
  }, [busca, chamados, statusFiltro])

  const filtrosAtivos = Boolean(busca.trim()) || statusFiltro !== "todos"

  const podeAbrirEscola = role === "gestao_escolas" || role === "admin"

  const podeAbrirURE = [
    "admin",
    "analista",
    "chefia_ure",
    "dirigente",
    "seintec",
  ].includes(role ?? "")

  function abrirChamado(id: Chamado["id"]) {
    router.push(`/chamados/${encodeURIComponent(String(id))}`)
  }

  function limparFiltros() {
    setBusca("")
    setStatusFiltro("todos")
  }

  if (loading) {
    return <LoadingPage />
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/25 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Central de atendimento
              </span>

              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Meus chamados
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300 sm:flex">
                <TicketIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  Meus Chamados
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Acompanhe suas solicitações, consulte o andamento e abra um
                  novo atendimento quando necessário.
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            {podeAbrirURE && (
              <Link
                href="/chamados/ure"
                className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 xl:flex-none"
              >
                <PlusIcon className="h-5 w-5" />
                Novo chamado URE
              </Link>
            )}

            {podeAbrirEscola && (
              <Link
                href="/chamados/escola"
                className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-black text-violet-200 transition hover:bg-violet-500/20 xl:flex-none"
              >
                <PlusIcon className="h-5 w-5" />
                Novo chamado Escola
              </Link>
            )}

            <button
              type="button"
              onClick={() => carregarChamados("manual")}
              disabled={refreshing}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-300 transition hover:border-blue-500/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
              title="Atualizar chamados"
            >
              <RefreshIcon
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="sm:hidden">Atualizar</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat
            label="Total"
            value={stats.total}
            detail="Solicitações registradas"
            tone="slate"
          />
          <MiniStat
            label="Abertos"
            value={stats.abertos}
            detail="Aguardando atendimento"
            tone="blue"
          />
          <MiniStat
            label="Em andamento"
            value={stats.emAndamento}
            detail="Assumidos ou atendendo"
            tone="amber"
          />
          <MiniStat
            label="Resolvidos"
            value={stats.resolvidos}
            detail="Atendimentos concluídos"
            tone="emerald"
          />
        </div>
      </section>

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

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl shadow-slate-950/20 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
              <SearchIcon className="h-4 w-4" />
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por código, título, solicitante ou categoria..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
            />
          </div>

          <select
            value={statusFiltro}
            onChange={(event) =>
              setStatusFiltro(event.target.value as StatusFiltro)
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
          >
            <option value="todos">Todos os status</option>
            <option value="aberto">Abertos</option>
            <option value="assumido">Assumidos</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="resolvido">Resolvidos</option>
          </select>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <span className="text-xs font-bold text-slate-500">
              <strong className="text-blue-300">{chamadosFiltrados.length}</strong>{" "}
              chamado(s)
            </span>

            {filtrosAtivos && (
              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/30 hover:text-blue-300"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </section>

      {chamados.length === 0 ? (
        <EmptyState
          podeAbrirURE={podeAbrirURE}
          podeAbrirEscola={podeAbrirEscola}
        />
      ) : chamadosFiltrados.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-800 bg-[#020617] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-500">
            <SearchIcon className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-lg font-black text-white">
            Nenhum chamado encontrado
          </h2>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Ajuste a busca ou selecione outro status.
          </p>

          <button
            type="button"
            onClick={limparFiltros}
            className="mt-5 rounded-xl border border-blue-500/25 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {chamadosFiltrados.map((chamado) => (
              <MobileChamadoCard
                key={String(chamado.id)}
                chamado={chamado}
                onClick={() => abrirChamado(chamado.id)}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] shadow-xl shadow-slate-950/20 md:block">
            <div className="max-h-[680px] overflow-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-6 py-4">Chamado</th>
                    <th className="px-6 py-4">Título</th>
                    <th className="px-6 py-4">Solicitante</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Abertura</th>
                    <th className="w-16 px-6 py-4" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70">
                  {chamadosFiltrados.map((chamado) => (
                    <tr
                      key={String(chamado.id)}
                      tabIndex={0}
                      role="button"
                      onClick={() => abrirChamado(chamado.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          abrirChamado(chamado.id)
                        }
                      }}
                      className="group cursor-pointer bg-[#020617] transition hover:bg-slate-900/70 focus:bg-slate-900/70 focus:outline-none"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDot(
                              chamado.status,
                            )}`}
                          />
                          <span className="font-black tracking-wide text-slate-400 transition group-hover:text-blue-300">
                            #{textoSeguro(chamado.codigo, String(chamado.id))}
                          </span>
                        </div>
                      </td>

                      <td className="max-w-[330px] px-6 py-5">
                        <p
                          className="truncate font-black text-white transition group-hover:text-blue-200"
                          title={textoSeguro(chamado.titulo)}
                        >
                          {textoSeguro(chamado.titulo)}
                        </p>
                      </td>

                      <td className="max-w-[190px] px-6 py-5">
                        <p
                          className="truncate font-semibold text-slate-400"
                          title={textoSeguro(chamado.solicitante_nome, "-")}
                        >
                          {textoSeguro(chamado.solicitante_nome, "-")}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-400">
                          {textoSeguro(chamado.categoria, "Sem categoria")}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <StatusBadge status={chamado.status} />
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-500">
                        {formatarData(chamado.created_at)}
                      </td>

                      <td className="px-6 py-5 text-right text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-300">
                        <ChevronIcon className="inline-block h-5 w-5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MobileChamadoCard({
  chamado,
  onClick,
}: {
  chamado: Chamado
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[1.5rem] border border-slate-800 bg-[#020617] p-4 text-left shadow-lg shadow-slate-950/20 transition hover:border-blue-500/30 hover:bg-slate-900/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDot(
              chamado.status,
            )}`}
          />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            #{textoSeguro(chamado.codigo, String(chamado.id))}
          </span>
        </div>

        <StatusBadge status={chamado.status} />
      </div>

      <h2 className="mt-4 line-clamp-2 text-base font-black leading-snug text-white transition group-hover:text-blue-200">
        {textoSeguro(chamado.titulo)}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileInfo
          label="Solicitante"
          value={textoSeguro(chamado.solicitante_nome, "-")}
        />
        <MobileInfo
          label="Categoria"
          value={textoSeguro(chamado.categoria, "Sem categoria")}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
        <span className="text-xs font-semibold text-slate-600">
          {formatarData(chamado.created_at)}
        </span>

        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300">
          Abrir chamado
          <ChevronIcon className="h-4 w-4" />
        </span>
      </div>
    </button>
  )
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-slate-300" title={value}>
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${getStatusClass(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}

function MiniStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone: "slate" | "blue" | "amber" | "emerald"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-[10px] font-bold opacity-75" title={detail}>
        {detail}
      </p>
    </div>
  )
}

function EmptyState({
  podeAbrirURE,
  podeAbrirEscola,
}: {
  podeAbrirURE: boolean
  podeAbrirEscola: boolean
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-800 bg-[#020617] p-8 text-center shadow-xl shadow-slate-950/20">
      <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-slate-800 bg-slate-950 text-slate-500">
        <TicketIcon className="h-9 w-9" />
      </div>

      <h2 className="mt-5 text-xl font-black text-white">
        Nenhum chamado registrado
      </h2>

      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        Você ainda não possui solicitações de suporte. Utilize uma das opções
        disponíveis para iniciar um novo atendimento.
      </p>

      {(podeAbrirURE || podeAbrirEscola) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {podeAbrirURE && (
            <Link
              href="/chamados/ure"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500"
            >
              <PlusIcon className="h-4 w-4" />
              Novo chamado URE
            </Link>
          )}

          {podeAbrirEscola && (
            <Link
              href="/chamados/escola"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-5 text-sm font-black text-violet-200 transition hover:bg-violet-500/20"
            >
              <PlusIcon className="h-4 w-4" />
              Novo chamado Escola
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <div className="h-[310px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      <div className="h-[76px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      <div className="h-[420px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
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
      strokeWidth={1.9}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function TicketIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v2.1a2.25 2.25 0 0 0 0 4.3v2.1a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 15.25v-2.1a2.25 2.25 0 0 0 0-4.3v-2.1Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5v9"
      />
    </SvgBase>
  )
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m20.25 20.25-4.35-4.35m1.35-5.4a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
      />
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

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.75v4.5h-4.5M3.75 17.25v-4.5h4.5M5.69 9A7.5 7.5 0 0 1 18 6.75l2.25 4.5M18.31 15A7.5 7.5 0 0 1 6 17.25l-2.25-4.5"
      />
    </SvgBase>
  )
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </SvgBase>
  )
}