"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

type Cliente = ReturnType<typeof createClient>
type Registro = {
  id: string
  usuario_id: string
  nome: string
  email: string
  perfil: string
  setor: string
  user_agent: string
  data_login: string
  registrado_em: string
}
type Painel = {
  coleta_inicio: string
  resumo: {
    logins: number
    usuarios: number
    perfis: number
    ultimo_login: string | null
  }
  por_dia: { dia: string; logins: number; usuarios: number }[]
  por_perfil: { perfil: string; logins: number; usuarios: number }[]
  registros: Registro[]
  perfis: string[]
  setores: string[]
  total: number
  pagina: number
  limite: number
}
const PERFIS: Record<string, { nome: string; classe: string; cor: string }> = {
  admin: {
    nome: "Administrador",
    classe: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cor: "#34d399",
  },
  analista: {
    nome: "Analista",
    classe: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cor: "#60a5fa",
  },
  seintec: {
    nome: "SEINTEC",
    classe: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    cor: "#22d3ee",
  },
  dirigente: {
    nome: "Dirigente",
    classe: "border-violet-500/25 bg-violet-500/10 text-violet-300",
    cor: "#a78bfa",
  },
  chefia_ure: {
    nome: "Chefia URE",
    classe: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    cor: "#fbbf24",
  },
  gestao_escolas: {
    nome: "Gestão Escolas",
    classe: "border-pink-500/25 bg-pink-500/10 text-pink-300",
    cor: "#f472b6",
  },
}
const INPUT =
  "min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 [color-scheme:dark]"
const BOTAO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-blue-400/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"

function perfilInfo(perfil: string) {
  return (
    PERFIS[perfil] || {
      nome: perfil.replace(/[-_]/g, " "),
      classe: "border-slate-600 bg-slate-800 text-slate-300",
      cor: "#94a3b8",
    }
  )
}
function numero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR")
}
function hojeSP() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]))
  return `${p.year}-${p.month}-${p.day}`
}
function moverDia(dia: string, quantidade: number) {
  const data = new Date(`${dia}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + quantidade)
  return data.toISOString().slice(0, 10)
}
function diaCurto(dia: string) {
  return dia.slice(8, 10) + "/" + dia.slice(5, 7)
}
function dataHora(iso: string | null, completa = true) {
  if (!iso) return "Sem registro"
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    ...(completa ? { year: "numeric" as const } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
}
function periodoValido(inicio: string, fim: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim))
    return false
  const i = new Date(`${inicio}T12:00Z`).getTime(),
    f = new Date(`${fim}T12:00Z`).getTime()
  return (
    Number.isFinite(i) &&
    Number.isFinite(f) &&
    f >= i &&
    f - i <= 365 * 86400000
  )
}
function agenteInfo(agente: string) {
  if (!agente)
    return { navegador: "Não informado", dispositivo: "Não informado" }
  const navegador = /Edg|Edge/.test(agente)
    ? "Edge"
    : /OPR|Opera/.test(agente)
      ? "Opera"
      : /Firefox|FxiOS/.test(agente)
        ? "Firefox"
        : /Chrome|CriOS/.test(agente)
          ? "Chrome"
          : /Safari/.test(agente)
            ? "Safari"
            : "Outro navegador"
  const dispositivo =
    /iPad|Tablet/.test(agente) ||
    (/Android/.test(agente) && !/Mobile/.test(agente))
      ? "Tablet"
      : /Mobile|iPhone|Android/.test(agente)
        ? "Celular"
        : "Computador"
  return { navegador, dispositivo }
}
function iniciais(nome: string) {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0] || "")
      .join("")
      .toUpperCase() || "U"
  )
}
function mensagemErro(error: { code?: string } | null) {
  return error?.code === "42501"
    ? "Seu perfil não tem acesso a este monitor."
    : "Não foi possível consultar os acessos. Confira a instalação do módulo e tente novamente."
}
function validarPainel(data: unknown): Painel {
  const p = data as Painel | null
  if (!p?.resumo || !Array.isArray(p.registros) || !Array.isArray(p.por_dia))
    throw new Error(
      "A resposta do monitor está incompleta. Atualize a instalação do módulo.",
    )
  return p
}

export default function MonitorAcessosClient() {
  const cliente = useMemo(() => createClient(), [])
  const [inicio, setInicio] = useState(() => moverDia(hojeSP(), -6))
  const [fim, setFim] = useState(hojeSP)
  const [perfil, setPerfil] = useState("")
  const [setor, setSetor] = useState("")
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [pagina, setPagina] = useState(1)
  const [limite, setLimite] = useState(20)
  const [dados, setDados] = useState<Painel | null>(null)
  const [periodoExibido, setPeriodoExibido] = useState({ inicio, fim })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [permitido, setPermitido] = useState(true)
  const [atualizado, setAtualizado] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<Registro | null>(null)
  const sequencia = useRef(0)
  const valido = periodoValido(inicio, fim)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagina(1)
      setBuscaAplicada(busca.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [busca])

  const carregar = useCallback(async () => {
    if (!periodoValido(inicio, fim)) {
      setCarregando(false)
      return
    }
    const pedido = ++sequencia.current
    setCarregando(true)
    setErro("")
    try {
      const resposta = await cliente.rpc("hub_logins_painel", {
        p_inicio: inicio,
        p_fim: fim,
        p_perfil: perfil || null,
        p_setor: setor || null,
        p_busca: buscaAplicada || null,
        p_pagina: pagina,
        p_limite: limite,
      })
      if (pedido !== sequencia.current) return
      if (resposta.error) {
        if (resposta.error.code === "42501") {
          setPermitido(false)
          setDados(null)
          setSelecionado(null)
        }
        throw new Error(mensagemErro(resposta.error))
      }
      setDados(validarPainel(resposta.data))
      setPeriodoExibido({ inicio, fim })
      setAtualizado(new Date().toISOString())
    } catch (e) {
      if (pedido === sequencia.current)
        setErro(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar os acessos.",
        )
    } finally {
      if (pedido === sequencia.current) setCarregando(false)
    }
  }, [cliente, inicio, fim, perfil, setor, buscaAplicada, pagina, limite])

  useEffect(() => {
    void carregar()
    const voltar = () => {
      if (document.visibilityState !== "hidden") void carregar()
    }
    const timer = setInterval(voltar, 60000)
    window.addEventListener("focus", voltar)
    document.addEventListener("visibilitychange", voltar)
    return () => {
      sequencia.current++
      clearInterval(timer)
      window.removeEventListener("focus", voltar)
      document.removeEventListener("visibilitychange", voltar)
    }
  }, [carregar])

  function aplicarPeriodo(dias: number) {
    const hoje = hojeSP()
    setInicio(moverDia(hoje, 1 - dias))
    setFim(hoje)
    setPagina(1)
  }
  function limpar() {
    aplicarPeriodo(7)
    setPerfil("")
    setSetor("")
    setBusca("")
    setBuscaAplicada("")
  }

  if (!permitido)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-200"
      >
        <p className="font-bold">Acesso exclusivo do administrador.</p>
        <Link href="/" className={`${BOTAO} mt-4`}>
          Menu Principal
        </Link>
      </div>
    )
  const resumo = dados?.resumo
  const perfis = [
    ...new Set([...Object.keys(PERFIS), ...(dados?.perfis || [])]),
  ]
  return (
    <div
      className="mx-auto max-w-[1700px] space-y-5 pb-10"
      aria-busy={carregando}
    >
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/20 bg-[#020617] p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_60%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-300">
                SETEC Hub
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
                <Icon nome="shield" /> Acesso administrativo
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Monitor de Acessos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Acompanhe os logins do Hub por usuário, perfil e período.
            </p>
            {dados?.coleta_inicio && (
              <p className="mt-3 text-[11px] text-slate-500">
                Coleta iniciada em {dataHora(dados.coleta_inicio)} · Horário de
                Brasília
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className={BOTAO}>
                <Icon nome="home" /> Menu Principal
              </Link>
              <button
                type="button"
                onClick={() => void carregar()}
                disabled={carregando || !valido}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"
                aria-label="Atualizar monitor de acessos"
              >
                <Icon nome="refresh" girando={carregando} /> Atualizar
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {carregando
                ? "Atualizando registros…"
                : atualizado
                  ? `Atualizado às ${new Date(atualizado).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`
                  : "Aguardando registros"}
            </p>
          </div>
        </div>
      </section>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Icon nome="filter" /> Filtrar acessos
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              [1, "Hoje"],
              [7, "7 dias"],
              [30, "30 dias"],
            ].map(([quantidade, label]) => {
              const dias = Number(quantidade),
                ativo =
                  fim === hojeSP() && inicio === moverDia(hojeSP(), 1 - dias)
              return (
                <button
                  key={dias}
                  type="button"
                  onClick={() => aplicarPeriodo(dias)}
                  aria-pressed={ativo}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold transition ${ativo ? "border-blue-500/30 bg-blue-500/15 text-blue-300" : "border-slate-700 text-slate-500 hover:text-slate-200"}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1.8fr_1fr_1.2fr_1.6fr]">
          <Campo label="Buscar usuário" htmlFor="acesso-busca">
            <input
              id="acesso-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              maxLength={200}
              placeholder="Nome, email ou setor"
              className={INPUT}
            />
          </Campo>
          <Campo label="Perfil" htmlFor="acesso-perfil">
            <select
              id="acesso-perfil"
              value={perfil}
              onChange={(e) => {
                setPerfil(e.target.value)
                setPagina(1)
              }}
              className={INPUT}
            >
              <option value="">Todos os perfis</option>
              {perfis.map((p) => (
                <option key={p} value={p}>
                  {perfilInfo(p).nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Setor / unidade" htmlFor="acesso-setor">
            <select
              id="acesso-setor"
              value={setor}
              onChange={(e) => {
                setSetor(e.target.value)
                setPagina(1)
              }}
              className={INPUT}
            >
              <option value="">Todos os setores</option>
              {(dados?.setores || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <Campo label="De" htmlFor="acesso-inicio">
              <input
                id="acesso-inicio"
                type="date"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value)
                  setPagina(1)
                }}
                className={INPUT}
              />
            </Campo>
            <Campo label="Até" htmlFor="acesso-fim">
              <input
                id="acesso-fim"
                type="date"
                value={fim}
                onChange={(e) => {
                  setFim(e.target.value)
                  setPagina(1)
                }}
                className={INPUT}
              />
            </Campo>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            {dados
              ? `Período exibido: ${diaCurto(periodoExibido.inicio)} a ${diaCurto(periodoExibido.fim)}`
              : "Selecione o período e os perfis desejados."}
          </p>
          <button
            type="button"
            onClick={limpar}
            className="min-h-9 px-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200"
          >
            Limpar filtros
          </button>
        </div>
        {!valido && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200"
          >
            Informe um período de até 366 dias, com a data final igual ou
            posterior à inicial.
          </p>
        )}
      </Panel>

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {erro}
          {dados && " Os últimos dados carregados continuam exibidos."}
        </div>
      )}

      <section
        aria-label="Indicadores de acessos"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <Indicador
          nome="Logins no período"
          valor={resumo ? numero(resumo.logins) : "—"}
          detalhe="Uma entrada por sessão"
          icone="activity"
          cor="blue"
        />
        <Indicador
          nome="Usuários únicos"
          valor={resumo ? numero(resumo.usuarios) : "—"}
          detalhe="Pessoas que entraram no Hub"
          icone="users"
          cor="cyan"
        />
        <Indicador
          nome="Perfis com acesso"
          valor={resumo ? numero(resumo.perfis) : "—"}
          detalhe="Perfis presentes no período"
          icone="shield"
          cor="violet"
        />
        <Indicador
          nome="Último login"
          valor={
            resumo?.ultimo_login
              ? new Date(resumo.ultimo_login).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          detalhe={
            resumo?.ultimo_login
              ? dataHora(resumo.ultimo_login, false).split(",")[0]
              : "Nenhum login no período"
          }
          icone="clock"
          cor="green"
        />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Acessos por dia
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Evolução dos logins no período selecionado
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Logins
            </span>
          </div>
          {dados ? (
            <GraficoDias linhas={dados.por_dia} />
          ) : (
            <Esqueleto descricao="Carregando gráfico de acessos" />
          )}
        </Panel>
        <Panel>
          <h2 className="text-base font-black text-white">
            Distribuição por perfil
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Participação nos logins registrados
          </p>
          <div className="mt-5 space-y-4">
            {!dados ? (
              <Esqueleto descricao="Carregando perfis" />
            ) : !dados.por_perfil.length ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Nenhum acesso neste período.
              </p>
            ) : (
              dados.por_perfil.map((p) => {
                const info = perfilInfo(p.perfil),
                  percentual = dados.total ? (p.logins / dados.total) * 100 : 0
                return (
                  <button
                    key={p.perfil}
                    type="button"
                    aria-label={`Filtrar perfil ${info.nome}`}
                    onClick={() => {
                      setPerfil(p.perfil)
                      setPagina(1)
                    }}
                    className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate font-semibold text-slate-300">
                        {info.nome}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-400">
                        <strong className="text-slate-200">
                          {numero(p.logins)}
                        </strong>{" "}
                        · {Math.round(percentual)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${percentual}%`,
                          background: info.cor,
                        }}
                      />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Panel>
      </section>

      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">
              Histórico de logins
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Clique no usuário para consultar seus acessos no período.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
            {dados ? `${numero(dados.total)} registros` : "Carregando…"}
          </span>
        </div>
        {!dados && carregando ? (
          <Esqueleto descricao="Carregando histórico de logins" />
        ) : !dados?.registros.length ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
              <Icon nome="users" />
            </div>
            <p className="text-sm font-bold text-slate-200">
              Nenhum login encontrado.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Ajuste os filtros ou aguarde novos logins após o início da coleta.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3 font-bold">Usuário</th>
                    <th className="px-3 py-3 font-bold">Perfil</th>
                    <th className="px-3 py-3 font-bold">Setor / unidade</th>
                    <th className="px-3 py-3 font-bold">Login · Brasília</th>
                    <th className="px-3 py-3 font-bold">Navegador informado</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.registros.map((r) => {
                    const agente = agenteInfo(r.user_agent)
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-800/60 transition hover:bg-slate-900/60"
                      >
                        <td className="max-w-[290px] px-3 py-4">
                          <button
                            type="button"
                            onClick={() => setSelecionado(r)}
                            className="flex min-w-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            aria-label={`Ver histórico de ${r.nome}`}
                          >
                            <Avatar nome={r.nome} />
                            <div className="min-w-0">
                              <p className="break-words text-xs font-bold text-slate-200">
                                {r.nome}
                              </p>
                              <p className="mt-1 break-all text-[11px] text-slate-500">
                                {r.email}
                              </p>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-4">
                          <TagPerfil perfil={r.perfil} />
                        </td>
                        <td className="max-w-52 break-words px-3 py-4 text-slate-400">
                          {r.setor || "Não informado"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 font-semibold text-slate-300">
                          {dataHora(r.data_login)}
                        </td>
                        <td className="px-3 py-4 text-slate-400">
                          {agente.navegador}
                          <p className="mt-1 text-[10px] text-slate-600">
                            {agente.dispositivo}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {dados.registros.map((r) => {
                const agente = agenteInfo(r.user_agent)
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setSelecionado(r)}
                    aria-label={`Ver histórico de ${r.nome}`}
                    className="block w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-blue-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar nome={r.nome} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-bold text-slate-200">
                          {r.nome}
                        </p>
                        <p className="mt-1 break-all text-[11px] text-slate-500">
                          {r.email}
                        </p>
                      </div>
                      <span className="text-slate-500" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <TagPerfil perfil={r.perfil} />
                      <span className="break-words text-[11px] text-slate-500">
                        {r.setor || "Setor não informado"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-3 text-[11px]">
                      <span className="font-semibold text-blue-300">
                        {dataHora(r.data_login)}
                      </span>
                      <span className="text-slate-500">
                        {agente.navegador} · {agente.dispositivo}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <Paginacao
              dados={dados}
              carregando={carregando}
              mudar={setPagina}
            />
          </>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="max-w-2xl text-[10px] leading-relaxed text-slate-600">
            Perfis e setores correspondem ao registro de cada login. A renovação
            de uma sessão não cria outro acesso.
          </p>
          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            Por página
            <select
              aria-label="Registros por página"
              value={limite}
              onChange={(e) => {
                setLimite(Number(e.target.value))
                setPagina(1)
              }}
              className="min-h-10 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </Panel>
      {selecionado && (
        <HistoricoUsuario
          cliente={cliente}
          registro={selecionado}
          inicio={periodoExibido.inicio}
          fim={periodoExibido.fim}
          fechar={() => setSelecionado(null)}
          bloquear={() => {
            setSelecionado(null)
            setDados(null)
            setPermitido(false)
          }}
        />
      )}
    </div>
  )
}

function HistoricoUsuario({
  cliente,
  registro,
  inicio,
  fim,
  fechar,
  bloquear,
}: {
  cliente: Cliente
  registro: Registro
  inicio: string
  fim: string
  fechar: () => void
  bloquear: () => void
}) {
  const [dados, setDados] = useState<Painel | null>(null),
    [pagina, setPagina] = useState(1),
    [carregando, setCarregando] = useState(true),
    [erro, setErro] = useState(""),
    [revisao, setRevisao] = useState(0)
  const modal = useRef<HTMLDivElement>(null),
    fecharRef = useRef(fechar),
    bloquearRef = useRef(bloquear)
  fecharRef.current = fechar
  bloquearRef.current = bloquear
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    modal.current?.querySelector<HTMLButtonElement>("button")?.focus()
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        fecharRef.current()
        return
      }
      if (e.key !== "Tab") return
      const elementos = [
        ...(modal.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),summary,[tabindex="0"]',
        ) || []),
      ].filter((el) => el.getClientRects().length > 0)
      const primeiro = elementos[0],
        ultimo = elementos[elementos.length - 1]
      if (!primeiro) {
        e.preventDefault()
        modal.current?.focus()
        return
      }
      if (
        e.shiftKey &&
        (document.activeElement === primeiro ||
          !modal.current?.contains(document.activeElement))
      ) {
        e.preventDefault()
        ultimo.focus()
      } else if (
        !e.shiftKey &&
        (document.activeElement === ultimo ||
          !modal.current?.contains(document.activeElement))
      ) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener("keydown", teclado)
    return () => {
      document.removeEventListener("keydown", teclado)
      document.body.style.overflow = overflow
      if (anterior && document.contains(anterior)) anterior.focus()
    }
  }, [])
  useEffect(() => {
    let vivo = true
    setCarregando(true)
    setErro("")
    void (async () => {
      try {
        const resposta = await cliente.rpc("hub_logins_painel", {
          p_inicio: inicio,
          p_fim: fim,
          p_usuario: registro.usuario_id,
          p_pagina: pagina,
          p_limite: 20,
        })
        if (!vivo) return
        if (resposta.error) {
          if (resposta.error.code === "42501") bloquearRef.current()
          throw new Error(mensagemErro(resposta.error))
        }
        setDados(validarPainel(resposta.data))
      } catch (e) {
        if (vivo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar o histórico.",
          )
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [cliente, registro.usuario_id, inicio, fim, pagina, revisao])
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#020617]/90 p-3 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) fechar()
      }}
    >
      <div
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="historico-usuario-titulo"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-700 bg-[#080f20] shadow-2xl outline-none sm:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar nome={registro.nome} />
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">
                Histórico do usuário
              </p>
              <h2
                id="historico-usuario-titulo"
                className="break-words text-lg font-black text-white"
              >
                {registro.nome}
              </h2>
              <p className="mt-1 break-all text-xs text-slate-500">
                {registro.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar histórico do usuário"
            className={`${BOTAO} !w-11 shrink-0 !px-0 text-lg`}
          >
            ×
          </button>
        </header>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="text-xs text-slate-500">
            Logins de {diaCurto(inicio)} a {diaCurto(fim)} · Horário de Brasília
          </p>
          {erro && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200"
            >
              {erro}
              <button
                type="button"
                onClick={() => setRevisao((v) => v + 1)}
                className={`${BOTAO} mt-3`}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {!dados && carregando ? (
            <Esqueleto descricao="Carregando histórico do usuário" />
          ) : (
            dados && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-[10px] font-bold text-blue-300">
                      Logins no período
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {numero(dados.total)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                    <p className="text-[10px] font-bold text-slate-500">
                      Último login no período
                    </p>
                    <p className="mt-2 break-words text-xs font-bold leading-5 text-slate-200">
                      {dataHora(dados.resumo.ultimo_login)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {dados.registros.map((r) => {
                    const agente = agenteInfo(r.user_agent)
                    return (
                      <article
                        key={r.id}
                        className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-blue-300">
                            {dataHora(r.data_login)}
                          </p>
                          <TagPerfil perfil={r.perfil} />
                        </div>
                        <p className="mt-3 break-words text-xs text-slate-400">
                          {r.setor || "Setor não informado"}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {agente.navegador} · {agente.dispositivo}
                        </p>
                        {r.user_agent && (
                          <details className="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                            <summary className="min-h-8 cursor-pointer font-semibold text-slate-400">
                              Informações do navegador
                            </summary>
                            <p className="mt-2 whitespace-pre-wrap break-all leading-relaxed">
                              {r.user_agent}
                            </p>
                          </details>
                        )}
                      </article>
                    )
                  })}
                </div>
                {!dados.registros.length && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Nenhum login do usuário neste período.
                  </p>
                )}
                <Paginacao
                  dados={dados}
                  carregando={carregando}
                  mudar={setPagina}
                />
              </>
            )
          )}
        </div>
        <footer className="flex shrink-0 justify-end border-t border-slate-800 p-3 sm:px-6">
          <button type="button" onClick={fechar} className={BOTAO}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-slate-800 bg-[#020617] p-4 shadow-lg sm:p-5">
      {children}
    </div>
  )
}
function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-[11px] font-black text-blue-300"
    >
      {iniciais(nome)}
    </span>
  )
}
function TagPerfil({ perfil }: { perfil: string }) {
  const info = perfilInfo(perfil)
  return (
    <span
      className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-bold ${info.classe}`}
    >
      {info.nome}
    </span>
  )
}
function Esqueleto({ descricao }: { descricao: string }) {
  return (
    <div role="status" aria-label={descricao} className="space-y-3 py-4">
      <div className="h-12 animate-pulse rounded-xl bg-slate-900" />
      <div className="h-20 animate-pulse rounded-xl bg-slate-900/60" />
    </div>
  )
}
function Indicador({
  nome,
  valor,
  detalhe,
  icone,
  cor,
}: {
  nome: string
  valor: string
  detalhe: string
  icone: string
  cor: "blue" | "cyan" | "violet" | "green"
}) {
  const classe = {
    blue: "border-blue-500/20 text-blue-300 bg-blue-500/[0.05]",
    cyan: "border-cyan-500/20 text-cyan-300 bg-cyan-500/[0.05]",
    violet: "border-violet-500/20 text-violet-300 bg-violet-500/[0.05]",
    green: "border-emerald-500/20 text-emerald-300 bg-emerald-500/[0.05]",
  }[cor]
  return (
    <div
      role="group"
      aria-label={nome}
      className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${classe}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-h-7 text-[10px] font-bold leading-4 sm:min-h-0">
          {nome}
        </p>
        <span className="hidden shrink-0 opacity-80 sm:inline">
          <Icon nome={icone} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl">
        {valor}
      </p>
      <p className="mt-2 min-h-7 text-[10px] leading-4 text-slate-500">
        {detalhe}
      </p>
    </div>
  )
}
function Paginacao({
  dados,
  carregando,
  mudar,
}: {
  dados: Painel
  carregando: boolean
  mudar: (pagina: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(dados.total / dados.limite)),
    primeiro = dados.total ? (dados.pagina - 1) * dados.limite + 1 : 0,
    ultimo = Math.min(dados.pagina * dados.limite, dados.total)
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[11px] text-slate-500">
        {numero(primeiro)}–{numero(ultimo)} de {numero(dados.total)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => mudar(dados.pagina - 1)}
          disabled={carregando || dados.pagina <= 1}
          className={BOTAO}
        >
          ← <span className="sr-only sm:not-sr-only">Anterior</span>
        </button>
        <span className="text-[11px] tabular-nums text-slate-500">
          {dados.pagina} / {paginas}
        </span>
        <button
          type="button"
          aria-label="Próxima página"
          onClick={() => mudar(dados.pagina + 1)}
          disabled={carregando || dados.pagina >= paginas}
          className={BOTAO}
        >
          <span className="sr-only sm:not-sr-only">Próxima</span> →
        </button>
      </div>
    </div>
  )
}
function GraficoDias({ linhas }: { linhas: Painel["por_dia"] }) {
  const maior = Math.max(1, ...linhas.map((l) => l.logins)),
    pontos = linhas.map((l, i) => ({
      x: 38 + i * (570 / Math.max(1, linhas.length - 1)),
      y: 166 - (l.logins / maior) * 130,
      ...l,
    })),
    caminho = pontos.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" "),
    passo = Math.max(1, Math.ceil(linhas.length / 6))
  return (
    <div className="min-w-0">
      <svg
        viewBox="0 0 640 205"
        role="img"
        aria-label={`Gráfico de logins por dia: ${linhas.map((l) => `${diaCurto(l.dia)}: ${numero(l.logins)}`).join("; ")}`}
        className="h-[180px] w-full sm:h-[215px]"
      >
        <defs>
          <linearGradient id="monitor-acessos-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((nivel) => (
          <g key={nivel}>
            <line
              x1="38"
              x2="608"
              y1={166 - nivel * 130}
              y2={166 - nivel * 130}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />
            <text
              x="28"
              y={170 - nivel * 130}
              textAnchor="end"
              fill="#475569"
              fontSize="10"
            >
              {numero(Math.round(maior * nivel))}
            </text>
          </g>
        ))}
        {pontos.length > 0 && (
          <>
            <path
              d={`${caminho} L${pontos[pontos.length - 1].x},166 L${pontos[0].x},166 Z`}
              fill="url(#monitor-acessos-area)"
            />
            <path
              d={caminho}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {pontos.map((p, i) => (
              <g key={p.dia}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={linhas.length > 60 ? 1.5 : 3}
                  fill="#60a5fa"
                >
                  <title>
                    {diaCurto(p.dia)}: {numero(p.logins)} logins,{" "}
                    {numero(p.usuarios)} usuários
                  </title>
                </circle>
                {(i % passo === 0 || i === pontos.length - 1) && (
                  <text
                    x={p.x}
                    y="193"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                  >
                    {diaCurto(p.dia)}
                  </text>
                )}
              </g>
            ))}
          </>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
        <span>Horário de Brasília</span>
        <span>
          {linhas.length} {linhas.length === 1 ? "dia" : "dias"} no período
        </span>
      </div>
    </div>
  )
}
function Icon({ nome, girando = false }: { nome: string; girando?: boolean }) {
  const caminhos: Record<string, string> = {
    shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
    home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7",
    refresh: "M20 7v5h-5M4 17v-5h5M7 5a8 8 0 0 1 13 7M4 12a8 8 0 0 0 13 7",
    filter: "M4 5h16l-6 7v6l-4 2v-8L4 5Z",
    activity: "M3 12h4l3-8 4 16 3-8h4",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  }
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={girando ? "animate-spin" : ""}
    >
      <path d={caminhos[nome] || caminhos.shield} />
    </svg>
  )
}
