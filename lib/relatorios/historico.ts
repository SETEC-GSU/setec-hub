import type { SupabaseClient } from "@supabase/supabase-js";
import { leituraComPrazo } from "./consulta";

// Acervo completo em páginas estáveis. Uma falha não substitui o histórico por
// uma lista parcial; o chamador só aplica o resultado depois da última página.
export async function carregarHistoricoCompleto<T>(supabase: SupabaseClient,
  tabela: "pareceres_tecnicos" | "relatorios_redes", selecao: string,
  proprietario?: { authUserId: string; email: string }) {
  const resultado: T[] = []; const ids = new Set<string>(); const tamanho = 500;
  let inicio = 0, total: number | null = null;
  for (;;) {
    let query = supabase.from(tabela).select(selecao, { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false });
    if (proprietario) {
      const email = proprietario.email.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      query = query.or(`created_by_auth.eq.${proprietario.authUserId},tecnico_email.eq."${email}"`);
    }
    const controller = new AbortController();
    let resposta;
    try {
      resposta = await leituraComPrazo(query.range(inicio, inicio + tamanho - 1).abortSignal(controller.signal),
        "A consulta do histórico demorou. Tente atualizar novamente; o formulário e os registros já carregados foram mantidos.");
    } finally {
      controller.abort();
    }
    const { data, error, count } = resposta;
    if (error) throw error;
    if (total === null && count !== null) total = count;
    if (total !== null && count !== null && total !== count) throw new Error("O histórico mudou durante a consulta. Atualize novamente para carregar o acervo completo.");
    const linhas = (data || []) as unknown as Array<T & { id: string }>;
    for (const linha of linhas) {
      if (ids.has(String(linha.id))) throw new Error("O histórico mudou durante a consulta. Atualize novamente para carregar o acervo completo.");
      ids.add(String(linha.id)); resultado.push(linha);
    }
    inicio += linhas.length;
    if (total !== null && inicio === total) return resultado;
    if (!linhas.length) {
      if (total !== null && inicio < total) throw new Error("O histórico ficou incompleto. Atualize novamente.");
      return resultado;
    }
    if (total === null && linhas.length < tamanho) return resultado;
  }
}
