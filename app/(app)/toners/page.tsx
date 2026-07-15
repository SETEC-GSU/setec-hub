"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type EstoqueItem = {
  tonner_tipo_id: string | number
  tonner_tipo: string
  estoque_atual: number | string | null
}

type Movimentacao = {
  id: string | number
  tipo_movimentacao: string
  impressora: string | null
  data_movimentacao: string
  usuario_nome: string | null
}

const ORDEM_TONERS = [
  "BLACK MONO",
  "BLACK COLOR",
  "CIANO",
  "MAGENTA",
  "YELLOW",
  "CILINDRO - MONO",
  "CILINDRO - COLOR",
]

export default function TonersDashboard() {
  const supabase = createClient()

  const [estoque, setEstoque] = useState<EstoqueItem[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])

  async function carregar() {
    const { data: estoqueData } = await supabase
      .from("tonners_estoque_atual")
      .select("*")

    const estoqueOrdenado = ((estoqueData || []) as EstoqueItem[]).sort(
      (a, b) =>
        ORDEM_TONERS.indexOf(a.tonner_tipo) -
        ORDEM_TONERS.indexOf(b.tonner_tipo)
    )

    const { data: movData } = await supabase
      .from("tonners_movimentacoes_view")
      .select("*")
      .order("data_movimentacao", { ascending: false })
      .limit(5)

    setEstoque(estoqueOrdenado)
    setMovimentacoes((movData || []) as Movimentacao[])
  }

  useEffect(() => {
    carregar()
  }, [])

  function corToner(tipo: string) {
    switch (tipo) {
      case "BLACK MONO":
        return {
          card: "border-slate-600/60 bg-gradient-to-br from-slate-900 to-slate-950",
          text: "text-slate-100",
          accent: "bg-slate-300",
          glow: "shadow-[0_18px_45px_rgba(15,23,42,0.35)]",
        }

      case "BLACK COLOR":
        return {
          card: "border-slate-500/40 bg-gradient-to-br from-black to-slate-950",
          text: "text-white",
          accent: "bg-white",
          glow: "shadow-[0_18px_45px_rgba(0,0,0,0.35)]",
        }

      case "CIANO":
        return {
          card: "border-cyan-500/30 bg-gradient-to-br from-cyan-950/70 to-slate-950",
          text: "text-cyan-200",
          accent: "bg-cyan-400",
          glow: "shadow-[0_18px_45px_rgba(6,182,212,0.10)]",
        }

      case "MAGENTA":
        return {
          card: "border-pink-500/30 bg-gradient-to-br from-pink-950/70 to-slate-950",
          text: "text-pink-200",
          accent: "bg-pink-400",
          glow: "shadow-[0_18px_45px_rgba(236,72,153,0.10)]",
        }

      case "YELLOW":
        return {
          card: "border-yellow-500/30 bg-gradient-to-br from-yellow-950/60 to-slate-950",
          text: "text-yellow-200",
          accent: "bg-yellow-400",
          glow: "shadow-[0_18px_45px_rgba(234,179,8,0.10)]",
        }

      case "CILINDRO - MONO":
        return {
          card: "border-slate-500/30 bg-gradient-to-br from-slate-800/80 to-slate-950",
          text: "text-slate-200",
          accent: "bg-slate-400",
          glow: "shadow-[0_18px_45px_rgba(71,85,105,0.10)]",
        }

      case "CILINDRO - COLOR":
        return {
          card: "border-indigo-500/30 bg-gradient-to-br from-indigo-950/70 to-slate-950",
          text: "text-indigo-200",
          accent: "bg-indigo-400",
          glow: "shadow-[0_18px_45px_rgba(99,102,241,0.10)]",
        }

      default:
        return {
          card: "border-slate-700 bg-slate-900",
          text: "text-white",
          accent: "bg-blue-400",
          glow: "shadow-[0_18px_45px_rgba(15,23,42,0.25)]",
        }
    }
  }

  const toners = estoque.filter(
    (item) => !item.tonner_tipo.includes("CILINDRO")
  )

  const cilindros = estoque.filter((item) =>
    item.tonner_tipo.includes("CILINDRO")
  )

  return (
    <div className="relative mx-auto w-full max-w-[1700px] space-y-7 overflow-hidden pb-12">
      <div className="pointer-events-none absolute -left-48 top-8 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-48 top-[34rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/5 blur-3xl" />

      {/* CABEÇALHO */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/30 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.10),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
                Suprimentos de impressão
              </span>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                URE Guarulhos Sul
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300 shadow-[0_0_28px_rgba(37,99,235,0.16)] sm:flex">
                <PrinterIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  Gestão de Impressoras
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Controle centralizado do estoque de toners e cilindros,
                  movimentações recentes e acessos técnicos às impressoras da
                  unidade regional.
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:w-auto">
            <ActionLink
              href="toners/entrada"
              title="Registrar entrada"
              description="Adicionar suprimentos ao estoque"
              icon={<BoxInIcon className="h-5 w-5" />}
              tone="emerald"
            />

            <ActionLink
              href="toners/saida"
              title="Registrar saída"
              description="Baixar itens utilizados"
              icon={<BoxOutIcon className="h-5 w-5" />}
              tone="red"
            />

            <ActionLink
              href="toners/movimentacoes"
              title="Histórico"
              description="Consultar movimentações"
              icon={<HistoryIcon className="h-5 w-5" />}
              tone="slate"
            />
          </div>
        </div>
      </section>

      {/* ACESSOS RÁPIDOS */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-600/8 blur-3xl" />

        <div className="relative z-10 mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              Operação local
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Acesso rápido às impressoras
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Atalhos para status, contadores e suporte técnico.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Uso exclusivo na rede local da URE
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickAccessCard
            href="http://10.180.112.23/general/status.html"
            title="IMPRESSORA - ASURE"
            description="Status e informações do equipamento"
            icon={<PrinterIcon className="h-5 w-5" />}
          />

          <QuickAccessCard
            href="http://10.180.112.25/general/status.html"
            title="IMPRESSORA - SEAFIN"
            description="Status e informações do equipamento"
            icon={<PrinterIcon className="h-5 w-5" />}
          />

          <QuickAccessCard
            href="http://10.180.112.24/general/status.html"
            title="IMPRESSORA - SEPES"
            description="Status e informações do equipamento"
            icon={<PrinterIcon className="h-5 w-5" />}
          />

          <QuickAccessCard
            href="http://10.180.112.22/general/status.html"
            title="IMPRESSORA - SEGRE"
            description="Status e informações do equipamento"
            icon={<PrinterIcon className="h-5 w-5" />}
          />

          <QuickAccessCard
            href="http://10.180.113.19/impressoras/"
            title="Contador de impressões"
            description="Consulta consolidada dos contadores"
            icon={<ChartIcon className="h-5 w-5" />}
          />

          <QuickAccessCard
            href="https://chamado-kersis.com.br/kersiswebdesk/Login.aspx"
            title="Portal de Chamados — KERSIS"
            description="Abertura e acompanhamento de suporte"
            icon={<TicketIcon className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* ESTOQUE */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative z-10 mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
              Disponibilidade imediata
            </p>
            <h2 className="mt-1 text-xl font-black text-white">Estoque atual</h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Quantidades disponíveis por tipo de toner e cilindro.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
              Categorias monitoradas
            </p>
            <p className="mt-1 text-right text-2xl font-black text-white">
              {estoque.length}
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {toners.map((item) => (
              <StockCard
                key={item.tonner_tipo_id}
                tipo={item.tonner_tipo}
                quantidade={item.estoque_atual}
                palette={corToner(item.tonner_tipo)}
              />
            ))}
          </div>

          {cilindros.length > 0 && (
            <div className="mt-6 border-t border-slate-800 pt-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Cilindros
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              </div>

              <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
                {cilindros.map((item) => (
                  <StockCard
                    key={item.tonner_tipo_id}
                    tipo={item.tonner_tipo}
                    quantidade={item.estoque_atual}
                    palette={corToner(item.tonner_tipo)}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {estoque.length === 0 && (
            <EmptyState
              title="Estoque ainda não carregado"
              description="Os dados serão exibidos assim que a consulta ao Supabase for concluída."
            />
          )}
        </div>
      </section>

      {/* ÚLTIMAS MOVIMENTAÇÕES */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              Auditoria operacional
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Últimas movimentações
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Cinco registros mais recentes de entrada e saída.
            </p>
          </div>

          <Link
            href="toners/movimentacoes"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
          >
            Ver histórico completo
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {movimentacoes.map((movimentacao) => {
            const entrada = movimentacao.tipo_movimentacao === "ENTRADA"

            return (
              <div
                key={movimentacao.id}
                className="group grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700 hover:bg-slate-900/80 sm:grid-cols-[150px_minmax(0,1fr)_150px_minmax(160px,auto)] sm:items-center"
              >
                <div>
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
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-200">
                    {movimentacao.impressora || "Impressora não informada"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Equipamento / destino
                  </p>
                </div>

                <div>
                  <p className="text-sm font-black text-slate-300">
                    {new Date(
                      movimentacao.data_movimentacao
                    ).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Data
                  </p>
                </div>

                <div className="flex min-w-0 items-center gap-3 sm:justify-end">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
                    <UserIcon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 sm:text-right">
                    <p className="truncate text-xs font-black text-blue-300">
                      {movimentacao.usuario_nome || "Usuário não informado"}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                      Responsável
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          {movimentacoes.length === 0 && (
            <EmptyState
              title="Nenhuma movimentação encontrada"
              description="As entradas e saídas mais recentes aparecerão aqui."
            />
          )}
        </div>
      </section>
    </div>
  )
}

function ActionLink({
  href,
  title,
  description,
  icon,
  tone,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
  tone: "emerald" | "red" | "slate"
}) {
  const tones = {
    emerald:
      "border-emerald-300/40 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-[0_16px_38px_rgba(16,185,129,0.28)] hover:border-emerald-200/60 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 hover:shadow-[0_20px_48px_rgba(16,185,129,0.38)]",
    red:
      "border-red-300/40 bg-gradient-to-br from-red-500 via-red-600 to-rose-700 text-white shadow-[0_16px_38px_rgba(239,68,68,0.28)] hover:border-red-200/60 hover:from-red-400 hover:via-red-500 hover:to-rose-600 hover:shadow-[0_20px_48px_rgba(239,68,68,0.38)]",
    slate:
      "border-slate-700 bg-slate-900/75 text-slate-200 hover:border-blue-500/35 hover:bg-slate-800",
  }

  return (
    <Link
      href={href}
      className={`group flex min-h-[88px] items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${tones[tone]}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-inner shadow-white/5">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-[10px] font-medium leading-relaxed opacity-65">
          {description}
        </p>
      </div>
    </Link>
  )
}

function QuickAccessCard({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[86px] items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/65 p-4 transition hover:-translate-y-0.5 hover:border-blue-500/35 hover:bg-slate-900"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 transition group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 group-hover:text-cyan-300">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-200 transition group-hover:text-white">
          {title}
        </p>
        <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-600">
          {description}
        </p>
      </div>

      <ExternalLinkIcon className="h-4 w-4 shrink-0 text-slate-700 transition group-hover:text-blue-300" />
    </a>
  )
}

function StockCard({
  tipo,
  quantidade,
  palette,
  compact = false,
}: {
  tipo: string
  quantidade: number | string | null
  palette: {
    card: string
    text: string
    accent: string
    glow: string
  }
  compact?: boolean
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[1.35rem] border p-5 transition duration-300 hover:-translate-y-1 ${palette.card} ${palette.glow}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 opacity-80 ${palette.accent}`}
      />
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-black uppercase tracking-[0.18em] opacity-70 ${palette.text}`}
          >
            {compact ? "Componente" : "Suprimento"}
          </p>
          <h3
            className={`mt-2 min-h-[40px] text-sm font-black leading-snug ${palette.text}`}
          >
            {tipo}
          </h3>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/10">
          <InkIcon className={`h-5 w-5 ${palette.text}`} />
        </div>
      </div>

      <div className="relative z-10 mt-7 flex items-end justify-between gap-3">
        <div>
          <p className={`text-4xl font-black tracking-tight ${palette.text}`}>
            {Number(quantidade || 0).toLocaleString("pt-BR")}
          </p>
          <p className={`mt-1 text-[9px] font-bold uppercase tracking-widest opacity-55 ${palette.text}`}>
            unidades disponíveis
          </p>
        </div>

        <span
          className={`h-3 w-3 rounded-full ${palette.accent} shadow-[0_0_18px_currentColor]`}
          aria-hidden="true"
        />
      </div>
    </article>
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
    <div className="flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <div>
        <p className="text-sm font-black text-slate-400">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-600">{description}</p>
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

function PrinterIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.5V3.75h10.5V7.5m-10.5 9v3.75h10.5V16.5m-12-9h13.5A2.25 2.25 0 0 1 21 9.75v5.25a1.5 1.5 0 0 1-1.5 1.5H18v-3H6v3H4.5A1.5 1.5 0 0 1 3 15V9.75A2.25 2.25 0 0 1 5.25 7.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 10.5h.008v.008h-.008V10.5Z" />
    </SvgBase>
  )
}

function BoxInIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 12.75V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-5.25M12 3.75v10.5m0 0 3.75-3.75M12 14.25 8.25 10.5" />
    </SvgBase>
  )
}

function BoxOutIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 11.25V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-6.75M12 14.25V3.75m0 0L8.25 7.5M12 3.75l3.75 3.75" />
    </SvgBase>
  )
}

function HistoryIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.708M3 4.5v4.5h4.5M12 7.5V12l3 1.5" />
    </SvgBase>
  )
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v18h17.25M7.5 16.5v-4.5m4.5 4.5v-9m4.5 9v-6" />
    </SvgBase>
  )
}

function TicketIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5v4.125a2.625 2.625 0 0 0 0 5.25v4.125H3.75v-4.125a2.625 2.625 0 0 0 0-5.25V5.25Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v9" />
    </SvgBase>
  )
}

function ExternalLinkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M10.5 6H6A2.25 2.25 0 0 0 3.75 8.25V18A2.25 2.25 0 0 0 6 20.25h9.75A2.25 2.25 0 0 0 18 18v-4.5" />
    </SvgBase>
  )
}

function InkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c-2.25 3-5.25 6.255-5.25 9.375A5.25 5.25 0 0 0 17.25 13.125C17.25 10.005 14.25 6.75 12 3.75Z" />
    </SvgBase>
  )
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </SvgBase>
  )
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12h13.5m-5.25-5.25L18.75 12l-5.25 5.25" />
    </SvgBase>
  )
}