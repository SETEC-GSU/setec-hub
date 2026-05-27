"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"

type Escola = {
  id: string
  nome_escola: string | null
  cie: string | null
}

type EscolaRelacionada = {
  nome_escola?: string | null
  cie?: string | null
  telefone?: string | null
  endereco?: string | null
  diretor?: string | null
  email?: string | null
}

type CredencialEscola = {
  id: string
  escola_id: string
  cie: string | null

  email_administrativo: string | null
  senha_administrativo: string | null

  email_pedagogico_windows: string | null
  senha_pedagogico_windows: string | null

  email_pedagogico_chromeOS: string | null
  senha_pedagogico_chromeOS: string | null

  observacao: string | null
  ativo: boolean
  updated_at: string | null
  created_at: string | null

  escolas?: EscolaRelacionada | EscolaRelacionada[] | null
}

type FormState = {
  id: string
  escola_id: string
  cie: string

  email_administrativo: string
  senha_administrativo: string

  email_pedagogico_windows: string
  senha_pedagogico_windows: string

  email_pedagogico_chromeOS: string
  senha_pedagogico_chromeOS: string

  observacao: string
  ativo: boolean
}

function getEscola(item: CredencialEscola) {
  if (Array.isArray(item.escolas)) {
    return item.escolas[0] || null
  }

  return item.escolas || null
}

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value || "").trim()
  return text || fallback
}

function normalizar(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function formatarData(value: string | null) {
  if (!value) return "Sem atualização"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Sem atualização"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function senhaResumo(value: string | null) {
  if (!value) return "Não cadastrada"
  return "•".repeat(10)
}

const emptyForm: FormState = {
  id: "",
  escola_id: "",
  cie: "",

  email_administrativo: "",
  senha_administrativo: "",

  email_pedagogico_windows: "",
  senha_pedagogico_windows: "",

  email_pedagogico_chromeOS: "",
  senha_pedagogico_chromeOS: "",

  observacao: "",
  ativo: true,
}

export default function GestaoCredenciaisEscolasPage() {
  const supabase = useMemo(() => createClient(), [])

  const [credenciais, setCredenciais] = useState<CredencialEscola[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("ativas")
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarDados() {
    setLoading(true)
    setErro(null)

    const [credenciaisResult, escolasResult] = await Promise.all([
      supabase
        .from("credenciais_escolas")
        .select(`
          id,
          escola_id,
          cie,
          email_administrativo,
          senha_administrativo,
          email_pedagogico_windows,
          senha_pedagogico_windows,
          "email_pedagogico_chromeOS",
          "senha_pedagogico_chromeOS",
          observacao,
          ativo,
          updated_at,
          created_at,
          escolas (
            nome_escola,
            cie,
            telefone,
            endereco,
            diretor,
            email
          )
        `),
      supabase
        .from("escolas")
        .select("id, nome_escola, cie")
        .order("nome_escola", { ascending: true }),
    ])

    if (credenciaisResult.error) {
      console.error("[Gestão Credenciais] Erro credenciais:", credenciaisResult.error)
      setErro("Não foi possível carregar as credenciais.")
      setCredenciais([])
    } else {
      const lista = ((credenciaisResult.data || []) as CredencialEscola[]).sort(
        (a, b) => {
          const escolaA = getEscola(a)?.nome_escola || ""
          const escolaB = getEscola(b)?.nome_escola || ""
          return escolaA.localeCompare(escolaB, "pt-BR")
        }
      )

      setCredenciais(lista)
    }

    if (escolasResult.error) {
      console.error("[Gestão Credenciais] Erro escolas:", escolasResult.error)
      setErro("Não foi possível carregar a lista de escolas.")
      setEscolas([])
    } else {
      setEscolas((escolasResult.data || []) as Escola[])
    }

    setLoading(false)
  }

  const credenciaisFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    return credenciais.filter((item) => {
      const escola = getEscola(item)

      const matchStatus =
        filtroStatus === "todas" ||
        (filtroStatus === "ativas" && item.ativo) ||
        (filtroStatus === "inativas" && !item.ativo)

      const baseBusca = [
        escola?.nome_escola,
        escola?.cie,
        item.cie,
        item.email_administrativo,
        item.email_pedagogico_windows,
        item.email_pedagogico_chromeOS,
        escola?.diretor,
      ]
        .map(normalizar)
        .join(" ")

      const matchBusca = termo ? baseBusca.includes(termo) : true

      return matchStatus && matchBusca
    })
  }, [busca, credenciais, filtroStatus])

  const totalAtivas = credenciais.filter((item) => item.ativo).length
  const totalInativas = credenciais.filter((item) => !item.ativo).length
  const totalSemAdministrativo = credenciais.filter(
    (item) => !item.email_administrativo && !item.senha_administrativo
  ).length

  function limparMensagens() {
    setErro(null)
    setSucesso(null)
  }

  function abrirNovo() {
    limparMensagens()
    setForm(emptyForm)
    setModalAberto(true)
  }

  function abrirEdicao(item: CredencialEscola) {
    limparMensagens()

    setForm({
      id: item.id,
      escola_id: item.escola_id,
      cie: item.cie || getEscola(item)?.cie || "",

      email_administrativo: item.email_administrativo || "",
      senha_administrativo: item.senha_administrativo || "",

      email_pedagogico_windows: item.email_pedagogico_windows || "",
      senha_pedagogico_windows: item.senha_pedagogico_windows || "",

      email_pedagogico_chromeOS: item.email_pedagogico_chromeOS || "",
      senha_pedagogico_chromeOS: item.senha_pedagogico_chromeOS || "",

      observacao: item.observacao || "",
      ativo: item.ativo,
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setForm(emptyForm)
    setSalvando(false)
  }

  function atualizarCampo<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function selecionarEscola(escolaId: string) {
    const escola = escolas.find((item) => item.id === escolaId)

    setForm((current) => ({
      ...current,
      escola_id: escolaId,
      cie: escola?.cie || "",
    }))
  }

  async function registrarLog(
    credencialId: string | null,
    acao: "criou" | "editou" | "ativou" | "desativou",
    escolaNome: string | null,
    cie: string | null
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) return

      await supabase.from("credenciais_escolas_logs").insert({
        credencial_id: credencialId,
        usuario_id: user.id,
        acao,
        escola_nome: escolaNome,
        cie,
      })
    } catch (error) {
      console.error("[Gestão Credenciais] Erro ao registrar log:", error)
    }
  }

  async function salvarCredencial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    limparMensagens()

    if (!form.escola_id) {
      setErro("Selecione uma escola para salvar a credencial.")
      return
    }

    setSalvando(true)

    const escolaSelecionada = escolas.find((item) => item.id === form.escola_id)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      escola_id: form.escola_id,
      cie: form.cie || escolaSelecionada?.cie || null,

      email_administrativo: form.email_administrativo.trim() || null,
      senha_administrativo: form.senha_administrativo.trim() || null,

      email_pedagogico_windows: form.email_pedagogico_windows.trim() || null,
      senha_pedagogico_windows: form.senha_pedagogico_windows.trim() || null,

      "email_pedagogico_chromeOS": form.email_pedagogico_chromeOS.trim() || null,
      "senha_pedagogico_chromeOS": form.senha_pedagogico_chromeOS.trim() || null,

      observacao: form.observacao.trim() || null,
      ativo: form.ativo,
      atualizado_por: user?.id || null,
      updated_at: new Date().toISOString(),
    }

    if (form.id) {
      const { error } = await supabase
        .from("credenciais_escolas")
        .update(payload)
        .eq("id", form.id)

      if (error) {
        console.error("[Gestão Credenciais] Erro ao editar:", error)
        setErro("Não foi possível atualizar a credencial.")
        setSalvando(false)
        return
      }

      await registrarLog(
        form.id,
        "editou",
        escolaSelecionada?.nome_escola || null,
        form.cie || escolaSelecionada?.cie || null
      )

      setSucesso("Credencial atualizada com sucesso.")
    } else {
      const jaExiste = credenciais.some((item) => item.escola_id === form.escola_id)

      if (jaExiste) {
        setErro("Esta escola já possui uma credencial cadastrada. Edite o registro existente.")
        setSalvando(false)
        return
      }

      const { data, error } = await supabase
        .from("credenciais_escolas")
        .insert({
          ...payload,
          criado_por: user?.id || null,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (error) {
        console.error("[Gestão Credenciais] Erro ao criar:", error)
        setErro("Não foi possível criar a credencial.")
        setSalvando(false)
        return
      }

      await registrarLog(
        data?.id || null,
        "criou",
        escolaSelecionada?.nome_escola || null,
        form.cie || escolaSelecionada?.cie || null
      )

      setSucesso("Credencial criada com sucesso.")
    }

    await carregarDados()
    fecharModal()
  }

  async function alternarAtivo(item: CredencialEscola) {
    limparMensagens()

    const novoStatus = !item.ativo
    const escola = getEscola(item)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("credenciais_escolas")
      .update({
        ativo: novoStatus,
        atualizado_por: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)

    if (error) {
      console.error("[Gestão Credenciais] Erro ao alterar status:", error)
      setErro("Não foi possível alterar o status da credencial.")
      return
    }

    await registrarLog(
      item.id,
      novoStatus ? "ativou" : "desativou",
      escola?.nome_escola || null,
      escola?.cie || item.cie || null
    )

    setSucesso(novoStatus ? "Credencial ativada com sucesso." : "Credencial desativada com sucesso.")
    await carregarDados()
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div>
            <p className="text-lg font-bold text-white">Carregando gestão</p>
            <p className="text-sm text-slate-500">
              Aguarde enquanto consultamos as credenciais.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#020617] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_32%)]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                Gestão SETEC
              </span>
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                Credenciais escolares
              </span>
              <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-300">
                Restrito
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Gestão de <span className="text-blue-400">Credenciais</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
              Cadastro, atualização e controle das credenciais utilizadas pelas equipes técnicas
              nas configurações dos equipamentos das unidades escolares.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-700"
          >
            Nova credencial
          </button>
        </div>
      </section>

      {(erro || sucesso) && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            erro
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {erro || sucesso}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard title="Total" value={credenciais.length} subtitle="Credenciais cadastradas" color="blue" />
        <KpiCard title="Ativas" value={totalAtivas} subtitle="Disponíveis para consulta" color="emerald" />
        <KpiCard title="Inativas" value={totalInativas} subtitle="Ocultas dos Fields" color="red" />
        <KpiCard title="Sem administrativo" value={totalSemAdministrativo} subtitle="Pendência de conta" color="amber" />
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
              🔎
            </span>

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por escola, CIE, e-mail ou diretor..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 pl-11 pr-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="ativas">Somente ativas</option>
            <option value="inativas">Somente inativas</option>
            <option value="todas">Todas</option>
          </select>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300">
            Exibindo:{" "}
            <span className="text-blue-300">{credenciaisFiltradas.length}</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <th className="px-5 py-4 font-black">Escola</th>
                <th className="px-5 py-4 font-black">Administrativo</th>
                <th className="px-5 py-4 font-black">Windows</th>
                <th className="px-5 py-4 font-black">ChromeOS</th>
                <th className="px-5 py-4 font-black">Status</th>
                <th className="px-5 py-4 font-black">Atualização</th>
                <th className="px-5 py-4 text-right font-black">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {credenciaisFiltradas.map((item) => {
                const escola = getEscola(item)
                const escolaNome = textoSeguro(escola?.nome_escola, "Escola não informada")
                const cie = textoSeguro(escola?.cie || item.cie, "CIE não informado")

                return (
                  <tr key={item.id} className="transition hover:bg-slate-900/60">
                    <td className="px-5 py-4">
                      <p className="font-black text-white">{escolaNome}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        CIE {cie}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <CredentialMini email={item.email_administrativo} senha={item.senha_administrativo} />
                    </td>

                    <td className="px-5 py-4">
                      <CredentialMini email={item.email_pedagogico_windows} senha={item.senha_pedagogico_windows} />
                    </td>

                    <td className="px-5 py-4">
                      <CredentialMini email={item.email_pedagogico_chromeOS} senha={item.senha_pedagogico_chromeOS} />
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          item.ativo
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/25 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {item.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                      {formatarData(item.updated_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(item)}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:bg-blue-500/20"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => alternarAtivo(item)}
                          className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition ${
                            item.ativo
                              ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          {item.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {credenciaisFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="text-lg font-black text-white">
                      Nenhuma credencial encontrada
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Ajuste os filtros ou cadastre uma nova credencial.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-700 bg-[#0f172a] shadow-2xl">
            <div className="border-b border-slate-800 bg-[#020617] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                    {form.id ? "Editar credencial" : "Nova credencial"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {form.id ? "Atualizar credenciais da escola" : "Cadastrar credenciais"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={fecharModal}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-slate-400 transition hover:bg-red-500/20 hover:text-red-300"
                >
                  X
                </button>
              </div>
            </div>

            <form onSubmit={salvarCredencial} className="max-h-[calc(92vh-96px)] overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Escola
                  </label>

                  <select
                    value={form.escola_id}
                    onChange={(event) => selecionarEscola(event.target.value)}
                    disabled={Boolean(form.id)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Selecione uma escola</option>
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome_escola} - CIE {escola.cie}
                      </option>
                    ))}
                  </select>

                  {form.id && (
                    <p className="mt-2 text-xs text-slate-500">
                      Para preservar o vínculo com a tabela de escolas, a escola não pode ser alterada durante a edição.
                    </p>
                  )}
                </div>

                <InputField label="CIE" value={form.cie} onChange={(value) => atualizarCampo("cie", value)} />

                <div className="flex items-end">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(event) => atualizarCampo("ativo", event.target.checked)}
                      className="h-4 w-4"
                    />
                    Credencial ativa
                  </label>
                </div>

                <SectionTitle title="Conta Administrativa" />
                <InputField label="E-mail administrativo" value={form.email_administrativo} onChange={(value) => atualizarCampo("email_administrativo", value)} />
                <InputField label="Senha administrativo" value={form.senha_administrativo} onChange={(value) => atualizarCampo("senha_administrativo", value)} />

                <SectionTitle title="Pedagógico Windows" />
                <InputField label="E-mail pedagógico Windows" value={form.email_pedagogico_windows} onChange={(value) => atualizarCampo("email_pedagogico_windows", value)} />
                <InputField label="Senha pedagógico Windows" value={form.senha_pedagogico_windows} onChange={(value) => atualizarCampo("senha_pedagogico_windows", value)} />

                <SectionTitle title="Pedagógico ChromeOS" />
                <InputField label="E-mail pedagógico ChromeOS" value={form.email_pedagogico_chromeOS} onChange={(value) => atualizarCampo("email_pedagogico_chromeOS", value)} />
                <InputField label="Senha pedagógico ChromeOS" value={form.senha_pedagogico_chromeOS} onChange={(value) => atualizarCampo("senha_pedagogico_chromeOS", value)} />

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Observação
                  </label>

                  <textarea
                    value={form.observacao}
                    onChange={(event) => atualizarCampo("observacao", event.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/50"
                    placeholder="Observações internas sobre a credencial..."
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {salvando ? "Salvando..." : "Salvar credencial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
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
  value: number
  subtitle: string
  color: "blue" | "emerald" | "red" | "amber"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  }

  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-xl ${styles[color]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
        {title}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{subtitle}</p>
    </div>
  )
}

function CredentialMini({
  email,
  senha,
}: {
  email: string | null
  senha: string | null
}) {
  return (
    <div className="space-y-1">
      <p className="max-w-[220px] truncate font-mono text-xs font-bold text-slate-300">
        {textoSeguro(email, "Sem e-mail")}
      </p>
      <p className="font-mono text-xs font-bold text-slate-500">
        {senhaResumo(senha)}
      </p>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="lg:col-span-2">
      <div className="mt-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
          {title}
        </p>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/50"
      />
    </div>
  )
}