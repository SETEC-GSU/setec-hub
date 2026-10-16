import type { AnaliseFields, BaseFields, FiltrosFields, Grupo, PontoAtencao, RegistroFields } from "./types";
import { diaSaoPaulo } from "./periodos";

export const normalizar = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
export const ehURE = (s: unknown) => normalizar(s) === "ure guarulhos sul";
export function statusOperacional(status: string) {
  const s = normalizar(status);
  if (["realizado", "realizada"].includes(s)) return "realizado";
  if (["cancelado", "cancelada"].includes(s)) return "cancelado";
  if (["", "pendente", "pendentes", "em andamento", "agendado", "agendada"].includes(s)) return "aberto";
  return "outro";
}
export function situacaoCentral(r: RegistroFields, cruzar: boolean) {
  if (!cruzar) return "Cruzamento desativado";
  if (!r.chamado || !r.central) return "Sem vínculo com a Central";
  if (r.data_referencia < "2026-09-09") return "Anterior ao marco de 09/09/2026";
  if (statusOperacional(r.status) !== "realizado") return "Sem cobrança: atendimento não realizado";
  if (r.central.automatica) return "Dispensa automática · Outros / Inventário";
  const labels: Record<string, string> = { entregue: "Entregue · finalizado com itens", dispensado: "Dispensa SETEC aprovada",
    rascunho: "Pendente · rascunho", aguardando_aprovacao: "Pendente · aguardando aprovação SETEC", pendente: "Relatório pendente" };
  return labels[r.central.situacao] || "Situação a conferir na Central";
}
function grupos(registros: RegistroFields[], get: (r: RegistroFields) => string): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const r of registros) {
    const nome = get(r) || "Não informado", chave = normalizar(nome);
    const g = mapa.get(chave) || { nome, total: 0, realizados: 0, abertos: 0, cancelados: 0 };
    g.total++;
    const status = statusOperacional(r.status);
    if (status === "realizado") g.realizados++;
    if (status === "aberto") g.abertos++;
    if (status === "cancelado") g.cancelados++;
    mapa.set(chave, g);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
}
const TEMAS = [
  { nome: "Conectividade e internet", regex: /\b(internet|conectividade|wifi|wi-fi|link|operadora|roteador)\b/ },
  { nome: "Rede e infraestrutura", regex: /\b(rede|redes|cabeamento|switch|rack|patch|vlan|ponto de rede|fibra)\b/ },
  { nome: "Equipamentos e hardware", regex: /\b(notebook|notebooks|computador|computadores|desktop|hardware|monitor|teclado|bateria|memoria|disco|impressora)\b/ },
  { nome: "Software e acesso", regex: /\b(software|sistema|windows|linux|programa|senha|login|acesso|formatacao|driver)\b/ },
  { nome: "Garantia e substituição", regex: /\b(garantia|substituicao|substituir|troca|trocar|substituido|substituida)\b/ },
  { nome: "Inventário e patrimônio", regex: /\b(inventario|patrimonio|tombamento|levantamento)\b/ },
];

export function analisarFields(base: BaseFields, filtros: FiltrosFields, agora = new Date()): AnaliseFields {
  const registros = base.registros;
  const realizados = registros.filter(r => statusOperacional(r.status) === "realizado");
  const abertos = registros.filter(r => statusOperacional(r.status) === "aberto");
  const corte = [diaSaoPaulo(agora), filtros.fim].sort()[0];
  const atrasados = abertos.filter(r => r.data_prevista && r.data_prevista < corte);
  const dias: number[] = []; let datasInconsistentes = 0;
  for (const r of realizados) if (r.data_abertura && r.data_finalizacao) {
    const n = (Date.parse(r.data_finalizacao) - Date.parse(r.data_abertura)) / 86_400_000;
    if (Number.isFinite(n) && n >= 0) dias.push(n); else datasInconsistentes++;
  }
  const porMes = grupos(registros, r => r.data_referencia.slice(0, 7));
  const meses: Grupo[] = [];
  const data = new Date(filtros.inicio.slice(0, 7) + "-01T00:00:00Z");
  while (data.toISOString().slice(0, 7) <= filtros.fim.slice(0, 7)) {
    const nome = data.toISOString().slice(0, 7);
    meses.push(porMes.find(g => g.nome === nome) || { nome, total: 0, realizados: 0, abertos: 0, cancelados: 0 });
    data.setUTCMonth(data.getUTCMonth() + 1);
  }
  const temas = TEMAS.map(t => {
    const pedidos = registros.filter(r => t.regex.test(normalizar(r.descricao)));
    const retornos = registros.filter(r => t.regex.test(normalizar(r.resolucao)));
    return { nome: t.nome, pedidos: pedidos.length, retornos: retornos.length,
      exemplos: [...new Set([...pedidos, ...retornos].map(r => r.chamado || `Registro ${r.id}`))].slice(0, 4) };
  });
  let central: AnaliseFields["central"] = null;
  if (filtros.cruzarCentral) {
    const elegiveis = realizados.filter(r => r.chamado && r.central && r.data_referencia >= "2026-09-09");
    const entregues = elegiveis.filter(r => r.central?.situacao === "entregue").length;
    const dispensasAutomaticas = elegiveis.filter(r => r.central?.automatica).length;
    const dispensasManuais = elegiveis.filter(r => !r.central?.automatica && r.central?.situacao === "dispensado").length;
    const exigidos = elegiveis.length - dispensasAutomaticas - dispensasManuais;
    const pendentes = elegiveis.length - entregues - dispensasAutomaticas - dispensasManuais;
    central = { elegiveis: elegiveis.length, entregues, dispensasManuais, dispensasAutomaticas, pendentes,
      rascunhos: elegiveis.filter(r => r.central?.situacao === "rascunho").length,
      aguardandoAprovacao: elegiveis.filter(r => r.central?.situacao === "aguardando_aprovacao").length,
      antesMarco: registros.filter(r => r.chamado && r.data_referencia < "2026-09-09").length,
      naoRealizados: registros.filter(r => r.chamado && r.data_referencia >= "2026-09-09" && statusOperacional(r.status) !== "realizado").length,
      semVinculo: registros.filter(r => !r.chamado || !r.central).length,
      cobertura: exigidos ? Math.round(entregues / exigidos * 1000) / 10 : null,
      regularidade: elegiveis.length ? Math.round((entregues + dispensasAutomaticas + dispensasManuais) / elegiveis.length * 1000) / 10 : null };
  }
  const porTecnico = grupos(registros, r => r.tecnico), porEscola = grupos(registros, r => r.escola);
  const porCategoria = grupos(registros, r => r.categoria);
  const semDescricao = registros.filter(r => !r.descricao.trim());
  const semResolucao = realizados.filter(r => !r.resolucao.trim());
  const pontos: PontoAtencao[] = [];
  const ids = (rs: RegistroFields[]) => rs.slice(0, 5).map(r => r.chamado || `Registro ${r.id}`);
  if (central?.pendentes) pontos.push({ nivel: "atencao", titulo: "Regularizar documentação após o atendimento",
    evidencia: `${central.pendentes} de ${central.elegiveis} chamados realizados elegíveis estão com relatório pendente; ${central.rascunhos} em rascunho e ${central.aguardandoAprovacao} aguardando decisão SETEC.`,
    direcao: "Conferir as pendências na Central, solicitar a conclusão dos documentos e analisar dispensas justificadas. Não cobrar atendimentos em execução.",
    chamados: ids(registros.filter(r => r.data_referencia >= "2026-09-09" && statusOperacional(r.status) === "realizado" && r.central && ["pendente", "rascunho", "aguardando_aprovacao"].includes(r.central.situacao))) });
  if (atrasados.length) pontos.push({ nivel: "atencao", titulo: "Revisar previsões de atendimento",
    evidencia: `${atrasados.length} chamados atualmente abertos têm previsão anterior a ${corte.split("-").reverse().join("/")}.`,
    direcao: "Validar se a data prevista continua correta e alinhar a programação. O indicador não mede descumprimento de SLA contratual.", chamados: ids(atrasados) });
  if (semResolucao.length || semDescricao.length) pontos.push({ nivel: "atencao", titulo: "Melhorar a qualidade dos registros",
    evidencia: `${semDescricao.length} chamados sem descrição e ${semResolucao.length} realizados sem resolução textual.`,
    direcao: "Completar os textos para tornar verificável a relação entre o pedido, os procedimentos executados e o resultado.", chamados: ids([...semResolucao, ...semDescricao]) });
  if (porCategoria[0] && registros.length >= 5) pontos.push({ nivel: "informativo", titulo: "Planejar ações para a principal categoria",
    evidencia: `${porCategoria[0].nome}: ${porCategoria[0].total} chamados (${(porCategoria[0].total / registros.length * 100).toFixed(1).replace(".", ",")}%) no recorte.`,
    direcao: "Examinar os pedidos e retornos dessa categoria para avaliar orientações, ações preventivas ou necessidade de recursos. Volume não demonstra causa raiz.", chamados: ids(registros.filter(r => normalizar(r.categoria) === normalizar(porCategoria[0].nome))) });
  if (porTecnico.length > 1 && registros.length >= 10 && porTecnico[0].total / registros.length >= 0.5) pontos.push({ nivel: "informativo", titulo: "Conferir a distribuição da demanda",
    evidencia: `${porTecnico[0].nome} concentra ${porTecnico[0].total} de ${registros.length} chamados registrados.`,
    direcao: "Conferir território, complexidade, disponibilidade e atribuições antes de avaliar redistribuição. Quantidade de chamados não mede qualidade ou produtividade individual.", chamados: [] });
  if (base.sem_data_filtrados || registros.some(r => !r.chamado) || datasInconsistentes) pontos.push({ nivel: "atencao", titulo: "Conferir identificadores e datas",
    evidencia: `${registros.filter(r => !r.chamado).length} registros sem número no recorte; ${base.sem_data_filtrados} sem data nos filtros, fora dos totais; ${datasInconsistentes} pares de datas inconsistentes.`,
    direcao: "Corrigir o cadastro de origem para permitir vinculação, atribuição ao período e cálculo de tempo confiável.", chamados: ids(registros.filter(r => !r.chamado)) });
  if (!pontos.length) pontos.push({ nivel: "informativo", titulo: registros.length ? "Acompanhamento do período" : "Sem dados no recorte",
    evidencia: registros.length ? `${registros.length} chamados no período; nenhuma das regras de atenção desta versão foi acionada.` : "Nenhum registro corresponde aos filtros selecionados.",
    direcao: registros.length ? "Conferir os dados e manter o acompanhamento. A ausência de alertas automáticos não substitui a análise técnica." : "Revisar período e filtros antes de emitir conclusões.", chamados: [] });
  return { total: registros.length, realizados: realizados.length, abertos: abertos.length,
    cancelados: registros.filter(r => statusOperacional(r.status) === "cancelado").length,
    outros: registros.filter(r => statusOperacional(r.status) === "outro").length,
    internos: registros.filter(r => ehURE(r.escola)).length,
    escolas: new Set(registros.filter(r => !ehURE(r.escola) && r.escola !== "Escola não informada").map(r => normalizar(r.escola))).size,
    tecnicos: porTecnico.length, linhasOrigem: registros.reduce((s, r) => s + Number(r.registros_field), 0),
    duplicados: registros.reduce((s, r) => s + Math.max(0, Number(r.registros_field) - 1), 0),
    semChamado: registros.filter(r => !r.chamado).length, semData: base.sem_data, semDataFiltrados: base.sem_data_filtrados,
    semDescricao: semDescricao.length, semResolucao: semResolucao.length, atrasados: atrasados.length,
    diasMedios: dias.length ? Math.round(dias.reduce((s, n) => s + n, 0) / dias.length * 10) / 10 : null,
    amostraDias: dias.length, datasInconsistentes, porTecnico, porEscola, porCategoria, porMes: meses,
    porStatus: grupos(registros, r => r.status || "Pendente (sem status)"), temas, central, pontos };
}
