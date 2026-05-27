"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

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

type AcaoLog =
  | "visualizou"
  | "copiou_email_administrativo"
  | "copiou_senha_administrativo"
  | "copiou_email_pedagogico_windows"
  | "copiou_senha_pedagogico_windows"
  | "copiou_email_pedagogico_chromeos"
  | "copiou_senha_pedagogico_chromeos"

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

function maskPassword(value: string | null) {
  if (!value) return "Não informado"
  return "•".repeat(Math.min(Math.max(value.length, 8), 14))
}

function hasCredential(email: string | null, senha: string | null) {
  return Boolean(String(email || "").trim() || String(senha || "").trim())
}

export default function CredenciaisEscolasPage() {
  const supabase = useMemo(() => createClient(), [])

  const [credenciais, setCredenciais] = useState<CredencialEscola[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [copiado, setCopiado] = useState<string | null>(null)
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>({})
  const [cardAberto, setCardAberto] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setErro(null)

      const { data, error } = await supabase
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
        `)
        .eq("ativo", true)

      if (error) {
        console.error("[Credenciais Escolas] Erro ao carregar:", error)
        setErro("Não foi possível carregar as credenciais das escolas.")
        setCredenciais([])
        setLoading(false)
        return
      }

      const lista = ((data || []) as CredencialEscola[]).sort((a, b) => {
        const escolaA = getEscola(a)?.nome_escola || ""
        const escolaB = getEscola(b)?.nome_escola || ""
        return escolaA.localeCompare(escolaB, "pt-BR")
      })

      setCredenciais(lista)
      setLoading(false)
    }

    carregar()
  }, [supabase])

  const credenciaisFiltradas = useMemo(() => {
    const termo = normalizar(busca)

    if (!termo) return credenciais

    return credenciais.filter((item) => {
      const escola = getEscola(item)

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

      return baseBusca.includes(termo)
    })
  }, [busca, credenciais])

  const totalComContaAdministrativa = credenciais.filter((item) =>
    hasCredential(item.email_administrativo, item.senha_administrativo)
  ).length

  const totalComContaWindows = credenciais.filter((item) =>
    hasCredential(item.email_pedagogico_windows, item.senha_pedagogico_windows)
  ).length

  const totalComContaChromeOS = credenciais.filter((item) =>
    hasCredential(
      item.email_pedagogico_chromeOS,
      item.senha_pedagogico_chromeOS
    )
  ).length

  async function registrarLog(item: CredencialEscola, acao: AcaoLog) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) return

      const escola = getEscola(item)

      await supabase.from("credenciais_escolas_logs").insert({
        credencial_id: item.id,
        usuario_id: user.id,
        acao,
        escola_nome: escola?.nome_escola || null,
        cie: escola?.cie || item.cie || null,
      })
    } catch (error) {
      console.error("[Credenciais Escolas] Erro ao registrar log:", error)
    }
  }

  async function copiarTexto(
    item: CredencialEscola,
    value: string | null,
    key: string,
    acao: AcaoLog
  ) {
    const texto = String(value || "").trim()

    if (!texto) return

    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = texto
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    }

    setCopiado(key)
    await registrarLog(item, acao)

    window.setTimeout(() => {
      setCopiado(null)
    }, 1800)
  }

  async function alternarVisibilidade(item: CredencialEscola, key: string) {
    const vaiMostrar = !visiveis[key]

    setVisiveis((current) => ({
      ...current,
      [key]: vaiMostrar,
    }))

    if (vaiMostrar) {
      await registrarLog(item, "visualizou")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div>
            <p className="text-lg font-bold text-white">
              Carregando credenciais
            </p>
            <p className="text-sm text-slate-500">
              Aguarde enquanto consultamos a base centralizada.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#020617] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.30),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_32%)]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                Fields
              </span>

              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                Credenciais escolares
              </span>

              <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-300">
                Uso restrito
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Consulta de <span className="text-blue-400">Credenciais</span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
              Central de apoio para consulta das contas utilizadas na
              configuração de domínio, Windows e ChromeOS dos equipamentos das
              unidades escolares.
            </p>
          </div>

          <Link
            href="/fields"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
          >
            Voltar para Fields
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-red-500/20 bg-red-500/10 p-5 shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_28%)]" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl">
              🔐
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-widest text-red-300">
                Uso restrito e institucional
              </p>

              <p className="mt-1 max-w-4xl text-sm font-medium leading-relaxed text-red-100/85">
                As credenciais exibidas nesta página devem ser utilizadas
                exclusivamente para procedimentos técnicos autorizados. Ações de
                visualização e cópia podem ser registradas para fins de
                auditoria interna.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/25 bg-[#020617]/60 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-200">
            Dados sensíveis
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
          {erro}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Escolas com credencial"
          value={credenciais.length}
          subtitle="Registros ativos"
          color="blue"
        />

        <KpiCard
          title="Administrativo"
          value={totalComContaAdministrativa}
          subtitle="Contas administrativas"
          color="emerald"
        />

        <KpiCard
          title="Windows"
          value={totalComContaWindows}
          subtitle="Pedagógico Windows"
          color="cyan"
        />

        <KpiCard
          title="ChromeOS"
          value={totalComContaChromeOS}
          subtitle="Pedagógico ChromeOS"
          color="purple"
        />
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-300">
              Exibindo:{" "}
              <span className="text-blue-300">
                {credenciaisFiltradas.length}
              </span>
            </div>

            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Limpar busca
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        {credenciaisFiltradas.map((item) => {
          const escola = getEscola(item)
          const escolaNome = textoSeguro(
            escola?.nome_escola,
            "Escola não informada"
          )
          const cie = textoSeguro(escola?.cie || item.cie, "CIE não informado")
          const aberto = cardAberto === item.id

          const temAdmin = hasCredential(
            item.email_administrativo,
            item.senha_administrativo
          )

          const temWindows = hasCredential(
            item.email_pedagogico_windows,
            item.senha_pedagogico_windows
          )

          const temChromeOS = hasCredential(
            item.email_pedagogico_chromeOS,
            item.senha_pedagogico_chromeOS
          )

          return (
            <article
              key={item.id}
              className={`overflow-hidden rounded-[2rem] border bg-[#020617] shadow-xl transition ${
                aberto
                  ? "border-blue-500/35 shadow-blue-950/20"
                  : "border-slate-800 hover:border-blue-500/25"
              }`}
            >
              <button
                type="button"
                onClick={() => setCardAberto(aberto ? null : item.id)}
                className="flex w-full flex-col gap-5 p-5 text-left lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                      CIE {cie}
                    </span>

                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      Ativo
                    </span>

                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {formatarData(item.updated_at)}
                    </span>
                  </div>

                  <h2 className="break-words text-xl font-black text-white sm:text-2xl">
                    {escolaNome}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <MiniStatus label="Administrativo" ativo={temAdmin} />
                    <MiniStatus label="Windows" ativo={temWindows} />
                    <MiniStatus label="ChromeOS" ativo={temChromeOS} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition ${
                      aberto
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                        : "border-slate-800 bg-slate-950 text-slate-400"
                    }`}
                  >
                    {aberto ? "Recolher contas" : "Ver contas"}
                  </span>

                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-lg transition ${
                      aberto
                        ? "rotate-180 border-blue-500/30 bg-blue-500/10 text-blue-300"
                        : "border-slate-800 bg-slate-950 text-slate-500"
                    }`}
                  >
                    ↓
                  </span>
                </div>
              </button>

              {aberto && (
                <div className="border-t border-slate-800 bg-slate-950/30 p-5">
                  <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoBox label="Diretor(a)" value={escola?.diretor} />
                    <InfoBox label="E-mail da escola" value={escola?.email} />
                    <InfoBox label="Telefone" value={escola?.telefone} />
                    <InfoBox label="Endereço" value={escola?.endereco} />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <CredentialBox
                      title="Conta Administrativa"
                      description="Conta administrativa da unidade. Quando a senha constar como orientação, a equipe deverá validar diretamente com a gestão escolar."
                      icon="🏢"
                      color="blue"
                      email={item.email_administrativo}
                      senha={item.senha_administrativo}
                      emailKey={`${item.id}-email-admin`}
                      senhaKey={`${item.id}-senha-admin`}
                      emailAction="copiou_email_administrativo"
                      senhaAction="copiou_senha_administrativo"
                      item={item}
                      visible
                      copiedKey={copiado}
                      onCopy={copiarTexto}
                      onTogglePassword={alternarVisibilidade}
                      showPasswordToggle={false}
                    />

                    <CredentialBox
                      title="Pedagógico Windows"
                      description="Conta utilizada para configuração de domínio em equipamentos Windows."
                      icon="🪟"
                      color="cyan"
                      email={item.email_pedagogico_windows}
                      senha={item.senha_pedagogico_windows}
                      emailKey={`${item.id}-email-windows`}
                      senhaKey={`${item.id}-senha-windows`}
                      emailAction="copiou_email_pedagogico_windows"
                      senhaAction="copiou_senha_pedagogico_windows"
                      item={item}
                      visible={Boolean(visiveis[`${item.id}-senha-windows`])}
                      copiedKey={copiado}
                      onCopy={copiarTexto}
                      onTogglePassword={alternarVisibilidade}
                    />

                    <CredentialBox
                      title="Pedagógico ChromeOS"
                      description="Conta utilizada para configuração de equipamentos ChromeOS."
                      icon="💻"
                      color="purple"
                      email={item.email_pedagogico_chromeOS}
                      senha={item.senha_pedagogico_chromeOS}
                      emailKey={`${item.id}-email-chromeos`}
                      senhaKey={`${item.id}-senha-chromeos`}
                      emailAction="copiou_email_pedagogico_chromeos"
                      senhaAction="copiou_senha_pedagogico_chromeos"
                      item={item}
                      visible={Boolean(visiveis[`${item.id}-senha-chromeos`])}
                      copiedKey={copiado}
                      onCopy={copiarTexto}
                      onTogglePassword={alternarVisibilidade}
                    />
                  </div>

                  {item.observacao && (
                    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                        Observação
                      </p>
                      {item.observacao}
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}

        {credenciaisFiltradas.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-800 bg-[#020617] p-10 text-center">
            <p className="text-xl font-black text-white">
              Nenhuma credencial encontrada
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ajuste a busca ou verifique se a credencial está ativa na gestão.
            </p>
          </div>
        )}
      </section>
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
  color: "blue" | "emerald" | "cyan" | "purple"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
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

function MiniStatus({ label, ativo }: { label: string; ativo: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
        ativo
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : "border-slate-700 bg-slate-900 text-slate-500"
      }`}
    >
      {ativo ? "✓" : "—"} {label}
    </span>
  )
}

function InfoBox({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-300">
        {textoSeguro(value)}
      </p>
    </div>
  )
}

function CredentialBox({
  title,
  description,
  icon,
  color,
  email,
  senha,
  emailKey,
  senhaKey,
  emailAction,
  senhaAction,
  item,
  visible,
  copiedKey,
  onCopy,
  onTogglePassword,
  showPasswordToggle = true,
}: {
  title: string
  description: string
  icon: string
  color: "blue" | "cyan" | "purple"
  email: string | null
  senha: string | null
  emailKey: string
  senhaKey: string
  emailAction: AcaoLog
  senhaAction: AcaoLog
  item: CredencialEscola
  visible: boolean
  copiedKey: string | null
  onCopy: (
    item: CredencialEscola,
    value: string | null,
    key: string,
    acao: AcaoLog
  ) => Promise<void>
  onTogglePassword: (item: CredencialEscola, key: string) => Promise<void>
  showPasswordToggle?: boolean
}) {
  const colors = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
  }

  const senhaExibida = showPasswordToggle
    ? visible
      ? textoSeguro(senha)
      : maskPassword(senha)
    : textoSeguro(senha)

  return (
    <div className={`rounded-[1.5rem] border p-4 ${colors[color]}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-2xl">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed opacity-80">
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CredentialLine
          label="E-mail / Usuário"
          value={email}
          displayValue={textoSeguro(email)}
          copied={copiedKey === emailKey}
          onCopy={() => onCopy(item, email, emailKey, emailAction)}
        />

        <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Senha
          </p>

          <div className="mt-2 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <p className="break-all font-mono text-sm font-black text-white">
              {senhaExibida}
            </p>

            <div className="flex flex-wrap gap-2">
              {showPasswordToggle && (
                <button
                  type="button"
                  onClick={() => onTogglePassword(item, senhaKey)}
                  disabled={!senha}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {visible ? "Ocultar" : "Mostrar"}
                </button>
              )}

              <button
                type="button"
                onClick={() => onCopy(item, senha, senhaKey, senhaAction)}
                disabled={!senha}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {copiedKey === senhaKey ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CredentialLine({
  label,
  value,
  displayValue,
  copied,
  onCopy,
}: {
  label: string
  value: string | null
  displayValue: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <p className="break-all font-mono text-sm font-black text-white">
          {displayValue}
        </p>

        <button
          type="button"
          onClick={onCopy}
          disabled={!value}
          className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  )
}