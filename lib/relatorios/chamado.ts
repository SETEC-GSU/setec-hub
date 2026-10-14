import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChamadoFieldVinculo } from "./types";
import { leituraComPrazo } from "./consulta";

export const PREFIXO_CHAMADO = "STI-26/";

export function erroFormatoChamado(value: string, obrigatorio = true): string | null {
  const texto = value.trim();
  if (!texto) return obrigatorio ? "O número do chamado é obrigatório. Informe STI-26/ seguido do identificador." : null;
  if (!texto.startsWith(PREFIXO_CHAMADO)) return "Corrija o início do chamado para STI-26/. Exemplo: STI-26/0000.";
  if (!/^STI-26\/[^\s]+$/.test(texto)) return "Informe o identificador após STI-26/ e retire espaços dentro do número.";
  if (texto.length > 120) return "O número do chamado deve ter até 120 caracteres.";
  return null;
}

export async function validarChamadoNaBase(supabase: SupabaseClient, value: string): Promise<ChamadoFieldVinculo> {
  const erro = erroFormatoChamado(value);
  if (erro) throw new Error(erro);
  const controller = new AbortController();
  let resposta;
  try {
    resposta = await leituraComPrazo(supabase.rpc("hub_relatorios_buscar_chamado", { p_busca: value.trim() }).abortSignal(controller.signal),
      "A validação do chamado demorou. Tente novamente; nenhum relatório foi enviado e seu preenchimento foi mantido.");
  } finally {
    controller.abort();
  }
  const { data, error } = resposta;
  if (error) throw new Error("Não foi possível validar o chamado na base FIELD. " + error.message);
  const resultados = Array.isArray(data) ? data as ChamadoFieldVinculo[] : [];
  const encontrado = resultados.find(r => r.chamado === value.trim().toUpperCase());
  if (!encontrado) throw new Error("Chamado não localizado em fields_visitas.chamado. Confira o número ou solicite a atualização da base FIELD. Seu preenchimento foi mantido.");
  return encontrado;
}

export function nomeNormalizado(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
