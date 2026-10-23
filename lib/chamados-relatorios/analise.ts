import { classificacaoChamado } from "@/lib/chamados/catalogo";
import { diaSaoPaulo } from "./periodos";
import type { AnaliseHub, ChamadoHub, FiltrosHub, GrupoHub, OpcoesHub, PontoHub, RegistroHub } from "./types";

export const normalizar = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
export function normalizarStatus(v: unknown) {
  const s = normalizar(v).replaceAll(" ", "_");
  return s === "encerrado" ? "fechado" : s === "cancelada" ? "cancelado" : s || "aberto";
}
export const atendido = (s: string) => ["resolvido", "fechado"].includes(s);
export const ativo = (s: string) => ["aberto", "assumido", "em_atendimento"].includes(s);
export function statusLabel(s: string) {
  return ({ aberto: "Aberto", assumido: "Assumido", em_atendimento: "Em atendimento", resolvido: "Resolvido", fechado: "Fechado", cancelado: "Cancelado", cancelada: "Cancelado", atendidos: "Atendidos", ativos: "Ativos", todos: "Todos", outros: "Outros" } as Record<string, string>)[s] || s;
}
export const prioridadeLabel = (p: string) => ({ critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa", nao_informada: "Não informada" } as Record<string, string>)[p] || p;
export function dataValida(v: string | null | undefined) { return Boolean(v && Number.isFinite(Date.parse(v))); }
export function dataConclusao(r: ChamadoHub) {
  // Resolução é a primeira conclusão. Fechar administrativamente depois não
  // move um atendimento já resolvido para outro mês.
  return dataValida(r.resolved_at) ? r.resolved_at : dataValida(r.closed_at) ? r.closed_at : null;
}
export function unidadeChamado(r: Pick<ChamadoHub, "origem" | "setor" | "escola">) {
  const origem = normalizar(r.origem);
  if (["ure", "sede"].includes(origem)) return `URE · ${r.setor?.trim() || "Setor não informado"}`;
  if (origem === "escola") return `Escola · ${r.escola?.trim() || "Escola não informada"}`;
  return r.escola?.trim() || r.setor?.trim() || "Unidade não informada";
}
export function opcoesDaPagina(registros: (Pick<ChamadoHub, "categoria" | "origem" | "setor" | "escola" | "analista_responsavel"> & { subcategoria?: string | null; servico_id?: string | null })[], usuarios: { id: string; nome: string | null }[]): OpcoesHub {
  const nomes = new Map(usuarios.map(u => [u.id, u.nome]));
  const ordenar = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return {
    responsaveis: [...new Set(registros.map(r => r.analista_responsavel).filter((v): v is string => Boolean(v)))].map(valor => ({ valor, label: nomes.get(valor) || `Responsável ${valor.slice(0, 8)}` })).sort((a, b) => ordenar(a.label, b.label)),
    unidades: [...new Set(registros.map(unidadeChamado))].sort(ordenar).map(valor => ({ valor, label: valor })),
    categorias: [...new Set(registros.map(r => classificacaoChamado(r).categoria))].sort(ordenar),
    origens: [...new Set(registros.map(r => r.origem?.trim().toUpperCase() || "OUTROS"))].sort(ordenar),
  };
}
export function prepararRegistros(rows: ChamadoHub[], nomes: Map<string, string>, f: FiltrosHub): RegistroHub[] {
  const termo = normalizar(f.busca);
  return rows.flatMap(r => {
    const classificacao = classificacaoChamado(r), statusPainel = normalizarStatus(r.status), conclusao = dataConclusao(r);
    if (f.referencia === "conclusao" && (!atendido(statusPainel) || !conclusao)) return [];
    if (f.status === "atendidos" && !atendido(statusPainel)) return [];
    if (f.status === "ativos" && !ativo(statusPainel)) return [];
    if (f.status === "outros" && (ativo(statusPainel) || atendido(statusPainel))) return [];
    if (!["todos", "atendidos", "ativos", "outros"].includes(f.status) && statusPainel !== f.status) return [];
    if (f.responsavel === "__sem_responsavel__" ? Boolean(r.analista_responsavel) : Boolean(f.responsavel && r.analista_responsavel !== f.responsavel)) return [];
    const origemPainel = r.origem?.trim().toUpperCase() || "OUTROS", unidadePainel = unidadeChamado(r);
    const prioridadePainel = normalizar(r.prioridade) || "nao_informada";
    if (f.unidade && normalizar(unidadePainel) !== normalizar(f.unidade)) return [];
    if (f.categoria && normalizar(classificacao.categoria) !== normalizar(f.categoria)) return [];
    if (f.origem && normalizar(origemPainel) !== normalizar(f.origem)) return [];
    if (f.prioridade && prioridadePainel !== f.prioridade) return [];
    const responsavelNome = r.analista_responsavel ? nomes.get(r.analista_responsavel) || `Responsável ${r.analista_responsavel.slice(0, 8)} (cadastro indisponível)` : "Sem responsável";
    if (termo && !normalizar([r.codigo, r.titulo, r.descricao, r.retorno_devolutivo, r.solicitante_nome, responsavelNome, unidadePainel, classificacao.categoria, classificacao.assunto].join(" ")).includes(termo)) return [];
    const referencia = f.referencia === "conclusao" ? conclusao : r.created_at;
    if (!dataValida(referencia)) return [];
    const dataReferencia = diaSaoPaulo(new Date(referencia!));
    if (dataReferencia < f.inicio || dataReferencia > f.fim) return [];
    return [{ ...r, responsavelNome, categoriaPainel: classificacao.categoria, assuntoPainel: classificacao.assunto,
      unidadePainel, dataReferencia, conclusao, statusPainel, origemPainel, prioridadePainel, outraSolicitacao: classificacao.outra }];
  }).sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia) || a.id.localeCompare(b.id));
}
function agrupar(rows: RegistroHub[], nome: (r: RegistroHub) => string, chave = nome): GrupoHub[] {
  const mapa = new Map<string, GrupoHub>();
  for (const r of rows) {
    const key = normalizar(chave(r)), g = mapa.get(key) || { chave: key, nome: nome(r), total: 0, atendidos: 0, ativos: 0, outros: 0 };
    g.total++; if (atendido(r.statusPainel)) g.atendidos++; else if (ativo(r.statusPainel)) g.ativos++; else g.outros++;
    mapa.set(key, g);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
}
const TEMAS = [
  { nome: "Conectividade e infraestrutura", regex: /\b(internet|rede|wifi|wi-fi|switch|link|vpn|cabeamento|ramal)\b/ },
  { nome: "Equipamentos e periféricos", regex: /\b(notebook|computador|monitor|teclado|mouse|impressora|toner|hardware|bateria)\b/ },
  { nome: "Sistemas e permissões", regex: /\b(portalnet|sed|sistema|acesso|senha|login|perfil|software|instalacao)\b/ },
  { nome: "Reuniões e eventos", regex: /\b(teams|reuniao|evento|projetor|emprestimo|videoconferencia)\b/ },
  { nome: "Inventário e patrimônio", regex: /\b(inventario|patrimonio|tombamento|levantamento|movimentacao)\b/ },
];
export function analisarHub(rows: RegistroHub[], f: FiltrosHub, agora = new Date()): AnaliseHub {
  const concluidos = rows.filter(r => atendido(r.statusPainel)), ativos = rows.filter(r => ativo(r.statusPainel));
  const amostra: number[] = []; let datasInconsistentes = 0;
  for (const r of concluidos) if (dataValida(r.created_at) && r.conclusao) {
    const h = (Date.parse(r.conclusao) - Date.parse(r.created_at!)) / 3_600_000;
    if (h >= 0 && Date.parse(r.conclusao) <= agora.getTime()) amostra.push(h); else datasInconsistentes++;
  }
  amostra.sort((a, b) => a - b);
  const meio = Math.floor(amostra.length / 2), arredondar = (n: number) => Math.round(n * 100) / 100;
  const porResponsavel = agrupar(rows, r => r.responsavelNome, r => r.analista_responsavel || "__sem_responsavel__");
  const porCategoria = agrupar(rows, r => r.categoriaPainel), meses = agrupar(rows, r => r.dataReferencia.slice(0, 7));
  const porMes: GrupoHub[] = [], data = new Date(f.inicio.slice(0, 7) + "-01T12:00:00Z");
  while (data.toISOString().slice(0, 7) <= f.fim.slice(0, 7)) {
    const nome = data.toISOString().slice(0, 7);
    porMes.push(meses.find(g => g.nome === nome) || { chave: nome, nome, total: 0, atendidos: 0, ativos: 0, outros: 0 });
    data.setUTCMonth(data.getUTCMonth() + 1);
  }
  const semDescricao = rows.filter(r => !r.descricao?.trim()), semRetorno = concluidos.filter(r => !r.retorno_devolutivo?.trim());
  const semResponsavel = rows.filter(r => !r.analista_responsavel), outras = rows.filter(r => r.outraSolicitacao);
  const conclusoesSemData = concluidos.filter(r => !r.conclusao).length;
  const id = (rs: RegistroHub[]) => rs.slice(0, 5).map(r => r.codigo || `Registro ${r.id}`);
  const pontos: PontoHub[] = [];
  if (semRetorno.length || semDescricao.length) pontos.push({ nivel: "atencao", titulo: "Completar pedidos e devolutivas",
    evidencia: `${semRetorno.length} atendidos sem retorno devolutivo e ${semDescricao.length} chamados sem descrição no recorte.`,
    direcao: "Conferir os registros e documentar o procedimento e seu resultado para permitir acompanhamento e consulta futura.", chamados: id([...semRetorno, ...semDescricao]) });
  if (outras.length) pontos.push({ nivel: "atencao", titulo: "Revisar solicitações classificadas como outras",
    evidencia: `${outras.length} de ${rows.length} chamados foram classificados como outras solicitações.`,
    direcao: "Verificar os pedidos e orientar a escolha do serviço adequado; usar recorrências confirmadas para revisar o catálogo.", chamados: id(outras) });
  if (ativos.length) pontos.push({ nivel: "atencao", titulo: "Acompanhar chamados que permanecem ativos",
    evidencia: `${ativos.length} chamados do recorte estão abertos, assumidos ou em atendimento no momento da extração.`,
    direcao: "Revisar os responsáveis e a situação atual, alinhar os próximos passos e comunicar o solicitante. O recorte não representa todo o estoque do sistema.", chamados: id(ativos) });
  if (semResponsavel.length) pontos.push({ nivel: "atencao", titulo: "Conferir a identificação do responsável",
    evidencia: `${semResponsavel.length} chamados no recorte não possuem analista responsável vinculado.`,
    direcao: "Conferir o vínculo no cadastro de origem antes de usar o agrupamento por responsável para planejar a distribuição do trabalho.", chamados: id(semResponsavel) });
  if (porCategoria[0]) pontos.push({ nivel: "informativo", titulo: "Avaliar ações para a categoria mais frequente",
    evidencia: `${porCategoria[0].nome} reúne ${porCategoria[0].total} chamados (${(100 * porCategoria[0].total / rows.length).toFixed(1).replace(".", ",")}%) no período filtrado.`,
    direcao: "Conferir pedidos e retornos para avaliar orientações, ações preventivas ou recursos. O volume não demonstra a causa dos problemas.", chamados: id(rows.filter(r => normalizar(r.categoriaPainel) === porCategoria[0].chave)) });
  if (conclusoesSemData || datasInconsistentes) pontos.push({ nivel: "atencao", titulo: "Conferir datas de abertura e conclusão",
    evidencia: `${conclusoesSemData} atendidos sem data válida de conclusão; ${datasInconsistentes} pares inconsistentes foram excluídos do cálculo de tempo.`,
    direcao: "Corrigir os registros de origem. Não usar a última atualização do chamado como data presumida de atendimento.", chamados: id(concluidos.filter(r => !r.conclusao)) });
  if (!rows.length) pontos.push({ nivel: "informativo", titulo: "Sem chamados no recorte", evidencia: "Nenhum chamado corresponde ao período e aos filtros selecionados.", direcao: "Revisar os filtros antes de concluir que não houve atendimentos.", chamados: [] });
  const idades = ativos.filter(r => dataValida(r.created_at) && Date.parse(r.created_at!) <= agora.getTime()).map(r => Math.floor((agora.getTime() - Date.parse(r.created_at!)) / 86_400_000));
  return { total: rows.length, atendidos: concluidos.length, ativos: ativos.length, outros: rows.length - concluidos.length - ativos.length,
    internos: rows.filter(r => ["ure", "sede"].includes(normalizar(r.origem))).length, escolares: rows.filter(r => normalizar(r.origem) === "escola").length,
    escolas: new Set(rows.filter(r => normalizar(r.origem) === "escola" && r.escola?.trim()).map(r => normalizar(r.escola))).size,
    setores: new Set(rows.filter(r => ["ure", "sede"].includes(normalizar(r.origem)) && r.setor?.trim()).map(r => normalizar(r.setor))).size,
    responsaveis: new Set(rows.map(r => r.analista_responsavel).filter(Boolean)).size, semResponsavel: semResponsavel.length,
    semDescricao: semDescricao.length, semRetorno: semRetorno.length, semCodigo: rows.filter(r => !r.codigo?.trim()).length,
    outrasSolicitacoes: outras.length, mediaHoras: amostra.length ? arredondar(amostra.reduce((a, b) => a + b, 0) / amostra.length) : null,
    medianaHoras: amostra.length ? arredondar(amostra.length % 2 ? amostra[meio] : (amostra[meio - 1] + amostra[meio]) / 2) : null,
    amostraTempo: amostra.length, datasInconsistentes, conclusoesSemData, semDataAbertura: rows.filter(r => !dataValida(r.created_at)).length,
    maisAntigoAtivoDias: idades.length ? Math.max(...idades) : null, porResponsavel, porCategoria,
    porUnidade: agrupar(rows, r => r.unidadePainel), porOrigem: agrupar(rows, r => r.origemPainel),
    porPrioridade: agrupar(rows, r => prioridadeLabel(r.prioridadePainel)), porStatus: agrupar(rows, r => statusLabel(r.statusPainel)), porMes,
    temas: TEMAS.map(t => { const pedidos = rows.filter(r => t.regex.test(normalizar(r.descricao))), retornos = rows.filter(r => t.regex.test(normalizar(r.retorno_devolutivo)));
      return { nome: t.nome, pedidos: pedidos.length, retornos: retornos.length, exemplos: [...new Set(id([...pedidos, ...retornos]))].slice(0, 4) }; }), pontos };
}
