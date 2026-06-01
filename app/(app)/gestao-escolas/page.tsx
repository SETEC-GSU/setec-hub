"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

type MensagemTela = {
  tipo: "success" | "error" | "info"
  texto: string
} | null

type EscolaRow = Record<string, any>

const columns = [
  "nome_escola",
  "cie",
  "telefone",
  "endereco",
  "diretor",
  "tipo_ensino",
  "periodo",
  "email",
  "latitude",
  "longitude",
  "horario_abertura",
  "horario_fechamento",
  "total_alunos",
  "qtd_salas",
  "total_equipamentos_recebidos",
  "total_equipamentos_funcionando",
  "aps_instalados",
]

const numericColumns = new Set([
  "latitude",
  "longitude",
  "total_alunos",
  "qtd_salas",
  "total_equipamentos_recebidos",
  "total_equipamentos_funcionando",
  "aps_instalados",
])

const fieldLabels: Record<string, string> = {
  nome_escola: "Nome da escola",
  cie: "CIE",
  telefone: "Telefone",
  endereco: "Endereço",
  diretor: "Diretor(a)",
  tipo_ensino: "Tipo de ensino",
  periodo: "Período",
  email: "E-mail institucional",
  latitude: "Latitude",
  longitude: "Longitude",
  horario_abertura: "Horário de abertura",
  horario_fechamento: "Horário de fechamento",
  total_alunos: "Total de alunos",
  qtd_salas: "Quantidade de salas",
  total_equipamentos_recebidos: "Equipamentos recebidos",
  total_equipamentos_funcionando: "Equipamentos funcionando",
  aps_instalados: "APs instalados",
}

const fieldGroups = [
  {
    title: "Identificação da unidade",
    description: "Dados principais da escola.",
    fields: ["nome_escola", "cie", "diretor", "tipo_ensino", "periodo"],
  },
  {
    title: "Contato e endereço",
    description: "Informações utilizadas para comunicação e localização.",
    fields: ["telefone", "email", "endereco"],
  },
  {
    title: "Funcionamento e localização",
    description: "Horários e dados geográficos da unidade.",
    fields: ["horario_abertura", "horario_fechamento", "latitude", "longitude"],
  },
  {
    title: "Indicadores e infraestrutura",
    description: "Dados quantitativos utilizados nos painéis do SETEC Hub.",
    fields: [
      "total_alunos",
      "qtd_salas",
      "total_equipamentos_recebidos",
      "total_equipamentos_funcionando",
      "aps_instalados",
    ],
  },
]

function textoSeguro(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function numeroSeguro(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function normalizar(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function getInitials(name: unknown) {
  const clean = textoSeguro(name, "")

  if (!clean) return "UE"

  const words = clean.split(/\s+/).filter(Boolean)

  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

function calcularPercentual(funcionando: unknown, recebidos: unknown) {
  const ok = numeroSeguro(funcionando)
  const total = numeroSeguro(recebidos)

  if (total <= 0) return 0

  return Math.min(Math.round((ok / total) * 100), 100)
}

function formatarCampo(col: string) {
  return fieldLabels[col] || col.replaceAll("_", " ")
}

function montarPayload(form: EscolaRow) {
  const payload: EscolaRow = {}

  columns.forEach((col) => {
    const value = form[col]

    if (numericColumns.has(col)) {
      if (value === "" || value === null || value === undefined) {
        payload[col] = null
        return
      }

      const number = Number(value)
      payload[col] = Number.isFinite(number) ? number : null
      return
    }

    payload[col] =
      value === "" || value === undefined || value === null ? null : value
  })

  return payload
}

export default function GestaoEscolasGrid() {
  const supabase = useMemo(() => createClient(), [])

  const [escolas, setEscolas] = useState<EscolaRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EscolaRow>({})
  const [creating, setCreating] = useState(false)
  const [busca, setBusca] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("escolas")
        .select("*")
        .order("nome_escola")

      if (error) throw error

      setEscolas(data || [])
    } catch (error: any) {
      console.error("[Gestão de Escolas] Erro ao carregar:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível carregar a lista de escolas.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 5500)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  function iniciarEdicao(row: EscolaRow) {
    setEditingId(row.id)
    setForm({ ...row })
    setCreating(false)
    setMensagem(null)
  }

  function iniciarCriacao() {
    const empty: EscolaRow = {}

    columns.forEach((col) => {
      empty[col] = ""
    })

    setForm(empty)
    setCreating(true)
    setEditingId(null)
    setMensagem(null)
  }

  function cancelar() {
    setEditingId(null)
    setCreating(false)
    setForm({})
  }

  async function salvar() {
    if (saving) return

    const nomeEscola = textoSeguro(form.nome_escola, "")
    const cie = textoSeguro(form.cie, "")

    if (!nomeEscola) {
      setMensagem({
        tipo: "error",
        texto: "Informe o nome da escola antes de salvar.",
      })
      return
    }

    if (!cie) {
      setMensagem({
        tipo: "error",
        texto: "Informe o CIE da escola antes de salvar.",
      })
      return
    }

    setSaving(true)
    setMensagem(null)

    try {
      const payload = montarPayload(form)

      if (creating) {
        const { error } = await supabase.from("escolas").insert(payload)

        if (error) throw error

        setCreating(false)
        setMensagem({
          tipo: "success",
          texto: "Escola cadastrada com sucesso.",
        })
      } else {
        if (!editingId) {
          throw new Error("Nenhuma escola selecionada para edição.")
        }

        const { error } = await supabase
          .from("escolas")
          .update(payload)
          .eq("id", editingId)

        if (error) throw error

        setEditingId(null)
        setMensagem({
          tipo: "success",
          texto: "Dados da escola atualizados com sucesso.",
        })
      }

      setForm({})
      await carregar()
    } catch (error: any) {
      console.error("[Gestão de Escolas] Erro ao salvar:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível salvar os dados da escola.",
      })
    } finally {
      setSaving(false)
    }
  }

  const escolasFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return escolas

    return escolas.filter((e) => {
      const baseBusca = [
        e.nome_escola,
        e.cie,
        e.diretor,
        e.telefone,
        e.email,
        e.endereco,
        e.tipo_ensino,
        e.periodo,
      ]
        .map(normalizar)
        .join(" ")

      return baseBusca.includes(termo)
    })
  }, [escolas, busca])

  const indicadores = useMemo(() => {
    const totalEscolas = escolas.length

    const totalAlunos = escolas.reduce(
      (acc, escola) => acc + numeroSeguro(escola.total_alunos),
      0
    )

    const totalRecebidos = escolas.reduce(
      (acc, escola) => acc + numeroSeguro(escola.total_equipamentos_recebidos),
      0
    )

    const totalFuncionando = escolas.reduce(
      (acc, escola) => acc + numeroSeguro(escola.total_equipamentos_funcionando),
      0
    )

    const totalAps = escolas.reduce(
      (acc, escola) => acc + numeroSeguro(escola.aps_instalados),
      0
    )

    return {
      totalEscolas,
      totalAlunos,
      totalRecebidos,
      totalFuncionando,
      totalAps,
    }
  }, [escolas])

  return (
    <div className="mx-auto max-w-[1700px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_32%)]" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge color="blue">Gestão</Badge>
              <Badge color="cyan">Unidades Escolares</Badge>
              <Badge color="emerald">Base Institucional</Badge>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Gestão de <span className="text-blue-400">Escolas</span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Central de gestão dos dados das unidades escolares da URE Guarulhos
              Sul, mantendo informações essenciais sincronizadas com painéis,
              inventário, conectividade e consultas operacionais do SETEC Hub.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:min-w-[680px]">
            <MiniStat label="Escolas" value={indicadores.totalEscolas} tone="blue" />
            <MiniStat label="Alunos" value={indicadores.totalAlunos} tone="cyan" />
            <MiniStat label="Recebidos" value={indicadores.totalRecebidos} tone="purple" />
            <MiniStat label="Funcionando" value={indicadores.totalFuncionando} tone="emerald" />
            <MiniStat label="APs" value={indicadores.totalAps} tone="amber" />
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            mensagem.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : mensagem.tipo === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl">
              🔎
            </div>

            <div>
              <h2 className="text-lg font-black text-white">
                Consulta e manutenção
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Busque por nome, CIE, diretor, telefone, e-mail, endereço ou tipo
                de ensino.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto] xl:max-w-4xl">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                🔍
              </span>

              <input
                type="text"
                placeholder="Buscar por nome, CIE, diretor, telefone ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 pl-11 pr-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              />
            </div>

            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Limpar
              </button>
            )}

            <button
              type="button"
              onClick={iniciarCriacao}
              disabled={creating || editingId !== null || saving}
              className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Cadastrar escola
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="text-xs font-semibold text-slate-500">
            Exibindo{" "}
            <span className="font-black text-blue-300">
              {escolasFiltradas.length}
            </span>{" "}
            de{" "}
            <span className="font-black text-slate-300">{escolas.length}</span>{" "}
            escola(s).
          </p>

          {(creating || editingId) && (
            <p className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-300">
              Edição em andamento
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {creating && (
          <FormCard
            title="Nova escola"
            subtitle="Cadastro manual de unidade escolar"
            badge="Cadastro"
            form={form}
            setForm={setForm}
            onCancel={cancelar}
            onSave={salvar}
            saving={saving}
            saveLabel="Salvar escola"
          />
        )}

        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && escolasFiltradas.length === 0 && !creating && (
          <div className="col-span-full">
            <EmptyState busca={busca} />
          </div>
        )}

        {!loading &&
          escolasFiltradas.map((row) => {
            const isEditing = editingId === row.id

            return isEditing ? (
              <FormCard
                key={row.id}
                title={`Editando: ${textoSeguro(row.nome_escola, "Escola")}`}
                subtitle="Atualização dos dados da unidade escolar"
                badge="Modo edição"
                form={form}
                setForm={setForm}
                onCancel={cancelar}
                onSave={salvar}
                saving={saving}
                saveLabel="Salvar alterações"
              />
            ) : (
              <SchoolCard
                key={row.id}
                row={row}
                disabled={editingId !== null || creating || saving}
                onEdit={() => iniciarEdicao(row)}
              />
            )
          })}
      </section>
    </div>
  )
}

function SchoolCard({
  row,
  disabled,
  onEdit,
}: {
  row: EscolaRow
  disabled: boolean
  onEdit: () => void
}) {
  const recebidos = numeroSeguro(row.total_equipamentos_recebidos)
  const funcionando = numeroSeguro(row.total_equipamentos_funcionando)
  const percentual = calcularPercentual(funcionando, recebidos)

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 transition-all duration-300 hover:-translate-y-[1px] hover:border-blue-500/35 hover:shadow-blue-950/20 md:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-lg font-black text-blue-300">
              {getInitials(row.nome_escola)}
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge color="blue">CIE {textoSeguro(row.cie)}</Badge>
                {row.tipo_ensino && <Badge color="slate">{row.tipo_ensino}</Badge>}
                {row.periodo && <Badge color="cyan">{row.periodo}</Badge>}
              </div>

              <Link
                href={`/escolas/${row.id}`}
                className="line-clamp-2 text-xl font-black leading-tight text-white transition hover:text-blue-300"
              >
                {textoSeguro(row.nome_escola, "Sem nome")}
              </Link>

              <p className="mt-2 text-sm font-medium text-slate-500">
                {textoSeguro(row.endereco, "Endereço não informado")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link
              href={`/escolas/${row.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
            >
              Abrir
            </Link>

            <button
              type="button"
              onClick={onEdit}
              disabled={disabled}
              className="inline-flex items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:border-blue-500/40 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Editar
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800 pt-5 sm:grid-cols-3">
          <InfoBox label="Diretor(a)" value={row.diretor} />
          <InfoBox label="Telefone" value={row.telefone} />
          <InfoBox label="E-mail" value={row.email} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricBox label="Alunos" value={numeroSeguro(row.total_alunos)} />
          <MetricBox label="Salas" value={numeroSeguro(row.qtd_salas)} />
          <MetricBox label="Recebidos" value={recebidos} />
          <MetricBox label="APs" value={numeroSeguro(row.aps_instalados)} />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Status de equipamentos
              </p>

              <p className="mt-1 text-sm font-bold text-slate-300">
                <span className="text-emerald-300">{funcionando}</span>{" "}
                funcionando de{" "}
                <span className="text-blue-300">{recebidos}</span> recebidos
              </p>
            </div>

            <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300">
              {percentual}%
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#020617]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function FormCard({
  title,
  subtitle,
  badge,
  form,
  setForm,
  onCancel,
  onSave,
  saving,
  saveLabel,
}: {
  title: string
  subtitle: string
  badge: string
  form: EscolaRow
  setForm: (value: EscolaRow) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveLabel: string
}) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border-2 border-blue-500/40 bg-[#020617] p-5 shadow-2xl shadow-blue-950/20 md:p-6 xl:col-span-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_30%)]" />

      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge color="blue">{badge}</Badge>
            <h3 className="mt-3 text-2xl font-black text-white">{title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3 text-xs font-bold leading-relaxed text-yellow-200">
            Revise os dados antes de salvar. Essas informações alimentam outros
            painéis do SETEC Hub.
          </div>
        </div>

        <div className="space-y-6">
          {fieldGroups.map((group) => (
            <section key={group.title} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-4">
                <h4 className="text-sm font-black uppercase tracking-[0.16em] text-blue-300">
                  {group.title}
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((col) => (
                  <FieldInput
                    key={col}
                    col={col}
                    value={form[col] ?? ""}
                    onChange={(value) => setForm({ ...form, [col]: value })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {saving ? "Salvando..." : saveLabel}
          </button>
        </div>
      </div>
    </article>
  )
}

function FieldInput({
  col,
  value,
  onChange,
}: {
  col: string
  value: string | number
  onChange: (value: string | number) => void
}) {
  const isNumeric = numericColumns.has(col)

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {formatarCampo(col)}
      </span>

      <input
        type={isNumeric ? "number" : "text"}
        inputMode={isNumeric ? "decimal" : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(isNumeric ? e.target.value : e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-[#020617] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50"
      />
    </label>
  )
}

function InfoBox({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-300">
        {textoSeguro(value)}
      </p>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "blue" | "cyan" | "purple" | "emerald" | "amber"
}) {
  const colors = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white md:text-3xl">
        {value}
      </p>
      <div className={`mt-3 h-1 rounded-full ${colors[tone]}`} />
    </div>
  )
}

function Badge({
  children,
  color,
}: {
  children: ReactNode
  color: "blue" | "cyan" | "emerald" | "slate"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    slate: "border-slate-700 bg-slate-900 text-slate-400",
  }

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles[color]}`}
    >
      {children}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="h-[360px] animate-pulse rounded-[2rem] border border-slate-800 bg-slate-900/40" />
  )
}

function EmptyState({ busca }: { busca: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-800 bg-[#020617] p-8 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-slate-800 bg-slate-950 text-4xl">
        🔍
      </div>

      <h2 className="text-2xl font-black text-white">
        Nenhuma escola encontrada
      </h2>

      <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-500">
        Não encontramos resultados para{" "}
        <span className="font-bold text-slate-300">"{busca}"</span>. Verifique o
        nome, CIE ou limpe a busca para visualizar todas as unidades.
      </p>
    </div>
  )
}