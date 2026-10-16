export type ModeloInventario = {
  id: string;
  ids_originais: string[];
  recebido: number;
  nome: string;
  tipo: string;
  finalidade: string | null;
  imagem_url: string | null;
  ano_recebimento: number | null;
  funcionando: number;
  aguardando_garantia: number;
  danificados_mau_uso: number;
  nao_localizado: number;
  tem_declaracao: boolean;
};
export type EscolaInventario = {
  id: string;
  nome: string;
  cie: string | null;
  tecnico_id: string | null;
  tecnico_nome: string | null;
  pode_editar: boolean;
  estoque_assinatura: string;
  respostas_vazias_ignoradas: number;
  aviso?: string | null;
  modelos: ModeloInventario[];
  ultima_resposta: null | {
    id: string;
    created_at: string;
    responsavel_nome: string | null;
    responsavel_cargo: string | null;
    observacao: string | null;
    origem: string | null;
  };
};
export type ContextoInventario = {
  user_id: string;
  nome: string | null;
  role: string;
  pode_gerir: boolean;
  pode_editar: boolean;
  tecnico: null | {
    id: string;
    nome: string;
    ativo: boolean | null;
  };
};
export type TecnicoInventario = {
  id: string;
  nome: string;
  ativo: boolean | null;
};
export type PainelInventario = {
  contexto: ContextoInventario;
  escolas: EscolaInventario[];
  tecnicos: TecnicoInventario[];
  atualizado_em: string;
};
export const CAMPOS_INVENTARIO = [
  { key: 'funcionando', label: 'Funcionando', cor: '#34d399', texto: 'text-emerald-300' },
  { key: 'aguardando_garantia', label: 'Aguardando garantia', cor: '#fbbf24', texto: 'text-amber-300' },
  { key: 'danificados_mau_uso', label: 'Danificados / sem uso', cor: '#fb7185', texto: 'text-rose-300' },
  { key: 'nao_localizado', label: 'Não localizados', cor: '#a78bfa', texto: 'text-violet-300' },
] as const;
export type CampoInventario = typeof CAMPOS_INVENTARIO[number]['key'];
export type ItemEnvioInventario = {
  id: string;
} & Record<CampoInventario, number>;
export type PayloadInventario = {
  envio_id: string;
  base_id: string | null;
  estoque_assinatura: string;
  responsavel_nome: string;
  responsavel_cargo: string;
  observacao: string;
  itens: ItemEnvioInventario[];
};
export type ResultadoInventario = {
  ok: boolean;
  mensagem: string;
  id?: string;
  conflito?: boolean;
};
export type TotaisInventario = Record<CampoInventario, number> & {
  recebido: number;
  declarado: number;
  aConferir: number;
  divergentes: number;
  plataformas: number;
};
export function normalizarInventario(s: unknown) {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
export function quantidadeInventario(n: unknown) { const v = Number(n); return Number.isFinite(v) ? Math.max(0, v) : 0; }
export function ehPlataforma(m: ModeloInventario) { return normalizarInventario(m.finalidade).includes('carregamento'); }
export function totaisInventario(modelos: ModeloInventario[]): TotaisInventario {
  const t: TotaisInventario = { recebido: 0, declarado: 0, aConferir: 0, divergentes: 0, plataformas: 0, funcionando: 0, aguardando_garantia: 0, danificados_mau_uso: 0, nao_localizado: 0 };
  for (const m of modelos) {
    if (ehPlataforma(m)) {
      t.plataformas += quantidadeInventario(m.recebido);
      continue;
    }
    const r = quantidadeInventario(m.recebido);
    t.recebido += r;
    let soma = 0;
    for (const c of CAMPOS_INVENTARIO) {
      const v = quantidadeInventario(m[c.key]);
      t[c.key] += v;
      soma += v;
    }
    t.declarado += soma;
    t.aConferir += Math.max(0, r - soma);
    if (soma > r || CAMPOS_INVENTARIO.some(c => !Number.isSafeInteger(m[c.key]) || m[c.key] < 0))
      t.divergentes++;
  }
  return t;
}
export function dataInventario(valor: string | null | undefined) {
  if (!valor)
    return null;
  const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(valor) ? valor : valor.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function diasInventario(e: EscolaInventario, agora = Date.now()) {
  const d = dataInventario(e.ultima_resposta?.created_at);
  return d ? Math.max(0, Math.floor((agora - d.getTime()) / 86400000)) : null;
}
const formato = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });
export function formatarDataInventario(v: string | null | undefined) { const d = dataInventario(v); return d ? formato.format(d) : 'Sem envio'; }
export function situacaoInventario(e: EscolaInventario, agora = Date.now()) {
  const dias = diasInventario(e, agora), t = totaisInventario(e.modelos);
  if (e.aviso)
    return { key: 'revisar', label: 'Cadastro a revisar', cor: 'text-orange-300 border-orange-500/30 bg-orange-500/10' };
  if (!e.ultima_resposta)
    return { key: 'pendente', label: 'Sem levantamento', cor: 'text-slate-300 border-slate-600/50 bg-slate-500/10' };
  if (t.divergentes || t.aConferir)
    return { key: 'revisar', label: 'Revisar quantidades', cor: 'text-orange-300 border-orange-500/30 bg-orange-500/10' };
  if (dias !== null && dias > 90)
    return { key: 'vencido', label: 'Há mais de 90 dias', cor: 'text-amber-300 border-amber-500/30 bg-amber-500/10' };
  return { key: 'atualizado', label: 'Inventário em dia', cor: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' };
}
export function resumirCategorias(modelos: ModeloInventario[]) {
  const mapa = new Map<string, TotaisInventario>();
  for (const m of modelos) {
    if (ehPlataforma(m))
      continue;
    const nome = m.tipo?.trim() || 'Não informado';
    const t = totaisInventario([m]), a = mapa.get(nome) || totaisInventario([]);
    for (const k of Object.keys(a) as (keyof TotaisInventario)[])
      a[k] += t[k];
    mapa.set(nome, a);
  }
  return [...mapa].map(([nome, t]) => ({ nome, ...t })).sort((a, b) => b.danificados_mau_uso - a.danificados_mau_uso || b.recebido - a.recebido || a.nome.localeCompare(b.nome, 'pt-BR'));
}
