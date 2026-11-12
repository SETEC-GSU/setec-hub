"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { Send, Ticket } from "lucide-react"
import { createClient } from "@/lib/supabase"
import AnexosChamado from "./AnexosChamado"
import { validarArquivos } from "@/lib/chamados/anexos"
import { createChamado } from "@/app/(app)/chamados/actions"
import { encontrarServico, type OrigemChamado } from "@/lib/chamados/catalogo"
import { descricaoObrigatoria, roteiroObservacoes, servicoFormulario } from "@/lib/chamados/formulario"
import { validarPedido, type PedidoChamado } from "@/lib/chamados/validacao"
import { identificacaoCompleta, type DadosPerfilChamado } from "@/lib/chamados/perfil"
import { IdentificacaoSolicitante, TituloSugerido } from "./DadosAberturaChamado"
import SeletorServico, { CamposServico } from "./SeletorServico"

const input = "min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-base text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
type Feedback = { tipo: "success" | "error" | "info"; texto: string } | null

export default function FormularioChamado({ origem, perfil }: { origem: OrigemChamado; perfil: DadosPerfilChamado }) {
  const supabase = useMemo(() => createClient(), [])
  const inicial = () => ({ servico: "", titulo: "", nome: perfil.nome, unidade: perfil.unidade, descricao: "", ambiente: "" })
  const [form, setForm] = useState(inicial), [respostas, setRespostas] = useState<Record<string, Record<string, string>>>({})
  const [rascunhos, setRascunhos] = useState<Record<string, { titulo: string; descricao: string }>>({})
  const [arquivos, setArquivos] = useState<File[]>([]), [feedback, setFeedback] = useState<Feedback>(null)
  const [enviando, setEnviando] = useState(false), [versao, setVersao] = useState(0)
  const [criado, setCriado] = useState<{ id: string; codigo: string | null; titulo: string } | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null), observacoesRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (feedback) { feedbackRef.current?.focus({ preventScroll: true }); feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }) } }, [feedback])
  const trava = useRef(false), atuais = respostas[form.servico] || {}
  const servico = useMemo(() => {
    const original = encontrarServico(form.servico, origem)
    return original ? servicoFormulario(original, origem) : null
  }, [form.servico, origem])
  useEffect(() => {
    const ajustar = () => {
      const campo = observacoesRef.current
      if (!campo) return
      campo.style.height = "auto"
      campo.style.height = `${Math.max(112, Math.min(360, campo.scrollHeight + 2))}px`
    }
    ajustar(); window.addEventListener("resize", ajustar)
    return () => window.removeEventListener("resize", ajustar)
  }, [form.servico])
  const exigeDescricao = descricaoObrigatoria(form.servico, 3)
  const essenciais = servico ? { ...servico, campos: servico.campos.filter(c => !c.opcional) } : null
  const complementares = servico ? { ...servico, campos: servico.campos.filter(c => c.opcional) } : null
  function alterar<K extends keyof typeof form>(campo: K, valor: typeof form[K]) { setForm(f => ({ ...f, [campo]: valor })) }
  function selecionar(id: string) {
    if (id === form.servico) return
    const proximo = encontrarServico(id, origem), salvo = rascunhos[id]
    if (!proximo) return
    if (form.servico) setRascunhos(r => ({ ...r, [form.servico]: { titulo: form.titulo, descricao: form.descricao } }))
    setForm(f => ({ ...f, servico: id, titulo: salvo?.titulo ?? proximo.label,
      descricao: salvo?.descricao ?? roteiroObservacoes(id, origem) }))
    setFeedback(null)
  }
  function responder(campo: string, valor: string) { setRespostas(r => ({ ...r, [form.servico]: { ...(r[form.servico] || {}), [campo]: valor } })) }
  function pedido(): PedidoChamado { return { origem, servicoId: form.servico, titulo: form.titulo, nome: form.nome,
    unidade: form.unidade, ambiente: "", descricao: form.descricao, respostas: atuais, compacto: true, versaoFormulario: 3 } }
  async function uploadArquivos(chamadoId: string) {
    const falhas: string[] = []
    for (const [index, file] of arquivos.entries()) {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_")
      const path = `${chamadoId}/${Date.now()}_${index}_${Math.random().toString(36).slice(2)}_${safeName}`
      const { error: uploadError } = await supabase.storage.from("chamados-anexos").upload(path, file, { cacheControl: "3600", upsert: false })
      if (uploadError) { falhas.push(file.name); continue }
      const { data: urlData } = supabase.storage.from("chamados-anexos").getPublicUrl(path)
      const { error } = await supabase.from("chamados_anexos").insert({ chamado_id: chamadoId, url: urlData.publicUrl, nome_arquivo: file.name })
      if (error) falhas.push(file.name)
    }
    return falhas
  }
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (trava.current || enviando) return
    const p = pedido(), erro = validarPedido(p) || validarArquivos(arquivos)
    if (erro) { setFeedback({ tipo: "error", texto: erro }); return }
    trava.current = true; setEnviando(true); setFeedback(null)
    try {
      const dados = new FormData()
      for (const [chave, valor] of Object.entries({ origem, servico_id: p.servicoId, titulo: p.titulo, nome: p.nome,
        [origem === "ure" ? "setor" : "escola"]: p.unidade, ambiente: p.ambiente, descricao: p.descricao,
        respostas: JSON.stringify(p.respostas), formulario_versao: "3" })) dados.set(chave, valor)
      const resultado = await createChamado(dados)
      if (!resultado.ok) { setFeedback({ tipo: "error", texto: resultado.erro }); return }
      setCriado(resultado.chamado)
      let falhas: string[] = []
      try { if (arquivos.length) falhas = await uploadArquivos(resultado.chamado.id) }
      catch { falhas = arquivos.map(f => f.name) }
      setForm(inicial()); setRespostas({}); setRascunhos({}); setArquivos([]); setVersao(v => v + 1)
      setFeedback({ tipo: falhas.length ? "info" : "success", texto: falhas.length
        ? `Chamado registrado. Não abra outro: alguns anexos não foram enviados (${falhas.join(", ")}).` : "Chamado registrado com sucesso. Você já pode acompanhar o atendimento." })
    } catch {
      setFeedback({ tipo: "error", texto: "Não foi possível confirmar o envio. Seus dados foram mantidos; consulte Meus Chamados antes de reenviar." })
    } finally { trava.current = false; setEnviando(false) }
  }

  return <main className="mx-auto w-full max-w-3xl space-y-5 pb-10">
    <header className="flex items-start gap-3 px-1">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300"><Ticket aria-hidden="true" size={22}/></span>
      <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{origem === "ure" ? "Atendimento URE" : "Atendimento às escolas"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Como podemos ajudar?</h1><p className="mt-1 text-sm leading-relaxed text-slate-400">{identificacaoCompleta(form.nome, form.unidade, origem) ? "Seus dados já estão preenchidos. Conte apenas o que precisa." : "Escolha o pedido e confira os dados do solicitante."}</p></div>
    </header>
    {feedback && <div ref={feedbackRef} tabIndex={-1} role={feedback.tipo === "error" ? "alert" : "status"} className={`rounded-2xl border p-4 text-sm leading-relaxed ${feedback.tipo === "error" ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-blue-500/30 bg-blue-500/10 text-blue-100"}`}>
      {feedback.texto}{criado && feedback.tipo !== "error" && <Link className="mt-3 block min-h-11 font-bold underline underline-offset-4" href={`/chamados/${criado.id}`}>Acompanhar chamado {criado.codigo ? `#${criado.codigo}` : ""}</Link>}
    </div>}
    <form onSubmit={enviar} onInvalidCapture={event => {
      const detalhe = (event.target as HTMLElement).closest<HTMLDetailsElement>("details")
      if (detalhe) detalhe.open = true
    }}>
      <fieldset disabled={enviando} className="min-w-0 space-y-5 rounded-3xl border border-slate-800 bg-[#020617] p-4 sm:p-6">
        <legend className="sr-only">Abrir chamado {origem === "ure" ? "URE" : "escolar"}</legend>
        <SeletorServico key={`servico-${versao}`} origem={origem} value={form.servico} onChange={selecionar} disabled={enviando}/>
        {servico && <>
          {essenciais && essenciais.campos.length > 0 && <CamposServico servico={essenciais} respostas={atuais} alterar={responder} disabled={enviando}/>}
          {servico.campos.some(c => c.id === "usuario_afetado") && perfil.email && <button type="button" onClick={() => responder("usuario_afetado", perfil.email)} className="min-h-11 text-sm font-semibold text-blue-300 underline underline-offset-4">Usar meu e-mail como usuário afetado</button>}
          <label className="block text-sm font-semibold text-slate-200">{exigeDescricao ? "Descreva o pedido" : "Observações (opcional)"}{exigeDescricao && <span className="text-blue-300"> *</span>}
            <p className="mb-2 mt-1 text-xs font-normal leading-relaxed text-slate-400">{exigeDescricao ? "Complete o roteiro ou escreva com suas palavras." : "Acrescente só o que ainda não foi informado. Pode deixar como está."}</p>
            <textarea ref={observacoesRef} aria-label="Observações do pedido" className={`${input} resize-y font-normal leading-relaxed`} value={form.descricao} onChange={e => alterar("descricao", e.target.value)} required={exigeDescricao} maxLength={30000} rows={exigeDescricao ? 4 : 3} placeholder={exigeDescricao ? "Descreva o que aconteceu e o que precisa." : "Inclua apenas informações adicionais, se necessário."}/>
          </label>
          <details className="group rounded-2xl border border-slate-800 bg-slate-900/20 p-4" key={`extras-${versao}-${form.servico}`}>
            <summary className="min-h-7 cursor-pointer text-sm font-semibold text-slate-300">Mais detalhes (opcional){form.titulo !== servico.label ? " · título personalizado" : ""}</summary>
            <div className="mt-4 min-w-0 space-y-4">
              {complementares && complementares.campos.length > 0 && <CamposServico servico={complementares} respostas={atuais} alterar={responder} disabled={enviando} titulo="Informações complementares"/>}
              <TituloSugerido key={`titulo-${versao}-${form.servico}`} titulo={form.titulo} sugestao={servico.label} alterar={v => alterar("titulo", v)}/>

            </div>
          </details>
          <AnexosChamado key={`anexos-${versao}`} arquivos={arquivos} alterar={lista => { setArquivos(lista); setFeedback(null) }} disabled={enviando}/>
        </>}
        <IdentificacaoSolicitante key={`identificacao-${versao}`} origem={origem} perfil={perfil} nome={form.nome} unidade={form.unidade} alterarNome={v => alterar("nome", v)} alterarUnidade={v => alterar("unidade", v)}/>
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-400">{servico && !exigeDescricao ? "Os dados preenchidos já compõem o pedido." : "Confira os dados antes de enviar."}</p>
          <button type="submit" disabled={enviando || !servico} aria-busy={enviando} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} aria-hidden="true"/>{enviando ? "Enviando…" : "Abrir chamado"}</button>
        </div>
      </fieldset>
    </form>
  </main>
}
