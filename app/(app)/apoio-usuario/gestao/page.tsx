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

type PerfilUsuario = {
  id: string
  nome: string | null
  email: string | null
  role: string
}

type Tutorial = {
  id: string
  titulo: string
  descricao: string | null
  categoria: string
  arquivo_url: string | null
  autor: string | null
  ordem: number | null
  created_at: string | null
  subcategoria: string | null
  visualizacoes: number | null
  imagem_url: string | null
  created_by_auth: string | null
  updated_at: string | null
  updated_by_auth: string | null
  updated_by_nome: string | null
}

type FormularioTutorial = {
  titulo: string
  descricao: string
  categoria: string
  subcategoria: string
  arquivoUrl: string
  imagemUrl: string
  ordem: number
}

type Mensagem = {
  tipo: "sucesso" | "erro"
  texto: string
} | null

const CATEGORIAS = [
  "GERAL",
  "CONECTIVIDADE",
  "EQUIPAMENTOS",
  "SISTEMAS",
  "ESPELHAMENTO",
] as const

const FORMULARIO_INICIAL: FormularioTutorial = {
  titulo: "",
  descricao: "",
  categoria: "GERAL",
  subcategoria: "",
  arquivoUrl: "",
  imagemUrl: "",
  ordem: 0,
}

export default function GestaoBaseConhecimentoPage() {
  const supabase = useMemo(() => createClient(), [])

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [acessoVerificado, setAcessoVerificado] = useState(false)
  const [autorizado, setAutorizado] = useState(false)

  const [tutoriais, setTutoriais] = useState<Tutorial[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formulario, setFormulario] =
    useState<FormularioTutorial>(FORMULARIO_INICIAL)

  const [busca, setBusca] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  const carregarTutoriais = useCallback(async () => {
    setCarregando(true)

    const { data, error } = await supabase
      .from("base_conhecimento")
      .select(`
        id,
        titulo,
        descricao,
        categoria,
        arquivo_url,
        autor,
        ordem,
        created_at,
        subcategoria,
        visualizacoes,
        imagem_url,
        created_by_auth,
        updated_at,
        updated_by_auth,
        updated_by_nome
      `)
      .order("categoria", { ascending: true })
      .order("ordem", { ascending: true })
      .order("titulo", { ascending: true })

    if (error) {
      console.error("Erro ao carregar tutoriais:", error)
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível carregar a base de conhecimento.",
      })
      setTutoriais([])
    } else {
      setTutoriais((data || []) as Tutorial[])
    }

    setCarregando(false)
  }, [supabase])

  const verificarAcesso = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setAcessoVerificado(true)
      setAutorizado(false)
      setCarregando(false)
      return
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from("usuarios")
      .select("id, nome, email, role")
      .eq("id", user.id)
      .maybeSingle()

    if (perfilError || !perfilData) {
      console.error("Erro ao carregar perfil:", perfilError)
      setAcessoVerificado(true)
      setAutorizado(false)
      setCarregando(false)
      return
    }

    const perfilAtual = perfilData as PerfilUsuario
    const roleNormalizada = String(perfilAtual.role || "").toLowerCase()
    const possuiAcesso =
      roleNormalizada === "admin" || roleNormalizada === "seintec"

    setPerfil(perfilAtual)
    setAutorizado(possuiAcesso)
    setAcessoVerificado(true)

    if (possuiAcesso) {
      await carregarTutoriais()
    } else {
      setCarregando(false)
    }
  }, [carregarTutoriais, supabase])

  useEffect(() => {
    verificarAcesso()
  }, [verificarAcesso])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  const tutoriaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return tutoriais.filter((tutorial) => {
      const correspondeBusca =
        !termo ||
        tutorial.titulo.toLowerCase().includes(termo) ||
        String(tutorial.descricao || "")
          .toLowerCase()
          .includes(termo) ||
        String(tutorial.subcategoria || "")
          .toLowerCase()
          .includes(termo) ||
        String(tutorial.autor || "")
          .toLowerCase()
          .includes(termo)

      const correspondeCategoria =
        !filtroCategoria ||
        tutorial.categoria === filtroCategoria

      return correspondeBusca && correspondeCategoria
    })
  }, [busca, filtroCategoria, tutoriais])

  const totalAcessos = useMemo(
    () =>
      tutoriais.reduce(
        (total, tutorial) => total + (tutorial.visualizacoes || 0),
        0
      ),
    [tutoriais]
  )

  const totalComArquivo = useMemo(
    () => tutoriais.filter((tutorial) => tutorial.arquivo_url).length,
    [tutoriais]
  )

  const tutorialEditando = useMemo(
    () =>
      editandoId
        ? tutoriais.find((tutorial) => tutorial.id === editandoId) || null
        : null,
    [editandoId, tutoriais]
  )

  function atualizarCampo<K extends keyof FormularioTutorial>(
    campo: K,
    valor: FormularioTutorial[K]
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }))
  }

  function iniciarNovoCadastro() {
    setEditandoId(null)
    setFormulario(FORMULARIO_INICIAL)
    setMensagem(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function iniciarEdicao(tutorial: Tutorial) {
    setEditandoId(tutorial.id)
    setFormulario({
      titulo: tutorial.titulo || "",
      descricao: tutorial.descricao || "",
      categoria: tutorial.categoria || "GERAL",
      subcategoria: tutorial.subcategoria || "",
      arquivoUrl: tutorial.arquivo_url || "",
      imagemUrl: tutorial.imagem_url || "",
      ordem: Number(tutorial.ordem || 0),
    })
    setMensagem(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setFormulario(FORMULARIO_INICIAL)
  }

  async function salvarTutorial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (salvando) return

    if (!formulario.titulo.trim()) {
      setMensagem({
        tipo: "erro",
        texto: "Informe o título do tutorial.",
      })
      return
    }

    setSalvando(true)
    setMensagem(null)

    const { error } = await supabase.rpc("admin_salvar_tutorial", {
      p_titulo: formulario.titulo.trim(),
      p_categoria: formulario.categoria,
      p_id: editandoId,
      p_descricao: formulario.descricao.trim() || null,
      p_arquivo_url: formulario.arquivoUrl.trim() || null,
      p_subcategoria: formulario.subcategoria.trim() || null,
      p_imagem_url: formulario.imagemUrl.trim() || null,
      p_ordem: Math.max(0, Number(formulario.ordem || 0)),
    })

    if (error) {
      console.error("Erro ao salvar tutorial:", error)
      setMensagem({
        tipo: "erro",
        texto:
          error.message ||
          "Não foi possível salvar o tutorial.",
      })
      setSalvando(false)
      return
    }

    setMensagem({
      tipo: "sucesso",
      texto: editandoId
        ? "Tutorial atualizado com rastreabilidade registrada."
        : "Tutorial cadastrado com rastreabilidade registrada.",
    })

    setEditandoId(null)
    setFormulario(FORMULARIO_INICIAL)
    await carregarTutoriais()
    setSalvando(false)
  }

  async function excluirTutorial(tutorial: Tutorial) {
    const confirmado = window.confirm(
      `Excluir definitivamente o tutorial “${tutorial.titulo}”?\n\nA exclusão ficará registrada na auditoria.`
    )

    if (!confirmado || excluindoId) return

    setExcluindoId(tutorial.id)
    setMensagem(null)

    const { data, error } = await supabase.rpc(
      "admin_excluir_tutorial",
      {
        p_id: tutorial.id,
      }
    )

    if (error || data !== true) {
      console.error("Erro ao excluir tutorial:", error)
      setMensagem({
        tipo: "erro",
        texto:
          error?.message ||
          "Não foi possível excluir o tutorial.",
      })
      setExcluindoId(null)
      return
    }

    if (editandoId === tutorial.id) {
      cancelarEdicao()
    }

    setMensagem({
      tipo: "sucesso",
      texto: "Tutorial excluído e ação registrada na auditoria.",
    })

    await carregarTutoriais()
    setExcluindoId(null)
  }

  if (!acessoVerificado) {
    return <EstadoCarregamento texto="Verificando suas permissões" />
  }

  if (!autorizado) {
    return (
      <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center justify-center px-4">
        <section className="w-full rounded-[2rem] border border-red-500/20 bg-[#020617] p-8 text-center shadow-2xl shadow-slate-950/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-300">
            <LockIcon className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-black text-white">
            Acesso restrito
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
            A administração da Base de Conhecimento é exclusiva para os perfis
            ADMIN e SEINTEC.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7 pb-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/25 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.08),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Administração
              </span>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Base de conhecimento
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 sm:flex">
                <BookIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                  Gestão de Tutoriais
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Cadastre, organize e atualize os materiais da Base de
                  Conhecimento com identificação automática do responsável e
                  histórico permanente das alterações.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/65 px-5 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
              Administrador atual
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {perfil?.nome || perfil?.email || "Usuário"}
            </p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">
              {perfil?.role}
            </p>
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            mensagem.tipo === "sucesso"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          <div className="mt-0.5">
            {mensagem.tipo === "sucesso" ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <AlertIcon className="h-5 w-5" />
            )}
          </div>
          <p className="text-sm font-semibold">{mensagem.texto}</p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Tutoriais"
          value={tutoriais.length}
          icon={<BookIcon className="h-5 w-5" />}
          tone="blue"
        />
        <MetricCard
          label="Com arquivo"
          value={totalComArquivo}
          icon={<LinkIcon className="h-5 w-5" />}
          tone="cyan"
        />
        <MetricCard
          label="Visualizações"
          value={totalAcessos}
          icon={<EyeIcon className="h-5 w-5" />}
          tone="violet"
        />
        <MetricCard
          label="Categorias"
          value={CATEGORIAS.length}
          icon={<GridIcon className="h-5 w-5" />}
          tone="amber"
        />
      </section>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.7fr)]">
        <section className="order-2 overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-xl shadow-slate-950/20 xl:order-1">
          <div className="border-b border-slate-800 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                  Materiais cadastrados
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Base atual
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Consulte, edite ou exclua os tutoriais cadastrados.
                </p>
              </div>

              <button
                type="button"
                onClick={iniciarNovoCadastro}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-xs font-black uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-500/20"
              >
                <PlusIcon className="h-4 w-4" />
                Novo tutorial
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar título, subcategoria ou autor..."
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
              </label>

              <select
                value={filtroCategoria}
                onChange={(event) =>
                  setFiltroCategoria(event.target.value)
                }
                className="h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-cyan-500"
              >
                <option value="">Todas as categorias</option>
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {carregando ? (
            <EstadoCarregamento texto="Carregando tutoriais" compacto />
          ) : tutoriaisFiltrados.length === 0 ? (
            <EstadoVazio />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 sm:p-5">
              {tutoriaisFiltrados.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  selecionado={editandoId === tutorial.id}
                  excluindo={excluindoId === tutorial.id}
                  onEditar={() => iniciarEdicao(tutorial)}
                  onExcluir={() => excluirTutorial(tutorial)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="order-1 xl:order-2">
          <form
            onSubmit={salvarTutorial}
            className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] shadow-xl shadow-slate-950/20 xl:sticky xl:top-6"
          >
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
                {editandoId ? "Edição de material" : "Novo material"}
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {editandoId
                  ? "Atualizar tutorial"
                  : "Cadastrar tutorial"}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-600">
                O autor será preenchido automaticamente como{" "}
                <strong className="text-slate-400">
                  {editandoId
                    ? tutorialEditando?.autor || "autor original"
                    : perfil?.nome || "usuário atual"}
                </strong>
                .
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <Campo label="Título" obrigatorio>
                <input
                  value={formulario.titulo}
                  onChange={(event) =>
                    atualizarCampo("titulo", event.target.value)
                  }
                  placeholder="Nome do tutorial ou orientação"
                  required
                  className={inputClassName}
                />
              </Campo>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Categoria" obrigatorio>
                  <select
                    value={formulario.categoria}
                    onChange={(event) =>
                      atualizarCampo("categoria", event.target.value)
                    }
                    required
                    className={inputClassName}
                  >
                    {CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Ordem">
                  <input
                    type="number"
                    min="0"
                    value={formulario.ordem}
                    onChange={(event) =>
                      atualizarCampo(
                        "ordem",
                        Math.max(0, Number(event.target.value))
                      )
                    }
                    className={inputClassName}
                  />
                </Campo>
              </div>

              <Campo label="Subcategoria">
                <input
                  value={formulario.subcategoria}
                  onChange={(event) =>
                    atualizarCampo(
                      "subcategoria",
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Garantias, Chromebooks, SED..."
                  className={inputClassName}
                />
              </Campo>

              <Campo label="Descrição">
                <textarea
                  value={formulario.descricao}
                  onChange={(event) =>
                    atualizarCampo("descricao", event.target.value)
                  }
                  placeholder="Resumo do conteúdo e finalidade do material"
                  rows={4}
                  className={`${inputClassName} min-h-[112px] resize-y py-3`}
                />
              </Campo>

              <Campo label="Link do arquivo">
                <input
                  type="url"
                  value={formulario.arquivoUrl}
                  onChange={(event) =>
                    atualizarCampo("arquivoUrl", event.target.value)
                  }
                  placeholder="https://..."
                  className={inputClassName}
                />

                {formulario.arquivoUrl && (
                  <a
                    href={formulario.arquivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                    Testar link do material
                  </a>
                )}
              </Campo>

              <Campo label="Link da imagem">
                <input
                  type="url"
                  value={formulario.imagemUrl}
                  onChange={(event) =>
                    atualizarCampo("imagemUrl", event.target.value)
                  }
                  placeholder="https://..."
                  className={inputClassName}
                />
              </Campo>

              {formulario.imagemUrl && (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white p-3">
                  <img
                    src={formulario.imagemUrl}
                    alt="Prévia da imagem do tutorial"
                    className="mx-auto h-32 w-full object-contain"
                  />
                </div>
              )}

              {editandoId && tutorialEditando && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                    Rastreabilidade
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <Rastro
                      label="Criado por"
                      value={tutorialEditando.autor || "Não informado"}
                    />
                    <Rastro
                      label="Criado em"
                      value={formatarDataHora(
                        tutorialEditando.created_at
                      )}
                    />
                    <Rastro
                      label="Última alteração"
                      value={
                        tutorialEditando.updated_by_nome ||
                        tutorialEditando.autor ||
                        "Não informado"
                      }
                    />
                    <Rastro
                      label="Atualizado em"
                      value={formatarDataHora(
                        tutorialEditando.updated_at
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 p-5 sm:flex-row sm:p-6">
              {editandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-gradient-to-r from-cyan-600 to-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-cyan-950/20 transition hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <SaveIcon className="h-5 w-5" />
                )}

                {salvando
                  ? "Salvando..."
                  : editandoId
                    ? "Salvar alterações"
                    : "Cadastrar tutorial"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

const inputClassName =
  "h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"

function Campo({
  label,
  obrigatorio = false,
  children,
}: {
  label: string
  obrigatorio?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
        {obrigatorio && (
          <span className="ml-1 text-cyan-400">*</span>
        )}
      </span>
      {children}
    </label>
  )
}

function TutorialCard({
  tutorial,
  selecionado,
  excluindo,
  onEditar,
  onExcluir,
}: {
  tutorial: Tutorial
  selecionado: boolean
  excluindo: boolean
  onEditar: () => void
  onExcluir: () => void
}) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-slate-950/60 transition ${
        selecionado
          ? "border-cyan-500/50 shadow-[0_0_0_1px_rgba(6,182,212,0.15)]"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      {tutorial.imagem_url && (
        <div className="flex h-32 items-center justify-center border-b border-slate-800 bg-white p-4">
          <img
            src={tutorial.imagem_url}
            alt={tutorial.titulo}
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-blue-300">
              {tutorial.categoria}
            </span>

            <h3 className="mt-3 line-clamp-2 text-base font-black leading-snug text-white">
              {tutorial.titulo}
            </h3>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {tutorial.subcategoria || "Geral"}
            </p>
          </div>

          <span className="rounded-lg border border-slate-800 bg-[#020617] px-2 py-1 text-[9px] font-black text-slate-500">
            #{tutorial.ordem || 0}
          </span>
        </div>

        {tutorial.descricao && (
          <p className="mt-3 line-clamp-3 text-xs font-medium leading-relaxed text-slate-500">
            {tutorial.descricao}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniInfo
            label="Acessos"
            value={String(tutorial.visualizacoes || 0)}
          />
          <MiniInfo
            label="Autor"
            value={tutorial.autor || "Não informado"}
          />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          {tutorial.arquivo_url && (
            <a
              href={tutorial.arquivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-cyan-500/30 hover:text-cyan-300"
              title="Abrir material"
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          )}

          <button
            type="button"
            onClick={onEditar}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 text-xs font-black text-blue-300 transition hover:bg-blue-500/20"
          >
            <EditIcon className="h-4 w-4" />
            Editar
          </button>

          <button
            type="button"
            onClick={onExcluir}
            disabled={excluindo}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            title="Excluir tutorial"
          >
            {excluindo ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-200/30 border-t-red-200" />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: ReactNode
  tone: "blue" | "cyan" | "violet" | "amber"
}) {
  const styles = {
    blue: "border-blue-500/20 bg-blue-500/[0.05] text-blue-300",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.05] text-cyan-300",
    violet:
      "border-violet-500/20 bg-violet-500/[0.05] text-violet-300",
    amber:
      "border-amber-500/20 bg-amber-500/[0.05] text-amber-300",
  }

  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 ${styles[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.17em] opacity-70">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-current/5">
          {icon}
        </div>
      </div>
    </article>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  )
}

function Rastro({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-300">{value}</p>
    </div>
  )
}

function EstadoCarregamento({
  texto,
  compacto = false,
}: {
  texto: string
  compacto?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-center ${
        compacto ? "min-h-[320px]" : "min-h-[65vh]"
      }`}
    >
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
          {texto}
        </p>
      </div>
    </div>
  )
}

function EstadoVazio() {
  return (
    <div className="m-5 flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
      <div>
        <p className="text-sm font-black text-slate-400">
          Nenhum tutorial encontrado
        </p>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Ajuste os filtros ou cadastre um novo material.
        </p>
      </div>
    </div>
  )
}

function formatarDataHora(dataIso: string | null) {
  if (!dataIso) return "Não informado"

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return "Não informado"

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function SvgBase({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.9}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3h4.5v16.5h-4.5A2.25 2.25 0 0 0 4.5 21.75V5.25Zm15 0A2.25 2.25 0 0 0 17.25 3h-4.5v16.5h4.5a2.25 2.25 0 0 1 2.25 2.25V5.25Z" />
    </SvgBase>
  )
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V7.875a4.5 4.5 0 0 1 9 0V10.5m-10.5 0h12v9h-12v-9Z" />
    </SvgBase>
  )
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z" />
    </SvgBase>
  )
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </SvgBase>
  )
}

function SaveIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75h12l3 3v13.5h-15V3.75Zm3 0v5.25h7.5V3.75M8.25 15h7.5" />
    </SvgBase>
  )
}

function EditIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 4.5 3.75 3.75M5.25 18.75l1.125-4.5L16.5 4.125a1.59 1.59 0 0 1 2.25 0l1.125 1.125a1.59 1.59 0 0 1 0 2.25L9.75 17.625l-4.5 1.125Z" />
    </SvgBase>
  )
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-10.5 0V5.25h6V7.5m-8.25 0 .75 12h9l.75-12M10.5 11.25v4.5m3-4.5v4.5" />
    </SvgBase>
  )
}

function ExternalLinkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M10.5 6H6A2.25 2.25 0 0 0 3.75 8.25V18A2.25 2.25 0 0 0 6 20.25h9.75A2.25 2.25 0 0 0 18 18v-4.5" />
    </SvgBase>
  )
}

function LinkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 13.5a4.5 4.5 0 0 0 6.364 0l2.121-2.121a4.5 4.5 0 0 0-6.364-6.364L11.25 6.386m2.25 4.114a4.5 4.5 0 0 0-6.364 0l-2.121 2.121a4.5 4.5 0 0 0 6.364 6.364l1.371-1.371" />
    </SvgBase>
  )
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6S2.25 12 2.25 12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </SvgBase>
  )
}

function GridIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h6v6h-6v-6Zm9 0h6v6h-6v-6Zm-9 9h6v6h-6v-6Zm9 0h6v6h-6v-6Z" />
    </SvgBase>
  )
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 4.5 4.5 10.5-10.5" />
    </SvgBase>
  )
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v4.5m0 3h.008v.008H12v-.008ZM10.05 3.9 2.4 17.25A1.5 1.5 0 0 0 3.7 19.5h16.6a1.5 1.5 0 0 0 1.3-2.25L13.95 3.9a2.25 2.25 0 0 0-3.9 0Z" />
    </SvgBase>
  )
}