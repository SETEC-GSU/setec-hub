"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  arquivarSaibl,
  carregarSaibl,
  restaurarSaibl,
  salvarSaibl,
} from "./actions"

type SaiblRow = {
  id: string
  escola_id?: string | null
  escola: string | null
  cie: string | null
  link_fw?: string | null
  status_saibl: "INSTALADA" | "PREVISTA" | "NÃO INSTALADA" | string
  online_fw: boolean | null
  velocidade_saibl: string | null
  possui_terceiro_link_piec: boolean | null

  terceiro_link_detalhes?: string | null
  situacao_internal3?: string | null
  necessita_field?: boolean | null
  observacao_setec?: string | null
  data_validacao?: string | null
  validado_por?: string | null

  ativo?: boolean
  created_at?: string | null
  updated_at?: string | null
  updated_by?: string | null
}

type EscolaReferencia = {
  id: string
  nome_escola: string | null
  cie: string | number | null
}

type Profile = {
  id: string
  nome: string
  email: string | null
  role: string
  setor: string | null
}

type Feedback =
  | {
      type: "success" | "error" | "info"
      message: string
    }
  | null

type AdminFilter =
  | "todos"
  | "field"
  | "internal3"
  | "offline"
  | "velocidade"
  | "piec"

const STATUS_LABEL: Record<string, string> = {
  INSTALADA: "Instalada",
  PREVISTA: "Prevista",
  "NÃO INSTALADA": "Não instalada",
}

const INTERNAL3_LABEL: Record<string, string> = {
  NAO_SE_APLICA: "Não se aplica",
  A_VALIDAR: "A validar",
  CONECTADO_INTERNAL_3: "Conectado na Internal 3",
  FORA_INTERNAL_3: "Fora da Internal 3",
  AJUSTE_NECESSARIO: "Ajuste necessário",
}

function safeText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function normalize(value: unknown) {
  return safeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function digits(value: unknown) {
  return safeText(value).replace(/\D/g, "")
}

function fwFromCie(cie: unknown) {
  const clean = digits(cie)
  return clean ? `https://fw-${clean.padStart(6, "0")}/` : ""
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sem registro"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sem registro"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusTone(status: string) {
  if (status === "INSTALADA") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  if (status === "PREVISTA") {
    return "border-blue-500/25 bg-blue-500/10 text-blue-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function internalTone(status?: string | null) {
  if (status === "CONECTADO_INTERNAL_3") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  if (status === "FORA_INTERNAL_3" || status === "AJUSTE_NECESSARIO") {
    return "border-red-500/25 bg-red-500/10 text-red-300"
  }

  if (status === "A_VALIDAR") {
    return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
  }

  return "border-slate-700 bg-slate-900 text-slate-400"
}

export default function SaiblPage() {
  const [rows, setRows] = useState<SaiblRow[]>([])
  const [escolasReferencia, setEscolasReferencia] = useState<EscolaReferencia[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminView, setAdminView] = useState(false)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("")
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("todos")
  const [mostrarArquivados, setMostrarArquivados] = useState(false)

  const [modo, setModo] = useState<"consulta" | "gestao">("consulta")
  const [selected, setSelected] = useState<SaiblRow | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  const carregar = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)

    setFeedback(null)

    try {
      const result = await carregarSaibl()

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.message,
        })
        return
      }

      setRows(result.data?.rows || [])
      setEscolasReferencia(result.data?.escolasReferencia || [])
      setProfile(result.data?.profile || null)
      setAdminView(Boolean(result.data?.adminView))

      if (!result.data?.adminView) {
        setModo("consulta")
        setSelected(null)
        setEditing(false)
        setCreating(false)
      }
    } catch (error) {
      console.error("[SAI-BL] Erro ao carregar:", error)
      setFeedback({
        type: "error",
        message: "Não foi possível carregar o acompanhamento SAI-BL.",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void carregar(false)
  }, [carregar])

  const ativos = useMemo(
    () => rows.filter((row) => row.ativo !== false),
    [rows]
  )

  const stats = useMemo(() => {
    const total = ativos.length
    const instaladas = ativos.filter((row) => row.status_saibl === "INSTALADA").length
    const previstas = ativos.filter((row) => row.status_saibl === "PREVISTA").length
    const naoInstaladas = ativos.filter(
      (row) => row.status_saibl === "NÃO INSTALADA"
    ).length

    const online = ativos.filter((row) => row.online_fw === true).length
    const offline = ativos.filter((row) => row.online_fw !== true).length

    const piec = ativos.filter(
      (row) => row.possui_terceiro_link_piec === true
    ).length

    const vel500 = ativos.filter(
      (row) => normalize(row.velocidade_saibl) === "500mb"
    ).length

    const vel700 = ativos.filter(
      (row) => normalize(row.velocidade_saibl) === "700mb"
    ).length

    const velocidadePendente = ativos.filter(
      (row) =>
        !safeText(row.velocidade_saibl) ||
        normalize(row.velocidade_saibl).includes("pendente")
    ).length

    const field = ativos.filter((row) => row.necessita_field === true).length

    const internal3Validar = ativos.filter((row) =>
      ["A_VALIDAR", "FORA_INTERNAL_3", "AJUSTE_NECESSARIO"].includes(
        safeText(row.situacao_internal3)
      )
    ).length

    const instaladasOffline = ativos.filter(
      (row) => row.status_saibl === "INSTALADA" && row.online_fw !== true
    ).length

    const percentual =
      total > 0 ? Math.round((instaladas / total) * 100) : 0

    return {
      total,
      instaladas,
      previstas,
      naoInstaladas,
      online,
      offline,
      piec,
      vel500,
      vel700,
      velocidadePendente,
      field,
      internal3Validar,
      instaladasOffline,
      percentual,
    }
  }, [ativos])

  const consultaFiltrada = useMemo(() => {
    const term = normalize(busca)

    return ativos.filter((row) => {
      if (filtroStatus && row.status_saibl !== filtroStatus) return false

      if (!term) return true

      return normalize(
        [
          row.escola,
          row.cie,
          row.status_saibl,
          row.velocidade_saibl,
        ].join(" ")
      ).includes(term)
    })
  }, [ativos, busca, filtroStatus])

  const adminRows = useMemo(() => {
    const term = normalize(busca)

    return rows.filter((row) => {
      if (mostrarArquivados ? row.ativo !== false : row.ativo === false) {
        return false
      }

      if (filtroStatus && row.status_saibl !== filtroStatus) return false

      if (adminFilter === "field" && row.necessita_field !== true) return false

      if (
        adminFilter === "internal3" &&
        !["A_VALIDAR", "FORA_INTERNAL_3", "AJUSTE_NECESSARIO"].includes(
          safeText(row.situacao_internal3)
        )
      ) {
        return false
      }

      if (adminFilter === "offline" && row.online_fw === true) return false

      if (
        adminFilter === "velocidade" &&
        safeText(row.velocidade_saibl) &&
        !normalize(row.velocidade_saibl).includes("pendente")
      ) {
        return false
      }

      if (
        adminFilter === "piec" &&
        row.possui_terceiro_link_piec !== true
      ) {
        return false
      }

      if (!term) return true

      return normalize(
        [
          row.escola,
          row.cie,
          row.status_saibl,
          row.velocidade_saibl,
          row.terceiro_link_detalhes,
          row.observacao_setec,
          row.situacao_internal3,
        ].join(" ")
      ).includes(term)
    })
  }, [
    adminFilter,
    busca,
    filtroStatus,
    mostrarArquivados,
    rows,
  ])

  const ultimaAtualizacao = useMemo(() => {
    const timestamps = ativos
      .map((row) => new Date(row.updated_at || 0).getTime())
      .filter((value) => Number.isFinite(value) && value > 0)

    if (timestamps.length === 0) return "Sem registro"

    return formatDateTime(new Date(Math.max(...timestamps)).toISOString())
  }, [ativos])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!adminView || processing) return

    setProcessing(true)
    setFeedback(null)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await salvarSaibl(formData)

      setFeedback({
        type: result.ok ? "success" : "error",
        message: result.message,
      })

      if (result.ok) {
        setCreating(false)
        setEditing(false)
        setSelected(null)
        await carregar(true)
      }
    } catch (error) {
      console.error("[SAI-BL] Erro ao salvar:", error)
      setFeedback({
        type: "error",
        message: "Não foi possível salvar o registro.",
      })
    } finally {
      setProcessing(false)
    }
  }

  async function handleArchive(row: SaiblRow) {
    if (!adminView || processing) return

    const ok = window.confirm(
      `Arquivar ${safeText(row.escola, "esta escola")} do acompanhamento SAI-BL?\n\nO histórico será preservado e poderá ser restaurado.`
    )

    if (!ok) return

    setProcessing(true)

    try {
      const formData = new FormData()
      formData.set("id", row.id)

      const result = await arquivarSaibl(formData)

      setFeedback({
        type: result.ok ? "success" : "error",
        message: result.message,
      })

      if (result.ok) {
        setSelected(null)
        await carregar(true)
      }
    } finally {
      setProcessing(false)
    }
  }

  async function handleRestore(row: SaiblRow) {
    if (!adminView || processing) return

    setProcessing(true)

    try {
      const formData = new FormData()
      formData.set("id", row.id)

      const result = await restaurarSaibl(formData)

      setFeedback({
        type: result.ok ? "success" : "error",
        message: result.message,
      })

      if (result.ok) {
        setSelected(null)
        await carregar(true)
      }
    } finally {
      setProcessing(false)
    }
  }

  function openAdminRow(row: SaiblRow) {
    if (!adminView) return
    setSelected(row)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando SAI-BL
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 px-3 pb-14 sm:px-5 lg:px-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-[#020617] via-[#071126] to-[#020617] p-6 shadow-2xl sm:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="blue">SAI-BL</Badge>
              <Badge tone="slate">FDE • Contratação centralizada</Badge>
              <Badge tone="emerald">Operadora VIVO</Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              SAI-BL • Acompanhamento de Implantação
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
              Acompanhamento da instalação gradual do novo link de conectividade
              nas unidades escolares da URE Guarulhos Sul.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {adminView && (
              <button
                type="button"
                onClick={() =>
                  setModo((current) =>
                    current === "consulta" ? "gestao" : "consulta"
                  )
                }
                className={`rounded-2xl border px-5 py-3 text-xs font-black uppercase tracking-widest transition ${
                  modo === "gestao"
                    ? "border-violet-500/35 bg-violet-500/15 text-violet-200"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-violet-500/35 hover:text-violet-300"
                }`}
              >
                {modo === "gestao"
                  ? "← Voltar à consulta"
                  : "⚙ Gestão administrativa"}
              </button>
            )}

            <button
              type="button"
              onClick={() => void carregar(true)}
              disabled={refreshing}
              className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
            >
              {refreshing ? "Atualizando..." : "↻ Atualizar dados"}
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            feedback.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : feedback.type === "error"
                ? "border-red-500/25 bg-red-500/10 text-red-200"
                : "border-blue-500/25 bg-blue-500/10 text-blue-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoCard
          icon="🏛️"
          title="Implantação centralizada"
          text="O SAI-BL é contratado de forma centralizada pela FDE, com implantação realizada pela operadora VIVO nas escolas."
          tone="blue"
        />

        <InfoCard
          icon="🔌"
          title="Antigo PIEC → Internal 3"
          text="Escolas que mantêm o antigo segundo link adquirido via PIEC poderão remanejá-lo para a porta Internal 3 do firewall."
          tone="cyan"
        />

        <InfoCard
          icon="🧑‍🔧"
          title="Validação SETEC / FIELD"
          text="Quando o técnico VIVO não realizar o remanejamento, a SETEC valida o firewall e direciona atendimento FIELD quando necessário."
          tone="emerald"
        />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total de escolas" value={stats.total} detail="Base SAI-BL" tone="blue" />
        <Kpi label="Instaladas" value={stats.instaladas} detail={`${stats.percentual}% da rede`} tone="emerald" />
        <Kpi label="Previstas" value={stats.previstas} detail="Implantação planejada" tone="cyan" />
        <Kpi label="Não instaladas" value={stats.naoInstaladas} detail="Ainda sem SAI-BL" tone="slate" />
        <Kpi label="Online no FW" value={stats.online} detail={`${stats.offline} offline`} tone="green" />
        <Kpi label="Possuem PIEC" value={stats.piec} detail="Potencial 3º link" tone="purple" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Progresso de implantação">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-5xl font-black text-white">{stats.percentual}%</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {stats.instaladas} de {stats.total} escolas já constam como instaladas.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[340px]">
              <MiniBox label="Instaladas" value={stats.instaladas} tone="emerald" />
              <MiniBox label="Previstas" value={stats.previstas} tone="blue" />
              <MiniBox label="Pendentes" value={stats.naoInstaladas} tone="slate" />
            </div>
          </div>

          <div className="mt-6 h-4 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 transition-all duration-700"
              style={{ width: `${stats.percentual}%` }}
            />
          </div>
        </Panel>

        <Panel title="Velocidade SAI-BL">
          <div className="grid grid-cols-3 gap-3">
            <MiniBox label="500 MB" value={stats.vel500} tone="cyan" />
            <MiniBox label="700 MB" value={stats.vel700} tone="blue" />
            <MiniBox label="Pendente" value={stats.velocidadePendente} tone="yellow" />
          </div>

          <p className="mt-5 text-xs font-semibold leading-relaxed text-slate-500">
            A velocidade é apresentada conforme a informação disponível na base
            de implantação.
          </p>
        </Panel>
      </section>

      {adminView && modo === "gestao" ? (
        <>
          <section className="rounded-[2rem] border border-violet-500/20 bg-violet-500/[0.035] p-5 shadow-xl sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="purple">Acesso restrito</Badge>
                  <Badge tone="slate">ADMIN / SEINTEC</Badge>
                </div>

                <h2 className="mt-3 text-2xl font-black text-white">
                  Gestão e Análise SAI-BL
                </h2>

                <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
                  Gestão da implantação por escola, situação do antigo PIEC,
                  validação da Internal 3 e acionamentos FIELD.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreating(true)
                  setSelected(null)
                  setEditing(false)
                }}
                className="rounded-2xl bg-violet-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
              >
                + Nova unidade
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <AdminMetric label="Instaladas offline" value={stats.instaladasOffline} tone="red" />
              <AdminMetric label="Internal 3 a tratar" value={stats.internal3Validar} tone="yellow" />
              <AdminMetric label="Ação FIELD" value={stats.field} tone="orange" />
              <AdminMetric label="PIEC / 3º link" value={stats.piec} tone="purple" />
              <AdminMetric label="Velocidade pendente" value={stats.velocidadePendente} tone="cyan" />
              <AdminMetric label="FW online" value={stats.online} tone="emerald" />
            </div>
          </section>

          <Panel title={`Matriz administrativa • ${adminRows.length} registros`}>
            <div className="grid grid-cols-1 gap-3 border-b border-slate-800 pb-5 lg:grid-cols-[1fr_220px_220px_auto]">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar escola, CIE, observação..."
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-blue-500/60"
              />

              <select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none"
              >
                <option value="">Todos os status</option>
                <option value="INSTALADA">Instalada</option>
                <option value="PREVISTA">Prevista</option>
                <option value="NÃO INSTALADA">Não instalada</option>
              </select>

              <select
                value={adminFilter}
                onChange={(event) =>
                  setAdminFilter(event.target.value as AdminFilter)
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none"
              >
                <option value="todos">Todos os registros</option>
                <option value="field">Necessita FIELD</option>
                <option value="internal3">Internal 3 pendente</option>
                <option value="offline">Firewall offline</option>
                <option value="velocidade">Velocidade pendente</option>
                <option value="piec">Possui PIEC</option>
              </select>

              <button
                type="button"
                onClick={() => setMostrarArquivados((current) => !current)}
                className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition ${
                  mostrarArquivados
                    ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {mostrarArquivados ? "Arquivados" : "Ativos"}
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
              <div className="custom-scrollbar max-h-[700px] overflow-auto">
                <table className="w-full min-w-[1120px] text-left">
                  <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                    <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-4 py-4">Escola</th>
                      <th className="px-4 py-4">SAI-BL</th>
                      <th className="px-4 py-4 text-center">FW</th>
                      <th className="px-4 py-4">Velocidade</th>
                      <th className="px-4 py-4 text-center">PIEC</th>
                      <th className="px-4 py-4">Internal 3</th>
                      <th className="px-4 py-4 text-center">FIELD</th>
                      <th className="px-4 py-4 text-right">Ação</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/70">
                    {adminRows.map((row) => (
                      <tr key={row.id} className="bg-[#020617] transition hover:bg-slate-900/65">
                        <td className="px-4 py-4">
                          <p className="max-w-[320px] truncate text-sm font-black text-white" title={safeText(row.escola)}>
                            {safeText(row.escola, "Escola sem nome")}
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-slate-600">
                            CIE {safeText(row.cie, "S/N")}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={safeText(row.status_saibl)} />
                        </td>

                        <td className="px-4 py-4 text-center">
                          <OnlineDot online={row.online_fw === true} />
                        </td>

                        <td className="px-4 py-4 text-xs font-black text-slate-300">
                          {safeText(row.velocidade_saibl, "Pendente")}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <YesNo value={row.possui_terceiro_link_piec === true} />
                        </td>

                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${internalTone(row.situacao_internal3)}`}>
                            {INTERNAL3_LABEL[safeText(row.situacao_internal3)] || "Não informado"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={row.necessita_field ? "text-orange-300" : "text-slate-600"}>
                            {row.necessita_field ? "Necessário" : "Não"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openAdminRow(row)}
                            className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
                          >
                            Analisar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {adminRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm font-semibold text-slate-600">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </>
      ) : (
        <Panel title="Consulta por unidade escolar">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-800 pb-5 md:grid-cols-[1fr_240px]">
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar unidade escolar ou CIE..."
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-blue-500/60"
            />

            <select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none"
            >
              <option value="">Todos os status</option>
              <option value="INSTALADA">Instalada</option>
              <option value="PREVISTA">Prevista</option>
              <option value="NÃO INSTALADA">Não instalada</option>
            </select>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {consultaFiltrada.map((row) => (
              <article
                key={row.id}
                className="rounded-[1.5rem] border border-slate-800 bg-slate-950/55 p-4 transition hover:border-blue-500/25"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <StatusBadge status={safeText(row.status_saibl)} />
                    <h3 className="mt-3 line-clamp-2 text-sm font-black leading-snug text-white">
                      {safeText(row.escola, "Escola sem nome")}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      CIE {safeText(row.cie, "S/N")}
                    </p>
                  </div>

                  <OnlineDot online={row.online_fw === true} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniDetail label="Velocidade" value={safeText(row.velocidade_saibl, "Pendente")} />
                  <MiniDetail
                    label="Antigo PIEC"
                    value={row.possui_terceiro_link_piec ? "Possui" : "Não possui"}
                  />
                </div>
              </article>
            ))}

            {consultaFiltrada.length === 0 && (
              <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-950/50 px-6 py-12 text-center text-sm font-semibold text-slate-600">
                Nenhuma escola localizada para os filtros atuais.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>{consultaFiltrada.length} escola(s) exibida(s).</span>
            <span>Última atualização da base: {ultimaAtualizacao}</span>
          </div>
        </Panel>
      )}

      {adminView && (selected || creating) && (
        <AdminModal
          row={creating ? null : selected}
          editing={creating || editing}
          creating={creating}
          escolasReferencia={escolasReferencia}
          processing={processing}
          onClose={() => {
            setSelected(null)
            setEditing(false)
            setCreating(false)
          }}
          onEdit={() => setEditing(true)}
          onSubmit={handleSave}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #334155 rgba(15, 23, 42, 0.35);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.35);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 999px;
        }
      `}</style>
    </div>
  )
}

function AdminModal({
  row,
  editing,
  creating,
  escolasReferencia,
  processing,
  onClose,
  onEdit,
  onSubmit,
  onArchive,
  onRestore,
}: {
  row: SaiblRow | null
  editing: boolean
  creating: boolean
  escolasReferencia: EscolaReferencia[]
  processing: boolean
  onClose: () => void
  onEdit: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onArchive: (row: SaiblRow) => void
  onRestore: (row: SaiblRow) => void
}) {
  const [escolaId, setEscolaId] = useState(row?.escola_id || "")
  const selectedSchool = escolasReferencia.find((item) => item.id === escolaId)
  const selectedCie = selectedSchool?.cie ?? row?.cie ?? ""
  const suggestedFw = fwFromCie(selectedCie)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/85 p-3 backdrop-blur-md sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#07101f] shadow-2xl">
        <header className="shrink-0 border-b border-slate-800 bg-slate-950/80 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge tone="purple">
                  {creating ? "Novo registro" : editing ? "Edição administrativa" : "Análise da escola"}
                </Badge>
                {!creating && row && (
                  <StatusBadge status={safeText(row.status_saibl)} />
                )}
              </div>

              <h2 className="mt-3 truncate text-xl font-black text-white sm:text-2xl">
                {creating
                  ? "Adicionar escola ao SAI-BL"
                  : safeText(row?.escola, "Escola sem nome")}
              </h2>

              {!creating && (
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                  CIE {safeText(row?.cie, "S/N")}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-lg font-black text-slate-400 transition hover:border-red-500/30 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {editing ? (
            <form onSubmit={onSubmit} className="space-y-5">
              {row?.id && <input type="hidden" name="id" value={row.id} />}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Unidade escolar">
                  <select
                    name="escola_id"
                    required
                    value={escolaId}
                    onChange={(event) => setEscolaId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/60"
                  >
                    <option value="">Selecione...</option>
                    {escolasReferencia.map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {safeText(escola.nome_escola)} • CIE {safeText(escola.cie)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Link Firewall">
                  <input
                    name="link_fw"
                    defaultValue={safeText(row?.link_fw) || suggestedFw}
                    key={`${escolaId}-${suggestedFw}`}
                    placeholder={suggestedFw}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-blue-500/60"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Situação SAI-BL">
                  <select
                    name="status_saibl"
                    defaultValue={safeText(row?.status_saibl, "NÃO INSTALADA")}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none"
                  >
                    <option value="INSTALADA">Instalada</option>
                    <option value="PREVISTA">Prevista</option>
                    <option value="NÃO INSTALADA">Não instalada</option>
                  </select>
                </Field>

                <Field label="Firewall online">
                  <select
                    name="online_fw"
                    defaultValue={row?.online_fw ? "true" : "false"}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </Field>

                <Field label="Velocidade SAI-BL">
                  <input
                    name="velocidade_saibl"
                    defaultValue={safeText(row?.velocidade_saibl)}
                    placeholder="Ex.: 500MB, 700MB..."
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Possui antigo PIEC">
                  <select
                    name="possui_terceiro_link_piec"
                    defaultValue={row?.possui_terceiro_link_piec ? "true" : "false"}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none"
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </Field>

                <Field label="Situação Internal 3">
                  <select
                    name="situacao_internal3"
                    defaultValue={safeText(row?.situacao_internal3, "NAO_SE_APLICA")}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none"
                  >
                    <option value="NAO_SE_APLICA">Não se aplica</option>
                    <option value="A_VALIDAR">A validar</option>
                    <option value="CONECTADO_INTERNAL_3">Conectado na Internal 3</option>
                    <option value="FORA_INTERNAL_3">Fora da Internal 3</option>
                    <option value="AJUSTE_NECESSARIO">Ajuste necessário</option>
                  </select>
                </Field>

                <Field label="Necessita atendimento FIELD">
                  <select
                    name="necessita_field"
                    defaultValue={row?.necessita_field ? "true" : "false"}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none"
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </Field>
              </div>

              <Field label="Empresa do antigo link / observações da planilha">
                <textarea
                  name="terceiro_link_detalhes"
                  defaultValue={safeText(row?.terceiro_link_detalhes)}
                  rows={3}
                  className="w-full resize-y rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-medium leading-relaxed text-white outline-none"
                />
              </Field>

              <Field label="Observação SETEC">
                <textarea
                  name="observacao_setec"
                  defaultValue={safeText(row?.observacao_setec)}
                  rows={4}
                  placeholder="Análise técnica, providência necessária, retorno FIELD..."
                  className="w-full resize-y rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm font-medium leading-relaxed text-white outline-none"
                />
              </Field>

              <label className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <input
                  type="checkbox"
                  name="marcar_validado"
                  value="sim"
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="text-sm font-black text-emerald-200">
                    Registrar validação SETEC agora
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-100/60">
                    Salva a data/hora da validação e o usuário responsável.
                  </p>
                </div>
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-2xl bg-blue-600 px-7 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {processing
                    ? "Salvando..."
                    : creating
                      ? "Criar registro"
                      : "Salvar alterações"}
                </button>
              </div>
            </form>
          ) : row ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <DetailCard label="SAI-BL" value={STATUS_LABEL[safeText(row.status_saibl)] || safeText(row.status_saibl)} />
                <DetailCard label="Firewall" value={row.online_fw ? "Online" : "Offline"} />
                <DetailCard label="Velocidade" value={safeText(row.velocidade_saibl, "Pendente")} />
                <DetailCard label="Antigo PIEC" value={row.possui_terceiro_link_piec ? "Possui" : "Não possui"} />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                <div className="rounded-2xl border border-slate-800 bg-[#020617] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Situação da Internal 3
                  </p>

                  <div className="mt-3">
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${internalTone(row.situacao_internal3)}`}>
                      {INTERNAL3_LABEL[safeText(row.situacao_internal3)] || "Não informado"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-400">
                    {row.possui_terceiro_link_piec
                      ? "O antigo link PIEC pode ser utilizado como terceiro link, preferencialmente conectado à porta Internal 3."
                      : "Esta unidade não possui antigo link PIEC registrado na base atual."}
                  </p>
                </div>

                <div className={`rounded-2xl border p-5 lg:min-w-[250px] ${row.necessita_field ? "border-orange-500/25 bg-orange-500/10" : "border-emerald-500/20 bg-emerald-500/10"}`}>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Atendimento FIELD
                  </p>
                  <p className={`mt-2 text-xl font-black ${row.necessita_field ? "text-orange-300" : "text-emerald-300"}`}>
                    {row.necessita_field ? "Necessário" : "Sem acionamento"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <TextBlock
                  title="Dados do antigo PIEC / planilha"
                  value={safeText(row.terceiro_link_detalhes, "Sem observações registradas.")}
                />
                <TextBlock
                  title="Análise / observação SETEC"
                  value={safeText(row.observacao_setec, "Sem observação administrativa registrada.")}
                  blue
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <DetailCard label="Última atualização" value={formatDateTime(row.updated_at)} />
                <DetailCard label="Última validação" value={formatDateTime(row.data_validacao)} />
                <DetailCard label="CIE" value={safeText(row.cie, "S/N")} />
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                      Acesso ao Firewall
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-400">
                      Navegação restrita à rede local da URE e aos desktops
                      autorizados mediante liberação da FDE.
                    </p>
                  </div>

                  {safeText(row.link_fw) ? (
                    <a
                      href={safeText(row.link_fw)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-cyan-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-cyan-500"
                    >
                      🔐 Acessar FW
                    </a>
                  ) : (
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                      Link não cadastrado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
                {row.ativo === false ? (
                  <button
                    type="button"
                    onClick={() => onRestore(row)}
                    disabled={processing}
                    className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-emerald-300"
                  >
                    Restaurar registro
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onArchive(row)}
                    disabled={processing}
                    className="rounded-2xl border border-red-500/25 bg-red-500/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-red-300"
                  >
                    Arquivar
                  </button>
                )}

                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-2xl bg-blue-600 px-7 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-500"
                >
                  Editar análise
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl sm:p-6">
      <h2 className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

function InfoCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: string
  title: string
  text: string
  tone: "blue" | "cyan" | "emerald"
}) {
  const styles = {
    blue: "border-blue-500/20 bg-blue-500/[0.055]",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.055]",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.055]",
  }

  return (
    <article className={`rounded-[1.75rem] border p-5 ${styles[tone]}`}>
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-4 text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
        {text}
      </p>
    </article>
  )
}

function Kpi({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone: "blue" | "emerald" | "cyan" | "slate" | "green" | "purple"
}) {
  const toneMap = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    slate: "border-slate-700 bg-slate-900 text-slate-300",
    green: "border-green-500/20 bg-green-500/10 text-green-300",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  }

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneMap[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-semibold text-slate-500">{detail}</p>
    </div>
  )
}

function AdminMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "red" | "yellow" | "orange" | "purple" | "cyan" | "emerald"
}) {
  const toneMap = {
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    orange: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function MiniBox({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "emerald" | "blue" | "slate" | "cyan" | "yellow"
}) {
  const toneMap = {
    emerald: "text-emerald-300",
    blue: "text-blue-300",
    slate: "text-slate-400",
    cyan: "text-cyan-300",
    yellow: "text-yellow-300",
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-center">
      <p className={`text-2xl font-black ${toneMap[tone]}`}>{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
    </div>
  )
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode
  tone: "blue" | "slate" | "emerald" | "purple"
}) {
  const toneMap = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    slate: "border-slate-700 bg-slate-900 text-slate-400",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    purple: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${toneMap[tone]}`}>
      {children}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${statusTone(status)}`}>
      {STATUS_LABEL[status] || status || "Não informado"}
    </span>
  )
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
      online
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border-red-500/20 bg-red-500/10 text-red-300"
    }`}>
      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`} />
      {online ? "Online" : "Offline"}
    </span>
  )
}

function YesNo({ value }: { value: boolean }) {
  return (
    <span className={value ? "font-black text-violet-300" : "font-bold text-slate-600"}>
      {value ? "Sim" : "Não"}
    </span>
  )
}

function MiniDetail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020617] p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-xs font-black text-slate-300">{value}</p>
    </div>
  )
}

function DetailCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function TextBlock({
  title,
  value,
  blue = false,
}: {
  title: string
  value: string
  blue?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 ${
      blue
        ? "border-blue-500/20 bg-blue-500/[0.055]"
        : "border-slate-800 bg-[#020617]"
    }`}>
      <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${
        blue ? "text-blue-300" : "text-slate-500"
      }`}>
        {title}
      </p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-300">
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}
