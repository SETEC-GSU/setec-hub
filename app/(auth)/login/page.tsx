"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function getLoginErrorMessage(err: unknown) {
    const message =
      err instanceof Error
        ? err.message.toLowerCase()
        : String(err || "").toLowerCase()

    if (
      message.includes("failed to fetch") ||
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("certificate") ||
      message.includes("cert") ||
      message.includes("err_cert_authority_invalid") ||
      message.includes("err_connection") ||
      message.includes("err_name") ||
      message.includes("timeout") ||
      message.includes("cors")
    ) {
      return "Falha de conexão segura com o serviço de autenticação. A rede atual pode estar bloqueando ou interceptando o acesso ao Supabase."
    }

    return "Email ou senha inválidos."
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError("")
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        console.error("Erro retornado pelo Supabase Auth:", error)
        setError(getLoginErrorMessage(error))
        return
      }

      if (!data.session || !data.user) {
        setError("Não foi possível iniciar a sessão. Tente novamente.")
        return
      }

      window.location.href = "/"
    } catch (err) {
      console.error("Erro inesperado ao realizar login:", err)
      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen w-full grid-cols-1 bg-[#020617] text-white lg:grid-cols-[1.15fr_0.85fr]">
      {/* PAINEL INSTITUCIONAL - APARECE SOMENTE NO DESKTOP */}
      <section className="relative hidden overflow-hidden border-r border-slate-800 bg-[#020617] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_30%)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600 to-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.45)]">
              <span className="text-2xl font-black tracking-tight text-white">
                SH
              </span>
            </div>

            <div>
              <div className="flex items-baseline text-4xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-blue-300 to-blue-600 bg-clip-text text-transparent">
                  SETEC
                </span>
                <span className="ml-1 font-light text-slate-200">Hub</span>
              </div>

              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                URE Guarulhos Sul
              </p>
            </div>
          </div>

          <p className="mb-5 inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Plataforma interna
          </p>

          <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight text-white xl:text-6xl">
            Tecnologia educacional com controle, registro e gestão.
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-400">
            Ambiente restrito para acompanhamento de chamados, inventário,
            unidades escolares, atendimentos técnicos e indicadores operacionais.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          <FeatureCard
            title="Controle"
            description="Perfis e permissões por função."
          />

          <FeatureCard
            title="Operação"
            description="Chamados e registros integrados."
          />

          <FeatureCard
            title="Gestão"
            description="Dados para decisão institucional."
          />
        </div>
      </section>

      {/* LOGIN - NO MOBILE APARECE SOMENTE ESSA PARTE */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_34%)] lg:hidden" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl lg:hidden" />

        <form
          onSubmit={handleLogin}
          className="relative z-10 w-full max-w-[430px] rounded-[2rem] border border-slate-800 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex w-fit items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600 to-blue-500 shadow-[0_0_24px_rgba(37,99,235,0.42)]">
                <span className="text-lg font-black tracking-tight text-white">
                  SH
                </span>
              </div>

              <div className="text-left leading-tight">
                <div className="flex items-baseline text-2xl font-black tracking-tight sm:text-3xl">
                  <span className="bg-gradient-to-r from-blue-300 to-blue-600 bg-clip-text text-transparent">
                    SETEC
                  </span>
                  <span className="ml-1 font-light text-slate-200">Hub</span>
                </div>

                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  URE Guarulhos Sul
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Acesse sua conta
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
              Informe suas credenciais institucionais para continuar.
            </p>
          </div>

          <div className="space-y-4">
            <FieldGroup label="E-mail institucional">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <MailIcon className="h-5 w-5 shrink-0 text-slate-500" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@educacao.sp.gov.br"
                  required
                  autoComplete="email"
                  className="w-full border-none bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Senha">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3.5 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <LockIcon className="h-5 w-5 shrink-0 text-slate-500" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  autoComplete="current-password"
                  className="w-full border-none bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-800 hover:text-blue-300"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </FieldGroup>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium leading-relaxed text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition-all hover:bg-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {loading ? "Validando acesso..." : "Entrar no SETEC Hub"}
          </button>

          <div className="mt-6 border-t border-slate-800 pt-5 text-center">
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Suporte técnico da plataforma
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-300">
              gsu.setec@educacao.sp.gov.br
            </p>
          </div>
        </form>
      </section>
    </main>
  )
}

function FieldGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>

      {children}
    </div>
  )
}

function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/45 p-5">
      <p className="text-sm font-bold text-white">{title}</p>

      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  )
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
      strokeWidth={2}
      stroke="currentColor"
    >
      {children}
    </svg>
  )
}

function MailIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </SvgBase>
  )
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </SvgBase>
  )
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </SvgBase>
  )
}

function EyeOffIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 2.036 12.322a1.012 1.012 0 0 0 0 .639C3.423 17.49 7.36 20.5 12 20.5c1.568 0 3.061-.316 4.418-.887M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639a10.523 10.523 0 0 1-4.293 5.346M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.792 7.792L21 21m-3.33-3.33-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.878 9.878"
      />
    </SvgBase>
  )
}