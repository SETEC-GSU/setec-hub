// Limite apenas para leituras. Não envolva gravações neste helper: uma operação
// de escrita pode ter sido confirmada pelo banco mesmo após a perda da conexão.
export async function leituraComPrazo<T>(
  consulta: PromiseLike<T>,
  mensagem = "A consulta demorou mais que o esperado. Tente novamente; o preenchimento foi mantido.",
  prazoMs = 15_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(consulta),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(mensagem)), prazoMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
