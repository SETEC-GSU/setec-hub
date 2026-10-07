"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import Link from "next/link"

import { createClient } from "@/lib/supabase"

const DIAS_DESATUALIZADO = 90

type Stats = {
  chamadosAtendidos: number

  chamadosAbertos: number

  chamadosAtendidosFields: number

  equipamentosRecebidos: number

  escolasCadastradas: number

  inventariosAtualizados: number

  inventariosPendentes: number
}

type Tutorial = {
  id: string

  titulo: string | null

  descricao?: string | null

  categoria?: string | null

  subcategoria?: string | null

  arquivo_url?: string | null

  visualizacoes?: number | null
}

type Visita = {
  id: number | string

  escola?: string | null

  tecnico?: string | null

  status?: string | null

  data_visita?: string | null

  categoria?: string | null

  subcategoria?: string | null
}

type Aviso = {
  id: string

  titulo?: string | null

  descricao?: string | null

  emoji?: string | null

  tipo?: string | null

  ativo?: boolean | null

  data_inicio?: string | null

  data_fim?: string | null

  created_at?: string | null
}

type Tecnico = {
  nome: string

  ativo?: boolean | null
}

type PerfilUsuario = {
  id: string

  nome?: string | null

  email?: string | null

  role?: string | null

  setor?: string | null
}

type InventarioEscolaStatus = {
  escolaNome: string

  emDia: boolean

  ultimaAtualizacao: string | null

  diasDesdeAtualizacao: number | null

  diasRestantes: number
}

type MensagemTela = {
  tipo: "error" | "success" | "info"

  texto: string
} | null

const statsIniciais: Stats = {
  chamadosAtendidos: 0,

  chamadosAbertos: 0,

  chamadosAtendidosFields: 0,

  equipamentosRecebidos: 0,

  escolasCadastradas: 0,

  inventariosAtualizados: 0,

  inventariosPendentes: 0,
}

const AVISO_CONFIGS: Record<
  string,
  {
    label: string

    emoji: string

    prioridade: number

    badge: string

    card: string

    iconBox: string

    glow: string
  }
> = {
  urgente: {
    label: "Urgente",

    emoji: "🚨",

    prioridade: 1,

    badge: "border-red-500/30 bg-red-500/10 text-red-300",

    card: "border-red-500/25 bg-gradient-to-br from-red-500/10 via-slate-900/80 to-[#020617]",

    iconBox: "border-red-500/25 bg-red-500/10",

    glow: "bg-red-500/10",
  },

  alerta: {
    label: "Alerta",

    emoji: "⚠️",

    prioridade: 2,

    badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",

    card: "border-yellow-500/25 bg-gradient-to-br from-yellow-500/10 via-slate-900/80 to-[#020617]",

    iconBox: "border-yellow-500/25 bg-yellow-500/10",

    glow: "bg-yellow-500/10",
  },

  comunicado: {
    label: "Comunicado",

    emoji: "📢",

    prioridade: 3,

    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",

    card: "border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-[#020617]",

    iconBox: "border-cyan-500/25 bg-cyan-500/10",

    glow: "bg-cyan-500/10",
  },

  manutencao: {
    label: "Manutenção",

    emoji: "🛠️",

    prioridade: 4,

    badge: "border-purple-500/30 bg-purple-500/10 text-purple-300",

    card: "border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-slate-900/80 to-[#020617]",

    iconBox: "border-purple-500/25 bg-purple-500/10",

    glow: "bg-purple-500/10",
  },

  sucesso: {
    label: "Normalizado",

    emoji: "✅",

    prioridade: 5,

    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",

    card: "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-[#020617]",

    iconBox: "border-emerald-500/25 bg-emerald-500/10",

    glow: "bg-emerald-500/10",
  },

  informativo: {
    label: "Informativo",

    emoji: "ℹ️",

    prioridade: 6,

    badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",

    card: "border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-slate-900/80 to-[#020617]",

    iconBox: "border-blue-500/25 bg-blue-500/10",

    glow: "bg-blue-500/10",
  },
}

function getAvisoConfig(tipo: unknown) {
  const tipoLimpo = normalizarTexto(tipo)

  return AVISO_CONFIGS[tipoLimpo] || AVISO_CONFIGS.informativo
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .trim()
}

function textoSeguro(value: unknown, fallback = "") {
  const texto = String(value || "").trim()

  return texto || fallback
}

function toNumber(value: unknown) {
  const numero = Number(value || 0)

  return Number.isFinite(numero) ? numero : 0
}

function isChamadoAtendido(status: unknown) {
  const statusLimpo = normalizarTexto(status)

  return (
    statusLimpo.includes("resolvido") ||
    statusLimpo.includes("concluido") ||
    statusLimpo.includes("concluida") ||
    statusLimpo.includes("fechado") ||
    statusLimpo.includes("closed")
  )
}

function isChamadoAberto(status: unknown) {
  const statusLimpo = normalizarTexto(status)

  if (!statusLimpo) return true

  const fechado = isChamadoAtendido(statusLimpo)

  const statusIgnorado =
    statusLimpo.includes("cancelado") ||
    statusLimpo.includes("cancelada") ||
    statusLimpo.includes("arquivado") ||
    statusLimpo.includes("arquivada")

  return !fechado && !statusIgnorado
}

function isChamadoFinalizadoFields(status: unknown) {
  const statusLimpo = normalizarTexto(status)

  return (
    statusLimpo === "realizada" ||
    statusLimpo === "realizado" ||
    statusLimpo === "finalizado" ||
    statusLimpo === "finalizada" ||
    statusLimpo === "concluido"
  )
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Sem data"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem data"

  return data.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  })
}

function formatarDataHora(dataIso?: string | null) {
  if (!dataIso) return "Sem registro"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",

    day: "2-digit",

    month: "2-digit",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",
  })
}

function getInventarioStatusClass(pendentes: number) {
  if (pendentes <= 0) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (pendentes <= 10) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
  }

  return "border-red-500/30 bg-red-500/10 text-red-300"
}

function ordenarAvisosPorPrioridade(avisos: Aviso[]) {
  return [...avisos].sort((a, b) => {
    const prioridadeA = getAvisoConfig(a.tipo).prioridade

    const prioridadeB = getAvisoConfig(b.tipo).prioridade

    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB

    const dataA = a.created_at ? new Date(a.created_at).getTime() : 0

    const dataB = b.created_at ? new Date(b.created_at).getTime() : 0

    return dataB - dataA
  })
}

function encontrarEscolaPorReferencia(
  referencia: unknown,

  escolas: Array<{ nome_escola?: string | null }>,
) {
  const referenciaNormalizada = normalizarTexto(referencia)

  if (!referenciaNormalizada || referenciaNormalizada.length < 5) {
    return null
  }

  const correspondenciaExata = escolas.find(
    (escola) => normalizarTexto(escola.nome_escola) === referenciaNormalizada,
  )

  if (correspondenciaExata) return correspondenciaExata

  return (
    escolas.find((escola) => {
      const nomeNormalizado = normalizarTexto(escola.nome_escola)

      if (!nomeNormalizado || nomeNormalizado.length < 5) return false

      return (
        referenciaNormalizada.includes(nomeNormalizado) ||
        nomeNormalizado.includes(referenciaNormalizada)
      )
    }) || null
  )
}

function encontrarUltimoInventario(
  nomeEscola: unknown,

  inventariosPorEscola: Map<string, { nome: string; data: number }>,
) {
  const nomeNormalizado = normalizarTexto(nomeEscola)

  if (!nomeNormalizado) return null

  const correspondenciaExata = inventariosPorEscola.get(nomeNormalizado)

  if (correspondenciaExata) return correspondenciaExata

  for (const [nomeInventario, registro] of inventariosPorEscola.entries()) {
    if (
      nomeInventario.length >= 5 &&
      (nomeNormalizado.includes(nomeInventario) ||
        nomeInventario.includes(nomeNormalizado))
    ) {
      return registro
    }
  }

  return null
}

export default function Home() {
  const supabase = useMemo(() => createClient(), [])

  const [stats, setStats] = useState<Stats>(statsIniciais)

  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario | null>(null)

  const [tutoriais, setTutoriais] = useState<Tutorial[]>([])

  const [visitas, setVisitas] = useState<Visita[]>([])

  const [avisos, setAvisos] = useState<Aviso[]>([])

  const [avisoSelecionado, setAvisoSelecionado] = useState<Aviso | null>(null)

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])

  const [inventarioEscola, setInventarioEscola] =
    useState<InventarioEscolaStatus | null>(null)

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(
    null,
  )

  const percentualInventario = useMemo(() => {
    if (stats.escolasCadastradas <= 0) return 0

    return Math.round(
      (stats.inventariosAtualizados / stats.escolasCadastradas) * 100,
    )
  }, [stats.escolasCadastradas, stats.inventariosAtualizados])

  const chamadosTotalOperacional =
    stats.chamadosAtendidos + stats.chamadosAbertos

  const percentualChamadosAtendidos =
    chamadosTotalOperacional > 0
      ? Math.round((stats.chamadosAtendidos / chamadosTotalOperacional) * 100)
      : 0

  const carregar = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      try {
        if (modo === "inicial") setLoading(true)

        if (modo === "manual") setRefreshing(true)

        setMensagem(null)

        const agora = new Date()

        const agoraTime = agora.getTime()

        const limiteTempo = agoraTime - DIAS_DESATUALIZADO * 24 * 60 * 60 * 1000

        let perfilAtual: PerfilUsuario | null = null

        const {
          data: { user: usuarioAutenticado },
        } = await supabase.auth.getUser()

        if (usuarioAutenticado) {
          const perfilPorId = await supabase

            .from("usuarios")

            .select("id, nome, email, role, setor")

            .eq("id", usuarioAutenticado.id)

            .maybeSingle()

          if (perfilPorId.data) {
            perfilAtual = perfilPorId.data as PerfilUsuario
          } else if (usuarioAutenticado.email) {
            const perfilPorEmail = await supabase

              .from("usuarios")

              .select("id, nome, email, role, setor")

              .ilike("email", usuarioAutenticado.email)

              .maybeSingle()

            if (perfilPorEmail.data) {
              perfilAtual = perfilPorEmail.data as PerfilUsuario
            }
          }
        }

        setPerfilUsuario(perfilAtual)

        const [
          chamadosResponse,

          visitasResponse,

          equipamentosResponse,

          escolasResponse,

          inventariosResponse,

          tutoriaisResponse,

          avisosResponse,

          tecnicosResponse,
        ] = await Promise.all([
          carregarTodasLinhas<{ id: string; status?: string | null }>(
            (inicio, fim, contar) =>
              supabase
                .from("chamados")
                .select("id, status", { count: contar ? "exact" : undefined })
                .order("id", { ascending: true })
                .range(inicio, fim),
          ),
          carregarTodasLinhas<Visita>((inicio, fim, contar) =>
            supabase
              .from("fields_visitas")
              .select(
                "id, escola, tecnico, status, data_visita, categoria, subcategoria",
                { count: contar ? "exact" : undefined },
              )
              .order("data_visita", { ascending: false, nullsFirst: false })
              .order("id", { ascending: false })
              .range(inicio, fim),
          ),

          supabase.from("equipamentos_recebidos").select("quantidade_recebida"),

          supabase.from("escolas").select("id, nome_escola"),

          supabase
            .from("inventario_respostas")
            .select("escola_nome, created_at"),

          supabase

            .from("base_conhecimento")

            .select(
              "id, titulo, descricao, categoria, subcategoria, arquivo_url, visualizacoes",
            )

            .order("visualizacoes", { ascending: false })

            .limit(8),

          supabase

            .from("avisos_setec")

            .select(
              "id, titulo, descricao, emoji, tipo, ativo, data_inicio, data_fim, created_at",
            )

            .eq("ativo", true)

            .order("created_at", { ascending: false }),

          supabase

            .from("tecnicos")

            .select("nome, ativo")

            .eq("ativo", true)

            .order("nome", { ascending: true }),
        ])

        if (chamadosResponse.error) throw chamadosResponse.error

        if (visitasResponse.error) throw visitasResponse.error

        if (equipamentosResponse.error) throw equipamentosResponse.error

        if (escolasResponse.error) throw escolasResponse.error

        if (inventariosResponse.error) throw inventariosResponse.error

        if (tutoriaisResponse.error) throw tutoriaisResponse.error

        if (avisosResponse.error) throw avisosResponse.error

        const chamados = chamadosResponse.data || []

        const visitasRealizadas = visitasResponse.data || []

        const equipamentos = equipamentosResponse.data || []

        const escolas = escolasResponse.data || []

        const inventarios = inventariosResponse.data || []

        const tutoriaisData = tutoriaisResponse.data || []

        const avisosData = avisosResponse.data || []

        const totalEscolas = escolas.length

        const inventariosPorEscola = new Map<
          string,
          { nome: string; data: number }
        >()

        inventarios.forEach((inventario: any) => {
          if (!inventario.escola_nome || !inventario.created_at) return

          const nomeOriginal = String(inventario.escola_nome).trim()

          const nomeNormalizado = normalizarTexto(nomeOriginal)

          const dataInventario = new Date(inventario.created_at).getTime()

          if (
            !nomeOriginal ||
            !nomeNormalizado ||
            Number.isNaN(dataInventario)
          ) {
            return
          }

          const registroAtual = inventariosPorEscola.get(nomeNormalizado)

          if (!registroAtual || dataInventario > registroAtual.data) {
            inventariosPorEscola.set(nomeNormalizado, {
              nome: nomeOriginal,

              data: dataInventario,
            })
          }
        })

        let escolasAtualizadas = 0

        escolas.forEach((escola: any) => {
          const ultimoInventario = encontrarUltimoInventario(
            escola.nome_escola,

            inventariosPorEscola,
          )

          if (ultimoInventario && ultimoInventario.data >= limiteTempo) {
            escolasAtualizadas += 1
          }
        })

        const inventariosPendentes = Math.max(
          totalEscolas - escolasAtualizadas,

          0,
        )

        const escolaDoUsuario = encontrarEscolaPorReferencia(
          perfilAtual?.setor,

          escolas,
        )

        if (escolaDoUsuario?.nome_escola) {
          const ultimoInventario = encontrarUltimoInventario(
            escolaDoUsuario.nome_escola,

            inventariosPorEscola,
          )

          const diasDesdeAtualizacao = ultimoInventario
            ? Math.max(
                0,

                Math.floor(
                  (agoraTime - ultimoInventario.data) / (24 * 60 * 60 * 1000),
                ),
              )
            : null

          setInventarioEscola({
            escolaNome: escolaDoUsuario.nome_escola,

            emDia: Boolean(
              ultimoInventario && ultimoInventario.data >= limiteTempo,
            ),

            ultimaAtualizacao: ultimoInventario
              ? new Date(ultimoInventario.data).toISOString()
              : null,

            diasDesdeAtualizacao,

            diasRestantes:
              diasDesdeAtualizacao === null
                ? 0
                : Math.max(
                    DIAS_DESATUALIZADO - diasDesdeAtualizacao,

                    0,
                  ),
          })
        } else {
          setInventarioEscola(null)
        }

        const avisosValidos = ordenarAvisosPorPrioridade(
          avisosData.filter((aviso: any) => {
            const dataInicio = aviso.data_inicio
              ? new Date(aviso.data_inicio).getTime()
              : 0

            const dataFim = aviso.data_fim
              ? new Date(aviso.data_fim).getTime()
              : Number.POSITIVE_INFINITY

            return dataInicio <= agoraTime && dataFim >= agoraTime
          }) as Aviso[],
        ).slice(0, 3)

        let tecnicosFormatados: Tecnico[] = []

        if (!tecnicosResponse.error && tecnicosResponse.data?.length) {
          tecnicosFormatados = tecnicosResponse.data

            .filter((tecnico: any) => tecnico?.nome)

            .map((tecnico: any) => ({
              nome: String(tecnico.nome),

              ativo: tecnico.ativo,
            }))
        } else {
          const tecnicosFallback = new Set<string>()

          visitasRealizadas.forEach((visita: any) => {
            if (visita.tecnico) {
              tecnicosFallback.add(String(visita.tecnico))
            }
          })

          tecnicosFormatados = Array.from(tecnicosFallback)

            .sort((a, b) => a.localeCompare(b, "pt-BR"))

            .map((nome) => ({ nome, ativo: true }))
        }

        setStats({
          chamadosAtendidos: chamados.filter((chamado: any) =>
            isChamadoAtendido(chamado.status),
          ).length,

          chamadosAbertos: chamados.filter((chamado: any) =>
            isChamadoAberto(chamado.status),
          ).length,

          chamadosAtendidosFields: visitasRealizadas.filter((visita: any) =>
            isChamadoFinalizadoFields(visita.status),
          ).length,

          equipamentosRecebidos: equipamentos.reduce(
            (acc: number, item: any) =>
              acc + toNumber(item.quantidade_recebida),

            0,
          ),

          escolasCadastradas: totalEscolas,

          inventariosAtualizados: escolasAtualizadas,

          inventariosPendentes,
        })

        setTutoriais(tutoriaisData as Tutorial[])

        setVisitas((visitasRealizadas || []).slice(0, 5) as Visita[])

        setAvisos(avisosValidos)

        setTecnicos(tecnicosFormatados)

        setUltimaAtualizacao(new Date().toISOString())

        if (modo === "manual") {
          setMensagem({
            tipo: "success",

            texto: "Painel inicial atualizado com sucesso.",
          })
        }
      } catch (error: any) {
        console.error("Erro ao carregar painel inicial:", error)

        setMensagem({
          tipo: "error",

          texto:
            error?.message ||
            "Não foi possível carregar os dados da Central Operacional SETEC.",
        })
      } finally {
        setLoading(false)

        setRefreshing(false)
      }
    },

    [supabase],
  )

  useEffect(() => {
    carregar("inicial")
  }, [carregar])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 5500)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  useEffect(() => {
    if (!avisoSelecionado) return

    const overflowAnterior = document.body.style.overflow

    document.body.style.overflow = "hidden"

    function fecharComEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAvisoSelecionado(null)
      }
    }

    window.addEventListener("keydown", fecharComEsc)

    return () => {
      document.body.style.overflow = overflowAnterior

      window.removeEventListener("keydown", fecharComEsc)
    }
  }, [avisoSelecionado])

  if (loading) {
    return <LoadingPage />
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_30%)]" />

        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
                SETEC Hub
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Painel Inicial
              </span>

              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                URE Guarulhos Sul
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Painel Operacional - SETEC Hub
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Visão rápida das principais operações de tecnologia: chamados,
              inventário, equipamentos, Field, avisos internos e acessos
              essenciais do sistema.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"

                onClick={() => carregar("manual")}

                disabled={refreshing}

                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className={refreshing ? "animate-spin" : ""}>↻</span>

                {refreshing ? "Atualizando" : "Atualizar painel"}
              </button>

              <span className="text-xs font-semibold text-slate-600">
                Última atualização: {formatarDataHora(ultimaAtualizacao)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:min-w-[360px]">
            <MiniIndicator
              label={inventarioEscola ? "Inventário da escola" : "Inventário"}

              value={
                inventarioEscola
                  ? inventarioEscola.emDia
                    ? "OK"
                    : "PENDENTE"
                  : `${percentualInventario}%`
              }

              description={
                inventarioEscola
                  ? inventarioEscola.escolaNome
                  : `${stats.inventariosAtualizados}/${stats.escolasCadastradas} UEs`
              }

              tone={
                inventarioEscola
                  ? inventarioEscola.emDia
                    ? "green"
                    : "yellow"
                  : stats.inventariosPendentes > 0
                    ? "yellow"
                    : "green"
              }
            />

            <MiniIndicator
              label="Chamados"

              value={`${percentualChamadosAtendidos}%`}

              description="Atendimento registrado"

              tone="blue"
            />
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            mensagem.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : mensagem.tipo === "info"
                ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <section
        aria-label="Indicadores operacionais"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          titulo="Chamados atendidos pelo Hub"

          valor={stats.chamadosAtendidos}

          detalhe={`${stats.chamadosAbertos} chamado(s) ainda aberto(s)`}

          cor="green"

          icon="🎫"
        />

        <KpiCard
          titulo="Chamados nas escolas · FIELDs"

          valor={stats.chamadosAtendidosFields}

          detalhe="Atendimentos finalizados pelos Fields"

          cor="blue"

          icon="🧑‍🔧"
        />

        <KpiCard
          titulo="Equipamentos Recebidos"

          valor={stats.equipamentosRecebidos}

          detalhe="Total cadastrado para as escolas"

          cor="purple"

          icon="💻"
        />

        <KpiCard
          titulo="Escolas Cadastradas"

          valor={stats.escolasCadastradas}

          detalhe="Unidades ativas no sistema"

          cor="yellow"

          icon="🏫"
        />
      </section>

      {podeVerAgendaHoje(perfilUsuario?.role) && (
        <AgendaHoje cliente={supabase} revisaoPainel={ultimaAtualizacao} />
      )}

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">⚡ Acesso rápido</h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Atalhos para os principais módulos operacionais do SETEC Hub.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Quick href="/chamados" icon="🎫" label="Abrir Chamado com a SETEC" />

          <Quick href="/painel-chamados" icon="📊" label="Painel de Chamados" />

          <Quick href="/inventario" icon="💻" label="Inventário Tecnológico" />

          <Quick href="/apoio-usuario" icon="📚" label="Base de Conhecimento" />

          <Quick
            href="/calendario-seintec"
            icon="📅"
            label="Calendário SEINTEC–SETEC"
          />

          <Quick
            href="/dashboard-escolar"
            icon="🏫"
            label="Dashboard Escolar"
          />
        </div>
      </section>

      <section>
        <Panel>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                🚨 Avisos importantes - SETEC
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Comunicados ativos dentro do período de exibição configurado.
              </p>
            </div>

            {avisos.length > 0 && (
              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Ordenado por prioridade
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {avisos.length === 0 ? (
              <div className="lg:col-span-3">
                <EmptyState
                  icon="✅"

                  title="Nenhum aviso ativo"

                  description="Não há comunicados importantes no momento."
                />
              </div>
            ) : (
              avisos.map((aviso) => (
                <AvisoCard
                  key={aviso.id}

                  aviso={aviso}

                  onOpen={() => setAvisoSelecionado(aviso)}
                />
              ))
            )}
          </div>
        </Panel>
      </section>

      <section>
        <Panel>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                📋 Status do inventário
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Validade considerada: últimos {DIAS_DESATUALIZADO} dias.
              </p>
            </div>

            {inventarioEscola && (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                  inventarioEscola.emDia
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    inventarioEscola.emDia ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />

                {inventarioEscola.emDia
                  ? "Sua escola está em dia"
                  : "Sua escola precisa atualizar"}
              </span>
            )}
          </div>

          {inventarioEscola && (
            <div
              className={`mb-6 overflow-hidden rounded-2xl border p-5 ${
                inventarioEscola.emDia
                  ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.04] to-transparent"
                  : "border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/[0.04] to-transparent"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl font-black ${
                      inventarioEscola.emDia
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-red-500/30 bg-red-500/15 text-red-300"
                    }`}
                  >
                    {inventarioEscola.emDia ? "✓" : "!"}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-black ${
                        inventarioEscola.emDia
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {inventarioEscola.emDia
                        ? "Inventário da unidade atualizado"
                        : "Inventário da unidade pendente"}
                    </p>

                    <p className="mt-1 truncate text-base font-black text-white">
                      {inventarioEscola.escolaNome}
                    </p>

                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                      {inventarioEscola.ultimaAtualizacao
                        ? `Última atualização em ${formatarData(
                            inventarioEscola.ultimaAtualizacao,
                          )}. ${
                            inventarioEscola.emDia
                              ? `Validade restante: ${inventarioEscola.diasRestantes} dia(s).`
                              : `O registro está há ${inventarioEscola.diasDesdeAtualizacao} dia(s) sem recertificação.`
                          }`
                        : "Nenhuma resposta de inventário foi localizada para esta unidade."}
                    </p>
                  </div>
                </div>

                {!inventarioEscola.emDia && (
                  <Link
                    href="/inventario/atualizar"

                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-500"
                  >
                    Atualizar agora
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr] xl:items-center">
            <div
              className={`rounded-2xl border p-5 ${getInventarioStatusClass(
                stats.inventariosPendentes,
              )}`}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
                Recertificação geral
              </p>

              <p className="mt-3 text-5xl font-black">
                {percentualInventario}%
              </p>

              <p className="mt-2 text-sm font-bold opacity-80">
                {stats.inventariosAtualizados} de {stats.escolasCadastradas}{" "}
                escolas com inventário atualizado.
              </p>
            </div>

            <div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-4 rounded-full transition-all duration-1000 ${
                    percentualInventario >= 80
                      ? "bg-emerald-500"
                      : percentualInventario >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}

                  style={{ width: `${percentualInventario}%` }}
                />
              </div>

              <div className="mt-5">
                {stats.inventariosPendentes > 0 ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-black text-red-300">
                          {stats.inventariosPendentes} escola(s) precisam
                          revisar o inventário.
                        </p>

                        <p className="mt-1 text-xs font-medium leading-relaxed text-red-300/80">
                          A atualização ajuda a manter os indicadores de
                          equipamentos, garantia e parque tecnológico mais
                          confiáveis.
                        </p>
                      </div>

                      <Link
                        href="/inventario/atualizar"

                        className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-500"
                      >
                        Atualizar inventário
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-sm font-black text-emerald-300">
                      Todos os inventários estão em dia.
                    </p>

                    <p className="mt-1 text-xs font-medium leading-relaxed text-emerald-300/80">
                      As escolas cadastradas possuem atualização válida dentro
                      do período definido.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel className="h-full">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  📚 Tutoriais mais acessados
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Conteúdos da base de conhecimento com maior número de
                  visualizações.
                </p>
              </div>

              <Link
                href="/apoio-usuario"

                className="text-xs font-black uppercase tracking-widest text-blue-400 transition-all hover:text-blue-300"
              >
                Abrir base
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {tutoriais.length === 0 ? (
                <EmptyState
                  icon="📭"

                  title="Nenhum tutorial encontrado"

                  description="Ainda não há registros na base de conhecimento."
                />
              ) : (
                tutoriais.map((tutorial, index) => {
                  const href = tutorial.arquivo_url || "/apoio-usuario"

                  return (
                    <a
                      key={tutorial.id}

                      href={href}

                      target={tutorial.arquivo_url ? "_blank" : undefined}

                      rel={
                        tutorial.arquivo_url ? "noopener noreferrer" : undefined
                      }

                      className="group flex min-h-[92px] gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-blue-500/30 hover:bg-slate-900"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-[#020617] text-sm font-black text-blue-300">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black text-slate-200 transition-all group-hover:text-white">
                          {tutorial.titulo || "Tutorial sem título"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {tutorial.categoria && (
                            <span className="rounded-full border border-slate-700 bg-[#020617] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              {tutorial.categoria}
                            </span>
                          )}

                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-300">
                            {toNumber(tutorial.visualizacoes)} views
                          </span>
                        </div>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </Panel>
        </div>

        <div>
          <Panel className="h-full">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">
                  🧑‍🔧 Equipe Técnica FIELD
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Técnicos ativos cadastrados.
                </p>
              </div>

              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">
                {tecnicos.length}
              </span>
            </div>

            <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
              {tecnicos.length === 0 ? (
                <EmptyState
                  icon="🧑‍🔧"

                  title="Nenhum técnico localizado"

                  description="Não há técnicos ativos cadastrados ou visíveis para esta sessão."
                />
              ) : (
                tecnicos.map((tecnico) => (
                  <Link
                    href={`/fields/tecnico/${encodeURIComponent(tecnico.nome)}`}

                    key={tecnico.nome}

                    className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-all hover:border-blue-500/30 hover:bg-slate-900"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-black text-blue-300">
                      {getInitials(tecnico.nome)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-300 transition-all group-hover:text-white">
                        {tecnico.nome}
                      </p>

                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Técnico Field
                      </p>
                    </div>

                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </Link>
                ))
              )}
            </div>
          </Panel>
        </div>
      </section>

      <section>
        <Panel>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                📅 Últimas visitas Field
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Registros mais recentes de visitas técnicas cadastradas no
                módulo Field.
              </p>
            </div>

            <Link
              href="/fields/agenda-field"

              className="text-xs font-black uppercase tracking-widest text-blue-400 transition-all hover:text-blue-300"
            >
              Abrir agenda Field
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            {visitas.length === 0 ? (
              <div className="lg:col-span-5">
                <EmptyState
                  icon="📭"

                  title="Nenhuma visita encontrada"

                  description="Ainda não há registros recentes para exibição."
                />
              </div>
            ) : (
              visitas.map((visita) => (
                <div
                  key={String(visita.id)}

                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-300">
                      {visita.status || "Sem status"}
                    </span>

                    <span className="text-[10px] font-bold text-slate-600">
                      {formatarData(visita.data_visita)}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm font-black text-white">
                    {visita.escola || "Escola não informada"}
                  </p>

                  <p className="mt-2 truncate text-xs font-bold text-slate-400">
                    👨‍🔧 {visita.tecnico || "Técnico não informado"}
                  </p>

                  {(visita.categoria || visita.subcategoria) && (
                    <p className="mt-2 line-clamp-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {visita.categoria || "Sem categoria"}

                      {visita.subcategoria ? ` • ${visita.subcategoria}` : ""}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Panel>
      </section>

      {avisoSelecionado && (
        <AvisoModal
          aviso={avisoSelecionado}

          onClose={() => setAvisoSelecionado(null)}
        />
      )}

      <a
        href="https://wa.me/551124422282?text=Olá%2C%20minha%20escola%20está%20sem%20rede%2C%20poderiam%20abrir%20um%20chamado%20com%20a%20FDE%3F"

        target="_blank"

        rel="noopener noreferrer"

        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-red-900/20 transition-all hover:-translate-y-1 hover:bg-red-500"
      >
        <span className="text-lg">📡</span>

        <span className="hidden sm:inline">Minha escola está sem internet</span>

        <span className="sm:hidden">Sem internet</span>
      </a>
    </div>
  )
}

type ClienteHub = ReturnType<typeof createClient>
type AgendaAtividade = {
  id: string
  titulo: string
  tipo: "evento" | "compromisso" | "demanda"
  setor: string
  responsavel: string
  local: string
  descricao: string
  observacoes: string
  prioridade: string
  status: string
  inicio: string
  fim: string
  dia_inteiro: boolean
  versao: number
  created_at: string
  updated_at: string
}
type AgendaReserva = {
  id: string
  equipamento_id: string
  quantidade: number
  estado: "reservado" | "retirado" | "devolvido"
  retirado_em: string | null
  devolvido_em: string | null
  equipamento?: { id: string; nome: string; tipo: string; modelo: string }
}
type AgendaHistorico = {
  id: string
  acao: string
  usuario_nome: string
  created_at: string
}

const AGENDA_TIPOS = {
  evento: {
    nome: "Evento",
    classe: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    ponto: "bg-cyan-400",
  },
  compromisso: {
    nome: "Compromisso",
    classe: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    ponto: "bg-blue-400",
  },
  demanda: {
    nome: "Demanda",
    classe: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    ponto: "bg-amber-400",
  },
}
const AGENDA_STATUS: Record<string, { nome: string; classe: string }> = {
  planejado: {
    nome: "Planejado",
    classe: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  },
  confirmado: {
    nome: "Confirmado",
    classe: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  },
  em_andamento: {
    nome: "Em andamento",
    classe: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  },
  concluido: {
    nome: "Concluído",
    classe: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  },
  cancelado: {
    nome: "Cancelado",
    classe: "border-red-500/25 bg-red-500/10 text-red-300",
  },
}
const AGENDA_BOTAO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-500/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"

function podeVerAgendaHoje(role: unknown) {
  return ["seintec", "analista"].includes(normalizarTexto(role))
}
function hojeAgendaSP() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}
function diaAgendaSP(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}
function proximoDiaAgenda(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + 1)
  return data.toISOString().slice(0, 10)
}
function inicioDiaAgenda(dia: string) {
  const [ano, mes, data] = dia.split("-").map(Number)
  const alvo = Date.UTC(ano, mes - 1, data)
  let instante = alvo
  const formato = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      formato.formatToParts(new Date(instante)).map((x) => [x.type, x.value]),
    )
    const local = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    )
    const ajuste = alvo - local
    instante += ajuste
    if (!ajuste) break
  }
  return new Date(instante).toISOString()
}
function tituloDiaAgenda(dia: string) {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}
function horarioAgenda(a: AgendaAtividade) {
  if (a.dia_inteiro) return "Dia inteiro"
  const curto = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
  if (diaAgendaSP(a.inicio) !== diaAgendaSP(a.fim)) {
    const completo = (iso: string) =>
      new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    return `${completo(a.inicio)} → ${completo(a.fim)}`
  }
  return `${curto(a.inicio)}–${curto(a.fim)}`
}
function textoErroAgenda(erro: unknown) {
  return erro instanceof Error
    ? erro.message
    : textoSeguro(
        (erro as { message?: string })?.message,
        "Não foi possível carregar a agenda.",
      )
}
function statusAgenda(status: string) {
  return (
    AGENDA_STATUS[status] || {
      nome: status.replace(/_/g, " "),
      classe: "border-slate-700 bg-slate-800 text-slate-300",
    }
  )
}
async function autorizadoAgenda(cliente: ClienteHub) {
  const { data, error } = await cliente.rpc("seintec_contexto")
  if (error)
    throw new Error(
      "Não foi possível consultar o calendário. Confira a configuração do módulo ou tente novamente.",
    )
  const ctx = data as { ler?: boolean; role?: string } | null
  return Boolean(ctx?.ler && podeVerAgendaHoje(ctx.role))
}
async function carregarTodasLinhas<T>(
  consultar: (
    inicio: number,
    fim: number,
    contar: boolean,
  ) => PromiseLike<{
    data: T[] | null
    error: unknown
    count?: number | null
  }>,
) {
  const linhas: T[] = []
  let inicio = 0
  let total: number | null = null
  for (;;) {
    const resposta = await consultar(inicio, inicio + 499, inicio === 0)
    if (resposta.error) throw resposta.error
    if (inicio === 0) total = resposta.count ?? null
    const lote = resposta.data || []
    linhas.push(...lote)
    inicio += lote.length
    if (total !== null && inicio >= total) return { data: linhas, error: null }
    if (!lote.length) {
      if (total !== null && inicio < total)
        throw new Error(
          "A consulta ficou incompleta. Atualize o painel para tentar novamente.",
        )
      return { data: linhas, error: null }
    }
  }
}

function AgendaHoje({
  cliente,
  revisaoPainel,
}: {
  cliente: ClienteHub
  revisaoPainel: string | null
}) {
  const [dia, setDia] = useState(hojeAgendaSP)
  const [registros, setRegistros] = useState<AgendaAtividade[]>([])
  const [selecionado, setSelecionado] = useState<AgendaAtividade | null>(null)
  const [permitido, setPermitido] = useState<boolean | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null)
  const sequencia = useRef(0)
  const diaAtual = useRef(dia)
  const bloquear = useCallback(() => {
    setPermitido(false)
    setRegistros([])
    setSelecionado(null)
  }, [])
  const carregarAgenda = useCallback(async () => {
    const pedido = ++sequencia.current
    const hoje = hojeAgendaSP()
    if (diaAtual.current !== hoje) {
      diaAtual.current = hoje
      setDia(hoje)
      setRegistros([])
      setSelecionado(null)
      setAtualizadoEm(null)
    }
    setCarregando(true)
    setErro("")
    try {
      const acesso = await autorizadoAgenda(cliente)
      if (pedido !== sequencia.current) return
      if (!acesso) {
        bloquear()
        return
      }
      setPermitido(true)
      const resposta = await carregarTodasLinhas<AgendaAtividade>(
        (inicio, fim, contar) =>
          cliente
            .from("seintec_atividades")
            .select("*", { count: contar ? "exact" : undefined })
            .lt("inicio", inicioDiaAgenda(proximoDiaAgenda(hoje)))
            .gt("fim", inicioDiaAgenda(hoje))
            .order("inicio", { ascending: true })
            .order("id", { ascending: true })
            .range(inicio, fim),
      )
      if (pedido !== sequencia.current) return
      setRegistros(resposta.data)
      setSelecionado((anterior) =>
        anterior
          ? resposta.data.find((a) => a.id === anterior.id) || anterior
          : null,
      )
      setAtualizadoEm(new Date().toISOString())
    } catch (e) {
      if (pedido === sequencia.current) setErro(textoErroAgenda(e))
    } finally {
      if (pedido === sequencia.current) setCarregando(false)
    }
  }, [cliente, bloquear])
  useEffect(() => {
    void carregarAgenda()
    const voltar = () => {
      if (document.visibilityState !== "hidden") void carregarAgenda()
    }
    const timer = window.setInterval(voltar, 60000)
    window.addEventListener("focus", voltar)
    document.addEventListener("visibilitychange", voltar)
    return () => {
      sequencia.current++
      window.clearInterval(timer)
      window.removeEventListener("focus", voltar)
      document.removeEventListener("visibilitychange", voltar)
    }
  }, [carregarAgenda, revisaoPainel])
  if (permitido === false) return null
  const total = registros.length
  return (
    <section
      aria-label="Agenda de hoje"
      className="overflow-hidden rounded-[1.5rem] border border-blue-500/25 bg-gradient-to-br from-blue-500/[0.07] via-[#020617] to-[#020617] shadow-lg"
    >
      <div className="flex flex-col gap-4 border-b border-slate-800/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-xl"
          >
            📅
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">Agenda de hoje</h2>
              {!carregando && !erro && (
                <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {total} {total === 1 ? "registro" : "registros"}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400 first-letter:uppercase">
              {tituloDiaAgenda(dia)} · SEINTEC–SETEC
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void carregarAgenda()}
            disabled={carregando}
            className={AGENDA_BOTAO}
            aria-label="Atualizar agenda do dia"
          >
            <span
              aria-hidden="true"
              className={carregando ? "animate-spin" : ""}
            >
              ↻
            </span>{" "}
            Atualizar
          </button>
          <Link
            href="/calendario-seintec"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Ver calendário <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {erro && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200"
          >
            {erro}
            {registros.length > 0 &&
              " Os últimos registros carregados continuam disponíveis."}
          </div>
        )}
        {carregando && !total ? (
          <div
            role="status"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Carregando agenda do dia"
          >
            {[0, 1, 2].map((x) => (
              <div
                key={x}
                className="h-36 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
              />
            ))}
          </div>
        ) : total ? (
          <div className="custom-scrollbar grid max-h-[370px] grid-cols-1 gap-3 overflow-y-auto overscroll-contain pr-1 md:grid-cols-2 xl:grid-cols-3">
            {registros.map((a) => {
              const tipo = AGENDA_TIPOS[a.tipo] || AGENDA_TIPOS.compromisso
              const estado = statusAgenda(a.status)
              const agora =
                !["cancelado", "concluido"].includes(a.status) &&
                !a.dia_inteiro &&
                Date.now() >= new Date(a.inicio).getTime() &&
                Date.now() < new Date(a.fim).getTime()
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelecionado(a)}
                  aria-label={`Ver detalhes de ${a.titulo}`}
                  className="group flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/75 p-4 text-left transition hover:border-blue-500/40 hover:bg-blue-500/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tipo.classe}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${tipo.ponto}`}
                      />
                      {tipo.nome}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {a.setor}
                    </span>
                    {agora && (
                      <span className="ml-auto rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        Agora
                      </span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 break-words text-sm font-black leading-5 text-white [overflow-wrap:anywhere]">
                    {a.titulo}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-blue-300">
                    {horarioAgenda(a)}
                  </p>
                  <p
                    className="mt-2 truncate text-xs text-slate-400"
                    title={a.responsavel}
                  >
                    {a.responsavel || "Responsável não informado"}
                    {a.local ? ` · ${a.local}` : ""}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${estado.classe}`}
                    >
                      {estado.nome}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 transition group-hover:text-blue-300">
                      Ver detalhes <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          !erro && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center">
              <p className="text-sm font-bold text-slate-200">
                Nenhum registro previsto para hoje.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Eventos, compromissos e demandas agendados aparecerão aqui.
              </p>
            </div>
          )
        )}
        {atualizadoEm && (
          <p className="mt-3 text-[10px] font-medium text-slate-600">
            Atualizado às{" "}
            {new Date(atualizadoEm).toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      {selecionado && (
        <AgendaDetalhes
          cliente={cliente}
          registro={selecionado}
          fechar={() => setSelecionado(null)}
          bloquear={bloquear}
        />
      )}
    </section>
  )
}

function AgendaDetalhes({
  cliente,
  registro,
  fechar,
  bloquear,
}: {
  cliente: ClienteHub
  registro: AgendaAtividade
  fechar: () => void
  bloquear: () => void
}) {
  const [dados, setDados] = useState<AgendaAtividade | null>(null)
  const [reservas, setReservas] = useState<AgendaReserva[]>([])
  const [historico, setHistorico] = useState<AgendaHistorico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [erroHistorico, setErroHistorico] = useState("")
  const [revisao, setRevisao] = useState(0)
  const modal = useRef<HTMLDivElement>(null)
  const fecharAtual = useRef(fechar)
  fecharAtual.current = fechar
  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    modal.current?.querySelector<HTMLButtonElement>("button")?.focus()
    function teclado(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        fecharAtual.current()
        return
      }
      if (event.key !== "Tab") return
      const elementos = [
        ...(modal.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex="0"]',
        ) || []),
      ].filter((el) => el.getClientRects().length > 0)
      const primeiro = elementos[0],
        ultimo = elementos[elementos.length - 1]
      if (!primeiro) {
        event.preventDefault()
        modal.current?.focus()
        return
      }
      if (
        event.shiftKey &&
        (document.activeElement === primeiro ||
          !modal.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        ultimo.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === ultimo ||
          !modal.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener("keydown", teclado)
    return () => {
      document.removeEventListener("keydown", teclado)
      document.body.style.overflow = overflowAnterior
      if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus()
    }
  }, [registro.id])
  useEffect(() => {
    let vivo = true
    setCarregando(true)
    setDados(null)
    setErro("")
    setErroHistorico("")
    void (async () => {
      try {
        if (!(await autorizadoAgenda(cliente))) {
          if (vivo) bloquear()
          return
        }
        if (!vivo) return
        const [atividade, reservaResposta, historia] = await Promise.all([
          cliente
            .from("seintec_atividades")
            .select("*")
            .eq("id", registro.id)
            .maybeSingle(),
          carregarTodasLinhas<AgendaReserva>((inicio, fim, contar) =>
            cliente
              .from("seintec_reservas")
              .select("*", { count: contar ? "exact" : undefined })
              .eq("atividade_id", registro.id)
              .order("created_at", { ascending: true })
              .order("id", { ascending: true })
              .range(inicio, fim),
          ),
          cliente
            .from("seintec_historico")
            .select("id,acao,usuario_nome,created_at")
            .eq("atividade_id", registro.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ])
        if (atividade.error) throw atividade.error
        if (!atividade.data)
          throw new Error("Este registro não está mais disponível.")
        const ids = [
          ...new Set(reservaResposta.data.map((r) => r.equipamento_id)),
        ]
        const equipamentos = ids.length
          ? await cliente
              .from("seintec_equipamentos")
              .select("id,nome,tipo,modelo")
              .in("id", ids)
          : { data: [], error: null }
        if (equipamentos.error) throw equipamentos.error
        if (!vivo) return
        const mapa = new Map((equipamentos.data || []).map((e) => [e.id, e]))
        setDados(atividade.data as AgendaAtividade)
        setReservas(
          reservaResposta.data.map((r) => ({
            ...r,
            equipamento: mapa.get(r.equipamento_id),
          })),
        )
        if (historia.error) {
          setHistorico([])
          setErroHistorico("Não foi possível consultar o histórico recente.")
        } else setHistorico((historia.data || []) as AgendaHistorico[])
      } catch (e) {
        if (vivo) setErro(textoErroAgenda(e))
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [cliente, registro.id, registro.versao, revisao, bloquear])
  const a = dados
  const tipo = AGENDA_TIPOS[(a || registro).tipo] || AGENDA_TIPOS.compromisso
  const nomesHistorico: Record<string, string> = {
    registro_cadastrado: "Registro cadastrado",
    registro_atualizado: "Registro atualizado",
    retirada: "Retirada registrada",
    devolucao: "Devolução registrada",
    reserva_liberada: "Reserva liberada",
  }
  const periodo = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#020617]/90 p-3 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) fechar()
      }}
    >
      <div
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-hoje-detalhe-titulo"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-700 bg-[#080f20] shadow-2xl outline-none sm:max-h-[90dvh]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 p-4 sm:p-6">
          <div className="min-w-0">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${tipo.classe}`}
            >
              {tipo.nome} · {(a || registro).setor}
            </span>
            <h2
              id="agenda-hoje-detalhe-titulo"
              className="mt-3 break-words text-xl font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-2xl"
            >
              {(a || registro).titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar detalhes da agenda"
            className={`${AGENDA_BOTAO} !h-11 !w-11 shrink-0 !px-0 text-xl`}
          >
            ×
          </button>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {carregando ? (
            <p
              role="status"
              className="py-10 text-center text-sm text-slate-400"
            >
              Carregando detalhes do registro…
            </p>
          ) : erro ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"
            >
              <p>{erro}</p>
              <button
                type="button"
                onClick={() => setRevisao((x) => x + 1)}
                className={`${AGENDA_BOTAO} mt-3`}
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            a && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusAgenda(a.status).classe}`}
                  >
                    {statusAgenda(a.status).nome}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    Prioridade{" "}
                    {a.prioridade === "critica" ? "crítica" : a.prioridade}
                  </span>
                  {a.dia_inteiro && (
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                      Dia inteiro
                    </span>
                  )}
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <AgendaCampo label="Responsável" valor={a.responsavel} />
                  <AgendaCampo label="Setor" valor={a.setor} />
                  <AgendaCampo
                    label="Início"
                    valor={
                      a.dia_inteiro
                        ? periodo(a.inicio)
                        : formatarDataHora(a.inicio)
                    }
                  />
                  <AgendaCampo
                    label="Término"
                    valor={
                      a.dia_inteiro
                        ? periodo(
                            new Date(
                              new Date(a.fim).getTime() - 1,
                            ).toISOString(),
                          )
                        : formatarDataHora(a.fim)
                    }
                  />
                  <div className="sm:col-span-2">
                    <AgendaCampo
                      label="Local / unidade"
                      valor={a.local || "Não informado"}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <AgendaCampo
                    label="Descrição completa"
                    valor={a.descricao || "Sem descrição informada."}
                  />
                  <AgendaCampo
                    label="Observações / devolutiva"
                    valor={a.observacoes || "Sem observações registradas."}
                  />
                </div>
                <section aria-label="Equipamentos vinculados ao registro">
                  <h3 className="text-sm font-black text-white">
                    Equipamentos e reservas
                  </h3>
                  {!reservas.length ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Este registro não possui equipamentos vinculados.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {reservas.map((r) => {
                        const estado =
                          r.estado === "retirado"
                            ? "Retirado"
                            : r.estado === "reservado"
                              ? "Reservado"
                              : r.retirado_em
                                ? "Devolvido"
                                : "Liberado"
                        return (
                          <div
                            key={r.id}
                            className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-bold text-slate-200 [overflow-wrap:anywhere]">
                                  {r.equipamento?.nome || "Equipamento"}
                                </p>
                                <p className="mt-1 break-words text-xs text-slate-500">
                                  {[r.equipamento?.tipo, r.equipamento?.modelo]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              <p className="text-sm font-black tabular-nums text-blue-300">
                                {r.quantidade}{" "}
                                {r.quantidade === 1 ? "unidade" : "unidades"}
                              </p>
                            </div>
                            <p className="mt-3 text-xs font-semibold text-slate-400">
                              {estado}
                            </p>
                            {r.retirado_em && (
                              <p className="mt-1 text-xs text-slate-500">
                                Retirada: {formatarDataHora(r.retirado_em)}
                              </p>
                            )}
                            {r.devolvido_em && (
                              <p className="mt-1 text-xs text-slate-500">
                                {r.retirado_em ? "Devolução" : "Liberação"}:{" "}
                                {formatarDataHora(r.devolvido_em)}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AgendaCampo
                    label="Cadastrado em"
                    valor={formatarDataHora(a.created_at)}
                  />
                  <AgendaCampo
                    label="Atualizado em"
                    valor={formatarDataHora(a.updated_at)}
                  />
                </div>
                <section aria-label="Histórico recente do registro">
                  <h3 className="text-sm font-black text-white">
                    Histórico recente
                  </h3>
                  {erroHistorico ? (
                    <p className="mt-2 text-xs text-amber-300">
                      {erroHistorico}
                    </p>
                  ) : historico.length ? (
                    <ol className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                      {historico.map((h) => (
                        <li
                          key={h.id}
                          className="border-l-2 border-blue-500/30 pl-3"
                        >
                          <p className="text-xs font-bold text-slate-300">
                            {nomesHistorico[h.acao] ||
                              h.acao.replace(/_/g, " ")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {h.usuario_nome || "Usuário"} ·{" "}
                            {formatarDataHora(h.created_at)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Sem movimentações registradas.
                    </p>
                  )}
                </section>
              </>
            )
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-800 p-3 sm:px-6 sm:py-4">
          <button type="button" onClick={fechar} className={AGENDA_BOTAO}>
            Fechar
          </button>
          <Link
            href="/calendario-seintec"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-500 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Abrir calendário
          </Link>
        </div>
      </div>
    </div>
  )
}
function AgendaCampo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200 [overflow-wrap:anywhere]">
        {valor}
      </p>
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-[#020617] p-6 text-center shadow-2xl shadow-slate-950/30">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>

        <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
          Carregando Central SETEC
        </p>

        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          Consolidando indicadores, avisos, inventário e registros operacionais.
        </p>
      </div>
    </div>
  )
}

function AvisoCard({
  aviso,

  onOpen,
}: {
  aviso: Aviso

  onOpen: () => void
}) {
  const config = getAvisoConfig(aviso.tipo)

  return (
    <button
      type="button"

      onClick={onOpen}

      className={`group relative min-h-[190px] overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${config.card}`}
    >
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${config.glow}`}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${config.iconBox}`}
          >
            {aviso.emoji || config.emoji}
          </div>

          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${config.badge}`}
          >
            {config.label}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-black leading-snug text-white">
            {aviso.titulo || "Aviso SETEC"}
          </p>

          <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed text-slate-300">
            {aviso.descricao || "Sem descrição registrada."}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/70 pt-3">
          <span className="rounded-full border border-slate-700 bg-[#020617]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {aviso.data_fim
              ? `Até ${formatarData(aviso.data_fim)}`
              : "Sem expiração"}
          </span>

          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all group-hover:text-white">
            Ver aviso
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </div>
    </button>
  )
}

function AvisoModal({
  aviso,

  onClose,
}: {
  aviso: Aviso

  onClose: () => void
}) {
  const config = getAvisoConfig(aviso.tipo)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-3 backdrop-blur-md sm:p-6"

      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"

        aria-modal="true"

        aria-labelledby="aviso-completo-titulo"

        className={`relative isolate max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border shadow-2xl shadow-black/50 ${config.card}`}
      >
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl ${config.glow}`}
        />

        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-slate-800/70 p-5 sm:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl ${config.iconBox}`}
            >
              {aviso.emoji || config.emoji}
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${config.badge}`}
                >
                  {config.label}
                </span>

                <span className="rounded-full border border-slate-700 bg-[#020617]/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Aviso SETEC
                </span>
              </div>

              <h2
                id="aviso-completo-titulo"

                className="break-words text-2xl font-black leading-tight text-white sm:text-3xl"
              >
                {aviso.titulo || "Aviso SETEC"}
              </h2>
            </div>
          </div>

          <button
            type="button"

            onClick={onClose}

            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#020617]/80 text-xl font-black text-slate-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"

            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>

        <div className="relative z-10 max-h-[62vh] overflow-y-auto p-5 sm:p-7">
          <div className="rounded-2xl border border-slate-800/80 bg-[#020617]/70 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Mensagem completa
            </p>

            <div className="mt-4 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-200 sm:text-base">
              {aviso.descricao || "Sem descrição registrada."}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AvisoInfo
              label="Publicado em"

              value={formatarDataHora(aviso.created_at)}
            />

            <AvisoInfo
              label="Início da exibição"

              value={formatarData(aviso.data_inicio)}
            />

            <AvisoInfo
              label="Fim da exibição"

              value={
                aviso.data_fim ? formatarData(aviso.data_fim) : "Sem expiração"
              }
            />
          </div>
        </div>

        <div className="relative z-10 flex justify-end border-t border-slate-800/70 bg-[#020617]/60 p-4 sm:px-7">
          <button
            type="button"

            onClick={onClose}

            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:border-slate-600 hover:text-white"
          >
            Fechar aviso
          </button>
        </div>
      </section>
    </div>
  )
}

function AvisoInfo({
  label,

  value,
}: {
  label: string

  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020617]/70 p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-300">{value}</p>
    </div>
  )
}

function KpiCard({
  titulo,

  valor,

  detalhe,

  cor,

  icon,
}: {
  titulo: string

  valor: string | number

  detalhe: string

  cor: "blue" | "green" | "purple" | "yellow"

  icon: string
}) {
  const cores = {
    blue: "border-blue-500/30 bg-gradient-to-t from-blue-900/20 to-[#020617] text-blue-300",

    green:
      "border-green-500/30 bg-gradient-to-t from-green-900/20 to-[#020617] text-green-300",

    purple:
      "border-purple-500/30 bg-gradient-to-t from-purple-900/20 to-[#020617] text-purple-300",

    yellow:
      "border-yellow-500/30 bg-gradient-to-t from-yellow-900/20 to-[#020617] text-yellow-300",
  }[cor]

  return (
    <div
      role="group"
      aria-label={titulo}
      className={`group min-w-0 rounded-2xl border p-3.5 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl sm:p-4 ${cores}`}
    >
      <p
        title={titulo}
        className="min-h-8 line-clamp-2 text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-slate-400 sm:text-[10px]"
      >
        {titulo}
      </p>
      <div className="mb-2 mt-1 flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 text-2xl font-black tabular-nums text-white sm:text-3xl">
          {valor}
        </p>
        <div
          aria-hidden="true"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#020617] text-base transition-all group-hover:scale-110 sm:flex"
        >
          {icon}
        </div>
      </div>
      <p className="min-h-8 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500">
        {detalhe}
      </p>
    </div>
  )
}

function MiniIndicator({
  label,

  value,

  description,

  tone,
}: {
  label: string

  value: string | number

  description: string

  tone: "blue" | "green" | "yellow"
}) {
  const color = {
    blue: "text-blue-300 border-blue-500/30 bg-blue-500/10",

    green: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",

    yellow: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>

      <p className="mt-1 text-xs font-bold opacity-80">{description}</p>
    </div>
  )
}

function Panel({
  children,

  className = "",
}: {
  children: React.ReactNode

  className?: string
}) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function Quick({
  href,

  icon,

  label,
}: {
  href: string

  icon: string

  label: string
}) {
  return (
    <Link
      href={href}

      className="group flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-blue-500/40 hover:bg-slate-900 hover:shadow-xl"
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-3xl transition-all group-hover:scale-110 group-hover:border-blue-500/30">
        {icon}
      </div>

      <p className="text-xs font-bold leading-tight text-slate-400 transition-all group-hover:text-slate-100">
        {label}
      </p>
    </Link>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
      <p className="text-3xl opacity-70">{icon}</p>

      <p className="mt-2 text-sm font-black text-slate-400">{title}</p>

      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  )
}

function getInitials(nome: string) {
  const clean = String(nome || "").trim()

  if (!clean) return "TF"

  const partes = clean.split(" ").filter(Boolean)

  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}
