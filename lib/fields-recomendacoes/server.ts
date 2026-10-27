import "server-only";
import { createServerSupabase } from "@/lib/supabase-server";
import { canAccess } from "@/lib/canAccess";
import type { BaseRecomendacoes } from "./types";

export class ErroAssistente extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function carregarBaseServidor(signal: AbortSignal): Promise<BaseRecomendacoes> {
  const supabase = await createServerSupabase();
  const { data: { user }, error: erroAuth } = await supabase.auth.getUser();
  if (!user || erroAuth) throw new ErroAssistente(erroAuth && erroAuth.status !== 401 && erroAuth.status !== 403 ? "Não foi possível conferir a sessão. Tente novamente." : "Entre no sistema para consultar o assistente.", erroAuth && erroAuth.status !== 401 && erroAuth.status !== 403 ? 503 : 401);
  const { data: perfil, error } = await supabase.from("usuarios").select("role").eq("id", user.id).abortSignal(signal).maybeSingle();
  if (error) throw new ErroAssistente("Não foi possível conferir o seu perfil. Tente novamente.", 503);
  if (!perfil || !canAccess(perfil.role as Parameters<typeof canAccess>[0], "fields.recomendacoes.view")) throw new ErroAssistente("Seu perfil não possui acesso ao Assistente de Atendimentos.", 403);
  const resposta = await supabase.rpc("hub_fields_recomendacoes_base").abortSignal(signal);
  if (resposta.error) {
    const e = resposta.error;
    if (e.code === "42501") throw new ErroAssistente("Seu perfil não possui acesso ao assistente.", 403);
    if (e.code === "PGRST202" || e.code === "42883") throw new ErroAssistente("A atualização da base do assistente ainda precisa ser aplicada pela administração.", 503);
    if (e.code === "54000") throw new ErroAssistente("O volume da base ativa excedeu o limite desta consulta. A gestão precisa revisar os registros.", 422);
    throw new ErroAssistente("Não foi possível consultar todos os dados. Tente atualizar novamente.", 503);
  }
  const base = resposta.data as BaseRecomendacoes | null;
  if (!base || base.versao !== 1 || base.perfil?.usuarioId !== user.id || !Array.isArray(base.escolas)
    || !Array.isArray(base.demandas) || !Array.isArray(base.chamados) || !Array.isArray(base.tecnicos) || !base.hoje || !base.qualidade) {
    throw new ErroAssistente("A consulta retornou uma base incompatível. Atualize a página ou contate a gestão.", 503);
  }
  return base;
}
