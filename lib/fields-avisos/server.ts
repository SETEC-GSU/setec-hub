import 'server-only'
import { createServerSupabase } from '@/lib/supabase-server'
import { comLimiteSessao, sessaoAusenteOuInvalida } from '@/lib/sessao-servidor'
import { podeGerirRelatoriosFields } from '@/lib/fields-relatorios/perfis'

export class ErroAvisos extends Error{constructor(message:string,public status=400){super(message)}}
export async function acessoAvisos(){return comLimiteSessao(async fetchSessao=>{
 const supabase=await createServerSupabase({fetch:fetchSessao});const {data,error}=await supabase.auth.getClaims()
 if(error)throw new ErroAvisos(sessaoAusenteOuInvalida(error)?'Entre no Hub para acessar os avisos.':'Não foi possível conferir a sessão agora.',sessaoAusenteOuInvalida(error)?401:503)
 const uid=data?.claims?.sub;if(typeof uid!=='string'||!uid)throw new ErroAvisos('Entre no Hub para acessar os avisos.',401)
 const {data:perfil,error:falha}=await supabase.from('usuarios').select('id,role').eq('id',uid).maybeSingle()
 if(falha)throw new ErroAvisos('Não foi possível conferir seu perfil agora.',503)
 if(!perfil||!podeGerirRelatoriosFields(perfil.role))throw new ErroAvisos('Avisos disponíveis somente para admin e SEINTEC.',403)
 return {supabase,uid}
})}
export function falhaBanco(e:{code?:string}){
 if(e.code==='42501')return new ErroAvisos('Seu perfil não possui acesso aos avisos.',403)
 if(['PGRST202','42883','42P01'].includes(e.code||''))return new ErroAvisos('Aplique o SQL 017 deste pacote para ativar os avisos de visita.',503)
 if(e.code==='40001')return new ErroAvisos('A programação ou o controle mudou. Atualize os avisos antes de registrar.',409)
 if(e.code==='22023')return new ErroAvisos('Confira o período, a seleção e o motivo do aviso ignorado.',400)
 if(e.code==='54000')return new ErroAvisos('A seleção contém descrições muito extensas. Reduza o período ou filtre a escola.',422)
 return new ErroAvisos('Não foi possível concluir. Confira os avisos antes de repetir uma marcação.',503)
}
