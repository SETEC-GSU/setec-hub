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

const solicitacoesURE: SolicitacaoOption[] = [
  {
    value: "Agendamento reunião Microsoft Teams",
    label: "Agendamento de reunião Microsoft Teams",
    prioridade: "alta",
    sla_horas: 24,
    tecnologia: "Microsoft Teams",
    helper:
      "Use para criação, organização ou configuração de reuniões institucionais.",
    template: `- TÍTULO DA REUNIÃO:
- ENVIAR CONVITE PARA:
- PÚBLICO-ALVO:
- DATA E HORÁRIO:
- DESEJA GRAVAÇÃO? (SIM/NÃO):
- DESABILITAR LOBBY? (SIM/NÃO):
- OBSERVAÇÕES:`,
  },
  {
    value: "Equipamentos para eventos",
    label: "Equipamentos para eventos",
    prioridade: "critica",
    sla_horas: 8,
    tecnologia: "Equipamentos e apoio operacional",
    helper:
      "Use para solicitar notebook, projetor, caixa de som, microfone ou outros equipamentos para eventos.",
    template: `- EQUIPAMENTO(S) SOLICITADO(S):
- QUANTIDADE:
- LOCAL DO EVENTO:
- DATA E HORÁRIO DO EVENTO:
- DATA DE RETIRADA:
- DATA DE DEVOLUÇÃO:
- RESPONSÁVEL PELA RETIRADA:
- OBSERVAÇÕES:`,
  },
  {
    value: "Equipamento para uso externo (empréstimo)",
    label: "Equipamento para uso externo (empréstimo)",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Controle de empréstimo de equipamentos",
    helper:
      "Use para solicitação formal de equipamento para uso externo ou atividade fora do ambiente habitual.",
    template: `- EQUIPAMENTO SOLICITADO:
- FINALIDADE DO USO:
- DATA DE RETIRADA:
- DATA DE DEVOLUÇÃO:
- RESPONSÁVEL PELO EQUIPAMENTO:
- LOCAL DE USO:
- OBSERVAÇÕES:`,
  },
  {
    value: "Apoio técnico em eventos",
    label: "Apoio técnico em eventos",
    prioridade: "critica",
    sla_horas: 8,
    tecnologia: "Suporte técnico presencial",
    helper:
      "Use quando houver necessidade de acompanhamento técnico em reunião, formação, transmissão ou evento.",
    template: `- NOME DO EVENTO:
- LOCAL:
- DATA E HORÁRIO:
- TIPO DE APOIO NECESSÁRIO:
- EQUIPAMENTOS ENVOLVIDOS:
- RESPONSÁVEL PELO EVENTO:
- OBSERVAÇÕES:`,
  },
  {
    value: "Publicação no site",
    label: "Publicação no site",
    prioridade: "alta",
    sla_horas: 24,
    tecnologia: "Site institucional / WordPress",
    helper:
      "Use para publicação, atualização ou correção de conteúdo no site institucional.",
    permiteAnexo: true,
    template: `- TÍTULO DA PUBLICAÇÃO:
- TEXTO DA PUBLICAÇÃO:
- DATA DE PUBLICAÇÃO DESEJADA:
- LINK(S), SE HOUVER:
- OBSERVAÇÕES:`,
  },
  {
    value: "Manutenção de equipamentos",
    label: "Manutenção de equipamentos",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Notebooks, desktops e periféricos",
    helper:
      "Use para registrar problemas em equipamentos da URE, incluindo falhas físicas ou de funcionamento.",
    permiteAnexo: true,
    template: `- TIPO DE EQUIPAMENTO:
- PATRIMÔNIO/SÉRIE, SE HOUVER:
- LOCAL ONDE O EQUIPAMENTO ESTÁ:
- PROBLEMA IDENTIFICADO:
- TESTES JÁ REALIZADOS:
- OBSERVAÇÕES:`,
  },
  {
    value: "VPN",
    label: "VPN",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Acesso remoto / VPN",
    helper: "Use para solicitação, ajuste ou suporte relacionado ao acesso VPN.",
    template: `- NOME COMPLETO:
- LOGIN/E-MAIL INSTITUCIONAL:
- SETOR:
- JUSTIFICATIVA PARA USO:
- EQUIPAMENTO UTILIZADO:
- OBSERVAÇÕES:`,
  },
  {
    value: "Instalação ou alteração de ramal",
    label: "Instalação ou alteração de ramal",
    prioridade: "baixa",
    sla_horas: 72,
    tecnologia: "Telefonia / ramal",
    helper:
      "Use para instalação, alteração, remanejamento ou ajuste de ramal.",
    template: `- SETOR:
- LOCAL/SALA:
- RAMAL ATUAL, SE HOUVER:
- SOLICITAÇÃO DESEJADA:
- RESPONSÁVEL PELO SETOR:
- OBSERVAÇÕES:`,
  },
  {
    value: "Manutenção ou instalação de ponto de rede",
    label: "Manutenção ou instalação de ponto de rede",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Rede lógica",
    helper:
      "Use para solicitação relacionada a ponto de rede, cabeamento ou conectividade local.",
    permiteAnexo: true,
    template: `- LOCAL/SALA:
- QUANTIDADE DE PONTOS NECESSÁRIOS:
- EXISTE PONTO PRÓXIMO? (SIM/NÃO):
- JUSTIFICATIVA:
- OBSERVAÇÕES:`,
  },
  {
    value: "Liberação de perfil rede corporativa",
    label: "Liberação de perfil de rede corporativa",
    prioridade: "baixa",
    sla_horas: 72,
    tecnologia: "Rede corporativa / permissões",
    helper:
      "Use para solicitação de acesso a pastas ou recursos de rede corporativa.",
    template: `- NOME COMPLETO:
- LOGIN/E-MAIL INSTITUCIONAL:
- SETOR:
- PASTA/RECURSO QUE DESEJA ACESSO:
- JUSTIFICATIVA:
- OBSERVAÇÕES:`,
  },
  {
    value: "Troca de toner ou manutenção impressora",
    label: "Troca de toner ou manutenção de impressora",
    prioridade: "alta",
    sla_horas: 24,
    tecnologia: "Impressoras / toners",
    helper:
      "Use para troca de toner, falha de impressão ou manutenção em impressora.",
    template: `- IMPRESSORA:
- LOCAL/SETOR:
- TIPO DE TONER, SE SOUBER:
- PROBLEMA IDENTIFICADO:
- NÚMERO DO CHAMADO, SE HOUVER:
- OBSERVAÇÕES:`,
  },
  {
    value: "Criação de formulário",
    label: "Criação de formulário",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Microsoft Forms / Google Forms",
    helper: "Use para solicitação de formulários institucionais.",
    template: `- OBJETIVO DO FORMULÁRIO:
- PÚBLICO-ALVO:
- CAMPOS/PERGUNTAS NECESSÁRIAS:
- PRAZO DE UTILIZAÇÃO:
- RESPONSÁVEL PELO ACOMPANHAMENTO:
- OBSERVAÇÕES:`,
  },
  {
    value: "Criação de dashboards",
    label: "Criação de dashboards",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Power BI / indicadores",
    helper:
      "Use para solicitação relacionada a painel, relatório ou indicador visual.",
    template: `- OBJETIVO DO DASHBOARD:
- BASE DE DADOS DISPONÍVEL:
- INDICADORES DESEJADOS:
- PÚBLICO QUE UTILIZARÁ:
- PRAZO DE ENTREGA DESEJADO:
- OBSERVAÇÕES:`,
  },
  {
    value: "Instalação de segundo monitor",
    label: "Instalação de segundo monitor",
    prioridade: "baixa",
    sla_horas: 72,
    tecnologia: "Estação de trabalho",
    helper: "Use para solicitação de instalação ou ajuste de segundo monitor.",
    template: `- SETOR:
- ESTAÇÃO/USUÁRIO:
- EQUIPAMENTO DISPONÍVEL? (SIM/NÃO):
- FINALIDADE:
- OBSERVAÇÕES:`,
  },
  {
    value: "Periféricos (câmera/fone/caixa de som)",
    label: "Periféricos: câmera, fone ou caixa de som",
    prioridade: "baixa",
    sla_horas: 72,
    tecnologia: "Periféricos",
    helper: "Use para solicitação, ajuste ou suporte de periféricos.",
    template: `- PERIFÉRICO SOLICITADO:
- SETOR:
- FINALIDADE:
- EQUIPAMENTO ONDE SERÁ UTILIZADO:
- OBSERVAÇÕES:`,
  },
  {
    value: "Outras solicitações",
    label: "Outras solicitações",
    prioridade: "media",
    sla_horas: 48,
    tecnologia: "Solicitação geral",
    helper: "Use quando a demanda não se enquadrar nas opções anteriores.",
    template: `- DESCREVA A SOLICITAÇÃO:
- SETOR ENVOLVIDO:
- URGÊNCIA:
- JUSTIFICATIVA:
- OBSERVAÇÕES:`,
  },
]

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
        descricao: option?.template || "",
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

    const validationError = validateForm(form)

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
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      if (!session?.user) {
        setFeedback({
          type: "error",
          message:
            "Sessão não localizada. Faça login novamente para abrir o chamado.",
        })
        return
      }

      const prioridade = selectedOption?.prioridade || "media"
      const slaHoras = selectedOption?.sla_horas || 48

      const { data, error } = await supabase
        .from("chamados")
        .insert({
          titulo: form.titulo.trim(),
          solicitante_nome: form.nome.trim(),
          setor: form.setor.trim(),
          categoria: form.solicitacao,
          descricao: form.descricao.trim(),
          tipo: "ure",
          origem: "ure",
          prioridade,
          sla_horas: slaHoras,
          status: "aberto",
          usuario_id: session.user.id,
          visualizado_gestao: false,
          visualizado_pelo_usuario: true,
        })
        .select("id,codigo,titulo")
        .single()

      if (error) throw error

      const chamado = data as ChamadoCriado | null

      if (!chamado?.id) {
        throw new Error("Chamado criado, mas o identificador não foi retornado.")
      }

      const falhasAnexo =
        arquivos.length > 0 ? await uploadArquivos(chamado.id) : []

      setChamadoCriado({
        id: chamado.id,
        codigo: chamado.codigo || null,
        titulo: chamado.titulo || form.titulo,
      })

      setForm(initialForm)
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

      <form onSubmit={abrirChamado} className="mt-6">
        <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl md:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2" label="Título do chamado" required>
              <input
                value={form.titulo}
                onChange={(event) => updateForm("titulo", event.target.value)}
                placeholder="Ex.: Solicitação de apoio técnico para reunião"
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <Field label="Nome do solicitante" required>
              <input
                value={form.nome}
                onChange={(event) => updateForm("nome", event.target.value)}
                placeholder="Nome completo"
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <Field label="Setor solicitante" required>
              <input
                value={form.setor}
                onChange={(event) => updateForm("setor", event.target.value)}
                placeholder="Ex.: SEINTEC, SEAFIN, Gabinete..."
                className={inputClass}
                maxLength={120}
              />
            </Field>

            <Field className="md:col-span-2" label="Tipo de solicitação" required>
              <select
                value={form.solicitacao}
                onChange={(event) => handleSolicitacaoChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecione uma solicitação</option>
                {solicitacoesURE.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

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

            <Field className="md:col-span-2" label="Descrição da solicitação" required>
              <textarea
                value={form.descricao}
                onChange={(event) => updateForm("descricao", event.target.value)}
                placeholder="Descreva a solicitação com as informações necessárias para análise."
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
      </form>
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