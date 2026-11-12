"use client"
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowDownWideNarrow, ArrowLeft, ArrowRight, Building2, CalendarClock, CircleHelp, Mail, MapPin, Monitor, Phone, RefreshCw, Search, SlidersHorizontal, UserRound, Users, Wifi, X } from "lucide-react"
import { useEscolas } from "@/lib/escolas/useEscolas"
import { dataBR, normalizar, numero, percentual, rotaEscola, telefoneEscola, emailEscola, STATUS_ESCOLA, texto, type CriticidadeEscola, type EscolaPainel } from "@/lib/escolas/modelo"
import { BarraEscola, botaoEscola, campoEscola, CarregandoEscolas, ErroEscola, EstatisticaEscola, PainelEscola, SeloEscola } from "@/components/escolas/ElementosEscola"
import PainelMapaEscolar from "@/components/escolas/PainelMapaEscolar"
import RelatorioEscolas from "@/components/escolas/RelatorioEscolas"

const TAMANHO_PAGINA = 12
export default function PainelEscolar() {
  const { escolas, loading, erro, consultado, carregar } = useEscolas()
  const [busca, setBusca] = useState(""), buscaAdiada = useDeferredValue(busca)
  const [status, setStatus] = useState("todas"), [tecnico, setTecnico] = useState("todos"), [ordem, setOrdem] = useState("nome")
  const [pagina, setPagina] = useState(1), [selecionada, setSelecionada] = useState<string | null>(null), [mostrarMapa, setMostrarMapa] = useState(0)
  const resumo = useMemo(() => {
    const r = { critica: 0, atencao: 0, saudavel: 0, sem_dados: 0 }
    escolas.forEach(e => r[e.indicadores.criticidade]++)
    return r
  }, [escolas])
  const tecnicos = useMemo(() => [...new Set(escolas.map(e => texto(e.tecnico_atribuido, "")).filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt-BR")), [escolas])
  const filtradas = useMemo(() => {
    const termos = normalizar(buscaAdiada).split(/\s+/).filter(Boolean)
    return escolas.filter(e => termos.every(t => e.busca.includes(t)) && (status === "todas" || e.indicadores.criticidade === status) &&
      (tecnico === "todos" || (tecnico === "sem_tecnico" ? !texto(e.tecnico_atribuido, "") : texto(e.tecnico_atribuido, "") === tecnico))).sort((a,b) => {
        if (ordem === "prioridade") { const diferenca = STATUS_ESCOLA[a.indicadores.criticidade].ordem - STATUS_ESCOLA[b.indicadores.criticidade].ordem; if (diferenca) return diferenca; const score = (a.indicadores.score ?? 2) - (b.indicadores.score ?? 2); if (score) return score }
        if (ordem === "visita") { const data = (a.ultima_visita || "").localeCompare(b.ultima_visita || ""); if (data) return data }
        return texto(a.nome_escola, "").localeCompare(texto(b.nome_escola, ""), "pt-BR", { numeric: true }) || a.id.localeCompare(b.id)
      })
  }, [escolas, buscaAdiada, status, tecnico, ordem])
  useEffect(() => { setPagina(1) }, [buscaAdiada, status, tecnico, ordem])
  const paginas = Math.max(1, Math.ceil(filtradas.length / TAMANHO_PAGINA)), atual = Math.min(pagina, paginas)
  const visiveis = filtradas.slice((atual - 1) * TAMANHO_PAGINA, atual * TAMANHO_PAGINA)
  const selecionadaVisivel = filtradas.find(e => e.id === selecionada)
  const selecionar = useCallback((escola: EscolaPainel) => {
    setSelecionada(escola.id)
    const indice = filtradas.findIndex(e => e.id === escola.id)
    if (indice >= 0) setPagina(Math.floor(indice / TAMANHO_PAGINA) + 1)
  }, [filtradas])
  const localizar = useCallback((escola: EscolaPainel) => { setSelecionada(escola.id); setMostrarMapa(n => n + 1) }, [])
  function limpar() { setBusca(""); setStatus("todas"); setTecnico("todos"); setOrdem("nome"); setSelecionada(null) }
  if (loading && !escolas.length) return <CarregandoEscolas/>
  return <div className="mx-auto min-w-0 max-w-[1700px] space-y-5 pb-8">
    <header className="relative overflow-hidden rounded-[2.25rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.13),transparent_32%)]"/>
      <div className="relative z-10 min-w-0">
        <div className="mb-4 flex flex-wrap gap-2"><span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Rede escolar</span><span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">URE Guarulhos Sul</span></div>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Painel <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-600 bg-clip-text text-transparent">Escolar</span></h1>
        <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">Consulte as unidades, acompanhe a infraestrutura e gere relatórios com o inventário das escolas.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><RelatorioEscolas filtros={{busca,status,tecnico,ordem}} total={escolas.length} filtradas={filtradas.length} className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-5 text-sm font-black uppercase tracking-widest text-violet-200 transition hover:bg-violet-500/25"/><button type="button" onClick={()=>void carregar()} disabled={loading} aria-busy={loading} className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-sm font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"><RefreshCw size={17} aria-hidden="true" className={loading?"animate-spin":""}/>{loading?"Atualizando…":"Atualizar dados"}</button></div>
        {consultado&&<p className="mt-4 text-xs text-slate-500">Consulta atualizada às {consultado.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Indicadores do painel baseados no cadastro das escolas.</p>}
      </div>
    </header>
    {erro && <ErroEscola texto={escolas.length ? `${erro} Os dados da última consulta foram mantidos.` : erro} tentar={() => void carregar()} carregando={loading}/>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <EstatisticaEscola icone={Building2} label="Unidades escolares" valor={numero(escolas.length)} ajuda={`${resumo.saudavel} com índice saudável`}/>
      <EstatisticaEscola icone={AlertTriangle} label="Índice crítico" valor={numero(resumo.critica)} ajuda="Prioridade na análise técnica" cor="text-red-300"/>
      <EstatisticaEscola icone={CalendarClock} label="Em atenção" valor={numero(resumo.atencao)} ajuda="Acompanhar infraestrutura" cor="text-amber-300"/>
      <EstatisticaEscola icone={CircleHelp} label="Dados incompletos" valor={numero(resumo.sem_dados)} ajuda="Cadastro insuficiente para o índice" cor="text-slate-300"/>
    </div>
    <PainelEscola>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200"><SlidersHorizontal size={17} aria-hidden="true"/>Encontre uma unidade</div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
        <label className="block min-w-0 sm:col-span-2 xl:col-span-1"><span className="mb-1.5 block text-xs text-slate-400">Escola, CIE ou contato</span><span className="relative block"><Search size={18} aria-hidden="true" className="absolute left-3 top-4 text-slate-500"/><input aria-label="Buscar escola" className={`${campoEscola} pl-10 pr-11`} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, CIE, diretor, endereço…" maxLength={180}/>{busca && <button className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center rounded-xl text-slate-400 hover:text-white" type="button" aria-label="Limpar busca" onClick={() => setBusca("")}><X size={17}/></button>}</span></label>
        <label className="block min-w-0"><span className="mb-1.5 block text-xs text-slate-400">Situação do índice</span><select aria-label="Filtrar situação" className={campoEscola} value={status} onChange={e => setStatus(e.target.value)}><option value="todas">Todas as situações</option>{Object.entries(STATUS_ESCOLA).map(([key,s]) => <option key={key} value={key}>{s.label} ({resumo[key as CriticidadeEscola]})</option>)}</select></label>
        <label className="block min-w-0"><span className="mb-1.5 block text-xs text-slate-400">Técnico no cadastro</span><select aria-label="Filtrar técnico" className={campoEscola} value={tecnico} onChange={e => setTecnico(e.target.value)}><option value="todos">Todos os técnicos</option>{tecnicos.map(t => <option key={t} value={t}>{t}</option>)}<option value="sem_tecnico">Sem técnico informado</option></select></label>
        <label className="block min-w-0"><span className="mb-1.5 flex items-center gap-1 text-xs text-slate-400"><ArrowDownWideNarrow size={13} aria-hidden="true"/>Ordenar por</span><select aria-label="Ordenar escolas" className={campoEscola} value={ordem} onChange={e => setOrdem(e.target.value)}><option value="nome">Nome da escola</option><option value="prioridade">Prioridade do índice</option><option value="visita">Visita mais antiga / sem registro</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span aria-live="polite" aria-busy={busca !== buscaAdiada}>{filtradas.length} de {escolas.length} {escolas.length === 1 ? "escola" : "escolas"} no recorte · O mapa acompanha os filtros.</span>{(busca || status !== "todas" || tecnico !== "todos" || ordem !== "nome") && <button type="button" onClick={limpar} className="min-h-11 px-2 font-semibold text-blue-300 hover:text-blue-200">Limpar filtros</button>}</div>
    </PainelEscola>
    <PainelMapaEscolar escolas={filtradas} selecionada={selecionadaVisivel?.id} selecionar={selecionar} mostrarPedido={mostrarMapa}/>
    {selecionadaVisivel && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100"><span className="min-w-0 break-words">Selecionada: <strong>{selecionadaVisivel.nome_escola}</strong></span><button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-cyan-500/10" aria-label="Limpar escola selecionada" onClick={() => setSelecionada(null)}><X size={17}/></button></div>}
    <section aria-label="Lista de escolas" className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-white">Unidades escolares</h2><p className="text-xs text-slate-400">{filtradas.length ? `${(atual - 1) * TAMANHO_PAGINA + 1}–${Math.min(atual * TAMANHO_PAGINA, filtradas.length)} de ${filtradas.length}` : "Nenhum resultado"}</p></div>
      {visiveis.length > 0 ? <div id="lista-escolas" className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">{visiveis.map(e => <CartaoEscola key={e.id} escola={e} selecionada={selecionada === e.id} localizar={localizar}/>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center"><Building2 size={30} className="mx-auto text-slate-500" aria-hidden="true"/><h3 className="mt-3 font-semibold text-slate-200">Nenhuma escola encontrada</h3><p className="mt-2 text-sm text-slate-400">Tente outro nome, CIE ou ajuste os filtros.</p>{escolas.length > 0 && <button type="button" onClick={limpar} className={`${botaoEscola} mt-4`}>Limpar filtros</button>}</div>}
      {paginas > 1 && <nav aria-label="Paginação das escolas" className="mt-5 flex flex-wrap items-center justify-center gap-3"><button type="button" aria-controls="lista-escolas" className={botaoEscola} disabled={atual === 1} onClick={() => setPagina(atual - 1)}><ArrowLeft size={16} aria-hidden="true"/>Anterior</button><span aria-live="polite" className="text-sm text-slate-400">Página {atual} de {paginas}</span><button type="button" aria-controls="lista-escolas" className={botaoEscola} disabled={atual === paginas} onClick={() => setPagina(atual + 1)}>Próxima<ArrowRight size={16} aria-hidden="true"/></button></nav>}
    </section>
    <details className="rounded-2xl border border-slate-800 bg-[#080F20] p-4 text-sm text-slate-400"><summary className="min-h-7 cursor-pointer font-semibold text-slate-300">Como interpretar os indicadores</summary><div className="mt-3 space-y-2 text-xs leading-relaxed"><p>Índice referencial do Hub: equipamentos funcionando com peso de 60% (referência de 1 para cada 3 alunos) e APs com peso de 40% (1 para cada 2 salas). Crítica: abaixo de 60%; atenção: de 60% a menos de 80%; saudável: a partir de 80%.</p><p>São referências de priorização, não um diagnóstico de rede nem uma regra oficial de aquisição. Sem dados suficientes, a escola fica como “Dados incompletos”. Zero informado é considerado zero; equipamentos recebidos não substituem equipamentos funcionando.</p><p>Contato, técnico, visitas e localização refletem o cadastro da escola. Os filtros e a paginação não fazem novas consultas à base.</p></div></details>
  </div>
}

const CartaoEscola = memo(function CartaoEscola({ escola: e, selecionada, localizar }: { escola: EscolaPainel; selecionada: boolean; localizar: (e: EscolaPainel) => void }) {
  const m = e.indicadores, config = STATUS_ESCOLA[m.criticidade], telefone = telefoneEscola(e), email = emailEscola(e), rota = rotaEscola(e)
  const nome = texto(e.nome_escola, "Unidade sem nome")
  return <article aria-label={nome} className={`flex min-w-0 flex-col rounded-2xl border bg-[#080F20] p-4 sm:p-5 ${selecionada ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-slate-800"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold tracking-wide text-blue-300">CIE {texto(e.cie, "não informado")}</span><SeloEscola status={m.criticidade}/></div>
    <h3 className="mt-3 break-words text-base font-bold leading-snug text-white"><Link href={`/escolas/${encodeURIComponent(e.id)}`} className="rounded-sm hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-400">{nome}</Link></h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{[e.tipo_ensino,e.periodo].filter(Boolean).join(" · ") || "Ensino e período não informados"}</p>
    <div className="mt-4 space-y-2 text-xs text-slate-400"><p className="flex min-w-0 items-start gap-2"><MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0"/><span className="line-clamp-2 break-words">{texto(e.endereco, "Endereço não informado")}</span></p><p className="flex items-start gap-2"><UserRound size={15} aria-hidden="true" className="shrink-0"/><span className="break-words">{texto(e.tecnico_atribuido, "Técnico não informado")}</span></p></div>
    <div className="my-4 grid grid-cols-3 divide-x divide-slate-800 rounded-xl bg-slate-950/60 py-3">{[{label:"Alunos",valor:m.alunos,Icone:Users},{label:"Funcionando",valor:m.funcionando,Icone:Monitor},{label:"APs",valor:m.aps,Icone:Wifi}].map(({label,valor,Icone}) => <div key={label} className="min-w-0 text-center"><Icone size={15} aria-hidden="true" className="mx-auto mb-1 text-slate-500"/><p className="text-lg font-semibold text-slate-100">{numero(valor)}</p><p className="mt-1 text-[11px] text-slate-400">{label}</p></div>)}</div>
    <div className="mt-auto"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-slate-400">Índice referencial</span><span className="font-semibold" style={{color:config.cor}}>{percentual(m.score)}</span></div><BarraEscola valor={m.score} cor={config.cor} label={`Índice de ${nome}`}/><p className="mt-3 text-xs text-slate-400">Última visita: {dataBR(e.ultima_visita)}</p></div>
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4"><Link href={`/escolas/${encodeURIComponent(e.id)}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">Abrir ficha<ArrowRight size={15} aria-hidden="true"/></Link>
      {e.ponto ? <button type="button" aria-label={`Localizar ${nome} no mapa`} title="Localizar no mapa" className={`${botaoEscola} w-11 shrink-0 !px-0`} onClick={() => localizar(e)}><MapPin size={17} aria-hidden="true"/></button> : rota ? <a aria-label={`Abrir rota para ${nome}`} title="Abrir rota pelo endereço" className={`${botaoEscola} w-11 shrink-0 !px-0`} href={rota} target="_blank" rel="noopener noreferrer"><MapPin size={17} aria-hidden="true"/></a> : <span title="Localização não informada" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-600"><MapPin size={17} aria-hidden="true"/></span>}
      {telefone && <a href={telefone} aria-label={`Ligar para ${nome}: ${e.telefone}`} title={`Ligar: ${e.telefone}`} className={`${botaoEscola} w-11 shrink-0 !px-0`}><Phone size={16} aria-hidden="true"/></a>}
      {email && <a href={email} aria-label={`Enviar e-mail para ${nome}`} title={texto(e.email)} className={`${botaoEscola} w-11 shrink-0 !px-0`}><Mail size={16} aria-hidden="true"/></a>}
    </div>
  </article>
})
