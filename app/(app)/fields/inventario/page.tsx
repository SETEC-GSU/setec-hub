import { getUser } from '@/lib/getUser';
import InventarioFieldClient from '@/components/inventario/InventarioFieldClient';
export const dynamic = 'force-dynamic';
export default async function InventarioFieldPage() {
  const user = await getUser();
  if (!user || !['field', 'admin', 'seintec', 'dirigente'].includes(user.role))
    return <div className="rounded-2xl border border-slate-700 p-6 text-slate-300">Seu perfil não possui acesso ao Inventário Field.</div>;
  return <InventarioFieldClient />;
}
