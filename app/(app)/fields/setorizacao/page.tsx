"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"

const MapSetorizacao = dynamic(
  () => import("@/components/ui/MapSetorizacao"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[380px] items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Carregando prévia territorial
          </p>
        </div>
      </div>
    ),
  }
)

type EscolaRow = {
  id: string
  nome_escola: string | null
  cie: string | number | null
  tecnico_atribuido: string | null
  latitude: string | number | null
  longitude: string | number | null
}

type TecnicoRow = {
  id: string
  nome: string | null
  ativo: boolean | null
  created_at?: string | null
}

type Feedback = {
  tipo: "success" | "error" | "info" | "warning"
  texto: string
} | null

type FiltroStatus = "todas" | "pendentes" | "atribuidas"

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function temCoordenada(escola: EscolaRow) {
  const latitude = Number(escola.latitude)
  const longitude = Number(escola.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false
  if (latitude === 0 && longitude === 0) return false

  return true
}

function getInitials(name?: string | null) {
  const clean = textoSeguro(name)

  if (!clean) return "?"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

function getCargaColor(carga: number, mediaIdeal: number) {
  if (carga > mediaIdeal + 2) {
    return {
      badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
      bar: "from-orange-500 to-red-500",
      label: "Sobrecarga",
    }
  }

  if (carga < Math.max(mediaIdeal - 2, 1)) {
    return {
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      bar: "from-emerald-500 to-teal-400",
      label: "Baixa carga",
    }
  }

  return {
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    bar: "from-blue-500 to-cyan-400",
    label: "Equilibrado",
  }
}

export default function SetorizacaoPage() {
  const supabase = useMemo(() => createClient(), [])

  const [escolas, setEscolas] = useState<EscolaRow[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [buscaEscola, setBuscaEscola] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas")

  const [filtroMapaTecnico, setFiltroMapaTecnico] = useState("Todos")
  const [escolaMapaFocoId, setEscolaMapaFocoId] = useState<string | null>(null)
  const [mapaExpandido, setMapaExpandido] = useState(false)

  // Mantém a Matriz exatamente na mesma altura visual da coluna
  // "Equipe FIELD + Inteligência", sem deixar a lista crescer.
  const colunaGestaoRef = useRef<HTMLDivElement>(null)
  const [alturaColunaGestao, setAlturaColunaGestao] = useState<number | null>(null)

  const [savingId, setSavingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [savingTecnicoId, setSavingTecnicoId] = useState<string | null>(null)

  const [novoTecnicoNome, setNovoTecnicoNome] = useState("")
  const [salvandoTecnico, setSalvandoTecnico] = useState(false)

  const [feedback, setFeedback] = useState<Feedback>(null)

  const tecnicosAtivos = useMemo(() => {
    return tecnicos
      .filter((tecnico) => Boolean(tecnico.ativo))
      .sort((a, b) =>
        textoSeguro(a.nome).localeCompare(textoSeguro(b.nome), "pt-BR")
      )
  }, [tecnicos])

  const tecnicoStatusPorNome = useMemo(() => {
    const mapa = new Map<string, boolean>()

    tecnicos.forEach((tecnico) => {
      const nome = textoSeguro(tecnico.nome)
      if (nome) mapa.set(nome, Boolean(tecnico.ativo))
    })

    return mapa
  }, [tecnicos])

  const carregarDados = useCallback(
    async (modo: "inicial" | "manual" = "inicial") => {
      if (modo === "inicial") setLoading(true)
      if (modo === "manual") setRefreshing(true)

      setFeedback(null)

      try {
        const [tecnicosResult, escolasResult] = await Promise.all([
          supabase
            .from("tecnicos")
            .select("*")
            .order("nome", { ascending: true }),
          supabase
            .from("escolas")
            .select("id, nome_escola, cie, tecnico_atribuido, latitude, longitude")
            .order("nome_escola", { ascending: true }),
        ])

        if (tecnicosResult.error) throw tecnicosResult.error
        if (escolasResult.error) throw escolasResult.error

        setTecnicos((tecnicosResult.data || []) as TecnicoRow[])
        setEscolas((escolasResult.data || []) as EscolaRow[])

        if (modo === "manual") {
          setFeedback({
            tipo: "success",
            texto: "Base de setorização atualizada com sucesso.",
          })
        }
      } catch (error: any) {
        console.error("[Setorização SETEC] Erro ao carregar:", error)
        setFeedback({
          tipo: "error",
          texto:
            error?.message ||
            "Não foi possível carregar os dados de setorização.",
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    carregarDados("inicial")
  }, [carregarDados])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  const contagemPorTecnico = useMemo(() => {
    const contagem: Record<string, number> = {}

    escolas.forEach((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)
      const tecnicoAtivo = tecnicoStatusPorNome.get(tecnico)

      if (tecnico && tecnicoAtivo) {
        contagem[tecnico] = (contagem[tecnico] || 0) + 1
      }
    })

    return contagem
  }, [escolas, tecnicoStatusPorNome])

  const stats = useMemo(() => {
    const totalEscolas = escolas.length

    const atribuidasValidas = escolas.filter((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)
      return tecnico && tecnicoStatusPorNome.get(tecnico)
    }).length

    const atribuidasInativas = escolas.filter((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)
      return tecnico && tecnicoStatusPorNome.get(tecnico) === false
    }).length

    const semTecnico = escolas.filter((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)
      return !tecnico
    }).length

    const pendentes = semTecnico + atribuidasInativas
    const progresso =
      totalEscolas > 0 ? Math.round((atribuidasValidas / totalEscolas) * 100) : 0

    const mediaIdeal =
      tecnicosAtivos.length > 0
        ? Math.ceil(totalEscolas / tecnicosAtivos.length)
        : 0

    const ranking = Object.entries(contagemPorTecnico)
      .map(([nome, carga]) => ({
        nome,
        carga,
      }))
      .sort((a, b) => b.carga - a.carga || a.nome.localeCompare(b.nome, "pt-BR"))

    const maiorCarga = ranking[0] || null
    const menorCarga = ranking.length > 0 ? ranking[ranking.length - 1] : null

    return {
      totalEscolas,
      atribuidasValidas,
      atribuidasInativas,
      semTecnico,
      pendentes,
      progresso,
      mediaIdeal,
      ranking,
      maiorCarga,
      menorCarga,
      tecnicosAtivos: tecnicosAtivos.length,
    }
  }, [contagemPorTecnico, escolas, tecnicoStatusPorNome, tecnicosAtivos.length])

  const escolasFiltradas = useMemo(() => {
    const termo = normalizar(buscaEscola)

    return escolas.filter((escola) => {
      const tecnico = textoSeguro(escola.tecnico_atribuido)
      const tecnicoAtivo = tecnicoStatusPorNome.get(tecnico)

      const matchBusca = termo
        ? [escola.nome_escola, escola.cie, escola.tecnico_atribuido]
            .map(normalizar)
            .join(" ")
            .includes(termo)
        : true

      const atribuidaValida = Boolean(tecnico && tecnicoAtivo)
      const pendenteOuInativa = !tecnico || tecnicoAtivo === false

      if (filtroStatus === "pendentes") return matchBusca && pendenteOuInativa
      if (filtroStatus === "atribuidas") return matchBusca && atribuidaValida

      return matchBusca
    })
  }, [buscaEscola, escolas, filtroStatus, tecnicoStatusPorNome])

  const filtrosAtivos = Boolean(buscaEscola.trim()) || filtroStatus !== "todas"

  const listaTecnicosMapa = useMemo(() => {
    const nomes = new Set<string>()

    tecnicosAtivos.forEach((tecnico) => {
      const nome = textoSeguro(tecnico.nome)
      if (nome) nomes.add(nome)
    })

    escolas.forEach((escola) => {
      const nome = textoSeguro(escola.tecnico_atribuido)
      if (nome) nomes.add(nome)
    })

    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [escolas, tecnicosAtivos])

  const mapaStats = useMemo(() => {
    const comCoordenada = escolas.filter(temCoordenada).length
    const semCoordenada = escolas.length - comCoordenada
    const semTecnicoMapeadas = escolas.filter(
      (escola) => temCoordenada(escola) && !textoSeguro(escola.tecnico_atribuido)
    ).length

    return {
      comCoordenada,
      semCoordenada,
      semTecnicoMapeadas,
      cobertura:
        escolas.length > 0
          ? Math.round((comCoordenada / escolas.length) * 100)
          : 0,
    }
  }, [escolas])

  const escolasMapa = useMemo(() => {
    let base = escolas.filter(temCoordenada)

    if (escolaMapaFocoId) {
      return base.filter((escola) => escola.id === escolaMapaFocoId)
    }

    if (filtroMapaTecnico === "Sem Técnico") {
      base = base.filter(
        (escola) => !textoSeguro(escola.tecnico_atribuido)
      )
    } else if (filtroMapaTecnico !== "Todos") {
      base = base.filter(
        (escola) =>
          textoSeguro(escola.tecnico_atribuido) === filtroMapaTecnico
      )
    }

    return base
  }, [escolaMapaFocoId, escolas, filtroMapaTecnico])

  const escolaMapaFoco = useMemo(() => {
    if (!escolaMapaFocoId) return null
    return escolas.find((escola) => escola.id === escolaMapaFocoId) || null
  }, [escolaMapaFocoId, escolas])

  function abrirMapa() {
    window.setTimeout(() => {
      document.getElementById("preview-mapa-setorizacao")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 60)
  }

  function verTecnicoNoMapa(nome: string) {
    setEscolaMapaFocoId(null)
    setFiltroMapaTecnico(nome || "Todos")
    abrirMapa()
  }

  function localizarEscolaNoMapa(escola: EscolaRow) {
    if (!temCoordenada(escola)) {
      setFeedback({
        tipo: "warning",
        texto: "Esta escola ainda não possui latitude/longitude válidas para exibição no mapa.",
      })
      return
    }

    setEscolaMapaFocoId(escola.id)
    setFiltroMapaTecnico("Todos")
    abrirMapa()
  }

  function limparMapa() {
    setEscolaMapaFocoId(null)
    setFiltroMapaTecnico("Todos")
  }

  function limparFiltros() {
    setBuscaEscola("")
    setFiltroStatus("todas")
  }

  async function handleAtribuirTecnico(escolaId: string, novoTecnico: string) {
    setSavingId(escolaId)
    setFeedback(null)

    try {
      const tecnicoLimpo = novoTecnico.trim()
      const payload = {
        tecnico_atribuido: tecnicoLimpo || null,
      }

      const { error } = await supabase
        .from("escolas")
        .update(payload)
        .eq("id", escolaId)

      if (error) throw error

      setEscolas((prev) =>
        prev.map((escola) =>
          escola.id === escolaId
            ? { ...escola, tecnico_atribuido: payload.tecnico_atribuido }
            : escola
        )
      )

      setSuccessId(escolaId)

      window.setTimeout(() => {
        setSuccessId(null)
      }, 2000)
    } catch (error: any) {
      console.error("[Setorização SETEC] Erro ao atribuir técnico:", error)
      setFeedback({
        tipo: "error",
        texto:
          error?.message ||
          "Erro ao atribuir técnico. Verifique a conexão e as permissões.",
      })
    } finally {
      setSavingId(null)
    }
  }

  async function handleAdicionarTecnico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nome = novoTecnicoNome.trim()

    if (!nome) return

    const jaExiste = tecnicos.some(
      (tecnico) => normalizar(tecnico.nome) === normalizar(nome)
    )

    if (jaExiste) {
      setFeedback({
        tipo: "warning",
        texto: "Já existe um técnico cadastrado com esse nome.",
      })
      return
    }

    setSalvandoTecnico(true)
    setFeedback(null)

    try {
      const { error } = await supabase
        .from("tecnicos")
        .insert([{ nome, ativo: true }])

      if (error) throw error

      setNovoTecnicoNome("")
      setFeedback({
        tipo: "success",
        texto: "Técnico cadastrado com sucesso.",
      })

      await carregarDados("manual")
    } catch (error: any) {
      console.error("[Setorização SETEC] Erro ao adicionar técnico:", error)
      setFeedback({
        tipo: "error",
        texto: error?.message || "Não foi possível cadastrar o técnico.",
      })
    } finally {
      setSalvandoTecnico(false)
    }
  }

  async function handleToggleStatusTecnico(tecnico: TecnicoRow) {
    const tecnicoId = textoSeguro(tecnico.id)
    const tecnicoNome = textoSeguro(tecnico.nome)
    const ativoAtual = Boolean(tecnico.ativo)
    const novoStatus = !ativoAtual

    if (!tecnicoId || !tecnicoNome) return

    const escolasVinculadas = escolas.filter(
      (escola) => textoSeguro(escola.tecnico_atribuido) === tecnicoNome
    )

    if (!novoStatus) {
      const confirmar = window.confirm(
        `Suspender o técnico(a) ${tecnicoNome}?\n\n` +
          `Esta ação irá inativar o técnico e remover ${escolasVinculadas.length} atribuição(ões) vinculada(s) a ele(a), deixando essas escolas como pendentes.`
      )

      if (!confirmar) return
    }

    setSavingTecnicoId(tecnicoId)
    setFeedback(null)

    try {
      if (!novoStatus && escolasVinculadas.length > 0) {
        const { error: limparError } = await supabase
          .from("escolas")
          .update({ tecnico_atribuido: null })
          .eq("tecnico_atribuido", tecnicoNome)

        if (limparError) throw limparError
      }

      const { error: tecnicoError } = await supabase
        .from("tecnicos")
        .update({ ativo: novoStatus })
        .eq("id", tecnicoId)

      if (tecnicoError) throw tecnicoError

      setTecnicos((prev) =>
        prev.map((item) =>
          item.id === tecnicoId ? { ...item, ativo: novoStatus } : item
        )
      )

      if (!novoStatus) {
        setEscolas((prev) =>
          prev.map((escola) =>
            textoSeguro(escola.tecnico_atribuido) === tecnicoNome
              ? { ...escola, tecnico_atribuido: null }
              : escola
          )
        )
      }

      setFeedback({
        tipo: "success",
        texto: novoStatus
          ? "Técnico reativado com sucesso. Ele já está disponível para novas atribuições."
          : `Técnico suspenso e ${escolasVinculadas.length} atribuição(ões) removida(s).`,
      })
    } catch (error: any) {
      console.error("[Setorização SETEC] Erro ao alterar status:", error)
      setFeedback({
        tipo: "error",
        texto:
          error?.message ||
          "Não foi possível alterar o status do técnico ou limpar as atribuições.",
      })
    } finally {
      setSavingTecnicoId(null)
    }
  }

  async function handleRemoverTecnico(tecnico: TecnicoRow) {
    const tecnicoId = textoSeguro(tecnico.id)
    const tecnicoNome = textoSeguro(tecnico.nome)

    if (!tecnicoId || !tecnicoNome) return

    const escolasVinculadas = escolas.filter(
      (escola) => textoSeguro(escola.tecnico_atribuido) === tecnicoNome
    )

    const confirmar = window.confirm(
      `Remover definitivamente o técnico(a) ${tecnicoNome}?\n\n` +
        `Essa ação também irá limpar ${escolasVinculadas.length} atribuição(ões) vinculada(s) a ele(a).`
    )

    if (!confirmar) return

    setSavingTecnicoId(tecnicoId)
    setFeedback(null)

    try {
      if (escolasVinculadas.length > 0) {
        const { error: limparError } = await supabase
          .from("escolas")
          .update({ tecnico_atribuido: null })
          .eq("tecnico_atribuido", tecnicoNome)

        if (limparError) throw limparError
      }

      const { error } = await supabase
        .from("tecnicos")
        .delete()
        .eq("id", tecnicoId)

      if (error) throw error

      setTecnicos((prev) => prev.filter((item) => item.id !== tecnicoId))
      setEscolas((prev) =>
        prev.map((escola) =>
          textoSeguro(escola.tecnico_atribuido) === tecnicoNome
            ? { ...escola, tecnico_atribuido: null }
            : escola
        )
      )

      setFeedback({
        tipo: "success",
        texto: `Técnico removido e ${escolasVinculadas.length} atribuição(ões) limpa(s).`,
      })
    } catch (error: any) {
      console.error("[Setorização SETEC] Erro ao remover técnico:", error)
      setFeedback({
        tipo: "error",
        texto: error?.message || "Não foi possível remover o técnico.",
      })
    } finally {
      setSavingTecnicoId(null)
    }
  }

  useEffect(() => {
    const elemento = colunaGestaoRef.current

    if (!elemento) return

    let frame = 0

    const atualizarAltura = () => {
      window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        const altura = Math.ceil(elemento.getBoundingClientRect().height)

        if (altura > 0) {
          setAlturaColunaGestao(altura)
        }
      })
    }

    atualizarAltura()

    const observer = new ResizeObserver(atualizarAltura)
    observer.observe(elemento)

    window.addEventListener("resize", atualizarAltura)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", atualizarAltura)
    }
  }, [tecnicos.length, stats.atribuidasInativas])

  if (loading) return <LoadingPage />

  return (
    <div className="mx-auto max-w-[1750px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/20 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.16),transparent_34%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-7 xl:grid-cols-[1fr_360px] xl:items-stretch">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <Badge color="blue">SETEC</Badge>
                <Badge color="cyan">Setorização Field</Badge>
                <Badge color="emerald">Atribuições sincronizadas</Badge>
              </div>

              <h1 className="max-w-5xl text-3xl font-black tracking-tight text-white md:text-5xl">
                Setorização{" "}
                <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                  SETEC / FIELD
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
                Painel executivo para gerenciamento dos técnicos de campo e atribuição
                das unidades escolares. As alterações refletem na coluna de técnico
                atribuído da tabela de escolas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <KpiCard label="Total UEs" value={stats.totalEscolas} subtitle="Base geral" tone="slate" />
              <KpiCard label="Atribuídas" value={stats.atribuidasValidas} subtitle={`${stats.progresso}% da rede`} tone="emerald" />
              <KpiCard label="Pendentes" value={stats.pendentes} subtitle="Sem técnico válido" tone="red" />
              <KpiCard label="Fields ativos" value={stats.tecnicosAtivos} subtitle="Disponíveis" tone="blue" />
              <KpiCard label="Média ideal" value={stats.mediaIdeal || 0} subtitle="UEs/técnico" tone="cyan" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-blue-500/25 bg-slate-950/70 p-5 shadow-xl shadow-blue-950/20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_48%)]" />

            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#3b82f6 ${stats.progresso * 3.6}deg, rgba(30,41,59,0.92) 0deg)`,
                }}
              >
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border border-slate-800 bg-[#020617] shadow-inner">
                  <p className="text-4xl font-black text-white">{stats.progresso}%</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                    Progresso
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-lg font-black text-white">
                  {stats.atribuidasValidas} de {stats.totalEscolas} escolas cobertas
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                  {stats.pendentes > 0
                    ? `${stats.pendentes} escola(s) ainda precisam de técnico ativo.`
                    : "Todas as escolas estão com técnico ativo atribuído."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            feedback.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : feedback.tipo === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : feedback.tipo === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {feedback.texto}
        </div>
      )}

      {/* ========================================================= */}
      {/* ÁREA PRINCIPAL — EQUIPE + MATRIZ, SEM ESPREMER O CONTEÚDO */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.28fr)]">
        <div ref={colunaGestaoRef} className="space-y-7">
          <Panel title="Gerenciar equipe FIELD">
            <form
              onSubmit={handleAdicionarTecnico}
              className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"
            >
              <input
                type="text"
                placeholder="Nome do novo técnico..."
                value={novoTecnicoNome}
                onChange={(event) => setNovoTecnicoNome(event.target.value)}
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              />

              <button
                type="submit"
                disabled={salvandoTecnico || !novoTecnicoNome.trim()}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {salvandoTecnico ? "Salvando..." : "Adicionar"}
              </button>
            </form>

            {tecnicos.length === 0 ? (
              <EmptyState
                icon="👨‍🔧"
                title="Nenhum técnico cadastrado"
                description="Cadastre o primeiro técnico field para iniciar a setorização."
              />
            ) : (
              <div className="custom-scrollbar max-h-[520px] space-y-4 overflow-y-auto overscroll-contain pr-2">
                {tecnicos.map((tecnico) => {
                  const nome = textoSeguro(tecnico.nome)
                  const carga = contagemPorTecnico[nome] || 0
                  const ativo = Boolean(tecnico.ativo)
                  const config = getCargaColor(carga, stats.mediaIdeal || 1)
                  const bloqueado = savingTecnicoId === tecnico.id

                  return (
                    <article
                      key={tecnico.id}
                      className={`relative overflow-hidden rounded-[1.75rem] border p-4 shadow-lg transition ${
                        ativo
                          ? "border-slate-800 bg-slate-950/75 hover:border-blue-500/35"
                          : "border-red-500/20 bg-red-500/[0.045] opacity-85"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${
                              ativo
                                ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                                : "border-red-500/25 bg-red-500/10 text-red-300"
                            }`}
                          >
                            {getInitials(nome)}
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`truncate text-base font-black ${
                                ativo ? "text-white" : "text-slate-500 line-through"
                              }`}
                              title={nome}
                            >
                              {nome || "Técnico sem nome"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                  ativo
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                    : "border-red-500/25 bg-red-500/10 text-red-300"
                                }`}
                              >
                                {ativo ? "Ativo" : "Inativo"}
                              </span>

                              {ativo && (
                                <span
                                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${config.badge}`}
                                >
                                  {config.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {ativo && (
                          <div className="flex min-w-[76px] shrink-0 flex-col items-center rounded-2xl border border-slate-800 bg-[#020617] px-3 py-2">
                            <p className="text-2xl font-black text-white">{carga}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                              Escolas
                            </p>
                          </div>
                        )}
                      </div>

                      {ativo && (
                        <div className="mt-4 h-2.5 overflow-hidden rounded-full border border-slate-800 bg-[#020617]">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${config.bar}`}
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  (carga /
                                    Math.max(stats.mediaIdeal || 1, carga || 1)) *
                                    100,
                                  8
                                ),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}

                      {nome && carga > 0 && (
                        <button
                          type="button"
                          onClick={() => verTecnicoNoMapa(nome)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                        >
                          <span aria-hidden="true">🗺️</span>
                          Visualizar setor no mapa
                        </button>
                      )}

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatusTecnico(tecnico)}
                          disabled={bloqueado}
                          className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            ativo
                              ? "border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          {bloqueado
                            ? "Processando..."
                            : ativo
                              ? "Suspender e limpar"
                              : "Reativar técnico"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoverTecnico(tecnico)}
                          disabled={bloqueado}
                          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </Panel>

          <Panel title="Inteligência de setorização">
            <div className="grid grid-cols-2 gap-3">
              <InsightBox
                label="Unidades"
                value={stats.totalEscolas}
                detail="Total na base"
                tone="blue"
              />
              <InsightBox
                label="Equipe ativa"
                value={stats.tecnicosAtivos}
                detail="Fields disponíveis"
                tone="emerald"
              />
              <InsightBox
                label="Maior carga"
                value={stats.maiorCarga ? `${stats.maiorCarga.carga} UEs` : "0"}
                detail={stats.maiorCarga?.nome || "Sem técnico"}
                tone="orange"
              />
              <InsightBox
                label="Menor carga"
                value={stats.menorCarga ? `${stats.menorCarga.carga} UEs` : "0"}
                detail={stats.menorCarga?.nome || "Sem técnico"}
                tone="cyan"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Georreferenciamento
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {mapaStats.comCoordenada} de {stats.totalEscolas} escolas localizadas
                  </p>
                </div>

                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">
                  {mapaStats.cobertura}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${mapaStats.cobertura}%` }}
                />
              </div>
            </div>

            {stats.atribuidasInativas > 0 && (
              <div className="mt-4 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm font-bold leading-relaxed text-yellow-200">
                Existem {stats.atribuidasInativas} escola(s) vinculadas a técnicos
                inativos. Revise a matriz para corrigir essas atribuições.
              </div>
            )}
          </Panel>
        </div>

        <div
          className="h-[820px] min-w-0 xl:h-[var(--altura-matriz)]"
          style={
            {
              "--altura-matriz": alturaColunaGestao
                ? `${alturaColunaGestao}px`
                : "820px",
            } as CSSProperties
          }
        >
          <Panel
            title={`Matriz de atribuição (${escolasFiltradas.length} listadas)`}
            className="flex h-full min-h-0 min-w-0 flex-col"
          >
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="shrink-0 rounded-[1.75rem] border border-slate-800 bg-slate-950/45 p-4">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-slate-500">
                    🔍
                  </span>

                  <input
                    type="text"
                    placeholder="Buscar escola por nome, CIE ou técnico..."
                    value={buscaEscola}
                    onChange={(event) => setBuscaEscola(event.target.value)}
                    className="w-full min-w-0 rounded-2xl border border-slate-800 bg-[#020617] py-4 pl-14 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-[#020617] p-1">
                    <FilterButton
                      active={filtroStatus === "todas"}
                      onClick={() => setFiltroStatus("todas")}
                    >
                      Todas
                    </FilterButton>

                    <FilterButton
                      active={filtroStatus === "pendentes"}
                      onClick={() => setFiltroStatus("pendentes")}
                    >
                      Pendentes
                    </FilterButton>

                    <FilterButton
                      active={filtroStatus === "atribuidas"}
                      onClick={() => setFiltroStatus("atribuidas")}
                    >
                      Atribuídas
                    </FilterButton>
                  </div>

                  <button
                    type="button"
                    onClick={() => carregarDados("manual")}
                    disabled={refreshing}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={refreshing ? "animate-spin" : ""}>↻</span>
                    Atualizar
                  </button>
                </div>

                {filtrosAtivos && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#020617] p-4">
                    <p className="text-xs font-bold text-slate-500">
                      Filtros ativos aplicados na matriz.
                    </p>

                    <button
                      type="button"
                      onClick={limparFiltros}
                      className="text-xs font-black uppercase tracking-widest text-blue-300 transition hover:text-blue-200"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-[1.75rem] border border-slate-800 bg-slate-950/35 p-2 shadow-inner shadow-slate-950/40">
              <div className="custom-scrollbar h-full overflow-y-auto overscroll-contain pr-2">
                {escolasFiltradas.length === 0 ? (
                  <EmptyState
                    icon="📭"
                    title="Nenhuma escola encontrada"
                    description="Ajuste a busca ou altere o filtro de status para visualizar mais registros."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {escolasFiltradas.map((escola) => {
                      const tecnico = textoSeguro(escola.tecnico_atribuido)
                      const tecnicoAtivo = tecnicoStatusPorNome.get(tecnico)
                      const isSaving = savingId === escola.id
                      const isSuccess = successId === escola.id
                      const atribuicaoInativa = Boolean(
                        tecnico && tecnicoAtivo === false
                      )
                      const mapeada = temCoordenada(escola)

                      return (
                        <article
                          key={escola.id}
                          className={`rounded-[1.5rem] border p-4 transition ${
                            isSuccess
                              ? "border-emerald-500/35 bg-emerald-500/10"
                              : atribuicaoInativa
                                ? "border-yellow-500/30 bg-yellow-500/10"
                                : tecnico
                                  ? "border-slate-800 bg-[#020617] hover:border-blue-500/35"
                                  : "border-red-500/25 bg-red-500/[0.045] hover:border-red-500/40"
                          }`}
                        >
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-center">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge color="blue">
                                  CIE {textoSeguro(escola.cie, "S/N")}
                                </Badge>

                                {atribuicaoInativa ? (
                                  <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">
                                    Técnico inativo
                                  </span>
                                ) : tecnico ? (
                                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                                    Atribuída
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-300">
                                    Pendente
                                  </span>
                                )}

                                <span
                                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                    mapeada
                                      ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                                      : "border-slate-700 bg-slate-900 text-slate-500"
                                  }`}
                                >
                                  {mapeada ? "Mapeada" : "Sem coordenada"}
                                </span>
                              </div>

                              <h3
                                className="truncate text-base font-black leading-snug text-white"
                                title={textoSeguro(escola.nome_escola, "Escola sem nome")}
                              >
                                {textoSeguro(escola.nome_escola, "Escola sem nome")}
                              </h3>

                              <button
                                type="button"
                                onClick={() => localizarEscolaNoMapa(escola)}
                                className={`mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition ${
                                  mapeada
                                    ? "text-cyan-400 hover:text-cyan-300"
                                    : "text-slate-600 hover:text-yellow-300"
                                }`}
                              >
                                <span aria-hidden="true">⌖</span>
                                {mapeada
                                  ? "Localizar no mapa"
                                  : "Coordenada não cadastrada"}
                              </button>
                            </div>

                            <div className="relative min-w-0">
                              <select
                                value={tecnico}
                                onChange={(event) =>
                                  handleAtribuirTecnico(
                                    escola.id,
                                    event.target.value
                                  )
                                }
                                disabled={isSaving}
                                className={`w-full min-w-0 appearance-none rounded-2xl border px-4 py-4 pr-12 text-sm font-black outline-none transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                  isSuccess
                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                                    : atribuicaoInativa
                                      ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                                      : !tecnico
                                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                                        : "border-slate-700 bg-[#0f172a] text-blue-300 focus:border-blue-500"
                                }`}
                              >
                                <option value="">Sem técnico atribuído</option>

                                {tecnicosAtivos.map((item) => (
                                  <option
                                    key={item.id}
                                    value={textoSeguro(item.nome)}
                                  >
                                    {textoSeguro(item.nome)}
                                  </option>
                                ))}

                                {tecnico &&
                                  !tecnicosAtivos.some(
                                    (item) =>
                                      textoSeguro(item.nome) === tecnico
                                  ) && (
                                    <option value={tecnico}>
                                      {tecnico} (inativo)
                                    </option>
                                  )}
                              </select>

                              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                                {isSaving ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                ) : isSuccess ? (
                                  <span className="text-emerald-400">✓</span>
                                ) : (
                                  <span className="text-slate-500">⌄</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          </Panel>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MAPA — FULL WIDTH ABAIXO DA GESTÃO / MATRIZ              */}
      {/* ========================================================= */}
      <section
        id="preview-mapa-setorizacao"
        className="scroll-mt-24"
      >
        <Panel title="Pré-visualização territorial da setorização">
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                Escolas mapeadas
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-black text-white">{mapaStats.comCoordenada}</p>
                <p className="text-xs font-black text-cyan-300">{mapaStats.cobertura}%</p>
              </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
                Sem Field
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {mapaStats.semTecnicoMapeadas}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                Exibidas no mapa
              </p>
              <p className="mt-2 text-3xl font-black text-white">{escolasMapa.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Sem coordenada
              </p>
              <p className="mt-2 text-3xl font-black text-white">{mapaStats.semCoordenada}</p>
            </div>
          </div>

          <div className="mb-5 rounded-[1.75rem] border border-slate-800 bg-slate-950/55 p-4 md:p-5">
            {escolaMapaFoco ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                      Foco individual
                    </span>
                    <Badge color="blue">
                      CIE {textoSeguro(escolaMapaFoco.cie, "S/N")}
                    </Badge>
                  </div>

                  <p className="mt-3 text-base font-black text-white md:text-lg">
                    {textoSeguro(escolaMapaFoco.nome_escola, "Escola sem nome")}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {textoSeguro(
                      escolaMapaFoco.tecnico_atribuido,
                      "Sem técnico atribuído"
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={limparMapa}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-300"
                  >
                    Mostrar toda a rede
                  </button>

                  <button
                    type="button"
                    onClick={() => setMapaExpandido((current) => !current)}
                    className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
                  >
                    {mapaExpandido ? "Altura normal" : "Ampliar mapa"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,420px)_1fr_auto] lg:items-end">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Visualizar setor
                  </span>

                  <select
                    value={filtroMapaTecnico}
                    onChange={(event) => {
                      setEscolaMapaFocoId(null)
                      setFiltroMapaTecnico(event.target.value)
                    }}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-4 text-sm font-black text-white outline-none transition focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
                  >
                    <option value="Todos">Toda a rede</option>
                    <option value="Sem Técnico">Escolas sem técnico</option>

                    {listaTecnicosMapa.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-slate-800 bg-[#020617] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                    Atualização imediata
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Ao alterar um Field na matriz, a nova atribuição aparece neste mapa
                    assim que o Supabase confirma a atualização.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMapaExpandido((current) => !current)}
                  className="min-h-[52px] rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
                >
                  {mapaExpandido ? "Altura normal" : "Ampliar mapa"}
                </button>
              </div>
            )}
          </div>

          {mapaStats.semCoordenada > 0 && (
            <div className="mb-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-3 text-xs font-bold leading-relaxed text-yellow-200/80">
              {mapaStats.semCoordenada} escola(s) não aparecem no mapa porque ainda
              não possuem latitude/longitude válidas cadastradas.
            </div>
          )}

          <div
            className={`setorizacao-live-map relative w-full overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 transition-[height] duration-300 ${
              mapaExpandido
                ? "h-[78vh] min-h-[680px]"
                : "h-[62vh] min-h-[560px]"
            }`}
          >
            {escolasMapa.length === 0 && (
              <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-[#020617]/90 p-6 text-center backdrop-blur-sm">
                <div className="mb-3 text-4xl">🗺️</div>
                <p className="text-sm font-black text-white">
                  Nenhuma escola disponível neste recorte
                </p>
                <p className="mt-2 max-w-sm text-xs font-semibold leading-relaxed text-slate-500">
                  Limpe o filtro territorial ou verifique as coordenadas cadastradas.
                </p>

                <button
                  type="button"
                  onClick={limparMapa}
                  className="mt-4 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-300"
                >
                  Mostrar toda a rede
                </button>
              </div>
            )}

            <MapSetorizacao escolas={escolasMapa} />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Uso operacional
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">
                Use “Visualizar setor no mapa” no card do Field ou “Localizar no mapa”
                em uma escola para abrir este painel já filtrado.
              </p>
            </div>

            {(escolaMapaFocoId || filtroMapaTecnico !== "Todos") && (
              <button
                type="button"
                onClick={limparMapa}
                className="shrink-0 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
              >
                Limpar filtro do mapa
              </button>
            )}
          </div>
        </Panel>
      </section>

      <style jsx global>{`
        .setorizacao-live-map .leaflet-container {
          height: 100%;
          width: 100%;
          background: #020617;
          font-family: inherit;
        }

        /*
         * Nesta tela de gestão a legenda detalhada do MapSetorizacao é ocultada
         * para liberar área útil. O mapa Field original continua inalterado.
         */
        .setorizacao-live-map .legend,
        .setorizacao-live-map .map-legend,
        .setorizacao-live-map .leaflet-control-layers,
        .setorizacao-live-map .leaflet-bottom.leaflet-right > .leaflet-control {
          display: none !important;
        }


        .setorizacao-live-map .leaflet-control-container {
          font-family: inherit;
        }

        .setorizacao-live-map .leaflet-tile {
          border: none !important;
          outline: 1px solid transparent !important;
          box-shadow: none !important;
          image-rendering: auto !important;
          -webkit-backface-visibility: hidden !important;
          backface-visibility: hidden !important;
          transform: translateZ(0);
        }

        .setorizacao-live-map .leaflet-marker-icon,
        .setorizacao-live-map .leaflet-marker-shadow {
          outline: none !important;
          box-shadow: none !important;
        }

        .setorizacao-live-map .leaflet-control {
          border-radius: 0.9rem !important;
          border: 1px solid rgba(51, 65, 85, 0.95) !important;
          background: rgba(2, 6, 23, 0.92) !important;
          color: #e2e8f0 !important;
          box-shadow: 0 14px 38px rgba(2, 6, 23, 0.35) !important;
          backdrop-filter: blur(10px);
        }

        .setorizacao-live-map .leaflet-control a {
          background: rgba(15, 23, 42, 0.98) !important;
          color: #e2e8f0 !important;
          border-color: rgba(51, 65, 85, 0.95) !important;
        }

        .setorizacao-live-map .leaflet-control a:hover {
          background: rgba(30, 41, 59, 0.98) !important;
          color: #67e8f9 !important;
        }

        .setorizacao-live-map .leaflet-popup-content-wrapper,
        .setorizacao-live-map .leaflet-popup-tip {
          background: #020617 !important;
          color: #f8fafc !important;
          border: 1px solid rgba(51, 65, 85, 0.95) !important;
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.45) !important;
        }

        .setorizacao-live-map .leaflet-popup-content {
          margin: 12px 14px !important;
          font-family: inherit !important;
          color: #f8fafc !important;
        }

        .setorizacao-live-map .leaflet-popup-content * {
          color: #f8fafc !important;
        }

        .setorizacao-live-map .leaflet-popup-close-button {
          color: #ffffff !important;
        }

        .setorizacao-live-map .leaflet-control-attribution {
          display: none !important;
        }

        .setorizacao-live-map .leaflet-bottom.leaflet-right {
          display: none !important;
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #475569 rgba(15, 23, 42, 0.45);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.45);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }

        select option {
          background-color: #0f172a;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  )
}

function Panel({
  children,
  title,
  className = "",
}: {
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      {title && (
        <h3 className="mb-5 shrink-0 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {title}
        </h3>
      )}

      {children}
    </div>
  )
}

function Badge({
  children,
  color,
}: {
  children: ReactNode
  color: "blue" | "cyan" | "emerald"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles[color]}`}
    >
      {children}
    </span>
  )
}

function KpiCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string
  value: string | number
  subtitle: string
  tone: "slate" | "emerald" | "red" | "blue" | "cyan"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  }

  const bars = {
    slate: "bg-slate-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold opacity-80">{subtitle}</p>

      <div className={`mt-3 h-1 rounded-full ${bars[tone]}`} />
    </div>
  )
}

function InsightBox({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  tone: "blue" | "emerald" | "orange" | "cyan"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-xs font-bold opacity-80" title={detail}>
        {detail}
      </p>
    </div>
  )
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {children}
    </button>
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
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-3xl">
        {icon}
      </div>

      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="mx-auto max-w-[1750px] space-y-7 pb-12">
      <div className="h-72 animate-pulse rounded-[2.5rem] border border-slate-800 bg-slate-900/40" />

      <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="h-[620px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
        <div className="h-[748px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
      </div>
    </div>
  )
}