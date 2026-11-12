import "server-only"
import { createHash } from "node:crypto"
import { createServerSupabase } from "@/lib/supabase-server"
import { canAccess } from "@/lib/canAccess"
import type { Role } from "@/lib/roles"
import type { Escola } from "./modelo"
import { consolidarFichas, filtrarEscolasRelatorio, montarFichas, referenciasInventarioAusentes, type BaseRelatorioEscolar, type FonteInventario, type PedidoRelatorioEscolar, type RecebidoFonte } from "./relatorios"

export class ErroEscolas extends Error { constructor(message:string,public status=400){super(message)} }
export async function acessoEscolas(signal:AbortSignal){
  const supabase=await createServerSupabase({fetch:(input,init)=>fetch(input,{...init,signal})})
  const {data:{user},error}=await supabase.auth.getUser()
  if(error||!user)throw new ErroEscolas("Entre novamente para acessar os dados das escolas.",error&&error.status!==401&&error.status!==403?503:401)
  const {data:perfil,error:perfilErro}=await supabase.from("usuarios").select("id,nome,role").eq("id",user.id).abortSignal(signal).maybeSingle()
  if(perfilErro)throw new ErroEscolas("Não foi possível conferir o perfil. Tente novamente.",503)
  if(!perfil||!canAccess(perfil.role as Role,"escolas.view"))throw new ErroEscolas("Seu perfil não possui acesso ao Painel Escolar.",403)
  return {supabase,nome:String(perfil.nome||"Usuário autenticado"),role:String(perfil.role),usuarioId:user.id,podeEditar:["admin","seintec"].includes(perfil.role)}
}
export type AcessoEscolas=Awaited<ReturnType<typeof acessoEscolas>>
export async function consultarEscolasServidor(supabase:AcessoEscolas["supabase"],signal:AbortSignal){
  const escolas:Escola[]=[],ids=new Set<string>();let cursor="",total=-1
  while(true){
    let q=supabase.from("escolas").select("*",{count:total<0?"exact":undefined})
    if(cursor)q=q.gt("id",cursor)
    const {data,error,count}=await q.order("id").limit(500).abortSignal(signal)
    if(error)throw new ErroEscolas("Não foi possível consultar todas as escolas. Nenhum PDF parcial foi emitido.",503)
    if(total<0){if(count===null||!Number.isSafeInteger(count))throw new ErroEscolas("Não foi possível conferir o total de escolas.",503);total=count}
    const lote=(data||[]) as Escola[]
    for(const e of lote){if(!e.id||ids.has(e.id))throw new ErroEscolas("O cadastro mudou durante a consulta. Atualize a prévia.",409);ids.add(e.id);escolas.push(e)}
    if(escolas.length>total)throw new ErroEscolas("O cadastro mudou durante a consulta. Atualize a prévia.",409)
    if(escolas.length===total)break
    if(!lote.length)throw new ErroEscolas("A consulta das escolas ficou incompleta. Tente novamente.",503)
    cursor=lote[lote.length-1].id
  }
  return escolas
}
export async function consultarRelatorioEscolar(acesso:AcessoEscolas,pedido:PedidoRelatorioEscolar,signal:AbortSignal):Promise<BaseRelatorioEscolar>{
  if(!canAccess(acesso.role as Role,"inventario.vgeral"))throw new ErroEscolas("Seu perfil não possui acesso à Visão Geral do inventário necessária ao relatório.",403)
  const [escolas,rpc]=await Promise.all([consultarEscolasServidor(acesso.supabase,signal),acesso.supabase.rpc("hub_inventario_visao_geral").abortSignal(signal)])
  if(rpc.error||!rpc.data)throw new ErroEscolas("Não foi possível ler o inventário sincronizado. Nenhum PDF com dados parciais foi emitido.",rpc.error?.code==="42501"?403:503)
  const selecionadas=filtrarEscolasRelatorio(escolas,pedido)
  if(!selecionadas.length)throw new ErroEscolas("Nenhuma escola encontrada neste recorte.",404)
  if(pedido.detalhar&&selecionadas.length>150)throw new ErroEscolas("O relatório completo excede 150 escolas. Selecione um recorte ou gere o consolidado sem fichas.",422)
  const fonte=rpc.data as FonteInventario
  if(!Array.isArray(fonte.equipamentos)||!Array.isArray(fonte.inventarios))throw new ErroEscolas("A base de inventário retornou um formato incompleto.",503)
  let fichas
  try{
    // Os itens apontam para o recebimento da escola, não para o ID do catálogo.
    // Só consultamos vínculos ausentes do último levantamento do recorte.
    const faltantes=referenciasInventarioAusentes(selecionadas,fonte),extras:RecebidoFonte[]=[]
    for(let i=0;i<faltantes.length;i+=100){
      const {data,error}=await acesso.supabase.from("equipamentos_recebidos").select("id,escola_nome,quantidade_recebida,equipamentos_modelos(id,equipamento,tipo,finalidade,uso,ano_recebimento)").in("id",faltantes.slice(i,i+100)).order("id").limit(100).abortSignal(signal)
      if(error)throw new ErroEscolas("Não foi possível conferir os recebimentos vinculados ao inventário.",503)
      extras.push(...(data||[]) as RecebidoFonte[])
    }
    fichas=montarFichas(selecionadas,escolas,{...fonte,equipamentos:[...fonte.equipamentos,...extras]})
  }catch(e){if(e instanceof ErroEscolas)throw e;throw new ErroEscolas(e instanceof Error?e.message:"Não foi possível consolidar o inventário.",422)}
  if(fichas.reduce((n,f)=>n+f.inventario.length,0)>15000)throw new ErroEscolas("O recorte contém muitos modelos. Selecione um grupo menor de escolas.",422)
  const dadosAssinatura=fichas.map(f=>({...f,ultimaResposta:f.ultimaResposta?{id:f.ultimaResposta.id,created_at:f.ultimaResposta.created_at,responsavel_nome:f.ultimaResposta.responsavel_nome,responsavel_cargo:f.ultimaResposta.responsavel_cargo,observacao:f.ultimaResposta.observacao}:null}))
  const consolidado=consolidarFichas(fichas),assinatura=createHash("sha256").update(JSON.stringify({pedido,fichas:dadosAssinatura})).digest("hex")
  return {fichas,...consolidado,pedido,assinatura,geradoEm:new Date().toISOString(),solicitante:acesso.nome}
}
