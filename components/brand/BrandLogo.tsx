import type { CSSProperties } from "react";
import { MARCA_SETEC, type TomMarca } from "@/lib/brand/identidade";

type Props = {
  variant?: "completa" | "simbolo";
  tone?: TomMarca;
  size?: "large" | "compact";
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
};

/** Mesma assinatura no login e no menu. Nunca distorce ou quebra a linha da URE. */
export default function BrandLogo({
  variant = "completa",
  tone = "escuro",
  size,
  className = "",
  style,
  decorative = false,
}: Props) {
  const simbolo = variant === "simbolo";
  const arquivo = simbolo
    ? tone === "branco" ? "setec-hub-symbol-white.svg" : "setec-hub-symbol.svg"
    : tone === "escuro" ? "setec-hub-logo-horizontal-dark.svg"
    : tone === "branco" ? "setec-hub-logo-white.svg"
    : tone === "monocromatico" ? "setec-hub-logo-monochrome.svg"
    : "setec-hub-logo-horizontal-light.svg";

  return (
    // SVG local com contornos vetoriais: nenhuma fonte ou otimização remota necessária.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/${arquivo}?v=${MARCA_SETEC.versao}`}
      alt={decorative ? "" : "SETEC Hub - URE Guarulhos Sul"}
      aria-hidden={decorative || undefined}
      width={simbolo ? 256 : 1100}
      height={simbolo ? 216 : 224}
      decoding="async"
      draggable={false}
      data-setec-brand={simbolo ? "simbolo" : "completa"}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        maxWidth: size === "large" ? 390 : size === "compact" ? 270 : "100%",
        objectFit: "contain",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
