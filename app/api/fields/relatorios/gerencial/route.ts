import { NextRequest, NextResponse } from "next/server";
import { acessoRelatoriosServidor, ErroApiRelatorios } from "@/lib/relatorios/server";
import { leituraComPrazo } from "@/lib/relatorios/consulta";
import { podeGerirRelatoriosFields } from "@/lib/fields-relatorios/perfis";
import { validarFiltros } from "@/lib/fields-relatorios/periodos";
import { analisarFields } from "@/lib/fields-relatorios/analise";
import type { BaseFields, PreviaFields } from "@/lib/fields-relatorios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const DETALHES_POR_PARTE = 150;

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof import("@/lib/relatorios/pdfServidor").abrirRenderizador>> | null = null;
  const controller = new AbortController();
  const cancelar = () => controller.abort();
  req.signal.addEventListener("abort", cancelar, { once: true });
  try {
    const { supabase, contexto } = await acessoRelatoriosServidor();
    if (!podeGerirRelatoriosFields(contexto.role)) throw new ErroApiRelatorios("Somente admin e SEINTEC podem gerar relatórios gerenciais dos Fields.", 403);
    if (Number(req.headers.get("content-length") || 0) > 12000) throw new ErroApiRelatorios("Pedido inválido.", 413);
    const raw = await req.text();
    if (raw.length > 12000) throw new ErroApiRelatorios("Pedido inválido.", 413);
    let pedido; try { pedido = JSON.parse(raw); } catch { throw new ErroApiRelatorios("Pedido inválido."); }
    if (!["previa", "pdf"].includes(pedido?.acao)) throw new ErroApiRelatorios("Ação inválida.");
    let filtros; try { filtros = validarFiltros(pedido.filtros); } catch (e) { throw new ErroApiRelatorios(e instanceof Error ? e.message : "Filtros inválidos."); }
    const { data, error } = await leituraComPrazo(supabase.rpc("hub_fields_relatorio_base", {
      p_inicio: filtros.inicio, p_fim: filtros.fim, p_tecnico: filtros.tecnico, p_escola: filtros.escola,
      p_categoria: filtros.categoria, p_status: filtros.status, p_cruzar: filtros.cruzarCentral,
    }).abortSignal(controller.signal), "A consulta demorou. Tente um período menor.", 20000);
    if (error) {
      if (error.code === "57014") throw new ErroApiRelatorios("O banco interrompeu a consulta por tempo limite. Aplique o SQL 007 de otimização do cruzamento e tente novamente. Seus filtros foram mantidos.", 503);
      throw new ErroApiRelatorios(error.code === "42501" ? "Seu perfil não pode gerar este relatório." : error.message, error.code === "42501" ? 403 : 400);
    }
    const base = data as BaseFields;
    if (!base || !Array.isArray(base.registros) || !/^[a-f0-9]{32}$/.test(base.assinatura)) throw new ErroApiRelatorios("A consulta não retornou uma base válida.", 503);
    const analise = analisarFields(base, filtros, new Date(base.gerado_em));
    const previa: PreviaFields = { filtros, analise, assinatura: base.assinatura, geradoEm: base.gerado_em,
      nomeResponsavel: contexto.nome || "Usuário autenticado", detalhesPorParte: DETALHES_POR_PARTE,
      partes: filtros.detalhar ? Math.max(1, Math.ceil(base.registros.length / DETALHES_POR_PARTE)) : 1 };
    if (pedido.acao === "previa") return NextResponse.json(previa, { headers: { "Cache-Control": "private, no-store" } });
    if (pedido.assinatura !== base.assinatura) throw new ErroApiRelatorios("Os dados mudaram desde a prévia. Atualize a prévia e confira os números antes de baixar.", 409);
    const parte = pedido.parte ?? 1;
    if (!Number.isInteger(parte) || parte < 1 || parte > previa.partes) throw new ErroApiRelatorios("Parte do anexo inválida.");
    const [{ abrirRenderizador }, { pdfFields }, { htmlRelatorioFields }] = await Promise.all([
      import("@/lib/relatorios/pdfServidor"), import("@/lib/fields-relatorios/pdf"), import("@/lib/fields-relatorios/html"),
    ]);
    const detalhes = filtros.detalhar ? base.registros.slice((parte - 1) * DETALHES_POR_PARTE, parte * DETALHES_POR_PARTE) : [];
    browser = await abrirRenderizador();
    const pdf = await pdfFields(browser, htmlRelatorioFields(previa, detalhes, parte), base.assinatura.slice(0, 12), controller.signal);
    const nome = `Fields_${filtros.modalidade}_${filtros.inicio}_${filtros.fim}${previa.partes > 1 ? `_parte-${parte}-de-${previa.partes}` : ""}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    const status = e instanceof ErroApiRelatorios ? e.status : controller.signal.aborted ? 499 : 500;
    if (status >= 500) console.error("[Fields/gerencial]", e instanceof Error ? e.message : "Falha de exportação");
    return NextResponse.json({ erro: e instanceof ErroApiRelatorios ? e.message : "Não foi possível gerar o relatório. Tente novamente ou reduza o período." },
      { status, headers: { "Cache-Control": "private, no-store" } });
  } finally {
    req.signal.removeEventListener("abort", cancelar); controller.abort();
    await browser?.close().catch(() => undefined);
  }
}
