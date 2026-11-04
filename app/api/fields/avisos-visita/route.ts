import { NextRequest,NextResponse } from 'next/server'
import { acessoAvisos,ErroAvisos,falhaBanco } from '@/lib/fields-avisos/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=30
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}
const dia=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v
async function executar(req:NextRequest,post:boolean){
 const ctrl=new AbortController(),cancelar=()=>ctrl.abort();if(req.signal.aborted)cancelar();req.signal.addEventListener('abort',cancelar,{once:true});const timer=setTimeout(cancelar,24000)
 try{
  const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)throw new ErroAvisos('Origem não permitida.',403)
  const {supabase,uid}=await acessoAvisos()
  if(!post){
   const p=req.nextUrl.searchParams,i=p.get('inicio')||'',f=p.get('fim')||'',situacao=p.get('situacao')||'pendentes',busca=p.get('busca')||'',pagina=Number(p.get('pagina')||1)
   if((i&&!dia(i))||(f&&!dia(f))||Boolean(i)!==Boolean(f)||!['pendentes','resolvidos','todos'].includes(situacao)||busca.length>160||!Number.isInteger(pagina)||pagina<1||pagina>10000)throw new ErroAvisos('Confira os filtros dos avisos.')
   const {data,error}=await supabase.rpc('hub_fields_avisos_listar',{p_inicio:i||null,p_fim:f||null,p_situacao:situacao,p_busca:busca,p_pagina:pagina}).abortSignal(ctrl.signal)
   if(error)throw falhaBanco(error)
   if(!data||data.versao!==1||data.usuarioId!==uid||!Array.isArray(data.grupos))throw new ErroAvisos('A base dos avisos está incompatível. Atualize a página.',503)
   return NextResponse.json(data,{headers})
  }
  if(!req.headers.get('content-type')?.includes('application/json'))throw new ErroAvisos('Formato inválido.',415)
  const reader=req.body?.getReader();if(!reader)throw new ErroAvisos('Seleção vazia.')
  const cancelarCorpo=()=>{void reader.cancel().catch(()=>{})};ctrl.signal.addEventListener('abort',cancelarCorpo,{once:true})
  const chunks:Uint8Array[]=[];let bytes=0
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>262144){await reader.cancel();throw new ErroAvisos('Seleção muito extensa.',413)}chunks.push(value)}
  ctrl.signal.removeEventListener('abort',cancelarCorpo);if(ctrl.signal.aborted)throw new ErroAvisos('A solicitação demorou. Atualize os avisos para conferir o resultado.',503)
  const all=new Uint8Array(bytes);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length}
  let body;try{body=JSON.parse(new TextDecoder().decode(all))}catch{throw new ErroAvisos('Formato inválido.')}
  if(!body||typeof body!=='object'||Array.isArray(body)||!Array.isArray(body.itens)||body.itens.length<1||body.itens.length>2000||!['enviado','ignorado','concluido','pendente'].includes(body.situacao)||typeof body.motivo!=='string'||body.motivo.length>400||body.itens.some((x:unknown)=>!x||typeof x!=='object'||Array.isArray(x)||typeof (x as {id?:unknown}).id!=='string'||!/^[1-9]\d{0,18}$/.test((x as {id:string}).id)||typeof(x as {revisao?:unknown}).revisao!=='string'||!/^[a-f0-9]{32}$/.test((x as {revisao:string}).revisao)))throw new ErroAvisos('Confira a seleção e a ação do aviso.')
  const {data,error}=await supabase.rpc('hub_fields_avisos_marcar',{p_itens:body.itens,p_situacao:body.situacao,p_motivo:body.motivo}).abortSignal(ctrl.signal)
  if(error)throw falhaBanco(error)
  if(data?.ok!==true)throw new ErroAvisos('Não foi possível confirmar a marcação. Atualize para conferir.',503)
  return NextResponse.json(data,{headers})
 }catch(e){return NextResponse.json({erro:e instanceof ErroAvisos?e.message:'A solicitação foi interrompida. Atualize os avisos para conferir o resultado.'},{status:e instanceof ErroAvisos?e.status:503,headers})}
 finally{clearTimeout(timer);req.signal.removeEventListener('abort',cancelar);ctrl.abort()}
}
export const GET=(req:NextRequest)=>executar(req,false)
export const POST=(req:NextRequest)=>executar(req,true)
