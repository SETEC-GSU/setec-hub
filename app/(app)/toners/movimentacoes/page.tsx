"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"

type Movimentacao = {
  id: string | number
  tipo_movimentacao: string
  tonner_nome: string | null
  quantidade: number
  impressora: string | null
  numero_chamado: string | null
  data_abertura: string | null
  data_movimentacao: string
  usuario_nome: string | null
}

export default function HistoricoMovimentacoes() {
  const supabase = createClient()

  const [dados, setDados] = useState<Movimentacao[]>([])
  const [filtro, setFiltro] = useState("")
  const [loading, setLoading] = useState(true)

  /* filtros */

  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroToner, setFiltroToner] = useState("")
  const [filtroUsuario, setFiltroUsuario] = useState("")

  const [listaToners, setListaToners] = useState<string[]>([])
  const [listaUsuarios, setListaUsuarios] = useState<string[]>([])

  /* métricas */

  const [totalEntradas, setTotalEntradas] = useState(0)
  const [totalSaidas, setTotalSaidas] = useState(0)
  const [mediaAtendimento, setMediaAtendimento] = useState(0)
  const [totalChamados, setTotalChamados] = useState(0)

  async function carregar() {
    setLoading(true)

    const { data, error } = await supabase
      .from("tonners_movimentacoes_view")
      .select("*")
      .order("data_movimentacao", { ascending: false })

    if (error) {
      console.error(error)
    }

    const movimentacoes = (data || []) as Movimentacao[]

    setDados(movimentacoes)

    /* listas de filtros */

    const toners = [
      ...new Set(
        movimentacoes.map((item) => item.tonner_nome).filter(Boolean)
      ),
    ] as string[]

    const usuarios = [
      ...new Set(
        movimentacoes.map((item) => item.usuario_nome).filter(Boolean)
      ),
    ] as string[]

    setListaToners(toners)
    setListaUsuarios(usuarios)

    calcularMetricas(movimentacoes)

    setLoading(false)
  }

  /* métricas */

  function calcularMetricas(lista: Movimentacao[]) {
    let entradas = 0
    let saidas = 0
    let somaTempo = 0
    let countTempo = 0
    let chamados = 0

    lista.forEach((movimentacao) => {
      if (movimentacao.tipo_movimentacao === "ENTRADA") {
        entradas += movimentacao.quantidade

        if (movimentacao.numero_chamado) chamados++

        if (
          movimentacao.data_abertura &&
          movimentacao.data_movimentacao
        ) {
          const abertura = new Date(
            movimentacao.data_abertura
          ).getTime()

          const recebimento = new Date(
            movimentacao.data_movimentacao
          ).getTime()

          if (!Number.isNaN(abertura) && !Number.isNaN(recebimento)) {
            const dias =
              (recebimento - abertura) / (1000 * 60 * 60 * 24)

            if (dias >= 0) {
              somaTempo += dias
              countTempo++
            }
          }
        }
      }

      if (movimentacao.tipo_movimentacao === "SAIDA") {
        saidas += movimentacao.quantidade
      }
    })

    setTotalEntradas(entradas)
    setTotalSaidas(saidas)
    setTotalChamados(chamados)

    if (countTempo > 0) {
      setMediaAtendimento(
        Number((somaTempo / countTempo).toFixed(1))
      )
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  /* filtros */

  const filtrados = dados.filter((movimentacao) => {
    if (
      filtro &&
      !(
        movimentacao.impressora
          ?.toLowerCase()
          .includes(filtro.toLowerCase()) ||
        String(movimentacao.numero_chamado || "").includes(filtro)
      )
    ) {
      return false
    }

    if (
      filtroTipo &&
      movimentacao.tipo_movimentacao !== filtroTipo
    ) {
      return false
    }

    if (
      filtroToner &&
      movimentacao.tonner_nome !== filtroToner
    ) {
      return false
    }

    if (
      filtroUsuario &&
      movimentacao.usuario_nome !== filtroUsuario
    ) {
      return false
    }

    return true
  })

  return (
    <div className="relative mx-auto w-full max-w-[1800px] space-y-7 overflow-hidden pb-12">
      <div className="pointer-events-none absolute -left-48 top-12 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-48 top-[34rem] h-[28rem] w-[28rem] rounded-full bg-blue-500/5 blur-3xl" />

      {/* CABEÇALHO */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/30 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.10),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.85)]" />
                Auditoria de estoque
              </span>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Toners e cilindros
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300 shadow-[0_0_28px_rgba(124,58,237,0.16)] sm:flex">
                <HistoryIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  Histórico de movimentações
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Consulte entradas e saídas, acompanhe chamados, identifique os
                  responsáveis e analise o tempo médio de atendimento dos
                  suprimentos de impressão.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/65 px-5 py-4 backdrop-blur-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
              Registros encontrados
            </p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-3xl font-black text-white">
                {filtrados.length}
              </p>
              <p className="mb-1 text-xs font-bold text-slate-600">
                de {dados.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Toners recebidos"
          value={totalEntradas}
          description="Total registrado como entrada"
          icon={<BoxInIcon className="h-5 w-5" />}
          tone="emerald"
        />

        <MetricCard
          title="Toners utilizados"
          value={totalSaidas}
          description="Total registrado como saída"
          icon={<BoxOutIcon className="h-5 w-5" />}
          tone="red"
        />

        <MetricCard
          title="Tempo médio"
          value={`${mediaAtendimento} dias`}
          description="Da abertura ao recebimento"
          icon={<ClockIcon className="h-5 w-5" />}
          tone="blue"
        />

        <MetricCard
          title="Chamados registrados"
          value={totalChamados}
          description="Entradas vinculadas a chamado"
          icon={<TicketIcon className="h-5 w-5" />}
          tone="amber"
        />
      </section>

      {/* FILTROS */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-600/8 blur-3xl" />

        <div className="relative z-10 mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              Consulta avançada
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Filtros do histórico
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Refine os registros por movimentação, toner, usuário, impressora
              ou número de chamado.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
            <FilterIcon className="h-3.5 w-3.5" />
            {filtrados.length} resultados
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_0.8fr_1fr_1fr]">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
              Busca geral
            </span>

            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

              <input
                placeholder="Buscar por impressora ou chamado..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 pl-11 pr-4 text-sm font-semibold text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </label>

          <FilterSelect
            label="Tipo"
            value={filtroTipo}
            onChange={setFiltroTipo}
          >
            <option value="">Todos os tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </FilterSelect>

          <FilterSelect
            label="Toner"
            value={filtroToner}
            onChange={setFiltroToner}
          >
            <option value="">Todos os toners</option>

            {listaToners.map((toner) => (
              <option key={toner}>{toner}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Usuário"
            value={filtroUsuario}
            onChange={setFiltroUsuario}
          >
            <option value="">Todos os usuários</option>

            {listaUsuarios.map((usuario) => (
              <option key={usuario}>{usuario}</option>
            ))}
          </FilterSelect>
        </div>
      </section>

      {/* LISTAGEM */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              Registros operacionais
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Movimentações
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Histórico completo conforme os filtros aplicados.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              Entrada
            </span>
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-red-300">
              Saída
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="h-11 w-11 animate-spin rounded-full border-2 border-violet-500 border-t-transparent shadow-[0_0_28px_rgba(124,58,237,0.22)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                Carregando movimentações
              </p>
            </div>
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação encontrada"
            description="Altere os filtros ou a busca para visualizar outros registros."
          />
        ) : (
          <>
            {/* CARDS MOBILE */}
            <div className="space-y-3 p-4 md:hidden">
              {filtrados.map((movimentacao) => {
                const tempo = calcularTempo(movimentacao)
                const entrada =
                  movimentacao.tipo_movimentacao === "ENTRADA"

                return (
                  <article
                    key={movimentacao.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                          entrada
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/20 bg-red-500/10 text-red-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            entrada ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                        {movimentacao.tipo_movimentacao}
                      </span>

                      <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
                        {movimentacao.quantidade}
                      </span>
                    </div>

                    <h3 className="mt-4 text-sm font-black text-white">
                      {movimentacao.tonner_nome || "Toner não informado"}
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MobileInfo
                        label="Impressora"
                        value={
                          movimentacao.impressora ||
                          "Não informada"
                        }
                      />
                      <MobileInfo
                        label="Chamado"
                        value={
                          movimentacao.numero_chamado || "-"
                        }
                      />
                      <MobileInfo
                        label="Abertura"
                        value={formatarData(
                          movimentacao.data_abertura
                        )}
                      />
                      <MobileInfo
                        label="Recebimento"
                        value={formatarData(
                          movimentacao.data_movimentacao
                        )}
                      />
                      <MobileInfo label="Tempo" value={tempo} />
                      <MobileInfo
                        label="Usuário"
                        value={
                          movimentacao.usuario_nome ||
                          "Não informado"
                        }
                      />
                    </div>
                  </article>
                )
              })}
            </div>

            {/* TABELA DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1180px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/75">
                    <TableHeader>Tipo</TableHeader>
                    <TableHeader>Toner</TableHeader>
                    <TableHeader>Qtd.</TableHeader>
                    <TableHeader>Impressora</TableHeader>
                    <TableHeader>Chamado</TableHeader>
                    <TableHeader>Abertura</TableHeader>
                    <TableHeader>Recebimento</TableHeader>
                    <TableHeader>Tempo</TableHeader>
                    <TableHeader>Usuário</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {filtrados.map((movimentacao) => {
                    const tempo = calcularTempo(movimentacao)
                    const entrada =
                      movimentacao.tipo_movimentacao ===
                      "ENTRADA"

                    return (
                      <tr
                        key={movimentacao.id}
                        className="border-b border-slate-900 transition hover:bg-slate-900/55"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                              entrada
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : "border-red-500/20 bg-red-500/10 text-red-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                entrada
                                  ? "bg-emerald-400"
                                  : "bg-red-400"
                              }`}
                            />
                            {movimentacao.tipo_movimentacao}
                          </span>
                        </td>

                        <td className="max-w-[240px] px-5 py-4">
                          <p className="truncate font-black text-white">
                            {movimentacao.tonner_nome || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex min-w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 font-black text-slate-200">
                            {movimentacao.quantidade}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-400">
                          {movimentacao.impressora || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-bold text-slate-300">
                            {movimentacao.numero_chamado || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {formatarData(
                            movimentacao.data_abertura
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-400">
                          {formatarData(
                            movimentacao.data_movimentacao
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-300">
                            {tempo}
                          </span>
                        </td>

                        <td className="max-w-[210px] px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-300">
                              <UserIcon className="h-4 w-4" />
                            </div>

                            <p className="truncate text-xs font-black text-violet-300">
                              {movimentacao.usuario_nome ||
                                "Não informado"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "-"

  return new Date(dataIso).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  })
}

function calcularTempo(movimentacao: Movimentacao) {
  if (
    movimentacao.data_abertura &&
    movimentacao.data_movimentacao
  ) {
    const abertura = new Date(movimentacao.data_abertura)
    const recebimento = new Date(
      movimentacao.data_movimentacao
    )

    if (
      !Number.isNaN(abertura.getTime()) &&
      !Number.isNaN(recebimento.getTime())
    ) {
      const dias = Math.round(
        (recebimento.getTime() - abertura.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      return `${dias}d`
    }
  }

  return "-"
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string | number
  description: string
  icon: ReactNode
  tone: "emerald" | "red" | "blue" | "amber"
}) {
  const tones = {
    emerald: {
      card: "border-emerald-500/20 bg-gradient-to-br from-[#020617] to-emerald-950/20",
      icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      value: "text-emerald-300",
    },
    red: {
      card: "border-red-500/20 bg-gradient-to-br from-[#020617] to-red-950/20",
      icon: "border-red-500/20 bg-red-500/10 text-red-300",
      value: "text-red-300",
    },
    blue: {
      card: "border-blue-500/20 bg-gradient-to-br from-[#020617] to-blue-950/20",
      icon: "border-blue-500/20 bg-blue-500/10 text-blue-300",
      value: "text-blue-300",
    },
    amber: {
      card: "border-amber-500/20 bg-gradient-to-br from-[#020617] to-amber-950/20",
      icon: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      value: "text-amber-300",
    },
  }

  const style = tones[tone]

  return (
    <article
      className={`relative overflow-hidden rounded-[1.5rem] border p-5 shadow-xl shadow-slate-950/15 ${style.card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className={`mt-3 text-3xl font-black ${style.value}`}>
            {value}
          </p>
          <p className="mt-2 text-xs font-medium text-slate-600">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </article>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      >
        {children}
      </select>
    </label>
  )
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
      {children}
    </th>
  )
}

function MobileInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="m-4 flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <div>
        <p className="text-sm font-black text-slate-400">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-600">
          {description}
        </p>
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
      strokeWidth={1.9}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function HistoryIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12a9 9 0 1 0 3-6.708M3 4.5v4.5h4.5M12 7.5V12l3 1.5"
      />
    </SvgBase>
  )
}

function BoxInIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 12.75V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-5.25M12 3.75v10.5m0 0 3.75-3.75M12 14.25 8.25 10.5"
      />
    </SvgBase>
  )
}

function BoxOutIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 11.25V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-6.75M12 14.25V3.75m0 0L8.25 7.5M12 3.75l3.75 3.75"
      />
    </SvgBase>
  )
}

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.75V12l3.75 2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
        d="M3.75 5.25h16.5v4.125a2.625 2.625 0 0 0 0 5.25v4.125H3.75v-4.125a2.625 2.625 0 0 0 0-5.25V5.25Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v9" />
    </SvgBase>
  )
}

function FilterIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 5.25h16.5L14.25 12v5.25l-4.5 2.25V12L3.75 5.25Z"
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
        d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
      />
    </SvgBase>
  )
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
      />
    </SvgBase>
  )
}