export const ORIENTACAO_COPIA_MANUAL =
  "Use Selecionar texto e copie com Ctrl+C (Windows/Linux) ou ⌘C (Mac). No celular, toque e segure o texto e escolha Copiar.";

export function selecionarTextoParaCopia(
  campo: HTMLTextAreaElement | null,
): boolean {
  if (!campo?.isConnected || campo.disabled) return false;

  try {
    campo.focus({ preventScroll: true });
    campo.select();
    campo.setSelectionRange(0, campo.value.length);
    return campo.selectionStart === 0 && campo.selectionEnd === campo.value.length;
  } catch {
    return false;
  }
}

/** Copia o texto sem alterá-lo e mantém a seleção quando a cópia é bloqueada. */
export async function copiarTextoComAlternativa(
  texto: string,
  campo: HTMLTextAreaElement | null,
): Promise<boolean> {
  if (!texto.trim() || typeof navigator === "undefined") return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // A API pode existir e ainda assim ser bloqueada pelo navegador.
  }

  // Usa o campo visível do modal; continua funcionando dentro de um dialog.
  // O campo fica somente leitura durante a cópia, sem perder a seleção.
  if (campo?.value !== texto || !selecionarTextoParaCopia(campo)) return false;

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}
