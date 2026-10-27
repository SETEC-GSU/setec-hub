export type PeriodoSaresp = { data_prova?: string | null; data_prova_fim?: string | null }
export type EdicaoPeriodo = { data_prova_padrao?: string | null; data_prova_fim_padrao?: string | null }

export function dataValida(valor?: string | null): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const data = new Date(`${valor}T12:00:00Z`)
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor
}

export function fimPeriodo(registro?: PeriodoSaresp | null, edicao?: EdicaoPeriodo | null) {
  const inicio = registro?.data_prova || edicao?.data_prova_padrao || null
  return registro?.data_prova_fim ||
    ((!registro?.data_prova || registro.data_prova === edicao?.data_prova_padrao)
      ? edicao?.data_prova_fim_padrao : null) || inicio
}

export function formatarPeriodo(inicio?: string | null, fim?: string | null) {
  const fmt = (d?: string | null) => dataValida(d) ? d.split('-').reverse().join('/') : 'Não informado'
  return inicio && fim && inicio !== fim ? `${fmt(inicio)} a ${fmt(fim)}` : fmt(inicio)
}

// Calendário nacional: datas fixas e Sexta-feira da Paixão. Feriados locais
// e pontos facultativos precisam de alinhamento entre as unidades.
export function feriadoNacional(data: string) {
  const y=Number(data.slice(0,4)), md=data.slice(5)
  if (["01-01","04-21","05-01","09-07","10-12","11-02","11-15","12-25"].includes(md) || (y>=2024 && md==="11-20")) return true
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451)
  const mes=Math.floor((h+l-7*m+114)/31),dia=(h+l-7*m+114)%31+1
  const sexta=new Date(Date.UTC(y,mes-1,dia-2,12))
  return sexta.toISOString().slice(0,10)===data
}

export function deslocarDiaUtil(data?: string | null, direcao: -1 | 1 = 1) {
  if (!dataValida(data)) return null
  const d = new Date(`${data}T12:00:00Z`)
  do { d.setUTCDate(d.getUTCDate() + direcao) } while ([0, 6].includes(d.getUTCDay()) || feriadoNacional(d.toISOString().slice(0,10)))
  return d.toISOString().slice(0, 10)
}

export function periodosSobrepostos(aInicio?: string | null, aFim?: string | null, bInicio?: string | null, bFim?: string | null) {
  return Boolean(aInicio && bInicio && aInicio <= (bFim || bInicio) && bInicio <= (aFim || aInicio))
}

// O mesmo equipamento pode apoiar os dois dias: conta-se a menor cobertura
// diária do período, nunca a soma de empréstimos de dias diferentes.
export function coberturaNoPeriodo<T extends PeriodoSaresp & { quantidade?: number | null }>(
  registros: T[], inicio?: string | null, fim?: string | null,
) {
  if (!dataValida(inicio)) return 0
  const ultimo = dataValida(fim) && fim >= inicio ? fim : inicio
  const pontos = new Set([inicio])
  for (const item of registros) {
    if (item.data_prova && item.data_prova >= inicio && item.data_prova <= ultimo) pontos.add(item.data_prova)
    const termino = item.data_prova_fim || item.data_prova
    if (dataValida(termino)) {
      const d = new Date(`${termino}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + 1)
      const depois = d.toISOString().slice(0, 10)
      if (depois >= inicio && depois <= ultimo) pontos.add(depois)
    }
  }
  return Math.min(...Array.from(pontos, dia => registros.reduce((soma, item) => {
    const ini = item.data_prova
    const fin = item.data_prova_fim || ini
    return soma + (ini && fin && ini <= dia && fin >= dia ? Math.max(Number(item.quantidade) || 0, 0) : 0)
  }, 0)))
}

export function mensagemErroSaresp(erro: unknown) {
  const e = erro as { message?: string; code?: string; details?: string; hint?: string }
  if (['PGRST202', 'PGRST204', '42883', '42703'].includes(e?.code || '')) {
    return 'A atualização do banco SARESP ainda não está completa. Execute o SQL 013-saresp-periodos-inventario.sql e atualize esta página.'
  }
  if (e?.code === '42501') return 'Seu perfil pode consultar os dados, mas não tem permissão para esta alteração.'
  if (e?.message?.includes('abort') || e?.message?.includes('Abort')) return 'A consulta demorou mais que o esperado. Atualize novamente; os dados preenchidos foram mantidos.'
  return e?.message || (erro instanceof Error ? erro.message : 'Não foi possível concluir a operação. Tente novamente.')
}
