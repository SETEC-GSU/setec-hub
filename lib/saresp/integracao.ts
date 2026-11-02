export type IntegracaoSaresp = {
  id: string
  quantidade: number
  retirada: string | null
  devolucao: string | null
  edicoes: {
    id: string
    edicao_id: string
    titulo: string
    quantidade: number
    status: string
    data_prova: string
    data_prova_fim: string
  }[]
}

export type CandidatoIntegracao = {
  plano_id: string
  seguinte_id: string | null
  demanda_id: string
  origem: string
  destino: string
  edicao_a: string
  edicao_b: string
  inicio_a: string
  inicio_b: string
  anterior_a: number
  necessidade_b: number
}

export type PreviaIntegracao = CandidatoIntegracao & {
  revisao: string
  fim_a: string
  fim_b: string
  necessidade_a: number
  anterior_b: number | null
  quantidade: number
  disponivel: number
  viavel: boolean
  retirada: string
  devolucao: string
  motivo: string
}
