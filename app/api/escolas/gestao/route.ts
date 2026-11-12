import { NextRequest,NextResponse } from "next/server"
import { acessoEscolas,ErroEscolas } from "@/lib/escolas/servidor"
import { validarAlteracoesEscola } from "@/lib/escolas/edicao"
export const runtime="nodejs",dynamic="force-dynamic",maxDuration=30
const privado={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}
function validarId(id:unknown){if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new ErroEscolas("Escola inválida.");return id}
function erroBanco(error:{code?:string;message?:string}){const code=error.code;throw new ErroEscolas(code==="40001"?"A escola foi atualizada por outra pessoa. Recarregue os dados da edição; seu preenchimento continua no modal.":code==="42501"?"Somente admin e SEINTEC podem acessar esta função.":code==="PGRST202"||code==="42P01"?"A atualização SQL de edição e histórico ainda precisa ser aplicada.":code==="P0002"?"Escola não encontrada.":code==="22023"||code==="22007"?error.message||"Confira os campos informados.":"Não foi possível concluir a operação da escola.",code==="40001"?409:code==="42501"?403:code==="P0002"?404:code==="22023"||code==="22007"?400:503)}
async function executar(req:NextRequest,editar:boolean){
  const c=new AbortController(),cancelar=()=>c.abort(),timer=setTimeout(cancelar,18000);req.signal.addEventListener("abort",cancelar,{once:true})
  try{
    if(req.signal.aborted)c.abort()
    const acesso=await acessoEscolas(c.signal)
    if(!editar&&req.nextUrl.searchParams.get("acao")==="acesso")return NextResponse.json({podeEditar:acesso.podeEditar},{headers:privado})
    if(!acesso.podeEditar)throw new ErroEscolas("Somente admin e SEINTEC podem editar ou consultar o histórico.",403)
    if(editar){
      const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)throw new ErroEscolas("Origem inválida.",403)
      const raw=await req.text();if(raw.length>18000)throw new ErroEscolas("Pedido muito extenso.",413)
      let p;try{p=JSON.parse(raw)}catch{throw new ErroEscolas("Pedido inválido.")}
      const id=validarId(p?.escolaId);if(typeof p.versao!=="string"||!/^[0-9a-f]{32}$/.test(p.versao))throw new ErroEscolas("Reabra a edição para conferir a versão atual.")
      let dados;try{dados=validarAlteracoesEscola(p.dados)}catch(e){throw new ErroEscolas(e instanceof Error?e.message:"Confira os campos.")}
      const {data,error}=await acesso.supabase.rpc("hub_escola_atualizar",{p_escola_id:id,p_versao:p.versao,p_dados:dados}).abortSignal(c.signal)
      if(error)erroBanco(error);if(!data?.ok)throw new ErroEscolas("A gravação não foi confirmada. Recarregue os dados antes de tentar novamente.",503)
      return NextResponse.json({ok:true},{headers:privado})
    }
    const id=validarId(req.nextUrl.searchParams.get("escolaId")),acao=req.nextUrl.searchParams.get("acao")
    if(acao==="editar"){
      const {data,error}=await acesso.supabase.rpc("hub_escola_contexto_edicao",{p_escola_id:id}).abortSignal(c.signal);if(error)erroBanco(error)
      if(!data?.escola||!data.versao)throw new ErroEscolas("A consulta da escola não foi confirmada.",503)
      return NextResponse.json(data,{headers:privado})
    }
    if(acao!=="historico")throw new ErroEscolas("Ação inválida.")
    const cursor=req.nextUrl.searchParams.get("cursor");if(cursor&&!/^\d{1,19}$/.test(cursor))throw new ErroEscolas("Página de histórico inválida.")
    let q=acesso.supabase.from("hub_escolas_historico").select("id,created_at,usuario_id,usuario_nome,usuario_role,alteracoes").eq("escola_id",id)
    if(cursor)q=q.lt("id",cursor)
    const {data,error}=await q.order("id",{ascending:false}).limit(21).abortSignal(c.signal);if(error)erroBanco(error)
    const itens=(data||[]).slice(0,20).map(r=>({...r,id:String(r.id)}));return NextResponse.json({itens,proximo:(data||[]).length>20?itens[itens.length-1].id:null},{headers:privado})
  }catch(e){const status=e instanceof ErroEscolas?e.status:c.signal.aborted?503:500;if(status>=500)console.error("[Escolas/Gestão]",e);return NextResponse.json({erro:e instanceof ErroEscolas?e.message:c.signal.aborted?"A consulta foi interrompida. Seus dados foram mantidos.":"Não foi possível concluir a operação."},{status,headers:privado})}
  finally{clearTimeout(timer);req.signal.removeEventListener("abort",cancelar);c.abort()}
}
export const GET=(req:NextRequest)=>executar(req,false)
export const PATCH=(req:NextRequest)=>executar(req,true)
