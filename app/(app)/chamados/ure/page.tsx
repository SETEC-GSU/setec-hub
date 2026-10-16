"use client"

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { createChamado } from "../actions"
import { encontrarServico, servicosDaOrigem } from "@/lib/chamados/catalogo"
import { validarPedido, type PedidoChamado } from "@/lib/chamados/validacao"
import { modeloDescricao, descricaoSoModelo, contemRoteiro, adicionarRoteiro } from "@/lib/chamados/modelosDescricao"
import SeletorServico, { CamposServico } from "@/components/chamados/SeletorServico"

type Prioridade = "critica" | "alta" | "media" | "baixa"

type SolicitacaoOption = {
  value: string
  label: string
  prioridade: Prioridade
  sla_horas: number
  tecnologia: string
  helper: string
  template: string
  permiteAnexo?: boolean
}

type FormState = {
  titulo: string
  nome: string
  setor: string
  solicitacao: string
  descricao: string
}

type Feedback = {
  type: "success" | "error" | "info"
  message: string
} | null

type ChamadoCriado = {
  id: string
  codigo: string | null
  titulo: string
}

const MAX_FILES = 3
const MAX_FILE_SIZE = 5 * 1024 * 1024

const initialForm: FormState = {
  titulo: "",
  nome: "",
  setor: "",
  solicitacao: "",
  descricao: "",
}

const solicitacoesURE: SolicitacaoOption[] = servicosDaOrigem("ure").map(s => ({
  value: s.id, label: s.label, prioridade: s.prioridade, sla_horas: s.sla,
  tecnologia: s.categoria, helper: s.ajuda, template: "", permiteAnexo: true,
}))

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
}

function validateFiles(files: File[]) {
  if (files.length > MAX_FILES) {
    return `Selecione no máximo ${MAX_FILES} arquivos.`
  }

  const oversized = files.find((file) => file.size > MAX_FILE_SIZE)

  if (oversized) {
    return `O arquivo "${oversized.name}" ultrapassa o limite de 5 MB.`
  }

  return null
}

function validateForm(form: FormState) {
  if (form.titulo.trim().length < 4) {
    return "Informe um título objetivo para o chamado."
  }

  if (form.nome.trim().length < 3) {
    return "Informe o nome do solicitante."
  }

  if (form.setor.trim().length < 2) {
    return "Informe o setor solicitante."
  }

  if (!form.solicitacao) {
    return "Selecione o tipo de solicitação."
  }

  if (form.descricao.trim().length < 15) {
    return "A descrição deve conter informações mínimas para análise da SETEC."
  }

  return null
}

export default function ChamadoUREPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const submitLockRef = useRef(false)

  const [form, setForm] = useState<FormState>(initialForm)
  const [respostasPorServico, setRespostasPorServico] = useState<Record<string, Record<string, string>>>({})
  const [ambiente, setAmbiente] = useState("")
  const servicoAtual = encontrarServico(form.solicitacao)
  const respostasAtuais = respostasPorServico[form.solicitacao] || {}
  function alterarResposta(campo: string, valor: string) {
    setRespostasPorServico(atual => ({ ...atual, [form.solicitacao]: { ...(atual[form.solicitacao] || {}), [campo]: valor } }))
  }
  function pedidoAtual(): PedidoChamado {
    return { origem: "ure", servicoId: form.solicitacao, titulo: form.titulo, nome: form.nome,
      unidade: form.setor, ambiente, descricao: form.descricao, respostas: respostasAtuais }
  }
  const [arquivos, setArquivos] = useState<File[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [chamadoCriado, setChamadoCriado] = useState<ChamadoCriado | null>(null)

  const selectedOption = useMemo(
    () => solicitacoesURE.find((item) => item.value === form.solicitacao) || null,
    [form.solicitacao]
  )

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSolicitacaoChange(value: string) {
    const option = solicitacoesURE.find((item) => item.value === value) || null

    setForm((current) => {
      const previousOption =
        solicitacoesURE.find((item) => item.value === current.solicitacao) ||
        null

      const tituloAtual = current.titulo.trim()

      const tituloEstaVazio = tituloAtual.length === 0

      const tituloFoiGeradoAutomaticamente =
        previousOption &&
        tituloAtual.toLowerCase() === previousOption.label.trim().toLowerCase()

      const deveAtualizarTitulo =
        tituloEstaVazio || Boolean(tituloFoiGeradoAutomaticamente)

      return {
        ...current,
        solicitacao: value,
        descricao: !current.descricao.trim() || descricaoSoModelo(current.solicitacao, current.descricao, "ure") ? modeloDescricao(value, "ure") : current.descricao,
        titulo: deveAtualizarTitulo ? option?.label || "" : current.titulo,
      }
    })

    setFeedback(null)
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    const validationError = validateFiles(files)

    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      })

      event.target.value = ""
      return
    }

    setArquivos(files)
    setFeedback(null)
  }

  function removerArquivo(index: number) {
    setArquivos((current) => current.filter((_, i) => i !== index))
    setFileInputKey((value) => value + 1)
  }

  async function uploadArquivos(chamadoId: string) {
    const falhas: string[] = []

    for (const [index, file] of arquivos.entries()) {
      const safeName = sanitizeFileName(file.name)
      const unique = `${Date.now()}_${index}_${Math.random()
        .toString(36)
        .slice(2)}`
      const path = `${chamadoId}/${unique}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from("chamados-anexos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        falhas.push(file.name)
        continue
      }

      const { data: urlData } = supabase.storage
        .from("chamados-anexos")
        .getPublicUrl(path)

      const { error: insertAnexoError } = await supabase
        .from("chamados_anexos")
        .insert({
          chamado_id: chamadoId,
          url: urlData.publicUrl,
          nome_arquivo: file.name,
        })

      if (insertAnexoError) {
        falhas.push(file.name)
      }
    }

    return falhas
  }

  async function abrirChamado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting || submitLockRef.current) return

    const validationError = validateForm(form) || validarPedido(pedidoAtual())

    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      })
      return
    }

    const fileError = validateFiles(arquivos)

    if (fileError) {
      setFeedback({
        type: "error",
        message: fileError,
      })
      return
    }

    submitLockRef.current = true
    setSubmitting(true)
    setFeedback(null)

    try {
      const pedido = pedidoAtual()
      const dados = new FormData()
      dados.set("origem", pedido.origem)
      dados.set("servico_id", pedido.servicoId)
      dados.set("titulo", pedido.titulo)
      dados.set("nome", pedido.nome)
      dados.set("setor", pedido.unidade)
      dados.set("ambiente", pedido.ambiente)
      dados.set("descricao", pedido.descricao)
      dados.set("respostas", JSON.stringify(pedido.respostas))
      const resultado = await createChamado(dados)
      if (!resultado.ok) {
        setFeedback({ type: "error", message: resultado.erro })
        return
      }
      const chamado = resultado.chamado

      const falhasAnexo =
        arquivos.length > 0 ? await uploadArquivos(chamado.id) : []

      setChamadoCriado({
        id: chamado.id,
        codigo: chamado.codigo || null,
        titulo: chamado.titulo || form.titulo,
      })

      setForm(initialForm)
      setRespostasPorServico({})
      setAmbiente("")
      setArquivos([])
      setFileInputKey((value) => value + 1)

      setFeedback({
        type: falhasAnexo.length > 0 ? "info" : "success",
        message:
          falhasAnexo.length > 0
            ? `Chamado aberto com sucesso, porém alguns anexos não foram enviados: ${falhasAnexo.join(
                ", "
              )}.`
            : "Chamado aberto com sucesso. A SETEC realizará a triagem da solicitação.",
      })
    } catch (error) {
      console.error("[Chamados URE] Erro ao abrir chamado:", error)

      setFeedback({
        type: "error",
        message:
          "Não foi possível abrir o chamado. Verifique os dados informados e tente novamente.",
      })
    } finally {
      setSubmitting(false)
      submitLockRef.current = false
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.08),transparent_30%)]" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge>Visão URE</Badge>
            <Badge>Solicitações internas</Badge>
            <Badge secondary>SETEC Hub</Badge>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                Abrir chamado com a{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                  SETEC
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
                Registre solicitações internas da URE com preenchimento
                padronizado, descrição orientada e acompanhamento pela gestão de
                chamados.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                Fluxo do atendimento
              </p>

              <div className="mt-4 space-y-3 text-sm font-semibold text-slate-300">
                <div className="flex gap-3">
                  <span className="text-cyan-300">1.</span>
                  <span>Preencha a solicitação com as informações necessárias.</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-cyan-300">2.</span>
                  <span>A SETEC realiza a triagem e define o encaminhamento.</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-cyan-300">3.</span>
                  <span>O acompanhamento fica registrado no SETEC Hub.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {feedback && <FeedbackBox type={feedback.type}>{feedback.message}</FeedbackBox>}

      {chamadoCriado && (
        <section className="mt-6 rounded-[2rem] border border-emerald-500/25 bg-emerald-500/10 p-5 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                Solicitação registrada
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                Chamado{" "}
                {chamadoCriado.codigo ? `#${chamadoCriado.codigo}` : "criado"}
              </h2>

              <p className="mt-1 text-sm font-medium text-emerald-100/70">
                {chamadoCriado.titulo}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push(`/chamados/${chamadoCriado.id}`)}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition-all hover:bg-emerald-500"
              >
                Acompanhar chamado
              </button>

              <button
                type="button"
                onClick={() => setChamadoCriado(null)}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-300 transition-all hover:border-slate-500"
              >
                Abrir outro
              </button>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={abrirChamado} className="mt-6"><fieldset disabled={submitting} className="min-w-0">
        <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2" label="Título do chamado" required>
              <input
                aria-label="Título do chamado"
                value={form.titulo}
                onChange={(event) => updateForm("titulo", event.target.value)}
                placeholder="Ex.: Solicitação de apoio técnico para reunião"
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <Field label="Nome do solicitante" required>
              <input
                aria-label="Nome do solicitante"
                value={form.nome}
                onChange={(event) => updateForm("nome", event.target.value)}
                placeholder="Nome completo"
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <Field label="Setor solicitante" required>
              <input
                aria-label="Setor solicitante"
                value={form.setor}
                onChange={(event) => updateForm("setor", event.target.value)}
                placeholder="Ex.: SEINTEC, SEAFIN, Gabinete..."
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <div className="min-w-0 md:col-span-2">
              <SeletorServico origem="ure" value={form.solicitacao} onChange={handleSolicitacaoChange} disabled={submitting} />
            </div>
            <Field className="md:col-span-2" label="Local / ambiente (opcional)">
              <input aria-label="Local / ambiente" value={ambiente} onChange={e => setAmbiente(e.target.value)} className={inputClass} maxLength={160} placeholder="Ex.: secretaria, laboratório, sala ou setor" />
            </Field>
            {servicoAtual && <div className="min-w-0 md:col-span-2"><CamposServico servico={servicoAtual} respostas={respostasAtuais} alterar={alterarResposta} disabled={submitting}/></div>}

            {selectedOption && (
              <div className="md:col-span-2">
                <TechnologyBox
                  title={selectedOption.tecnologia}
                  description={selectedOption.helper}
                />
              </div>
            )}

            {selectedOption?.permiteAnexo && (
              <Field className="md:col-span-2" label="Anexos">
                <FileUpload
                  key={fileInputKey}
                  arquivos={arquivos}
                  onChange={handleFilesChange}
                  onRemove={removerArquivo}
                />
              </Field>
            )}

            {servicoAtual && <div className="md:col-span-2 flex min-w-0 flex-col gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-xs leading-relaxed text-slate-400">O roteiro abaixo ajuda a informar os detalhes da solicitação. Ao trocar de serviço, o texto que você já preencheu é mantido.</p>
              <button type="button" disabled={contemRoteiro(form.solicitacao, form.descricao, "ure")} onClick={() => updateForm("descricao", adicionarRoteiro(form.solicitacao, form.descricao, "ure"))} className="min-h-11 shrink-0 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-xs font-black text-blue-200 disabled:opacity-50">{contemRoteiro(form.solicitacao, form.descricao, "ure") ? "Roteiro na descrição" : "Adicionar roteiro à descrição"}</button>
            </div>}

            <Field className="md:col-span-2" label="Descrição da solicitação" required>
              <textarea
                aria-label="Descrição da solicitação"
                value={form.descricao}
                onChange={(event) => updateForm("descricao", event.target.value)}
                placeholder="Conte o que aconteceu ou o que precisa, os testes realizados e o resultado esperado."
                maxLength={30000}
                rows={10}
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </Field>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Anexos
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Algumas solicitações permitem anexar documentos ou imagens para
              auxiliar a análise. Limite: até {MAX_FILES} arquivos, com 5 MB por
              arquivo.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Revise as informações antes de enviar. Após a abertura, a
              solicitação ficará registrada para triagem da SETEC.
            </p>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition-all hover:scale-[1.01] hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Enviando..." : "Abrir chamado"}
            </button>
          </div>
        </section>
      </fieldset></form>
    </main>
  )
}

const inputClass =
  "w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3.5 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label} {required && <span className="text-cyan-300">*</span>}
      </span>
      {children}
    </label>
  )
}

function Badge({
  children,
  secondary = false,
}: {
  children: ReactNode
  secondary?: boolean
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
        secondary
          ? "border-slate-700 bg-slate-900 text-slate-400"
          : "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
      }`}
    >
      {children}
    </span>
  )
}

function FeedbackBox({
  type,
  children,
}: {
  type: "success" | "error" | "info"
  children: ReactNode
}) {
  const classes = {
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    error: "border-red-500/25 bg-red-500/10 text-red-200",
    info: "border-blue-500/25 bg-blue-500/10 text-blue-200",
  }

  return (
    <div
      className={`mt-6 rounded-3xl border px-5 py-4 text-sm font-semibold ${classes[type]}`}
    >
      {children}
    </div>
  )
}

function FileUpload({
  arquivos,
  onChange,
  onRemove,
}: {
  arquivos: File[]
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-[#0B1120] p-4">
      <input
        type="file"
        multiple
        onChange={onChange}
        className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500/15 file:px-4 file:py-2.5 file:text-sm file:font-black file:text-blue-300 hover:file:bg-blue-500/25"
      />

      {arquivos.length > 0 && (
        <div className="mt-4 space-y-2">
          {arquivos.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-300">
                  {file.name}
                </p>
                <p className="text-[10px] font-semibold text-slate-600">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-red-300 transition-all hover:bg-red-500/10"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TechnologyBox({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[1.75rem] border border-cyan-500/20 bg-cyan-500/5 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
        Tecnologia envolvida
      </p>

      <h2 className="mt-2 text-xl font-black text-white">{title}</h2>

      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  )
}
