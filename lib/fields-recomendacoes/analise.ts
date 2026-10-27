import type { BaseRecomendacoes, FiltrosRecomendacoes, ItemRecomendacao } from "./types";

export const normalizar = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const DIA = 86_400_000;
export const pesoUrgencia = (v: unknown) => ({ critica: 4, alta: 3, media: 2, baixa: 1 } as Record<string, number>)[normalizar(v)] || 0;
export function diaValido(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const n = Date.parse(v + "T12:00:00Z"); return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === v;
}
export function diasEntre(inicio: string, fim: string) { return Math.round((Date.parse(fim + "T12:00:00Z") - Date.parse(inicio + "T12:00:00Z")) / DIA); }
export function diaCriacao(v: string | null) {
  if (!v || !Number.isFinite(Date.parse(v))) return null;
  return new Date(v).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
export function categoriaPrincipal(v: unknown) {
  const valor = String(v ?? "").trim(), chave = normalizar(valor);
  if (["rede", "redes", "rede/conectividade", "rede / conectividade", "conectividade"].includes(chave)) return "Rede/Conectividade";
  if (chave === "equipamentos") return "Equipamentos";
  if (chave === "suporte") return "Suporte";
  if (chave === "ure") return "URE";
  return valor || "Sem categoria";
}
export function categoriasDisponiveis(base: BaseRecomendacoes) {
  return [...new Set([...base.demandas, ...base.chamados].map(r => categoriaPrincipal(r.categoria)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
export function validarFiltros(valor: unknown, base?: BaseRecomendacoes): FiltrosRecomendacoes | null {
  if (!valor || typeof valor !== "object") return null;
  const f = valor as FiltrosRecomendacoes;
  if (!["equilibrado", "pendencias", "cobertura"].includes(f.foco) || !["recomendadas", "pendencias", "sem_historico", "com_chamado", "todas"].includes(f.situacao)) return null;
  if (![15, 30, 45, 60, 90].includes(f.intervalo)) return null;
  for (const v of [f.tecnico, f.categoria, f.busca]) if (typeof v !== "string" || v.length > 250) return null;
  const tecnico = base && f.tecnico && f.tecnico !== "__sem_tecnico__" && !base.tecnicos.some(t => t.id === f.tecnico) ? "" : f.tecnico;
  return { tecnico: base?.perfil.escopo === "proprio" ? "" : tecnico, categoria: f.categoria, busca: f.busca,
    foco: f.foco, situacao: f.situacao, intervalo: f.intervalo };
}
export function analisarRecomendacoes(base: BaseRecomendacoes, f: FiltrosRecomendacoes): ItemRecomendacao[] {
  const porDemanda = new Map<string, typeof base.demandas>(), porChamado = new Map<string, typeof base.chamados>();
  for (const d of base.demandas) { const lista = porDemanda.get(d.escolaId) || []; lista.push(d); porDemanda.set(d.escolaId, lista); }
  for (const c of base.chamados) { const lista = porChamado.get(c.escolaId) || []; lista.push(c); porChamado.set(c.escolaId, lista); }
  const categoria = normalizar(f.categoria), busca = normalizar(f.busca), arredondar = (n: number) => Math.round(n * 10) / 10;
  const selecionados: ItemRecomendacao[] = [];
  for (const escola of base.escolas) {
    if (f.tecnico === "__sem_tecnico__" ? Boolean(escola.tecnicoId) : Boolean(f.tecnico && escola.tecnicoId !== f.tecnico)) continue;
    if (busca && !normalizar([escola.nome, escola.cie, escola.tecnicoNome].join(" ")).includes(busca)) continue;
    const daCategoria = (v: { categoria: string | null }) => !categoria || normalizar(categoriaPrincipal(v.categoria)) === categoria;
    const demandas = (porDemanda.get(escola.id) || []).filter(daCategoria).slice().sort((a, b) =>
      pesoUrgencia(b.urgencia) - pesoUrgencia(a.urgencia) || String(a.criadoEm || "9999").localeCompare(String(b.criadoEm || "9999")) || a.id.localeCompare(b.id));
    const todosChamados = porChamado.get(escola.id) || [], chamados = todosChamados.filter(daCategoria), outrosChamados = todosChamados.filter(c => !daCategoria(c));
    if (categoria && !demandas.length && !chamados.length) continue;
    const diasSemVisita = diaValido(escola.ultimaVisita) && escola.ultimaVisita <= base.hoje ? diasEntre(escola.ultimaVisita, base.hoje) : null;
    const idades = demandas.map(d => diaCriacao(d.criadoEm)).filter((d): d is string => Boolean(d && d <= base.hoje)).map(d => diasEntre(d, base.hoje));
    const idadeMaisAntiga = idades.length ? Math.max(...idades) : null;
    const criticas = demandas.filter(d => pesoUrgencia(d.urgencia) === 4).length, altas = demandas.filter(d => pesoUrgencia(d.urgencia) === 3).length;
    const maxUrgencia = Math.max(0, ...demandas.map(d => pesoUrgencia(d.urgencia)));
    const pontos = { pendencias: arredondar(Math.min(demandas.length, 10) * 4),
      cobertura: arredondar(diasSemVisita === null ? 0 : Math.min(diasSemVisita, 90) / 90 * 35),
      antiguidade: arredondar(idadeMaisAntiga === null ? 0 : Math.min(idadeMaisAntiga, 60) / 60 * 15),
      urgencia: maxUrgencia * 2.5, total: 0 };
    pontos.total = arredondar(pontos.pendencias + pontos.cobertura + pontos.antiguidade + pontos.urgencia);
    const previsaoChamado = chamados.map(c => c.dataPrevista).filter((v): v is string => diaValido(v) && v >= base.hoje).sort()[0] || null;
    const recomendada = demandas.length > 0 || diasSemVisita === null || diasSemVisita >= f.intervalo;
    if (f.situacao === "recomendadas" && !recomendada) continue;
    if (f.situacao === "pendencias" && !demandas.length) continue;
    if (f.situacao === "sem_historico" && diasSemVisita !== null) continue;
    if (f.situacao === "com_chamado" && !chamados.length) continue;
    const motivos = [
      diasSemVisita === null ? "Sem visita realizada registrada; conferir o histórico." : `${diasSemVisita} dias desde a última visita geral.`,
      `${demandas.length} demanda(s) pendente(s)${f.categoria ? ` em ${categoriaPrincipal(f.categoria)}` : " no recorte"}.`,
      idadeMaisAntiga !== null ? `A pendência mais antiga tem ${idadeMaisAntiga} dia(s).` : "",
      criticas ? `${criticas} demanda(s) com urgência crítica cadastrada.` : "",
      chamados.length ? `${chamados.length} chamado(s) ativo(s) no recorte; conferir os pedidos antes de abrir outro.` : "",
    ].filter(Boolean);
    const acao = chamados.length ? "Conferir os chamados ativos e reunir as pendências para planejar o atendimento."
      : demandas.length ? "Avaliar a abertura de chamado e reunir as pendências para atendimento na mesma visita."
      : diasSemVisita === null ? "Conferir o histórico da escola e avaliar a necessidade de uma visita."
      : "Avaliar uma visita preventiva para acompanhar a escola.";
    selecionados.push({ ...escola, demandas, chamados, outrosChamados, diasSemVisita, idadeMaisAntiga, criticas, altas,
      maxUrgencia, pontos, acao, motivos, previsaoChamado,
      previsoesVencidas: demandas.filter(d => diaValido(d.dataPrevista) && d.dataPrevista < base.hoje).length,
      demandasSemData: demandas.length - idades.length });
  }
  return selecionados.sort((a, b) => {
    if (f.foco === "pendencias") return b.demandas.length - a.demandas.length || b.maxUrgencia - a.maxUrgencia || (b.idadeMaisAntiga ?? -1) - (a.idadeMaisAntiga ?? -1) || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
    if (f.foco === "cobertura") return (b.diasSemVisita ?? -1) - (a.diasSemVisita ?? -1) || b.demandas.length - a.demandas.length || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
    return Number(b.criticas > 0) - Number(a.criticas > 0) || b.pontos.total - a.pontos.total || b.demandas.length - a.demandas.length || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
  });
}
export function resumoRecomendacoes(base: BaseRecomendacoes, f: FiltrosRecomendacoes, itens: ItemRecomendacao[]) {
  const tecnico = f.tecnico === "__sem_tecnico__" ? "Escolas sem técnico ativo" : base.tecnicos.find(t => t.id === f.tecnico)?.nome || (base.perfil.escopo === "proprio" ? "Minhas escolas" : "Todos os técnicos");
  const foco = { equilibrado: "Equilibrado", pendencias: "Mais pendências", cobertura: "Maior tempo sem visita" }[f.foco];
  return [`PLANEJAMENTO DE ATENDIMENTOS | SETEC HUB`, `Data da base: ${base.hoje.split("-").reverse().join("/")} | Técnico: ${tecnico}`,
    `Categoria principal: ${f.categoria || "Todas"} | Foco: ${foco} | Situação: ${f.situacao} | Busca: ${f.busca || "Sem busca"} | Referência de cobertura: ${f.intervalo} dias`,
    `Recorte: ${itens.length} escolas e ${itens.reduce((s, i) => s + i.demandas.length, 0)} demandas pendentes.`,
    ...itens.slice(0, 20).flatMap((i, pos) => [``, `${pos + 1}. ${i.nome} | CIE: ${i.cie || "Não informado"} | ${i.tecnicoNome || "Sem técnico ativo"}`,
      ...i.motivos.map(m => `- ${m}`), `Sugestão: ${i.acao}`,
      ...i.demandas.slice(0, 10).map(d => `  • ${categoriaPrincipal(d.categoria)} | ${d.urgencia || "Urgência não informada"} | ID ${d.id} | ${(d.descricao || "Sem descrição").replace(/\s+/g, " ").slice(0, 250)}`),
      ...(i.demandas.length > 10 ? [`  + ${i.demandas.length - 10} demandas disponíveis na tela.`] : []),
      ...i.chamados.map(c => `  Chamado ativo para conferência: ${c.numero || `registro ${c.id}`} | ${categoriaPrincipal(c.categoria)} | ${c.status || "Pendente"}`)]),
    ...(itens.length > 20 ? ["", `Exibidas as 20 primeiras escolas de ${itens.length} no texto. Refine os filtros para copiar as demais.`] : []),
    "", "Recomendações para avaliação da equipe. Nenhum chamado foi aberto automaticamente. O histórico de visitas é geral, independentemente da categoria filtrada.",
  ].join("\n");
}
