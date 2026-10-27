import { NextRequest, NextResponse } from "next/server";
import { carregarBaseServidor, ErroAssistente } from "@/lib/fields-recomendacoes/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(req: NextRequest) {
  const controller = new AbortController(), cancelar = () => controller.abort();
  if (req.signal.aborted) controller.abort();
  req.signal.addEventListener("abort", cancelar, { once: true });
  const timer = setTimeout(cancelar, 19000);
  try { return NextResponse.json(await carregarBaseServidor(controller.signal), { headers }); }
  catch (e) {
    const status = e instanceof ErroAssistente ? e.status : 503;
    return NextResponse.json({ erro: e instanceof ErroAssistente ? e.message : "A consulta foi interrompida. Tente atualizar novamente." }, { status, headers });
  } finally { clearTimeout(timer); req.signal.removeEventListener("abort", cancelar); controller.abort(); }
}
