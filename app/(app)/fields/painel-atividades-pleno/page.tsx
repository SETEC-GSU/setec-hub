import Link from "next/link"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/getUser"
import { canAccess } from "@/lib/canAccess"
import PainelPlenoIframe from "@/components/PainelPlenoIframe"
import {
  PERMISSAO_PAINEL_PLENO,
  ROTA_PAINEL_PLENO,
  URL_PAINEL_PLENO,
} from "@/lib/fields/painel-pleno"

export const dynamic = "force-dynamic"
export const metadata = { title: "Painel de Atividades Pleno | SETEC Hub" }

export default async function PainelAtividadesPlenoPage() {
  let user
  try {
    user = await getUser()
  } catch {
    // Falha temporária não é tratada como logout e não remove a sessão.
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-[#020617] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Fields</p>
        <h1 className="mt-3 text-2xl font-bold text-white">Painel de Atividades Pleno</h1>
        <p role="alert" className="mt-4 text-sm leading-7 text-slate-300">
          Não foi possível conferir seu acesso agora. Tente novamente em instantes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={ROTA_PAINEL_PLENO} prefetch={false} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
            Tentar novamente
          </Link>
          <Link href="/fields" prefetch={false} className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200">
            Voltar para Fields
          </Link>
        </div>
      </section>
    )
  }

  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(ROTA_PAINEL_PLENO)}`)
  if (!canAccess(user.role as Parameters<typeof canAccess>[0], PERMISSAO_PAINEL_PLENO)) redirect("/")

  const url = process.env.NEXT_PUBLIC_PAINEL_PLENO_URL?.trim() || URL_PAINEL_PLENO

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Fields · acompanhamento</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-100 sm:text-3xl">
            Painel de Atividades Pleno
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
            Indicadores, atividades e relatórios do analista pleno em um só lugar.
          </p>
        </div>
        <Link href="/fields" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14"/></svg>
          Voltar para Fields
        </Link>
      </header>
      <PainelPlenoIframe url={url}/>
    </section>
  )
}
