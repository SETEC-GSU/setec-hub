export type Periodicidade = "mensal" | "trimestral" | "semestral" | "anual" | "personalizado";
export type Modalidade = "estrategico" | "quantitativo";
export type FiltrosFields = {
  periodicidade: Periodicidade; ano: number; indice: number; inicio: string; fim: string;
  modalidade: Modalidade; tecnico: string; escola: string; categoria: string;
  status: "todos" | "realizados" | "abertos" | "cancelados";
  cruzarCentral: boolean; detalhar: boolean;
};
export type RegistroFields = {
  id: string; chamado: string; escola: string; tecnico: string; categoria: string; subcategoria: string;
  status: string; data_referencia: string; data_abertura: string | null; data_prevista: string | null;
  data_visita: string | null; data_finalizacao: string | null; descricao: string; resolucao: string;
  abertura_por: string; urgencia: string; impacto: string; registros_field: number;
  central: null | { situacao: string; finalizados: number; rascunhos: number; automatica: boolean;
    justificativa: string; aprovado_nome: string | null; aprovado_em: string | null; };
};
export type BaseFields = { registros: RegistroFields[]; assinatura: string; gerado_em: string;
  sem_data: number; sem_data_filtrados: number; };
export type Grupo = { nome: string; total: number; realizados: number; abertos: number; cancelados: number; };
export type PontoAtencao = { nivel: "atencao" | "informativo"; titulo: string; evidencia: string; direcao: string; chamados: string[]; };
export type AnaliseFields = {
  total: number; realizados: number; abertos: number; cancelados: number; outros: number;
  internos: number; escolas: number; tecnicos: number; linhasOrigem: number; duplicados: number;
  semChamado: number; semData: number; semDataFiltrados: number; semDescricao: number; semResolucao: number;
  atrasados: number; diasMedios: number | null; amostraDias: number; datasInconsistentes: number;
  porTecnico: Grupo[]; porEscola: Grupo[]; porCategoria: Grupo[]; porMes: Grupo[]; porStatus: Grupo[];
  temas: { nome: string; pedidos: number; retornos: number; exemplos: string[] }[];
  central: null | { elegiveis: number; entregues: number; dispensasManuais: number; dispensasAutomaticas: number;
    pendentes: number; rascunhos: number; aguardandoAprovacao: number; antesMarco: number;
    naoRealizados: number; semVinculo: number; cobertura: number | null; regularidade: number | null; };
  pontos: PontoAtencao[];
};
export type PreviaFields = { filtros: FiltrosFields; assinatura: string; geradoEm: string;
  nomeResponsavel: string; analise: AnaliseFields; partes: number; detalhesPorParte: number; };
