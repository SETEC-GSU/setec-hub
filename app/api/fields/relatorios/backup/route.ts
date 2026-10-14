import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { clienteRelatoriosServidor, ErroApiRelatorios, celulaCSV, nomeSeguro } from "@/lib/relatorios/server";
import { abrirRenderizador, htmlDocumento, renderizarPDF } from "@/lib/relatorios/pdfServidor";
import type { DetalheRelatorio, ReferenciaExportacao } from "@/lib/relatorios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof abrirRenderizador>> | null = null;
  try {
    if (req.headers.get("origin") && req.headers.get("origin") !== req.nextUrl.origin) throw new ErroApiRelatorios("Origem da solicitação inválida.", 403);
    if (Number(req.headers.get("content-length") || 0) > 128000) throw new ErroApiRelatorios("Lote maior que o permitido.", 413);
    const body = await req.json() as { mes: string; tecnico: string; tipo: string; corte: string;
      referencias: ReferenciaExportacao[]; parte: number; partes: number };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.mes || "") || !["todos","equipamentos","redes"].includes(body.tipo)) throw new ErroApiRelatorios("Filtros de exportação inválidos.");
    if (!Array.isArray(body.referencias) || !body.referencias.length || body.referencias.length > 25) throw new ErroApiRelatorios("Selecione entre 1 e 25 relatórios por parte.");
    if (!Number.isInteger(body.parte) || !Number.isInteger(body.partes) || body.parte < 1 || body.parte > body.partes || body.partes > 10000) throw new ErroApiRelatorios("Sequência do lote inválida.");
    if (typeof body.tecnico !== "string" || body.tecnico.length > 300 || !Number.isFinite(new Date(body.corte).getTime())) throw new ErroApiRelatorios("Dados da exportação inválidos.");
    const supabase = await clienteRelatoriosServidor();
    const zip = new JSZip(); const salvos: DetalheRelatorio[] = [];
    const falhas: Array<{ tipo: string; id: string; motivo: string }> = [];
    const indice: string[][] = [["tipo","id_relatorio","chamado","escola","tecnico","data_atendimento","arquivo_pdf","resultado","local_atendimento"]];
    const repetidos = new Set<string>();
    browser = await abrirRenderizador();
    for (const ref of body.referencias) {
      if (req.signal.aborted) throw new ErroApiRelatorios("Exportação interrompida.", 499);
      if (!ref || !["equipamentos","redes"].includes(ref.tipo) || typeof ref.id !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(ref.id)) throw new ErroApiRelatorios("Referência de relatório inválida.");
      const chave = ref.tipo + ":" + ref.id;
      if (repetidos.has(chave)) throw new ErroApiRelatorios("O lote contém uma referência repetida.");
      repetidos.add(chave);
      try {
        const { data, error } = await supabase.rpc("hub_relatorios_documento", { p_tipo: ref.tipo, p_id: ref.id });
        if (error) throw new Error(error.message);
        const detalhe = data as DetalheRelatorio; const r = detalhe.relatorio;
        if (r.status !== "finalizado") throw new Error("O relatório deixou de estar finalizado.");
        if (String(r.data_atendimento).slice(0,7) !== body.mes) throw new Error("A data do relatório mudou; ele não pertence ao mês selecionado.");
        if (body.tipo !== "todos" && detalhe.tipo !== body.tipo) throw new Error("Tipo fora dos filtros.");
        if (body.tecnico && nomeSeguro(r.tecnico_nome).toLowerCase() !== nomeSeguro(body.tecnico).toLowerCase()) throw new Error("O técnico do relatório mudou; confira a seleção.");
        if (detalhe.versao !== ref.versao) throw new Error("O relatório foi alterado após a seleção. Atualize a central e exporte este registro novamente.");
        if (new Date(String(r.created_at)).getTime() > new Date(body.corte).getTime()) throw new Error("Relatório posterior ao início da seleção.");
        salvos.push(detalhe);
        const pasta = `${ref.tipo}/${nomeSeguro(r.tecnico_nome)}`;
        const base = `${String(r.data_atendimento).slice(0,10)}_${nomeSeguro(r.chamado_referencia || (r.local_atendimento === "ure" ? "URE_Interno" : ""))}_${ref.id}`;
        const html = await htmlDocumento(detalhe);
        zip.file(`${pasta}/${base}.html`, html);
        const pdf = await renderizarPDF(browser, html, req.signal);
        zip.file(`${pasta}/${base}.pdf`, pdf);
        indice.push([ref.tipo,ref.id,String(r.chamado_referencia || ""),String(r.escola_nome || ""),String(r.tecnico_nome || ""),String(r.data_atendimento),`${pasta}/${base}.pdf`,"PDF preparado",r.local_atendimento === "ure" ? "URE" : "Escola"]);
      } catch (error) {
        const motivo = error instanceof Error ? error.message : "Falha ao preparar o documento.";
        falhas.push({tipo:ref.tipo,id:ref.id,motivo});
        indice.push([ref.tipo,ref.id,ref.chamado,ref.escola,ref.tecnico,ref.data_atendimento,"",motivo,ref.local_atendimento === "ure" ? "URE" : "Escola"]);
      }
    }
    if (req.signal.aborted) throw new ErroApiRelatorios("Exportação interrompida.",499);
    zip.file("indice_relatorios.csv", "\uFEFF" + indice.map(linha => linha.map(celulaCSV).join(";")).join("\r\n"));
    zip.file("dados_relatorios.json", JSON.stringify(salvos,null,2));
    zip.file("manifesto.json", JSON.stringify({ mes:body.mes,tecnico:body.tecnico||"Todos",tipo:body.tipo,
      inicio_selecao:body.corte,gerado_em:new Date().toISOString(),parte:body.parte,partes:body.partes,
      selecionados:body.referencias.length,pdfs:body.referencias.length-falhas.length,
      falhas:falhas.length,referencias_selecionadas:body.referencias },null,2));
    if (falhas.length) zip.file("falhas.csv", "\uFEFF" + [["tipo","id","motivo"],...falhas.map(f=>[f.tipo,f.id,f.motivo])].map(l=>l.map(celulaCSV).join(";")).join("\r\n"));
    zip.file("LEIA-ME.txt", "Backup de relatórios finalizados do SETEC Hub.\nPDFs e HTMLs usam os mesmos modelos institucionais das páginas de equipamentos e redes.\nJSON contém o conteúdo completo consultado no banco. CSV relaciona os arquivos aos IDs.\nBaixe todas as partes do lote. Se houver falhas.csv, o lote é PARCIAL: refaça os registros indicados.\nOs arquivos já existentes no Hub não foram alterados pela exportação.\n");
    const arquivo = `SETEC_Relatorios_${body.mes}_${nomeSeguro(body.tecnico || "TODOS")}${body.partes>1 ? `_parte_${String(body.parte).padStart(3,"0")}_de_${body.partes}` : ""}${falhas.length ? "_PARCIAL" : ""}.zip`;
    const buffer = await zip.generateAsync({ type:"uint8array",compression:"DEFLATE",compressionOptions:{level:3} });
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type":"application/zip",
      "Content-Disposition":`attachment; filename="${arquivo}"`,"Cache-Control":"private, no-store",
      "X-Relatorios-Arquivo":arquivo,"X-Relatorios-Falhas":String(falhas.length),
      "X-Relatorios-PDFs":String(body.referencias.length-falhas.length),"X-Content-Type-Options":"nosniff" } });
  } catch (error) {
    console.error("[Relatórios/Backup]",error instanceof Error ? error.message : "Falha de exportação");
    return NextResponse.json({ erro:error instanceof ErroApiRelatorios ? error.message : "Não foi possível preparar o lote. As partes já concluídas continuam disponíveis." }, { status:error instanceof ErroApiRelatorios ? error.status : 500,headers:{"Cache-Control":"no-store"} });
  } finally { await browser?.close().catch(() => undefined); }
}
