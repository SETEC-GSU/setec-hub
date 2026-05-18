"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import {
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  updateEmail,
} from "./actions"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const roles = [
  { value: "analista", label: "Analista" },
  { value: "chefia_ure", label: "Chefia URE" },
  { value: "dirigente", label: "Dirigente" },
  { value: "seintec", label: "SEINTEC" },
  { value: "gestao_escolas", label: "Gestão Escolas" },
  { value: "admin", label: "Admin" },
]

const setores = [
  "URE GUARULHOS SUL",
  "AGOSTINHO CANO",
  "ALAYDE MARIA VICENTE PROFA",
  "ALBERTO BACAN PROF - PEI",
  "ALBERTO MENDES JR CAP PM - PEI",
  "ALEXANDRE LOPES OLIVEIRA - PEI",
  "ALICE CHUERY PROFA - PEI",
  "ANNA LAMBERGA ZEGLIO",
  "ANTONIO DE RE VEREADOR",
  "ANTONIO PRATICI PREFEITO",
  "ANTONIO VIANA DE SOUZA PROF",
  "ARY GOMES CEL - PEI",
  "AUGUST JOHANNES FERDINANDUS STAUDER, PADRE - PEI",
  "BARTHOLOMEU DE CARLOS - PEI",
  "BRUNO RICCO PADRE - PEI",
  "CACILDA CACAPAVA DE OLIVEIRA PROFA",
  "CAPISTRANO DE ABREU",
  "CARLOS MACHADO BITENCOURT MAL - PEI",
  "CID AUGUSTO GUELLI PROF",
  "CIDADE SOIMCO II - PEI",
  "CLARICE LISPECTOR",
  "CONJUNTO HAB. BAIRRO DOS PIMENTAS II - PEI",
  "CONSELHEIRO CRISPINIANO - PEI",
  "EMILIA ANNA ANTONIO PROFA",
  "ENNIO CHIESA PROF - PEI",
  "ERICO VERISSIMO - PEI",
  "FABIO FANUCCHI PROF - PEI",
  "FRANCISCA BATISTA TRINDADE PROFA",
  "FREDERICO DE BARROS BROTERO PROF",
  "GUILHERMINO RODRIGUES DE LIMA - PEI",
  "HOMERO RUBENS DE SA PROF - PEI",
  "HUGO DE AGUIAR",
  "INOCOOP II - PEI",
  "IZABEL FERREIRA DOS SANTOS PROFA - PEI",
  "JAIR MIRANDA DR",
  "JARDIM ARUJÁ - PEI",
  "JD MARIA DIRCE III",
  "JD NOVA CUMBICA II - PEI",
  "JOAO ALVARES DE SIQUEIRA BUENO",
  "JOAO CAVALHEIRO SALEM PROF",
  "JOAO CRISPINIANO SOARES",
  "JOAO DE ALMEIDA BARBOSA",
  "JOAO NUNES PASTOR",
  "JOAO RIBEIRO DE BARROS COMANDANTE",
  "JOCILA PEREIRA GUIMARAES PROFA - PEI",
  "JOSE ALVES DE CERQUEIRA CESAR - PEI",
  "JOSE DA COSTA BOUCINHAS PROF - PEI",
  "JOSE ROBERTO FRIEBOLIN PROF - PEI",
  "JOSE SCARAMELLI PROF - PEI",
  "LAR IRMA CELESTE",
  "LAURA DA PURIFICACAO C.MENDES PROFA - PEI",
  "LEVI VIEIRA DA MAIA, PROF - PEI",
  "LICINIO CARPINELLI PROF",
  "LINDAMIL BARBOSA DE OLIVEIRA PROFA",
  "LOUIS BRAILLE - PEI",
  "MARIA APARECIDA FELIX PORTO PROFA",
  "MARIA APARECIDA RODRIGUES PROFA",
  "MARIA HILDA ORNELAS DE OLIVEIRA PROFA - PEI",
  "MARIA LEDA FERNANDES BRIGO PROFA",
  "MARINHA FERR. DO NASCIMENTO PROFA",
  "MARIO NAKATA PROF",
  "MAURICIO GOULART DEPUTADO - PEI",
  "ORLANDO MINELLA - PEI",
  "OSWALDO SAMPAIO ALVES - PEI",
  "PARQUE JUREMA III",
  "PARQUE JUREMA IV - PEI",
  "PASCOAL MAIMONI FILHO PROF - PEI",
  "PAULO NOGUEIRA PROF - PEI",
  "PAULO ROLIM LOUREIRO DOM - PEI",
  "PEDRO MORCELI",
  "PIMENTAS VII - PEI",
  "RAFAEL RODRIGUES FILHO,PREF",
  "REPUBLICA DA VENEZUELA",
  "REPÚBLICA DA VENEZUELA II - PEI",
  "ROBERTO HIPOLITO DA COSTA BRIG.AR - PEI",
  "ROTARY",
  "SEBASTIAO WALTER FUSCO",
  "THEREZINHA CLOSA ELEUTERIO PROFA - PEI",
  "VALENTIN GONZALEZ ALONSO PADRE - PEI",
  "VICENTE MELRO - PEI",
  "VICTOR CIVITA - PEI",
  "WALDEMAR FREIRE VERAS VEREADOR",
  "ZILDA ROMEIRO PINTO MOREIRA DA SILVA, PROFA",
]

type Usuario = {
  id: string
  nome: string | null
  email: string | null
  role: string | null
  setor: string | null
  created_at?: string | null
}

type ModalMode = "create" | "edit" | null

function normalizarTexto(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function roleLabel(role?: string | null) {
  return roles.find((item) => item.value === role)?.label || role || "Sem perfil"
}

function getInitials(nome?: string | null, email?: string | null) {
  const base = String(nome || email || "").trim()

  if (!base) return "U"

  const partes = base.split(" ").filter(Boolean)

  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }

  return base.substring(0, 2).toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Sem data"

  return date.toLocaleDateString("pt-BR")
}

function getRoleTone(role?: string | null) {
  if (role === "admin") return "purple"
  if (role === "dirigente") return "blue"
  if (role === "seintec") return "cyan"
  if (role === "chefia_ure") return "violet"
  if (role === "gestao_escolas") return "green"
  return "slate"
}

async function deleteUserFormAction(formData: FormData): Promise<void> {
  await deleteUser(formData)
}

export default function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState("")
  const [roleFiltro, setRoleFiltro] = useState("todos")
  const [setorFiltro, setSetorFiltro] = useState("todos")
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info"
    message: string
  } | null>(null)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)

  const fetchUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, role, setor, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[USUÁRIOS] Erro ao carregar:", error.message)
        setUsuarios([])
        setFeedback({
          type: "error",
          message: "Não foi possível carregar os usuários cadastrados.",
        })
        return
      }

      setUsuarios((data || []) as Usuario[])
    } catch (error) {
      console.error("[USUÁRIOS] Erro inesperado:", error)
      setUsuarios([])
      setFeedback({
        type: "error",
        message: "Erro inesperado ao carregar usuários.",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const setoresCadastrados = useMemo(() => {
    return Array.from(
      new Set(usuarios.map((usuario) => usuario.setor).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [usuarios])

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    return usuarios.filter((usuario) => {
      const texto = normalizarTexto(
        `${usuario.nome || ""} ${usuario.email || ""} ${usuario.role || ""} ${
          usuario.setor || ""
        }`
      )

      const matchBusca = !termo || texto.includes(termo)
      const matchRole = roleFiltro === "todos" || usuario.role === roleFiltro
      const matchSetor = setorFiltro === "todos" || usuario.setor === setorFiltro

      return matchBusca && matchRole && matchSetor
    })
  }, [usuarios, busca, roleFiltro, setorFiltro])

  const resumo = useMemo(() => {
    const total = usuarios.length
    const admins = usuarios.filter((usuario) => usuario.role === "admin").length
    const seintec = usuarios.filter((usuario) => usuario.role === "seintec").length
    const escolas = usuarios.filter(
      (usuario) =>
        usuario.setor &&
        usuario.setor !== "URE GUARULHOS SUL" &&
        usuario.role !== "admin" &&
        usuario.role !== "seintec"
    ).length

    return {
      total,
      admins,
      seintec,
      escolas,
      resultado: usuariosFiltrados.length,
    }
  }, [usuarios, usuariosFiltrados.length])

  function openCreateModal() {
    setSelectedUser(null)
    setModalMode("create")
    setFeedback(null)
  }

  function openEditModal(usuario: Usuario) {
    setSelectedUser(usuario)
    setModalMode("edit")
    setFeedback(null)
  }

  function closeModal() {
    setModalMode(null)
    setSelectedUser(null)
  }

  function afterAction(message: string) {
    setFeedback({
      type: "info",
      message,
    })

    window.setTimeout(() => {
      fetchUsers(true)
      closeModal()
    }, 1200)
  }

  function handleDelete(e: FormEvent<HTMLFormElement>) {
    const confirmacao = window.confirm(
      "🚨 ATENÇÃO!\n\nTem certeza absoluta que deseja EXCLUIR este usuário? Essa ação não pode ser desfeita e ele perderá acesso imediatamente."
    )

    if (!confirmacao) {
      e.preventDefault()
      return
    }

    window.setTimeout(() => {
      fetchUsers(true)
      closeModal()
    }, 1200)
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1800px] space-y-8 pb-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:rounded-[2.5rem] md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.10),transparent_30%)]" />
          <div className="pointer-events-none absolute -right-16 -bottom-20 hidden text-blue-500/5 md:block">
            <UsersIcon className="h-80 w-80" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300 shadow-[0_0_22px_rgba(37,99,235,0.18)]">
                  <ShieldIcon className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">
                    Controle de Acessos
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Administração de perfis, setores e permissões
                  </p>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Gestão de <span className="text-blue-400">Usuários</span>
              </h1>

              <p className="mt-3 max-w-4xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base md:text-lg">
                Gerencie usuários do SETEC Hub, edite permissões, organize os
                vínculos por setor ou escola e mantenha os acessos institucionais
                controlados.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition-all hover:bg-blue-500 active:scale-95 sm:w-auto"
            >
              <UserPlusIcon className="h-5 w-5" />
              Novo Usuário
            </button>
          </div>
        </section>

        {feedback && (
          <FeedbackBox
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        )}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <StatCard
            icon={<UsersIcon className="h-6 w-6 text-blue-300" />}
            label="Usuários"
            value={resumo.total}
            description="Acessos cadastrados"
            badge="Sistema"
            tone="blue"
          />

          <StatCard
            icon={<CrownIcon className="h-6 w-6 text-purple-300" />}
            label="Admins"
            value={resumo.admins}
            description="Acesso elevado"
            badge="Admin"
            tone="purple"
          />

          <StatCard
            icon={<ShieldCheckIcon className="h-6 w-6 text-cyan-300" />}
            label="SEINTEC"
            value={resumo.seintec}
            description="Gestão tecnológica"
            badge="SETEC"
            tone="cyan"
          />

          <StatCard
            icon={<BuildingIcon className="h-6 w-6 text-emerald-300" />}
            label="Escolas/Setores"
            value={resumo.escolas}
            description="Vínculos operacionais"
            badge="Rede"
            tone="green"
          />

          <StatCard
            icon={<SearchIcon className="h-6 w-6 text-orange-300" />}
            label="Resultado"
            value={resumo.resultado}
            description="No filtro atual"
            badge="Busca"
            tone="orange"
          />
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <SearchIcon className="h-5 w-5 shrink-0 text-slate-500" />

              <input
                type="text"
                placeholder="Pesquisar usuário, e-mail, setor, escola ou perfil..."
                className="w-full border-none bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-600 md:text-base"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />

              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-800 hover:text-white"
                  aria-label="Limpar pesquisa"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={roleFiltro}
              onChange={(event) => setRoleFiltro(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-sm font-medium text-slate-300 outline-none transition-all focus:border-blue-500 lg:w-56"
            >
              <option value="todos">Todos os perfis</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              value={setorFiltro}
              onChange={(event) => setSetorFiltro(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3.5 text-sm font-medium text-slate-300 outline-none transition-all focus:border-blue-500 lg:w-72"
            >
              <option value="todos">Todos os setores</option>
              {setoresCadastrados.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => fetchUsers(true)}
              disabled={loading || refreshing}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3.5 text-sm font-bold text-slate-300 transition-all hover:border-blue-500/40 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              <RefreshIcon
                className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] shadow-2xl md:rounded-[2.5rem]">
          <div className="flex flex-col gap-4 border-b border-slate-800 bg-[#020617] p-5 md:flex-row md:items-center md:justify-between md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-blue-300">
                <ShieldIcon className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                  Usuários Cadastrados
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Edite dados, perfis, setores, credenciais e acessos da plataforma.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-blue-300">
              <ShieldCheckIcon className="h-4 w-4" />
              Controle ativo
            </div>
          </div>

          <div className="p-4 md:hidden">
            {loading ? (
              <MobileLoadingCards />
            ) : usuariosFiltrados.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {usuariosFiltrados.map((usuario) => (
                  <UsuarioMobileCard
                    key={usuario.id}
                    usuario={usuario}
                    onEdit={() => openEditModal(usuario)}
                    onDelete={handleDelete}
                    onAfterDelete={() => fetchUsers(true)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead className="bg-slate-950/70 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <tr>
                  <th className="px-7 py-5">Perfil</th>
                  <th className="px-7 py-5">Setor e permissão</th>
                  <th className="px-7 py-5">Registro</th>
                  <th className="sticky right-0 z-10 bg-slate-950/90 px-7 py-5 text-center shadow-[-12px_0_24px_rgba(0,0,0,0.25)]">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <LoadingRows />
                ) : usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-14 text-center">
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="group transition-all hover:bg-blue-500/[0.04]"
                    >
                      <td className="px-7 py-6">
                        <div className="flex items-center gap-5">
                          <Avatar
                            name={usuario.nome || usuario.email || "U"}
                            role={usuario.role}
                          />

                          <div className="min-w-0">
                            <p className="max-w-[340px] truncate text-base font-bold uppercase text-white transition-colors group-hover:text-blue-300">
                              {usuario.nome || "Usuário sem nome"}
                            </p>

                            <div className="mt-1 flex max-w-[340px] items-center gap-2 text-xs font-medium text-slate-500">
                              <MailIcon className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                              <span className="truncate">
                                {usuario.email || "Sem e-mail"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-7 py-6">
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                            <BuildingIcon className="h-4 w-4 text-blue-400" />
                            {usuario.setor || "Sem setor"}
                          </span>

                          <RoleBadge role={usuario.role} />
                        </div>
                      </td>

                      <td className="px-7 py-6">
                        <DateBadge value={usuario.created_at} />
                      </td>

                      <td className="sticky right-0 z-10 bg-[#020617] px-7 py-6 shadow-[-12px_0_24px_rgba(0,0,0,0.25)] group-hover:bg-[#071126]">
                        <div className="flex items-center justify-center gap-3">
                          <ActionButton
                            title="Editar usuário"
                            onClick={() => openEditModal(usuario)}
                            icon={<EditIcon className="h-4.5 w-4.5" />}
                          />

                          <form
                            action={deleteUserFormAction}
                            onSubmit={(event) => {
                              if (usuario.role === "admin") {
                                event.preventDefault()
                                setFeedback({
                                  type: "error",
                                  message:
                                    "Usuários administradores não podem ser excluídos pela interface do sistema.",
                                })
                                return
                              }

                              handleDelete(event)
                              window.setTimeout(() => fetchUsers(true), 1200)
                            }}
                          >
                            <input type="hidden" name="id" value={usuario.id} />

                            <DeleteButton disabled={usuario.role === "admin"} />
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modalMode === "create" && (
        <CreateUserModal
          onClose={closeModal}
          onAfterSubmit={() =>
            afterAction("Solicitação enviada. Atualizando a lista de usuários...")
          }
        />
      )}

      {modalMode === "edit" && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={closeModal}
          onAfterSubmit={() =>
            afterAction("Solicitação enviada. Atualizando os dados do usuário...")
          }
          onDelete={handleDelete}
        />
      )}
    </>
  )
}

function CreateUserModal({
  onClose,
  onAfterSubmit,
}: {
  onClose: () => void
  onAfterSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar formulário"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
      />

      <div className="relative max-h-[94vh] w-full overflow-hidden rounded-t-[2rem] border border-slate-800 bg-[#020617] shadow-2xl sm:max-w-5xl sm:rounded-[2.5rem]">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-20 hidden text-blue-500/5 sm:block">
          <SparklesIcon className="h-80 w-80" />
        </div>

        <div className="relative z-10 max-h-[94vh] overflow-y-auto">
          <ModalHeader
            eyebrow="Novo acesso"
            title="Cadastrar Usuário"
            description="Configure o acesso inicial do usuário, definindo nome, e-mail, senha, perfil e vínculo institucional."
            onClose={onClose}
          />

          <form
            action={createUser}
            onSubmit={() => onAfterSubmit()}
            className="space-y-6 p-5 sm:space-y-8 sm:p-10"
            autoComplete="off"
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <InputGroup
                label="Nome"
                name="nome"
                icon={<UsersIcon className="h-4.5 w-4.5" />}
                required
                placeholder="Nome completo do usuário"
              />

              <InputGroup
                label="E-mail"
                name="email"
                icon={<MailIcon className="h-4.5 w-4.5" />}
                type="email"
                required
                placeholder="email@educacao.sp.gov.br"
              />
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-5 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
                  <KeyIcon className="h-5.5 w-5.5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">
                    Credencial de acesso
                  </h3>

                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                    Defina a senha inicial de acesso. O campo possui visualização
                    com olhinho para conferência antes do cadastro.
                  </p>
                </div>
              </div>

              <PasswordInputGroup
                label="Senha inicial obrigatória"
                name="senha"
                required
                minLength={6}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-5 sm:p-8 lg:grid-cols-2">
              <SelectGroup
                label="Nível de permissão"
                name="role"
                icon={<ShieldIcon className="h-4.5 w-4.5" />}
                defaultValue=""
                required
                options={[
                  { value: "", label: "Selecione um perfil...", disabled: true },
                  ...roles.map((role) => ({
                    value: role.value,
                    label: role.label,
                  })),
                ]}
              />

              <SelectGroup
                label="Setor vinculado"
                name="setor"
                icon={<BuildingIcon className="h-4.5 w-4.5" />}
                defaultValue=""
                required
                options={[
                  { value: "", label: "Selecione o local...", disabled: true },
                  ...setores.map((setor) => ({
                    value: setor,
                    label: setor,
                  })),
                ]}
              />
            </div>

            <ModalFooter
              onClose={onClose}
              submitLabel="Criar Usuário"
            />
          </form>
        </div>
      </div>
    </div>
  )
}

function EditUserModal({
  user,
  onClose,
  onAfterSubmit,
  onDelete,
}: {
  user: Usuario
  onClose: () => void
  onAfterSubmit: () => void
  onDelete: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar formulário"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
      />

      <div className="relative max-h-[94vh] w-full overflow-hidden rounded-t-[2rem] border border-slate-800 bg-[#020617] shadow-2xl sm:max-w-5xl sm:rounded-[2.5rem]">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 max-h-[94vh] overflow-y-auto">
          <ModalHeader
            eyebrow="Edição de acesso"
            title="Editar Usuário"
            description="Atualize dados gerais, perfil, setor, e-mail ou senha do usuário cadastrado no SETEC Hub."
            onClose={onClose}
          />

          <div className="space-y-6 p-5 sm:space-y-8 sm:p-10">
            <form
              action={updateUser}
              onSubmit={() => onAfterSubmit()}
              className="space-y-6"
              autoComplete="off"
            >
              <input type="hidden" name="id" value={user.id} />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <InputGroup
                  label="Nome"
                  name="nome"
                  icon={<UsersIcon className="h-4.5 w-4.5" />}
                  required
                  defaultValue={user.nome || ""}
                  placeholder="Nome completo do usuário"
                />

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    E-mail atual
                  </p>

                  <p className="mt-2 truncate text-sm font-bold text-white">
                    {user.email || "Sem e-mail cadastrado"}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Para alterar, use a área de credenciais abaixo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-5 sm:p-8 lg:grid-cols-2">
                <SelectGroup
                  label="Nível de permissão"
                  name="role"
                  icon={<ShieldIcon className="h-4.5 w-4.5" />}
                  defaultValue={user.role || ""}
                  required
                  options={[
                    { value: "", label: "Selecione um perfil...", disabled: true },
                    ...roles.map((role) => ({
                      value: role.value,
                      label: role.label,
                    })),
                  ]}
                />

                <SelectGroup
                  label="Setor vinculado"
                  name="setor"
                  icon={<BuildingIcon className="h-4.5 w-4.5" />}
                  defaultValue={user.setor || ""}
                  required
                  options={[
                    { value: "", label: "Selecione o local...", disabled: true },
                    ...setores.map((setor) => ({
                      value: setor,
                      label: setor,
                    })),
                  ]}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-blue-500 sm:w-auto"
                >
                  Salvar dados gerais
                </button>
              </div>
            </form>

            <section className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-5 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                  <KeyIcon className="h-5.5 w-5.5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">
                    Credenciais e acesso
                  </h3>

                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                    Altere o e-mail ou redefina a senha do usuário sem mexer nos
                    demais dados do cadastro.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <form
                  action={updateEmail}
                  onSubmit={() => onAfterSubmit()}
                  className="rounded-2xl border border-slate-800 bg-[#020617] p-4"
                >
                  <input type="hidden" name="id" value={user.id} />

                  <InputGroup
                    label="Alterar e-mail"
                    name="email"
                    icon={<MailIcon className="h-4.5 w-4.5" />}
                    type="email"
                    defaultValue={user.email || ""}
                    placeholder="email@educacao.sp.gov.br"
                  />

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-200 transition-all hover:bg-slate-700"
                  >
                    Atualizar e-mail
                  </button>
                </form>

                <form
                  action={resetPassword}
                  onSubmit={() => onAfterSubmit()}
                  className="rounded-2xl border border-slate-800 bg-[#020617] p-4"
                >
                  <input type="hidden" name="id" value={user.id} />

                  <PasswordInputGroup
                    label="Nova senha"
                    name="novaSenha"
                    minLength={6}
                    placeholder="Mínimo de 6 caracteres"
                  />

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-200 transition-all hover:bg-slate-700"
                  >
                    Redefinir senha
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-red-300">
                    Zona de risco
                  </p>

                  <p className="mt-1 text-sm font-medium text-red-200/70">
                    A remoção do usuário deve ser usada somente quando o acesso
                    não for mais necessário.
                  </p>
                </div>

                <form
                  action={deleteUserFormAction}
                  onSubmit={(event) => {
                    if (user.role === "admin") {
                      event.preventDefault()
                      return
                    }

                    onDelete(event)
                    window.setTimeout(() => onClose(), 1200)
                  }}
                  className="w-full sm:w-auto"
                >
                  <input type="hidden" name="id" value={user.id} />

                  <button
                    type="submit"
                    disabled={user.role === "admin"}
                    title={
                      user.role === "admin"
                        ? "Usuários admin não podem ser excluídos pela interface"
                        : "Remover usuário"
                    }
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all sm:w-auto ${
                      user.role === "admin"
                        ? "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-600 opacity-60"
                        : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
                    }`}
                  >
                    <TrashIcon className="h-4 w-4" />
                    {user.role === "admin" ? "Admin protegido" : "Remover usuário"}
                  </button>
                </form>
              </div>
            </section>

            <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-800 bg-[#020617]/95 p-5 backdrop-blur-xl sm:-mx-10 sm:-mb-10 sm:p-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
              >
                Fechar edição
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsuarioMobileCard({
  usuario,
  onEdit,
  onDelete,
  onAfterDelete,
}: {
  usuario: Usuario
  onEdit: () => void
  onDelete: (event: FormEvent<HTMLFormElement>) => void
  onAfterDelete: () => void
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar name={usuario.nome || usuario.email || "U"} role={usuario.role} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold uppercase leading-tight text-white">
            {usuario.nome || "Usuário sem nome"}
          </p>

          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
            <MailIcon className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            <span className="truncate">{usuario.email || "Sem e-mail"}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <RoleBadge role={usuario.role} />

            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-[#020617] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <BuildingIcon className="h-3.5 w-3.5" />
              {usuario.setor || "Sem setor"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-[#020617] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Registro
        </p>

        <p className="mt-1 text-sm font-bold text-slate-300">
          Criado em {formatDate(usuario.created_at)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-xs font-bold text-slate-300 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <EditIcon className="h-4 w-4" />
          Editar
        </button>

        <form
          action={deleteUserFormAction}
          onSubmit={(event) => {
            if (usuario.role === "admin") {
              event.preventDefault()
              return
            }

            onDelete(event)
            window.setTimeout(() => onAfterDelete(), 1200)
          }}
        >
          <input type="hidden" name="id" value={usuario.id} />

          <button
            type="submit"
            disabled={usuario.role === "admin"}
            title={
              usuario.role === "admin"
                ? "Usuários admin não podem ser excluídos pela interface"
                : "Excluir usuário"
            }
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all ${
              usuario.role === "admin"
                ? "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-600 opacity-60"
                : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
            }`}
          >
            <TrashIcon className="h-4 w-4" />
            {usuario.role === "admin" ? "Bloqueado" : "Excluir"}
          </button>
        </form>
      </div>
    </article>
  )
}

function ModalHeader({
  eyebrow,
  title,
  description,
  onClose,
}: {
  eyebrow: string
  title: string
  description: string
  onClose: () => void
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-800 bg-[#020617]/95 p-5 backdrop-blur-xl sm:p-10">
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
            <FingerprintIcon className="h-4 w-4" />
            {eyebrow}
          </div>

          <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 sm:h-12 sm:w-12"
          aria-label="Fechar"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function ModalFooter({
  onClose,
  submitLabel,
}: {
  onClose: () => void
  submitLabel: string
}) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 border-t border-slate-800 bg-[#020617]/95 p-5 backdrop-blur-xl sm:-mx-10 sm:-mb-10 sm:flex-row sm:p-6">
      <button
        type="button"
        onClick={onClose}
        className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white sm:w-1/3"
      >
        Cancelar
      </button>

      <button
        type="submit"
        className="flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition-all hover:bg-blue-500 sm:flex-1"
      >
        {submitLabel}
      </button>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  description,
  badge,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string | number
  description: string
  badge: string
  tone: "blue" | "purple" | "cyan" | "green" | "orange"
}) {
  const colors = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  }[tone]

  return (
    <div className={`group relative overflow-hidden rounded-[1.5rem] border p-5 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl md:rounded-[2rem] md:p-6 ${colors}`}>
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
          {icon}
        </div>

        <span className="rounded-xl border border-white/10 bg-slate-950/40 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-widest opacity-90">
          {badge}
        </span>
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
          {label}
        </p>

        <p className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          {value}
        </p>

        <p className="mt-2 text-xs font-medium opacity-80 md:text-sm">
          {description}
        </p>
      </div>
    </div>
  )
}

function Avatar({ name, role }: { name: string; role: string | null }) {
  const initials = getInitials(name)
  const tone = getRoleTone(role)

  const colors = {
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/25",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/25",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    slate: "bg-slate-800 text-slate-300 border-slate-700",
  }[tone]

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold md:h-14 md:w-14 md:text-xl ${colors}`}
    >
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: string | null }) {
  const tone = getRoleTone(role)

  const colors = {
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/25",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/25",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    slate: "bg-slate-800 text-slate-300 border-slate-700",
  }[tone]

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${colors}`}
    >
      <ShieldIcon className="h-3.5 w-3.5" />
      {roleLabel(role)}
    </span>
  )
}

function InputGroup({
  label,
  name,
  icon,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
}: {
  label: string
  name: string
  icon: ReactNode
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        <span className="text-blue-300">{icon}</span>
        {label}
      </label>

      <input
        name={name}
        required={required}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:px-5 md:text-base"
      />
    </div>
  )
}

function PasswordInputGroup({
  label,
  name,
  required = false,
  minLength,
  placeholder,
}: {
  label: string
  name: string
  required?: boolean
  minLength?: number
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        <span className="text-blue-300">
          <KeyIcon className="h-4.5 w-4.5" />
        </span>
        {label}
      </label>

      <div className="relative">
        <input
          name={name}
          required={required}
          type={visible ? "text" : "password"}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4 pr-14 text-sm font-medium text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:px-5 md:text-base"
        />

        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-800 hover:text-blue-300"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>

      <p className="text-[11px] font-medium text-slate-500">
        A senha precisa ter no mínimo 6 caracteres.
      </p>
    </div>
  )
}

function SelectGroup({
  label,
  name,
  icon,
  options,
  defaultValue,
  required = false,
}: {
  label: string
  name: string
  icon: ReactNode
  options: Array<{ value: string; label: string; disabled?: boolean }>
  defaultValue?: string
  required?: boolean
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        <span className="text-blue-300">{icon}</span>
        {label}
      </label>

      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4 text-sm font-semibold text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:px-5 md:text-base"
      >
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FeedbackBox({
  type,
  message,
  onClose,
}: {
  type: "success" | "error" | "info"
  message: string
  onClose: () => void
}) {
  const colors =
    type === "success"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : type === "error"
        ? "border-red-500/25 bg-red-500/10 text-red-200"
        : "border-blue-500/25 bg-blue-500/10 text-blue-200"

  return (
    <section className={`flex items-start gap-4 rounded-3xl border px-5 py-5 md:px-6 ${colors}`}>
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40">
        {type === "error" ? (
          <AlertIcon className="h-5 w-5" />
        ) : (
          <ShieldCheckIcon className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {type === "success" ? "Tudo certo" : type === "error" ? "Atenção" : "Processando"}
        </p>

        <p className="mt-1 text-sm font-medium leading-relaxed opacity-90">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-white/10"
        aria-label="Fechar aviso"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </section>
  )
}

function ActionButton({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-400 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
      aria-label={title}
    >
      {icon}
    </button>
  )
}

function DeleteButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      title={
        disabled
          ? "Usuários admin não podem ser excluídos pela interface"
          : "Excluir usuário"
      }
      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
        disabled
          ? "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-600 opacity-60"
          : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
      }`}
      aria-label={
        disabled
          ? "Usuário admin não pode ser excluído"
          : "Excluir usuário"
      }
    >
      <TrashIcon className="h-4.5 w-4.5" />
    </button>
  )
}

function DateBadge({ value }: { value?: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-400">
      <CalendarIcon className="h-4 w-4 text-slate-500" />
      {formatDate(value)}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-800 bg-[#020617] text-slate-500">
        <SearchIcon className="h-7 w-7" />
      </div>

      <p className="text-lg font-bold text-white">
        Nenhum usuário localizado.
      </p>

      <p className="mt-2 text-sm font-medium text-slate-500">
        Revise o termo pesquisado ou limpe os filtros para visualizar todos os
        acessos.
      </p>
    </div>
  )
}

function MobileLoadingCards() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[1.75rem] border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-800" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-40 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-3 w-56 animate-pulse rounded-xl bg-slate-800" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-12 animate-pulse rounded-2xl bg-slate-800" />
            <div className="h-12 animate-pulse rounded-2xl bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td className="px-7 py-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-800" />
              <div className="space-y-3">
                <div className="h-5 w-64 animate-pulse rounded-xl bg-slate-800" />
                <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-800" />
              </div>
            </div>
          </td>

          <td className="px-7 py-6">
            <div className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-slate-800" />
            </div>
          </td>

          <td className="px-7 py-6">
            <div className="h-11 w-36 animate-pulse rounded-2xl bg-slate-800" />
          </td>

          <td className="sticky right-0 z-10 bg-[#020617] px-7 py-6 text-center">
            <RefreshIcon className="mx-auto h-5 w-5 animate-spin text-blue-400" />
          </td>
        </tr>
      ))}
    </>
  )
}

/* ================= ÍCONES INLINE - SEM DEPENDÊNCIA NOVA ================= */

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
      strokeWidth={2}
      stroke="currentColor"
    >
      {children}
    </svg>
  )
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a5.971 5.971 0 0 0-.941 3.197m0 0a3 3 0 0 1-4.682-2.72 9.094 9.094 0 0 0 3.741.479m.94-3.198a5.995 5.995 0 0 1 5.058-2.772m0 0a3 3 0 1 1 5.058 0m-5.058 0a3 3 0 1 0-5.058 0" />
    </SvgBase>
  )
}

function UserPlusIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.5a7.5 7.5 0 0 1 15 0" />
    </SvgBase>
  )
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75A11.959 11.959 0 0 1 12 2.714Z" />
    </SvgBase>
  )
}

function ShieldCheckIcon({ className = "" }: { className?: string }) {
  return <ShieldIcon className={className} />
}

function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 5.25-6.75L12 12l4.5-6.75L21.75 12l-2.25 7.5h-15L2.25 12Z" />
    </SvgBase>
  )
}

function BuildingIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 21V5.25A2.25 2.25 0 0 1 6.75 3h10.5a2.25 2.25 0 0 1 2.25 2.25V21M9 7.5h1.5M9 11.25h1.5M9 15h1.5m3-7.5H15m-1.5 3.75H15M13.5 15H15" />
    </SvgBase>
  )
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </SvgBase>
  )
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M7.977 14.652H2.985m17.03-10.296v4.992m0 0h-4.992m4.993 0-3.181-3.183a8.25 8.25 0 0 0-13.803 3.7" />
    </SvgBase>
  )
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </SvgBase>
  )
}

function MailIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </SvgBase>
  )
}

function KeyIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </SvgBase>
  )
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </SvgBase>
  )
}

function EyeOffIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 2.036 12.322a1.012 1.012 0 0 0 0 .639C3.423 17.49 7.36 20.5 12 20.5c1.568 0 3.061-.316 4.418-.887M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639a10.523 10.523 0 0 1-4.293 5.346M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.792 7.792L21 21m-3.33-3.33-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.878 9.878" />
    </SvgBase>
  )
}

function EditIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125 16.875 4.5" />
    </SvgBase>
  )
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </SvgBase>
  )
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </SvgBase>
  )
}

function SparklesIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </SvgBase>
  )
}

function FingerprintIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A8.25 8.25 0 0 1 19.5 12c0 2.21-.895 4.21-2.343 5.657M4.5 12a7.5 7.5 0 0 1 12.728-5.364M12 9.75a2.25 2.25 0 0 0-2.25 2.25c0 1.243 1.007 2.25 2.25 2.25s2.25-1.007 2.25-2.25A2.25 2.25 0 0 0 12 9.75ZM12 6.75A5.25 5.25 0 0 1 17.25 12c0 1.45-.588 2.762-1.538 3.712M6.75 12a5.25 5.25 0 0 1 8.963-3.712M12 12v.008" />
    </SvgBase>
  )
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm-9.303 1.083 8.25-14.25a1.5 1.5 0 0 1 2.606 0l8.25 14.25A1.5 1.5 0 0 1 20.5 21h-17a1.5 1.5 0 0 1-1.303-2.167Z" />
    </SvgBase>
  )
}