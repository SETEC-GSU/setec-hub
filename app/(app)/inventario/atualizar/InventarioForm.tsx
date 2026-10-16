"use client";
import InventarioEditor from '@/components/inventario/InventarioEditor';
import { salvarInventarioField } from '@/lib/inventario-field-actions';
import type { ContextoInventario, EscolaInventario } from '@/lib/inventario-field';
export default function InventarioForm({ escola, contexto }: {
  escola: EscolaInventario;
  contexto: ContextoInventario;
}) {
  return <InventarioEditor escola={escola} contexto={contexto} onSalvar={payload => salvarInventarioField(escola.id, payload)} onSucesso={() => { window.location.href = '/inventario'; }} onRecarregar={() => window.location.reload()} />;
}
