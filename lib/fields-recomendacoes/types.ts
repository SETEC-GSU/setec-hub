export type TecnicoRecomendacao = { id: string; nome: string };
export type EscolaRecomendacao = {
  id: string; nome: string; cie: string | null; tecnicoId: string | null; tecnicoNome: string | null;
  vinculoTecnico: "id" | "nome" | "sem_tecnico_ativo";
  ultimaVisita: string | null; origemUltimaVisita: "data_visita" | "data_finalizacao" | null;
  ultimoChamado: string | null; categoriaUltimaVisita: string | null;
};
export type DemandaRecomendacao = {
  id: string; escolaId: string; categoria: string | null; descricao: string | null;
  urgencia: string | null; dataPrevista: string | null; criadoEm: string | null;
};
export type ChamadoRecomendacao = {
  id: string; escolaId: string; numero: string | null; categoria: string | null;
  status: string | null; tecnico: string | null; dataPrevista: string | null;
  dataAbertura: string | null; descricao: string | null;
};
export type BaseRecomendacoes = {
  versao: 1; geradoEm: string; hoje: string;
  perfil: { usuarioId: string; nome: string; role: string; escopo: "gestao" | "proprio"; vinculoField: boolean };
  tecnicos: TecnicoRecomendacao[]; escolas: EscolaRecomendacao[];
  demandas: DemandaRecomendacao[]; chamados: ChamadoRecomendacao[];
  qualidade: { demandasSemVinculo: number; chamadosSemVinculo: number; concluidosSemData: number;
    visitasFuturas: number; nomesAmbiguos: number; statusDemandasDesconhecidos: number };
};
export type FiltrosRecomendacoes = {
  tecnico: string; categoria: string; busca: string; foco: "equilibrado" | "pendencias" | "cobertura";
  situacao: "recomendadas" | "pendencias" | "sem_historico" | "com_chamado" | "todas";
  intervalo: number;
};
export type ItemRecomendacao = EscolaRecomendacao & {
  demandas: DemandaRecomendacao[]; chamados: ChamadoRecomendacao[]; outrosChamados: ChamadoRecomendacao[];
  diasSemVisita: number | null; idadeMaisAntiga: number | null; criticas: number; altas: number;
  previsoesVencidas: number; demandasSemData: number; maxUrgencia: number; previsaoChamado: string | null;
  pontos: { pendencias: number; cobertura: number; antiguidade: number; urgencia: number; total: number };
  acao: string; motivos: string[];
};
export const FILTROS_INICIAIS: FiltrosRecomendacoes = {
  tecnico: "", categoria: "", busca: "", foco: "equilibrado", situacao: "recomendadas", intervalo: 30,
};
