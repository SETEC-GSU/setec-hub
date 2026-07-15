"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Card from "@/components/ui/Card"
import { createClient } from "@supabase/supabase-js"

type Material = {
  id: string
  titulo: string | null
  descricao: string | null
  categoria: string | null
  subcategoria: string | null
  arquivo_url: string | null
  imagem_url: string | null
  visualizacoes: number | null
}

type MateriaisAgrupados = Record<string, Material[]>

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ApoioUsuarioAccordionOriginal() {
  const [busca, setBusca] = useState("")
  const [materiais, setMateriais] = useState<Material[]>([])

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("base_conhecimento").select("*")
      setMateriais((data || []) as Material[])
    }

    carregar()
  }, [])

  const listaMateriais = materiais ?? []

  const materiaisFiltrados = useMemo(() => {
    if (!busca) return listaMateriais

    const termo = busca.toLowerCase()

    return listaMateriais.filter(
      (material) =>
        (material?.titulo || "").toLowerCase().includes(termo) ||
        (material?.descricao || "").toLowerCase().includes(termo) ||
        (material?.subcategoria || "").toLowerCase().includes(termo) ||
        (material?.categoria || "").toLowerCase().includes(termo)
    )
  }, [busca, listaMateriais])

  const categorias = {
    GERAL: materiaisFiltrados.filter(
      (material) => material?.categoria === "GERAL"
    ),
    CONECTIVIDADE: materiaisFiltrados.filter(
      (material) => material?.categoria === "CONECTIVIDADE"
    ),
    EQUIPAMENTOS: materiaisFiltrados.filter(
      (material) => material?.categoria === "EQUIPAMENTOS"
    ),
    SISTEMAS: materiaisFiltrados.filter(
      (material) => material?.categoria === "SISTEMAS"
    ),
    ESPELHAMENTO: materiaisFiltrados.filter(
      (material) => material?.categoria === "ESPELHAMENTO"
    ),
  }

  async function registrarVisualizacao(item: Material) {
    try {
      await supabase
        .from("base_conhecimento")
        .update({ visualizacoes: (item.visualizacoes || 0) + 1 })
        .eq("id", item.id)
    } catch (error) {
      console.log("erro ao registrar visualização", error)
    }

    if (item?.arquivo_url) {
      window.open(item.arquivo_url, "_blank")
    }
  }

  function agruparPorSubcategoria(lista: Material[]) {
    return lista.reduce<MateriaisAgrupados>((acc, item) => {
      const subcategoria = item?.subcategoria?.trim() || "Geral"

      if (!acc[subcategoria]) {
        acc[subcategoria] = []
      }

      acc[subcategoria].push(item)
      return acc
    }, {})
  }

  function renderCategoria(
    nome: string,
    lista: Material[],
    icone: ReactNode,
    cor: "blue" | "cyan" | "violet" | "amber" | "emerald"
  ) {
    const agrupado = agruparPorSubcategoria(lista)

    if (Object.keys(agrupado).length === 0 && busca) {
      return null
    }

    const estilos = {
      blue: {
        badge: "border-blue-500/20 bg-blue-500/10 text-blue-300",
        icon: "border-blue-500/20 bg-blue-500/10 text-blue-300",
        hover: "hover:border-blue-500/35",
      },
      cyan: {
        badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
        icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
        hover: "hover:border-cyan-500/35",
      },
      violet: {
        badge: "border-violet-500/20 bg-violet-500/10 text-violet-300",
        icon: "border-violet-500/20 bg-violet-500/10 text-violet-300",
        hover: "hover:border-violet-500/35",
      },
      amber: {
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        icon: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        hover: "hover:border-amber-500/35",
      },
      emerald: {
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        hover: "hover:border-emerald-500/35",
      },
    } as const

    const estilo = estilos[cor]

    return (
      <details
        className="group overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#020617] shadow-lg shadow-slate-950/20"
        open={busca.length > 0}
      >
        <summary className="cursor-pointer list-none outline-none">
          <div className="flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-slate-900/45 sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${estilo.icon}`}
              >
                {icone}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-white sm:text-xl">
                  {nome}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Materiais agrupados por subcategoria
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${estilo.badge}`}
              >
                {lista.length} arquivos
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-500 transition duration-300 group-open:rotate-180 group-open:text-slate-300">
                <ChevronIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
        </summary>

        <div className="border-t border-slate-800 p-4 sm:p-5">
          {Object.keys(agrupado).length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
              <p className="text-sm font-medium text-slate-500">
                Nenhum material encontrado
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(agrupado).map(([subcategoria, itens]) => {
                const itemComImagem =
                  nome === "Equipamentos"
                    ? itens.find((item) => item.imagem_url)
                    : null

                const imagemDaSubcategoria = itemComImagem?.imagem_url || null

                return (
                  <article
                    key={subcategoria}
                    className={`flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition ${estilo.hover} hover:bg-slate-900/70`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {imagemDaSubcategoria && (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-inner">
                            <img
                              src={imagemDaSubcategoria}
                              alt={subcategoria}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-base font-black leading-tight text-white">
                            {subcategoria}
                          </h3>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Subcategoria
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-lg border border-slate-800 bg-[#020617] px-2.5 py-1 text-[9px] font-black text-slate-500">
                        {itens.length}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      {itens.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => registrarVisualizacao(item)}
                          disabled={!item?.arquivo_url}
                          className={`group/btn flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                            item?.arquivo_url
                              ? "border-transparent bg-slate-900/55 text-slate-300 hover:border-cyan-500/25 hover:bg-cyan-500/[0.05] hover:text-cyan-300"
                              : "cursor-not-allowed border-transparent bg-slate-900/35 text-slate-600 opacity-60"
                          }`}
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#020617] text-slate-500 transition group-hover/btn:border-cyan-500/20 group-hover/btn:text-cyan-300">
                            <FileIcon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="line-clamp-2 font-bold leading-snug">
                              {item?.titulo || "Tutorial"}
                            </span>

                            {(item.visualizacoes ?? 0) > 0 && (
                              <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                {item.visualizacoes ?? 0} acessos
                              </span>
                            )}
                          </div>

                          {item?.arquivo_url && (
                            <ExternalLinkIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover/btn:text-cyan-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </details>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7 pb-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/25 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.08),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Base de conhecimento
              </span>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Apoio ao usuário
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 sm:flex">
                <BookIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  Base de Conhecimento Tecnológica
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Consulte tutoriais, orientações e materiais técnicos
                  organizados por categoria para apoiar as unidades e equipes
                  da URE Guarulhos Sul.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-fit">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                Materiais
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {materiais.length}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400/70">
                Resultados
              </p>
              <p className="mt-1 text-2xl font-black text-cyan-300">
                {materiaisFiltrados.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <SearchIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Buscar na base
            </label>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar tutorial, equipamento ou sistema..."
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
            />
          </div>

          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-slate-400 transition hover:border-slate-600 hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {renderCategoria(
          "Geral",
          categorias.GERAL,
          <GlobeIcon className="h-5 w-5" />,
          "blue"
        )}

        {renderCategoria(
          "Conectividade",
          categorias.CONECTIVIDADE,
          <WifiIcon className="h-5 w-5" />,
          "cyan"
        )}

        {renderCategoria(
          "Equipamentos",
          categorias.EQUIPAMENTOS,
          <DeviceIcon className="h-5 w-5" />,
          "violet"
        )}

        {renderCategoria(
          "Sistemas",
          categorias.SISTEMAS,
          <SettingsIcon className="h-5 w-5" />,
          "amber"
        )}

        {renderCategoria(
          "Espelhamento",
          categorias.ESPELHAMENTO,
          <CastIcon className="h-5 w-5" />,
          "emerald"
        )}
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

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </SvgBase>
  )
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3h4.5v16.5h-4.5A2.25 2.25 0 0 0 4.5 21.75V5.25Zm15 0A2.25 2.25 0 0 0 17.25 3h-4.5v16.5h4.5a2.25 2.25 0 0 1 2.25 2.25V5.25Z"
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

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-9c2.1 2.45 3.15 5.45 3.15 9S14.1 18.55 12 21m0-18C9.9 5.45 8.85 8.45 8.85 12S9.9 18.55 12 21M3.75 9h16.5m-16.5 6h16.5"
      />
    </SvgBase>
  )
}

function WifiIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 9.75a10.5 10.5 0 0 1 15 0M7.5 12.75a6.3 6.3 0 0 1 9 0M10.5 15.75a2.1 2.1 0 0 1 3 0M12 19.5h.008v.008H12V19.5Z"
      />
    </SvgBase>
  )
}

function DeviceIcon({ className = "" }: { className?: string }) {
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

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8.25A3.75 3.75 0 1 1 12 15.75 3.75 3.75 0 0 1 12 8.25Zm7.125 3.75c0-.48-.045-.948-.132-1.401l1.842-1.437-1.5-2.598-2.172.876a7.49 7.49 0 0 0-2.424-1.4L14.4 3.75h-3l-.339 2.29a7.49 7.49 0 0 0-2.424 1.4l-2.172-.876-1.5 2.598 1.842 1.437A7.43 7.43 0 0 0 6.675 12c0 .48.045.948.132 1.401l-1.842 1.437 1.5 2.598 2.172-.876a7.49 7.49 0 0 0 2.424 1.4l.339 2.29h3l.339-2.29a7.49 7.49 0 0 0 2.424-1.4l2.172.876 1.5-2.598-1.842-1.437c.087-.453.132-.921.132-1.401Z"
      />
    </SvgBase>
  )
}

function CastIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6h16.5v12h-6M3.75 15a5.25 5.25 0 0 1 5.25 5.25M3.75 10.5a9.75 9.75 0 0 1 9.75 9.75M3.75 20.25h.008v.008H3.75v-.008Z"
      />
    </SvgBase>
  )
}

function FileIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3.75h7.5L18 8.25v12H6v-16.5Zm7.5 0v4.5H18M9 12h6m-6 3h6"
      />
    </SvgBase>
  )
}

function ExternalLinkIcon({ className = "" }: { className?: string }) {
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