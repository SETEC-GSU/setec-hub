"use client"

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import styles from "./ModalSaresp.module.css"

export default function ModalSaresp({ title, onClose, children, maxWidth }: {
  title: string; onClose: () => void; children: ReactNode; maxWidth: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (anterior?.isConnected) anterior.focus({ preventScroll: true })
    }
  }, [])
  if (typeof document === "undefined") return null
  const larguras: Record<string, string> = { "max-w-2xl": "46rem", "max-w-3xl": "54rem", "max-w-4xl": "64rem", "max-w-5xl": "72rem", "max-w-6xl": "80rem", "max-w-7xl": "88rem" }
  return createPortal(
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}
      style={{ "--largura-modal-saresp": larguras[maxWidth] || "72rem" } as CSSProperties}
      onCancel={event => { event.preventDefault(); closeRef.current() }}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>SETEC Hub · SARESP Digital</span><h2 id={titleId}>{title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Fechar janela" className={styles.close}>×</button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>, document.body,
  )
}
