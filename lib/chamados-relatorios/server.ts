import "server-only";
import { createHash } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase-server";
import { podeGerarRelatoriosHub } from "./perfis";
import { limitesPeriodo } from "./periodos";
import { prepararRegistros } from "./analise";
import type { ChamadoHub, FiltrosHub } from "./types";

export class ErroRelatorioHub extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function acessoServidorHub() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new ErroRelatorioHub(error.status === 401 || error.status === 403 ? "Sua sessão expirou. Entre novamente." : "Não foi possível validar a sessão. Tente novamente.", error.status === 401 || error.status === 403 ? 401 : 503);
  if (!user) throw new ErroRelatorioHub("Entre no sistema para gerar o relatório.", 401);
  const { data: perfil, error: erroPerfil } = await supabase.from("usuarios").select("id,nome,role").eq("id", user.id).maybeSingle();
  if (erroPerfil) throw new ErroRelatorioHub("Não foi possível conferir seu perfil. Tente novamente.", 503);
  if (!perfil || !podeGerarRelatoriosHub(perfil.role)) throw new ErroRelatorioHub("Somente admin e SEINTEC podem gerar os relatórios de chamados do Hub.", 403);
  return { supabase, usuarioId: user.id, nome: String(perfil.nome || "Usuário autenticado") };
}
export async function consultarBaseHub(supabase: Awaited<ReturnType<typeof createServerSupabase>>, f: FiltrosHub, signal: AbortSignal) {
  const limite = limitesPeriodo(f), rows: ChamadoHub[] = [], ids = new Set<string>();
  let ultimoId = "", total = -1;
  const criarConsulta = (contar: boolean) => supabase.from("chamados").select("id,codigo,titulo,descricao,categoria,subcategoria,servico_id,origem,prioridade,status,setor,escola,solicitante_nome,analista_responsavel,created_at,updated_at,started_at,resolved_at,closed_at,retorno_devolutivo", { count: contar ? "exact" : undefined });
  // Cursor estável por ID e avanço pelo tamanho real recebido: funciona mesmo
  // quando o limite REST do projeto é inferior a 500. Não usa service_role.
  while (true) {
    if (signal.aborted) throw new ErroRelatorioHub("Consulta interrompida. Reduza o período ou tente novamente.", 503);
    let q: ReturnType<typeof criarConsulta> = criarConsulta(total < 0);
    if (f.referencia === "abertura") q = q.gte("created_at", limite.inicio).lt("created_at", limite.fimExclusivo);
    else q = q.or(`and(resolved_at.gte.${limite.inicio},resolved_at.lt.${limite.fimExclusivo}),and(resolved_at.is.null,closed_at.gte.${limite.inicio},closed_at.lt.${limite.fimExclusivo})`);
    if (f.responsavel && f.responsavel !== "__sem_responsavel__") q = q.eq("analista_responsavel", f.responsavel);
    if (ultimoId) q = q.gt("id", ultimoId);
    const { data, error, count } = await q.order("id", { ascending: true }).limit(500).abortSignal(signal);
    if (error) throw new ErroRelatorioHub(error.code === "42501" ? "Seu perfil não tem acesso à base de chamados." : "Não foi possível ler todos os chamados. Tente novamente; nenhum relatório parcial foi emitido.", error.code === "42501" ? 403 : 503);
    if (total < 0) {
      if (!Number.isSafeInteger(count) || count === null || count < 0) throw new ErroRelatorioHub("A consulta não confirmou o total de chamados. Tente novamente.", 503);
      total = count;
      if (total > 20000) throw new ErroRelatorioHub("Este período contém mais de 20 mil registros. Selecione um período menor ou um responsável para emitir o relatório completo.", 422);
    }
    const pagina = (data || []) as ChamadoHub[];
    for (const r of pagina) {
      if (!r.id || ids.has(r.id)) throw new ErroRelatorioHub("A base mudou durante a consulta. Atualize a prévia.", 409);
      ids.add(r.id); rows.push(r);
    }
    if (rows.length > total) throw new ErroRelatorioHub("A base mudou durante a consulta. Atualize a prévia.", 409);
    if (rows.length === total) break;
    if (!pagina.length) throw new ErroRelatorioHub("A consulta ficou incompleta. Atualize a prévia para conferir todos os registros.", 503);
    ultimoId = pagina[pagina.length - 1].id;
  }
  if (Buffer.byteLength(JSON.stringify(rows), "utf8") > 24 * 1024 * 1024) throw new ErroRelatorioHub("O recorte contém textos muito extensos. Reduza o período ou filtre um responsável.", 422);
  const responsaveis = [...new Set(rows.map(r => r.analista_responsavel).filter((v): v is string => Boolean(v)))], nomes = new Map<string, string>();
  for (let i = 0; i < responsaveis.length; i += 100) {
    const { data, error } = await supabase.from("usuarios").select("id,nome").in("id", responsaveis.slice(i, i + 100)).order("id").limit(100).abortSignal(signal);
    if (error) throw new ErroRelatorioHub("Não foi possível conferir os responsáveis. Tente novamente.", 503);
    for (const u of data || []) if (u.nome) nomes.set(String(u.id), String(u.nome));
  }
  const registros = prepararRegistros(rows, nomes, f);
  const assinatura = createHash("sha256").update(JSON.stringify({ versao: 1, filtros: f, registros })).digest("hex");
  const responsavelFiltro = !f.responsavel ? "Todos os responsáveis" : f.responsavel === "__sem_responsavel__" ? "Sem responsável" : nomes.get(f.responsavel) || `Responsável ${f.responsavel.slice(0, 8)}`;
  return { registros, assinatura, responsavelFiltro };
}
