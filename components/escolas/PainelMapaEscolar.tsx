"use client"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ChevronDown, ChevronUp, Map, MapPin, Maximize2, Minimize2 } from "lucide-react"
import type { EscolaPainel } from "@/lib/escolas/modelo"
import type { VistaMapa } from "@/lib/escolas/mapa"
import { STATUS_ESCOLA } from "@/lib/escolas/modelo"
import { botaoEscola } from "./ElementosEscola"

const Mapa = dynamic(() => import("@/app/(app)/escolas/MapEscolas"), { ssr: false,
  loading: () => <div role="status" className="flex h-full items-center justify-center gap-3 bg-slate-950 text-sm text-slate-400"><Map size={20} aria-hidden="true"/>Carregando mapa…</div> })

export default function PainelMapaEscolar({ escolas, selecionada, selecionar, ficha = false, mostrarPedido = 0 }: {
  escolas: EscolaPainel[]; selecionada?: string | null; selecionar?: (escola: EscolaPainel) => void; ficha?: boolean; mostrarPedido?: number
}) {
  const [aberto, setAberto] = useState(false), [ampliado, setAmpliado] = useState(false), [visivel, setVisivel] = useState(false)
  const secao = useRef<HTMLElement>(null), vista = useRef<{ recorte: string; valor: VistaMapa } | undefined>(undefined), id = useId()
  const chave = `setec:escolas:mapa:${ficha ? "ficha" : "painel"}`
  const mapeadas = useMemo(() => escolas.filter(e => e.ponto), [escolas]), semPonto = escolas.length - mapeadas.length
  const recorte = useMemo(() => mapeadas.map(e => `${e.id}:${e.ponto?.join(",")}`).sort().join("|"), [mapeadas])
  useEffect(() => {
    let preferencia: string | null = null
    try { preferencia = localStorage.getItem(chave) } catch { /* Preferência opcional. */ }
    setAberto(preferencia === null ? window.matchMedia("(min-width: 768px)").matches : preferencia === "aberto")
  }, [chave])
  function alternar() {
    setAberto(atual => {
      const novo = !atual
      try { localStorage.setItem(chave, novo ? "aberto" : "fechado") } catch { /* O botão funciona mesmo sem armazenamento. */ }
      return novo
    })
  }
  useEffect(() => {
    if (!aberto || !secao.current) return
    if (!("IntersectionObserver" in window)) { setVisivel(true); return }
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisivel(true); observer.disconnect() } }, { rootMargin: "180px" })
    observer.observe(secao.current)
    return () => observer.disconnect()
  }, [aberto])
  useEffect(() => {
    if (!mostrarPedido) return
    setAberto(true)
    secao.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
  }, [mostrarPedido])
  const guardarVista = useCallback((nova: VistaMapa) => { vista.current = { recorte, valor: nova } }, [recorte])
  return <section ref={secao} aria-label={ficha ? "Localização da escola" : "Mapa das escolas"} className="isolate min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#080F20]">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300"><Map size={20} aria-hidden="true"/></span><div><h2 className="text-base font-semibold text-white">{ficha ? "Localização da unidade" : "Mapa da rede escolar"}</h2><p className="mt-0.5 text-xs text-slate-400">{mapeadas.length} {mapeadas.length === 1 ? "escola localizada" : "escolas localizadas"}{!ficha && " nos filtros atuais"}{semPonto > 0 && ` · ${semPonto} sem coordenadas válidas`}</p></div></div>
      <div className="flex flex-wrap items-center gap-2">{aberto && mapeadas.length > 0 && <button type="button" className={botaoEscola} onClick={() => setAmpliado(v => !v)} aria-pressed={ampliado}>{ampliado ? <Minimize2 size={16} aria-hidden="true"/> : <Maximize2 size={16} aria-hidden="true"/>}{ampliado ? "Reduzir" : "Ampliar"}</button>}<button type="button" aria-expanded={aberto} aria-controls={`${id}-mapa`} className={botaoEscola} onClick={alternar}>{aberto ? <ChevronUp size={17} aria-hidden="true"/> : <ChevronDown size={17} aria-hidden="true"/>}{aberto ? "Recolher mapa" : "Mostrar mapa"}</button></div>
    </div>
    <div id={`${id}-mapa`} hidden={!aberto}>
      {aberto && <>
        {mapeadas.length > 0 ? <div className={`relative border-y border-slate-800 ${ampliado ? "h-[65dvh] min-h-80 max-h-[760px]" : "h-[330px] sm:h-[420px]"}`}>
          {visivel ? <Mapa escolas={mapeadas} selecionada={selecionada} selecionar={selecionar} vistaInicial={vista.current?.recorte === recorte ? vista.current.valor : undefined} guardarVista={guardarVista}/> : <div className="flex h-full items-center justify-center text-sm text-slate-400">O mapa será carregado ao chegar a esta área.</div>}
        </div> : <div className="flex flex-col items-center gap-2 border-t border-slate-800 p-8 text-center"><MapPin size={25} aria-hidden="true" className="text-slate-500"/><p className="text-sm font-medium text-slate-300">Sem coordenadas válidas neste recorte</p><p className="max-w-md text-xs leading-relaxed text-slate-400">A ficha e os contatos continuam disponíveis. Confira latitude e longitude no cadastro da escola.</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400"><div className="flex flex-wrap gap-x-4 gap-y-2">{Object.entries(STATUS_ESCOLA).map(([key, s]) => <span key={key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.cor }} aria-hidden="true"/>{s.label}</span>)}</div><span>Toque nos grupos para aproximar.</span></div>
      </>}
    </div>
  </section>
}
