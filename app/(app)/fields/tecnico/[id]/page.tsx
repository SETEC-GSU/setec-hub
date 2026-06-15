"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDateLocal(dateStr: string | null) {
  if (!dateStr) return null

  const value = String(dateStr).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-")
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function calcBusinessDays(startStr: string | null, endStr: string | null): number {
  if (!startStr || !endStr) return 0

  const start = parseDateLocal(startStr)
  const end = parseDateLocal(endStr)

  if (!start || !end || start > end) return 0

  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count += 1
    }

    current.setDate(current.getDate() + 1)
  }

  return count
}

function formatarDataBR(dateStr: string | null) {
  if (!dateStr) return "N/A"

  const d = parseDateLocal(dateStr)

  if (!d) return "N/A"

  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value || "").trim()
  return text || fallback
}

function ordenarTexto(a: unknown, b: unknown) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  })
}

function formatarNumero(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString("pt-BR") : "0"
}

function getInitials(name: unknown) {
  const clean = textoSeguro(name, "")

  if (!clean) return "FT"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function isStatusFinalizado(status: unknown) {
  const statusNormalizado = normalizarTexto(status)

  return (
    statusNormalizado === "realizada" ||
    statusNormalizado === "realizado" ||
    statusNormalizado === "finalizado" ||
    statusNormalizado === "finalizada" ||
    statusNormalizado === "concluido" ||
    statusNormalizado === "concluído"
  )
}

function isStatusPendente(status: unknown) {
  const statusNormalizado = normalizarTexto(status)

  return (
    statusNormalizado === "" ||
    statusNormalizado === "pendente" ||
    statusNormalizado === "pendentes"
  )
}

function getStatusClasses(status: unknown) {
  if (isStatusFinalizado(status)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  if (isStatusPendente(status)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getStatusLabel(status: unknown) {
  const text = textoSeguro(status, "Pendente")

  if (isStatusFinalizado(text)) return "Realizada"
  if (isStatusPendente(text)) return "Pendente"

  return text
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível carregar os dados do técnico."
}

function calcularPercentual(parte: number, total: number) {
  if (!total || total <= 0) return 0
  return Math.round((parte / total) * 100)
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function TecnicoPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams()

  const tecnico = useMemo(() => {
    const raw = params?.id
    const value = Array.isArray(raw) ? raw[0] : raw
    return decodeURIComponent(String(value || ""))
  }, [params])

  const [visitas, setVisitas] = useState<any[]>([])
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [escolasAtribuidas, setEscolasAtribuidas] = useState<any[]>([])
  const [tecnicoCadastro, setTecnicoCadastro] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  const [chamadoSelecionado, setChamadoSelecionado] = useState<any | null>(null)
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroCategoria, setFiltroCategoria] = useState("todas")

  const carregar = useCallback(async () => {
    if (!tecnico) return

    setLoading(true)
    setErro("")

    try {
      const [visitasResult, avaliacoesResult, escolasResult, tecnicoResult] =
        await Promise.all([
          supabase
            .from("fields_visitas")
            .select("*")
            .eq("tecnico", tecnico)
            .order("data_visita", { ascending: false }),
          supabase
            .from("fields_avaliacoes")
            .select("*")
            .eq("tecnico", tecnico)
            .order("created_at", { ascending: false }),
          supabase
            .from("escolas")
            .select("nome_escola, cie, endereco, telefone, email")
            .eq("tecnico_atribuido", tecnico)
            .order("nome_escola", { ascending: true }),
          supabase
            .from("tecnicos")
            .select("id, nome, ativo, created_at")
            .eq("nome", tecnico)
            .maybeSingle(),
        ])

      if (visitasResult.error) throw visitasResult.error
      if (avaliacoesResult.error) throw avaliacoesResult.error
      if (escolasResult.error) throw escolasResult.error

      if (tecnicoResult.error) {
        console.warn("[Técnico Field] Cadastro do técnico não localizado:", tecnicoResult.error)
        setTecnicoCadastro(null)
      } else {
        setTecnicoCadastro(tecnicoResult.data || null)
      }

      setVisitas(visitasResult.data || [])
      setAvaliacoes(avaliacoesResult.data || [])
      setEscolasAtribuidas(escolasResult.data || [])
    } catch (error) {
      console.error("[Técnico Field] Erro ao carregar dados:", error)
      setErro(getErrorMessage(error))
      setVisitas([])
      setAvaliacoes([])
      setEscolasAtribuidas([])
      setTecnicoCadastro(null)
    } finally {
      setLoading(false)
    }
  }, [supabase, tecnico])

  useEffect(() => {
    carregar()
  }, [carregar])

  const stats = useMemo(() => {
    const ordenadas = [...visitas].sort((a, b) => {
      const dataA = String(a.data_visita || a.data_prevista || a.data_abertura || "")
      const dataB = String(b.data_visita || b.data_prevista || b.data_abertura || "")

      if (dataA !== dataB) return dataB.localeCompare(dataA)

      const codA = String(a.chamado || "")
      const codB = String(b.chamado || "")

      return codB.localeCompare(codA, undefined, { numeric: true })
    })

    const atendidos = visitas.filter((v) => isStatusFinalizado(v.status))
    const pendentes = visitas.filter((v) => isStatusPendente(v.status))

    const visitasComFinalizacao = atendidos.filter(
      (v) => (v.data_realizacao || v.data_visita) && v.data_finalizacao
    )

    const somaDiasUteis = visitasComFinalizacao.reduce((acc, v) => {
      const dataInicio = v.data_realizacao || v.data_visita
      return acc + calcBusinessDays(dataInicio, v.data_finalizacao)
    }, 0)

    const slaMedio =
      visitasComFinalizacao.length > 0
        ? (somaDiasUteis / visitasComFinalizacao.length).toFixed(1)
        : "0.0"

    const mediaAval =
      avaliacoes.length > 0
        ? (
            avaliacoes.reduce((acc, a) => acc + Number(a.nota_media || 0), 0) /
            avaliacoes.length
          ).toFixed(1)
        : "0.0"

    const catCount: Record<string, number> = {}

    visitas.forEach((v) => {
      const categoria = textoSeguro(v.categoria, "")

      if (categoria) {
        catCount[categoria] = (catCount[categoria] || 0) + 1
      }
    })

    const categorias = Object.entries(catCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || ordenarTexto(a.name, b.name))

    const escolasAtendidas = Array.from(
      new Set(visitas.map((v) => textoSeguro(v.escola, "")).filter(Boolean))
    ).sort(ordenarTexto)

    const elogios = avaliacoes.map((a) => a.elogios).filter(Boolean)
    const sugestoes = avaliacoes.map((a) => a.sugestoes).filter(Boolean)
    const reclamacoes = avaliacoes.map((a) => a.reclamacoes).filter(Boolean)

    const taxaConclusao = calcularPercentual(atendidos.length, visitas.length)

    const escolasAtribuidasNomes = new Set(
      escolasAtribuidas
        .map((e) => normalizarTexto(e.nome_escola))
        .filter(Boolean)
    )

    const escolasAtendidasAtribuidas = escolasAtendidas.filter((nome) =>
      escolasAtribuidasNomes.has(normalizarTexto(nome))
    )

    const coberturaAtribuidas = calcularPercentual(
      escolasAtendidasAtribuidas.length,
      escolasAtribuidas.length
    )

    const mesesMap: Record<string, { key: string; label: string; value: number }> = {}

    visitas.forEach((v) => {
      const data = parseDateLocal(v.data_visita || v.data_prevista || v.data_abertura)

      if (!data) return

      const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
      const label = data
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "")
        .toUpperCase()

      mesesMap[key] = {
        key,
        label,
        value: (mesesMap[key]?.value || 0) + 1,
      }
    })

    const meses = Object.values(mesesMap).sort((a, b) => a.key.localeCompare(b.key))
    const maiorMes = meses.reduce((maior, item) => Math.max(maior, item.value), 0)

    const ultimaVisita =
      ordenadas.find((item) => item.data_visita)?.data_visita ||
      ordenadas.find((item) => item.data_prevista)?.data_prevista ||
      null

    return {
      ordenadas,
      atendidos,
      pendentes,
      totalAtendidos: atendidos.length,
      totalPendentes: pendentes.length,
      totalChamados: visitas.length,
      slaMedio,
      mediaAval,
      categorias,
      escolasAtendidas,
      elogios,
      sugestoes,
      reclamacoes,
      taxaConclusao,
      coberturaAtribuidas,
      escolasAtendidasAtribuidas,
      meses,
      maiorMes,
      ultimaVisita,
    }
  }, [visitas, avaliacoes, escolasAtribuidas])

  const categoriasFiltro = useMemo(() => {
    return Array.from(
      new Set(visitas.map((item) => textoSeguro(item.categoria, "")).filter(Boolean))
    ).sort(ordenarTexto)
  }, [visitas])

  const chamadosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    return stats.ordenadas.filter((item) => {
      const matchBusca = termo
        ? [
            item.chamado,
            item.escola,
            item.categoria,
            item.subcategoria,
            item.status,
            item.abertura_por,
            item.descricao,
            item.resolucao,
          ]
            .map(normalizarTexto)
            .join(" ")
            .includes(termo)
        : true

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "realizada" && isStatusFinalizado(item.status)) ||
        (filtroStatus === "pendente" && isStatusPendente(item.status)) ||
        (filtroStatus === "outros" &&
          !isStatusFinalizado(item.status) &&
          !isStatusPendente(item.status))

      const matchCategoria =
        filtroCategoria === "todas" || item.categoria === filtroCategoria

      return matchBusca && matchStatus && matchCategoria
    })
  }, [busca, filtroCategoria, filtroStatus, stats.ordenadas])

  const tecnicoAtivo = tecnicoCadastro?.ativo === true

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Carregando painel do técnico
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2.25rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_32%)]" />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_470px] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                Técnico Field
              </Badge>

              <Badge
                className={
                  tecnicoAtivo
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }
              >
                {tecnicoCadastro
                  ? tecnicoAtivo
                    ? "Ativo"
                    : "Histórico / inativo"
                  : "Histórico"}
              </Badge>

              <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                Análise individual
              </Badge>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-3xl font-black tracking-tight text-white md:text-5xl">
                  <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                    {tecnico || "Técnico"}
                  </span>
                </h1>

                <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
                  Painel individual com produtividade, escolas vinculadas, histórico de
                  atendimentos, avaliações e indicadores operacionais do técnico.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/fields"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
                >
                  ← Voltar para Fields
                </Link>

                <button
                  type="button"
                  onClick={carregar}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  ↻ Atualizar
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniHeroStat
              label="Chamados"
              value={stats.totalChamados}
              helper="Histórico"
              tone="blue"
            />
            <MiniHeroStat
              label="Conclusão"
              value={`${stats.taxaConclusao}%`}
              helper="Taxa geral"
              tone="emerald"
            />
            <MiniHeroStat
              label="Escolas"
              value={stats.escolasAtendidas.length}
              helper="Visitadas"
              tone="cyan"
            />
            <MiniHeroStat
              label="Última visita"
              value={formatarDataBR(stats.ultimaVisita)}
              helper="Data registrada"
              tone="purple"
            />
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {erro}
        </div>
      )}

      {/* KPI GRID */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Atendidos"
          value={stats.totalAtendidos}
          subtitle="Chamados concluídos"
          color="blue"
        />
        <KpiCard
          title="Pendentes"
          value={stats.totalPendentes}
          subtitle="Em aberto"
          color="yellow"
        />
        <KpiCard
          title="SLA Médio"
          value={`${stats.slaMedio}d`}
          subtitle="Dias úteis"
          color="purple"
        />
        <KpiCard
          title="Avaliação"
          value={`${stats.mediaAval} ⭐`}
          subtitle="Média feedback"
          color="emerald"
        />
      </section>

      {/* INSIGHTS */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <InsightCard
          icon="🎯"
          title="Cobertura das atribuições"
          value={`${stats.coberturaAtribuidas}%`}
          description={`${stats.escolasAtendidasAtribuidas.length} de ${escolasAtribuidas.length} escola(s) atribuída(s) aparecem no histórico de visitas.`}
          tone="blue"
        />

        <InsightCard
          icon="🏫"
          title="Escolas visitadas"
          value={stats.escolasAtendidas.length}
          description="Quantidade de unidades diferentes com atendimento registrado no histórico do técnico."
          tone="emerald"
        />

        <InsightCard
          icon="📦"
          title="Categoria mais frequente"
          value={stats.categorias[0]?.name || "Sem dados"}
          description={
            stats.categorias[0]
              ? `${stats.categorias[0].value} chamado(s) nessa categoria.`
              : "Ainda não há categorias registradas."
          }
          tone="purple"
        />
      </section>

      {/* GRÁFICOS / FEEDBACKS */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <Glass title="Mix de categorias" subtitle="Distribuição dos chamados por categoria">
          <SimplePieChart data={stats.categorias} />
        </Glass>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <FeedbackSection title="Elogios" color="emerald" items={stats.elogios} />
          <FeedbackSection title="Sugestões" color="yellow" items={stats.sugestoes} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <Glass title="Volume mensal" subtitle="Chamados distribuídos por mês">
          {stats.meses.length === 0 ? (
            <EmptyState
              icon="📊"
              title="Sem volume mensal"
              description="Não há datas suficientes para montar a evolução mensal."
            />
          ) : (
            <div className="space-y-4">
              {stats.meses.map((mes) => {
                const percentual = stats.maiorMes
                  ? Math.max(8, Math.round((mes.value / stats.maiorMes) * 100))
                  : 0

                return (
                  <div key={mes.key}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {mes.label}
                      </p>
                      <p className="text-sm font-black text-white">
                        {mes.value} chamado(s)
                      </p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Glass>

        <FeedbackSection
          title="Reclamações"
          color="red"
          items={stats.reclamacoes}
        />
      </section>

      {/* ESCOLAS */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Glass
          title={`Escolas atribuídas (${escolasAtribuidas.length})`}
          subtitle="Vínculo atual vindo da tabela escolas"
          rightElement={<PulseBadge count={escolasAtribuidas.length} />}
        >
          <div className="custom-scrollbar mt-2 max-h-[360px] space-y-3 overflow-y-auto pr-2">
            {escolasAtribuidas.length === 0 ? (
              <EmptyState
                icon="📍"
                title="Nenhuma escola atribuída"
                description="Não há escola oficialmente vinculada a este técnico no campo tecnico_atribuido."
              />
            ) : (
              escolasAtribuidas.map((e, index) => (
                <div
                  key={`${e.cie || index}-${e.nome_escola}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-cyan-500/35 hover:bg-slate-900/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white transition group-hover:text-cyan-300">
                        {e.nome_escola}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {e.endereco || "Endereço não informado"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                      CIE {e.cie || "N/A"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Glass>

        <Glass
          title={`Histórico de escolas visitadas (${stats.escolasAtendidas.length})`}
          subtitle="Unidades presentes nos chamados do técnico"
          rightElement={<PulseBadge count={stats.escolasAtendidas.length} />}
        >
          <div className="custom-scrollbar mt-2 max-h-[360px] space-y-3 overflow-y-auto pr-2">
            {stats.escolasAtendidas.length === 0 ? (
              <EmptyState
                icon="🏫"
                title="Sem escolas no histórico"
                description="O técnico ainda não possui chamados registrados em unidades escolares."
              />
            ) : (
              stats.escolasAtendidas.map((escola) => {
                const atribuida = escolasAtribuidas.some(
                  (item) => normalizarTexto(item.nome_escola) === normalizarTexto(escola)
                )

                return (
                  <div
                    key={escola}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-blue-500/35 hover:bg-slate-900/70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                        ✓
                      </span>

                      <p className="truncate text-sm font-bold text-slate-200">
                        {escola}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        atribuida
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-700 bg-slate-900 text-slate-500"
                      }`}
                    >
                      {atribuida ? "Atribuída" : "Histórico"}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </Glass>
      </section>

      {/* HISTÓRICO DE ATENDIMENTOS */}
      <Glass
        title="Histórico completo de atendimentos"
        subtitle={`${chamadosFiltrados.length} chamado(s) encontrado(s) no filtro atual`}
      >
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_240px]">
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-500">
              🔍
            </span>

            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar chamado, escola, categoria, descrição..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 pl-11 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="todos">Todos os status</option>
            <option value="realizada">Realizados</option>
            <option value="pendente">Pendentes</option>
            <option value="outros">Outros</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(event) => setFiltroCategoria(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="todas">Todas as categorias</option>
            {categoriasFiltro.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {chamadosFiltrados.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Nenhum chamado encontrado"
              description="Ajuste os filtros ou verifique se existem atendimentos registrados para este técnico."
            />
          ) : (
            chamadosFiltrados.map((v) => {
              const isVerde = isStatusFinalizado(v.status)
              const dataInicio = v.data_realizacao || v.data_visita

              return (
                <article
                  key={`${v.id || v.chamado}-${v.escola}`}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5 transition hover:-translate-y-[1px] hover:border-blue-500/35 hover:bg-slate-900/70"
                >
                  <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-500/5 blur-3xl opacity-0 transition group-hover:opacity-100" />

                  <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setChamadoSelecionado(v)}
                          className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
                          title="Ver detalhes completos do chamado"
                        >
                          #{v.chamado || "N/A"}
                        </button>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClasses(
                            v.status
                          )}`}
                        >
                          {getStatusLabel(v.status)}
                        </span>

                        {v.categoria && (
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {v.categoria}
                          </span>
                        )}
                      </div>

                      <h3 className="break-words text-lg font-black text-white sm:text-xl">
                        {v.escola || "Escola não informada"}
                      </h3>

                      <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-600">
                        {textoSeguro(v.subcategoria, "Subcategoria não informada")} •
                        Prevista em {formatarDataBR(v.data_prevista)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px] xl:shrink-0">
                      <SmallMetric label="Abertura" value={formatarDataBR(v.data_abertura)} />
                      <SmallMetric label="Visita" value={formatarDataBR(v.data_visita)} />
                      <SmallMetric label="Finalização" value={formatarDataBR(v.data_finalizacao)} />
                      <SmallMetric
                        label="SLA"
                        value={
                          v.data_finalizacao && dataInicio
                            ? `${calcBusinessDays(dataInicio, v.data_finalizacao)}d`
                            : "-"
                        }
                        highlight={isVerde}
                      />
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </Glass>

      {/* MODAL SPLASH PAGE DE DETALHES DO CHAMADO */}
      {chamadoSelecionado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl shadow-slate-950/70">
            {/* HEADER FIXO */}
            <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 px-5 py-5 sm:px-7 sm:py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_34%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                      {chamadoSelecionado.categoria || "Geral"}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClasses(
                        chamadoSelecionado.status
                      )}`}
                    >
                      {getStatusLabel(chamadoSelecionado.status)}
                    </span>
                  </div>

                  <h2 className="break-words text-xl font-black leading-snug tracking-tight text-white sm:text-2xl lg:text-3xl">
                    <span className="text-blue-400">
                      {chamadoSelecionado.chamado || "N/A"}
                    </span>{" "}
                    <span className="text-slate-300">•</span>{" "}
                    {chamadoSelecionado.escola || "Escola não informada"}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-slate-500 sm:text-sm">
                    <span>
                      Técnico atribuído:{" "}
                      <strong className="font-black text-slate-300">
                        {chamadoSelecionado.tecnico || "Não informado"}
                      </strong>
                    </span>

                    <span className="hidden text-slate-700 sm:inline">|</span>

                    <span>
                      Aberto por:{" "}
                      <strong className="font-black text-slate-300">
                        {chamadoSelecionado.abertura_por || "Não informado"}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setChamadoSelecionado(null)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xl font-black text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
                  aria-label="Fechar detalhes do chamado"
                >
                  X
                </button>
              </div>
            </div>

            {/* CONTEÚDO COM SCROLL ISOLADO */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <DetailCard
                    label="Data abertura"
                    value={formatarDataBR(chamadoSelecionado.data_abertura)}
                    tone="slate"
                  />

                  <DetailCard
                    label="Data prevista"
                    value={formatarDataBR(chamadoSelecionado.data_prevista)}
                    tone="yellow"
                  />

                  <DetailCard
                    label="Data visita"
                    value={formatarDataBR(chamadoSelecionado.data_visita)}
                    tone="blue"
                  />

                  <DetailCard
                    label="Finalização"
                    value={formatarDataBR(chamadoSelecionado.data_finalizacao)}
                    tone="emerald"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailCard
                    label="Urgência / Impacto"
                    value={`${chamadoSelecionado.urgencia || "N/A"} / ${
                      chamadoSelecionado.impacto || "N/A"
                    }`}
                    tone="slate"
                  />

                  <DetailCard
                    label="Subcategoria"
                    value={chamadoSelecionado.subcategoria || "N/A"}
                    tone="blue"
                  />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#020617] p-5 sm:p-6">
                  <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <span className="text-lg">📝</span>
                    Descrição do problema
                  </p>

                  <div className="rounded-2xl border border-slate-900 bg-slate-950/50 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                      {chamadoSelecionado.descricao ||
                        "Sem descrição detalhada registrada."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 sm:p-6">
                  <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-300">
                    <span className="text-lg">🛠️</span>
                    Resolução aplicada
                  </p>

                  <div className="rounded-2xl border border-blue-500/10 bg-[#020617]/70 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-blue-100/80">
                      {chamadoSelecionado.resolucao ||
                        "Sem resolução registrada para este chamado ainda."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER FIXO */}
            <div className="shrink-0 border-t border-slate-800 bg-slate-950/95 px-5 py-4 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-600">
                  Visualização detalhada do atendimento Field.
                </p>

                <button
                  type="button"
                  onClick={() => setChamadoSelecionado(null)}
                  className="rounded-2xl bg-slate-800 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                >
                  Fechar detalhes
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

        .animate-fade-in {
          animation: fadeIn 0.18s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

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

function Glass({
  children,
  title,
  subtitle,
  rightElement,
  className = "",
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  rightElement?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {(title || rightElement) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h3 className="text-lg font-black text-white">{title}</h3>}
            {subtitle && (
              <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
            )}
          </div>

          {rightElement && <div className="shrink-0">{rightElement}</div>}
        </div>
      )}

      {children}
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string | number
  subtitle: string
  color: "blue" | "purple" | "yellow" | "emerald"
}) {
  const gradients = {
    blue: "from-blue-600/20 to-transparent border-blue-500/30",
    purple: "from-purple-600/20 to-transparent border-purple-500/30",
    yellow: "from-yellow-600/20 to-transparent border-yellow-500/30",
    emerald: "from-emerald-600/20 to-transparent border-emerald-500/30",
  }

  const textColors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
  }

  const accent = {
    blue: "from-blue-500",
    purple: "from-purple-500",
    yellow: "from-yellow-500",
    emerald: "from-emerald-500",
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1.7rem] border bg-[#020617] bg-gradient-to-br p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:shadow-2xl md:p-6 ${gradients[color]}`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accent[color]} to-transparent opacity-70`}
      />

      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className="mb-2 text-3xl font-black text-white md:text-4xl">{value}</p>

      <p
        className={`inline-block rounded-lg bg-black/20 px-2 py-1 text-[11px] font-black uppercase tracking-tight ${textColors[color]}`}
      >
        {subtitle}
      </p>
    </div>
  )
}

function MiniHeroStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  tone: "blue" | "emerald" | "cyan" | "purple"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-85">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {typeof value === "number" ? formatarNumero(value) : value}
      </p>

      <p className="mt-1 text-xs font-semibold opacity-80">{helper}</p>
    </div>
  )
}

function InsightCard({
  icon,
  title,
  value,
  description,
  tone,
}: {
  icon: string
  title: string
  value: string | number
  description: string
  tone: "blue" | "emerald" | "purple"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
  }

  return (
    <div className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${styles[tone]}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function PulseBadge({ count }: { count: number }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute -inset-1 animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 opacity-40 blur" />

      <div className="relative flex items-center gap-2.5 rounded-full border border-cyan-500/50 bg-[#020617] px-4 py-1.5 text-xs font-black text-white shadow-xl">
        <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        {count}
        <span className="text-[10px] uppercase tracking-widest text-cyan-400/80">
          Total
        </span>
      </div>
    </div>
  )
}

function SimplePieChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#facc15",
    "#ef4444",
    "#f97316",
    "#06b6d4",
  ]

  const total = data.reduce((acc, curr) => acc + Number(curr.value || 0), 0)
  let cumulativePercent = 0

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent)
    const y = Math.sin(2 * Math.PI * percent)
    return [x, y]
  }

  if (total === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Sem categorias"
        description="Ainda não há categorias registradas para este técnico."
      />
    )
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative h-52 w-52 shrink-0">
        <svg viewBox="-1 -1 2 2" className="h-full w-full -rotate-90 transform">
          {data.map((slice, index) => {
            if (slice.value === total) {
              return (
                <circle
                  key={slice.name}
                  cx="0"
                  cy="0"
                  r="1"
                  fill={colors[index % colors.length]}
                />
              )
            }

            const [startX, startY] = getCoordinatesForPercent(cumulativePercent)
            cumulativePercent += slice.value / total
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent)
            const largeArcFlag = slice.value / total > 0.5 ? 1 : 0

            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              "L 0 0",
            ].join(" ")

            return (
              <path
                key={slice.name}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="#020617"
                strokeWidth="0.02"
              />
            )
          })}

          <circle cx="0" cy="0" r="0.7" fill="#020617" />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Total
          </span>
          <span className="mt-1 text-3xl font-black leading-none text-white">
            {formatarNumero(total)}
          </span>
        </div>
      </div>

      <div className="mt-8 flex w-full flex-wrap justify-center gap-2">
        {data.map((slice, index) => (
          <div
            key={slice.name}
            className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5"
          >
            <span
              className="h-3 w-3 rounded-full shadow-inner"
              style={{ backgroundColor: colors[index % colors.length] }}
            />

            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              {slice.name}{" "}
              <span className="ml-0.5 text-slate-500">({slice.value})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeedbackSection({
  title,
  color,
  items,
}: {
  title: string
  color: "emerald" | "yellow" | "red"
  items: string[]
}) {
  const styles = {
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    yellow: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
    red: "border-red-500/20 bg-red-500/5 text-red-300",
  }

  return (
    <div
      className={`h-full rounded-[2rem] border bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${styles[color]}`}
    >
      <h3 className="mb-5 text-xs font-black uppercase tracking-[0.2em]">
        {title}
      </h3>

      <div className="custom-scrollbar max-h-[320px] space-y-3 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center">
            <p className="text-sm font-medium text-slate-600">
              Nenhum registro encontrado.
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm font-medium leading-relaxed text-slate-300"
            >
              “{item}”
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center">
      <div className="mb-4 text-4xl">{icon}</div>

      <p className="text-sm font-black uppercase tracking-widest text-white">
        {title}
      </p>

      <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function SmallMetric({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        highlight
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : "border-slate-800 bg-[#020617] text-slate-400"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function DetailCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "slate" | "yellow" | "blue" | "emerald"
}) {
  const styles = {
    slate: "border-slate-800 bg-[#020617] text-slate-300",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>

      <p className="text-base font-black text-white sm:text-lg">{value}</p>
    </div>
  )
}