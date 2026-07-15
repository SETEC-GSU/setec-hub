"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

const POWER_BI_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiNDJmOTI4ZGMtOGZiNC00ZmE4LThiYzEtOWE4NWYwMjM4NDcxIiwidCI6IjE2Yjg3Nzk4LTQ1MTctNDQyYy05MjAwLWNlMWNjYTkzMjU5YyIsImMiOjR9"

export default function EduMonitor() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [iframeKey, setIframeKey] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [telaCheia, setTelaCheia] = useState(false)

  const ultimaAtualizacao = useMemo(() => {
    return new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [iframeKey])

  useEffect(() => {
    function acompanharTelaCheia() {
      setTelaCheia(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener("fullscreenchange", acompanharTelaCheia)

    return () => {
      document.removeEventListener("fullscreenchange", acompanharTelaCheia)
    }
  }, [])

  function atualizarRelatorio() {
    setCarregando(true)
    setIframeKey((atual) => atual + 1)
  }

  async function alternarTelaCheia() {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
        return
      }

      await document.exitFullscreen()
    } catch (error) {
      console.error("Não foi possível alternar a tela cheia:", error)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1900px] space-y-5 pb-6">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/25 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                EduMonitor
              </span>

              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Power BI
              </span>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Visão estratégica
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300 sm:flex">
                <MonitorIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  EduMonitor - URE Guarulhos Sul
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Visualize os equipamentos recebidos pelas unidades escolares
                  da URE Guarulhos Sul em uma visão estratégica, centralizada e
                  interativa.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={atualizarRelatorio}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-violet-500/35 hover:bg-violet-500/10 hover:text-violet-300"
            >
              <RefreshIcon
                className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={alternarTelaCheia}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 text-xs font-black uppercase tracking-widest text-violet-300 transition hover:bg-violet-500/20"
            >
              <FullscreenIcon className="h-4 w-4" />
              {telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            </button>

            <a
              href={POWER_BI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <ExternalIcon className="h-4 w-4" />
              Abrir no Power BI
            </a>
          </div>
        </div>
      </section>

      <section
        ref={containerRef}
        className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-2xl shadow-slate-950/30"
      >
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
              <MonitorIcon className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-black text-white">
                Equipamentos das unidades escolares
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Relatório estratégico incorporado
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                carregando
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  carregando ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              {carregando ? "Carregando relatório" : "Relatório disponível"}
            </span>

            <span className="rounded-full border border-slate-800 bg-[#020617] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
              Atualizado em {ultimaAtualizacao}
            </span>
          </div>
        </div>

        <div className="relative h-[68dvh] min-h-[520px] sm:h-[72dvh] sm:min-h-[600px] lg:h-[calc(100dvh-15rem)] lg:min-h-[680px]">
          {carregando && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020617]">
              <div className="w-full max-w-sm px-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                </div>

                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">
                  Carregando EduMonitor
                </p>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                  Preparando o panorama estratégico de equipamentos.
                </p>

                <div className="mt-5 space-y-2">
                  <div className="h-3 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-800" />
                </div>
              </div>
            </div>
          )}

          <iframe
            key={iframeKey}
            title="EduMonitor - Visão Estratégica"
            src={POWER_BI_URL}
            className="h-full w-full bg-white"
            style={{ border: "none" }}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setCarregando(false)}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-950/70 px-4 py-3 text-xs font-medium text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            Utilize os filtros internos para consultar escola, modelo, tipo,
            finalidade e demais indicadores.
          </p>

          <p className="text-slate-700">
            Em telas menores, o modo paisagem melhora a leitura dos gráficos e tabelas.
          </p>
        </div>
      </section>
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

function MonitorIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 4.5h15v10.5h-15V4.5Zm3 15h9m-6-4.5v4.5m3-4.5v4.5"
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
        d="M20.25 6.75v4.5h-4.5M3.75 17.25v-4.5h4.5M5.69 9A7.5 7.5 0 0 1 18 6.75l2.25 4.5M18.31 15A7.5 7.5 0 0 1 6 17.25l-2.25-4.5"
      />
    </SvgBase>
  )
}

function FullscreenIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 3.75h-4.5v4.5M15.75 3.75h4.5v4.5M8.25 20.25h-4.5v-4.5M15.75 20.25h4.5v-4.5"
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
        d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M10.5 6H6A2.25 2.25 0 0 0 3.75 8.25V18A2.25 2.25 0 0 0 6 20.25h9.75A2.25 2.25 0 0 0 18 18v-4.5"
      />
    </SvgBase>
  )
}