"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"
import Link from "next/link"

const MapEscolas = dynamic(() => import("./MapEscolas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#020617]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-cyan-500" />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
          Carregando mapa
        </p>
      </div>
    </div>
  ),
})

type Criticidade = "critica" | "atencao" | "saudavel"

type Escola = {
  id: string
  nome_escola: string | null
  cie?: string | null
  telefone?: string | null
  endereco?: string | null
  diretor?: string | null
  tipo_ensino?: string | null
  periodo?: string | null
  email?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  horario_abertura?: string | null
  horario_fechamento?: string | null
  total_alunos?: number | null
  qtd_salas?: number | null
  total_equipamentos_recebidos?: number | null
  aps_instalados?: number | null
  status_conectividade?: string | null
  criticidade?: number | null
  ultima_visita?: string | null
  observacoes?: string | null
  created_at?: string | null
  total_equipamentos_funcionando?: number | null
  ultima_atualizacao?: string | null
  tecnico_atribuido?: string | null
}

type EscolaEnriquecida = Escola & {
  score: number
  criticidadeCalculada: Criticidade
  indiceAP: number
  indiceEquip: number
}

type MensagemTela = {
  tipo: "error" | "success" | "info"
  texto: string
} | null

function toNumber(value: unknown) {
  const numero = Number(value || 0)
  return Number.isFinite(numero) ? numero : 0
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function calcScore(e: Escola): {
  score: number
  criticidadeCalculada: Criticidade
  indiceAP: number
  indiceEquip: number
} {
  const salas = toNumber(e.qtd_salas)
  const aps = toNumber(e.aps_instalados)
  const alunos = toNumber(e.total_alunos)

  const equipamentos = toNumber(
    e.total_equipamentos_funcionando || e.total_equipamentos_recebidos || 0
  )

  const wifiIdeal = salas / 2 || 1
  const equipIdeal = alunos / 3 || 1

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equipamentos / equipIdeal, 1)

  const score = indiceEquip * 0.6 + indiceAP * 0.4

  let criticidadeCalculada: Criticidade = "saudavel"

  if (score < 0.6) criticidadeCalculada = "critica"
  else if (score < 0.8) criticidadeCalculada = "atencao"

  return { score, criticidadeCalculada, indiceAP, indiceEquip }
}

function getCriticidadeVisual(criticidade: Criticidade) {
  if (criticidade === "critica") {
    return {
      label: "Estado Crítico",
      shortLabel: "Crítica",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      shadow: "shadow-[0_0_15px_rgba(239,68,68,0.1)]",
      bar: "bg-red-500",
    }
  }

  if (criticidade === "atencao") {
    return {
      label: "Atenção",
      shortLabel: "Atenção",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      shadow: "shadow-[0_0_15px_rgba(234,179,8,0.1)]",
      bar: "bg-yellow-500",
    }
  }

  return {
    label: "Saudável",
    shortLabel: "Saudável",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    shadow: "shadow-none",
    bar: "bg-emerald-500",
  }
}

function getInitials(name?: string | null) {
  const clean = String(name || "").trim()

  if (!clean) return "UE"

  const parts = clean.split(" ").filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

function getTelefoneHref(telefone?: string | null) {
  const digits = String(telefone || "").replace(/\D/g, "")

  if (!digits) return ""

  return `tel:${digits}`
}

function getEmailHref(email?: string | null, escola?: string | null) {
  const emailLimpo = String(email || "").trim()

  if (!emailLimpo) return ""

  const assunto = encodeURIComponent(`Contato SETEC - ${escola || "Unidade Escolar"}`)
  const corpo = encodeURIComponent(
    `Prezados(as),\n\nEntramos em contato pela Seção de Tecnologia da URE Guarulhos Sul.\n\nAtenciosamente,\nSETEC`
  )

  return `mailto:${emailLimpo}?subject=${assunto}&body=${corpo}`
}

function getMapsHref(escola: EscolaEnriquecida) {
  const lat = Number(escola.latitude)
  const lng = Number(escola.longitude)

  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }

  const endereco = String(escola.endereco || "").trim()

  if (endereco) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      endereco
    )}`
  }

  return ""
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Sem registro"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  return data.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  })
}

export default function EscolasGridViewModerno() {
  const supabase = useMemo(() => createClient(), [])

  const [escolas, setEscolas] = useState<EscolaEnriquecida[]>([])
  const [busca, setBusca] = useState("")
  const [criticidadeFiltro, setCriticidadeFiltro] = useState("todas")
  const [selected, setSelected] = useState<EscolaEnriquecida | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setMensagem(null)

      const { data, error } = await supabase
        .from("escolas")
        .select("*")
        .order("nome_escola", { ascending: true })

      if (error) throw error

      const enriched: EscolaEnriquecida[] =
        data?.map((escola: Escola) => ({
          ...escola,
          ...calcScore(escola),
        })) || []

      enriched.sort((a, b) =>
        String(a.nome_escola || "").localeCompare(
          String(b.nome_escola || ""),
          "pt-BR"
        )
      )

      setEscolas(enriched)
    } catch (error: any) {
      console.error("Erro ao carregar escolas:", error)

      setMensagem({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível carregar as escolas cadastradas no sistema.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregar()
    setIsMounted(true)
  }, [carregar])

  const filtrado = useMemo(() => {
    const termo = normalizarTexto(busca)

    let lista = escolas.filter((escola) => {
      if (!termo) return true

      const texto = normalizarTexto(
        `${escola.nome_escola || ""} ${escola.cie || ""} ${
          escola.endereco || ""
        } ${escola.telefone || ""} ${escola.email || ""} ${
          escola.tecnico_atribuido || ""
        } ${escola.diretor || ""}`
      )

      return texto.includes(termo)
    })

    if (criticidadeFiltro !== "todas") {
      lista = lista.filter(
        (escola) => escola.criticidadeCalculada === criticidadeFiltro
      )
    }

    return lista
  }, [busca, criticidadeFiltro, escolas])

  const resumo = useMemo(() => {
    const total = escolas.length
    const criticas = escolas.filter(
      (escola) => escola.criticidadeCalculada === "critica"
    ).length
    const atencao = escolas.filter(
      (escola) => escola.criticidadeCalculada === "atencao"
    ).length
    const saudaveis = escolas.filter(
      (escola) => escola.criticidadeCalculada === "saudavel"
    ).length
    const comCoordenadas = escolas.filter((escola) => {
      const lat = Number(escola.latitude)
      const lng = Number(escola.longitude)
      return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
    }).length

    return { total, criticas, atencao, saudaveis, comCoordenadas }
  }, [escolas])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-cyan-500" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando escolas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Rede Escolar
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Geolocalização e Infraestrutura
              </span>

              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">
                URE Guarulhos Sul
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Escolas da Rede SETEC
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Consulta operacional das unidades escolares com mapa, rotas, contato,
              indicadores de infraestrutura, técnico atribuído e ficha técnica da
              unidade.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:grid-cols-4 xl:min-w-[560px]">
            <MiniStat label="Total" value={resumo.total} tone="default" />
            <MiniStat label="Críticas" value={resumo.criticas} tone="red" />
            <MiniStat label="Atenção" value={resumo.atencao} tone="yellow" />
            <MiniStat label="No mapa" value={resumo.comCoordenadas} tone="cyan" />
          </div>
        </div>
      </section>

      {mensagem && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {mensagem.texto}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">
              Busca e filtros das unidades
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Pesquise por escola, CIE, endereço, telefone, e-mail, diretor ou técnico.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="relative w-full xl:w-[420px]">
              <input
                placeholder="Buscar unidade escolar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 py-3.5 pl-11 pr-4 text-sm font-semibold text-white shadow-sm outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />

              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <select
                value={criticidadeFiltro}
                onChange={(e) => setCriticidadeFiltro(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 pr-10 text-sm font-bold text-slate-300 shadow-sm outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="todas">🎯 Todos os status</option>
                <option value="critica">🚨 Apenas críticas</option>
                <option value="atencao">⚠️ Apenas atenção</option>
                <option value="saudavel">✅ Apenas saudáveis</option>
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <ChevronDownIcon />
              </div>
            </div>

            {(busca || criticidadeFiltro !== "todas") && (
              <button
                type="button"
                onClick={() => {
                  setBusca("")
                  setCriticidadeFiltro("todas")
                }}
                className="rounded-2xl border border-slate-700 bg-[#020617] px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterPill
            active={criticidadeFiltro === "todas"}
            onClick={() => setCriticidadeFiltro("todas")}
            label={`Todas (${resumo.total})`}
          />

          <FilterPill
            active={criticidadeFiltro === "critica"}
            onClick={() => setCriticidadeFiltro("critica")}
            label={`Críticas (${resumo.criticas})`}
            tone="red"
          />

          <FilterPill
            active={criticidadeFiltro === "atencao"}
            onClick={() => setCriticidadeFiltro("atencao")}
            label={`Atenção (${resumo.atencao})`}
            tone="yellow"
          />

          <FilterPill
            active={criticidadeFiltro === "saudavel"}
            onClick={() => setCriticidadeFiltro("saudavel")}
            label={`Saudáveis (${resumo.saudaveis})`}
            tone="green"
          />
        </div>
      </section>

      <section className="relative h-[360px] overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] shadow-2xl lg:h-[460px]">
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <span className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            {filtrado.length} UEs no mapa
          </span>

          {selected && (
            <span className="max-w-[260px] truncate rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-200 shadow-lg backdrop-blur">
              Selecionada: {selected.nome_escola}
            </span>
          )}
        </div>

        {isMounted && (
          <MapEscolas
            escolas={filtrado}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">
              Unidades escolares
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {filtrado.length} escola(s) encontrada(s) no recorte atual.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {filtrado.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-800 bg-[#020617]/50 py-24 text-center">
              <span className="mb-4 text-5xl opacity-50 grayscale">🏫</span>
              <h3 className="mb-2 text-xl font-black text-white">
                Nenhuma escola localizada
              </h3>
              <p className="max-w-sm text-sm font-medium text-slate-500">
                Altere os filtros de busca ou verifique se o nome foi digitado
                corretamente.
              </p>
            </div>
          ) : (
            filtrado.map((escola) => {
              const isSelected = selected?.id === escola.id
              const statusVisual = getCriticidadeVisual(
                escola.criticidadeCalculada
              )
              const scorePercent = Math.round(escola.score * 100)
              const mapsHref = getMapsHref(escola)
              const telefoneHref = getTelefoneHref(escola.telefone)
              const emailHref = getEmailHref(escola.email, escola.nome_escola)
              const equipamentos =
                escola.total_equipamentos_funcionando ??
                escola.total_equipamentos_recebidos ??
                0

              return (
                <article
                  key={escola.id}
                  onClick={() => setSelected(escola)}
                  className={`group flex cursor-pointer flex-col rounded-[2rem] border bg-gradient-to-b from-[#020617] to-slate-900/30 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl md:p-6 ${
                    isSelected
                      ? "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500"
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${statusVisual.bg} ${statusVisual.color} ${statusVisual.border} ${statusVisual.shadow}`}
                        >
                          {statusVisual.label}
                        </span>

                        <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-black tracking-widest text-cyan-300">
                          CIE: {escola.cie || "N/A"}
                        </span>
                      </div>

                      <h3
                        className={`line-clamp-2 text-xl font-black leading-tight transition-colors ${
                          isSelected
                            ? "text-cyan-300"
                            : "text-slate-100 group-hover:text-white"
                        }`}
                      >
                        {escola.nome_escola || "Unidade sem nome"}
                      </h3>

                      <p className="mt-2 line-clamp-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                        {escola.tipo_ensino || "Tipo de ensino não informado"}
                        {escola.periodo ? ` • ${escola.periodo}` : ""}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-4xl font-black tracking-tighter ${statusVisual.color}`}>
                        {scorePercent}
                        <span className="text-lg opacity-50">%</span>
                      </p>

                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Saúde
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${statusVisual.bar}`}
                      style={{ width: `${Math.min(scorePercent, 100)}%` }}
                    />
                  </div>

                  <div className="mb-5 space-y-3">
                    <InfoLine
                      icon="📍"
                      text={escola.endereco || "Endereço não cadastrado"}
                    />

                    <InfoLine
                      icon="☎️"
                      text={escola.telefone || "Telefone não cadastrado"}
                    />

                    <InfoLine
                      icon="✉️"
                      text={escola.email || "E-mail não cadastrado"}
                    />

                    <InfoLine
                      icon="👨‍🔧"
                      text={escola.tecnico_atribuido || "Sem técnico atribuído"}
                      highlight
                    />

                    <InfoLine
                      icon="🕒"
                      text={
                        escola.horario_abertura || escola.horario_fechamento
                          ? `${escola.horario_abertura || "--:--"} às ${
                              escola.horario_fechamento || "--:--"
                            }`
                          : "Horário não cadastrado"
                      }
                    />
                  </div>

                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <MetricBox
                      icon="👨‍🎓"
                      label="Alunos"
                      value={escola.total_alunos ?? 0}
                    />

                    <MetricBox icon="💻" label="Equips" value={equipamentos} />

                    <MetricBox
                      icon="📡"
                      label="APs"
                      value={escola.aps_instalados ?? 0}
                    />
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <MetricSmall
                      label="Salas"
                      value={escola.qtd_salas ?? 0}
                    />

                    <MetricSmall
                      label="Conectividade"
                      value={escola.status_conectividade || "N/I"}
                    />
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <ExternalAction
                      href={mapsHref}
                      icon="🗺️"
                      label="Rotas"
                      title="Abrir rota no Google Maps"
                    />

                    <ExternalAction
                      href={telefoneHref}
                      icon="☎️"
                      label="Ligar"
                      title="Ligar para a unidade"
                    />

                    <ExternalAction
                      href={emailHref}
                      icon="✉️"
                      label="E-mail"
                      title="Enviar e-mail para a unidade"
                    />

                    <Link
                      href={`/escolas/${escola.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-center text-xs font-black uppercase tracking-widest transition-all ${
                        isSelected
                          ? "bg-cyan-500 text-cyan-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
                          : "border border-slate-700 bg-[#020617] text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      Ficha
                      <span className="text-base leading-none">→</span>
                    </Link>
                  </div>

                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                      Última atualização
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatarData(escola.ultima_atualizacao || escola.created_at)}
                    </p>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "default" | "red" | "yellow" | "cyan"
}) {
  const classes = {
    default: "border-slate-700 bg-[#020617] text-white",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  tone = "default",
}: {
  active: boolean
  onClick: () => void
  label: string
  tone?: "default" | "red" | "yellow" | "green"
}) {
  const toneClasses = {
    default: active
      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
      : "border-slate-800 bg-slate-900/60 text-slate-500 hover:border-slate-600 hover:text-slate-300",
    red: active
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : "border-slate-800 bg-slate-900/60 text-slate-500 hover:border-red-500/30 hover:text-red-300",
    yellow: active
      ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
      : "border-slate-800 bg-slate-900/60 text-slate-500 hover:border-yellow-500/30 hover:text-yellow-300",
    green: active
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-slate-800 bg-slate-900/60 text-slate-500 hover:border-emerald-500/30 hover:text-emerald-300",
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${toneClasses}`}
    >
      {label}
    </button>
  )
}

function InfoLine({
  icon,
  text,
  highlight = false,
}: {
  icon: string
  text: string
  highlight?: boolean
}) {
  return (
    <div className={`flex items-start gap-2 ${highlight ? "text-blue-300" : "text-slate-500"}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p
        className={`line-clamp-2 text-sm leading-relaxed ${
          highlight ? "font-bold" : "font-medium"
        }`}
        title={text}
      >
        {text}
      </p>
    </div>
  )
}

function MetricBox({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/50 bg-slate-900/50 p-3 text-center transition-colors group-hover:bg-slate-900">
      <span className="mb-1 text-xl opacity-80">{icon}</span>

      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p className="text-sm font-black text-slate-200">{value}</p>
    </div>
  )
}

function MetricSmall({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-300" title={String(value)}>
        {value}
      </p>
    </div>
  )
}

function ExternalAction({
  href,
  icon,
  label,
  title,
}: {
  href: string
  icon: string
  label: string
  title: string
}) {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        onClick={(event) => event.stopPropagation()}
        className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 py-3 text-xs font-black uppercase tracking-widest text-slate-700"
        title={`${title} indisponível`}
      >
        <span>{icon}</span>
        {label}
      </button>
    )
  }

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      onClick={(event) => event.stopPropagation()}
      className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#020617] py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white"
      title={title}
    >
      <span>{icon}</span>
      {label}
    </a>
  )
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
      <path
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
        fillRule="evenodd"
      />
    </svg>
  )
}