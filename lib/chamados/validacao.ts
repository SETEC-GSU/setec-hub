import { encontrarServico, type OrigemChamado, type ServicoChamado } from "./catalogo";
import { descricaoSoModelo } from "./modelosDescricao";
export type PedidoChamado = { origem: OrigemChamado; servicoId: string; titulo: string; nome: string; unidade: string; ambiente: string; descricao: string; respostas: Record<string, string> };
export function validarPedido(p: PedidoChamado) {
  if (!["escola", "ure"].includes(p.origem)) return "Origem inválida.";
  const s = encontrarServico(p.servicoId, p.origem);
  if (!s) return "Selecione uma solicitação válida para esta origem.";
  if (p.titulo.trim().length < 4 || p.titulo.length > 120) return "Informe um título entre 4 e 120 caracteres.";
  if (p.nome.trim().length < 3 || p.nome.length > 120) return "Informe o nome do solicitante, com até 120 caracteres.";
  if (p.unidade.trim().length < (p.origem === "escola" ? 3 : 2) || p.unidade.length > 160) return p.origem === "escola" ? "Informe a unidade escolar." : "Informe o setor solicitante.";
  if (p.ambiente.length > 160) return "O local / ambiente deve ter até 160 caracteres.";
  if (p.descricao.trim().length < 15 || p.descricao.length > 30000) return "Descreva sua necessidade entre 15 e 30.000 caracteres.";
  if (descricaoSoModelo(p.servicoId, p.descricao, p.origem)) return "Preencha os tópicos do roteiro na descrição; o modelo ainda está sem respostas.";
  if (!p.respostas || typeof p.respostas !== "object" || Array.isArray(p.respostas)) return "As informações da solicitação são inválidas.";
  if (Object.keys(p.respostas).some(k => !s.campos.some(c => c.id === k))) return "Há informações de outro assunto. Selecione novamente a solicitação.";
  for (const campo of s.campos) {
    const valor = p.respostas[campo.id] ?? "";
    if (typeof valor !== "string" || valor.length > 2000) return `Confira o campo “${campo.label}” (até 2.000 caracteres).`;
    if (!valor.trim() && campo.opcional) continue;
    if (!valor.trim()) return `Preencha “${campo.label}”.`;
    if (campo.tipo === "select" && !campo.opcoes?.includes(valor)) return `Selecione uma opção válida em “${campo.label}”.`;
    if (campo.tipo === "number" && (!/^\d+$/.test(valor) || Number(valor) < 1 || Number(valor) > 10000)) return `Informe uma quantidade inteira entre 1 e 10.000 em “${campo.label}”.`;
    if (campo.tipo === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(Date.parse(valor)) || new Date(valor + "T12:00:00Z").toISOString().slice(0, 10) !== valor)) return `Informe uma data válida em “${campo.label}”.`;
    if (!campo.tipo || ["text", "textarea"].includes(campo.tipo)) if (valor.trim().length < 3) return `Detalhe “${campo.label}” com pelo menos 3 caracteres.`;
  }
  return null;
}
export function dadosDoPedido(p: PedidoChamado, s: ServicoChamado) {
  const respostas = Object.fromEntries(s.campos.filter(c => p.respostas[c.id]?.trim()).map(c => [c.id, p.respostas[c.id].trim()]));
  const complemento = s.campos.filter(c => respostas[c.id]).map(c => `${c.label}: ${respostas[c.id]}`).join("\n");
  return { descricao: [p.descricao.trim(), p.ambiente.trim() && `Local / ambiente: ${p.ambiente.trim()}`, complemento && `Informações da solicitação:\n${complemento}`].filter(Boolean).join("\n\n"),
    dados: { versao: 1, servico_id: s.id, respostas, ambiente: p.ambiente.trim() } };
}
