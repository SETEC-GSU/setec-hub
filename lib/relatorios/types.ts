export type TipoRelatorio = "equipamentos" | "redes";
export type LocalAtendimento = "escola" | "ure";
export type ContextoRelatorios = {
  permitido: boolean; gestao: boolean; aprovar: boolean; usuario_id: string;
  nome: string; email: string; role: string; marco: string; meses?: string[];
};
export type ChamadoFieldVinculo = {
  chamado: string; visita_id: string; escola: string; tecnico: string;
  status_field: string; data_referencia: string | null; categoria: string;
  subcategoria: string; registros_field: number; situacao?: string;
  dispensa_estado?: string | null;
};
export type RegistroControle = ChamadoFieldVinculo & {
  dispensa_automatica?: boolean; dispensa_origem?: "automatica" | "manual" | null;
  finalizados: number; rascunhos: number; situacao: string;
  justificativa: string | null; aprovado_nome: string | null;
  aprovado_em: string | null; dispensa_versao: number | null;
};
export type DocumentoRelatorio = {
  local_atendimento?: LocalAtendimento;
  tipo: TipoRelatorio; id: string; chamado: string; chamado_referencia: string | null;
  escola: string; tecnico: string; tecnico_email: string | null; data_atendimento: string;
  status: "rascunho" | "finalizado"; itens: number; versao: string | null; vinculado: boolean;
};
export type RespostaControle = {
  contexto: ContextoRelatorios; mes: string; pagina: number; tamanho: number;
  resumo: { chamados: number; entregues: number; dispensados: number; pendentes: number;
    aguardando_aprovacao: number; relatorios: number; rascunhos: number; sem_vinculo: number; sem_data: number; internos?: number; dispensados_automaticos?: number };
  tecnicos: string[]; ranking: Array<{ tecnico: string; chamados: number; entregues: number;
    dispensados: number; pendentes: number; cobertura: number | null }>;
  ranking_emitidos: Array<{ tecnico: string; total: number }>;
  total: number; registros: Array<RegistroControle | DocumentoRelatorio>;
};
export type ReferenciaExportacao = {
  local_atendimento?: LocalAtendimento;
  tipo: TipoRelatorio; id: string; versao: string | null; chamado: string;
  escola: string; tecnico: string; data_atendimento: string;
};
export type DetalheRelatorio = {
  tipo: TipoRelatorio; versao: string | null; relatorio: Record<string, unknown>;
};
export type HistoricoDispensa = { id: number; chamado: string; acao: string;
  justificativa: string; usuario_nome: string; registrado_em: string };
