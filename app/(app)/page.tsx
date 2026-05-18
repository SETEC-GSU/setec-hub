"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

const DIAS_DESATUALIZADO = 90

type Stats = {
  chamadosAtendidos: number
  chamadosAbertos: number
  visitasRealizadas: number
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

type MensagemTela = {
  tipo: "error" | "success" | "info"
  texto: string
} | null

const statsIniciais: Stats = {
  chamadosAtendidos: 0,
  chamadosAbertos: 0,
  visitasRealizadas: 0,
  equipamentosRecebidos: 0,
  escolasCadastradas: 0,
  inventariosAtualizados: 0,
  inventariosPendentes: 0,
}

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
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

  return !isChamadoAtendido(statusLimpo)
}

function isVisitaRealizada(status: unknown) {
  const statusLimpo = normalizarTexto(status)

  return (
    statusLimpo.includes("realizada") ||
    statusLimpo.includes("concluida") ||
    statusLimpo.includes("concluido") ||
    statusLimpo.includes("finalizada")
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

function getInventarioStatusClass(pendentes: number) {
  if (pendentes <= 0) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (pendentes <= 10) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
  }

  return "border-red-500/30 bg-red-500/10 text-red-300"
}

export default function Home() {
  const supabase = useMemo(() => createClient(), [])

  const [stats, setStats] = useState<Stats>(statsIniciais)
  const [tutoriais, setTutoriais] = useState<Tutorial[]>([])
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const percentualInventario = useMemo(() => {
    if (stats.escolasCadastradas <= 0) return 0

    return Math.round(
      (stats.inventariosAtualizados / stats.escolasCadastradas) * 100
    )
  }, [stats.escolasCadastradas, stats.inventariosAtualizados])

  const chamadosTotalOperacional =
    stats.chamadosAtendidos + stats.chamadosAbertos

  const percentualChamadosAtendidos =
    chamadosTotalOperacional > 0
      ? Math.round((stats.chamadosAtendidos / chamadosTotalOperacional) * 100)
      : 0

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setMensagem(null)

      const agora = new Date()
      const agoraTime = agora.getTime()
      const limiteTempo =
        agoraTime - DIAS_DESATUALIZADO * 24 * 60 * 60 * 1000

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
        supabase.from("chamados").select("id, status"),
        supabase
          .from("fields_visitas")
          .select("id, escola, tecnico, status, data_visita, categoria, subcategoria")
          .order("data_visita", { ascending: false }),
        supabase.from("equipamentos_recebidos").select("quantidade_recebida"),
        supabase.from("escolas").select("id, nome_escola"),
        supabase.from("inventario_respostas").select("escola_nome, created_at"),
        supabase
          .from("base_conhecimento")
          .select("id, titulo, descricao, categoria, subcategoria, arquivo_url, visualizacoes")
          .order("visualizacoes", { ascending: false })
          .limit(8),
        supabase
          .from("avisos_setec")
          .select("*")
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

      const ultimasAtualizacoes = new Map<string, number>()

      inventarios.forEach((inventario: any) => {
        if (!inventario.escola_nome || !inventario.created_at) return

        const escola = String(inventario.escola_nome).trim()
        const dataInventario = new Date(inventario.created_at).getTime()

        if (!escola || Number.isNaN(dataInventario)) return

        const dataAtual = ultimasAtualizacoes.get(escola) || 0

        if (dataInventario > dataAtual) {
          ultimasAtualizacoes.set(escola, dataInventario)
        }
      })

      let escolasAtualizadas = 0

      ultimasAtualizacoes.forEach((dataUltima) => {
        if (dataUltima >= limiteTempo) {
          escolasAtualizadas += 1
        }
      })

      const inventariosPendentes = Math.max(totalEscolas - escolasAtualizadas, 0)

      const avisosValidos = avisosData
        .filter((aviso: any) => {
          const dataInicio = aviso.data_inicio
            ? new Date(aviso.data_inicio).getTime()
            : 0

          const dataFim = aviso.data_fim
            ? new Date(aviso.data_fim).getTime()
            : Number.POSITIVE_INFINITY

          return dataInicio <= agoraTime && dataFim >= agoraTime
        })
        .slice(0, 3)

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
          .sort((a, b) => a.localeCompare(b))
          .map((nome) => ({ nome, ativo: true }))
      }

      setStats({
        chamadosAtendidos: chamados.filter((chamado: any) =>
          isChamadoAtendido(chamado.status)
        ).length,
        chamadosAbertos: chamados.filter((chamado: any) =>
          isChamadoAberto(chamado.status)
        ).length,
        visitasRealizadas: visitasRealizadas.filter((visita: any) =>
          isVisitaRealizada(visita.status)
        ).length,
        equipamentosRecebidos: equipamentos.reduce(
          (acc: number, item: any) => acc + toNumber(item.quantidade_recebida),
          0
        ),
        escolasCadastradas: totalEscolas,
        inventariosAtualizados: escolasAtualizadas,
        inventariosPendentes,
      })

      setTutoriais(tutoriaisData as Tutorial[])
      setVisitas((visitasRealizadas || []).slice(0, 5) as Visita[])
      setAvisos(avisosValidos as Aviso[])
      setTecnicos(tecnicosFormatados)
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
    }
  }, [supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-blue-500" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando Central SETEC
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_30%)]" />

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
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:min-w-[360px]">
            <MiniIndicator
              label="Inventário"
              value={`${percentualInventario}%`}
              description={`${stats.inventariosAtualizados}/${stats.escolasCadastradas} UEs`}
              tone={stats.inventariosPendentes > 0 ? "yellow" : "green"}
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
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {mensagem.texto}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          titulo="Chamados Atendidos"
          valor={stats.chamadosAtendidos}
          detalhe={`${stats.chamadosAbertos} chamado(s) ainda aberto(s)`}
          cor="green"
          icon="🎫"
        />

        <KpiCard
          titulo="Visitas Realizadas - FIELDs"
          valor={stats.visitasRealizadas}
          detalhe="Registros consolidados do Field"
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
          <Quick href="/fields/agenda-field" icon="📅" label="Agenda - FIELDs" />
          <Quick href="/dashboard-escolar" icon="🏫" label="Dashboard Escolar" />
        </div>
      </section>

      <section>
        <Panel>
          <div className="mb-5">
            <h2 className="text-xl font-black text-white">
              🚨 Avisos importantes - SETEC
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Comunicados ativos dentro do período de exibição configurado.
            </p>
          </div>

          <div className="space-y-3">
            {avisos.length === 0 ? (
              <EmptyState
                icon="✅"
                title="Nenhum aviso ativo"
                description="Não há comunicados importantes no momento."
              />
            ) : (
              avisos.map((aviso) => (
                <div
                  key={aviso.id}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-blue-500/30 hover:bg-slate-900"
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-[#020617] text-2xl">
                      {aviso.emoji || "📌"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-white">
                          {aviso.titulo || "Aviso SETEC"}
                        </p>

                        {aviso.tipo && (
                          <span className="rounded-full border border-slate-700 bg-[#020617] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {aviso.tipo}
                          </span>
                        )}
                      </div>

                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">
                        {aviso.descricao || "Sem descrição registrada."}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </section>

      <section>
        <Panel>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr] xl:items-center">
            <div>
              <h2 className="text-xl font-black text-white">
                📋 Status do inventário
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Validade considerada: últimos {DIAS_DESATUALIZADO} dias.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-center">
              <div
                className={`rounded-2xl border p-5 ${getInventarioStatusClass(
                  stats.inventariosPendentes
                )}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
                  Recertificação
                </p>

                <p className="mt-3 text-5xl font-black">
                  {percentualInventario}%
                </p>

                <p className="mt-2 text-sm font-bold opacity-80">
                  {stats.inventariosAtualizados} de {stats.escolasCadastradas} escolas
                  com inventário atualizado.
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
                            {stats.inventariosPendentes} escola(s) precisam revisar o
                            inventário.
                          </p>

                          <p className="mt-1 text-xs font-medium leading-relaxed text-red-300/80">
                            A atualização ajuda a manter os indicadores de equipamentos,
                            garantia e parque tecnológico mais confiáveis.
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
                        As escolas cadastradas possuem atualização válida dentro do
                        período definido.
                      </p>
                    </div>
                  )}
                </div>
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
                      rel={tutorial.arquivo_url ? "noopener noreferrer" : undefined}
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
      className={`group rounded-2xl border p-4 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl ${cores}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {titulo}
          </p>

          <p className="mt-2 text-3xl font-black text-white md:text-4xl">
            {valor}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-[#020617] text-xl transition-all group-hover:scale-110">
          {icon}
        </div>
      </div>

      <p className="text-xs font-semibold leading-relaxed text-slate-500">
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