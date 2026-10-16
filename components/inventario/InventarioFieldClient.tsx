"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import { salvarInventarioField } from "@/lib/inventario-field-actions"
import {
  CAMPOS_INVENTARIO, diasInventario, ehPlataforma, formatarDataInventario,
  normalizarInventario, resumirCategorias, situacaoInventario, totaisInventario,
  type ContextoInventario, type EscolaInventario, type ModeloInventario,
  type PainelInventario, type TotaisInventario,
} from "@/lib/inventario-field"
import InventarioEditor from "./InventarioEditor"
import VinculosInventario from "./VinculosInventario"
import styles from "./InventarioField.module.css"

const numero = new Intl.NumberFormat("pt-BR")
const n = (valor: number) => numero.format(valor)
const botao = styles.button
const seletor = styles.select

type IconeNome = "escola" | "equipamento" | "check" | "garantia" | "alerta" | "localizar" | "atualizar" | "seta" | "fechar" | "buscar" | "filtros" | "pessoa" | "relogio" | "editar" | "painel" | "vinculos"
function Icone({ nome, className = "" }: { nome: IconeNome; className?: string }) {
  const caminhos: Record<IconeNome, ReactNode> = {
    escola: <><path d="m3 9 9-6 9 6M5 9v12h14V9M9 21v-6h6v6M9 10h.01M15 10h.01" /></>,
    equipamento: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4M7 8h10" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    garantia: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    alerta: <><path d="M10.3 4.8 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    localizar: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    atualizar: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6a8 8 0 0 1 13.1 3M17.9 18A8 8 0 0 1 4.8 15" /></>,
    seta: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    fechar: <><path d="m6 6 12 12M18 6 6 18" /></>,
    buscar: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    filtros: <><path d="M4 6h16M7 12h10M10 18h4" /><circle cx="8" cy="6" r="2" /><circle cx="15" cy="12" r="2" /></>,
    pessoa: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    editar: <><path d="m16 3 5 5M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15l-1 6 6-1" /></>,
    painel: <><rect x="3" y="3" width="7" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="3" y="15" width="7" height="6" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /></>,
    vinculos: <><path d="m10 13 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0M16 8l1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" /></>,
  }
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`${styles.icon} ${className}`}>{caminhos[nome]}</svg>
}

function Ring({ t, compacto = false }: { t: TotaisInventario; compacto?: boolean }) {
  const valor = t.declarado > 0 && t.recebido > 0 ? Math.min(100, Math.round(t.funcionando / t.recebido * 100)) : null
  const raio = 43, circunferencia = 2 * Math.PI * raio
  return <div className={`${styles.ring} ${compacto ? styles.ringCompact : ""}`} role="img" aria-label={valor === null ? "Disponibilidade ainda não apurada" : `${valor}% do parque recebido está declarado em funcionamento`}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r={raio} fill="none" stroke="#18263c" strokeWidth="7" /><circle cx="50" cy="50" r={raio} fill="none" stroke="#22d3ee" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(valor || 0) / 100 * circunferencia} ${circunferencia}`} /></svg>
    <div className={styles.ringValue}><strong>{valor === null ? "—" : `${valor}%`}</strong><span>disponível</span></div>
  </div>
}

function Distribuicao({ t }: { t: TotaisInventario }) {
  const total = Math.max(t.recebido, t.declarado, 1)
  return <div className={styles.distribution} role="img" aria-label={CAMPOS_INVENTARIO.map(c => `${c.label}: ${n(t[c.key])}`).join("; ") + `; A conferir: ${n(t.aConferir)}`}>
    {CAMPOS_INVENTARIO.map(c => <span key={c.key} title={`${c.label}: ${n(t[c.key])}`} style={{ background: c.cor, width: `${t[c.key] / total * 100}%` }} />)}
    <span title={`A conferir: ${n(t.aConferir)}`} style={{ background: "#64748b", width: `${t.aConferir / total * 100}%` }} />
  </div>
}

function CardMetrica({ titulo, valor, detalhe, cor = "text-white" }: { titulo: string; valor: string; detalhe: string; cor?: string }) {
  const tom = cor.includes("emerald") ? "green" : cor.includes("amber") ? "amber" : cor.includes("rose") ? "rose" : cor.includes("violet") ? "violet" : "blue"
  const icone: IconeNome = tom === "green" ? "check" : tom === "amber" ? "garantia" : tom === "rose" ? "alerta" : tom === "violet" ? "localizar" : "equipamento"
  return <div className={styles.metric} data-tone={tom}>
    <div className={styles.metricTop}><p>{titulo}</p><span className={styles.metricIcon}><Icone nome={icone} /></span></div>
    <p className={styles.metricValue}>{valor}</p><p className={styles.metricDetail}>{detalhe}</p>
  </div>
}

function Bloco({ titulo, detalhe, children, icone = "painel" }: { titulo: string; detalhe?: string; children: ReactNode; icone?: IconeNome }) {
  return <section className={styles.panel}>
    <div className={styles.panelHeading}><span className={styles.sectionIcon}><Icone nome={icone} /></span><div><h2>{titulo}</h2>{detalhe && <p>{detalhe}</p>}</div></div>
    <div className={styles.panelContent}>{children}</div>
  </section>
}

function StatusEscola({ escola }: { escola: EscolaInventario }) {
  const status = situacaoInventario(escola)
  return <span className={styles.status} data-status={status.key}><i />{status.label}</span>
}

function ValoresModelo({ modelo }: { modelo: ModeloInventario }) {
  return <section className={styles.modelCard}>
    <div className={styles.modelHeading}><span className={styles.modelIcon}><Icone nome="equipamento" /></span><div><h3>{modelo.nome}</h3><p>{modelo.tipo}{ehPlataforma(modelo) ? " · Plataforma de recarga" : ""}</p></div><span className={styles.receivedPill}><strong>{n(modelo.recebido)}</strong><span>recebidos</span></span></div>
    {!modelo.tem_declaracao && <p className={styles.unchecked}>Levantamento a conferir</p>}
    <dl className={styles.modelValues}>{CAMPOS_INVENTARIO.map(c => <div key={c.key}><dt><i style={{ background: c.cor }} />{c.label}</dt><dd style={{ color: c.cor }}>{modelo.tem_declaracao ? n(modelo[c.key]) : "—"}</dd></div>)}</dl>
  </section>
}

function DetalhesEscola({ escola, contexto, onFechar, onSalvo }: { escola: EscolaInventario; contexto: ContextoInventario; onFechar: () => void; onSalvo: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const [aba, setAba] = useState<"resumo" | "editar">("resumo")
  const [salvando, setSalvando] = useState(false)
  const [atual, setAtual] = useState(escola)
  const [versao, setVersao] = useState(0)
  const [erro, setErro] = useState("")
  const supabase = useMemo(() => createClient(), [])
  const t = totaisInventario(atual.modelos)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    const anterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { dialog?.close(); document.body.style.overflow = anterior }
  }, [])
  useEffect(() => { conteudo.current?.scrollTo({ top: 0 }) }, [aba, versao])
  async function recarregar() {
    setErro("")
    const { data, error } = await supabase.rpc("hub_inventario_escola", { p_escola_id: atual.id })
    if (error) { setErro(error.code === "42501" ? error.message : "Não foi possível carregar os valores atuais. Seu preenchimento continua nesta tela."); return }
    setAtual(data as EscolaInventario); setVersao(v => v + 1)
  }
  function fechar() { if (!salvando) onFechar() }
  return <dialog ref={ref} aria-labelledby="titulo-inventario-escola" aria-describedby="referencia-inventario-escola" onCancel={event => { event.preventDefault(); fechar() }} className={styles.dialog}>
    <header className={styles.modalHeader}>
      <div className={styles.modalTitleRow}><span className={styles.schoolEmblem}><Icone nome="escola" /></span><div className={styles.modalTitle}><p className={styles.eyebrow}>Inventário da escola</p><h2 id="titulo-inventario-escola">{atual.nome}</h2></div><button type="button" disabled={salvando} aria-label="Fechar detalhes do inventário" onClick={fechar} className={styles.closeButton}><Icone nome="fechar" /></button></div>
      <div className={styles.modalMeta} id="referencia-inventario-escola"><span>CIE {atual.cie || "não informado"}</span><span><Icone nome="pessoa" />{atual.tecnico_nome || "Sem técnico atribuído"}</span><StatusEscola escola={atual} /></div>
      <div className={styles.modalTabs} aria-label="Visualização do inventário"><button type="button" disabled={salvando} onClick={() => setAba("resumo")} aria-pressed={aba === "resumo"}><Icone nome="painel" />Visão da escola</button>{atual.pode_editar && <button type="button" disabled={salvando} onClick={() => setAba("editar")} aria-pressed={aba === "editar"}><Icone nome="editar" />Atualizar inventário</button>}</div>
    </header>
    <div ref={conteudo} className={styles.modalBody} data-modal-scroll>
      {erro && <p role="alert" className={styles.error}>{erro}</p>}
      {atual.aviso && <p role="alert" className={styles.warning}>{atual.aviso}</p>}
      {aba === "editar" ? <InventarioEditor key={`${atual.id}:${versao}`} escola={atual} contexto={contexto} onSalvar={payload => salvarInventarioField(atual.id, payload)} onSucesso={onSalvo} onRecarregar={() => void recarregar()} onOcupado={setSalvando} /> : <>
        <div className={styles.schoolOverview}><div><p className={styles.eyebrow}>Panorama da unidade</p><h3>{n(t.recebido)} <span>equipamentos recebidos</span></h3><p>Último envio: <strong>{formatarDataInventario(atual.ultima_resposta?.created_at)}</strong></p><p>{n(t.plataformas)} plataformas de recarga contadas à parte.</p></div><Ring t={t} compacto /></div>
        <div className={styles.modalMetrics}>{CAMPOS_INVENTARIO.map(c => <CardMetrica key={c.key} titulo={c.label} valor={t.declarado ? n(t[c.key]) : "—"} detalhe={t.declarado ? "Último levantamento" : "Levantamento a conferir"} cor={c.texto} />)}</div>
        <div className={styles.modalDistribution}><Distribuicao t={t} /><p><strong>{n(t.aConferir)}</strong> equipamentos ainda a conferir{t.divergentes > 0 ? ` · ${n(t.divergentes)} modelos com divergências` : ""}</p></div>
        <div className={styles.subHeading}><h3>Equipamentos por modelo</h3><span>{atual.modelos.length} modelos</span></div>
        {atual.modelos.length === 0 ? <div className={styles.empty}><Icone nome="equipamento" /><p>Não há equipamentos recebidos cadastrados para esta escola.</p></div> : <div className={styles.modelGrid}>{atual.modelos.map(modelo => <ValoresModelo key={modelo.id} modelo={modelo} />)}</div>}
        {atual.ultima_resposta && <section className={styles.lastAuthor}><span className={styles.sectionIcon}><Icone nome="pessoa" /></span><div><h3>Último responsável</h3><p>{atual.ultima_resposta.responsavel_nome || "Não informado"} · {atual.ultima_resposta.responsavel_cargo || "Cargo não informado"}{atual.ultima_resposta.origem === "field" ? " · Preenchimento pelo Field" : ""}</p>{atual.ultima_resposta.observacao && <p className={styles.observation}>{atual.ultima_resposta.observacao}</p>}</div></section>}
      </>}
    </div>
    {aba === "resumo" && <footer className={styles.modalFooter}><span><Icone nome="relogio" />Último levantamento: {formatarDataInventario(atual.ultima_resposta?.created_at)}</span><div><button type="button" onClick={fechar} className={botao}>Fechar</button>{atual.pode_editar && atual.modelos.length > 0 && <button type="button" onClick={() => setAba("editar")} className={`${botao} ${styles.primaryButton}`}><Icone nome="editar" />Conferir e atualizar esta escola</button>}</div></footer>}
  </dialog>
}

export default function InventarioFieldClient(){
 const supabase=useMemo(()=>createClient(),[]);const [painel,setPainel]=useState<PainelInventario|null>(null);
 const [carregando,setCarregando]=useState(true);const [erro,setErro]=useState('');const [tecnico,setTecnico]=useState('');
 const [escolaFiltro,setEscolaFiltro]=useState('');
 const [busca,setBusca]=useState('');const termo=useDeferredValue(normalizarInventario(busca));const [situacao,setSituacao]=useState('todas');const [tipo,setTipo]=useState('todos');const [ordem,setOrdem]=useState('atencao');
 const [ativa,setAtiva]=useState<EscolaInventario|null>(null);const [abrindo,setAbrindo]=useState('');const [vista,setVista]=useState<'painel'|'vinculos'>('painel');const [limite,setLimite]=useState(12);
 const origemModal=useRef<HTMLElement|null>(null);
 const ultimo=useRef(0),rodada=useRef(0),requisicao=useRef<AbortController|null>(null);
 const carregar=useCallback(async()=>{
  const id=++rodada.current;requisicao.current?.abort();const ctrl=new AbortController();requisicao.current=ctrl;setCarregando(true);setErro('');
  try{const {data,error}=await supabase.rpc('hub_inventario_painel',{p_tecnico_id:tecnico||null}).abortSignal(ctrl.signal);if(id!==rodada.current)return;if(error)throw error;
    if(!data?.contexto||!Array.isArray(data.escolas)||!Array.isArray(data.tecnicos))throw new Error('Resposta inválida');setPainel(data as PainelInventario);ultimo.current=Date.now();
  }catch(e){if(ctrl.signal.aborted||id!==rodada.current)return;const r=e as {code?:string;message?:string};console.error('[Inventário Field]',e);if(r.code==='42501')setPainel(null);setErro(r.code==='42501'?r.message||'Acesso indisponível.':'Não foi possível atualizar o inventário. Verifique sua conexão e tente novamente.');}
  finally{if(id===rodada.current)setCarregando(false)}
 },[supabase,tecnico]);
 useEffect(()=>{void carregar();return()=>requisicao.current?.abort()},[carregar]);
 useEffect(()=>{function foco(){if(document.visibilityState==='visible'&&!ativa&&vista==='painel'&&Date.now()-ultimo.current>30000)void carregar();}window.addEventListener('focus',foco);document.addEventListener('visibilitychange',foco);return()=>{window.removeEventListener('focus',foco);document.removeEventListener('visibilitychange',foco)}},[ativa,carregar,vista]);
 useEffect(()=>setLimite(12),[termo,situacao,tipo,tecnico,ordem,escolaFiltro]);
 const escolas=useMemo(()=>{
  const lista=(painel?.escolas||[]).filter(e=>!escolaFiltro||e.id===escolaFiltro).filter(e=>!termo||normalizarInventario([e.nome,e.cie,e.tecnico_nome].join(' ')).includes(termo)).map(e=>({...e,modelos:tipo==='todos'?e.modelos:e.modelos.filter(m=>m.tipo===tipo)})).filter(e=>tipo==='todos'||e.modelos.length>0).filter(e=>{
    const s=situacaoInventario(e).key,t=totaisInventario(e.modelos);
    return situacao==='todas'||s===situacao||(situacao==='atencao'&&(t.danificados_mau_uso+t.aguardando_garantia+t.nao_localizado+t.aConferir>0||t.divergentes>0));
  });
  function prioridade(e:EscolaInventario){const t=totaisInventario(e.modelos);return t.danificados_mau_uso+t.nao_localizado+t.aguardando_garantia+t.aConferir;}
  return lista.sort((a,b)=>ordem==='nome'?a.nome.localeCompare(b.nome,'pt-BR'):ordem==='parque'?totaisInventario(b.modelos).recebido-totaisInventario(a.modelos).recebido:prioridade(b)-prioridade(a)||a.nome.localeCompare(b.nome,'pt-BR'));
 },[painel,termo,situacao,tipo,ordem,escolaFiltro]);
 const opcoesEscolas=useMemo(()=>[...(painel?.escolas||[])].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')),[painel]);
 useEffect(()=>{if(painel&&escolaFiltro&&!painel.escolas.some(e=>e.id===escolaFiltro))setEscolaFiltro('')},[painel,escolaFiltro]);
 const modelos=useMemo(()=>escolas.flatMap(e=>e.modelos),[escolas]),t=useMemo(()=>totaisInventario(modelos),[modelos]),categorias=useMemo(()=>resumirCategorias(modelos),[modelos]);
 const tipos=useMemo(()=>[...new Set((painel?.escolas||[]).flatMap(e=>e.modelos.map(m=>m.tipo)))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[painel]);
 const atualizadas=escolas.filter(e=>situacaoInventario(e).key==='atualizado').length;
 const pendentes=escolas.filter(e=>!e.ultima_resposta).length;
 const vencidas=escolas.filter(e=>(diasInventario(e)??0)>90).length;
 const maiorDano=categorias.find(c=>c.danificados_mau_uso>0);
 const usuario=painel?.contexto;const ehField=usuario?.role==='field';
 function limpar(){setEscolaFiltro('');setBusca('');setSituacao('todas');setTipo('todos');setOrdem('atencao');}
 async function abrir(escolaId:string,botaoOrigem:HTMLElement){
  if(abrindo)return;origemModal.current=botaoOrigem;setAbrindo(escolaId);setErro('');
  try{const {data,error}=await supabase.rpc('hub_inventario_escola',{p_escola_id:escolaId});if(error)throw error;setAtiva(data as EscolaInventario);}
  catch(e){const r=e as {code?:string;message?:string};if(r.code==='42501')await carregar();setErro(r.code==='42501'?r.message||'O vínculo da escola foi alterado.':'Não foi possível abrir o detalhamento. Tente novamente.');}
  finally{setAbrindo('')}
 }
 function fechar(){const origem=origemModal.current;setAtiva(null);void carregar();requestAnimationFrame(()=>{if(origem?.isConnected)origem.focus({preventScroll:true})});}
 const atencoes:[string,string,string][]=[];
 if(maiorDano&&!t.divergentes)atencoes.push(['Recuperação e manutenção',`${maiorDano.nome}: ${n(maiorDano.danificados_mau_uso)} sem uso (${Math.round(maiorDano.danificados_mau_uso/Math.max(maiorDano.recebido,1)*100)}% dos recebidos). Avalie a possibilidade de recuperação e os encaminhamentos necessários.`,'border-rose-500/20 bg-rose-500/5 text-rose-300']);
 if(t.nao_localizado&&!t.divergentes)atencoes.push(['Localização dos equipamentos',`${n(t.nao_localizado)} equipamentos declarados como não localizados. Priorize a conferência física e o registro de evidências junto às escolas.`,'border-violet-500/20 bg-violet-500/5 text-violet-300']);
 if(t.aguardando_garantia&&!t.divergentes)atencoes.push(['Acompanhamento de garantia',`${n(t.aguardando_garantia)} equipamentos aguardando garantia. Confira o andamento dos encaminhamentos e atualize a situação após o retorno.`,'border-amber-500/20 bg-amber-500/5 text-amber-300']);
 if(t.divergentes||t.aConferir||pendentes||vencidas)atencoes.push(['Conferência do levantamento',`${t.divergentes?`${t.divergentes} modelos com divergências; `:''}${n(t.aConferir)} equipamentos a classificar; ${pendentes} escolas sem levantamento e ${vencidas} com envio há mais de 90 dias. Atualize a base antes de tirar conclusões sobre o parque.`,'border-cyan-500/20 bg-cyan-500/5 text-cyan-300']);
 return <main className={styles.main}>
  <header className={styles.hero}>
    <div className={styles.heroIntro}><span className={styles.heroIcon}><Icone nome="escola" /></span><div><p className={styles.eyebrow}>SETEC Hub · Parque tecnológico</p><h1>{ehField ? "Inventário das minhas escolas" : "Inventário Field"}</h1><p className={styles.heroDescription}>{ehField ? "Uma visão do seu parque tecnológico, da situação dos equipamentos às próximas conferências." : "Acompanhe o parque por técnico e escola, com os mesmos dados utilizados na Visão Geral."}</p><div className={styles.heroChips}>{ehField && usuario?.tecnico && <span><Icone nome="pessoa" />{usuario.tecnico.nome}{!usuario.tecnico.ativo ? " · vínculo inativo" : ""}</span>}{painel && <span><Icone nome="escola" />{painel.escolas.length} {ehField ? "escolas atribuídas" : "escolas na base"}</span>}</div></div></div>
    <div className={styles.heroActions}><button type="button" onClick={() => void carregar()} disabled={carregando || !!ativa} className={botao} data-busy={carregando}><Icone nome="atualizar" />{carregando ? "Atualizando…" : "Atualizar dados"}</button>{!ehField && <a href="/inventario/visao-geral" className={`${botao} ${styles.primaryButton}`}>Visão Geral<Icone nome="seta" /></a>}</div>
  </header>

  {usuario?.pode_gerir && <nav className={styles.viewTabs} aria-label="Áreas do inventário"><button type="button" onClick={() => setVista("painel")} aria-pressed={vista === "painel"}><Icone nome="painel" />Painel de equipamentos</button><button type="button" onClick={() => setVista("vinculos")} aria-pressed={vista === "vinculos"}><Icone nome="vinculos" />Vínculos de acesso</button></nav>}
  {erro && <div role="alert" className={styles.error}>{erro}{painel && <p>A tela mantém os dados da consulta anterior.</p>}</div>}
  {vista === "vinculos" && usuario?.pode_gerir ? <VinculosInventario /> : carregando && !painel ? <div role="status" className={styles.loading}><Icone nome="atualizar" /><p>Consultando escolas e inventários…</p></div> : !painel ? <div className={styles.empty}><Icone nome="equipamento" /><p>O inventário não está disponível nesta sessão.</p><button type="button" onClick={() => void carregar()} className={botao}>Tentar novamente</button></div> : <>
    {ehField && (!usuario.tecnico || !usuario.tecnico.ativo) && <div className={styles.warning}><h2>Vínculo com o técnico pendente</h2><p>Solicite ao administrador que associe sua conta a um técnico ativo. Depois da associação, suas escolas aparecerão automaticamente.</p></div>}

    <section className={styles.filters} aria-label="Filtros do inventário">
      <div className={styles.filterHeading}><span><Icone nome="filtros" />Personalize sua visão</span><button type="button" onClick={limpar} className={styles.clearButton}>Limpar filtros</button></div>
      <div className={styles.filterGrid} data-field={ehField}>
        <label className={styles.searchLabel}>Buscar escola ou CIE<div className={styles.searchControl}><Icone nome="buscar" /><input type="search" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Nome da escola ou CIE" aria-label="Buscar escola ou CIE" /></div></label>
        <label>Escola<select aria-label="Filtrar por escola" value={escolaFiltro} onChange={event => setEscolaFiltro(event.target.value)} className={seletor}><option value="">{ehField ? "Todas as minhas escolas" : "Todas as escolas"}</option>{opcoesEscolas.map(escola => <option key={escola.id} value={escola.id}>{escola.nome}{escola.cie ? ` · CIE ${escola.cie}` : ""}</option>)}</select></label>
        {!ehField && <label>Técnico<select aria-label="Filtrar por técnico" value={tecnico} onChange={event => { setEscolaFiltro(""); setTecnico(event.target.value) }} className={seletor}><option value="">Todos os técnicos</option>{painel.tecnicos.map(item => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? "" : " · inativo"}</option>)}</select></label>}
        <label>Situação do inventário<select aria-label="Filtrar por situação" value={situacao} onChange={event => setSituacao(event.target.value)} className={seletor}><option value="todas">Todas as situações</option><option value="atencao">Com pontos de atenção</option><option value="atualizado">Inventário em dia</option><option value="pendente">Sem levantamento</option><option value="vencido">Há mais de 90 dias</option><option value="revisar">Revisar quantidades</option></select></label>
        <label>Tipo de equipamento<select aria-label="Filtrar por tipo de equipamento" value={tipo} onChange={event => setTipo(event.target.value)} className={seletor}><option value="todos">Todos os tipos</option>{tipos.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Ordenar escolas<select aria-label="Ordenar escolas" value={ordem} onChange={event => setOrdem(event.target.value)} className={seletor}><option value="atencao">Maior atenção</option><option value="parque">Maior parque</option><option value="nome">Nome da escola</option></select></label>
      </div>
      <div className={styles.filterSummary}><span><i />{escolas.length} de {painel.escolas.length} escolas</span><span>Indicadores acompanham os filtros</span></div>
    </section>

    <section className={styles.metrics} aria-label="Indicadores do parque">
      <CardMetrica titulo="Equipamentos recebidos" valor={n(t.recebido)} detalhe={`${escolas.length} escolas · ${n(t.plataformas)} plataformas à parte`} />
      <CardMetrica titulo="Funcionando" valor={t.declarado ? n(t.funcionando) : "—"} detalhe={t.declarado ? "Declarados em funcionamento" : "Levantamento a conferir"} cor="text-emerald-300" />
      <CardMetrica titulo="Aguardando garantia" valor={t.declarado ? n(t.aguardando_garantia) : "—"} detalhe="Acompanhar encaminhamentos" cor="text-amber-300" />
      <CardMetrica titulo="Danificados / sem uso" valor={t.declarado ? n(t.danificados_mau_uso) : "—"} detalhe="Avaliar recuperação e manutenção" cor="text-rose-300" />
      <CardMetrica titulo="Não localizados" valor={t.declarado ? n(t.nao_localizado) : "—"} detalhe="Priorizar conferência física" cor="text-violet-300" />
    </section>
    {t.divergentes > 0 && <p role="alert" className={styles.warning}>{t.divergentes} modelos apresentam quantidades declaradas incompatíveis com o estoque atual. Confira o levantamento antes de usar os percentuais.</p>}

    <div className={styles.analysisGrid}>
      <Bloco titulo="Disponibilidade do parque" detalhe="Equipamentos funcionando em relação ao total recebido." icone="painel">
        <div className={styles.availability}><Ring t={t} /><div className={styles.availabilityText}><span className={styles.smallLabel}>Inventários em dia</span><p><strong>{atualizadas}</strong><span> / {escolas.length} escolas</span></p><div className={styles.progress} role="meter" aria-label="Escolas com inventário em dia" aria-valuenow={atualizadas} aria-valuemin={0} aria-valuemax={Math.max(escolas.length, 1)}><span style={{ width: `${escolas.length ? atualizadas / escolas.length * 100 : 0}%`, background: "#60a5fa" }} /></div><p className={styles.muted}>{pendentes} sem levantamento · {vencidas} há mais de 90 dias</p><span className={styles.conferencePill}>{n(t.aConferir)} equipamentos a conferir</span></div></div>
        <div className={styles.distributionBlock}><div className={styles.distributionLabel}><span>Situação dos equipamentos</span><span>{n(t.recebido)} recebidos</span></div><Distribuicao t={t} /><div className={styles.legend}>{CAMPOS_INVENTARIO.map(c => <span key={c.key}><i style={{ background: c.cor }} />{c.label}</span>)}<span><i style={{ background: "#64748b" }} />A conferir</span></div><p className={styles.chartNote}>Plataformas de recarga contadas à parte.</p></div>
      </Bloco>
      <Bloco titulo="Atenção por tipo de equipamento" detalhe="Danificados / sem uso em relação à quantidade recebida de cada tipo." icone="alerta">
        {categorias.length ? <div className={styles.categoryList}>{categorias.slice(0, 6).map(categoria => {
          const percentual = Math.min(100, categoria.danificados_mau_uso / Math.max(1, categoria.recebido) * 100)
          return <div className={styles.category} key={categoria.nome}>
            <div className={styles.categoryHeading}><span className={styles.categoryName}>{categoria.nome}</span><span className={styles.percentPill}>{Math.round(percentual)}%</span></div>
            <div className={styles.categoryBar} role="meter" aria-label={`${categoria.nome}: danificados ou sem uso`} aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${n(categoria.danificados_mau_uso)} de ${n(categoria.recebido)} equipamentos, ${Math.round(percentual)}%`}><span style={{ width: `${percentual}%` }} /></div>
            <div className={styles.categoryCaption}><span><strong>{n(categoria.danificados_mau_uso)}</strong> sem uso <span>de {n(categoria.recebido)} recebidos</span></span><span>{n(categoria.aConferir)} a conferir</span></div>
          </div>
        })}</div> : <div className={styles.chartEmpty}><Icone nome="equipamento" /><p>Não há equipamentos neste filtro para comparar.</p></div>}
      </Bloco>
    </div>

    <Bloco titulo="Pontos de atenção" detalhe="Prioridades com base nos levantamentos das escolas selecionadas." icone="localizar">
      {atencoes.length ? <div className={styles.insights}>{atencoes.map(([titulo, texto, cor]) => <article key={titulo} className={styles.insight} data-tone={cor.includes("rose") ? "rose" : cor.includes("violet") ? "violet" : cor.includes("amber") ? "amber" : "blue"}><span className={styles.insightIcon}><Icone nome={cor.includes("rose") ? "alerta" : cor.includes("violet") ? "localizar" : cor.includes("amber") ? "garantia" : "check"} /></span><div><h3>{titulo}</h3><p>{texto}</p></div></article>)}</div> : <p className={styles.emptyText}>{t.recebido ? "Nenhum ponto de atenção identificado nos dados deste filtro. Mantenha as conferências periódicas." : "Os apontamentos aparecerão quando houver equipamentos e levantamentos neste filtro."}</p>}
    </Bloco>

    <section className={styles.schools} aria-label="Escolas do inventário">
      <div className={styles.schoolsHeading}><div><p className={styles.eyebrow}>Conferência por unidade</p><h2>{ehField ? "Minhas escolas" : "Escolas e equipamentos"}</h2><p>Selecione uma escola para ver os modelos e atualizar as quantidades.</p></div><span className={styles.countPill}>{escolas.length} escolas no filtro</span></div>
      {escolas.length === 0 ? <div className={styles.empty}><span className={styles.heroIcon}><Icone nome="buscar" /></span><h3>Nenhuma escola neste filtro</h3><p>{ehField && painel.escolas.length === 0 ? "Após a vinculação da sua conta, as escolas definidas na setorização aparecerão aqui." : "Ajuste a escola, a busca e os demais filtros para consultar os equipamentos."}</p><button type="button" onClick={limpar} className={botao}>Limpar filtros</button></div> : <div className={styles.schoolGrid}>{escolas.slice(0, limite).map(escola => {
        const totais = totaisInventario(escola.modelos)
        return <article key={escola.id} className={styles.schoolCard}>
          <div className={styles.schoolCardTop}><span className={styles.schoolCardIcon}><Icone nome="escola" /></span><StatusEscola escola={escola} /></div>
          <p className={styles.schoolCode}>CIE {escola.cie || "não informado"}</p><h3>{escola.nome}</h3>
          <div className={styles.schoolTotal}><strong>{n(totais.recebido)}</strong><span>equipamentos recebidos</span></div>
          <div className={styles.schoolReference}><span><Icone nome="pessoa" />{escola.tecnico_nome || "Sem técnico atribuído"}</span><span><Icone nome="relogio" />Último envio {formatarDataInventario(escola.ultima_resposta?.created_at)}</span></div>
          <Distribuicao t={totais} />
          <dl className={styles.schoolValues}>{CAMPOS_INVENTARIO.map(c => <div key={c.key}><dt><i style={{ background: c.cor }} />{c.label}</dt><dd style={{ color: c.cor }}>{totais.declarado ? n(totais[c.key]) : "—"}</dd></div>)}</dl>
          {totais.aConferir > 0 && <p className={styles.schoolConference}>{n(totais.aConferir)} equipamentos a conferir</p>}
          <button type="button" disabled={!!abrindo} onClick={event => void abrir(escola.id, event.currentTarget)} className={styles.schoolOpen}>{abrindo === escola.id ? "Carregando escola…" : "Ver detalhes da escola"}<Icone nome={abrindo === escola.id ? "atualizar" : "seta"} /></button>
        </article>
      })}</div>}
      {limite < escolas.length && <button type="button" onClick={() => setLimite(valor => valor + 12)} className={`${botao} ${styles.showMore}`}>Mostrar mais escolas ({escolas.length - limite} restantes)<Icone nome="seta" /></button>}
    </section>
    <p className={styles.pageNote}><Icone nome="relogio" /><span>Dados do último inventário com itens de cada escola · Referência: {formatarDataInventario(painel.atualizado_em)}. As plataformas de recarga permanecem no detalhamento e no preenchimento.</span></p>
  </>}
  {ativa && usuario && <DetalhesEscola escola={ativa} contexto={usuario} onFechar={fechar} onSalvo={fechar} />}
 </main>
}
