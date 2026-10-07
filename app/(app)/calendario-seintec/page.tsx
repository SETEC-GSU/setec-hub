"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase"

const SETORES = [
  "ASURE",
  "ESE",
  "EEC",
  "SEINTEC",
  "SETEC",
  "SEPES",
  "SEAPE",
  "SEOM",
  "SEFISC",
  "SEFREP",
  "SEAFIN",
  "SEFIN",
  "SECOMSE",
  "SEGRE",
  "SEMAT",
  "SEVESC",
] as const

type Setor = (typeof SETORES)[number]
type Tipo = "evento" | "compromisso" | "demanda"
type Status =
  "planejado" | "confirmado" | "em_andamento" | "concluido" | "cancelado"
type Aba = "calendario" | "demandas" | "equipamentos" | "reservas"
type Atividade = {
  id: string
  titulo: string
  tipo: Tipo
  setor: Setor
  descricao: string
  local: string
  responsavel: string
  prioridade: "baixa" | "normal" | "alta" | "critica"
  status: Status
  inicio: string
  fim: string
  dia_inteiro: boolean
  observacoes: string
  versao: number
  created_at: string
  updated_at: string
}
type Equipamento = {
  id: string
  nome: string
  tipo: string
  modelo: string
  quantidade_total: number
  quantidade_indisponivel: number
  ativo: boolean
  observacoes: string
  versao: number
  created_at: string
  updated_at: string
}
type Reserva = {
  id: string
  atividade_id: string
  equipamento_id: string
  quantidade: number
  estado: "reservado" | "retirado" | "devolvido"
  retirado_em: string | null
  devolvido_em: string | null
  created_at: string
}
type Disponivel = Equipamento & { ocupadas: number; livres: number }
type Contexto = { ler: boolean; editar: boolean; nome: string; role: string }
type Historico = {
  id: string
  acao: string
  usuario_nome: string
  created_at: string
}
type Cliente = ReturnType<typeof createClient>
type Icone =
  | "calendar"
  | "check"
  | "box"
  | "tasks"
  | "plus"
  | "search"
  | "chevron"
  | "clock"
  | "pin"
  | "user"
  | "refresh"
  | "close"
  | "edit"
  | "arrow"
  | "filter"
  | "warning"

const TIPOS: Record<Tipo, { nome: string; cor: string; ponto: string }> = {
  evento: {
    nome: "Evento",
    cor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    ponto: "bg-cyan-400",
  },
  compromisso: {
    nome: "Compromisso",
    cor: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    ponto: "bg-blue-400",
  },
  demanda: {
    nome: "Demanda",
    cor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    ponto: "bg-amber-400",
  },
}
const STATUS: Record<Status, { nome: string; cor: string }> = {
  planejado: {
    nome: "Planejado",
    cor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  confirmado: {
    nome: "Confirmado",
    cor: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  em_andamento: {
    nome: "Em andamento",
    cor: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  concluido: {
    nome: "Concluído",
    cor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  cancelado: {
    nome: "Cancelado",
    cor: "border-red-500/30 bg-red-500/10 text-red-300",
  },
}
const CATEGORIAS = [
  "Notebook",
  "Tablet",
  "Smartphone",
  "Desktop",
  "Projetor",
  "Passador de slides",
  "Monitor",
  "Impressora",
  "Áudio",
  "Periférico",
  "Rede",
  "Extensão",
  "Filtro de linha",
  "Outro",
]
const INPUT =
  "min-h-[46px] w-full min-w-0 rounded-xl border border-slate-700 bg-[#080f20] px-3 py-2.5 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15 sm:text-sm disabled:opacity-50"
const SECUNDARIO =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-40"
const PRIMARIO =
  "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-wait disabled:opacity-40"
const ENCERRADOS: Status[] = ["concluido", "cancelado"]

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}
function erroTexto(erro: unknown) {
  return erro instanceof Error
    ? erro.message
    : String(
        (erro as { message?: string })?.message ||
          "Não foi possível concluir. Tente novamente.",
      )
}
function hojeSP() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}
function diaSP(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  })
}
function dataUTC(dia: string) {
  return new Date(`${dia}T12:00:00Z`)
}
function somarDias(dia: string, quantidade: number) {
  const d = dataUTC(dia)
  d.setUTCDate(d.getUTCDate() + quantidade)
  return d.toISOString().slice(0, 10)
}
function mudarMes(mes: string, quantidade: number) {
  const d = dataUTC(`${mes}-01`)
  d.setUTCMonth(d.getUTCMonth() + quantidade)
  return d.toISOString().slice(0, 7)
}
function diasDoMes(mes: string) {
  const primeiro = `${mes}-01`
  const inicio = somarDias(primeiro, -dataUTC(primeiro).getUTCDay())
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i))
}
function formatarDia(dia: string, longo = false) {
  return dataUTC(dia).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: longo ? "long" : "short",
    ...(longo ? ({ weekday: "long" } as const) : {}),
  })
}
function formatarMes(mes: string) {
  return dataUTC(`${mes}-01`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  })
}
function horaSP(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  })
}
function inputSP(iso: string) {
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
function fimDiaAtividade(a: Atividade) {
  return diaSP(new Date(new Date(a.fim).getTime() - 1).toISOString())
}
function ocorreNoDia(a: Atividade, dia: string) {
  return diaSP(a.inicio) <= dia && fimDiaAtividade(a) >= dia
}
function ocorreNoMes(a: Atividade, mes: string) {
  return (
    diaSP(a.inicio) < `${mudarMes(mes, 1)}-01` &&
    fimDiaAtividade(a) >= `${mes}-01`
  )
}
function horario(a: Atividade) {
  if (a.dia_inteiro) return "Dia inteiro"
  return diaSP(a.inicio) === fimDiaAtividade(a)
    ? `${horaSP(a.inicio)}–${horaSP(a.fim)}`
    : `${formatarDia(diaSP(a.inicio))}, ${horaSP(a.inicio)} → ${formatarDia(fimDiaAtividade(a))}, ${horaSP(a.fim)}`
}
function atrasada(a: Atividade) {
  return (
    !ENCERRADOS.includes(a.status) && new Date(a.fim).getTime() < Date.now()
  )
}

async function colecao<T>(cliente: Cliente, tabela: string): Promise<T[]> {
  const registros: T[] = []
  let inicio = 0
  let total: number | null = null
  for (;;) {
    const { data, error, count } = await cliente
      .from(tabela)
      .select("*", { count: inicio === 0 ? "exact" : undefined })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(inicio, inicio + 499)
    if (error) throw error
    if (inicio === 0) total = count
    const pagina = (data || []) as T[]
    registros.push(...pagina)
    inicio += pagina.length
    if (total !== null && inicio >= total) return registros
    if (!pagina.length) {
      if (total !== null && inicio < total)
        throw new Error(
          "A consulta ficou incompleta. Atualize para tentar novamente.",
        )
      return registros
    }
  }
}

function useDisponibilidade(
  cliente: Cliente,
  inicio: string,
  fim: string,
  ignorar: string | null = null,
  atualizar = 0,
) {
  const [dados, setDados] = useState<Disponivel[]>([])
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let vigente = true
    setLoading(true)
    setErro("")
    setDados([])
    if (!inicio || !fim || fim <= inicio) {
      setLoading(false)
      return
    }
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await cliente.rpc("seintec_disponibilidade", {
          p_inicio: inicio,
          p_fim: fim,
          p_ignorar: ignorar,
        })
        if (error) throw error
        if (vigente) setDados((data || []) as Disponivel[])
      } catch (e) {
        if (vigente) setErro(erroTexto(e))
      } finally {
        if (vigente) setLoading(false)
      }
    }, 200)
    return () => {
      vigente = false
      window.clearTimeout(timer)
    }
  }, [cliente, inicio, fim, ignorar, atualizar])
  return { dados, erro, loading }
}

function Icon({
  nome,
  className = "h-5 w-5",
}: {
  nome: Icone
  className?: string
}) {
  const caminhos: Record<Icone, ReactNode> = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7 5.8l9 5" />
      </>
    ),
    tasks: (
      <>
        <rect x="4" y="4" width="16" height="17" rx="3" />
        <path d="M9 3h6v3H9zM8 11h1M12 11h4M8 16h1M12 16h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5M7 5a8 8 0 0 1 13 7M17 19a8 8 0 0 1-13-7" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    edit: (
      <>
        <path d="m15 4 5 5M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15l-1 6Z" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    filter: (
      <>
        <path d="M4 7h16M7 12h10M10 17h4" />
      </>
    ),
    warning: (
      <>
        <path d="m10 4-8 14a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2 2 0 0 0-4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  }
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {caminhos[nome]}
    </svg>
  )
}
function Tag({ children, cor }: { children: ReactNode; cor: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${cor}`}
    >
      {children}
    </span>
  )
}
function Painel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-800 bg-[#080e1d] ${className}`}
    >
      {children}
    </section>
  )
}
function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto: string
  acao?: ReactNode
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center">
      <span className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-500">
        <Icon nome="calendar" className="h-7 w-7" />
      </span>
      <h3 className="text-base font-semibold text-slate-100">{titulo}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
        {texto}
      </p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}
function Campo({
  nome,
  id,
  children,
  dica,
}: {
  nome: string
  id?: string
  children: ReactNode
  dica?: string
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold text-slate-300"
      >
        {nome}
      </label>
      {children}
      {dica && (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{dica}</p>
      )}
    </div>
  )
}

function Modal({
  titulo,
  descricao,
  children,
  fechar,
  ocupado = false,
  largo = false,
}: {
  titulo: string
  descricao?: string
  children: ReactNode
  fechar: () => void
  ocupado?: boolean
  largo?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fecharRef = useRef(fechar)
  fecharRef.current = fechar
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    ref.current?.querySelector<HTMLElement>("button")?.focus()
    return () => {
      document.body.style.overflow = overflow
      anterior?.focus()
    }
  }, [])
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape" && !ocupado) fecharRef.current()
      if (e.key !== "Tab") return
      const focaveis = [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        ) || []),
      ].filter((x) => x.getClientRects().length > 0)
      const primeiro = focaveis[0],
        ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo?.focus()
      }
      if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro?.focus()
      }
    }
    document.addEventListener("keydown", tecla)
    return () => document.removeEventListener("keydown", tecla)
  }, [ocupado])
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) fechar()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="seintec-modal-titulo"
        className={`flex max-h-[94dvh] w-full min-w-0 flex-col rounded-t-3xl border border-slate-700 bg-[#080f20] shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl ${largo ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="seintec-modal-titulo"
              className="break-words text-xl font-bold text-white"
            >
              {titulo}
            </h2>
            {descricao && (
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar janela"
            onClick={fechar}
            disabled={ocupado}
            className={`${SECUNDARIO} !h-11 !w-11 !px-0`}
          >
            <Icon nome="close" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function CartaoAtividade({
  atividade: a,
  reservas,
  abrir,
  compacto = false,
}: {
  atividade: Atividade
  reservas: number
  abrir: () => void
  compacto?: boolean
}) {
  return (
    <button
      type="button"
      onClick={abrir}
      className="group w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-left transition hover:border-slate-600 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tag cor={TIPOS[a.tipo].cor}>{TIPOS[a.tipo].nome}</Tag>
        <span className="text-[11px] font-semibold tracking-wide text-slate-500">
          {a.setor}
        </span>
      </div>
      <h4 className="mt-3 break-words text-sm font-semibold leading-relaxed text-slate-100 [overflow-wrap:anywhere]">
        {a.titulo}
      </h4>
      <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <Icon nome="clock" className="mt-0.5 h-3.5 w-3.5" />
        <span>
          {horario(a)}
          {compacto ? ` · ${formatarDia(diaSP(a.inicio))}` : ""}
        </span>
      </p>
      {!compacto && a.local && (
        <p className="mt-1.5 flex items-start gap-2 break-words text-xs leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
          <Icon nome="pin" className="mt-0.5 h-3.5 w-3.5" />
          {a.local}
        </p>
      )}
      <p className="mt-1.5 flex items-start gap-2 break-words text-xs leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
        <Icon nome="user" className="mt-0.5 h-3.5 w-3.5" />
        {a.responsavel}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tag cor={STATUS[a.status].cor}>{STATUS[a.status].nome}</Tag>
        {a.prioridade === "critica" && (
          <Tag cor="border-red-500/30 bg-red-500/10 text-red-300">Crítica</Tag>
        )}
        {atrasada(a) && (
          <Tag cor="border-red-500/30 bg-red-500/10 text-red-300">
            Prazo vencido
          </Tag>
        )}
        {reservas > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Icon nome="box" className="h-3.5 w-3.5" />
            {reservas} un.
          </span>
        )}
      </div>
    </button>
  )
}

export default function CalendarioSeintecPage() {
  const cliente = useMemo(() => createClient(), [])
  const [contexto, setContexto] = useState<Contexto | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [revisao, setRevisao] = useState(0)
  const carregamento = useRef(0)
  const [aba, setAba] = useState<Aba>("calendario")
  const [vista, setVista] = useState<"mes" | "agenda">("mes")
  const [mes, setMes] = useState(() => hojeSP().slice(0, 7))
  const [dia, setDia] = useState(hojeSP)
  const [busca, setBusca] = useState("")
  const [setor, setSetor] = useState("Todos")
  const [tipo, setTipo] = useState("Todos")
  const [status, setStatus] = useState("Todos")
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [consultaInicio, setConsultaInicio] = useState(
    () => `${hojeSP()}T00:00`,
  )
  const [consultaFim, setConsultaFim] = useState(
    () => `${somarDias(hojeSP(), 1)}T00:00`,
  )
  const [formulario, setFormulario] = useState<{
    atividade?: Atividade
    tipo: Tipo
  } | null>(null)
  const [formEquipamento, setFormEquipamento] = useState<
    Equipamento | "novo" | null
  >(null)
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const [movimento, setMovimento] = useState<{
    reserva: Reserva
    acao: "retirar" | "devolver"
  } | null>(null)
  const [movendo, setMovendo] = useState(false)
  const [erroMovimento, setErroMovimento] = useState("")
  const movimentoEmCurso = useRef(false)

  const carregar = useCallback(async () => {
    const pedido = ++carregamento.current
    setLoading(true)
    setErro("")
    try {
      const { data: auth, error: authError } = await cliente.auth.getUser()
      if (authError || !auth.user)
        throw new Error("Sua sessão expirou. Entre novamente no Hub.")
      const { data, error } = await cliente.rpc("seintec_contexto")
      if (error)
        throw new Error(
          "Não foi possível abrir o calendário. Peça à administração para conferir a configuração.",
        )
      const ctx = data as Contexto
      if (pedido !== carregamento.current) return
      setContexto(ctx)
      if (!ctx.ler) {
        setAtividades([])
        setEquipamentos([])
        setReservas([])
        return
      }
      const [a, e, r] = await Promise.all([
        colecao<Atividade>(cliente, "seintec_atividades"),
        colecao<Equipamento>(cliente, "seintec_equipamentos"),
        colecao<Reserva>(cliente, "seintec_reservas"),
      ])
      if (pedido !== carregamento.current) return
      setAtividades(a)
      setEquipamentos(e)
      setReservas(r)
      setRevisao((x) => x + 1)
    } catch (e) {
      if (pedido === carregamento.current) setErro(erroTexto(e))
    } finally {
      if (pedido === carregamento.current) setLoading(false)
    }
  }, [cliente])
  useEffect(() => {
    void carregar()
    return () => {
      carregamento.current++
    }
  }, [carregar])
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setVista("agenda")
  }, [])
  useEffect(() => {
    if (!aviso) return
    const id = window.setTimeout(() => setAviso(""), 6000)
    return () => window.clearTimeout(id)
  }, [aviso])

  const disponibilidade = useDisponibilidade(
    cliente,
    contexto?.ler && (aba === "calendario" || aba === "equipamentos")
      ? aba === "calendario"
        ? `${dia}T00:00`
        : consultaInicio
      : "",
    aba === "calendario" ? `${somarDias(dia, 1)}T00:00` : consultaFim,
    null,
    revisao,
  )
  const mapaEquipamentos = useMemo(
    () => new Map(equipamentos.map((e) => [e.id, e])),
    [equipamentos],
  )
  const mapaAtividades = useMemo(
    () => new Map(atividades.map((a) => [a.id, a])),
    [atividades],
  )
  const quantidadeReserva = useCallback(
    (id: string) =>
      reservas
        .filter((r) => r.atividade_id === id && r.estado !== "devolvido")
        .reduce((s, r) => s + r.quantidade, 0),
    [reservas],
  )
  const filtradas = useMemo(() => {
    const termo = normalizar(busca)
    return atividades
      .filter(
        (a) =>
          (!termo ||
            normalizar(
              `${a.titulo} ${a.responsavel} ${a.local} ${a.descricao}`,
            ).includes(termo)) &&
          (setor === "Todos" || a.setor === setor) &&
          (status === "Todos" || a.status === status) &&
          (aba === "demandas" || tipo === "Todos" || a.tipo === tipo),
      )
      .sort(
        (a, b) =>
          a.inicio.localeCompare(b.inicio) ||
          a.titulo.localeCompare(b.titulo, "pt-BR"),
      )
  }, [atividades, busca, setor, status, tipo, aba])
  const itensMes = useMemo(
    () => filtradas.filter((a) => ocorreNoMes(a, mes)),
    [filtradas, mes],
  )
  const itensDia = useMemo(
    () => filtradas.filter((a) => ocorreNoDia(a, dia)),
    [filtradas, dia],
  )
  const demandas = useMemo(
    () => filtradas.filter((a) => a.tipo === "demanda"),
    [filtradas],
  )
  const equipamentosFiltrados = useMemo(
    () =>
      equipamentos
        .filter((e) =>
          normalizar(`${e.nome} ${e.tipo} ${e.modelo}`).includes(
            normalizar(busca),
          ),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [equipamentos, busca],
  )
  const reservasFiltradas = useMemo(
    () =>
      reservas
        .filter((r) => {
          const a = mapaAtividades.get(r.atividade_id),
            e = mapaEquipamentos.get(r.equipamento_id)
          return (
            a &&
            (setor === "Todos" || a.setor === setor) &&
            (status === "Todos" || a.status === status) &&
            normalizar(
              `${a.titulo} ${a.responsavel} ${e?.nome || ""} ${e?.tipo || ""}`,
            ).includes(normalizar(busca))
          )
        })
        .sort(
          (a, b) =>
            (a.estado === "devolvido" ? 1 : 0) -
              (b.estado === "devolvido" ? 1 : 0) ||
            b.created_at.localeCompare(a.created_at),
        ),
    [reservas, mapaAtividades, mapaEquipamentos, busca, setor, status],
  )
  const selecionada = detalhe ? mapaAtividades.get(detalhe) : undefined
  const gruposAgenda = useMemo(() => {
    const grupos = new Map<string, Atividade[]>()
    itensMes.forEach((a) => {
      const data = diaSP(a.inicio) < `${mes}-01` ? `${mes}-01` : diaSP(a.inicio)
      grupos.set(data, [...(grupos.get(data) || []), a])
    })
    return [...grupos].sort(([a], [b]) => a.localeCompare(b))
  }, [itensMes, mes])
  function escolherDia(valor: string) {
    setDia(valor)
    setConsultaInicio(`${valor}T00:00`)
    setConsultaFim(`${somarDias(valor, 1)}T00:00`)
  }
  function navegarMes(delta: number) {
    const novo = mudarMes(mes, delta)
    setMes(novo)
    escolherDia(`${novo}-01`)
  }
  function sucesso(texto: string) {
    setAviso(texto)
    void carregar()
  }
  function limpar() {
    setBusca("")
    setSetor("Todos")
    setTipo("Todos")
    setStatus("Todos")
  }
  async function movimentar() {
    if (!movimento || movimentoEmCurso.current) return
    const a = mapaAtividades.get(movimento.reserva.atividade_id)
    if (!a) return
    movimentoEmCurso.current = true
    setMovendo(true)
    setErroMovimento("")
    try {
      const { error } = await cliente.rpc("seintec_movimentar_reserva", {
        p_id: movimento.reserva.id,
        p_acao: movimento.acao,
        p_versao: a.versao,
      })
      if (error) throw error
      setMovimento(null)
      sucesso(
        movimento.acao === "retirar"
          ? "Retirada registrada."
          : "Equipamentos liberados e saldo atualizado.",
      )
    } catch (e) {
      setErroMovimento(erroTexto(e))
    } finally {
      movimentoEmCurso.current = false
      setMovendo(false)
    }
  }
  function abrirMovimento(reserva: Reserva, acao: "retirar" | "devolver") {
    setErroMovimento("")
    setMovimento({ reserva, acao })
  }

  if (loading && !contexto)
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-slate-400">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <p>Preparando o calendário…</p>
        {erro && <p role="alert">{erro}</p>}
      </div>
    )
  if (!contexto || !contexto.ler)
    return (
      <Painel className="mx-auto mt-6 max-w-xl p-6">
        <h1 className="text-xl font-bold text-white">
          Calendário SEINTEC / SETEC
        </h1>
        <p role="alert" className="mt-3 text-sm leading-relaxed text-slate-400">
          {erro || "Seu perfil não possui acesso a este calendário interno."}
        </p>
        <button
          type="button"
          className={`${SECUNDARIO} mt-5`}
          onClick={() => void carregar()}
        >
          <Icon nome="refresh" />
          Tentar novamente
        </button>
      </Painel>
    )

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6 pb-12 text-slate-200">
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-[#0a1223] p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              SEINTEC + SETEC <span className="text-slate-600">/</span>
              <span className="text-slate-400">URE Guarulhos Sul</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Calendário SEINTEC / SETEC
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Eventos, compromissos e demandas, com os equipamentos certos no
              momento certo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void carregar()}
              disabled={loading}
              className={SECUNDARIO}
              aria-label="Atualizar calendário"
            >
              <Icon
                nome="refresh"
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Atualizar</span>
            </button>
            {contexto.editar && (
              <button
                type="button"
                className={PRIMARIO}
                onClick={() =>
                  setFormulario({
                    tipo: aba === "demandas" ? "demanda" : "evento",
                  })
                }
              >
                <Icon nome="plus" />
                {aba === "demandas" ? "Nova demanda" : "Novo registro"}
              </button>
            )}
          </div>
        </div>
      </header>

      {erro && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {erro}{" "}
          {atividades.length > 0 &&
            "Os dados anteriores continuam visíveis; atualize antes de editar."}
        </div>
      )}
      {aviso && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          <Icon nome="check" />
          {aviso}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            titulo: "Agenda do mês",
            valor: atividades.filter(
              (a) => ocorreNoMes(a, mes) && !ENCERRADOS.includes(a.status),
            ).length,
            sub: formatarMes(mes),
            icone: "calendar" as Icone,
            cor: "text-cyan-300",
          },
          {
            titulo: "Demandas abertas",
            valor: atividades.filter(
              (a) => a.tipo === "demanda" && !ENCERRADOS.includes(a.status),
            ).length,
            sub: `${atividades.filter((a) => a.tipo === "demanda" && atrasada(a)).length} com prazo vencido`,
            icone: "tasks" as Icone,
            cor: "text-amber-300",
          },
          {
            titulo: "Em uso",
            valor: reservas
              .filter((r) => r.estado === "retirado")
              .reduce((s, r) => s + r.quantidade, 0),
            sub: "unidades ainda não devolvidas",
            icone: "box" as Icone,
            cor: "text-blue-300",
          },
          {
            titulo: "Base da URE",
            valor: equipamentos
              .filter((e) => e.ativo)
              .reduce((s, e) => s + e.quantidade_total, 0),
            sub: `${equipamentos.filter((e) => e.ativo).length} grupos de equipamentos`,
            icone: "check" as Icone,
            cor: "text-emerald-300",
          },
        ].map((k) => (
          <Painel key={k.titulo} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-400">{k.titulo}</p>
              <Icon nome={k.icone} className={`h-4 w-4 ${k.cor}`} />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-white">
              {k.valor.toLocaleString("pt-BR")}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              {k.sub}
            </p>
          </Painel>
        ))}
      </div>

      <nav
        aria-label="Áreas do calendário"
        className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-800 bg-[#080e1d] p-1.5 sm:flex sm:gap-2"
      >
        {(
          [
            { id: "calendario", nome: "Calendário", icon: "calendar" },
            { id: "demandas", nome: "Demandas", icon: "tasks" },
            { id: "equipamentos", nome: "Equipamentos", icon: "box" },
            { id: "reservas", nome: "Reservas", icon: "check" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={aba === t.id ? "page" : undefined}
            onClick={() => {
              setAba(t.id)
              limpar()
            }}
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:min-h-[44px] sm:flex-row sm:gap-2 sm:px-5 sm:text-sm ${aba === t.id ? "bg-slate-800 text-cyan-300 shadow-sm" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
          >
            <Icon nome={t.icon} className="h-4 w-4" />
            <span>{t.nome}</span>
          </button>
        ))}
      </nav>

      <Painel className="p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 basis-52">
            <label htmlFor="seintec-busca" className="sr-only">
              Buscar nesta área
            </label>
            <span className="pointer-events-none absolute left-3 top-3.5 text-slate-500">
              <Icon nome="search" className="h-4 w-4" />
            </span>
            <input
              id="seintec-busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${INPUT} !pl-10`}
              placeholder={
                aba === "equipamentos"
                  ? "Buscar equipamento ou modelo…"
                  : "Buscar título, responsável, local…"
              }
            />
          </div>
          {aba !== "equipamentos" && (
            <button
              type="button"
              className={`${SECUNDARIO} sm:hidden`}
              aria-expanded={filtrosAbertos}
              aria-controls="seintec-filtros"
              onClick={() => setFiltrosAbertos((x) => !x)}
            >
              <Icon nome="filter" />
              Filtros
            </button>
          )}
          {(busca ||
            setor !== "Todos" ||
            status !== "Todos" ||
            tipo !== "Todos") && (
            <button type="button" className={SECUNDARIO} onClick={limpar}>
              Limpar
            </button>
          )}
        </div>
        {aba !== "equipamentos" && (
          <div
            id="seintec-filtros"
            className={`${filtrosAbertos ? "grid" : "hidden"} mt-3 grid-cols-1 gap-3 sm:grid sm:grid-cols-3`}
          >
            <Campo nome="Setor" id="seintec-setor">
              <select
                id="seintec-setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className={INPUT}
              >
                <option value="Todos">Todos os setores</option>
                {SETORES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo nome="Status" id="seintec-status">
              <select
                id="seintec-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={INPUT}
              >
                <option value="Todos">Todos os status</option>
                {Object.entries(STATUS).map(([v, s]) => (
                  <option key={v} value={v}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </Campo>
            {aba === "calendario" && (
              <Campo nome="Tipo" id="seintec-tipo">
                <select
                  id="seintec-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className={INPUT}
                >
                  <option value="Todos">Todos os registros</option>
                  {Object.entries(TIPOS).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
        )}
      </Painel>

      {aba === "calendario" && (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Painel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  className={`${SECUNDARIO} !h-11 !w-11 !px-0`}
                  onClick={() => navegarMes(-1)}
                >
                  <Icon nome="chevron" className="h-4 w-4 rotate-180" />
                </button>
                <h2 className="min-w-0 text-base font-semibold text-white first-letter:uppercase sm:text-lg">
                  {formatarMes(mes)}
                </h2>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  className={`${SECUNDARIO} !h-11 !w-11 !px-0`}
                  onClick={() => navegarMes(1)}
                >
                  <Icon nome="chevron" className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={SECUNDARIO}
                  onClick={() => {
                    setMes(hojeSP().slice(0, 7))
                    escolherDia(hojeSP())
                  }}
                >
                  Hoje
                </button>
                <div className="flex rounded-xl bg-slate-900 p-1">
                  {(["mes", "agenda"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={vista === v}
                      className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold ${vista === v ? "bg-slate-700 text-white" : "text-slate-400"}`}
                      onClick={() => setVista(v)}
                    >
                      {v === "mes" ? "Mês" : "Agenda"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 px-4 py-3 text-[11px] text-slate-400">
              {Object.entries(TIPOS).map(([key, t]) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${t.ponto}`} />
                  {t.nome}s
                </span>
              ))}
              <span className="ml-auto text-slate-500">
                Horário de Brasília
              </span>
            </div>
            {vista === "mes" ? (
              <div aria-label="Calendário do mês">
                <div className="grid grid-cols-7 border-y border-slate-800 bg-slate-900/50">
                  {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map(
                    (x) => (
                      <div
                        key={x}
                        className="py-3 text-center text-[9px] font-bold tracking-wider text-slate-500 sm:text-[10px]"
                      >
                        {x}
                      </div>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7">
                  {diasDoMes(mes).map((d) => {
                    const lista = filtradas.filter((a) => ocorreNoDia(a, d))
                    const selecionado = d === dia
                    const hoje = d === hojeSP()
                    const outroMes = !d.startsWith(mes)
                    return (
                      <article
                        key={d}
                        className={`min-h-[76px] min-w-0 border-b border-r border-slate-800 p-1 sm:min-h-[130px] sm:p-2 ${selecionado ? "bg-cyan-500/5 ring-1 ring-inset ring-cyan-500/40" : ""} ${outroMes ? "bg-slate-950/40 opacity-50" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => escolherDia(d)}
                          aria-label={`${formatarDia(d, true)} de ${d.slice(0, 4)}, ${lista.length} registro(s)`}
                          aria-pressed={selecionado}
                          className="flex min-h-[38px] w-full items-center justify-center rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:justify-start"
                        >
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold ${hoje ? "bg-cyan-400 text-slate-950" : selecionado ? "text-cyan-300" : "text-slate-400"}`}
                          >
                            {Number(d.slice(-2))}
                          </span>
                        </button>
                        <div className="flex justify-center gap-1 sm:hidden">
                          {lista.slice(0, 3).map((a) => (
                            <span
                              key={a.id}
                              className={`h-1 w-1 rounded-full ${TIPOS[a.tipo].ponto}`}
                            />
                          ))}
                          {lista.length > 3 && (
                            <span className="text-[8px] leading-none text-slate-500">
                              +
                            </span>
                          )}
                        </div>
                        <div className="hidden space-y-1 sm:block">
                          {lista.slice(0, 2).map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              title={a.titulo}
                              onClick={() => setDetalhe(a.id)}
                              className={`flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border px-1.5 py-1.5 text-left text-[10px] font-medium ${TIPOS[a.tipo].cor} ${ENCERRADOS.includes(a.status) ? "opacity-50" : ""}`}
                            >
                              <span
                                className={`h-1 w-1 shrink-0 rounded-full ${TIPOS[a.tipo].ponto}`}
                              />
                              <span className="truncate">{a.titulo}</span>
                            </button>
                          ))}
                          {lista.length > 2 && (
                            <button
                              type="button"
                              onClick={() => escolherDia(d)}
                              className="min-h-6 text-[10px] text-slate-500"
                            >
                              +{lista.length - 2} registros
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6 p-4 sm:p-5">
                {gruposAgenda.length ? (
                  gruposAgenda.map(([data, lista]) => (
                    <div key={data}>
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-bold ${data === hojeSP() ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-300"}`}
                        >
                          {Number(data.slice(-2))}
                        </span>
                        <h3 className="text-sm font-semibold capitalize text-slate-300">
                          {formatarDia(data, true)}
                        </h3>
                        <span className="ml-auto text-xs text-slate-500">
                          {lista.length} registro(s)
                        </span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {lista.map((a) => (
                          <CartaoAtividade
                            key={a.id}
                            atividade={a}
                            reservas={quantidadeReserva(a.id)}
                            abrir={() => setDetalhe(a.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <Vazio
                    titulo="Sua agenda está livre"
                    texto="Nenhum registro neste mês com os filtros selecionados."
                    acao={
                      contexto.editar ? (
                        <button
                          type="button"
                          className={PRIMARIO}
                          onClick={() => setFormulario({ tipo: "evento" })}
                        >
                          <Icon nome="plus" />
                          Cadastrar registro
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </div>
            )}
          </Painel>
          <div className="space-y-5">
            <Painel>
              <div className="border-b border-slate-800 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                  Em foco
                </p>
                <h2 className="mt-2 text-lg font-semibold capitalize text-white">
                  {formatarDia(dia, true)}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {itensDia.length} registro(s) no dia selecionado
                </p>
              </div>
              <div className="space-y-3 p-4">
                {itensDia.length ? (
                  itensDia.map((a) => (
                    <CartaoAtividade
                      key={a.id}
                      atividade={a}
                      reservas={quantidadeReserva(a.id)}
                      abrir={() => setDetalhe(a.id)}
                    />
                  ))
                ) : (
                  <Vazio
                    titulo="Dia sem compromissos"
                    texto="Escolha outro dia ou cadastre um novo registro."
                  />
                )}
                {contexto.editar && (
                  <button
                    type="button"
                    className={`${SECUNDARIO} w-full border-dashed`}
                    onClick={() => setFormulario({ tipo: "compromisso" })}
                  >
                    <Icon nome="plus" />
                    Adicionar neste dia
                  </button>
                )}
              </div>
            </Painel>
            <Painel className="p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <Icon nome="box" />
                <h3 className="text-sm font-semibold text-white">
                  Recursos para o dia
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Saldo mínimo livre durante {formatarDia(dia)}. A reserva é
                conferida para o horário de cada registro.
              </p>
              {disponibilidade.loading ? (
                <p className="mt-4 text-xs text-slate-500">
                  Consultando disponibilidade…
                </p>
              ) : disponibilidade.erro ? (
                <p className="mt-4 text-xs text-red-300">
                  {disponibilidade.erro}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {disponibilidade.dados.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      className="flex min-w-0 items-center justify-between gap-3"
                    >
                      <span
                        className="min-w-0 truncate text-xs text-slate-400"
                        title={e.nome}
                      >
                        {e.nome}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${e.livres > 0 ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        {e.livres} livres
                      </span>
                    </div>
                  ))}
                  {!disponibilidade.dados.length && (
                    <p className="text-xs leading-relaxed text-slate-500">
                      Cadastre a base de equipamentos da URE para começar a
                      reservar.
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-cyan-300"
                onClick={() => {
                  setAba("equipamentos")
                  limpar()
                }}
              >
                Consultar equipamentos{" "}
                <Icon nome="arrow" className="h-3.5 w-3.5" />
              </button>
            </Painel>
          </div>
        </div>
      )}

      {aba === "demandas" && (
        <section aria-label="Gestão de demandas internas">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Do pedido à entrega
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Os prazos das demandas alimentam o calendário automaticamente.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {demandas.length} demanda(s)
            </span>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {[
              {
                nome: "A organizar",
                estados: ["planejado", "confirmado"],
                ponto: "bg-amber-400",
              },
              {
                nome: "Em andamento",
                estados: ["em_andamento"],
                ponto: "bg-blue-400",
              },
              {
                nome: "Encerradas",
                estados: ["concluido", "cancelado"],
                ponto: "bg-emerald-400",
              },
            ].map((col) => {
              const lista = demandas.filter((a) =>
                col.estados.includes(a.status),
              )
              return (
                <Painel key={col.nome} className="p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.ponto}`} />
                    <h3 className="text-sm font-semibold text-slate-200">
                      {col.nome}
                    </h3>
                    <span className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">
                      {lista.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {lista.length ? (
                      lista.map((a) => (
                        <CartaoAtividade
                          key={a.id}
                          atividade={a}
                          reservas={quantidadeReserva(a.id)}
                          abrir={() => setDetalhe(a.id)}
                          compacto
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-500">
                        Nenhuma demanda nesta etapa.
                      </div>
                    )}
                  </div>
                </Painel>
              )
            })}
          </div>
        </section>
      )}

      {aba === "equipamentos" && (
        <section aria-label="Equipamentos da URE">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Base de equipamentos da URE
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Quantidade física, indisponibilidades e reservas consultadas no
                mesmo lugar.
              </p>
            </div>
            {contexto.editar && (
              <button
                type="button"
                className={PRIMARIO}
                onClick={() => setFormEquipamento("novo")}
              >
                <Icon nome="plus" />
                Cadastrar equipamento
              </button>
            )}
          </div>
          <Painel className="mb-5 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                nome="Consultar disponibilidade a partir de"
                id="consulta-inicio"
              >
                <input
                  id="consulta-inicio"
                  type="datetime-local"
                  value={consultaInicio}
                  onChange={(e) => setConsultaInicio(e.target.value)}
                  className={INPUT}
                />
              </Campo>
              <Campo nome="Até" id="consulta-fim">
                <input
                  id="consulta-fim"
                  type="datetime-local"
                  value={consultaFim}
                  onChange={(e) => setConsultaFim(e.target.value)}
                  className={INPUT}
                />
              </Campo>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Horário de Brasília. “Livre no período” considera a maior
              quantidade reservada simultaneamente.
            </p>
            {consultaFim <= consultaInicio && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                O término deve ser posterior ao início.
              </p>
            )}
            {disponibilidade.erro && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {disponibilidade.erro}
              </p>
            )}
          </Painel>
          {equipamentosFiltrados.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {equipamentosFiltrados.map((e) => {
                const saldo = disponibilidade.dados.find((x) => x.id === e.id)
                const capacidade =
                  e.quantidade_total - e.quantidade_indisponivel
                return (
                  <Painel
                    key={e.id}
                    className={`p-5 ${!e.ativo ? "opacity-65" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300">
                        <Icon nome="box" />
                      </span>
                      {contexto.editar && (
                        <button
                          type="button"
                          className={`${SECUNDARIO} !h-11 !w-11 !px-0`}
                          aria-label={`Editar ${e.nome}`}
                          onClick={() => setFormEquipamento(e)}
                        >
                          <Icon nome="edit" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {e.tipo}
                    </p>
                    <h3 className="mt-1 break-words text-lg font-semibold text-white [overflow-wrap:anywhere]">
                      {e.nome}
                    </h3>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {e.modelo || "Sem modelo informado"}
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                      {[
                        { nome: "Total físico", n: e.quantidade_total },
                        { nome: "Indisponível", n: e.quantidade_indisponivel },
                        { nome: "Aptos", n: capacidade },
                      ].map((q) => (
                        <div key={q.nome}>
                          <p className="text-[10px] text-slate-500">{q.nome}</p>
                          <p className="mt-1 text-xl font-semibold text-slate-200">
                            {q.n}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${e.ativo ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-700 bg-slate-900"}`}
                    >
                      <span className="text-xs text-slate-400">
                        {e.ativo ? "Livre no período" : "Cadastro inativo"}
                      </span>
                      <strong
                        className={
                          e.ativo ? "text-emerald-300" : "text-slate-500"
                        }
                      >
                        {!e.ativo ||
                        disponibilidade.erro ||
                        consultaFim <= consultaInicio
                          ? "—"
                          : disponibilidade.loading
                            ? "…"
                            : `${saldo?.livres ?? 0} un.`}
                      </strong>
                    </div>
                    {e.observacoes && (
                      <p className="mt-3 line-clamp-2 break-words text-xs leading-relaxed text-slate-500">
                        {e.observacoes}
                      </p>
                    )}
                  </Painel>
                )
              })}
            </div>
          ) : (
            <Painel>
              <Vazio
                titulo={
                  busca
                    ? "Nenhum equipamento encontrado"
                    : "Vamos cadastrar a base da URE?"
                }
                texto="Informe os tipos, modelos e quantidades físicas. As reservas usarão esse saldo automaticamente."
                acao={
                  contexto.editar ? (
                    <button
                      type="button"
                      className={PRIMARIO}
                      onClick={() => setFormEquipamento("novo")}
                    >
                      Cadastrar primeiro equipamento
                    </button>
                  ) : undefined
                }
              />
            </Painel>
          )}
        </section>
      )}

      {aba === "reservas" && (
        <section aria-label="Reservas de equipamentos">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Reserva, retirada e devolução
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Acompanhe os equipamentos vinculados a eventos, compromissos e
              demandas.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {reservasFiltradas.map((r) => {
              const a = mapaAtividades.get(r.atividade_id)!,
                e = mapaEquipamentos.get(r.equipamento_id)
              const vencida =
                r.estado === "retirado" &&
                new Date(a.fim).getTime() < Date.now()
              return (
                <Painel key={r.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        {e?.tipo || "Equipamento"}
                      </p>
                      <h3 className="mt-1 break-words font-semibold text-white [overflow-wrap:anywhere]">
                        {e?.nome || "Equipamento não identificado"}
                      </h3>
                    </div>
                    <Tag
                      cor={
                        r.estado === "devolvido"
                          ? STATUS.concluido.cor
                          : vencida
                            ? STATUS.cancelado.cor
                            : STATUS.em_andamento.cor
                      }
                    >
                      {r.quantidade} un. ·{" "}
                      {r.estado === "reservado"
                        ? "Reservadas"
                        : r.estado === "retirado"
                          ? "Em uso"
                          : "Liberadas"}
                    </Tag>
                  </div>
                  <button
                    type="button"
                    className="mt-3 min-h-11 break-words text-left text-sm font-semibold text-cyan-300 [overflow-wrap:anywhere]"
                    onClick={() => setDetalhe(a.id)}
                  >
                    {a.titulo}
                  </button>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {formatarDia(diaSP(a.inicio))} · {horario(a)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.responsavel} · {a.setor}
                  </p>
                  {vencida && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
                      <Icon nome="warning" className="h-4 w-4" />
                      Devolução pendente. Estas unidades continuam ocupadas até
                      a devolução ser registrada.
                    </p>
                  )}
                  {contexto.editar && r.estado !== "devolvido" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                      {r.estado === "reservado" && (
                        <button
                          type="button"
                          className={SECUNDARIO}
                          onClick={() => abrirMovimento(r, "retirar")}
                        >
                          Registrar retirada
                        </button>
                      )}
                      <button
                        type="button"
                        className={
                          r.estado === "retirado" ? PRIMARIO : SECUNDARIO
                        }
                        onClick={() => abrirMovimento(r, "devolver")}
                      >
                        {r.estado === "retirado"
                          ? "Registrar devolução"
                          : "Liberar reserva"}
                      </button>
                    </div>
                  )}
                </Painel>
              )
            })}
          </div>
          {!reservasFiltradas.length && (
            <Painel>
              <Vazio
                titulo="Nenhuma reserva encontrada"
                texto="Ao cadastrar ou editar um registro, selecione os equipamentos e as quantidades necessárias."
              />
            </Painel>
          )}
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4 text-[11px] text-slate-500">
        <span>Calendário SEINTEC / SETEC · Horário de Brasília</span>
        <span>
          {contexto.editar
            ? "Cadastro e gestão habilitados"
            : "Acesso para consulta"}
        </span>
      </footer>
      {formulario && (
        <FormularioAtividade
          cliente={cliente}
          registro={formulario.atividade}
          tipoInicial={formulario.tipo}
          dia={dia}
          nome={contexto.nome}
          equipamentos={equipamentos}
          reservas={reservas}
          fechar={() => setFormulario(null)}
          salvo={() => {
            setFormulario(null)
            sucesso("Registro salvo. Calendário e reservas atualizados.")
          }}
        />
      )}
      {formEquipamento && (
        <FormularioEquipamento
          cliente={cliente}
          equipamento={formEquipamento === "novo" ? undefined : formEquipamento}
          fechar={() => setFormEquipamento(null)}
          salvo={() => {
            setFormEquipamento(null)
            sucesso("Base de equipamentos atualizada.")
          }}
        />
      )}
      {selecionada && !movimento && (
        <Detalhes
          cliente={cliente}
          atividade={selecionada}
          reservas={reservas.filter((r) => r.atividade_id === selecionada.id)}
          equipamentos={mapaEquipamentos}
          editar={contexto.editar}
          fechar={() => setDetalhe(null)}
          abrirEdicao={() => {
            setDetalhe(null)
            setFormulario({ atividade: selecionada, tipo: selecionada.tipo })
          }}
          movimentar={abrirMovimento}
        />
      )}
      {movimento && (
        <Modal
          titulo={
            movimento.acao === "retirar"
              ? "Registrar retirada"
              : movimento.reserva.estado === "retirado"
                ? "Registrar devolução"
                : "Liberar reserva"
          }
          ocupado={movendo}
          fechar={() => {
            if (!movendo) setMovimento(null)
          }}
        >
          <p className="text-sm leading-relaxed text-slate-300">
            {movimento.acao === "retirar"
              ? "Confirme que os equipamentos estão sendo entregues ao responsável."
              : "Confirme que as unidades estão disponíveis novamente na URE."}
          </p>
          <div className="my-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="font-semibold text-white">
              {mapaEquipamentos.get(movimento.reserva.equipamento_id)?.nome}
            </p>
            <p className="mt-2 text-sm text-cyan-300">
              {movimento.reserva.quantidade} unidade(s)
            </p>
          </div>
          {erroMovimento && (
            <p role="alert" className="mb-4 text-sm text-red-300">
              {erroMovimento}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={movendo}
              className={SECUNDARIO}
              onClick={() => setMovimento(null)}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={movendo}
              className={PRIMARIO}
              onClick={() => void movimentar()}
            >
              {movendo ? "Registrando…" : "Confirmar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FormularioAtividade({
  cliente,
  registro,
  tipoInicial,
  dia,
  nome,
  equipamentos,
  reservas,
  fechar,
  salvo,
}: {
  cliente: Cliente
  registro?: Atividade
  tipoInicial: Tipo
  dia: string
  nome: string
  equipamentos: Equipamento[]
  reservas: Reserva[]
  fechar: () => void
  salvo: () => void
}) {
  const [id] = useState(() => registro?.id || crypto.randomUUID())
  const [padrao] = useState(() => {
    const inicioPadrao =
      dia === hojeSP()
        ? inputSP(
            new Date(Math.ceil(Date.now() / 3600000) * 3600000).toISOString(),
          )
        : `${dia}T09:00`
    const fimPadrao =
      dia === hojeSP()
        ? inputSP(
            new Date(
              Math.ceil(Date.now() / 3600000) * 3600000 + 3600000,
            ).toISOString(),
          )
        : `${dia}T10:00`
    return { inicio: inicioPadrao, fim: fimPadrao }
  })
  const [titulo, setTitulo] = useState(registro?.titulo || "")
  const [tipo, setTipo] = useState<Tipo>(registro?.tipo || tipoInicial)
  const [setor, setSetor] = useState<Setor>(registro?.setor || "SETEC")
  const [responsavel, setResponsavel] = useState(registro?.responsavel || nome)
  const [local, setLocal] = useState(registro?.local || "")
  const [status, setStatus] = useState<Status>(registro?.status || "planejado")
  const [prioridade, setPrioridade] = useState(registro?.prioridade || "normal")
  const [inteiro, setInteiro] = useState(registro?.dia_inteiro || false)
  const [inicio, setInicio] = useState(
    registro ? inputSP(registro.inicio) : padrao.inicio,
  )
  const [fim, setFim] = useState(registro ? inputSP(registro.fim) : padrao.fim)
  const [diaInicio, setDiaInicio] = useState(
    registro ? diaSP(registro.inicio) : dia,
  )
  const [diaFim, setDiaFim] = useState(
    registro ? fimDiaAtividade(registro) : dia,
  )
  const [descricao, setDescricao] = useState(registro?.descricao || "")
  const [observacoes, setObservacoes] = useState(registro?.observacoes || "")
  const [selecoes, setSelecoes] = useState<
    Array<{ equipamento_id: string; quantidade: number }>
  >(() =>
    reservas
      .filter(
        (r) => r.atividade_id === registro?.id && r.estado !== "devolvido",
      )
      .map((r) => ({
        equipamento_id: r.equipamento_id,
        quantidade: r.quantidade,
      })),
  )
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const salvando = useRef(false)
  const inicioEfetivo = inteiro
    ? diaInicio
      ? `${diaInicio}T00:00`
      : ""
    : inicio
  const fimEfetivo = inteiro
    ? diaFim
      ? `${somarDias(diaFim, 1)}T00:00`
      : ""
    : fim
  const disp = useDisponibilidade(
    cliente,
    inicioEfetivo,
    fimEfetivo,
    registro?.id || null,
  )
  const ativos = equipamentos.filter((e) => e.ativo)
  const encerrado = ENCERRADOS.includes(status)
  function selecionar(equipamento_id: string, ligado: boolean) {
    setSelecoes((prev) =>
      ligado
        ? [...prev, { equipamento_id, quantidade: 1 }]
        : prev.filter((x) => x.equipamento_id !== equipamento_id),
    )
  }
  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (salvando.current) return
    setErro("")
    if (!titulo.trim() || !responsavel.trim()) {
      setErro("Preencha o título e o responsável.")
      return
    }
    if (
      !inicioEfetivo ||
      !fimEfetivo ||
      fimEfetivo <= inicioEfetivo ||
      (inteiro && (!diaInicio || !diaFim || diaFim < diaInicio))
    ) {
      setErro("Confira as datas: o término deve ser posterior ao início.")
      return
    }
    if (
      selecoes.some((x) => !Number.isInteger(x.quantidade) || x.quantidade < 1)
    ) {
      setErro("Informe quantidades inteiras maiores que zero.")
      return
    }
    if (!encerrado && selecoes.length && (disp.loading || disp.erro)) {
      setErro(
        "Aguarde uma consulta de disponibilidade válida antes de reservar.",
      )
      return
    }
    if (
      !encerrado &&
      selecoes.some(
        (x) =>
          x.quantidade >
          (disp.dados.find((d) => d.id === x.equipamento_id)?.livres ?? 0),
      )
    ) {
      setErro("A quantidade solicitada ultrapassa o saldo livre no período.")
      return
    }
    salvando.current = true
    setOcupado(true)
    try {
      const { error } = await cliente.rpc("seintec_salvar_atividade", {
        p_dados: {
          id,
          versao: registro?.versao ?? null,
          titulo: titulo.trim(),
          tipo,
          setor,
          responsavel: responsavel.trim(),
          local: local.trim(),
          status,
          prioridade,
          inicio: inicioEfetivo,
          fim: fimEfetivo,
          dia_inteiro: inteiro,
          descricao,
          observacoes,
          reservas: selecoes,
        },
      })
      if (error) throw error
      salvo()
    } catch (e) {
      setErro(erroTexto(e))
    } finally {
      salvando.current = false
      setOcupado(false)
    }
  }
  return (
    <Modal
      titulo={
        registro
          ? "Editar registro"
          : tipo === "demanda"
            ? "Nova demanda interna"
            : "Novo registro"
      }
      descricao="O período aparecerá no calendário. Inclua os equipamentos necessários abaixo."
      fechar={fechar}
      ocupado={ocupado}
      largo
    >
      <form onSubmit={enviar} className="space-y-5">
        <Campo nome="Título *" id="atividade-titulo">
          <input
            autoComplete="off"
            id="atividade-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={160}
            required
            className={INPUT}
            placeholder="Ex.: Formação dos diretores — infraestrutura"
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo nome="Tipo" id="atividade-tipo">
            <select
              id="atividade-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
              className={INPUT}
            >
              {Object.entries(TIPOS).map(([v, t]) => (
                <option key={v} value={v}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo nome="Setor" id="atividade-setor">
            <select
              id="atividade-setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value as Setor)}
              className={INPUT}
            >
              {SETORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>
          <Campo nome="Responsável *" id="atividade-responsavel">
            <input
              id="atividade-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              maxLength={160}
              required
              className={INPUT}
            />
          </Campo>
          <Campo nome="Local / unidade" id="atividade-local">
            <input
              id="atividade-local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              maxLength={250}
              className={INPUT}
              placeholder="URE, escola, sala, reunião online…"
            />
          </Campo>
          <Campo nome="Status" id="atividade-status">
            <select
              id="atividade-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className={INPUT}
            >
              {Object.entries(STATUS).map(([v, s]) => (
                <option key={v} value={v}>
                  {s.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo nome="Prioridade" id="atividade-prioridade">
            <select
              id="atividade-prioridade"
              value={prioridade}
              onChange={(e) =>
                setPrioridade(e.target.value as Atividade["prioridade"])
              }
              className={INPUT}
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </Campo>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/30 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">
              Quando acontece?
            </h3>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={inteiro}
                onChange={(e) => setInteiro(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              Dia inteiro
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              nome={tipo === "demanda" ? "Início previsto *" : "Início *"}
              id="atividade-inicio"
            >
              <input
                id="atividade-inicio"
                type={inteiro ? "date" : "datetime-local"}
                value={inteiro ? diaInicio : inicio}
                onChange={(e) =>
                  inteiro
                    ? setDiaInicio(e.target.value)
                    : setInicio(e.target.value)
                }
                required
                className={INPUT}
              />
            </Campo>
            <Campo
              nome={tipo === "demanda" ? "Prazo de entrega *" : "Término *"}
              id="atividade-fim"
            >
              <input
                id="atividade-fim"
                type={inteiro ? "date" : "datetime-local"}
                value={inteiro ? diaFim : fim}
                onChange={(e) =>
                  inteiro ? setDiaFim(e.target.value) : setFim(e.target.value)
                }
                required
                className={INPUT}
              />
            </Campo>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Horário de Brasília. No modo dia inteiro, a data final também faz
            parte do período.
          </p>
        </div>
        <Campo nome="Descrição" id="atividade-descricao">
          <textarea
            id="atividade-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={10000}
            rows={3}
            className={INPUT}
            placeholder="O que precisa acontecer? Qual é a entrega esperada?"
          />
        </Campo>
        <fieldset className="rounded-2xl border border-slate-700 bg-slate-900/30 p-4">
          <legend className="px-2 text-sm font-semibold text-white">
            Reserva de equipamentos
          </legend>
          <p className="mb-4 text-xs leading-relaxed text-slate-400">
            Selecione um ou mais grupos da URE e informe a quantidade. O saldo
            considera o período deste registro.
          </p>
          {!ativos.length ? (
            <p className="text-sm text-slate-500">
              Nenhum equipamento ativo cadastrado. Você pode salvar sem reserva
              e cadastrar a base na aba Equipamentos.
            </p>
          ) : (
            <div className="space-y-2">
              {disp.loading && (
                <p className="mb-3 text-xs text-cyan-300">
                  Consultando disponibilidade…
                </p>
              )}
              {disp.erro && (
                <p role="alert" className="mb-3 text-xs text-red-300">
                  {disp.erro}
                </p>
              )}
              {ativos.map((eq) => {
                const selecao = selecoes.find((x) => x.equipamento_id === eq.id)
                const saldo = disp.dados.find((x) => x.id === eq.id)
                const retirada = reservas.some(
                  (r) =>
                    r.atividade_id === registro?.id &&
                    r.equipamento_id === eq.id &&
                    r.estado === "retirado",
                )
                return (
                  <div
                    key={eq.id}
                    className={`grid min-w-0 grid-cols-[minmax(0,1fr)_80px] items-center gap-3 rounded-xl border p-3 ${selecao ? "border-cyan-500/30 bg-cyan-500/5" : "border-slate-800 bg-slate-950/30"}`}
                  >
                    <label className="flex min-h-11 min-w-0 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selecao)}
                        disabled={retirada || ocupado}
                        onChange={(e) => selecionar(eq.id, e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                      />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-slate-200 [overflow-wrap:anywhere]">
                          {eq.nome}
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                          {eq.tipo}
                          {eq.modelo ? ` · ${eq.modelo}` : ""}
                          {retirada ? " · Em uso" : ""}
                        </span>
                        <span
                          className={`mt-1 block text-xs ${saldo?.livres ? "text-emerald-300" : "text-amber-300"}`}
                        >
                          {disp.loading
                            ? "Consultando…"
                            : saldo
                              ? `${saldo.livres} livres no período`
                              : "Saldo indisponível"}
                        </span>
                      </span>
                    </label>
                    <div>
                      <label
                        htmlFor={`qtd-${eq.id}`}
                        className="mb-1 block text-[10px] text-slate-500"
                      >
                        Quantidade
                      </label>
                      <input
                        id={`qtd-${eq.id}`}
                        aria-label={`Quantidade de ${eq.nome}`}
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        inputMode="numeric"
                        value={selecao?.quantidade ?? ""}
                        disabled={!selecao || retirada || ocupado}
                        onChange={(e) =>
                          setSelecoes((prev) =>
                            prev.map((x) =>
                              x.equipamento_id === eq.id
                                ? { ...x, quantidade: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                        className={`${INPUT} !px-2`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {encerrado && (
            <p className="mt-4 text-xs leading-relaxed text-amber-200">
              Ao concluir ou cancelar, as reservas não retiradas serão
              liberadas. Equipamentos em uso precisam ser devolvidos antes.
            </p>
          )}
        </fieldset>
        <Campo nome="Observações / devolutiva" id="atividade-observacoes">
          <textarea
            id="atividade-observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={5000}
            rows={2}
            className={INPUT}
          />
        </Campo>
        {erro && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-relaxed text-red-200"
          >
            {erro}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-5">
          <button
            type="button"
            onClick={fechar}
            disabled={ocupado}
            className={SECUNDARIO}
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={
              ocupado ||
              (!encerrado &&
                selecoes.length > 0 &&
                (disp.loading || Boolean(disp.erro)))
            }
            className={PRIMARIO}
          >
            <Icon nome="check" />
            {ocupado ? "Salvando…" : "Salvar registro"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FormularioEquipamento({
  cliente,
  equipamento: e,
  fechar,
  salvo,
}: {
  cliente: Cliente
  equipamento?: Equipamento
  fechar: () => void
  salvo: () => void
}) {
  const [id] = useState(() => e?.id || crypto.randomUUID())
  const [nome, setNome] = useState(e?.nome || "")
  const [tipo, setTipo] = useState(e?.tipo || "Notebook")
  const [modelo, setModelo] = useState(e?.modelo || "")
  const [total, setTotal] = useState(e?.quantidade_total ?? 0)
  const [indisponivel, setIndisponivel] = useState(
    e?.quantidade_indisponivel ?? 0,
  )
  const [ativo, setAtivo] = useState(e?.ativo ?? true)
  const [observacoes, setObservacoes] = useState(e?.observacoes || "")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const salvando = useRef(false)
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (salvando.current) return
    if (
      !nome.trim() ||
      !tipo.trim() ||
      !Number.isInteger(total) ||
      !Number.isInteger(indisponivel) ||
      total < 0 ||
      indisponivel < 0 ||
      indisponivel > total
    ) {
      setErro(
        "Informe o nome e quantidades inteiras válidas. A quantidade indisponível não pode superar o total.",
      )
      return
    }
    salvando.current = true
    setOcupado(true)
    setErro("")
    try {
      const { error } = await cliente.rpc("seintec_salvar_equipamento", {
        p_dados: {
          id,
          versao: e?.versao ?? null,
          nome: nome.trim(),
          tipo,
          modelo: modelo.trim(),
          quantidade_total: total,
          quantidade_indisponivel: indisponivel,
          ativo,
          observacoes,
        },
      })
      if (error) throw error
      salvo()
    } catch (erro) {
      setErro(erroTexto(erro))
    } finally {
      salvando.current = false
      setOcupado(false)
    }
  }
  return (
    <Modal
      titulo={e ? "Editar equipamento da URE" : "Cadastrar equipamento da URE"}
      descricao="Registre a quantidade física de um grupo ou modelo. As reservas usarão somente as unidades aptas."
      fechar={fechar}
      ocupado={ocupado}
    >
      <form onSubmit={enviar} className="space-y-5">
        <Campo nome="Nome do grupo *" id="equipamento-nome">
          <input
            id="equipamento-nome"
            className={INPUT}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={160}
            placeholder="Ex.: Notebooks da sala de formação"
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo nome="Tipo" id="equipamento-tipo">
            <select
              id="equipamento-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={INPUT}
            >
              {[...new Set([...CATEGORIAS, tipo])].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Campo>
          <Campo nome="Modelo / marca" id="equipamento-modelo">
            <input
              id="equipamento-modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              maxLength={160}
              className={INPUT}
              placeholder="Ex.: Lenovo ThinkPad"
            />
          </Campo>
          <Campo nome="Quantidade física total *" id="equipamento-total">
            <input
              id="equipamento-total"
              type="number"
              min={0}
              max={100000}
              step={1}
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
              required
              className={INPUT}
            />
          </Campo>
          <Campo
            nome="Indisponíveis"
            id="equipamento-indisponivel"
            dica="Manutenção, avaria ou unidades fora de uso."
          >
            <input
              id="equipamento-indisponivel"
              type="number"
              min={0}
              max={total}
              step={1}
              inputMode="numeric"
              value={indisponivel}
              onChange={(e) => setIndisponivel(Number(e.target.value))}
              required
              className={INPUT}
            />
          </Campo>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <span className="text-sm text-slate-400">
            Unidades aptas para reserva
          </span>
          <strong className="text-xl text-emerald-300">
            {Math.max(0, total - indisponivel)}
          </strong>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Disponível para novas reservas
        </label>
        <Campo nome="Observações" id="equipamento-observacoes">
          <textarea
            id="equipamento-observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={5000}
            rows={3}
            className={INPUT}
          />
        </Campo>
        <p className="text-xs leading-relaxed text-slate-500">
          Reduções de saldo e inativação respeitam as reservas existentes. A
          edição não altera a base de inventário das escolas.
        </p>
        {erro && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
          >
            {erro}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-5">
          <button
            type="button"
            disabled={ocupado}
            className={SECUNDARIO}
            onClick={fechar}
          >
            Voltar
          </button>
          <button type="submit" disabled={ocupado} className={PRIMARIO}>
            {ocupado ? "Salvando…" : "Salvar equipamento"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Detalhes({
  cliente,
  atividade: a,
  reservas,
  equipamentos,
  editar,
  fechar,
  abrirEdicao,
  movimentar,
}: {
  cliente: Cliente
  atividade: Atividade
  reservas: Reserva[]
  equipamentos: Map<string, Equipamento>
  editar: boolean
  fechar: () => void
  abrirEdicao: () => void
  movimentar: (r: Reserva, acao: "retirar" | "devolver") => void
}) {
  const [historico, setHistorico] = useState<Historico[]>([])
  const [erroHistorico, setErroHistorico] = useState("")
  useEffect(() => {
    let vivo = true
    void (async () => {
      const { data, error } = await cliente
        .from("seintec_historico")
        .select("id,acao,usuario_nome,created_at")
        .eq("atividade_id", a.id)
        .order("created_at", { ascending: false })
        .limit(20)
      if (!vivo) return
      if (error) setErroHistorico("Não foi possível carregar o histórico.")
      else setHistorico((data || []) as Historico[])
    })()
    return () => {
      vivo = false
    }
  }, [cliente, a.id, a.versao])
  const nomes: Record<string, string> = {
    registro_cadastrado: "Registro cadastrado",
    registro_atualizado: "Registro atualizado",
    retirada: "Retirada registrada",
    devolucao: "Devolução registrada",
    reserva_liberada: "Reserva liberada",
  }
  return (
    <Modal
      titulo={a.titulo}
      descricao={`${TIPOS[a.tipo].nome} · ${a.setor}`}
      fechar={fechar}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Tag cor={STATUS[a.status].cor}>{STATUS[a.status].nome}</Tag>
          <Tag cor="border-slate-700 bg-slate-800 text-slate-300">
            Prioridade {a.prioridade === "critica" ? "crítica" : a.prioridade}
          </Tag>
          {atrasada(a) && <Tag cor={STATUS.cancelado.cor}>Prazo vencido</Tag>}
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
            <Icon nome="calendar" className="mt-0.5 h-4 w-4 text-cyan-300" />
            {formatarDia(diaSP(a.inicio), true)}
            {diaSP(a.inicio) !== fimDiaAtividade(a)
              ? ` até ${formatarDia(fimDiaAtividade(a), true)}`
              : ""}
          </p>
          <p className="flex items-start gap-2 text-sm text-slate-300">
            <Icon nome="clock" className="h-4 w-4 text-cyan-300" />
            {horario(a)}
          </p>
          <p className="flex items-start gap-2 break-words text-sm text-slate-300 [overflow-wrap:anywhere]">
            <Icon nome="user" className="h-4 w-4 text-cyan-300" />
            {a.responsavel}
          </p>
          {a.local && (
            <p className="flex items-start gap-2 break-words text-sm text-slate-300 [overflow-wrap:anywhere]">
              <Icon nome="pin" className="h-4 w-4 text-cyan-300" />
              {a.local}
            </p>
          )}
        </div>
        {a.descricao && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500">Descrição</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300 [overflow-wrap:anywhere]">
              {a.descricao}
            </p>
          </div>
        )}
        {a.observacoes && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500">
              Observações / devolutiva
            </h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300 [overflow-wrap:anywhere]">
              {a.observacoes}
            </p>
          </div>
        )}
        {reservas.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">
              Equipamentos vinculados
            </h3>
            <div className="space-y-3">
              {reservas.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-700 p-3"
                >
                  <p className="break-words text-sm font-semibold text-slate-200">
                    {equipamentos.get(r.equipamento_id)?.nome || "Equipamento"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.quantidade} un. ·{" "}
                    {r.estado === "retirado"
                      ? "Em uso"
                      : r.estado === "devolvido"
                        ? "Liberadas"
                        : "Reservadas"}
                  </p>
                  {editar && r.estado !== "devolvido" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.estado === "reservado" && (
                        <button
                          type="button"
                          className={SECUNDARIO}
                          onClick={() => movimentar(r, "retirar")}
                        >
                          Registrar retirada
                        </button>
                      )}
                      <button
                        type="button"
                        className={SECUNDARIO}
                        onClick={() => movimentar(r, "devolver")}
                      >
                        {r.estado === "retirado"
                          ? "Registrar devolução"
                          : "Liberar reserva"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-xs font-semibold text-slate-500">
            Últimas movimentações
          </h3>
          {erroHistorico && (
            <p className="mt-2 text-xs text-red-300">{erroHistorico}</p>
          )}
          <div className="mt-3 space-y-3">
            {historico.map((h) => (
              <div key={h.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                <div>
                  <p className="text-xs text-slate-300">
                    {nomes[h.acao] || "Registro atualizado"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {h.usuario_nome} ·{" "}
                    {new Date(h.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {editar && (
          <button
            type="button"
            className={`${PRIMARIO} w-full`}
            onClick={abrirEdicao}
          >
            <Icon nome="edit" />
            Editar registro / status
          </button>
        )}
      </div>
    </Modal>
  )
}
