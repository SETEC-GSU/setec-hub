import { createServerSupabase } from '@/lib/supabase-server';
import InventarioForm from './InventarioForm';
import type { ContextoInventario, EscolaInventario } from '@/lib/inventario-field';
export default async function AtualizarInventario() {
  const supabase = await createServerSupabase();
  const [ctx, resposta] = await Promise.all([supabase.rpc('hub_inventario_contexto'), supabase.rpc('hub_inventario_escola')]);
  if (ctx.error || resposta.error || !ctx.data || !resposta.data) {
    console.error('[Inventário] Erro ao carregar atualização:', ctx.error || resposta.error);
    return <div className="space-y-5">
      <h1 className="text-3xl font-bold text-white">Atualizar Inventário</h1>
      <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">{resposta.error?.code === 'P0001' || resposta.error?.code === '42501' ? resposta.error.message : 'Não foi possível carregar o inventário. Verifique sua sessão e tente novamente.'}</div>
      <a href="/inventario" className="inline-flex min-h-11 items-center rounded-xl border border-slate-700 px-4 text-sm text-slate-200">Voltar ao inventário</a>
    </div>;
  }
  const escola = resposta.data as EscolaInventario, contexto = ctx.data as ContextoInventario;
  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <div>
      <a href="/inventario" className="mb-4 inline-flex min-h-11 items-center text-sm text-slate-400 hover:text-white">← Inventário da escola</a>
      <h1 className="text-3xl font-bold text-white">Atualizar Inventário</h1>
      <p className="mt-2 text-sm text-slate-400">Unidade vinculada: <strong className="text-slate-100">{escola.nome}</strong>
      </p>
    </div>
    <InventarioForm escola={escola} contexto={contexto} />
  </div>;
}
