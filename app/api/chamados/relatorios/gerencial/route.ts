import { NextRequest, NextResponse } from "next/server";
import { acessoServidorHub, consultarBaseHub, ErroRelatorioHub } from "@/lib/chamados-relatorios/server";
import { validarFiltros } from "@/lib/chamados-relatorios/periodos";
import { analisarHub } from "@/lib/chamados-relatorios/analise";
import type { PreviaHub } from "@/lib/chamados-relatorios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const DETALHES_POR_PARTE = 150;
const headersPrivados = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof import("@/lib/relatorios/pdfServidor").abrirRenderizador>> | null = null;
  const controller = new AbortController(), cancelar = () => controller.abort();
  req.signal.addEventListener("abort", cancelar, { once: true });
  if (req.signal.aborted) controller.abort();
  // Prazo da leitura; o PDF tem seus próprios limites no renderizador.
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(cancelar, 22000);
  try {
    const acesso = await acessoServidorHub();
    if (Number(req.headers.get("content-length") || 0) > 12000) throw new ErroRelatorioHub("Pedido inválido.", 413);
    const texto = await req.text();
    if (texto.length > 12000) throw new ErroRelatorioHub("Pedido inválido.", 413);
    let pedido; try { pedido = JSON.parse(texto); } catch { throw new ErroRelatorioHub("Pedido inválido."); }
    if (!pedido || !["previa", "pdf"].includes(pedido.acao)) throw new ErroRelatorioHub("Ação inválida.");
    let filtros; try { filtros = validarFiltros(pedido.filtros); } catch (e) { throw new ErroRelatorioHub(e instanceof Error ? e.message : "Filtros inválidos."); }
    const base = await consultarBaseHub(acesso.supabase, filtros, controller.signal);
    clearTimeout(timer); timer = undefined;
    const agora = new Date(), analise = analisarHub(base.registros, filtros, agora);
    const previa: PreviaHub = { filtros, analise, assinatura: base.assinatura, geradoEm: agora.toISOString(), nomeResponsavel: acesso.nome,
      responsavelFiltro: base.responsavelFiltro, detalhesPorParte: DETALHES_POR_PARTE,
      partes: filtros.detalhar ? Math.max(1, Math.ceil(base.registros.length / DETALHES_POR_PARTE)) : 1 };
    if (pedido.acao === "previa") return NextResponse.json(previa, { headers: headersPrivados });
    if (pedido.assinatura !== base.assinatura) throw new ErroRelatorioHub("Os dados mudaram desde a prévia. Atualize a prévia antes de baixar o PDF.", 409);
    const parte = pedido.parte ?? 1;
    if (!Number.isInteger(parte) || parte < 1 || parte > previa.partes) throw new ErroRelatorioHub("Parte do anexo inválida.");
    const [{ abrirRenderizador }, { pdfHub }, { htmlRelatorioHub }] = await Promise.all([
      import("@/lib/relatorios/pdfServidor"), import("@/lib/chamados-relatorios/pdf"), import("@/lib/chamados-relatorios/html"),
    ]);
    const detalhes = filtros.detalhar ? base.registros.slice((parte - 1) * DETALHES_POR_PARTE, parte * DETALHES_POR_PARTE) : [];
    browser = await abrirRenderizador();
    const bytes = await pdfHub(browser, htmlRelatorioHub(previa, detalhes, parte), base.assinatura.slice(0, 12), controller.signal);
    const nome = `Hub_Chamados_${filtros.modalidade}_${filtros.inicio}_${filtros.fim}${previa.partes > 1 ? `_parte-${parte}-de-${previa.partes}` : ""}.pdf`;
    return new NextResponse(new Uint8Array(bytes), { headers: { ...headersPrivados, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"` } });
  } catch (e) {
    const status = e instanceof ErroRelatorioHub ? e.status : controller.signal.aborted ? 503 : 500;
    if (status >= 500) console.error("[Chamados/gerencial]", e instanceof Error ? e.message : "Falha de geração");
    const erro = e instanceof ErroRelatorioHub ? e.message : controller.signal.aborted ? "A consulta foi interrompida. Seus filtros foram mantidos; tente novamente com um período menor." : "Não foi possível gerar o relatório. Tente novamente ou reduza o período.";
    return NextResponse.json({ erro }, { status, headers: headersPrivados });
  } finally {
    if (timer) clearTimeout(timer);
    req.signal.removeEventListener("abort", cancelar); controller.abort();
    await browser?.close().catch(() => undefined);
  }
}
