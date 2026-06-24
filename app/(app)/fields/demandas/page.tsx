"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"

const TABELA_DEMANDAS = "demandas_fields"
const TABELA_EVIDENCIAS = "demandas_fields_evidencias"
const BUCKET_EVIDENCIAS = "demandas-fields-evidencias"

const MAX_EVIDENCIAS_POR_DEMANDA = 2
const MAX_BYTES_EVIDENCIA = 1024 * 1024
const ALVO_BYTES_EVIDENCIA = 450 * 1024
const MAX_DIMENSAO_EVIDENCIA = 1280
const MAX_BYTES_ARQUIVO_ORIGINAL = 20 * 1024 * 1024
const URL_ASSINADA_SEGUNDOS = 15 * 60
const TIPOS_IMAGEM_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]

const STATUS = {
  PENDENTE: "Pendente Atendimento",
  CONCLUIDA: "Concluída",
} as const

const TIPOS_DEMANDA = [
  "Equipamentos",
  "Rede/Conectividade",
  "Suporte",
  "URE",
] as const

const URGENCIAS = ["Baixa", "Média", "Alta", "Crítica"] as const

const pesoUrgencia: Record<string, number> = {
  Crítica: 4,
  Alta: 3,
  Média: 2,
  Baixa: 1,
}

type TipoDemanda = (typeof TIPOS_DEMANDA)[number]
type UrgenciaDemanda = (typeof URGENCIAS)[number]
type AbaAtiva = "operacao" | "indicadores"

type Escola = {
  id: string
  nome_escola: string
  cie?: string | null
  tecnico_atribuido?: string | null
}

type DemandaField = {
  id: string
  escola_id: string | null
  escola_nome: string | null
  tipo: string | null
  descricao: string | null
  urgencia: string | null
  data_prevista: string | null
  status: string | null
  created_at: string | null
  concluido_em: string | null
  criado_por: string | null
  retorno_conclusao?: string | null
  concluido_por?: string | null
}

type UsuarioSistema = {
  nome: string | null
  email: string | null
  role?: string | null
  setor?: string | null
}

type EvidenciaField = {
  id: string
  demanda_id: string
  storage_path: string
  nome_arquivo_original: string | null
  mime_type: string
  tamanho_bytes: number
  largura: number | null
  altura: number | null
  ordem: number
  criado_por: string | null
  criado_por_nome: string | null
  created_at: string | null
}

type FotoPreparada = {
  id: string
  nomeOriginal: string
  blob: Blob
  previewUrl: string
  tamanhoBytes: number
  largura: number
  altura: number
  mimeType: string
}

type MensagemTela = {
  tipo: "success" | "error" | "info" | "warning"
  texto: string
} | null

type FiltroRapido =
  | "Todos"
  | "Pendentes"
  | "Críticas"
  | "Atrasadas"
  | "Hoje"
  | "Sem previsão"
  | "Concluídas"

type DemandaModal = DemandaField & {
  tecnicoAtual: string
  cie: string
}

type ConclusaoModal = {
  demanda: DemandaField
  retorno: string
} | null

const getInitials = (name: string) => {
  if (!name || name === "Sem Atribuição" || name === "Sem Técnico") return "ST"

  const clean = name.trim()
  if (!clean) return "ST"

  const parts = clean.split(" ").filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return clean.substring(0, 2).toUpperCase()
}

const normalizarTexto = (value: string | null | undefined) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

const getHojeLocal = () => {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
}

const getDataLocalFromDateString = (value: string | null | undefined) => {
  if (!value) return null

  const onlyDate = value.split("T")[0]
  const [year, month, day] = onlyDate.split("-").map(Number)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

const formatarData = (value: string | null | undefined) => {
  const data = getDataLocalFromDateString(value)
  if (!data) return "Sem data"

  return format(data, "dd/MM/yyyy")
}

const formatarDataCurta = (value: string | null | undefined) => {
  const data = getDataLocalFromDateString(value)
  if (!data) return "Sem data"

  return format(data, "dd/MM/yy")
}

const formatarDataHora = (value: string | null | undefined) => {
  if (!value) return "Sem registro"

  const data = new Date(value)

  if (Number.isNaN(data.getTime())) return "Sem registro"

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const isConcluida = (demanda: DemandaField) => {
  return demanda.status === STATUS.CONCLUIDA
}

const isPendente = (demanda: DemandaField) => {
  return demanda.status === STATUS.PENDENTE
}

const isAtrasada = (demanda: DemandaField) => {
  if (isConcluida(demanda)) return false

  const dataPrevista = getDataLocalFromDateString(demanda.data_prevista)
  if (!dataPrevista) return false

  return dataPrevista.getTime() < getHojeLocal().getTime()
}

const isPrevistaHoje = (demanda: DemandaField) => {
  if (isConcluida(demanda)) return false

  const dataPrevista = getDataLocalFromDateString(demanda.data_prevista)
  if (!dataPrevista) return false

  return dataPrevista.getTime() === getHojeLocal().getTime()
}

const getUrgenciaClass = (urgencia: string | null | undefined) => {
  switch (urgencia) {
    case "Crítica":
      return "border-red-500/30 bg-red-500/10 text-red-300"
    case "Alta":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300"
    case "Média":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
    default:
      return "border-slate-700 bg-slate-800/80 text-slate-300"
  }
}

const getStatusClass = (status: string | null | undefined) => {
  if (status === STATUS.CONCLUIDA) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  }

  return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
}

const getTipoIcone = (tipo: string | null | undefined) => {
  switch (tipo) {
    case "Equipamentos":
      return "💻"
    case "Rede/Conectividade":
      return "🌐"
    case "Suporte":
      return "🛠️"
    case "URE":
      return "🏢"
    default:
      return "📌"
  }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message || fallback

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || fallback)
  }

  return fallback
}

const isMissingCompletionColumnError = (error: unknown) => {
  const message = normalizarTexto(
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : ""
  )

  return (
    message.includes("retorno_conclusao") ||
    message.includes("concluido_por") ||
    message.includes("column") && message.includes("does not exist")
  )
}

const formatarBytes = (bytes: number | null | undefined) => {
  const total = Number(bytes || 0)

  if (!Number.isFinite(total) || total <= 0) return "0 KB"
  if (total < 1024) return `${total} B`
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(total < 100 * 1024 ? 1 : 0)} KB`

  return `${(total / (1024 * 1024)).toFixed(2)} MB`
}

const gerarIdLocal = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const getExtensaoMime = (mimeType: string) => {
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "image/png") return "png"
  return "webp"
}

const carregarImagemNoNavegador = (file: File) => {
  return new Promise<{ imagem: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const imagem = new Image()

    imagem.onload = () => resolve({ imagem, url })
    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Não foi possível abrir a imagem selecionada."))
    }
    imagem.src = url
  })
}

const canvasParaBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  qualidade: number
) => {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, qualidade)
  })
}

async function otimizarFoto(file: File): Promise<FotoPreparada> {
  if (!TIPOS_IMAGEM_PERMITIDOS.includes(file.type)) {
    throw new Error(`O arquivo ${file.name} não é JPEG, PNG ou WebP.`)
  }

  if (file.size > MAX_BYTES_ARQUIVO_ORIGINAL) {
    throw new Error(`A imagem ${file.name} ultrapassa 20 MB antes da otimização.`)
  }

  const { imagem, url } = await carregarImagemNoNavegador(file)
  let melhorBlob: Blob | null = null
  let melhorLargura = 0
  let melhorAltura = 0

  try {
    const larguraOriginal = imagem.naturalWidth || imagem.width
    const alturaOriginal = imagem.naturalHeight || imagem.height

    if (!larguraOriginal || !alturaOriginal) {
      throw new Error(`Não foi possível identificar as dimensões de ${file.name}.`)
    }

    let limiteDimensao = MAX_DIMENSAO_EVIDENCIA
    const qualidades = [0.76, 0.68, 0.6, 0.52, 0.44]

    for (let rodada = 0; rodada < 4; rodada += 1) {
      const escala = Math.min(1, limiteDimensao / Math.max(larguraOriginal, alturaOriginal))
      const largura = Math.max(1, Math.round(larguraOriginal * escala))
      const altura = Math.max(1, Math.round(alturaOriginal * escala))
      const canvas = document.createElement("canvas")

      canvas.width = largura
      canvas.height = altura

      const context = canvas.getContext("2d", { alpha: false })

      if (!context) {
        throw new Error("O navegador não conseguiu preparar a imagem para envio.")
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, largura, altura)
      context.drawImage(imagem, 0, 0, largura, altura)

      for (const qualidade of qualidades) {
        let blob = await canvasParaBlob(canvas, "image/webp", qualidade)

        if (!blob) {
          blob = await canvasParaBlob(canvas, "image/jpeg", qualidade)
        }

        if (!blob) continue

        if (!melhorBlob || blob.size < melhorBlob.size) {
          melhorBlob = blob
          melhorLargura = largura
          melhorAltura = altura
        }

        if (blob.size <= ALVO_BYTES_EVIDENCIA) {
          const previewUrl = URL.createObjectURL(blob)

          return {
            id: gerarIdLocal(),
            nomeOriginal: file.name,
            blob,
            previewUrl,
            tamanhoBytes: blob.size,
            largura,
            altura,
            mimeType: blob.type || "image/webp",
          }
        }
      }

      limiteDimensao = Math.max(720, Math.round(limiteDimensao * 0.82))
    }

    if (!melhorBlob || melhorBlob.size > MAX_BYTES_EVIDENCIA) {
      throw new Error(
        `Não foi possível reduzir ${file.name} para menos de 1 MB. Tente outra foto.`
      )
    }

    const previewUrl = URL.createObjectURL(melhorBlob)

    return {
      id: gerarIdLocal(),
      nomeOriginal: file.name,
      blob: melhorBlob,
      previewUrl,
      tamanhoBytes: melhorBlob.size,
      largura: melhorLargura,
      altura: melhorAltura,
      mimeType: melhorBlob.type || "image/webp",
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function GestaoDemandasFields() {
  const supabase = useMemo(() => createClient(), [])
  const inputFotosRef = useRef<HTMLInputElement>(null)
  const fotosConclusaoRef = useRef<FotoPreparada[]>([])

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [reabrindo, setReabrindo] = useState(false)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("operacao")
  const [filtrosAvancadosAbertos, setFiltrosAvancadosAbertos] = useState(false)
  const [formularioAberto, setFormularioAberto] = useState(true)

  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioSistema | null>(null)

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [demandas, setDemandas] = useState<DemandaField[]>([])

  const [busca, setBusca] = useState("")
  const [filtroEscola, setFiltroEscola] = useState("Todos")
  const [filtroTecnico, setFiltroTecnico] = useState("Todos")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>("Todos")

  const [escolaSelecionada, setEscolaSelecionada] = useState("")
  const [tipo, setTipo] = useState("")
  const [urgencia, setUrgencia] = useState<UrgenciaDemanda>("Baixa")
  const [dataPrevista, setDataPrevista] = useState("")
  const [descricao, setDescricao] = useState("")
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [demandaModal, setDemandaModal] = useState<DemandaModal | null>(null)
  const [conclusaoModal, setConclusaoModal] = useState<ConclusaoModal>(null)

  const [evidencias, setEvidencias] = useState<EvidenciaField[]>([])
  const [urlsEvidencias, setUrlsEvidencias] = useState<Record<string, string>>({})
  const [carregandoGaleria, setCarregandoGaleria] = useState(false)
  const [excluindoEvidenciaId, setExcluindoEvidenciaId] = useState<string | null>(null)
  const [fotosConclusao, setFotosConclusao] = useState<FotoPreparada[]>([])
  const [processandoImagens, setProcessandoImagens] = useState(false)
  const [progressoConclusao, setProgressoConclusao] = useState<string | null>(null)

  const escolasPorId = useMemo(() => {
    return new Map(escolas.map((escola) => [String(escola.id), escola]))
  }, [escolas])

  const evidenciasPorDemanda = useMemo(() => {
    const mapa = new Map<string, EvidenciaField[]>()

    evidencias.forEach((evidencia) => {
      const lista = mapa.get(evidencia.demanda_id) || []
      lista.push(evidencia)
      mapa.set(evidencia.demanda_id, lista)
    })

    mapa.forEach((lista) => {
      lista.sort((a, b) => a.ordem - b.ordem || new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
    })

    return mapa
  }, [evidencias])

  const roleNormalizada = normalizarTexto(usuarioLogado?.role)
  const podeExcluirEvidencias = roleNormalizada === "admin" || roleNormalizada === "seintec"

  const evidenciasDemandaModal = useMemo(() => {
    if (!demandaModal) return []
    return evidenciasPorDemanda.get(demandaModal.id) || []
  }, [demandaModal, evidenciasPorDemanda])

  const evidenciasConclusaoExistentes = useMemo(() => {
    if (!conclusaoModal) return []
    return evidenciasPorDemanda.get(conclusaoModal.demanda.id) || []
  }, [conclusaoModal, evidenciasPorDemanda])

  const vagasFotosConclusao = Math.max(
    MAX_EVIDENCIAS_POR_DEMANDA - evidenciasConclusaoExistentes.length - fotosConclusao.length,
    0
  )

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email) {
        const { data: userData } = await supabase
          .from("usuarios")
          .select("nome, email, role, setor")
          .eq("email", user.email)
          .limit(1)
          .maybeSingle()

        const perfil = userData as UsuarioSistema | null

        setUsuarioLogado({
          nome: perfil?.nome || user.email,
          email: user.email,
          role: perfil?.role || null,
          setor: perfil?.setor || null,
        })
      } else {
        setUsuarioLogado(null)
      }

      const [
        { data: dataEscolas, error: errorEscolas },
        { data: dataDemandas, error: errorDemandas },
        { data: dataEvidencias, error: errorEvidencias },
      ] = await Promise.all([
        supabase
          .from("escolas")
          .select("id, nome_escola, cie, tecnico_atribuido")
          .order("nome_escola", { ascending: true }),
        supabase
          .from(TABELA_DEMANDAS)
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from(TABELA_EVIDENCIAS)
          .select("*")
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true }),
      ])

      if (errorEscolas) throw errorEscolas
      if (errorDemandas) throw errorDemandas

      if (errorEvidencias) {
        console.warn("Não foi possível carregar as evidências Field:", errorEvidencias)
        setEvidencias([])
      } else {
        setEvidencias((dataEvidencias || []) as EvidenciaField[])
      }

      setEscolas((dataEscolas || []) as Escola[])
      setDemandas((dataDemandas || []) as DemandaField[])
    } catch (error: unknown) {
      console.error("Erro ao carregar demandas Field:", error)
      setMensagem({
        tipo: "error",
        texto: getErrorMessage(
          error,
          "Não foi possível carregar os dados da página de demandas Field."
        ),
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useEffect(() => {
    fotosConclusaoRef.current = fotosConclusao
  }, [fotosConclusao])

  useEffect(() => {
    return () => {
      fotosConclusaoRef.current.forEach((foto) => URL.revokeObjectURL(foto.previewUrl))
    }
  }, [])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 5500)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  useEffect(() => {
    if (!demandaModal && !conclusaoModal) return

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return

      if (conclusaoModal && !concluindo && !processandoImagens) {
        fotosConclusao.forEach((foto) => URL.revokeObjectURL(foto.previewUrl))
        setFotosConclusao([])
        setProgressoConclusao(null)
        setConclusaoModal(null)
        return
      }

      if (demandaModal) {
        setDemandaModal(null)
      }
    }

    window.addEventListener("keydown", handleEsc)

    return () => window.removeEventListener("keydown", handleEsc)
  }, [concluindo, conclusaoModal, demandaModal, fotosConclusao, processandoImagens])

  const infoEscola = useMemo(() => {
    if (!escolaSelecionada) return null

    return (
      escolas.find(
        (escola) =>
          normalizarTexto(escola.nome_escola) === normalizarTexto(escolaSelecionada)
      ) || null
    )
  }, [escolaSelecionada, escolas])

  const escolaDigitadaInvalida = useMemo(() => {
    if (!escolaSelecionada.trim()) return false
    return !infoEscola
  }, [escolaSelecionada, infoEscola])

  const stats = useMemo(() => {
    const total = demandas.length
    const pendentes = demandas.filter((demanda) => isPendente(demanda)).length
    const concluidas = demandas.filter((demanda) => isConcluida(demanda)).length
    const criticas = demandas.filter(
      (demanda) => demanda.urgencia === "Crítica" && !isConcluida(demanda)
    ).length
    const atrasadas = demandas.filter((demanda) => isAtrasada(demanda)).length
    const hoje = demandas.filter((demanda) => isPrevistaHoje(demanda)).length
    const semPrevisao = demandas.filter(
      (demanda) => !isConcluida(demanda) && !demanda.data_prevista
    ).length
    const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0

    return {
      total,
      pendentes,
      concluidas,
      criticas,
      atrasadas,
      hoje,
      semPrevisao,
      taxaConclusao,
    }
  }, [demandas])

  const listaTecnicosFiltro = useMemo(() => {
    const nomes = new Set<string>()

    escolas.forEach((escola) => {
      if (escola.tecnico_atribuido?.trim()) {
        nomes.add(escola.tecnico_atribuido.trim())
      }
    })

    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [escolas])

  const filtrosAtivos = useMemo(() => {
    let total = 0

    if (busca.trim()) total += 1
    if (filtroEscola !== "Todos") total += 1
    if (filtroTecnico !== "Todos") total += 1
    if (filtroStatus !== "Todos") total += 1
    if (filtroTipo !== "Todos") total += 1
    if (filtroRapido !== "Todos") total += 1

    return total
  }, [busca, filtroEscola, filtroRapido, filtroStatus, filtroTecnico, filtroTipo])

  const demandasFiltradas = useMemo(() => {
    const termoBusca = normalizarTexto(busca)

    const filtradas = demandas.filter((demanda) => {
      const escolaRelacionada = escolasPorId.get(String(demanda.escola_id))
      const tecnico = escolaRelacionada?.tecnico_atribuido || "Sem Atribuição"

      const textoBuscaDemanda = normalizarTexto(
        `${demanda.escola_nome || ""} ${demanda.descricao || ""} ${
          demanda.tipo || ""
        } ${demanda.urgencia || ""} ${demanda.criado_por || ""} ${
          demanda.concluido_por || ""
        } ${demanda.retorno_conclusao || ""} ${tecnico}`
      )

      const matchBusca = termoBusca ? textoBuscaDemanda.includes(termoBusca) : true
      const matchEscola =
        filtroEscola === "Todos"
          ? true
          : String(demanda.escola_id) === String(filtroEscola)
      const matchTecnico = filtroTecnico === "Todos" ? true : tecnico === filtroTecnico
      const matchStatus =
        filtroStatus === "Todos" ? true : demanda.status === filtroStatus
      const matchTipo = filtroTipo === "Todos" ? true : demanda.tipo === filtroTipo

      const matchRapido =
        filtroRapido === "Todos"
          ? true
          : filtroRapido === "Pendentes"
            ? isPendente(demanda)
            : filtroRapido === "Críticas"
              ? demanda.urgencia === "Crítica" && !isConcluida(demanda)
              : filtroRapido === "Atrasadas"
                ? isAtrasada(demanda)
                : filtroRapido === "Hoje"
                  ? isPrevistaHoje(demanda)
                  : filtroRapido === "Sem previsão"
                    ? !isConcluida(demanda) && !demanda.data_prevista
                    : filtroRapido === "Concluídas"
                      ? isConcluida(demanda)
                      : true

      return (
        matchBusca &&
        matchEscola &&
        matchTecnico &&
        matchStatus &&
        matchTipo &&
        matchRapido
      )
    })

    return filtradas.sort((a, b) => {
      if (isAtrasada(a) !== isAtrasada(b)) {
        return isAtrasada(a) ? -1 : 1
      }

      if (a.status !== b.status) {
        return isConcluida(a) ? 1 : -1
      }

      if (!isConcluida(a) && !isConcluida(b)) {
        const pesoA = pesoUrgencia[a.urgencia || ""] || 0
        const pesoB = pesoUrgencia[b.urgencia || ""] || 0

        if (pesoA !== pesoB) {
          return pesoB - pesoA
        }

        const dataA = getDataLocalFromDateString(a.data_prevista)
        const dataB = getDataLocalFromDateString(b.data_prevista)

        if (dataA && dataB && dataA.getTime() !== dataB.getTime()) {
          return dataA.getTime() - dataB.getTime()
        }

        if (dataA && !dataB) return -1
        if (!dataA && dataB) return 1
      }

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      )
    })
  }, [
    demandas,
    busca,
    filtroEscola,
    filtroTecnico,
    filtroStatus,
    filtroTipo,
    filtroRapido,
    escolasPorId,
  ])

  const chartCategoria = useMemo(() => {
    return TIPOS_DEMANDA.map((tipoDemanda) => ({
      name: tipoDemanda,
      qtd: demandas.filter((demanda) => demanda.tipo === tipoDemanda).length,
    }))
  }, [demandas])

  const chartUrgencia = useMemo(() => {
    return URGENCIAS.map((nivel) => ({
      name: nivel,
      qtd: demandas.filter(
        (demanda) => demanda.urgencia === nivel && !isConcluida(demanda)
      ).length,
    }))
  }, [demandas])

  const chartTecnico = useMemo(() => {
    const counts: Record<string, number> = {}

    demandas
      .filter((demanda) => !isConcluida(demanda))
      .forEach((demanda) => {
        const escola = escolasPorId.get(String(demanda.escola_id))
        const tecnico = escola?.tecnico_atribuido || "S/ Atribuição"
        counts[tecnico] = (counts[tecnico] || 0) + 1
      })

    return Object.entries(counts)
      .map(([name, qtd]) => ({ name, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10)
  }, [demandas, escolasPorId])

  const chartEscola = useMemo(() => {
    const counts: Record<string, number> = {}

    demandas.forEach((demanda) => {
      const nomeSafe = demanda.escola_nome || "Escola Desconhecida"
      counts[nomeSafe] = (counts[nomeSafe] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, qtd]) => ({ name, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10)
  }, [demandas])

  const limparFiltros = () => {
    setBusca("")
    setFiltroEscola("Todos")
    setFiltroTecnico("Todos")
    setFiltroStatus("Todos")
    setFiltroTipo("Todos")
    setFiltroRapido("Todos")
  }

  const aplicarFiltroRapido = (filtro: FiltroRapido) => {
    setFiltroRapido(filtro)
    setAbaAtiva("operacao")
  }

  const validarFormulario = () => {
    if (!usuarioLogado?.email) {
      setMensagem({
        tipo: "error",
        texto:
          "Sessão do usuário não identificada. Atualize a página ou faça login novamente.",
      })
      return false
    }

    if (!infoEscola) {
      setMensagem({
        tipo: "error",
        texto: "Selecione uma unidade escolar válida da lista.",
      })
      return false
    }

    if (!TIPOS_DEMANDA.includes(tipo as TipoDemanda)) {
      setMensagem({
        tipo: "error",
        texto: "Selecione um tipo de demanda válido.",
      })
      return false
    }

    if (!URGENCIAS.includes(urgencia)) {
      setMensagem({
        tipo: "error",
        texto: "Selecione uma urgência válida.",
      })
      return false
    }

    const descricaoLimpa = descricao.trim()

    if (descricaoLimpa.length < 10) {
      setMensagem({
        tipo: "error",
        texto: "Descreva melhor a demanda. Use pelo menos 10 caracteres.",
      })
      return false
    }

    return true
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()

    if (salvando) return
    if (!validarFormulario()) return

    setSalvando(true)

    try {
      const payload = {
        escola_id: String(infoEscola!.id),
        escola_nome: infoEscola!.nome_escola,
        tipo: tipo.trim(),
        descricao: descricao.trim(),
        urgencia,
        data_prevista: dataPrevista || null,
      }

      if (editandoId) {
        const { error } = await supabase
          .from(TABELA_DEMANDAS)
          .update(payload)
          .eq("id", editandoId)

        if (error) throw error

        setMensagem({
          tipo: "success",
          texto: "Demanda atualizada com sucesso.",
        })
      } else {
        const { error } = await supabase.from(TABELA_DEMANDAS).insert([
          {
            ...payload,
            status: STATUS.PENDENTE,
            criado_por: usuarioLogado?.nome || usuarioLogado?.email || "Usuário",
          },
        ])

        if (error) throw error

        setMensagem({
          tipo: "success",
          texto: "Demanda registrada com sucesso.",
        })
      }

      handleLimparFormulario()
      await carregarDados()
    } catch (error: unknown) {
      console.error("Erro ao salvar demanda Field:", error)
      setMensagem({
        tipo: "error",
        texto: getErrorMessage(error, "Não foi possível salvar a demanda."),
      })
    } finally {
      setSalvando(false)
    }
  }

  function handleEditarClick(demanda: DemandaField) {
    setEditandoId(demanda.id)
    setEscolaSelecionada(demanda.escola_nome || "")
    setTipo(demanda.tipo || "")
    setUrgencia((demanda.urgencia as UrgenciaDemanda) || "Baixa")
    setDataPrevista(demanda.data_prevista || "")
    setDescricao(demanda.descricao || "")
    setFormularioAberto(true)
    setAbaAtiva("operacao")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function handleLimparFormulario() {
    setEditandoId(null)
    setEscolaSelecionada("")
    setTipo("")
    setUrgencia("Baixa")
    setDataPrevista("")
    setDescricao("")
  }

  function limparFotosConclusao() {
    fotosConclusao.forEach((foto) => URL.revokeObjectURL(foto.previewUrl))
    setFotosConclusao([])

    if (inputFotosRef.current) {
      inputFotosRef.current.value = ""
    }
  }

  function fecharConclusao(forcar = false) {
    if (!forcar && (concluindo || processandoImagens)) return

    limparFotosConclusao()
    setProgressoConclusao(null)
    setConclusaoModal(null)
  }

  function removerFotoPreparada(id: string) {
    setFotosConclusao((current) => {
      const foto = current.find((item) => item.id === id)
      if (foto) URL.revokeObjectURL(foto.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  async function handleSelecionarFotos(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(event.target.files || [])
    event.target.value = ""

    if (!conclusaoModal || arquivos.length === 0) return

    const jaExistentes = evidenciasPorDemanda.get(conclusaoModal.demanda.id)?.length || 0
    const vagas = Math.max(
      MAX_EVIDENCIAS_POR_DEMANDA - jaExistentes - fotosConclusao.length,
      0
    )

    if (vagas <= 0) {
      setMensagem({
        tipo: "warning",
        texto: "Esta demanda já atingiu o limite de duas evidências fotográficas.",
      })
      return
    }

    const selecionados = arquivos.slice(0, vagas)

    if (arquivos.length > vagas) {
      setMensagem({
        tipo: "warning",
        texto: `Foram consideradas somente ${vagas} foto(s), respeitando o limite total de duas evidências.`,
      })
    }

    setProcessandoImagens(true)

    try {
      const preparadas: FotoPreparada[] = []

      for (let index = 0; index < selecionados.length; index += 1) {
        setProgressoConclusao(`Otimizando foto ${index + 1} de ${selecionados.length}...`)
        preparadas.push(await otimizarFoto(selecionados[index]))
      }

      setFotosConclusao((current) => [...current, ...preparadas])
      setMensagem({
        tipo: "success",
        texto: `${preparadas.length} foto(s) otimizada(s) e pronta(s) para envio.`,
      })
    } catch (error: unknown) {
      setMensagem({
        tipo: "error",
        texto: getErrorMessage(error, "Não foi possível preparar as fotografias."),
      })
    } finally {
      setProcessandoImagens(false)
      setProgressoConclusao(null)
    }
  }

  function abrirConclusao(demanda: DemandaField) {
    limparFotosConclusao()
    setProgressoConclusao(null)
    setDemandaModal(null)
    setConclusaoModal({
      demanda,
      retorno: demanda.retorno_conclusao || "",
    })
  }

  async function handleConcluir() {
    if (!conclusaoModal || concluindo || processandoImagens) return

    const demanda = conclusaoModal.demanda
    const retornoLimpo = conclusaoModal.retorno.trim()
    const usuarioConclusor =
      usuarioLogado?.nome || usuarioLogado?.email || "Usuário não identificado"
    const evidenciasExistentes = evidenciasPorDemanda.get(demanda.id)?.length || 0

    if (evidenciasExistentes + fotosConclusao.length > MAX_EVIDENCIAS_POR_DEMANDA) {
      setMensagem({
        tipo: "error",
        texto: "O limite total é de duas evidências fotográficas por demanda.",
      })
      return
    }

    const caminhosEnviados: string[] = []
    const registrosInseridos: string[] = []
    let conclusaoEfetivada = false

    setConcluindo(true)

    try {
      for (let index = 0; index < fotosConclusao.length; index += 1) {
        const foto = fotosConclusao[index]
        const extensao = getExtensaoMime(foto.mimeType)
        const caminho = `${demanda.id}/${Date.now()}-${index + 1}-${gerarIdLocal()}.${extensao}`

        setProgressoConclusao(`Enviando evidência ${index + 1} de ${fotosConclusao.length}...`)

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_EVIDENCIAS)
          .upload(caminho, foto.blob, {
            cacheControl: "3600",
            contentType: foto.mimeType,
            upsert: false,
          })

        if (uploadError) throw uploadError
        caminhosEnviados.push(caminho)

        const { data: registro, error: registroError } = await supabase
          .from(TABELA_EVIDENCIAS)
          .insert({
            demanda_id: demanda.id,
            storage_path: caminho,
            nome_arquivo_original: foto.nomeOriginal,
            mime_type: foto.mimeType,
            tamanho_bytes: foto.tamanhoBytes,
            largura: foto.largura,
            altura: foto.altura,
            ordem: evidenciasExistentes + index,
            criado_por_nome: usuarioConclusor,
          })
          .select("id")
          .single()

        if (registroError) throw registroError
        registrosInseridos.push(String(registro.id))
      }

      setProgressoConclusao("Registrando a conclusão da demanda...")

      const payloadCompleto = {
        status: STATUS.CONCLUIDA,
        concluido_em: new Date().toISOString(),
        retorno_conclusao: retornoLimpo || null,
        concluido_por: usuarioConclusor,
      }

      const respostaCompleta = await supabase
        .from(TABELA_DEMANDAS)
        .update(payloadCompleto)
        .eq("id", demanda.id)

      let conclusaoLegada = false

      if (respostaCompleta.error) {
        if (!isMissingCompletionColumnError(respostaCompleta.error)) {
          throw respostaCompleta.error
        }

        const respostaLegada = await supabase
          .from(TABELA_DEMANDAS)
          .update({
            status: STATUS.CONCLUIDA,
            concluido_em: new Date().toISOString(),
          })
          .eq("id", demanda.id)

        if (respostaLegada.error) throw respostaLegada.error
        conclusaoLegada = true
      }

      conclusaoEfetivada = true

      if (conclusaoLegada) {
        setMensagem({
          tipo: "warning",
          texto:
            "Demanda concluída. As evidências foram salvas, mas o retorno e o usuário responsável dependem das colunas de conclusão.",
        })
      } else {
        const quantidadeFotos = fotosConclusao.length
        setMensagem({
          tipo: "success",
          texto: quantidadeFotos > 0
            ? `Demanda concluída com ${quantidadeFotos} evidência(s) fotográfica(s).`
            : retornoLimpo
              ? "Demanda concluída com retorno registrado."
              : "Demanda concluída com sucesso.",
        })
      }

      fecharConclusao(true)
      await carregarDados()
    } catch (error: unknown) {
      console.error("Erro ao concluir demanda Field:", error)

      if (!conclusaoEfetivada) {
        if (caminhosEnviados.length > 0) {
          await supabase.storage
            .from(BUCKET_EVIDENCIAS)
            .remove(caminhosEnviados)
        }

        if (registrosInseridos.length > 0) {
          await supabase
            .from(TABELA_EVIDENCIAS)
            .delete()
            .in("id", registrosInseridos)
        }
      }

      setMensagem({
        tipo: "error",
        texto: getErrorMessage(
          error,
          "Não foi possível concluir a demanda. Nenhuma fotografia nova foi mantida."
        ),
      })
    } finally {
      setConcluindo(false)
      setProgressoConclusao(null)
    }
  }

  async function handleReabrir(id: string) {
    if (!window.confirm("Deseja reabrir esta demanda para atendimento?")) return

    setReabrindo(true)

    try {
      const respostaCompleta = await supabase
        .from(TABELA_DEMANDAS)
        .update({
          status: STATUS.PENDENTE,
          concluido_em: null,
          retorno_conclusao: null,
          concluido_por: null,
        })
        .eq("id", id)

      if (respostaCompleta.error) {
        if (!isMissingCompletionColumnError(respostaCompleta.error)) {
          throw respostaCompleta.error
        }

        const respostaLegada = await supabase
          .from(TABELA_DEMANDAS)
          .update({
            status: STATUS.PENDENTE,
            concluido_em: null,
          })
          .eq("id", id)

        if (respostaLegada.error) throw respostaLegada.error
      }

      setMensagem({
        tipo: "success",
        texto: "Demanda reaberta com sucesso. As evidências fotográficas foram preservadas no histórico.",
      })

      setDemandaModal(null)
      await carregarDados()
    } catch (error: unknown) {
      console.error("Erro ao reabrir demanda Field:", error)
      setMensagem({
        tipo: "error",
        texto: getErrorMessage(error, "Não foi possível reabrir a demanda."),
      })
    } finally {
      setReabrindo(false)
    }
  }

  async function carregarUrlsDaDemanda(demandaId: string) {
    const lista = evidenciasPorDemanda.get(demandaId) || []

    setUrlsEvidencias({})

    if (lista.length === 0) {
      setCarregandoGaleria(false)
      return
    }

    setCarregandoGaleria(true)

    try {
      const pares = await Promise.all(
        lista.map(async (evidencia) => {
          const { data, error } = await supabase.storage
            .from(BUCKET_EVIDENCIAS)
            .createSignedUrl(evidencia.storage_path, URL_ASSINADA_SEGUNDOS)

          if (error) {
            console.warn("Erro ao gerar URL assinada:", error)
            return [evidencia.id, ""] as const
          }

          return [evidencia.id, data?.signedUrl || ""] as const
        })
      )

      setUrlsEvidencias(Object.fromEntries(pares))
    } finally {
      setCarregandoGaleria(false)
    }
  }

  async function handleExcluirEvidencia(evidencia: EvidenciaField) {
    if (!podeExcluirEvidencias) {
      setMensagem({
        tipo: "error",
        texto: "Somente usuários com perfil SEINTEC ou Admin podem excluir evidências.",
      })
      return
    }

    const confirmou = window.confirm(
      "Deseja excluir permanentemente esta fotografia? O espaço será liberado no Storage e a ação não poderá ser desfeita."
    )

    if (!confirmou) return

    setExcluindoEvidenciaId(evidencia.id)

    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_EVIDENCIAS)
        .remove([evidencia.storage_path])

      if (storageError) throw storageError

      const { error: metadataError } = await supabase
        .from(TABELA_EVIDENCIAS)
        .delete()
        .eq("id", evidencia.id)

      if (metadataError) throw metadataError

      setEvidencias((current) => current.filter((item) => item.id !== evidencia.id))
      setUrlsEvidencias((current) => {
        const next = { ...current }
        delete next[evidencia.id]
        return next
      })

      setMensagem({
        tipo: "success",
        texto: "Evidência excluída permanentemente e espaço liberado no Storage.",
      })
    } catch (error: unknown) {
      console.error("Erro ao excluir evidência Field:", error)
      setMensagem({
        tipo: "error",
        texto: getErrorMessage(error, "Não foi possível excluir a evidência."),
      })
    } finally {
      setExcluindoEvidenciaId(null)
    }
  }

  const abrirModalDemanda = async (demanda: DemandaField) => {
    const escolaInfo = escolasPorId.get(String(demanda.escola_id))

    setDemandaModal({
      ...demanda,
      tecnicoAtual: escolaInfo?.tecnico_atribuido || "S/ Atribuição",
      cie: escolaInfo?.cie || "S/N",
    })

    await carregarUrlsDaDemanda(demanda.id)
  }

  if (loading) {
    return (
      <div className="flex min-h-[620px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-slate-800 bg-[#020617] px-10 py-8 shadow-2xl shadow-slate-950/30">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Carregando demandas Field
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1750px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-[#020617] p-5 shadow-2xl shadow-cyan-950/10 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.10),transparent_34%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Módulo Field
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Gestão operacional
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Demandas <span className="text-cyan-300">Field</span>
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Cadastro, priorização, acompanhamento e conclusão das demandas técnicas das Unidades Escolares.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10 text-xs font-black text-cyan-300">
                {getInitials(usuarioLogado?.nome || usuarioLogado?.email || "Usuário")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {usuarioLogado?.nome || "Sessão não identificada"}
                </p>
                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {usuarioLogado?.role || "Perfil não informado"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={carregarDados}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
            >
              ↻ Atualizar
            </button>
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold shadow-lg ${
            mensagem.tipo === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : mensagem.tipo === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : mensagem.tipo === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActionKpi
          icon="⏳"
          label="Pendentes"
          value={stats.pendentes}
          description="Aguardando atendimento"
          tone="yellow"
          active={filtroRapido === "Pendentes"}
          onClick={() => aplicarFiltroRapido("Pendentes")}
        />
        <ActionKpi
          icon="🚨"
          label="Críticas"
          value={stats.criticas}
          description="Prioridade máxima"
          tone="red"
          active={filtroRapido === "Críticas"}
          onClick={() => aplicarFiltroRapido("Críticas")}
        />
        <ActionKpi
          icon="⌛"
          label="Atrasadas"
          value={stats.atrasadas}
          description="Previsão vencida"
          tone="orange"
          active={filtroRapido === "Atrasadas"}
          onClick={() => aplicarFiltroRapido("Atrasadas")}
        />
        <ActionKpi
          icon="✅"
          label="Concluídas"
          value={stats.concluidas}
          description={`${stats.taxaConclusao}% do histórico`}
          tone="emerald"
          active={filtroRapido === "Concluídas"}
          onClick={() => aplicarFiltroRapido("Concluídas")}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-800 bg-[#020617] p-4 shadow-xl shadow-slate-950/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-4 divide-x divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
          <CompactStat label="Total" value={stats.total} />
          <CompactStat label="Hoje" value={stats.hoje} />
          <CompactStat label="Sem previsão" value={stats.semPrevisao} />
          <CompactStat label="Conclusão" value={`${stats.taxaConclusao}%`} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-2xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setAbaAtiva("operacao")}
              className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition ${
                abaAtiva === "operacao"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/30"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              Operação
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("indicadores")}
              className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition ${
                abaAtiva === "indicadores"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-500 hover:text-slate-200"
              }`}
            >
              Indicadores
            </button>
          </div>

          {abaAtiva === "operacao" && (
            <button
              type="button"
              onClick={() => setFormularioAberto((current) => !current)}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 xl:hidden"
            >
              {formularioAberto ? "Ocultar formulário" : "Nova demanda"}
            </button>
          )}
        </div>
      </section>

      {abaAtiva === "operacao" ? (
        <section
          className={`grid grid-cols-1 items-start gap-6 ${
            formularioAberto ? "xl:grid-cols-[420px_minmax(0,1fr)]" : ""
          }`}
        >
          {formularioAberto && (
            <Panel className="xl:sticky xl:top-5">
              <PanelHeader
                eyebrow={editandoId ? "Modo edição" : "Nova solicitação"}
                title={editandoId ? "Editar demanda" : "Registrar demanda"}
                description={
                  editandoId
                    ? "Atualize os dados necessários e salve as alterações."
                    : "Preencha somente as informações essenciais para criar a demanda."
                }
                icon={editandoId ? "✏️" : "➕"}
              />

              {editandoId && (
                <div className="mb-5 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                    Edição ativa
                  </p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-blue-100/70">
                    Você está atualizando uma demanda já existente.
                  </p>
                </div>
              )}

              <form onSubmit={handleSalvar} className="space-y-5">
                <Field label="Unidade Escolar" required>
                  <input
                    required
                    list="escolas-list"
                    placeholder="Digite para localizar a escola..."
                    value={escolaSelecionada}
                    onChange={(e) => setEscolaSelecionada(e.target.value)}
                    className={`input-base ${
                      escolaDigitadaInvalida
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                    }`}
                  />

                  <datalist id="escolas-list">
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.nome_escola} />
                    ))}
                  </datalist>

                  {escolaDigitadaInvalida && (
                    <p className="mt-2 text-xs font-bold text-red-400">
                      Escola não encontrada. Selecione uma unidade da lista.
                    </p>
                  )}
                </Field>

                {infoEscola && (
                  <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-500/25 bg-blue-500/15 text-xs font-black text-blue-200">
                        {getInitials(infoEscola.tecnico_atribuido || "Sem Técnico")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300/70">
                          Técnico responsável
                        </p>
                        <p className="truncate text-sm font-black text-blue-200">
                          {infoEscola.tecnico_atribuido || "Nenhum técnico atribuído"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          CIE: {infoEscola.cie || "Não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Tipo" required>
                    <select
                      required
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                    >
                      <option value="">Selecione...</option>
                      <option value="Equipamentos">💻 Equipamentos</option>
                      <option value="Rede/Conectividade">🌐 Rede/Conectividade</option>
                      <option value="Suporte">🛠️ Suporte Geral</option>
                      <option value="URE">🏢 URE</option>
                    </select>
                  </Field>

                  <Field label="Urgência">
                    <select
                      value={urgencia}
                      onChange={(e) => setUrgencia(e.target.value as UrgenciaDemanda)}
                      className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">🚨 Crítica</option>
                    </select>
                  </Field>
                </div>

                <Field label="Data prevista de visita">
                  <input
                    type="date"
                    value={dataPrevista}
                    onChange={(e) => setDataPrevista(e.target.value)}
                    className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                    style={{ colorScheme: "dark" }}
                  />
                </Field>

                <Field label="Descrição do problema" required>
                  <textarea
                    required
                    rows={6}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva objetivamente o atendimento necessário..."
                    className="input-base custom-scrollbar resize-none border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                  />
                  <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span
                      className={
                        descricao.trim().length >= 10
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }
                    >
                      Mínimo: 10 caracteres
                    </span>
                    <span className="text-slate-600">
                      {descricao.trim().length}
                    </span>
                  </div>
                </Field>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  <button
                    type="submit"
                    disabled={salvando}
                    className={`min-h-[52px] flex-1 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      editandoId
                        ? "bg-blue-600 shadow-blue-950/30 hover:bg-blue-500"
                        : "bg-cyan-600 shadow-cyan-950/30 hover:bg-cyan-500"
                    }`}
                  >
                    {salvando
                      ? "Processando..."
                      : editandoId
                        ? "Salvar alterações"
                        : "Registrar demanda"}
                  </button>

                  {editandoId && (
                    <button
                      type="button"
                      onClick={handleLimparFormulario}
                      className="min-h-[52px] rounded-2xl border border-slate-700 bg-slate-900 px-6 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </Panel>
          )}

          <Panel>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <PanelHeader
                eyebrow="Fila operacional"
                title="Demandas cadastradas"
                description={`${demandasFiltradas.length} demanda(s) exibida(s) em ordem de prioridade.`}
                icon="📋"
                compact
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                {!formularioAberto && (
                  <button
                    type="button"
                    onClick={() => setFormularioAberto(true)}
                    className="rounded-2xl bg-cyan-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-cyan-500"
                  >
                    + Nova demanda
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFiltrosAvancadosAbertos((current) => !current)}
                  className="relative rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
                >
                  {filtrosAvancadosAbertos ? "Ocultar filtros" : "Mais filtros"}
                  {filtrosAtivos > 0 && (
                    <span className="ml-2 rounded-full bg-cyan-500 px-2 py-0.5 text-[9px] text-slate-950">
                      {filtrosAtivos}
                    </span>
                  )}
                </button>

                {filtrosAtivos > 0 && (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/20"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <input
                type="text"
                placeholder="Buscar escola, descrição, técnico, responsável ou retorno..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
              />

              <div className="custom-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {[
                  "Todos",
                  "Pendentes",
                  "Críticas",
                  "Atrasadas",
                  "Hoje",
                  "Sem previsão",
                  "Concluídas",
                ].map((filtro) => (
                  <button
                    key={filtro}
                    type="button"
                    onClick={() => setFiltroRapido(filtro as FiltroRapido)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                      filtroRapido === filtro
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#020617] text-slate-500 hover:border-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {filtro}
                  </button>
                ))}
              </div>

              {filtrosAvancadosAbertos && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                  >
                    <option value="Todos">Todos os status</option>
                    <option value={STATUS.PENDENTE}>Pendentes</option>
                    <option value={STATUS.CONCLUIDA}>Concluídas</option>
                  </select>

                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                  >
                    <option value="Todos">Todos os tipos</option>
                    {TIPOS_DEMANDA.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroTecnico}
                    onChange={(e) => setFiltroTecnico(e.target.value)}
                    className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                  >
                    <option value="Todos">Todos os técnicos</option>
                    {listaTecnicosFiltro.map((tecnico) => (
                      <option key={tecnico} value={tecnico}>
                        {tecnico}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEscola}
                    onChange={(e) => setFiltroEscola(e.target.value)}
                    className="input-base border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30"
                  >
                    <option value="Todos">Todas as escolas</option>
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome_escola}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {demandasFiltradas.length === 0 ? (
                <EmptyState
                  title="Nenhuma demanda encontrada"
                  description="Revise os filtros ou registre uma nova demanda."
                  icon="📭"
                />
              ) : (
                demandasFiltradas.map((demanda) => {
                  const escolaAtual = escolasPorId.get(String(demanda.escola_id))
                  const tecnicoAtual =
                    escolaAtual?.tecnico_atribuido || "Sem Atribuição"
                  const concluida = isConcluida(demanda)
                  const atrasada = isAtrasada(demanda)
                  const previstaHoje = isPrevistaHoje(demanda)
                  const sendoEditada = editandoId === demanda.id
                  const quantidadeEvidencias = evidenciasPorDemanda.get(demanda.id)?.length || 0

                  return (
                    <article
                      key={demanda.id}
                      className={`group relative overflow-hidden rounded-2xl border p-4 transition md:p-5 ${
                        sendoEditada
                          ? "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-950/20"
                          : concluida
                            ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                            : atrasada
                              ? "border-orange-500/30 bg-orange-500/[0.06] shadow-lg shadow-orange-950/10"
                              : "border-slate-800 bg-slate-950/55 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 w-1 ${
                          concluida
                            ? "bg-emerald-500"
                            : atrasada
                              ? "bg-orange-500"
                              : demanda.urgencia === "Crítica"
                                ? "bg-red-500"
                                : "bg-cyan-500/60"
                        }`}
                      />

                      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_220px_130px] xl:items-center">
                        <div className="min-w-0 pl-2">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <StatusBadge className={getStatusClass(demanda.status)}>
                              {demanda.status || "Sem status"}
                            </StatusBadge>
                            <StatusBadge className={getUrgenciaClass(demanda.urgencia)}>
                              {demanda.urgencia || "Sem urgência"}
                            </StatusBadge>
                            <StatusBadge className="border-slate-700 bg-slate-900 text-slate-300">
                              {getTipoIcone(demanda.tipo)} {demanda.tipo || "Sem tipo"}
                            </StatusBadge>
                            {quantidadeEvidencias > 0 && (
                              <StatusBadge className="border-purple-500/25 bg-purple-500/10 text-purple-300">
                                📷 {quantidadeEvidencias} evidência(s)
                              </StatusBadge>
                            )}
                            {atrasada && (
                              <StatusBadge className="border-orange-500/30 bg-orange-500/10 text-orange-300">
                                Atrasada
                              </StatusBadge>
                            )}
                            {previstaHoje && (
                              <StatusBadge className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                                Hoje
                              </StatusBadge>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => abrirModalDemanda(demanda)}
                            className={`max-w-full text-left text-lg font-black leading-tight underline-offset-4 transition hover:text-cyan-300 hover:underline ${
                              concluida ? "text-slate-400" : "text-white"
                            }`}
                          >
                            {demanda.escola_nome || "Escola não informada"}
                          </button>

                          <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-400">
                            {demanda.descricao || "Sem descrição registrada."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            <span>
                              Aberta por: <strong className="text-slate-400">{demanda.criado_por || "Não informado"}</strong>
                            </span>
                            <span>
                              Em: <strong className="text-slate-400">{formatarDataHora(demanda.created_at)}</strong>
                            </span>
                            {concluida && demanda.concluido_por && (
                              <span>
                                Concluída por: <strong className="text-emerald-400">{demanda.concluido_por}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-[#020617] p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500/25 bg-blue-500/10 text-xs font-black text-blue-200">
                              {getInitials(tecnicoAtual)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-blue-200" title={tecnicoAtual}>
                                {tecnicoAtual}
                              </p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                                Técnico Field
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 border-t border-slate-800 pt-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                              {concluida ? "Conclusão" : "Previsão"}
                            </p>
                            <p
                              className={`mt-1 text-xs font-black ${
                                concluida
                                  ? "text-emerald-300"
                                  : atrasada
                                    ? "text-orange-300"
                                    : previstaHoje
                                      ? "text-blue-300"
                                      : "text-slate-400"
                              }`}
                            >
                              {concluida
                                ? formatarDataHora(demanda.concluido_em)
                                : demanda.data_prevista
                                  ? formatarData(demanda.data_prevista)
                                  : "Sem previsão"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 xl:flex-col">
                          {!concluida ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditarClick(demanda)}
                                className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirConclusao(demanda)}
                                disabled={sendoEditada}
                                className="min-h-[42px] flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                Concluir
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirModalDemanda(demanda)}
                                className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                              >
                                Detalhes
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReabrir(demanda.id)}
                                disabled={reabrindo}
                                className="min-h-[42px] flex-1 rounded-xl border border-yellow-500/25 bg-yellow-500/10 px-4 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-500 hover:text-white disabled:opacity-50"
                              >
                                Reabrir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </Panel>
        </section>
      ) : (
        <section className="space-y-6">
          <Panel>
            <PanelHeader
              eyebrow="Visão analítica"
              title="Indicadores operacionais"
              description="Distribuição das demandas por categoria, urgência, técnico e Unidade Escolar."
              icon="📊"
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <InsightStat label="Histórico total" value={stats.total} tone="slate" />
              <InsightStat label="Em atendimento" value={stats.pendentes} tone="yellow" />
              <InsightStat label="Finalizadas" value={stats.concluidas} tone="emerald" />
              <InsightStat label="Taxa de conclusão" value={`${stats.taxaConclusao}%`} tone="cyan" />
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartPanel title="Volume por categoria" description="Distribuição histórica por tipo de demanda.">
              <div className="h-[300px] w-full">
                {demandas.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartCategoria}
                      margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={800}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="qtd" radius={[8, 8, 0, 0]} barSize={46}>
                        <LabelList
                          dataKey="qtd"
                          position="top"
                          fill="#f8fafc"
                          fontSize={13}
                          fontWeight={900}
                        />
                        {chartCategoria.map((_, index) => (
                          <Cell
                            key={`categoria-${index}`}
                            fill={index % 2 === 0 ? "#06b6d4" : "#3b82f6"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </ChartPanel>

            <ChartPanel title="Pendências por urgência" description="Demandas abertas separadas pelo nível de prioridade.">
              <div className="h-[300px] w-full">
                {demandas.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartUrgencia}
                      margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={800}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="qtd" radius={[8, 8, 0, 0]} barSize={46}>
                        <LabelList
                          dataKey="qtd"
                          position="top"
                          fill="#f8fafc"
                          fontSize={13}
                          fontWeight={900}
                        />
                        {chartUrgencia.map((entry) => (
                          <Cell
                            key={`urgencia-${entry.name}`}
                            fill={
                              entry.name === "Crítica"
                                ? "#ef4444"
                                : entry.name === "Alta"
                                  ? "#f97316"
                                  : entry.name === "Média"
                                    ? "#f59e0b"
                                    : "#64748b"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </ChartPanel>

            <ChartPanel title="Carga pendente por técnico" description="Top 10 técnicos por quantidade de demandas abertas.">
              <div className="h-[350px] w-full">
                {chartTecnico.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartTecnico}
                      layout="vertical"
                      margin={{ top: 0, right: 35, left: 40, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        width={135}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="qtd" radius={[0, 8, 8, 0]} barSize={24} fill="#f59e0b">
                        <LabelList
                          dataKey="qtd"
                          position="right"
                          fill="#fef3c7"
                          fontSize={13}
                          fontWeight={800}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </ChartPanel>

            <ChartPanel title="Volume por Unidade Escolar" description="Top 10 escolas com mais demandas registradas.">
              <div className="h-[350px] w-full">
                {chartEscola.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartEscola}
                      layout="vertical"
                      margin={{ top: 0, right: 35, left: 40, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        width={155}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="qtd" radius={[0, 8, 8, 0]} barSize={24} fill="#10b981">
                        <LabelList
                          dataKey="qtd"
                          position="right"
                          fill="#d1fae5"
                          fontSize={13}
                          fontWeight={800}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </ChartPanel>
          </div>
        </section>
      )}

      {demandaModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDemandaModal(null)
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-[#020617] shadow-2xl shadow-slate-950/80">
            <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 p-5 sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.10),transparent_34%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <StatusBadge className={getStatusClass(demandaModal.status)}>
                      {demandaModal.status || "Sem status"}
                    </StatusBadge>
                    <StatusBadge className={getUrgenciaClass(demandaModal.urgencia)}>
                      {demandaModal.urgencia || "Sem urgência"}
                    </StatusBadge>
                    <StatusBadge className="border-slate-700 bg-slate-900 text-slate-300">
                      {getTipoIcone(demandaModal.tipo)} {demandaModal.tipo || "Sem tipo"}
                    </StatusBadge>
                    {isAtrasada(demandaModal) && (
                      <StatusBadge className="border-orange-500/30 bg-orange-500/10 text-orange-300">
                        Atrasada
                      </StatusBadge>
                    )}
                  </div>

                  <h2 className="break-words text-2xl font-black tracking-tight text-white sm:text-4xl">
                    {demandaModal.escola_nome || "Escola não informada"}
                  </h2>
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    CIE: {demandaModal.cie}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDemandaModal(null)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-lg font-black text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBox label="Técnico responsável" value={demandaModal.tecnicoAtual} icon="👨‍🔧" tone="blue" />
                <InfoBox label="Registrada por" value={demandaModal.criado_por || "Não informado"} icon="👤" />
                <InfoBox label="Criada em" value={formatarDataHora(demandaModal.created_at)} icon="🕒" />
                <InfoBox
                  label="Data prevista"
                  value={
                    demandaModal.data_prevista
                      ? formatarData(demandaModal.data_prevista)
                      : "Sem previsão definida"
                  }
                  icon="📅"
                  tone={isAtrasada(demandaModal) ? "orange" : "default"}
                />
                <InfoBox
                  label="Conclusão"
                  value={
                    demandaModal.concluido_em
                      ? formatarDataHora(demandaModal.concluido_em)
                      : "Ainda pendente"
                  }
                  icon="✅"
                  tone={demandaModal.concluido_em ? "emerald" : "yellow"}
                />
                <InfoBox
                  label="Concluída por"
                  value={
                    demandaModal.concluido_por ||
                    (demandaModal.concluido_em
                      ? "Não registrado"
                      : "Ainda pendente")
                  }
                  icon="🪪"
                  tone={demandaModal.concluido_por ? "emerald" : "default"}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Descrição da demanda
                </p>
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-300">
                  {demandaModal.descricao || "Sem descrição registrada."}
                </p>
              </div>

              {isConcluida(demandaModal) && (
                <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-xl">
                      ✅
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                        Retorno de conclusão
                      </p>
                      <p className="mt-1 text-xs font-semibold text-emerald-100/70">
                        Informação registrada no encerramento da demanda.
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-relaxed text-emerald-50/90">
                    {demandaModal.retorno_conclusao ||
                      "A demanda foi concluída sem retorno complementar."}
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/10 text-xl">
                      📷
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-purple-300">
                        Evidências fotográficas
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {evidenciasDemandaModal.length} de {MAX_EVIDENCIAS_POR_DEMANDA} fotografia(s) registrada(s)
                      </p>
                    </div>
                  </div>

                  {evidenciasDemandaModal.length > 0 && (
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {formatarBytes(evidenciasDemandaModal.reduce((total, item) => total + Number(item.tamanho_bytes || 0), 0))}
                    </span>
                  )}
                </div>

                {carregandoGaleria ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[0, 1].map((item) => (
                      <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
                    ))}
                  </div>
                ) : evidenciasDemandaModal.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {evidenciasDemandaModal.map((evidencia, index) => (
                      <article key={evidencia.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                        <div className="relative aspect-[4/3] bg-slate-900">
                          {urlsEvidencias[evidencia.id] ? (
                            <img
                              src={urlsEvidencias[evidencia.id]}
                              alt={`Evidência ${index + 1} da demanda`}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-widest text-slate-600">
                              Imagem indisponível
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 p-4">
                          <div>
                            <p className="truncate text-sm font-black text-white" title={evidencia.nome_arquivo_original || `Evidência ${index + 1}`}>
                              {evidencia.nome_arquivo_original || `Evidência ${index + 1}`}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                              {formatarBytes(evidencia.tamanho_bytes)} • {evidencia.largura || "-"}×{evidencia.altura || "-"} px
                            </p>
                          </div>

                          <div className="text-[10px] font-semibold leading-relaxed text-slate-500">
                            <p>Enviada por: <strong className="text-slate-400">{evidencia.criado_por_nome || "Não informado"}</strong></p>
                            <p>Em: <strong className="text-slate-400">{formatarDataHora(evidencia.created_at)}</strong></p>
                          </div>

                          {podeExcluirEvidencias ? (
                            <button
                              type="button"
                              onClick={() => handleExcluirEvidencia(evidencia)}
                              disabled={excluindoEvidenciaId === evidencia.id}
                              className="w-full rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {excluindoEvidenciaId === evidencia.id ? "Excluindo..." : "Excluir fotografia"}
                            </button>
                          ) : (
                            <p className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest text-slate-600">
                              Exclusão restrita a SEINTEC e Admin
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 px-5 py-8 text-center">
                    <span className="text-4xl opacity-40">📭</span>
                    <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">
                      Nenhuma evidência registrada
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      As fotografias podem ser anexadas durante a conclusão da demanda.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 sm:p-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {!isConcluida(demandaModal) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleEditarClick(demandaModal)
                        setDemandaModal(null)
                      }}
                      className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirConclusao(demandaModal)}
                      className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
                    >
                      Concluir demanda
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReabrir(demandaModal.id)}
                    disabled={reabrindo}
                    className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-500 hover:text-white disabled:opacity-50"
                  >
                    {reabrindo ? "Reabrindo..." : "Reabrir demanda"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDemandaModal(null)}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {conclusaoModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !concluindo && !processandoImagens) {
              fecharConclusao()
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-[#020617] shadow-2xl shadow-emerald-950/20">
            <div className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 p-5 sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_34%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    Finalização da demanda
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    Concluir atendimento
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                    Registre um retorno opcional e confirme a conclusão da demanda.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fecharConclusao()}
                  disabled={concluindo || processandoImagens}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-lg font-black text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Demanda selecionada
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {conclusaoModal.demanda.escola_nome || "Escola não informada"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">
                  {conclusaoModal.demanda.descricao || "Sem descrição registrada."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoBox
                  label="Usuário responsável"
                  value={
                    usuarioLogado?.nome ||
                    usuarioLogado?.email ||
                    "Usuário não identificado"
                  }
                  icon="🪪"
                  tone="emerald"
                />
                <InfoBox
                  label="Data e hora"
                  value={formatarDataHora(new Date().toISOString())}
                  icon="🕒"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Retorno da conclusão <span className="text-slate-600">(opcional)</span>
                </label>
                <textarea
                  value={conclusaoModal.retorno}
                  onChange={(event) =>
                    setConclusaoModal((current) =>
                      current
                        ? {
                            ...current,
                            retorno: event.target.value,
                          }
                        : current
                    )
                  }
                  rows={7}
                  placeholder="Ex.: atendimento realizado, equipamento substituído, orientação fornecida, pendência encaminhada..."
                  className="input-base custom-scrollbar resize-none border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/30"
                />

                <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  <span>O campo pode ser deixado em branco</span>
                  <span>{conclusaoModal.retorno.trim().length} caracteres</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-purple-500/25 bg-purple-500/[0.06] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-purple-300">
                      Evidências fotográficas <span className="text-slate-600">(opcional)</span>
                    </p>
                    <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
                      Até duas fotos no total. As imagens são reduzidas para no máximo 1280 px, convertidas e comprimidas antes do envio para economizar o Storage.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300">
                    {evidenciasConclusaoExistentes.length + fotosConclusao.length}/{MAX_EVIDENCIAS_POR_DEMANDA}
                  </span>
                </div>

                {evidenciasConclusaoExistentes.length > 0 && (
                  <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-200/80">
                    Esta demanda já possui {evidenciasConclusaoExistentes.length} evidência(s). Elas serão preservadas e contam no limite total.
                  </div>
                )}

                <input
                  ref={inputFotosRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleSelecionarFotos}
                  disabled={vagasFotosConclusao <= 0 || processandoImagens || concluindo}
                  className="hidden"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => inputFotosRef.current?.click()}
                    disabled={vagasFotosConclusao <= 0 || processandoImagens || concluindo}
                    className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-purple-300 transition hover:bg-purple-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
                  >
                    {processandoImagens ? "Otimizando fotos..." : vagasFotosConclusao > 0 ? `Adicionar foto${vagasFotosConclusao > 1 ? "s" : ""}` : "Limite atingido"}
                  </button>

                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    JPEG, PNG ou WebP • máximo original de 20 MB • final abaixo de 1 MB
                  </div>
                </div>

                {progressoConclusao && (processandoImagens || concluindo) && (
                  <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs font-bold text-cyan-300">
                    {progressoConclusao}
                  </div>
                )}

                {fotosConclusao.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {fotosConclusao.map((foto, index) => (
                      <article key={foto.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                        <div className="aspect-[4/3] bg-slate-900">
                          <img
                            src={foto.previewUrl}
                            alt={`Prévia da evidência ${index + 1}`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="p-4">
                          <p className="truncate text-sm font-black text-white" title={foto.nomeOriginal}>
                            {foto.nomeOriginal}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {formatarBytes(foto.tamanhoBytes)} • {foto.largura}×{foto.altura} px
                          </p>
                          <p className="mt-2 text-[10px] font-semibold text-emerald-400">
                            Otimizada e pronta para envio
                          </p>
                          <button
                            type="button"
                            onClick={() => removerFotoPreparada(foto.id)}
                            disabled={concluindo || processandoImagens}
                            className="mt-3 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs font-semibold leading-relaxed text-emerald-100/80">
                  Ao confirmar, a demanda será marcada como concluída, a data será registrada e o usuário acima será vinculado como responsável pela conclusão.
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 sm:p-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => fecharConclusao()}
                  disabled={concluindo || processandoImagens}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConcluir}
                  disabled={concluindo || processandoImagens}
                  className="rounded-2xl bg-emerald-600 px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {concluindo
                    ? progressoConclusao || "Concluindo..."
                    : processandoImagens
                      ? "Otimizando fotos..."
                      : "Confirmar conclusão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-base {
          width: 100%;
          border-width: 1px;
          border-radius: 1rem;
          background: #0f172a;
          padding: 0.9rem 1rem;
          color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input-base::placeholder {
          color: #475569;
        }

        .input-base:focus {
          box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.25);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.35);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(51, 65, 85, 0.95);
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(71, 85, 105, 1);
        }
      `}</style>
    </div>
  )
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />
      {children}
    </div>
  )
}

function PanelHeader({
  eyebrow,
  title,
  description,
  icon,
  compact = false,
}: {
  eyebrow: string
  title: string
  description: string
  icon: string
  compact?: boolean
}) {
  return (
    <div className={compact ? "mb-0" : "mb-6 border-b border-slate-800 pb-5"}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-xl">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black text-white md:text-2xl">{title}</h2>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 md:text-sm">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label} {required && <span className="text-cyan-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function ActionKpi({
  icon,
  label,
  value,
  description,
  tone,
  active,
  onClick,
}: {
  icon: string
  label: string
  value: number
  description: string
  tone: "yellow" | "red" | "orange" | "emerald"
  active: boolean
  onClick: () => void
}) {
  const styles = {
    yellow: "border-yellow-500/25 bg-yellow-500/[0.07] text-yellow-300",
    red: "border-red-500/25 bg-red-500/[0.07] text-red-300",
    orange: "border-orange-500/25 bg-orange-500/[0.07] text-orange-300",
    emerald: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${styles[tone]} ${
        active ? "ring-1 ring-current" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-black text-white md:text-4xl">{value}</span>
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-1 text-[11px] font-semibold opacity-70">{description}</p>
    </button>
  )
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[90px] px-3 py-3 text-center md:px-5">
      <p className="text-lg font-black text-white md:text-xl">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600 md:text-[9px]">
        {label}
      </p>
    </div>
  )
}

function InsightStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: "slate" | "yellow" | "emerald" | "cyan"
}) {
  const styles = {
    slate: "border-slate-800 bg-slate-950 text-slate-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-2xl font-black text-white md:text-3xl">{value}</p>
      <p className="mt-2 text-[9px] font-black uppercase tracking-widest opacity-75">
        {label}
      </p>
    </div>
  )
}

function StatusBadge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${className}`}
    >
      {children}
    </span>
  )
}

function InfoBox({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string
  value: string
  icon: string
  tone?: "default" | "blue" | "yellow" | "orange" | "emerald"
}) {
  const styles = {
    default: "border-slate-800 bg-slate-950/70 text-slate-200",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-200",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-200",
    orange: "border-orange-500/25 bg-orange-500/10 text-orange-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 flex items-start gap-2 break-words text-sm font-black">
        <span>{icon}</span>
        <span>{value}</span>
      </p>
    </div>
  )
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Panel>
      <div className="mb-5 border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
      </div>
      {children}
    </Panel>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 shadow-2xl">
      <p className="text-xs font-black text-white">{label}</p>
      <p className="mt-1 text-xs font-bold text-cyan-300">
        Quantidade: {payload[0]?.value ?? 0}
      </p>
    </div>
  )
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
      <span className="text-5xl opacity-40">{icon}</span>
      <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-300">
        {title}
      </p>
      <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-600">
      Aguardando dados...
    </div>
  )
}
