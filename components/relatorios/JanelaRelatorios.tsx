"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import styles from "./JanelaRelatorios.module.css";

let janelasAbertas = 0;
let overflowOriginal = "";

type Props = {
  tituloId: string;
  descricaoId?: string;
  tamanho?: "historico" | "gestao" | "retorno" | "compacto";
  onFechar: () => void;
  children: ReactNode;
};

export default function JanelaRelatorios({
  tituloId,
  descricaoId,
  tamanho = "historico",
  onFechar,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const inicioFora = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const origem = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    dialog.showModal();
    dialog.focus({ preventScroll: true });
    if (janelasAbertas++ === 0) {
      overflowOriginal = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      dialog.close();
      if (--janelasAbertas === 0) document.body.style.overflow = overflowOriginal;
      requestAnimationFrame(() => {
        const outraJanela = document.querySelector("dialog[open]");
        if (origem?.isConnected && (!outraJanela || outraJanela.contains(origem))) {
          origem.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  function foraDoConteudo(event: PointerEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  }

  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      aria-describedby={descricaoId}
      tabIndex={-1}
      className={styles.dialog}
      data-tamanho={tamanho}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onFechar();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const focaveis = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
        )).filter((elemento) => elemento.getClientRects().length > 0);
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (!primeiro || !ultimo) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (document.activeElement === primeiro || document.activeElement === dialog)) {
          event.preventDefault();
          ultimo.focus();
        } else if (!event.shiftKey && (document.activeElement === ultimo || document.activeElement === dialog)) {
          event.preventDefault();
          primeiro.focus();
        }
      }}
      onPointerDown={(event) => { inicioFora.current = foraDoConteudo(event); }}
      onPointerUp={(event) => {
        if (inicioFora.current && foraDoConteudo(event)) onFechar();
        inicioFora.current = false;
      }}
    >
      {children}
    </dialog>
  );
}
