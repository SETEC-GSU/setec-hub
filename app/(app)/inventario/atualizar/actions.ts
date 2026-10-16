"use server";
import { salvarInventarioField } from '@/lib/inventario-field-actions';
import type { PayloadInventario } from '@/lib/inventario-field';
// Exportação mantida para compatibilidade com o caminho anterior. O formulário
// completo fornecido usa a mesma operação transacional de salvarInventarioField.
export async function salvarInventario(formData: FormData) {
  const escola = String(formData.get('escola_id') || '');
  const texto = formData.get('payload');
  if (typeof texto !== 'string')
    throw new Error('Reabra o formulário atualizado. O inventário não foi enviado.');
  let payload: PayloadInventario;
  try {
    payload = JSON.parse(texto) as PayloadInventario;
  }
  catch {
    throw new Error('O preenchimento é inválido. Reabra o formulário.');
  }
  const resultado = await salvarInventarioField(escola, payload);
  if (!resultado.ok)
    throw new Error(resultado.mensagem);
}
