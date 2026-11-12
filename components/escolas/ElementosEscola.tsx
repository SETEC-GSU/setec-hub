import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { numero, percentual, STATUS_ESCOLA, type CriticidadeEscola } from "@/lib/escolas/modelo"

export const botaoEscola = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-blue-400/50 hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
export const campoEscola = "min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-base text-slate-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
export function SeloEscola({ status }: { status: CriticidadeEscola }) {
  const config = STATUS_ESCOLA[status]
  return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.classe}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: config.cor }}/>{config.label}</span>
}
export function PainelEscola({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`min-w-0 rounded-2xl border border-slate-800 bg-[#080F20] p-4 sm:p-5 ${className}`}>{children}</section>
}
export function EstatisticaEscola({ icone: Icone, label, valor, ajuda, cor = "text-blue-300" }: { icone: LucideIcon; label: string; valor: ReactNode; ajuda?: string; cor?: string }) {
  return <div className="min-w-0 rounded-2xl border border-slate-800 bg-[#080F20] p-4 sm:p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><Icone size={17} aria-hidden="true" className={`shrink-0 ${cor}`}/><span>{label}</span></div><p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{valor}</p>{ajuda && <p className="mt-1 text-xs leading-relaxed text-slate-400">{ajuda}</p>}</div>
}
export function BarraEscola({ valor, cor = "#3b82f6", label }: { valor: number | null; cor?: string; label: string }) {
  return <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor === null ? undefined : Math.round(Math.min(1, Math.max(0, valor)) * 100)} aria-valuetext={valor === null ? "Dados insuficientes" : percentual(valor)} className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${valor === null ? 0 : Math.min(1, Math.max(0, valor)) * 100}%`, background: cor }}/></div>
}
export function MedidorEscola({ valor, titulo, descricao, cor = "#38bdf8" }: { valor: number | null; titulo: string; descricao: string; cor?: string }) {
  const progresso = valor === null ? 0 : Math.min(1, Math.max(0, valor)), circunferencia = 2 * Math.PI * 42
  return <PainelEscola className="flex items-center gap-4"><div className="relative h-24 w-24 shrink-0"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="7"/><circle cx="50" cy="50" r="42" fill="none" stroke={cor} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${progresso * circunferencia} ${circunferencia}`}/></svg><span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">{percentual(valor)}</span></div><div className="min-w-0"><h3 className="text-sm font-semibold text-white">{titulo}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{descricao}</p></div></PainelEscola>
}
export function DadoEscola({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 border-b border-slate-800/80 py-3 last:border-b-0"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium leading-relaxed text-slate-200 [overflow-wrap:anywhere]">{children || "Não informado"}</dd></div>
}
export function ErroEscola({ texto, tentar, carregando }: { texto: string; tentar: () => void; carregando: boolean }) {
  return <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-sm text-amber-100"><AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{texto}</span></div><button onClick={tentar} disabled={carregando} type="button" className={`${botaoEscola} shrink-0`}><RefreshCw size={16} aria-hidden="true"/>Tentar novamente</button></div>
}
export function CarregandoEscolas() {
  return <div role="status" aria-label="Carregando escolas" className="space-y-5 motion-safe:animate-pulse"><div className="h-32 rounded-2xl bg-slate-800/70"/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map(n=><div key={n} className="h-28 rounded-2xl bg-slate-800/60"/>)}</div><div className="h-60 rounded-2xl bg-slate-800/40"/><span className="sr-only">Carregando dados das escolas</span></div>
}
export function QuantidadeEscola({ valor }: { valor: unknown }) { return <>{numero(valor)}</> }
