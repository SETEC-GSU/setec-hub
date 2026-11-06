"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { URL_PAINEL_PLENO, validarUrlPainelPleno } from "@/lib/fields/painel-pleno"
import styles from "./PainelPlenoIframe.module.css"

type PainelPlenoIframeProps = { url?: string }

function Icone({ tipo }: { tipo: "abrir" | "ampliar" | "reduzir" | "atualizar" }) {
  const desenhos: Record<typeof tipo, ReactNode> = {
    abrir: <><path d="M14 3h7v7m0-7-11 11"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>,
    ampliar: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
    reduzir: <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>,
    atualizar: <><path d="M20 4v6h-6M4 20v-6h6"/><path d="M6 7a7 7 0 0 1 11-2l3 5M4 14l3 5a7 7 0 0 0 11-2"/></>,
  }
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{desenhos[tipo]}</svg>
}

/**
 * Exibe o aplicativo publicado, sem copiar dados, compartilhar a sessão do Hub
 * ou adicionar consultas periódicas. A autorização do Google continua no Google.
 */
export default function PainelPlenoIframe({ url }: PainelPlenoIframeProps) {
  const container = useRef<HTMLElement>(null)
  const botaoAmpliar = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [reload, setReload] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [demorado, setDemorado] = useState(false)
  const [telaCheia, setTelaCheia] = useState(false)
  const [ampliado, setAmpliado] = useState(false)
  const [alternando, setAlternando] = useState(false)
  const source = validarUrlPainelPleno(url ?? process.env.NEXT_PUBLIC_PAINEL_PLENO_URL ?? URL_PAINEL_PLENO)
  const expandido = telaCheia || ampliado

  useEffect(() => {
    setCarregando(Boolean(source))
    setDemorado(false)
    if (!source) return
    // O aviso nunca cobre o iframe: a autorização Google precisa ficar acessível.
    timer.current = setTimeout(() => {
      setCarregando(false)
      setDemorado(true)
    }, 15_000)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
  }, [source, reload])

  useEffect(() => {
    const conferir = () => setTelaCheia(document.fullscreenElement === container.current)
    document.addEventListener("fullscreenchange", conferir)
    return () => document.removeEventListener("fullscreenchange", conferir)
  }, [])

  useEffect(() => {
    if (!ampliado) return
    const elemento = container.current
    const focoAnterior = document.activeElement
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    botaoAmpliar.current?.focus()
    const escapar = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setAmpliado(false) }
    }
    const manterFoco = () => {
      if (elemento && !elemento.contains(document.activeElement)) botaoAmpliar.current?.focus()
    }
    document.addEventListener("keydown", escapar, true)
    document.addEventListener("focusin", manterFoco)
    return () => {
      document.body.style.overflow = overflowAnterior
      document.removeEventListener("keydown", escapar, true)
      document.removeEventListener("focusin", manterFoco)
      if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) focoAnterior.focus()
    }
  }, [ampliado])

  function carregou() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setCarregando(false)
    setDemorado(false)
    // onLoad também pode ocorrer em páginas de login/erro do Google.
    // Por isso não o usamos para afirmar que o acesso foi autorizado.
  }

  async function alternarTela() {
    if (alternando || !source) return
    if (ampliado) { setAmpliado(false); return }
    setAlternando(true)
    try {
      if (document.fullscreenElement === container.current) {
        await document.exitFullscreen()
        setTelaCheia(false)
      } else if (container.current?.requestFullscreen) {
        try { await container.current.requestFullscreen() }
        catch { setAmpliado(true) }
      } else {
        // Alternativa para dispositivos que não oferecem tela cheia nativa.
        setAmpliado(true)
      }
    } catch {
      // Mantém o painel utilizável se o navegador recusar a operação nativa.
      if (document.fullscreenElement !== container.current) setAmpliado(true)
    } finally {
      setAlternando(false)
    }
  }

  function atualizar() {
    setCarregando(true)
    setDemorado(false)
    // Recria somente o iframe ao clicar. Ampliar/reduzir preserva o documento.
    setReload(value => value + 1)
  }

  return (
    <section
      ref={container}
      className={`${styles.frame} ${ampliado ? styles.expanded : ""}`}
      aria-label="Painel de Atividades Pleno"
      role={ampliado ? "dialog" : undefined}
      aria-modal={ampliado ? true : undefined}
    >
      <div className={styles.toolbar}>
        <span className={styles.status} role="status">
          <span className={carregando && source ? styles.spinner : styles.dot}/>
          {carregando && source ? "Carregando o painel…" : "Visualização incorporada"}
        </span>
        <div className={styles.actions}>
          {source && <a href={source} target="_blank" rel="noopener noreferrer" className={styles.open} title="Abrir o painel em outra aba"><Icone tipo="abrir"/><span>Abrir painel</span></a>}
          <button ref={botaoAmpliar} type="button" onClick={() => void alternarTela()} disabled={!source || alternando} aria-pressed={expandido} aria-label={expandido ? "Sair da visualização ampliada" : "Ampliar painel"} title={expandido ? "Sair da visualização ampliada" : "Ampliar painel"}><Icone tipo={expandido ? "reduzir" : "ampliar"}/><span>{expandido ? "Reduzir" : "Ampliar"}</span></button>
          <button type="button" onClick={atualizar} disabled={!source} title="Recarregar o painel incorporado"><Icone tipo="atualizar"/><span>Atualizar</span></button>
        </div>
      </div>
      {demorado && <p className={styles.notice} role="status">Se o painel continuar em branco, use <strong>Abrir painel</strong> para conferir o acesso com sua conta Google. Depois, volte e clique em Atualizar.</p>}
      <div className={styles.content}>
        {source ? <iframe
          key={`${source}-${reload}`}
          src={source}
          title="Painel de Atividades Pleno — indicadores e relatórios"
          allow="fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={carregou}
        /> : <div className={styles.unavailable} role="alert"><strong>O endereço do painel não está disponível.</strong><p>Entre em contato com a SETEC para conferir a configuração.</p></div>}
      </div>
      {source && <details className={styles.help}>
        <summary>Problemas para abrir o painel?</summary>
        <p>O acesso ao painel também depende da sua conta Google e da permissão na planilha. Use <a href={source} target="_blank" rel="noopener noreferrer">Abrir painel em outra aba</a>, confira a conta e conclua a autorização quando solicitada. Depois, volte ao Hub e clique em <strong>Atualizar</strong>.</p>
      </details>}
    </section>
  )
}
