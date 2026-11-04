import { NextRequest, NextResponse } from 'next/server'
import { acessoAssistente, consultarAssistente, ErroAssistenteHub, opcoesAssistente } from '@/lib/assistente/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=30
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Cookie'}
async function executar(req:NextRequest,post:boolean){
 const controller=new AbortController(),cancelar=()=>controller.abort()
 req.signal.addEventListener('abort',cancelar,{once:true});if(req.signal.aborted)cancelar()
 const timer=setTimeout(cancelar,24000)
 try {
  const origin=req.headers.get('origin')
  if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({erro:'Origem da consulta não permitida.'},{status:403,headers})
  const acesso=await acessoAssistente()
  if(!post)return NextResponse.json(await opcoesAssistente(acesso,controller.signal),{headers})
  if(!req.headers.get('content-type')?.includes('application/json'))return NextResponse.json({erro:'Envie uma consulta válida.'},{status:415,headers})
  // Consome o corpo como stream para aplicar o limite mesmo sem Content-Length.
  const reader=req.body?.getReader();if(!reader)throw new ErroAssistenteHub('A consulta está vazia.')
  const cancelarCorpo=()=>{void reader.cancel().catch(()=>{})};controller.signal.addEventListener('abort',cancelarCorpo,{once:true})
  const chunks:Uint8Array[]=[];let bytes=0
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8192){await reader.cancel();throw new ErroAssistenteHub('A consulta excedeu o tamanho permitido.',413)}chunks.push(value)}
  controller.signal.removeEventListener('abort',cancelarCorpo);if(controller.signal.aborted)throw new ErroAssistenteHub('A consulta demorou mais que o esperado. Tente novamente.',503)
  const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length}
  let body:{consulta?:unknown;pagina?:unknown};try{body=JSON.parse(new TextDecoder().decode(joined))}catch{throw new ErroAssistenteHub('O formato da consulta é inválido.')}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new ErroAssistenteHub('O formato da consulta é inválido.')
  if(body.pagina!==undefined&&typeof body.pagina!=='number')throw new ErroAssistenteHub('Página inválida.')
  return NextResponse.json(await consultarAssistente(acesso,body.consulta,body.pagina===undefined?1:body.pagina as number,controller.signal),{headers})
 }catch(e){const status=e instanceof ErroAssistenteHub?e.status:503;return NextResponse.json({erro:e instanceof ErroAssistenteHub?e.message:'A consulta foi interrompida. Tente novamente; seu preenchimento foi mantido.'},{status,headers})}
 finally{clearTimeout(timer);req.signal.removeEventListener('abort',cancelar);controller.abort()}
}
export const GET=(req:NextRequest)=>executar(req,false)
export const POST=(req:NextRequest)=>executar(req,true)
