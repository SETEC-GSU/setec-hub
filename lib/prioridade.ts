import { encontrarServico, servicoLegado } from "@/lib/chamados/catalogo";
export type Prioridade = "baixa" | "media" | "alta" | "critica";
type Mapa = { prioridade: Prioridade; sla: number };
// Mantém a assinatura anterior e reconhece IDs e nomes antigos completos.
export function definirPrioridade(categoriaOuServico: string): Mapa {
  const s = encontrarServico(categoriaOuServico) || servicoLegado(categoriaOuServico);
  return s ? { prioridade: s.prioridade, sla: s.sla } : { prioridade: "media", sla: 24 };
}
