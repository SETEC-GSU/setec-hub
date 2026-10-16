"use server";
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase-server';
import type { PayloadInventario, ResultadoInventario } from '@/lib/inventario-field';
export async function salvarInventarioField(escolaId: string, payload: PayloadInventario): Promise<ResultadoInventario> {
  if (!/^[0-9a-f-]{36}$/i.test(escolaId))
    return { ok: false, mensagem: 'Escola inválida. Reabra o inventário.' };
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user)
      return { ok: false, mensagem: 'Sua sessão expirou. Entre novamente; o preenchimento foi mantido nesta aba.' };
    const { data, error } = await supabase.rpc('hub_inventario_salvar', { p_escola_id: escolaId, p_payload: payload });
    if (error) {
      console.error('[Inventário] Falha ao salvar:', error.code, error.message);
      const conhecida = ['P0001', '42501', '40001'].includes(error.code);
      return { ok: false, mensagem: conhecida ? error.message : 'Não foi possível concluir o envio. Seus dados foram mantidos. Tente novamente.', conflito: error.code === '40001' };
    }
    if (!data?.ok)
      return { ok: false, mensagem: 'O envio não foi confirmado. Seus dados foram mantidos.' };
    for (const rota of ['/inventario', '/inventario/atualizar', '/inventario/visao-geral', '/fields/inventario', '/escolas'])
      revalidatePath(rota);
    return { ok: true, id: String(data.id), mensagem: 'Inventário registrado e sincronizado com a Visão Geral.' };
  }
  catch (error) {
    console.error('[Inventário] Falha de conexão:', error);
    return { ok: false, mensagem: 'Não foi possível confirmar o envio. Seus dados foram mantidos. Tente novamente.' };
  }
}
