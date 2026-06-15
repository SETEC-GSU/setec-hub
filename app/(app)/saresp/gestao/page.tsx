"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  Copy,
  Edit3,
  FileSpreadsheet,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

type StatusEdicao = "rascunho" | "ativo" | "finalizado" | "arquivado"

type SarespEdicao = {
  id: string
  titulo: string
  ano: number
  data_prova_padrao: string | null
  serie_padrao: string | null
  status: StatusEdicao | string
  fonte_equipamentos: string
  reserva_tecnica_padrao: number
  margem_atencao: number
  distancia_maxima_km: number | null
  descricao: string | null
  created_at: string | null
  updated_at: string | null
}

type FormEdicao = {
  titulo: string
  ano: string
  data_prova_padrao: string
  serie_padrao: string
  status: StatusEdicao
  fonte_equipamentos: string
  reserva_tecnica_padrao: string
  margem_atencao: string
  distancia_maxima_km: string
  descricao: string
}

type Feedback = {
  tipo: "success" | "error" | "warning" | "info"
  texto: string
} | null

type ModalAtivo = "form" | "delete" | null
type FormMode = "novo" | "editar" | "duplicar"

const supabase = createClient()

const STATUS_OPTIONS: { value: StatusEdicao; label: string; description: string }[] = [
  {
    value: "rascunho",
    label: "Rascunho",
    description: "Edição em preparação, ainda não oficializada.",
  },
  {
    value: "ativo",
    label: "Ativo",
    description: "Edição principal usada na Central SARESP.",
  },
  {
    value: "finalizado",
    label: "Finalizado",
    description: "Edição encerrada, mantida para histórico.",
  },
  {
    value: "arquivado",
    label: "Arquivado",
    description: "Edição ocultada do fluxo operacional.",
  },
]

const FONTE_OPTIONS = [
  {
    value: "planilha",
    label: "Planilha",
    description: "Usa a coluna EQUIPAMENTOS CADASTRADOS importada no CSV.",
  },
  {
    value: "inventario",
    label: "Inventário",
    description: "Prioriza dados de equipamentos funcionando no inventário.",
  },
  {
    value: "maior_valor",
    label: "Maior valor",
    description: "Usa o maior valor entre planilha e inventário quando disponível.",
  },
]

function emptyForm(): FormEdicao {
  return {
    titulo: "",
    ano: String(new Date().getFullYear()),
    data_prova_padrao: "",
    serie_padrao: "3ª série EM",
    status: "rascunho",
    fonte_equipamentos: "planilha",
    reserva_tecnica_padrao: "0",
    margem_atencao: "5",
    distancia_maxima_km: "10",
    descricao: "",
  }
}

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function numeroSeguro(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function normalizar(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function formatarData(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatarDataHora(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatarNumero(value: unknown) {
  return numeroSeguro(value).toLocaleString("pt-BR")
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Não foi possível concluir a operação."
}

function getStatusLabel(status?: string | null) {
  const item = STATUS_OPTIONS.find((option) => option.value === status)
  return item?.label || textoSeguro(status, "Não informado")
}

function getStatusClass(status?: string | null) {
  if (status === "ativo") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (status === "rascunho") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
  }

  if (status === "finalizado") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300"
  }

  if (status === "arquivado") {
    return "border-slate-700 bg-slate-900 text-slate-400"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function getFonteLabel(value?: string | null) {
  const fonte = FONTE_OPTIONS.find((item) => item.value === value)
  return fonte?.label || textoSeguro(value, "Não informada")
}

export default function GestaoSarespPage() {
  const [edicoes, setEdicoes] = useState<SarespEdicao[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")

  const [modalAtivo, setModalAtivo] = useState<ModalAtivo>(null)
  const [formMode, setFormMode] = useState<FormMode>("novo")
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<SarespEdicao | null>(null)
  const [form, setForm] = useState<FormEdicao>(emptyForm)

  const carregarEdicoes = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from("saresp_edicoes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setEdicoes((data || []) as SarespEdicao[])
    } catch (error) {
      console.error("[Gestão SARESP] Erro ao carregar edições:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarEdicoes()
  }, [carregarEdicoes])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [feedback])

  const edicoesFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    return edicoes.filter((edicao) => {
      const matchBusca = termo
        ? [
            edicao.titulo,
            edicao.ano,
            edicao.serie_padrao,
            edicao.status,
            edicao.fonte_equipamentos,
            edicao.descricao,
          ]
            .map(normalizar)
            .join(" ")
            .includes(termo)
        : true

      const matchStatus =
        statusFiltro === "todos" ? true : edicao.status === statusFiltro

      return matchBusca && matchStatus
    })
  }, [busca, edicoes, statusFiltro])

  const estatisticas = useMemo(() => {
    return {
      total: edicoes.length,
      ativas: edicoes.filter((item) => item.status === "ativo").length,
      rascunhos: edicoes.filter((item) => item.status === "rascunho").length,
      finalizadas: edicoes.filter((item) => item.status === "finalizado").length,
      arquivadas: edicoes.filter((item) => item.status === "arquivado").length,
    }
  }, [edicoes])

  function montarFormEdicao(edicao: SarespEdicao): FormEdicao {
    return {
      titulo: edicao.titulo || "",
      ano: String(edicao.ano || new Date().getFullYear()),
      data_prova_padrao: edicao.data_prova_padrao || "",
      serie_padrao: edicao.serie_padrao || "",
      status: (edicao.status as StatusEdicao) || "rascunho",
      fonte_equipamentos: edicao.fonte_equipamentos || "planilha",
      reserva_tecnica_padrao: String(edicao.reserva_tecnica_padrao ?? 0),
      margem_atencao: String(edicao.margem_atencao ?? 5),
      distancia_maxima_km:
        edicao.distancia_maxima_km === null || edicao.distancia_maxima_km === undefined
          ? ""
          : String(edicao.distancia_maxima_km),
      descricao: edicao.descricao || "",
    }
  }

  function abrirNovo() {
    setFormMode("novo")
    setEdicaoSelecionada(null)
    setForm(emptyForm())
    setModalAtivo("form")
  }

  function abrirEditar(edicao: SarespEdicao) {
    setFormMode("editar")
    setEdicaoSelecionada(edicao)
    setForm(montarFormEdicao(edicao))
    setModalAtivo("form")
  }

  function abrirDuplicar(edicao: SarespEdicao) {
    const formBase = montarFormEdicao(edicao)

    setFormMode("duplicar")
    setEdicaoSelecionada(edicao)
    setForm({
      ...formBase,
      titulo: `${formBase.titulo} - Cópia`,
      status: "rascunho",
    })
    setModalAtivo("form")
  }

  function abrirDeletar(edicao: SarespEdicao) {
    setEdicaoSelecionada(edicao)
    setModalAtivo("delete")
  }

  function fecharModal() {
    if (salvando) return

    setModalAtivo(null)
    setEdicaoSelecionada(null)
    setForm(emptyForm())
    setFormMode("novo")
  }

  function atualizarCampo<K extends keyof FormEdicao>(campo: K, valor: FormEdicao[K]) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  function validarForm() {
    const titulo = form.titulo.trim()
    const ano = Number(form.ano)
    const reserva = Number(form.reserva_tecnica_padrao)
    const margem = Number(form.margem_atencao)
    const distancia =
      form.distancia_maxima_km.trim() === "" ? null : Number(form.distancia_maxima_km)

    if (!titulo) {
      return "Informe o título da edição."
    }

    if (!Number.isFinite(ano) || ano < 2020 || ano > 2100) {
      return "Informe um ano válido."
    }

    if (!form.data_prova_padrao) {
      return "Informe a data padrão da prova."
    }

    if (!form.serie_padrao.trim()) {
      return "Informe a série padrão da edição."
    }

    if (!Number.isFinite(reserva) || reserva < 0) {
      return "A reserva técnica precisa ser zero ou maior."
    }

    if (!Number.isFinite(margem) || margem < 0) {
      return "A margem de atenção precisa ser zero ou maior."
    }

    if (distancia !== null && (!Number.isFinite(distancia) || distancia <= 0)) {
      return "A distância máxima precisa ser maior que zero ou ficar em branco."
    }

    return null
  }

  async function desativarOutrasEdicoes(edicaoIdAtiva: string) {
    const { error } = await supabase
      .from("saresp_edicoes")
      .update({
        status: "finalizado",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "ativo")
      .neq("id", edicaoIdAtiva)

    if (error) throw error
  }

  async function salvarEdicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const erroValidacao = validarForm()

    if (erroValidacao) {
      setFeedback({
        tipo: "warning",
        texto: erroValidacao,
      })
      return
    }

    setSalvando(true)
    setFeedback(null)

    const payload = {
      titulo: form.titulo.trim(),
      ano: Number(form.ano),
      data_prova_padrao: form.data_prova_padrao || null,
      serie_padrao: form.serie_padrao.trim() || null,
      status: form.status,
      fonte_equipamentos: form.fonte_equipamentos,
      reserva_tecnica_padrao: Number(form.reserva_tecnica_padrao || 0),
      margem_atencao: Number(form.margem_atencao || 0),
      distancia_maxima_km:
        form.distancia_maxima_km.trim() === ""
          ? null
          : Number(form.distancia_maxima_km),
      descricao: form.descricao.trim() || null,
      updated_at: new Date().toISOString(),
    }

    try {
      if (formMode === "editar" && edicaoSelecionada) {
        const { data, error } = await supabase
          .from("saresp_edicoes")
          .update(payload)
          .eq("id", edicaoSelecionada.id)
          .select("*")
          .single()

        if (error) throw error

        if (payload.status === "ativo") {
          await desativarOutrasEdicoes(edicaoSelecionada.id)
        }

        setEdicoes((prev) =>
          prev.map((item) =>
            item.id === edicaoSelecionada.id ? ((data || item) as SarespEdicao) : item
          )
        )

        setFeedback({
          tipo: "success",
          texto: "Edição SARESP atualizada com sucesso.",
        })
      } else {
        const { data, error } = await supabase
          .from("saresp_edicoes")
          .insert(payload)
          .select("*")
          .single()

        if (error) throw error

        const novaEdicao = data as SarespEdicao

        if (payload.status === "ativo") {
          await desativarOutrasEdicoes(novaEdicao.id)
        }

        setEdicoes((prev) => [novaEdicao, ...prev])

        setFeedback({
          tipo: "success",
          texto:
            formMode === "duplicar"
              ? "Edição duplicada com sucesso."
              : "Edição SARESP cadastrada com sucesso.",
        })
      }

      fecharModal()
      await carregarEdicoes()
    } catch (error) {
      console.error("[Gestão SARESP] Erro ao salvar edição:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarStatus(edicao: SarespEdicao, status: StatusEdicao) {
    setSalvando(true)
    setFeedback(null)

    try {
      const { error } = await supabase
        .from("saresp_edicoes")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", edicao.id)

      if (error) throw error

      if (status === "ativo") {
        await desativarOutrasEdicoes(edicao.id)
      }

      setFeedback({
        tipo: "success",
        texto: `Edição marcada como ${getStatusLabel(status)}.`,
      })

      await carregarEdicoes()
    } catch (error) {
      console.error("[Gestão SARESP] Erro ao atualizar status:", error)
      setFeedback({
        tipo: "error",
        texto: getErrorMessage(error),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function deletarEdicao() {
    if (!edicaoSelecionada) return

    setSalvando(true)
    setFeedback(null)

    try {
      const { error } = await supabase
        .from("saresp_edicoes")
        .delete()
        .eq("id", edicaoSelecionada.id)

      if (error) throw error

      setFeedback({
        tipo: "success",
        texto: "Edição excluída com sucesso.",
      })

      fecharModal()
      await carregarEdicoes()
    } catch (error) {
      console.error("[Gestão SARESP] Erro ao excluir edição:", error)
      setFeedback({
        tipo: "error",
        texto:
          "Não foi possível excluir. Caso essa edição já tenha demandas ou remanejamentos vinculados, arquive a edição em vez de excluir.",
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#020617] p-5 shadow-xl shadow-blue-950/10 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_34%)]" />

        <div className="relative z-10 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_620px] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-300">
                Gestão SARESP
              </Badge>
              <Badge className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                Datas e séries
              </Badge>
              <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                Regras operacionais
              </Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Gestão da{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">
                Central SARESP
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Cadastre edições, datas, séries, parâmetros técnicos, fonte de capacidade,
              distância máxima e regras usadas na simulação de remanejamento.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={abrirNovo}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700"
              >
                <Plus size={18} />
                Nova edição
              </button>

              <button
                type="button"
                onClick={carregarEdicoes}
                disabled={loading}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniStat label="Total" value={estatisticas.total} tone="blue" />
            <MiniStat label="Ativas" value={estatisticas.ativas} tone="emerald" />
            <MiniStat label="Rascunhos" value={estatisticas.rascunhos} tone="yellow" />
            <MiniStat label="Finalizadas" value={estatisticas.finalizadas} tone="cyan" />
            <MiniStat label="Arquivadas" value={estatisticas.arquivadas} tone="slate" />
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

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
                <Search size={21} />
              </div>

              <div>
                <h2 className="text-lg font-black text-white">Edições cadastradas</h2>
                <p className="text-sm font-medium text-slate-500">
                  Pesquise, filtre e gerencie as configurações usadas pela Central SARESP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] xl:min-w-[620px]">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por título, ano, série, status..."
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              />

              <select
                value={statusFiltro}
                onChange={(event) => setStatusFiltro(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="todos">Todos os status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">Controle seguro</h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                Ao marcar uma edição como ativa, as demais edições ativas são finalizadas
                automaticamente para evitar conflito na Central SARESP.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <Panel>
        {loading ? (
          <LoadingBox />
        ) : edicoesFiltradas.length === 0 ? (
          <EmptyBox
            icon={<FileSpreadsheet size={34} />}
            title="Nenhuma edição encontrada"
            description="Cadastre a primeira edição do SARESP ou ajuste os filtros aplicados."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {edicoesFiltradas.map((edicao) => (
              <EdicaoCard
                key={edicao.id}
                edicao={edicao}
                salvando={salvando}
                onEditar={() => abrirEditar(edicao)}
                onDuplicar={() => abrirDuplicar(edicao)}
                onDeletar={() => abrirDeletar(edicao)}
                onAtivar={() => atualizarStatus(edicao, "ativo")}
                onFinalizar={() => atualizarStatus(edicao, "finalizado")}
                onArquivar={() => atualizarStatus(edicao, "arquivado")}
                onRascunho={() => atualizarStatus(edicao, "rascunho")}
              />
            ))}
          </div>
        )}
      </Panel>

      {modalAtivo === "form" && (
        <Modal
          title={
            formMode === "editar"
              ? "Editar edição SARESP"
              : formMode === "duplicar"
                ? "Duplicar edição SARESP"
                : "Nova edição SARESP"
          }
          onClose={fecharModal}
          maxWidth="max-w-5xl"
        >
          <form onSubmit={salvarEdicao} className="space-y-5">
            <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Configuração operacional
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {formMode === "editar"
                  ? "Atualizar parâmetros da edição"
                  : "Cadastrar parâmetros da edição"}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-blue-100/80">
                Essas informações serão usadas para processar a importação, calcular déficit,
                sugerir doadoras e montar o plano de remanejamento.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Título da edição *">
                <input
                  value={form.titulo}
                  onChange={(event) => atualizarCampo("titulo", event.target.value)}
                  placeholder="Ex.: SARESP Digital - 23/06/2026 - 3º EM"
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Ano *">
                <input
                  type="number"
                  value={form.ano}
                  onChange={(event) => atualizarCampo("ano", event.target.value)}
                  placeholder="Ex.: 2026"
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Data padrão da prova *">
                <input
                  type="date"
                  value={form.data_prova_padrao}
                  onChange={(event) =>
                    atualizarCampo("data_prova_padrao", event.target.value)
                  }
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Série padrão *">
                <input
                  value={form.serie_padrao}
                  onChange={(event) => atualizarCampo("serie_padrao", event.target.value)}
                  placeholder="Ex.: 3ª série EM"
                  className="input-field"
                  required
                />
              </Field>

              <Field label="Status da edição *">
                <select
                  value={form.status}
                  onChange={(event) =>
                    atualizarCampo("status", event.target.value as StatusEdicao)
                  }
                  className="input-field"
                  required
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fonte de equipamentos *">
                <select
                  value={form.fonte_equipamentos}
                  onChange={(event) =>
                    atualizarCampo("fonte_equipamentos", event.target.value)
                  }
                  className="input-field"
                  required
                >
                  {FONTE_OPTIONS.map((fonte) => (
                    <option key={fonte.value} value={fonte.value}>
                      {fonte.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Reserva técnica padrão">
                <input
                  type="number"
                  min="0"
                  value={form.reserva_tecnica_padrao}
                  onChange={(event) =>
                    atualizarCampo("reserva_tecnica_padrao", event.target.value)
                  }
                  placeholder="Ex.: 0"
                  className="input-field"
                />
              </Field>

              <Field label="Margem de atenção">
                <input
                  type="number"
                  min="0"
                  value={form.margem_atencao}
                  onChange={(event) =>
                    atualizarCampo("margem_atencao", event.target.value)
                  }
                  placeholder="Ex.: 5"
                  className="input-field"
                />
              </Field>

              <Field label="Distância máxima para sugestões">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.distancia_maxima_km}
                  onChange={(event) =>
                    atualizarCampo("distancia_maxima_km", event.target.value)
                  }
                  placeholder="Ex.: 10"
                  className="input-field"
                />
              </Field>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Dica rápida
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  Para o piloto do 3º EM, mantenha fonte “Planilha” caso queira usar a
                  quantidade importada no CSV como referência principal.
                </p>
              </div>

              <div className="lg:col-span-2">
                <Field label="Descrição / observações internas">
                  <textarea
                    value={form.descricao}
                    onChange={(event) =>
                      atualizarCampo("descricao", event.target.value)
                    }
                    placeholder="Ex.: Edição piloto para aplicação do 3º EM, baseada na planilha operacional enviada pelas unidades."
                    className="input-field min-h-[140px] resize-none leading-relaxed"
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status.value}
                  className={`rounded-2xl border p-4 ${
                    form.status === status.value
                      ? getStatusClass(status.value)
                      : "border-slate-800 bg-slate-950/70 text-slate-500"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-widest">
                    {status.label}
                  </p>
                  <p className="mt-2 text-xs font-medium leading-relaxed opacity-80">
                    {status.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {salvando ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {salvando ? "Salvando..." : "Salvar edição"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modalAtivo === "delete" && edicaoSelecionada && (
        <Modal title="Excluir edição SARESP" onClose={fecharModal} maxWidth="max-w-2xl">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-red-500/25 bg-red-500/10 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-300">
                  <AlertTriangle size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Confirmar exclusão
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-red-100/80">
                    A exclusão só funcionará se a edição não possuir demandas, importações
                    ou remanejamentos vinculados. Para preservar histórico, prefira arquivar.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Edição selecionada
              </p>
              <h3 className="mt-2 text-xl font-black text-white">
                {edicaoSelecionada.titulo}
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {edicaoSelecionada.ano} • {formatarData(edicaoSelecionada.data_prova_padrao)} •{" "}
                {textoSeguro(edicaoSelecionada.serie_padrao, "Série não informada")}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => atualizarStatus(edicaoSelecionada, "arquivado")}
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-500/20 disabled:opacity-60"
              >
                <Archive size={18} />
                Arquivar
              </button>

              <button
                type="button"
                onClick={deletarEdicao}
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {salvando ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input-field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(51 65 85 / 1);
          background: rgb(15 23 42 / 0.75);
          padding: 0.95rem 1rem;
          color: white;
          outline: none;
          font-size: 0.875rem;
          font-weight: 700;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .input-field::placeholder {
          color: rgb(71 85 105 / 1);
        }

        .input-field:focus {
          border-color: rgb(59 130 246 / 0.7);
          box-shadow: 0 0 0 1px rgb(59 130 246 / 0.45);
          background: rgb(15 23 42 / 0.95);
        }
      `}</style>
    </div>
  )
}

function EdicaoCard({
  edicao,
  salvando,
  onEditar,
  onDuplicar,
  onDeletar,
  onAtivar,
  onFinalizar,
  onArquivar,
  onRascunho,
}: {
  edicao: SarespEdicao
  salvando: boolean
  onEditar: () => void
  onDuplicar: () => void
  onDeletar: () => void
  onAtivar: () => void
  onFinalizar: () => void
  onArquivar: () => void
  onRascunho: () => void
}) {
  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950/60 p-5 transition-all hover:border-blue-500/35">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/5 blur-3xl transition group-hover:bg-cyan-500/10" />

      <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_520px] xl:items-center">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(
                edicao.status
              )}`}
            >
              {getStatusLabel(edicao.status)}
            </span>

            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
              {edicao.ano}
            </span>

            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              {getFonteLabel(edicao.fonte_equipamentos)}
            </span>
          </div>

          <h3 className="break-words text-2xl font-black text-white">
            {edicao.titulo}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {textoSeguro(edicao.descricao, "Sem descrição cadastrada.")}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500 md:grid-cols-2">
            <p>
              Data padrão:{" "}
              <span className="font-black text-slate-300">
                {formatarData(edicao.data_prova_padrao)}
              </span>
            </p>
            <p>
              Série:{" "}
              <span className="font-black text-slate-300">
                {textoSeguro(edicao.serie_padrao, "-")}
              </span>
            </p>
            <p>
              Criado em:{" "}
              <span className="font-black text-slate-300">
                {formatarDataHora(edicao.created_at)}
              </span>
            </p>
            <p>
              Atualizado em:{" "}
              <span className="font-black text-slate-300">
                {formatarDataHora(edicao.updated_at)}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Reserva" value={edicao.reserva_tecnica_padrao} tone="blue" />
          <MetricCard label="Margem" value={edicao.margem_atencao} tone="yellow" />
          <MetricCard
            label="Distância"
            value={
              edicao.distancia_maxima_km
                ? `${formatarNumero(edicao.distancia_maxima_km)} km`
                : "-"
            }
            tone="cyan"
          />
          <MetricCard label="Fonte" value={getFonteLabel(edicao.fonte_equipamentos)} tone="emerald" />
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {edicao.status !== "ativo" && (
            <ActionButton
              icon={<Power size={15} />}
              label="Ativar"
              tone="emerald"
              disabled={salvando}
              onClick={onAtivar}
            />
          )}

          {edicao.status !== "rascunho" && (
            <ActionButton
              icon={<FileSpreadsheet size={15} />}
              label="Rascunho"
              tone="yellow"
              disabled={salvando}
              onClick={onRascunho}
            />
          )}

          {edicao.status !== "finalizado" && (
            <ActionButton
              icon={<Check size={15} />}
              label="Finalizar"
              tone="blue"
              disabled={salvando}
              onClick={onFinalizar}
            />
          )}

          {edicao.status !== "arquivado" && (
            <ActionButton
              icon={<Archive size={15} />}
              label="Arquivar"
              tone="slate"
              disabled={salvando}
              onClick={onArquivar}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onDuplicar}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-60"
          >
            <Copy size={15} />
            Duplicar
          </button>

          <button
            type="button"
            onClick={onEditar}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-60"
          >
            <Edit3 size={15} />
            Editar
          </button>

          <button
            type="button"
            onClick={onDeletar}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            <Trash2 size={15} />
            Excluir
          </button>
        </div>
      </div>
    </article>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function Badge({
  children,
  className,
}: {
  children: ReactNode
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "blue" | "emerald" | "yellow" | "cyan" | "slate"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    slate: "border-slate-700 bg-slate-900 text-slate-400",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-xl ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {formatarNumero(value)}
      </p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "blue" | "yellow" | "cyan" | "emerald"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-2xl border p-4 text-center ${styles[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-white">
        {value}
      </p>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  tone,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  tone: "emerald" | "yellow" | "blue" | "slate"
  disabled: boolean
  onClick: () => void
}) {
  const styles = {
    emerald:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    yellow:
      "border-yellow-500/25 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20",
    slate: "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition disabled:opacity-60 ${styles[tone]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.5rem] border border-slate-800 bg-slate-950/60 text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
        Carregando edições
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">
        Buscando configurações cadastradas no Supabase.
      </p>
    </div>
  )
}

function EmptyBox({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#020617] text-slate-500">
        {icon}
      </div>
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
  maxWidth,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth: string
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-[2rem] border border-slate-700 bg-[#020617] shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#020617] text-blue-300">
              <Settings2 size={20} />
            </div>
            <h2 className="text-xl font-black text-white">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-84px)] overflow-y-auto p-5 md:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}