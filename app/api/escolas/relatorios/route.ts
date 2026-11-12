import { NextRequest,NextResponse } from "next/server"
import { acessoEscolas,consultarRelatorioEscolar,ErroEscolas } from "@/lib/escolas/servidor"
import { validarPedidoRelatorio,type PreviaRelatorioEscolar } from "@/lib/escolas/relatorios"
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60
const privado={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}
export async function POST(req:NextRequest){
  const c=new AbortController(),cancelar=()=>c.abort();req.signal.addEventListener("abort",cancelar,{once:true});if(req.signal.aborted)c.abort()
  let timer:ReturnType<typeof setTimeout>|undefined=setTimeout(cancelar,22000),browser:Awaited<ReturnType<typeof import("@/lib/relatorios/pdfServidor").abrirRenderizador>>|undefined
  try{
    const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)throw new ErroEscolas("Origem do pedido inválida.",403)
    const acesso=await acessoEscolas(c.signal),raw=await req.text();if(raw.length>12000)throw new ErroEscolas("Pedido extenso demais.",413)
    let p;try{p=JSON.parse(raw)}catch{throw new ErroEscolas("Pedido inválido.")}
    if(!p||!["previa","pdf"].includes(p.acao))throw new ErroEscolas("Ação inválida.")
    let pedido;try{pedido=validarPedidoRelatorio(p.pedido)}catch(e){throw new ErroEscolas(e instanceof Error?e.message:"Confira as opções.")}
    const base=await consultarRelatorioEscolar(acesso,pedido,c.signal);clearTimeout(timer);timer=undefined
    const previa:PreviaRelatorioEscolar={assinatura:base.assinatura,geradoEm:base.geradoEm,escolas:base.fichas.length,modelos:base.porModelo.length,totais:base.totais,semEnvio:base.semEnvio,alertas:base.fichas.reduce((n,f)=>n+f.alertas.length,0),individual:pedido.escopo==="individual",nome:pedido.escopo==="individual"?base.fichas[0].escola.nome_escola||undefined:undefined}
    if(p.acao==="previa")return NextResponse.json(previa,{headers:privado})
    if(p.assinatura!==base.assinatura)throw new ErroEscolas("O cadastro ou o inventário mudou. Atualize a prévia antes de baixar o PDF.",409)
    timer=setTimeout(cancelar,35000)
    const [{abrirRenderizador},{pdfRelatorioEscolar},{htmlRelatorioEscolar}]=await Promise.all([import("@/lib/relatorios/pdfServidor"),import("@/lib/escolas/relatorio-pdf"),import("@/lib/escolas/relatorio-html")])
    browser=await abrirRenderizador();const bytes=await pdfRelatorioEscolar(browser,htmlRelatorioEscolar(base),base.assinatura.slice(0,12),c.signal)
    if(bytes.length>4*1024*1024)throw new ErroEscolas("O PDF ficou muito extenso. Reduza o recorte ou gere o consolidado sem fichas.",422)
    const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(base.geradoEm)),parte=(tipo:string)=>partes.find(p=>p.type===tipo)?.value,dia=`${parte("year")}-${parte("month")}-${parte("day")}`
    const cie=String(base.fichas[0]?.escola.cie||"escola").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,30),nome=`SETEC_Escolas_${pedido.escopo==="individual"?`CIE_${cie}`:"Consolidado"}_${dia}.pdf`
    return new NextResponse(new Uint8Array(bytes),{headers:{...privado,"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${nome}"`}})
  }catch(e){const status=e instanceof ErroEscolas?e.status:c.signal.aborted?503:500;if(status>=500)console.error("[Escolas/PDF]",e);return NextResponse.json({erro:e instanceof ErroEscolas?e.message:c.signal.aborted?"A consulta foi interrompida. Tente novamente; suas opções foram mantidas.":"Não foi possível gerar o relatório escolar. Tente novamente."},{status,headers:privado})}
  finally{if(timer)clearTimeout(timer);req.signal.removeEventListener("abort",cancelar);c.abort();await browser?.close().catch(()=>undefined)}
}
