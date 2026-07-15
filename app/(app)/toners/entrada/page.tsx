"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type TonerTipo = {
  id: string
  nome: string
}

export default function RegistrarEntrada() {
  const supabase = createClient()
  const router = useRouter()

  const [tipos, setTipos] = useState<TonerTipo[]>([])
  const [tipo, setTipo] = useState("")
  const [impressora, setImpressora] = useState("")
  const [numeroChamado, setNumeroChamado] = useState("")
  const [quantidade, setQuantidade] = useState(1)
  const [dataAbertura, setDataAbertura] = useState("")
  const [loading, setLoading] = useState(false)

  async function carregarTipos() {
    const { data, error } = await supabase
      .from("tonner_tipos")
      .select("*")
      .order("nome")

    if (error) {
      console.error("Erro carregando tipos:", error)
    }

    setTipos((data || []) as TonerTipo[])
  }

  useEffect(() => {
    carregarTipos()
  }, [])

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (loading) return
    setLoading(true)

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) {
        console.error("Erro pegando usuário:", userError)
        alert("Erro ao identificar usuário")
        setLoading(false)
        return
      }

      const userId = userData.user?.id

      const payload = {
        tipo_movimentacao: "ENTRADA",
        tonner_tipo: tipo,
        quantidade,
        impressora,
        numero_chamado: numeroChamado || null,
        data_abertura: dataAbertura,
        data_movimentacao: new Date().toISOString(),
        registrado_por: userId,
      }

      console.log("Payload enviado:", payload)

      const { error } = await supabase
        .from("tonners_movimentacoes")
        .insert(payload)

      if (error) {
        console.error("Erro no insert:", error)
        alert("Erro ao registrar entrada. Veja o console.")
        setLoading(false)
        return
      }

      router.push("/toners")
    } catch (err) {
      console.error("Erro inesperado:", err)
      alert("Erro inesperado")
    }

    setLoading(false)
  }

  return (
    <div className="relative mx-auto w-full max-w-[1200px] overflow-hidden pb-12">
      <div className="pointer-events-none absolute -left-44 top-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-44 top-80 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/30 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
                Movimentação de estoque
              </span>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Entrada de suprimentos
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.16)] sm:flex">
                <BoxInIcon className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  Registrar entrada de toner
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
                  Registre o recebimento de toners e cilindros, vinculando o
                  suprimento à impressora de destino e ao chamado correspondente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-fit">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                Tipos carregados
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {tipos.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400/70">
                Operação
              </p>
              <p className="mt-1 text-sm font-black text-emerald-300">
                Entrada
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={registrar}
          className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 sm:p-6 lg:p-7"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

          <div className="relative z-10 mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
              Dados da movimentação
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Informações da entrada
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Preencha os dados abaixo para registrar a entrada no estoque.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <FieldGroup
              label="Tipo de toner"
              description="Selecione o suprimento recebido."
              icon={<InkIcon className="h-4 w-4" />}
            >
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              >
                <option value="" disabled>
                  Selecione o tipo de toner
                </option>

                {tipos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup
              label="Impressora de destino"
              description="Informe onde o suprimento será utilizado."
              icon={<PrinterIcon className="h-4 w-4" />}
            >
              <select
                value={impressora}
                onChange={(e) => setImpressora(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              >
                <option value="" disabled>
                  Selecione a impressora
                </option>

                <option>ASSESSORIA</option>
                <option>CAF</option>
                <option>CRH</option>
                <option>NRM</option>
              </select>
            </FieldGroup>

            <FieldGroup
              label="Número do chamado"
              description="Campo opcional para rastreabilidade."
              icon={<TicketIcon className="h-4 w-4" />}
            >
              <input
                type="text"
                placeholder="Insira o número do chamado KERSIS"
                value={numeroChamado}
                onChange={(e) => setNumeroChamado(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
            </FieldGroup>

            <FieldGroup
              label="Data de abertura do chamado"
              description="Informe a data vinculada à solicitação."
              icon={<CalendarIcon className="h-4 w-4" />}
            >
              <input
                type="date"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
            </FieldGroup>

            <div className="md:col-span-2">
              <FieldGroup
                label="Quantidade de toners recebidos"
                description="Informe o total de unidades adicionadas ao estoque."
                icon={<PackageIcon className="h-4 w-4" />}
              >
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 pr-28 text-2xl font-black text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    unidades
                  </span>
                </div>
              </FieldGroup>
            </div>
          </div>

          <div className="relative z-10 mt-7 border-t border-slate-800 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 px-6 text-sm font-black text-white shadow-[0_16px_38px_rgba(16,185,129,0.28)] transition hover:border-emerald-200/60 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 hover:shadow-[0_20px_48px_rgba(16,185,129,0.38)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <BoxInIcon className="h-5 w-5 transition group-hover:-translate-y-0.5" />
              )}

              {loading ? "Registrando entrada..." : "Registrar entrada"}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-[1.5rem] border border-emerald-500/20 bg-gradient-to-br from-[#020617] to-emerald-950/20 p-5 shadow-xl shadow-slate-950/20">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <InfoIcon className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-base font-black text-white">
              Antes de registrar
            </h3>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
              Confira o tipo do suprimento, a impressora de destino e a
              quantidade recebida antes de concluir a movimentação.
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Fluxo do registro
            </p>

            <div className="mt-4 space-y-3">
              <FlowStep number="1" text="Selecione o toner ou cilindro." />
              <FlowStep number="2" text="Informe a impressora de destino." />
              <FlowStep number="3" text="Vincule o chamado e a data." />
              <FlowStep number="4" text="Confirme a quantidade recebida." />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function FieldGroup({
  label,
  description,
  icon,
  children,
}: {
  label: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-start gap-2">
        <div className="mt-0.5 text-emerald-400">{icon}</div>

        <div>
          <label className="block text-xs font-black uppercase tracking-[0.15em] text-slate-300">
            {label}
          </label>
          <p className="mt-1 text-[10px] font-medium text-slate-600">
            {description}
          </p>
        </div>
      </div>

      {children}
    </div>
  )
}

function FlowStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-xs font-black text-emerald-300">
        {number}
      </div>
      <p className="text-xs font-semibold leading-relaxed text-slate-400">
        {text}
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
      strokeWidth={1.9}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function BoxInIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 12.75V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-5.25M12 3.75v10.5m0 0 3.75-3.75M12 14.25 8.25 10.5"
      />
    </SvgBase>
  )
}

function InkIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.75c-2.25 3-5.25 6.255-5.25 9.375A5.25 5.25 0 0 0 17.25 13.125C17.25 10.005 14.25 6.75 12 3.75Z"
      />
    </SvgBase>
  )
}

function PrinterIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.5V3.75h10.5V7.5m-10.5 9v3.75h10.5V16.5m-12-9h13.5A2.25 2.25 0 0 1 21 9.75v5.25a1.5 1.5 0 0 1-1.5 1.5H18v-3H6v3H4.5A1.5 1.5 0 0 1 3 15V9.75A2.25 2.25 0 0 1 5.25 7.5Z"
      />
    </SvgBase>
  )
}

function TicketIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 5.25h16.5v4.125a2.625 2.625 0 0 0 0 5.25v4.125H3.75v-4.125a2.625 2.625 0 0 0 0-5.25V5.25Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v9" />
    </SvgBase>
  )
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3.75 9h16.5M5.25 4.5h13.5A1.5 1.5 0 0 1 20.25 6v13.5H3.75V6A1.5 1.5 0 0 1 5.25 4.5Z"
      />
    </SvgBase>
  )
}

function PackageIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 7.5 8.25-4.5 8.25 4.5v9L12 21l-8.25-4.5v-9Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 7.5 12 12m0 0 8.25-4.5M12 12v9M8.25 5.25l8.25 4.5"
      />
    </SvgBase>
  )
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25h.008v.008h-.008v-.008Zm.75 2.25v4.5m9-6a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </SvgBase>
  )
}