import { NextRequest, NextResponse } from "next/server";
import { clienteRelatoriosServidor, ErroApiRelatorios, nomeSeguro } from "@/lib/relatorios/server";
import { abrirRenderizador, htmlDocumento, renderizarPDF } from "@/lib/relatorios/pdfServidor";
import type { DetalheRelatorio } from "@/lib/relatorios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof abrirRenderizador>> | null = null;
  try {
    const tipo = req.nextUrl.searchParams.get("tipo"), id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[A-Za-z0-9_-]{1,120}$/.test(id) || !["equipamentos", "redes"].includes(tipo || "")) throw new ErroApiRelatorios("Relatório inválido.");
    const supabase = await clienteRelatoriosServidor();
    const { data, error } = await supabase.rpc("hub_relatorios_documento", { p_tipo: tipo, p_id: id });
    if (error) throw new ErroApiRelatorios(error.message, error.code === "42501" ? 403 : 400);
    const detalhe = data as DetalheRelatorio;
    if (detalhe.relatorio.status !== "finalizado") throw new ErroApiRelatorios("Finalize o relatório antes de baixar o PDF.");
    browser = await abrirRenderizador();
    const pdf = await renderizarPDF(browser, await htmlDocumento(detalhe), req.signal);
    const nome = `Relatorio_${tipo}_${nomeSeguro(detalhe.relatorio.chamado_referencia)}_${id}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[Relatórios/PDF]", error instanceof Error ? error.message : "Falha de exportação");
    return NextResponse.json({ erro: error instanceof ErroApiRelatorios ? error.message : "Não foi possível preparar o PDF. Tente novamente." }, { status: error instanceof ErroApiRelatorios ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  } finally { await browser?.close().catch(() => undefined); }
}
