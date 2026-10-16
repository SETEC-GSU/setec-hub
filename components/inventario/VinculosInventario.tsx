"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string;
};
type Tecnico = {
  id: string;
  nome: string;
  ativo: boolean | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  role: string | null;
  escolas: number;
};
type Pendente = {
  id: string;
  nome: string;
  tecnico_atribuido: string;
};
type Dados = {
  usuarios: Usuario[];
  tecnicos: Tecnico[];
  escolas_sem_vinculo: Pendente[];
};
export default function VinculosInventario() {
  const supabase = useMemo(() => createClient(), []);
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [selecionados, setSelecionados] = useState<Record<string, string>>({});
  const [ativar, setAtivar] = useState<Record<string, boolean>>({});
  const [escolas, setEscolas] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState('');
  const carregar = useCallback(async () => {
    setErro('');
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('hub_inventario_vinculos');
      if (error)
        throw error;
      setDados(data as Dados);
      setSelecionados(Object.fromEntries((data.tecnicos as Tecnico[]).map(t => [t.id, t.usuario_id || ''])));
      setAtivar({});
    }
    catch (e) {
      console.error('[Inventário vínculos]', e);
      setErro('Não foi possível consultar os vínculos. Verifique sua sessão de administrador e tente novamente.');
    }
    finally {
      setLoading(false);
    }
  }, [supabase]);
  useEffect(() => { void carregar(); }, [carregar]);
  async function salvar(t: Tecnico) {
    setOcupado(t.id);
    setErro('');
    setAviso('');
    try {
      const { error } = await supabase.rpc('hub_inventario_vincular', { p_tecnico_id: t.id, p_usuario_id: selecionados[t.id] || null, p_ativar_field: !!ativar[t.id] });
      if (error)
        throw error;
      await carregar();
      setAviso(ativar[t.id] ? 'Vínculo registrado e perfil Field ativado. O técnico verá suas escolas ao atualizar o sistema.' : 'Vínculo atualizado. A alteração da role só ocorre quando a opção de ativar Field é marcada.');
    }
    catch (e) {
      const r = e as {
        code?: string;
        message?: string;
      };
      setErro(r.code === 'P0001' || r.code === '42501' ? r.message || 'Vínculo inválido.' : 'Não foi possível salvar o vínculo. Tente novamente.');
    }
    finally {
      setOcupado('');
    }
  }
  async function resolver(e: Pendente) {
    setOcupado(e.id);
    setErro('');
    setAviso('');
    try {
      const { error } = await supabase.rpc('hub_inventario_definir_setorizacao', { p_escola_id: e.id, p_tecnico_id: escolas[e.id] || null });
      if (error)
        throw error;
      await carregar();
      setAviso('Escola associada ao técnico selecionado. A setorização e o inventário utilizam o mesmo vínculo.');
    }
    catch (e) {
      const r = e as {
        message?: string;
      };
      setErro(r.message || 'Não foi possível atualizar a escola.');
    }
    finally {
      setOcupado('');
    }
  }
  const seletor = 'min-h-12 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400';
  return <div className="space-y-5">
    <div className="rounded-3xl border border-blue-500/25 bg-blue-500/10 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-white">Contas e técnicos Field</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Selecione qual conta pertence a cada técnico. Confira a quantidade de escolas e marque a ativação do perfil Field quando o vínculo estiver correto. A conta passa a acessar o inventário das escolas atribuídas a esse técnico.</p>
      <p className="mt-3 text-xs leading-5 text-blue-200">Apenas o administrador altera vínculos e perfis. Nenhuma conta foi convertida automaticamente.</p>
    </div>
    {erro && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200">{erro}</p>}
    {aviso && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">{aviso}</p>}
    {loading && !dados ? <p role="status" className="py-8 text-center text-slate-400">Carregando técnicos e contas…</p> : !dados ? <button onClick={() => void carregar()} className="min-h-11 rounded-xl bg-blue-500 px-5 text-white">Tentar novamente</button> : <>
      <div className="grid gap-4 lg:grid-cols-2">{dados.tecnicos.map(t => <section key={t.id} className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="break-words font-bold text-white">{t.nome}</h3>
            <p className="mt-1 text-xs text-slate-400">{t.escolas} escolas atribuídas · {t.ativo ? 'Técnico ativo' : 'Técnico inativo'}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.role === 'field' ? 'bg-emerald-500/15 text-emerald-300' : t.usuario_id ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>{t.role === 'field' ? 'Field ativado' : t.usuario_id ? 'Vinculado · ' + t.role : 'Sem conta'}</span>
        </div>
        <label className="block text-sm text-slate-300">Conta de acesso<select aria-label={'Conta de ' + t.nome} value={selecionados[t.id] || ''} onChange={e => { setSelecionados(v => ({ ...v, [t.id]: e.target.value })); setAtivar(v => ({ ...v, [t.id]: false })); }} disabled={!!ocupado} className={'mt-2 ' + seletor}>
          <option value="">Sem vínculo</option>{dados.usuarios.map(u => <option key={u.id} value={u.id} disabled={dados.tecnicos.some(v => v.id !== t.id && v.usuario_id === u.id)}>{u.nome || u.email || u.id} · {u.email} · {u.role}</option>)}</select>
        </label>
        {selecionados[t.id] && <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-700 p-3 text-sm leading-5 text-slate-300">
          <input type="checkbox" checked={!!ativar[t.id]} disabled={!!ocupado || !t.ativo} onChange={e => setAtivar(v => ({ ...v, [t.id]: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-cyan-400" />
          <span>Ativar perfil <strong className="text-white">Field</strong> nesta conta.<span className="mt-1 block text-xs text-slate-400">Substitui a role analista e aplica as permissões do Field.</span>
          </span>
        </label>}
        {!t.ativo && <p className="mt-3 text-xs text-amber-200">O técnico deve estar ativo para receber uma conta. Você pode remover um vínculo existente.</p>}
        <button type="button" disabled={!!ocupado || (!t.ativo && !!selecionados[t.id])} onClick={() => void salvar(t)} className="mt-4 min-h-11 w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white hover:bg-blue-400 disabled:opacity-50">{ocupado === t.id ? 'Salvando…' : ativar[t.id] ? 'Salvar vínculo e ativar Field' : 'Salvar vínculo'}</button>
      </section>)}</div>
      {dados.escolas_sem_vinculo.length > 0 && <section className="space-y-4 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h3 className="font-bold text-amber-100">Atribuições que precisam de conferência</h3>
        <p className="text-sm leading-6 text-slate-300">O nome antigo não identifica um único técnico. Escolha o cadastro correto para liberar o inventário dessa escola.</p>{dados.escolas_sem_vinculo.map(e => <div key={e.id} className="grid gap-3 rounded-xl border border-slate-700 p-4 lg:grid-cols-[1fr_1fr_auto]">
          <div className="min-w-0">
            <p className="break-words font-semibold text-white">{e.nome}</p>
            <p className="mt-1 break-words text-xs text-slate-400">Atribuição atual: {e.tecnico_atribuido}</p>
          </div>
          <select aria-label={'Técnico de ' + e.nome} value={escolas[e.id] || ''} onChange={v => setEscolas(p => ({ ...p, [e.id]: v.target.value }))} className={seletor}>
            <option value="">Escolha o técnico</option>{dados.tecnicos.filter(t => t.ativo).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
          <button disabled={!!ocupado || !escolas[e.id]} onClick={() => void resolver(e)} className="min-h-11 rounded-xl bg-amber-400 px-4 font-bold text-slate-950 disabled:opacity-50">Confirmar técnico</button>
        </div>)}</section>}
    </>}
  </div>;
}
