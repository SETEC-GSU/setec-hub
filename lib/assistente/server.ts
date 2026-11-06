import 'server-only'
import { createServerSupabase } from '@/lib/supabase-server'
import { comLimiteSessao, sessaoAusenteOuInvalida } from '@/lib/sessao-servidor'
import { canAccess } from '@/lib/canAccess'
import type { BaseConsulta, Consulta, Modulo, Opcoes } from './types'
import { contextoValido } from './interpretar'
import { respostaDados } from './respostas'

export class ErroAssistenteHub extends Error {constructor(message:string,public status=400){super(message)}}
export async function acessoAssistente(){
 return comLimiteSessao(async fetchSessao=>{
  const supabase=await createServerSupabase({fetch:fetchSessao})
  const {data,error}=await supabase.auth.getClaims()
  if(error)throw new ErroAssistenteHub(sessaoAusenteOuInvalida(error)?'Entre no Hub para consultar o assistente.':'Não foi possível conferir sua sessão agora. Tente novamente.',sessaoAusenteOuInvalida(error)?401:503)
  const uid=data?.claims?.sub
  if(typeof uid!=='string'||!uid)throw new ErroAssistenteHub('Entre no Hub para consultar o assistente.',401)
  const {data:perfil,error:erroPerfil}=await supabase.from('usuarios').select('id,nome,role').eq('id',uid).maybeSingle()
  if(erroPerfil)throw new ErroAssistenteHub('Não foi possível conferir seu acesso agora. Tente novamente.',503)
  if(!perfil||!['admin','seintec'].includes(perfil.role)||!canAccess(perfil.role as Parameters<typeof canAccess>[0],'assistente.view'))throw new ErroAssistenteHub('Seu perfil não possui acesso ao Assistente do Hub.',403)
  return {supabase,usuario:{id:perfil.id as string,nome:String(perfil.nome||'Equipe SETEC')}}
 })
}
function erroBanco(error:{code?:string;message?:string},modulo?:Modulo){
 const codigo=/^[A-Z0-9]{5,12}$/.test(error.code||'')?error.code!:'SEM_CODIGO',referencia='SETH-'+crypto.randomUUID().slice(0,8).toUpperCase()
 // A mensagem técnica fica no servidor; não registra perguntas, filtros ou dados retornados.
 console.error('[S.E.T.H.] Falha na consulta',{referencia,modulo:modulo||'opcoes',codigo,mensagem:String(error.message||'').slice(0,500)})
 const ref=` Referência: ${referencia} (${codigo}).`
 if(error.code==='42501')return new ErroAssistenteHub('Seu acesso ao assistente não está disponível. Confira sua sessão e perfil.'+ref,403)
 if(['PGRST202','42883','42P01'].includes(error.code||''))return new ErroAssistenteHub('A consulta do assistente precisa ser atualizada no banco. Confira o SQL 019 do pacote; para instalação inicial, use o SQL 016.'+ref,503)
 if(error.code==='22023')return new ErroAssistenteHub((modulo==='escolas'?'Confira a escola e os filtros. Se ainda não aplicou a atualização de escolas, execute o SQL 019 do pacote.':'Confira os filtros e as datas da consulta.')+ref,400)
 if(error.code==='57014')return new ErroAssistenteHub('A consulta excedeu o tempo de processamento do banco. Selecione um período menor ou uma edição e tente novamente.'+ref,503)
 if(error.code==='54001')return new ErroAssistenteHub('A consulta excedeu o limite de processamento. Aplique a atualização SQL 019 do assistente e tente novamente.'+ref,503)
 if(['42702','42703'].includes(error.code||''))return new ErroAssistenteHub('A estrutura da consulta está incompatível com o banco. Confira a atualização SQL 019 do assistente e os campos do cadastro.'+ref,503)
 return new ErroAssistenteHub('Não foi possível concluir a consulta. Sua pergunta e as respostas anteriores foram mantidas.'+ref,503)
}
export async function opcoesAssistente(acesso:Awaited<ReturnType<typeof acessoAssistente>>,signal:AbortSignal){
 const {data,error}=await acesso.supabase.rpc('hub_assistente_opcoes').abortSignal(signal)
 if(error)throw erroBanco(error)
 const o=data as Opcoes
 if(!o||o.versao!==1||o.usuario_id!==acesso.usuario.id||!Array.isArray(o.escolas)||!Array.isArray(o.tecnicos)||!Array.isArray(o.categorias)||!Array.isArray(o.edicoes))throw new ErroAssistenteHub('A base do assistente está incompatível. Atualize os arquivos e tente novamente.',503)
 return o
}
export async function consultarAssistente(acesso:Awaited<ReturnType<typeof acessoAssistente>>,valor:unknown,pagina:number,signal:AbortSignal){
 const c=contextoValido(valor)
 if(!c||!Number.isInteger(pagina)||pagina<1||pagina>10000)throw new ErroAssistenteHub('Confira o módulo e os filtros da consulta.')
 const {data,error}=await acesso.supabase.rpc('hub_assistente_consultar',{p_modulo:c.modulo,p_filtros:c,p_pagina:pagina}).abortSignal(signal)
 if(error)throw erroBanco(error,c.modulo)
 const b=data as BaseConsulta
 if(!b||b.versao!==1||b.usuario_id!==acesso.usuario.id||b.modulo!==c.modulo||!b.dados||!Array.isArray(b.dados.linhas)||typeof b.dados.total!=='number')throw new ErroAssistenteHub('A consulta retornou dados incompatíveis. Tente novamente.',503)
 return respostaDados(b,c as Consulta,pagina)
}
