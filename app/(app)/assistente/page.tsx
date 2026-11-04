import Link from 'next/link'
import { NOME_ASSISTENTE, NOME_COMPLETO_ASSISTENTE } from '@/lib/assistente/config'
import { redirect } from 'next/navigation'
import AssistenteHub from '@/components/assistente/AssistenteHub'
import { acessoAssistente, ErroAssistenteHub, opcoesAssistente } from '@/lib/assistente/server'

export const dynamic='force-dynamic'
export const metadata={title:NOME_ASSISTENTE,description:NOME_COMPLETO_ASSISTENTE}
export default async function AssistentePage(){
 let resultado
 try{
  const acesso=await acessoAssistente(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000)
  try{resultado=await opcoesAssistente(acesso,controller.signal)}finally{clearTimeout(timer);controller.abort()}
 }catch(e){
  if(e instanceof ErroAssistenteHub&&e.status===401)redirect('/login?redirectTo=%2Fassistente')
  return <section className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-slate-700 bg-slate-950 p-6 text-slate-200"><p className="text-sm font-semibold text-cyan-300">{NOME_ASSISTENTE}</p><h1 className="text-2xl font-bold">{e instanceof ErroAssistenteHub&&e.status===403?'Acesso restrito':'Consulta indisponível no momento'}</h1><p>{e instanceof ErroAssistenteHub?e.message:'Não foi possível conferir a conexão agora. Tente novamente em alguns instantes.'}</p><div className="flex flex-wrap gap-4"><a href="/assistente" className="rounded-xl border border-cyan-600 px-5 py-3">Tentar novamente</a><Link href="/" className="rounded-xl border border-slate-700 px-5 py-3">Menu principal</Link></div></section>
 }
 return <AssistenteHub opcoes={resultado}/>
}
