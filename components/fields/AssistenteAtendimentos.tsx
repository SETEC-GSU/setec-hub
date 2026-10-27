"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { analisarRecomendacoes, categoriasDisponiveis, categoriaPrincipal, pesoUrgencia, resumoRecomendacoes, validarFiltros } from "@/lib/fields-recomendacoes/analise";
import { FILTROS_INICIAIS, type BaseRecomendacoes, type FiltrosRecomendacoes, type ItemRecomendacao } from "@/lib/fields-recomendacoes/types";
import s from "./AssistenteAtendimentos.module.css";

const numero = (n: number) => n.toLocaleString("pt-BR");
const dataBR = (v: string | null) => v ? v.slice(0, 10).split("-").reverse().join("/") : "Não informada";
const campoFiltro = { equilibrado: "Equilibrado", pendencias: "Mais pendências", cobertura: "Maior tempo sem visita" };
const POR_PAGINA = 10;

function Tag({ children, tom = "" }: { children: ReactNode; tom?: "critica" | "azul" | "ambar" | "" }) {
  return <span className={`${s.tag} ${tom ? s[tom] : ""}`}>{children}</span>;
}
function Metrica({ label, valor, children }: { label: string; valor: ReactNode; children?: ReactNode }) {
  return <div className={s.metrica}><span>{label}</span><strong>{valor}</strong>{children}</div>;
}

export default function AssistenteAtendimentos({ chaveUsuario }: { chaveUsuario: string }) {
  const [base, setBase] = useState<BaseRecomendacoes | null>(null), [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true), [feedback, setFeedback] = useState("");
  const [filtros, setFiltros] = useState<FiltrosRecomendacoes>({ ...FILTROS_INICIAIS });
  const [pagina, setPagina] = useState(1), [escolaAberta, setEscolaAberta] = useState<string | null>(null);
  const vivo = useRef(false), consulta = useRef<AbortController | null>(null), restaurado = useRef("");
  const chave = `hub:fields:recomendacoes:${chaveUsuario}`;

  const carregar = useCallback(async () => {
    if (consulta.current) return;
    const controller = new AbortController(); consulta.current = controller;
    const timer = setTimeout(() => controller.abort(), 23000);
    setCarregando(true); setErro(""); setFeedback("");
    try {
      const res = await fetch("/api/fields/recomendacoes", { signal: controller.signal, cache: "no-store" });
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        if ([401, 403].includes(res.status) && vivo.current) { setBase(null); setEscolaAberta(null); }
        throw new Error(dados?.erro || "Não foi possível consultar o assistente.");
      }
      if (!dados || dados.versao !== 1 || !Array.isArray(dados.escolas)) throw new Error("A base retornada não é compatível com esta página.");
      if (!vivo.current || controller.signal.aborted) return;
      const novaBase = dados as BaseRecomendacoes;
      setBase(novaBase);
      if (restaurado.current !== chave) {
        restaurado.current = chave;
        let salvos: FiltrosRecomendacoes | null = null;
        try { const raw = sessionStorage.getItem(chave); if (raw) salvos = validarFiltros(JSON.parse(raw), novaBase); } catch {}
        setFiltros(salvos || { ...FILTROS_INICIAIS });
      } else setFiltros(f => validarFiltros(f, novaBase) || { ...FILTROS_INICIAIS });
      setPagina(1);
    } catch (e) {
      if (vivo.current && consulta.current === controller) setErro(controller.signal.aborted ? "A consulta demorou ou foi interrompida. Tente atualizar novamente." : e instanceof Error ? e.message : "Não foi possível consultar o assistente.");
    } finally {
      clearTimeout(timer);
      if (consulta.current === controller) { consulta.current = null; if (vivo.current) setCarregando(false); }
    }
  }, [chave]);
  useEffect(() => {
    vivo.current = true; setBase(null); setEscolaAberta(null); setPagina(1); setFiltros({ ...FILTROS_INICIAIS }); void carregar();
    return () => { vivo.current = false; consulta.current?.abort(); consulta.current = null; };
  }, [carregar]);
  useEffect(() => { if (base && restaurado.current === chave) { try { sessionStorage.setItem(chave, JSON.stringify(filtros)); } catch {} } }, [base, chave, filtros]);
  const itens = useMemo(() => base ? analisarRecomendacoes(base, filtros) : [], [base, filtros]);
  const categorias = useMemo(() => base ? categoriasDisponiveis(base) : [], [base]);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / POR_PAGINA)), paginaAtual = Math.min(pagina, totalPaginas);
  const selecionada = escolaAberta ? itens.find(i => i.id === escolaAberta) || null : null;
  const resumo = useMemo(() => ({ demandas: itens.reduce((n, i) => n + i.demandas.length, 0),
    semHistorico: itens.filter(i => i.diasSemVisita === null).length,
    cobertura: itens.filter(i => i.diasSemVisita !== null && i.diasSemVisita >= filtros.intervalo).length,
    comChamado: itens.filter(i => i.chamados.length > 0).length }), [itens, filtros.intervalo]);
  function alterar(v: Partial<FiltrosRecomendacoes>) { setFiltros(f => ({ ...f, ...v })); setPagina(1); setFeedback(""); }
  async function copiar(lista: ItemRecomendacao[]) {
    if (!base) return;
    const texto = resumoRecomendacoes(base, filtros, lista);
    try {
      try { await navigator.clipboard.writeText(texto); }
      catch {
        const origem = document.activeElement as HTMLElement | null, area = document.createElement("textarea");
        area.value = texto; area.style.position = "fixed"; area.style.opacity = "0";
        (document.querySelector("dialog[open]") || document.body).appendChild(area); area.select();
        try { if (!document.execCommand("copy")) throw new Error("Cópia indisponível"); }
        finally { area.remove(); origem?.focus({ preventScroll: true }); }
      }
      setFeedback(`Planejamento copiado${lista.length > 20 ? " com as 20 primeiras escolas do recorte" : ""}.`);
    } catch { setFeedback("Não foi possível copiar. Confira a permissão de área de transferência do navegador e tente novamente."); }
  }

  return <main className={s.pagina} data-assistente-fields>
    <section className={s.hero}>
      <div className={s.linha}><div><p className={s.kicker}>SETEC Hub / Planejamento de campo</p><h1 className={s.titulo}>Assistente de Atendimentos</h1><p className={s.descricao}>Cruze as pendências das escolas com o tempo sem visita e organize os próximos atendimentos da equipe.</p></div>
        <div className={s.acoes}><Link className={s.botao} href="/fields">← Fields</Link><button className={`${s.botao} ${s.primario}`} type="button" onClick={() => void carregar()} disabled={carregando}>{carregando ? "Consultando…" : "↻ Atualizar base"}</button></div></div>
      <p className={s.atualizacao}>{base ? `Base consultada em ${new Date(base.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${base.perfil.escopo === "proprio" ? " · Suas escolas da setorização atual" : " · Setorização atual da equipe"}` : "Preparando o cruzamento dos dados…"}</p>
    </section>
    {erro && <div role="alert" className={s.erro}>{erro}{base && <p>O recorte anterior permanece disponível. Confira a data da última consulta antes de utilizá-lo.</p>}</div>}
    {!base && carregando && <div className={s.vazio} role="status">Consultando escolas, pendências e visitas realizadas…</div>}
    {base && <>
      {base.perfil.escopo === "proprio" && !base.perfil.vinculoField && <div className={s.aviso}>Seu usuário ainda não está vinculado a um técnico ativo. Solicite à gestão a conferência do vínculo para visualizar suas escolas.</div>}
      <div className={s.stats} aria-label="Indicadores do recorte">
        <div className={s.stat}><p>Escolas no recorte</p><strong>{numero(itens.length)}</strong><small>{base.escolas.length} escolas acessíveis na base</small></div>
        <div className={s.stat}><p>Demandas pendentes</p><strong>{numero(resumo.demandas)}</strong><small>Conforme a categoria selecionada</small></div>
        <div className={s.stat}><p>Sem visita há {filtros.intervalo}+ dias</p><strong>{numero(resumo.cobertura)}</strong><small>{resumo.semHistorico} sem visita registrada, à parte</small></div>
        <div className={s.stat}><p>Com chamados ativos</p><strong>{numero(resumo.comChamado)}</strong><small>Escolas para conferir antes de abrir outro</small></div>
      </div>
      <section className={s.filtros} aria-label="Filtros das recomendações"><div className={s.linha}><div><p className={s.kicker}>Configure seu planejamento</p><p className={s.nota}>Escolha o técnico, a categoria principal e o foco da recomendação.</p></div><div className={s.acoes}><a className={s.botao} href="#recomendacoes-fields">Ver recomendações ↓</a><button type="button" className={s.botao} onClick={() => alterar({ ...FILTROS_INICIAIS })}>Limpar filtros</button></div></div>
        <div className={s.gradeFiltros}>
          <label className={s.campo}>Técnico<select aria-label="Técnico das recomendações" value={filtros.tecnico} disabled={base.perfil.escopo === "proprio"} onChange={e => alterar({ tecnico: e.target.value })}><option value="">{base.perfil.escopo === "proprio" ? base.tecnicos[0]?.nome || "Minhas escolas" : "Todos os técnicos ativos"}</option>{base.perfil.escopo !== "proprio" && <><option value="__sem_tecnico__">Escolas sem técnico ativo</option>{base.tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</>}</select></label>
          <label className={s.campo}>Categoria principal<select aria-label="Categoria principal das recomendações" value={filtros.categoria} onChange={e => alterar({ categoria: e.target.value })}><option value="">Todas as categorias</option>{filtros.categoria && !categorias.includes(filtros.categoria) && <option value={filtros.categoria}>{filtros.categoria}</option>}{categorias.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className={s.campo}>Foco da recomendação<select aria-label="Foco da recomendação" value={filtros.foco} onChange={e => alterar({ foco: e.target.value as FiltrosRecomendacoes["foco"] })}>{Object.entries(campoFiltro).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <details className={s.maisFiltros} data-filtros-avancados><summary>Mais filtros de escola e cobertura{(filtros.situacao !== "recomendadas" || filtros.intervalo !== 30 || filtros.busca) ? " · recorte personalizado" : ""}</summary><div className={s.gradeFiltros}>
          <label className={s.campo}>Mostrar escolas<select aria-label="Situação das recomendações" value={filtros.situacao} onChange={e => alterar({ situacao: e.target.value as FiltrosRecomendacoes["situacao"] })}><option value="recomendadas">Com pendências ou atenção à cobertura</option><option value="pendencias">Somente com demandas pendentes</option><option value="sem_historico">Sem visita registrada</option><option value="com_chamado">Com chamados ativos no recorte</option><option value="todas">Todas as escolas</option></select></label>
          <label className={s.campo}>Referência de cobertura<select aria-label="Intervalo de atenção à cobertura" value={filtros.intervalo} onChange={e => alterar({ intervalo: Number(e.target.value) })}>{[15, 30, 45, 60, 90].map(n => <option key={n} value={n}>{n} dias sem visita</option>)}</select></label>
          <label className={s.campo}>Buscar escola ou CIE<input aria-label="Buscar escola ou CIE" type="search" maxLength={250} value={filtros.busca} onChange={e => alterar({ busca: e.target.value })} placeholder="Nome da escola, CIE ou técnico…"/></label>
        </div></details><p className={s.nota}>A categoria seleciona escolas com pendências ou chamados ativos nela. A última visita é geral, considera todo o histórico disponível e pode ter sido realizada por outro técnico.</p>
      </section>
      <details className={s.metodo}><summary>Como o assistente organiza as recomendações</summary><p>No foco equilibrado, escolas com demanda de urgência crítica vêm primeiro. Nas demais, a pontuação combina quantidade de pendências (até 40 pontos, teto em 10 demandas), tempo sem visita (até 35, teto em 90 dias), idade da pendência mais antiga (até 15, teto em 60 dias) e maior urgência cadastrada (até 10). O total vai de 0 a 100 e apoia a avaliação da equipe.</p><p>Sem histórico não significa um número conhecido de dias: o componente de tempo recebe zero e a escola é sinalizada para conferência. No foco de cobertura, datas conhecidas são ordenadas primeiro; use “Sem visita registrada” para revisar as demais. A referência de {filtros.intervalo} dias é um filtro de planejamento, não um prazo contratual.</p><p>Somente registros realizados, finalizados ou concluídos atualizam a visita. Agendamentos, cancelamentos e datas futuras ficam fora. Quando a visita não está datada, uma conclusão válida pode servir de referência, com identificação no detalhe. “Rede”, “Redes” e “Rede/Conectividade” são reunidas na categoria principal Rede/Conectividade; nenhuma subcategoria participa do filtro.</p></details>
      {Object.values(base.qualidade).some(n => n > 0) && <details className={s.aviso}><summary>Informações da base que precisam de conferência</summary>
        {base.qualidade.demandasSemVinculo > 0 && <p>{base.qualidade.demandasSemVinculo} demandas pendentes sem escola identificada ficaram fora das recomendações.</p>}
        {base.qualidade.chamadosSemVinculo > 0 && <p>{base.qualidade.chamadosSemVinculo} registros do histórico sem escola identificada ficaram fora do cruzamento.</p>}
        {base.qualidade.nomesAmbiguos > 0 && <p>{base.qualidade.nomesAmbiguos} escolas têm nomes repetidos na base. Registros vinculados apenas pelo nome não foram associados automaticamente a elas.</p>}
        {base.qualidade.concluidosSemData > 0 && <p>{base.qualidade.concluidosSemData} registros concluídos sem uma data de referência válida não atualizaram a última visita.</p>}
        {base.qualidade.visitasFuturas > 0 && <p>{base.qualidade.visitasFuturas} visitas com data futura não foram consideradas como realizadas.</p>}
        {base.qualidade.statusDemandasDesconhecidos > 0 && <p>{base.qualidade.statusDemandasDesconhecidos} demandas com situação diferente de Pendente Atendimento ou Concluída precisam ser conferidas; elas não foram presumidas como pendentes.</p>}
      </details>}
      <div className={`${s.linha} ${s.resultados}`} id="recomendacoes-fields"><div><p className={s.kicker}>Ordem sugerida de atendimento</p><h2 className={s.nome} style={{ marginTop: 9 }}>{campoFiltro[filtros.foco]} · {numero(itens.length)} escola(s)</h2></div><button type="button" className={s.botao} disabled={!itens.length} onClick={() => void copiar(itens)}>Copiar planejamento</button></div>
      {feedback && <p className={s.feedback} role="status">{feedback}</p>}
      {!itens.length && <div className={s.vazio}>Nenhuma escola corresponde a este recorte. Ajuste os filtros para conferir a cobertura e as pendências disponíveis.</div>}
      <div className={s.lista}>
        {itens.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA).map((i, pos) => <article key={i.id} className={s.card} data-recomendacao-escola={i.id}>
          <div className={s.linha}><div className={s.cabecalhoCard}><span className={s.ordem}>{String((paginaAtual - 1) * POR_PAGINA + pos + 1).padStart(2, "0")}</span><div><h3 className={s.nome}>{i.nome}</h3><p className={s.subtitulo}>CIE {i.cie || "não informado"} · {i.tecnicoNome || "Sem técnico ativo"}</p></div></div>
            <Tag tom={i.chamados.length ? "azul" : i.criticas ? "critica" : "ambar"}>{i.chamados.length ? "Conferir chamados ativos" : i.criticas ? "Urgência crítica cadastrada" : i.demandas.length ? "Planejar atendimento" : "Conferir cobertura"}</Tag></div>
          <div className={s.metricas}><Metrica label="Demandas pendentes" valor={numero(i.demandas.length)}/><Metrica label="Tempo sem visita geral" valor={i.diasSemVisita === null ? "Sem registro" : `${i.diasSemVisita} dias`}/><Metrica label={filtros.foco === "equilibrado" ? "Pontuação de priorização" : "Pendência mais antiga"} valor={filtros.foco === "equilibrado" ? `${i.pontos.total.toLocaleString("pt-BR")} / 100` : i.idadeMaisAntiga === null ? "Sem data" : `${i.idadeMaisAntiga} dias`}>{filtros.foco === "equilibrado" && <div className={s.barra} aria-hidden="true"><span style={{ width: `${i.pontos.total}%` }}/></div>}</Metrica></div>
          <p className={s.motivo}>{i.motivos.join(" ")}</p>
          <div className={s.etiquetas}>{i.criticas > 0 && <Tag tom="critica">{i.criticas} crítica(s)</Tag>}{i.altas > 0 && <Tag tom="ambar">{i.altas} alta(s)</Tag>}{i.previsoesVencidas > 0 && <Tag tom="ambar">{i.previsoesVencidas} previsão(ões) vencida(s)</Tag>}{i.previsaoChamado && <Tag tom="azul">Chamado com previsão em {dataBR(i.previsaoChamado)}</Tag>}{i.diasSemVisita === null && <Tag>Histórico a conferir</Tag>}{i.outrosChamados.length > 0 && <Tag>{i.outrosChamados.length} ativo(s) em outras categorias</Tag>}</div>
          <div className={s.rodapeCard}><p>{i.acao}</p><button type="button" className={`${s.botao} ${s.primario}`} onClick={() => { setEscolaAberta(i.id); setFeedback(""); }} aria-label={`Ver recomendação de ${i.nome}`}>Ver pendências e detalhes →</button></div>
        </article>)}
      </div>
      {itens.length > POR_PAGINA && <nav className={s.paginacao} aria-label="Paginação das recomendações"><span>Página {paginaAtual} de {totalPaginas} · {numero(itens.length)} escolas</span><div className={s.acoes}><button type="button" className={s.botao} disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button><button type="button" className={s.botao} disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button></div></nav>}
      <p className={s.nota}>As recomendações apoiam a decisão da equipe. Nenhum chamado ou agendamento é criado automaticamente. Ao filtrar os dados, a ordenação é recalculada sem uma nova consulta ao banco.</p>
      {selecionada && <DetalhesEscola key={selecionada.id} item={selecionada} filtros={filtros} feedback={feedback} fechar={() => setEscolaAberta(null)} copiar={() => void copiar([selecionada])}/>}
    </>}
  </main>;
}

function DetalhesEscola({ item: i, filtros, fechar, copiar, feedback }: { item: ItemRecomendacao; filtros: FiltrosRecomendacoes; fechar: () => void; copiar: () => void; feedback: string }) {
  const [paginaDemandas, setPaginaDemandas] = useState(1);
  const totalPaginasDemandas = Math.max(1, Math.ceil(i.demandas.length / 25));
  const atualDemandas = Math.min(paginaDemandas, totalPaginasDemandas);
  const ref = useRef<HTMLDialogElement>(null), fecharRef = useRef(fechar); fecharRef.current = fechar;
  useEffect(() => {
    const d = ref.current, origem = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    d?.showModal(); document.body.style.overflow = "hidden";
    return () => { d?.close(); document.body.style.overflow = overflow; if (origem?.isConnected) origem.focus({ preventScroll: true }); };
  }, []);
  function registrosChamados(lista: ItemRecomendacao["chamados"]) {
    return lista.map(c => <details className={s.registro} key={c.id}><summary><b>{c.numero || `Registro ${c.id}`}</b> · {categoriaPrincipal(c.categoria)} · {c.status || "Pendente"}</summary><p className={s.resumoRegistro}>{c.tecnico || "Técnico não informado"} · Abertura: {dataBR(c.dataAbertura)} · Previsão: {dataBR(c.dataPrevista)}</p><div className={s.textoRegistro}>{c.descricao || "Descrição não informada."}</div></details>);
  }
  return createPortal(<dialog ref={ref} className={s.dialogo} aria-labelledby="assistente-detalhe-titulo" onCancel={e => { e.preventDefault(); fecharRef.current(); }} onClick={e => { if (e.currentTarget === e.target) fecharRef.current(); }}>
    <header className={s.topoDialogo}><div className={s.linha}><div style={{ minWidth: 0, flex: 1 }}><p className={s.kicker}>Recomendação para a escola</p><h2 id="assistente-detalhe-titulo" className={s.nome} style={{ marginTop: 8 }}>{i.nome}</h2><p className={s.subtitulo}>CIE {i.cie || "não informado"} · {i.tecnicoNome || "Sem técnico ativo"}</p></div><button autoFocus type="button" className={`${s.botao} ${s.fechar}`} onClick={fechar} aria-label="Fechar detalhes da recomendação">×</button></div></header>
    <div className={s.conteudoDialogo} data-assistente-scroll tabIndex={0} role="region" aria-label="Detalhes da recomendação">
      <p className={s.motivo}>{i.acao}</p><div className={s.metricas}><Metrica label="Pendências no recorte" valor={i.demandas.length}/><Metrica label="Última visita geral" valor={i.diasSemVisita === null ? "Sem registro" : `${i.diasSemVisita} dias`}/><Metrica label="Chamados ativos no recorte" valor={i.chamados.length}/></div>
      <p className={s.nota}>Última visita geral: {dataBR(i.ultimaVisita)}{i.ultimoChamado ? ` · ${i.ultimoChamado}` : ""}{i.categoriaUltimaVisita ? ` · ${i.categoriaUltimaVisita}` : ""}.{i.origemUltimaVisita === "data_finalizacao" ? " A data de conclusão foi usada como referência porque a visita não estava datada." : ""}</p>
      {i.vinculoTecnico === "nome" && <p className={s.nota}>A atribuição atual foi reconhecida pelo nome único do técnico. A gestão pode conferir o vínculo por ID na setorização.</p>}
      {filtros.foco === "equilibrado" && <p className={s.nota}>Composição dos {i.pontos.total.toLocaleString("pt-BR")} pontos: pendências {i.pontos.pendencias.toLocaleString("pt-BR")}/40 · cobertura {i.pontos.cobertura.toLocaleString("pt-BR")}/35 · antiguidade {i.pontos.antiguidade.toLocaleString("pt-BR")}/15 · urgência {i.pontos.urgencia.toLocaleString("pt-BR")}/10.{i.criticas > 0 ? " A urgência crítica cadastrada também dá precedência à escola no foco equilibrado." : ""}</p>}
      {i.demandasSemData > 0 && <p className={s.nota}>{i.demandasSemData} pendência(s) sem data de criação válida para calcular a antiguidade.</p>}
      <section className={s.secaoDetalhes}><h3>Demandas pendentes · {i.demandas.length}</h3><p className={s.nota}>Categoria principal: {filtros.categoria || "Todas"}. As descrições completas estão disponíveis em cada registro.</p>{i.demandas.length ? i.demandas.slice((atualDemandas - 1) * 25, atualDemandas * 25).map(d => <details className={s.registro} key={d.id}><summary><Tag tom={pesoUrgencia(d.urgencia) === 4 ? "critica" : pesoUrgencia(d.urgencia) === 3 ? "ambar" : ""}>{d.urgencia || "Urgência não informada"}</Tag> <b>{categoriaPrincipal(d.categoria)}</b> · previsão {dataBR(d.dataPrevista)}</summary><p className={s.resumoRegistro}>Criada em {d.criadoEm ? new Date(d.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "data não informada"} · ID {d.id}</p><div className={s.textoRegistro}>{d.descricao || "Descrição não informada."}</div></details>) : <p className={s.nota}>Nenhuma demanda pendente nesta categoria para a escola.</p>}{totalPaginasDemandas > 1 && <nav className={s.paginacao} aria-label="Paginação das demandas da escola"><span>Demandas: página {atualDemandas} de {totalPaginasDemandas} · {i.demandas.length} registros completos</span><div className={s.acoes}><button type="button" className={s.botao} disabled={atualDemandas === 1} onClick={() => setPaginaDemandas(atualDemandas - 1)}>Demandas anteriores</button><button type="button" className={s.botao} disabled={atualDemandas === totalPaginasDemandas} onClick={() => setPaginaDemandas(atualDemandas + 1)}>Próximas demandas</button></div></nav>}</section>
      <section className={s.secaoDetalhes}><h3>Chamados ativos no recorte · {i.chamados.length}</h3>{i.chamados.length ? <><p className={s.nota}>Uma categoria igual não comprova que os pedidos sejam iguais. Confira os textos e as previsões antes de abrir um novo chamado.</p>{registrosChamados(i.chamados)}</> : <p className={s.nota}>Não foi encontrado chamado ativo na categoria selecionada.</p>}</section>
      {i.outrosChamados.length > 0 && <section className={s.secaoDetalhes}><h3>Chamados ativos em outras categorias · {i.outrosChamados.length}</h3>{registrosChamados(i.outrosChamados)}</section>}
    </div>
    <footer className={s.acoesDialogo}><div className={s.acoes}><button type="button" className={`${s.botao} ${s.primario}`} onClick={copiar}>Copiar recomendação</button><Link className={s.botao} href="/fields/demandas">Gerenciar demandas ↗</Link></div>{feedback ? <p className={s.feedback} role="status">{feedback}</p> : <button type="button" className={s.botao} onClick={fechar}>Fechar</button>}</footer>
  </dialog>, document.body);
}
