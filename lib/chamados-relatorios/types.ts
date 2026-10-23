export type PeriodicidadeHub = "mensal" | "trimestral" | "semestral" | "anual" | "personalizado";
export type FiltrosHub = {
  periodicidade: PeriodicidadeHub; ano: number; indice: number; inicio: string; fim: string;
  modalidade: "estrategico" | "quantitativo"; referencia: "conclusao" | "abertura";
  responsavel: string; unidade: string; categoria: string; origem: string; prioridade: string;
  status: "todos" | "atendidos" | "ativos" | "aberto" | "assumido" | "em_atendimento" | "resolvido" | "fechado" | "cancelado" | "outros";
  busca: string; detalhar: boolean;
};
export type ChamadoHub = {
  id: string; codigo: string | null; titulo: string | null; descricao: string | null;
  categoria: string | null; subcategoria: string | null; servico_id: string | null;
  origem: string | null; prioridade: string | null; status: string | null;
  setor: string | null; escola: string | null; solicitante_nome: string | null;
  analista_responsavel: string | null; created_at: string | null; updated_at: string | null;
  started_at: string | null; resolved_at: string | null; closed_at: string | null;
  retorno_devolutivo: string | null;
};
export type RegistroHub = ChamadoHub & {
  responsavelNome: string; categoriaPainel: string; assuntoPainel: string;
  unidadePainel: string; dataReferencia: string; conclusao: string | null;
  statusPainel: string; origemPainel: string; prioridadePainel: string; outraSolicitacao: boolean;
};
export type OpcaoHub = { valor: string; label: string };
export type OpcoesHub = { responsaveis: OpcaoHub[]; unidades: OpcaoHub[]; categorias: string[]; origens: string[] };
export type GrupoHub = { chave: string; nome: string; total: number; atendidos: number; ativos: number; outros: number };
export type PontoHub = { nivel: "atencao" | "informativo"; titulo: string; evidencia: string; direcao: string; chamados: string[] };
export type AnaliseHub = {
  total: number; atendidos: number; ativos: number; outros: number; internos: number; escolares: number;
  escolas: number; setores: number; responsaveis: number; semResponsavel: number;
  semDescricao: number; semRetorno: number; semCodigo: number; outrasSolicitacoes: number;
  mediaHoras: number | null; medianaHoras: number | null; amostraTempo: number; datasInconsistentes: number;
  conclusoesSemData: number; semDataAbertura: number; maisAntigoAtivoDias: number | null;
  porResponsavel: GrupoHub[]; porUnidade: GrupoHub[]; porCategoria: GrupoHub[]; porOrigem: GrupoHub[];
  porPrioridade: GrupoHub[]; porStatus: GrupoHub[]; porMes: GrupoHub[];
  temas: { nome: string; pedidos: number; retornos: number; exemplos: string[] }[]; pontos: PontoHub[];
};
export type PreviaHub = { filtros: FiltrosHub; assinatura: string; geradoEm: string;
  nomeResponsavel: string; analise: AnaliseHub; partes: number; detalhesPorParte: number;
  responsavelFiltro: string };
