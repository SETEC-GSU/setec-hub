"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import {
  AlertCircle,
  Check,
  Database,
  Edit2,
  History,
  ImageIcon,
  Laptop,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

type EquipamentoModelo = {
  id: string
  equipamento: string | null
  tipo?: string | null
  marca?: string | null
  uso?: string | null
  finalidade?: string | null
  ano_recebimento?: number | string | null
  imagem_url?: string | null
  created_at?: string | null
}

type Escola = {
  id?: string | null
  nome_escola: string | null
  cie?: string | null
}

type EquipamentoRecebido = {
  id: string
  escola_nome: string | null
  quantidade_recebida: number | null
  modelo_id: string | null
  created_at?: string | null
  equipamentos_modelos?: EquipamentoModelo | EquipamentoModelo[] | null
}

type UsuarioAtual = {
  id: string | null
  nome: string | null
  email: string | null
  role: string | null
}

type EquipamentoLog = {
  id: string
  equipamento_recebido_id: string | null
  escola_nome: string | null
  modelo_id: string | null
  equipamento_nome: string | null
  acao: string
  quantidade_anterior: number | null
  quantidade_nova: number | null
  diferenca: number | null
  usuario_id: string | null
  usuario_nome: string | null
  usuario_email: string | null
  detalhes?: Record<string, unknown> | null
  created_at: string
}

type MensagemTela = {
  tipo: "success" | "error" | "info" | "warning"
  texto: string
} | null

type ModalAtivo = "novo" | "editar" | "deletar" | "modelo" | null

type PanoramaAlteracoes = {
  total: number
  criacoes: number
  incrementos: number
  edicoes: number
  exclusoes: number
  saldoQuantidade: number
  escolas: number
  ultimaAlteracao: string | null
}

const supabase = createClient()

function textoSeguro(value: unknown, fallback = "Não informado") {
  const text = String(value || "").trim()
  return text || fallback
}

function numeroSeguro(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function normalizar(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function formatarDataHora(value?: string | null) {
  if (!value) return "Sem registro"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Sem registro"

  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getModelo(item: EquipamentoRecebido): EquipamentoModelo | null {
  if (Array.isArray(item.equipamentos_modelos)) {
    return item.equipamentos_modelos[0] || null
  }

  return item.equipamentos_modelos || null
}

function getModeloLabel(modelo?: EquipamentoModelo | null) {
  if (!modelo) return "Modelo não identificado"

  const partes = [modelo.equipamento, modelo.marca, modelo.ano_recebimento]
    .map((parte) => String(parte || "").trim())
    .filter(Boolean)

  return partes.join(" • ") || "Modelo não identificado"
}

function getAcaoLabel(acao: string) {
  const labels: Record<string, string> = {
    modelo_criado: "Modelo criado",
    recebimento_criado: "Recebimento criado",
    recebimento_incrementado: "Recebimento incrementado",
    recebimento_editado: "Quantidade editada",
    recebimento_excluido: "Registro excluído",
  }

  return labels[acao] || acao
}

function getAcaoClass(acao: string) {
  if (acao.includes("criado")) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  if (acao.includes("incrementado")) return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
  if (acao.includes("editado")) return "border-blue-500/25 bg-blue-500/10 text-blue-300"
  if (acao.includes("excluido")) return "border-red-500/25 bg-red-500/10 text-red-300"

  return "border-slate-700 bg-slate-900 text-slate-400"
}

function isCarregamento(modelo?: EquipamentoModelo | null) {
  return normalizar(modelo?.finalidade).includes("carregamento")
}

function getInitials(name?: string | null) {
  const clean = textoSeguro(name, "")

  if (!clean) return "SE"

  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function calcularPanorama(logs: EquipamentoLog[]): PanoramaAlteracoes {
  const escolas = new Set(logs.map((log) => textoSeguro(log.escola_nome, "")).filter(Boolean))

  return {
    total: logs.length,
    criacoes: logs.filter((log) => log.acao.includes("criado")).length,
    incrementos: logs.filter((log) => log.acao.includes("incrementado")).length,
    edicoes: logs.filter((log) => log.acao.includes("editado")).length,
    exclusoes: logs.filter((log) => log.acao.includes("excluido")).length,
    saldoQuantidade: logs.reduce((acc, log) => acc + numeroSeguro(log.diferenca), 0),
    escolas: escolas.size,
    ultimaAlteracao: logs[0]?.created_at || null,
  }
}

export default function GestaoEquipamentosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null)
  const [escolas, setEscolas] = useState<string[]>([])
  const [modelos, setModelos] = useState<EquipamentoModelo[]>([])
  const [equipamentosRecebidos, setEquipamentosRecebidos] = useState<EquipamentoRecebido[]>([])
  const [logs, setLogs] = useState<EquipamentoLog[]>([])
  const [logsPanorama, setLogsPanorama] = useState<EquipamentoLog[]>([])

  const [escolaSelecionada, setEscolaSelecionada] = useState("")
  const [buscaModelo, setBuscaModelo] = useState("")
  const [buscaEscola, setBuscaEscola] = useState("")
  const [filtroFinalidade, setFiltroFinalidade] = useState("todas")

  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [logsDisponiveis, setLogsDisponiveis] = useState(true)
  const [mensagem, setMensagem] = useState<MensagemTela>(null)

  const [modalAtivo, setModalAtivo] = useState<ModalAtivo>(null)
  const [itemSelecionado, setItemSelecionado] = useState<EquipamentoRecebido | null>(null)

  const [formEscola, setFormEscola] = useState("")
  const [formModeloId, setFormModeloId] = useState("")
  const [formQuantidade, setFormQuantidade] = useState<number | "">("")

  const [novoModeloNome, setNovoModeloNome] = useState("")
  const [novoModeloMarca, setNovoModeloMarca] = useState("")
  const [novoModeloFinalidade, setNovoModeloFinalidade] = useState("")
  const [novoModeloAno, setNovoModeloAno] = useState("")
  const [novoModeloUso, setNovoModeloUso] = useState("")
  const [novoModeloTipo, setNovoModeloTipo] = useState("")
  const [novoModeloImagem, setNovoModeloImagem] = useState("")

  const modelosPorId = useMemo(() => {
    return new Map(modelos.map((modelo) => [String(modelo.id), modelo]))
  }, [modelos])

  const escolasFiltradas = useMemo(() => {
    const termo = normalizar(buscaEscola)

    if (!termo) return escolas

    return escolas.filter((escola) => normalizar(escola).includes(termo))
  }, [buscaEscola, escolas])

  const equipamentosFiltrados = useMemo(() => {
    const termo = normalizar(buscaModelo)

    return equipamentosRecebidos
      .filter((item) => {
        const modelo = getModelo(item)
        const finalidade = normalizar(modelo?.finalidade)

        const matchFinalidade =
          filtroFinalidade === "todas" ||
          (filtroFinalidade === "carregamento" && finalidade.includes("carregamento")) ||
          (filtroFinalidade === "equipamentos" && !finalidade.includes("carregamento"))

        if (!matchFinalidade) return false

        if (!termo) return true

        const busca = [
          modelo?.equipamento,
          modelo?.marca,
          modelo?.tipo,
          modelo?.uso,
          modelo?.finalidade,
          modelo?.ano_recebimento,
          item.escola_nome,
        ]
          .map(normalizar)
          .join(" ")

        return busca.includes(termo)
      })
      .sort((a, b) => {
        const modeloA = getModeloLabel(getModelo(a))
        const modeloB = getModeloLabel(getModelo(b))
        return modeloA.localeCompare(modeloB, "pt-BR")
      })
  }, [buscaModelo, equipamentosRecebidos, filtroFinalidade])

  const totais = useMemo(() => {
    const totalGeral = equipamentosRecebidos.reduce(
      (acc, item) => acc + numeroSeguro(item.quantidade_recebida),
      0
    )

    const totalSemCarregamento = equipamentosRecebidos.reduce((acc, item) => {
      const modelo = getModelo(item)
      if (isCarregamento(modelo)) return acc
      return acc + numeroSeguro(item.quantidade_recebida)
    }, 0)

    const totalCarregamento = totalGeral - totalSemCarregamento

    const modelosUnicos = new Set(
      equipamentosRecebidos.map((item) => item.modelo_id).filter(Boolean)
    ).size

    return {
      totalGeral,
      totalSemCarregamento,
      totalCarregamento,
      modelosUnicos,
      registros: equipamentosRecebidos.length,
    }
  }, [equipamentosRecebidos])

  const totalFiltrado = useMemo(() => {
    return equipamentosFiltrados.reduce(
      (acc, item) => acc + numeroSeguro(item.quantidade_recebida),
      0
    )
  }, [equipamentosFiltrados])

  const panorama = useMemo(() => calcularPanorama(logsPanorama), [logsPanorama])

  const carregarUsuarioAtual = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUsuarioAtual(null)
      return null
    }

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id, nome, email, role")
      .eq("id", user.id)
      .maybeSingle()

    const usuario: UsuarioAtual = {
      id: user.id,
      nome: perfil?.nome || user.email || "Usuário",
      email: perfil?.email || user.email || null,
      role: perfil?.role || null,
    }

    setUsuarioAtual(usuario)
    return usuario
  }, [])

  const carregarLogs = useCallback(
    async (escola = escolaSelecionada) => {
      setLoadingLogs(true)

      try {
        let queryHistorico = supabase
          .from("equipamentos_recebidos_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(escola ? 10 : 8)

        let queryPanorama = supabase
          .from("equipamentos_recebidos_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300)

        if (escola) {
          queryHistorico = queryHistorico.eq("escola_nome", escola)
          queryPanorama = queryPanorama.eq("escola_nome", escola)
        }

        const [historicoResult, panoramaResult] = await Promise.all([
          queryHistorico,
          queryPanorama,
        ])

        if (historicoResult.error) {
          const message = historicoResult.error.message?.toLowerCase() || ""

          if (message.includes("does not exist") || message.includes("schema cache")) {
            setLogsDisponiveis(false)
            setLogs([])
            setLogsPanorama([])
            return
          }

          throw historicoResult.error
        }

        if (panoramaResult.error) {
          throw panoramaResult.error
        }

        setLogsDisponiveis(true)
        setLogs((historicoResult.data || []) as EquipamentoLog[])
        setLogsPanorama((panoramaResult.data || []) as EquipamentoLog[])
      } catch (error) {
        console.error("[Gestão de Equipamentos] Erro ao carregar logs:", error)
        setLogs([])
        setLogsPanorama([])
      } finally {
        setLoadingLogs(false)
      }
    },
    [escolaSelecionada]
  )

  const carregarDadosBase = useCallback(async () => {
    setLoadingBase(true)
    setMensagem(null)

    try {
      await carregarUsuarioAtual()

      const [modelosResult, escolasResult, recebidosResult] = await Promise.all([
        supabase
          .from("equipamentos_modelos")
          .select("*")
          .order("equipamento", { ascending: true }),
        supabase
          .from("escolas")
          .select("nome_escola, cie")
          .order("nome_escola", { ascending: true }),
        supabase
          .from("equipamentos_recebidos")
          .select("escola_nome"),
      ])

      if (modelosResult.error) throw modelosResult.error

      const modelosData = ((modelosResult.data || []) as EquipamentoModelo[]).sort(
        (a, b) => textoSeguro(a.equipamento).localeCompare(textoSeguro(b.equipamento), "pt-BR")
      )

      setModelos(modelosData)

      const escolasDaTabelaEscolas = (escolasResult.data || [])
        .map((item: Escola) => textoSeguro(item.nome_escola, ""))
        .filter(Boolean)

      const escolasComRecebimento = (recebidosResult.data || [])
        .map((item: { escola_nome: string | null }) => textoSeguro(item.escola_nome, ""))
        .filter(Boolean)

      const unicas = Array.from(
        new Set([...escolasDaTabelaEscolas, ...escolasComRecebimento])
      ).sort((a, b) => a.localeCompare(b, "pt-BR"))

      setEscolas(unicas)

      if (escolasResult.error) {
        setMensagem({
          tipo: "warning",
          texto:
            "A lista de escolas foi carregada com fallback pelos recebimentos. Verifique o SELECT/RLS da tabela escolas quando possível.",
        })
      }
    } catch (error: any) {
      console.error("[Gestão de Equipamentos] Erro ao carregar base:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Não foi possível carregar a base de equipamentos.",
      })
    } finally {
      setLoadingBase(false)
    }
  }, [carregarUsuarioAtual])

  const carregarEquipamentosEscola = useCallback(async (escola: string) => {
    if (!escola) {
      setEquipamentosRecebidos([])
      return
    }

    setLoadingEquipamentos(true)
    setMensagem(null)

    try {
      const { data, error } = await supabase
        .from("equipamentos_recebidos")
        .select(`
          id,
          escola_nome,
          quantidade_recebida,
          modelo_id,
          created_at,
          equipamentos_modelos (
            id,
            equipamento,
            tipo,
            marca,
            uso,
            finalidade,
            ano_recebimento,
            imagem_url
          )
        `)
        .eq("escola_nome", escola)
        .order("created_at", { ascending: false })

      if (error) throw error

      setEquipamentosRecebidos((data || []) as EquipamentoRecebido[])
    } catch (error: any) {
      console.error("[Gestão de Equipamentos] Erro ao buscar equipamentos:", error)
      setEquipamentosRecebidos([])
      setMensagem({
        tipo: "error",
        texto: error?.message || "Erro ao buscar equipamentos da escola selecionada.",
      })
    } finally {
      setLoadingEquipamentos(false)
    }
  }, [])

  useEffect(() => {
    carregarDadosBase()
  }, [carregarDadosBase])

  useEffect(() => {
    if (!escolaSelecionada) {
      setEquipamentosRecebidos([])
      carregarLogs("")
      return
    }

    carregarEquipamentosEscola(escolaSelecionada)
    carregarLogs(escolaSelecionada)
  }, [carregarEquipamentosEscola, carregarLogs, escolaSelecionada])

  useEffect(() => {
    if (!mensagem) return

    const timer = window.setTimeout(() => {
      setMensagem(null)
    }, 6000)

    return () => window.clearTimeout(timer)
  }, [mensagem])

  async function registrarLog(params: {
    equipamento_recebido_id?: string | null
    escola_nome: string
    modelo_id?: string | null
    equipamento_nome?: string | null
    acao: string
    quantidade_anterior?: number | null
    quantidade_nova?: number | null
    detalhes?: Record<string, unknown>
  }) {
    if (!logsDisponiveis) return

    try {
      const anterior = params.quantidade_anterior ?? null
      const nova = params.quantidade_nova ?? null
      const diferenca =
        anterior !== null && nova !== null ? numeroSeguro(nova) - numeroSeguro(anterior) : null

      const { error } = await supabase.from("equipamentos_recebidos_logs").insert({
        equipamento_recebido_id: params.equipamento_recebido_id || null,
        escola_nome: params.escola_nome,
        modelo_id: params.modelo_id || null,
        equipamento_nome: params.equipamento_nome || null,
        acao: params.acao,
        quantidade_anterior: anterior,
        quantidade_nova: nova,
        diferenca,
        usuario_id: usuarioAtual?.id || null,
        usuario_nome: usuarioAtual?.nome || null,
        usuario_email: usuarioAtual?.email || null,
        detalhes: params.detalhes || null,
      })

      if (error) throw error
    } catch (error) {
      console.error("[Gestão de Equipamentos] Falha ao registrar log:", error)
    }
  }

  function limparFormularioRecebimento() {
    setFormEscola(escolaSelecionada || "")
    setFormModeloId("")
    setFormQuantidade("")
  }

  function limparFormularioModelo() {
    setNovoModeloNome("")
    setNovoModeloMarca("")
    setNovoModeloFinalidade("")
    setNovoModeloAno("")
    setNovoModeloUso("")
    setNovoModeloTipo("")
    setNovoModeloImagem("")
  }

  function fecharModais() {
    setModalAtivo(null)
    setItemSelecionado(null)
    setSalvando(false)
  }

  function abrirModalNovoModelo() {
    limparFormularioModelo()
    setModalAtivo("modelo")
  }

  function abrirModalNovo() {
    limparFormularioRecebimento()
    setModalAtivo("novo")
  }

  function abrirModalEdit(item: EquipamentoRecebido) {
    setItemSelecionado(item)
    setFormQuantidade(numeroSeguro(item.quantidade_recebida))
    setModalAtivo("editar")
  }

  function abrirModalDelete(item: EquipamentoRecebido) {
    setItemSelecionado(item)
    setModalAtivo("deletar")
  }

  async function handleSalvarNovoModelo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nome = novoModeloNome.trim()

    if (!nome) {
      setMensagem({ tipo: "error", texto: "Informe o nome do equipamento." })
      return
    }

    const ano = novoModeloAno.trim() ? Number(novoModeloAno) : null

    if (ano !== null && !Number.isFinite(ano)) {
      setMensagem({ tipo: "error", texto: "O ano/lote precisa ser numérico." })
      return
    }

    setSalvando(true)

    try {
      const { data, error } = await supabase
        .from("equipamentos_modelos")
        .insert({
          equipamento: nome,
          marca: novoModeloMarca.trim() || null,
          finalidade: novoModeloFinalidade.trim() || null,
          ano_recebimento: ano,
          uso: novoModeloUso.trim() || null,
          tipo: novoModeloTipo.trim() || null,
          imagem_url: novoModeloImagem.trim() || null,
        })
        .select("*")
        .single()

      if (error) throw error

      const novoModelo = data as EquipamentoModelo

      setModelos((prev) =>
        [...prev, novoModelo].sort((a, b) =>
          textoSeguro(a.equipamento).localeCompare(textoSeguro(b.equipamento), "pt-BR")
        )
      )

      await registrarLog({
        escola_nome: escolaSelecionada || "BASE DE MODELOS",
        modelo_id: novoModelo.id,
        equipamento_nome: getModeloLabel(novoModelo),
        acao: "modelo_criado",
        detalhes: {
          tipo: novoModelo.tipo,
          uso: novoModelo.uso,
          finalidade: novoModelo.finalidade,
          ano_recebimento: novoModelo.ano_recebimento,
        },
      })

      setMensagem({ tipo: "success", texto: "Modelo base cadastrado com sucesso." })
      fecharModais()
      await carregarLogs(escolaSelecionada)
    } catch (error: any) {
      console.error("[Gestão de Equipamentos] Erro ao criar modelo:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Erro ao criar modelo base.",
      })
      setSalvando(false)
    }
  }

  async function handleSalvarNovo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const escolaClean = formEscola.trim()
    const modeloIdSelecionado = formModeloId.trim()
    const qtdNum = Number(formQuantidade)

    if (!escolaClean || !modeloIdSelecionado || !Number.isFinite(qtdNum) || qtdNum <= 0) {
      setMensagem({
        tipo: "error",
        texto: "Preencha escola, modelo e uma quantidade maior que zero.",
      })
      return
    }

    setSalvando(true)

    try {
      const modeloCompleto = modelosPorId.get(modeloIdSelecionado) || null

      const { data: existente, error: existenteError } = await supabase
        .from("equipamentos_recebidos")
        .select("*")
        .eq("escola_nome", escolaClean)
        .eq("modelo_id", modeloIdSelecionado)
        .maybeSingle()

      if (existenteError) throw existenteError

      let registroSalvo: EquipamentoRecebido
      let acao = "recebimento_criado"
      let quantidadeAnterior = 0

      if (existente) {
        quantidadeAnterior = numeroSeguro(existente.quantidade_recebida)
        const novaQuantidade = quantidadeAnterior + qtdNum

        const { data, error } = await supabase
          .from("equipamentos_recebidos")
          .update({ quantidade_recebida: novaQuantidade })
          .eq("id", existente.id)
          .select("id, escola_nome, quantidade_recebida, modelo_id, created_at")
          .single()

        if (error) throw error

        registroSalvo = {
          ...(data as EquipamentoRecebido),
          equipamentos_modelos: modeloCompleto,
        }
        acao = "recebimento_incrementado"
      } else {
        const { data, error } = await supabase
          .from("equipamentos_recebidos")
          .insert({
            escola_nome: escolaClean,
            modelo_id: modeloIdSelecionado,
            quantidade_recebida: qtdNum,
          })
          .select("id, escola_nome, quantidade_recebida, modelo_id, created_at")
          .single()

        if (error) throw error

        registroSalvo = {
          ...(data as EquipamentoRecebido),
          equipamentos_modelos: modeloCompleto,
        }
      }

      await registrarLog({
        equipamento_recebido_id: registroSalvo.id,
        escola_nome: escolaClean,
        modelo_id: modeloIdSelecionado,
        equipamento_nome: getModeloLabel(modeloCompleto),
        acao,
        quantidade_anterior: quantidadeAnterior,
        quantidade_nova: numeroSeguro(registroSalvo.quantidade_recebida),
        detalhes: {
          quantidade_informada: qtdNum,
          escola_selecionada_no_filtro: escolaSelecionada || null,
        },
      })

      if (!escolas.includes(escolaClean)) {
        setEscolas((prev) => [...prev, escolaClean].sort((a, b) => a.localeCompare(b, "pt-BR")))
      }

      if (escolaClean !== escolaSelecionada) {
        setEscolaSelecionada(escolaClean)
      } else {
        await carregarEquipamentosEscola(escolaClean)
      }

      await carregarLogs(escolaClean)

      setMensagem({
        tipo: "success",
        texto:
          acao === "recebimento_incrementado"
            ? "Recebimento já existente: quantidade somada e rastreada com sucesso."
            : "Recebimento registrado e sincronizado com sucesso.",
      })

      fecharModais()
    } catch (error: any) {
      console.error("[Gestão de Equipamentos] Erro ao salvar recebimento:", error)
      setMensagem({
        tipo: "error",
        texto: error?.message || "Erro ao salvar recebimento.",
      })
      setSalvando(false)
    }
  }

  async function handleSalvarEdicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!itemSelecionado) return

    const qtdNum = Number(formQuantidade)

    if (!Number.isFinite(qtdNum) || qtdNum < 0) {
      setMensagem({ tipo: "error", texto: "Informe uma quantidade válida, igual ou maior que zero." })
      return
    }

    setSalvando(true)

    try {
      const quantidadeAnterior = numeroSeguro(itemSelecionado.quantidade_recebida)
      const modelo = getModelo(itemSelecionado)

      const { error } = await supabase
        .from("equipamentos_recebidos")
        .update({ quantidade_recebida: qtdNum })
        .eq("id", itemSelecionado.id)

      if (error) throw error

      await registrarLog({
        equipamento_recebido_id: itemSelecionado.id,
        escola_nome: textoSeguro(itemSelecionado.escola_nome, escolaSelecionada),
        modelo_id: itemSelecionado.modelo_id,
        equipamento_nome: getModeloLabel(modelo),
        acao: "recebimento_editado",
        quantidade_anterior: quantidadeAnterior,
        quantidade_nova: qtdNum,
      })

      await carregarEquipamentosEscola(escolaSelecionada)
      await carregarLogs(escolaSelecionada)

      setMensagem({ tipo: "success", texto: "Quantidade atualizada com rastreabilidade." })
      fecharModais()
    } catch (error: any) {
      console.error("[Gestão de Equipamentos] Erro ao editar:", error)
      setMensagem({ tipo: "error", texto: error?.message || "Erro ao atualizar quantidade." })
      setSalvando(false)
    }
  }

  async function handleDeletar() {
    if (!itemSelecionado) return

    setSalvando(true)

    try {
      const quantidadeAnterior = numeroSeguro(itemSelecionado.quantidade_recebida)
      const modelo = getModelo(itemSelecionado)
      const escolaNome = textoSeguro(itemSelecionado.escola_nome, escolaSelecionada)

      const { data, error } = await supabase
        .from("equipamentos_recebidos")
        .delete()
        .eq("id", itemSelecionado.id)
        .select("id")

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error(
          "O registro não foi excluído. Verifique as policies de DELETE da tabela equipamentos_recebidos."
        )
      }

      await registrarLog({
        equipamento_recebido_id: itemSelecionado.id,
        escola_nome: escolaNome,
        modelo_id: itemSelecionado.modelo_id,
        equipamento_nome: getModeloLabel(modelo),
        acao: "recebimento_excluido",
        quantidade_anterior: quantidadeAnterior,
        quantidade_nova: 0,
      })

      await carregarEquipamentosEscola(escolaSelecionada)
      await carregarLogs(escolaSelecionada)

      setMensagem({ tipo: "success", texto: "Registro excluído e ação registrada no histórico." })
      fecharModais()
    } catch (error: any) {
      console.error("[Gestão de Equipamentos] Erro ao excluir:", error)
      setMensagem({ tipo: "error", texto: error?.message || "Erro ao excluir registro." })
      setSalvando(false)
    }
  }

  async function recarregarTudo() {
    await carregarDadosBase()
    if (escolaSelecionada) {
      await carregarEquipamentosEscola(escolaSelecionada)
    }
    await carregarLogs(escolaSelecionada)
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-blue-500/20 bg-[#020617] p-5 shadow-2xl shadow-blue-950/10 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_32%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Gestão
              </span>
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Equipamentos
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Inventário sincronizado
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Gestão de <span className="text-blue-400">Equipamentos</span>
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
              Controle central de modelos e recebimentos por unidade escolar, mantendo a base
              sincronizada com inventário, visão geral e painéis estratégicos do SETEC Hub.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
            <MiniStat label="Modelos base" value={modelos.length} tone="blue" />
            <MiniStat label="Escolas" value={escolas.length} tone="cyan" />
            <MiniStat label="Registros" value={totais.registros} tone="purple" />
            <MiniStat label="Total UE" value={totais.totalGeral} tone="emerald" />
          </div>
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
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

      <section className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="min-w-0">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-400">
                <Search size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-black text-white">Consulta por unidade escolar</h2>
                <p className="text-sm font-medium text-slate-500">
                  Selecione uma escola para visualizar, editar e rastrear os recebimentos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(160px,0.78fr)_minmax(280px,1.28fr)_minmax(390px,auto)]">
              <input
                value={buscaEscola}
                onChange={(event) => setBuscaEscola(event.target.value)}
                placeholder="Filtrar escola..."
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              />

              <select
                value={escolaSelecionada}
                onChange={(event) => setEscolaSelecionada(event.target.value)}
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                disabled={loadingBase}
              >
                <option value="">
                  {loadingBase ? "Carregando escolas..." : "Selecione para visualizar os equipamentos..."}
                </option>
                {escolasFiltradas.map((escola) => (
                  <option key={escola} value={escola}>
                    {escola}
                  </option>
                ))}
              </select>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 2xl:w-[390px]">
                <button
                  type="button"
                  onClick={abrirModalNovoModelo}
                  className="inline-flex min-h-[52px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
                >
                  <PackagePlus size={16} />
                  <span>Novo modelo</span>
                </button>

                <button
                  type="button"
                  onClick={abrirModalNovo}
                  className="inline-flex min-h-[52px] min-w-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>Registrar</span>
                </button>

                <button
                  type="button"
                  onClick={recarregarTudo}
                  disabled={loadingBase || loadingEquipamentos}
                  className="inline-flex min-h-[52px] min-w-0 items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loadingBase || loadingEquipamentos ? "animate-spin" : ""} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="flex min-h-full items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck size={22} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-black text-white">Rastreabilidade ativa</h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                Histórico técnico com usuário, data, ação e impacto da alteração.
              </p>

              {!logsDisponiveis && (
                <div className="mt-4 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-xs font-bold leading-relaxed text-yellow-200">
                  Execute o SQL de rastreabilidade para ativar o histórico persistente.
                </div>
              )}
            </div>
          </div>
        </Panel>
      </section>

      <PanoramaAlteracoesCard
        panorama={panorama}
        escolaSelecionada={escolaSelecionada}
        loading={loadingLogs}
        logsDisponiveis={logsDisponiveis}
      />

      {escolaSelecionada ? (
        <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Total recebido" value={totais.totalGeral} subtitle="Todos os itens da UE" color="blue" />
              <KpiCard title="Sem carregamento" value={totais.totalSemCarregamento} subtitle="Base de equipamentos" color="cyan" />
              <KpiCard title="Carregamento" value={totais.totalCarregamento} subtitle="Plataformas / carrinhos" color="purple" />
              <KpiCard title="Modelos únicos" value={totais.modelosUnicos} subtitle="Tipos vinculados" color="emerald" />
            </section>

            <Panel>
              <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                    Unidade selecionada
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {escolaSelecionada}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {equipamentosRecebidos.length} registro(s) vinculados • {totalFiltrado} unidade(s) no filtro atual
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[520px]">
                  <input
                    value={buscaModelo}
                    onChange={(event) => setBuscaModelo(event.target.value)}
                    placeholder="Buscar modelo, marca, tipo..."
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  />

                  <select
                    value={filtroFinalidade}
                    onChange={(event) => setFiltroFinalidade(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  >
                    <option value="todas">Todas as finalidades</option>
                    <option value="equipamentos">Somente equipamentos</option>
                    <option value="carregamento">Somente carregamento</option>
                  </select>
                </div>
              </div>

              {loadingEquipamentos ? (
                <LoadingBox texto="Carregando equipamentos da unidade..." />
              ) : equipamentosFiltrados.length === 0 ? (
                <EmptyBox
                  title="Nenhum equipamento encontrado"
                  description="Registre o primeiro recebimento ou ajuste os filtros aplicados."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {equipamentosFiltrados.map((item) => {
                    const modelo = getModelo(item)

                    return (
                      <article
                        key={item.id}
                        className="group relative overflow-hidden rounded-[1.65rem] border border-slate-800 bg-gradient-to-br from-slate-950/95 via-[#020617] to-slate-950/80 p-4 shadow-lg shadow-slate-950/20 transition-all duration-300 hover:-translate-y-[1px] hover:border-blue-500/35 hover:shadow-blue-950/20 sm:p-5"
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
                          <div className="absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-cyan-500/5 blur-3xl" />
                        </div>

                        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-stretch xl:justify-between">
                          <div className="flex min-w-0 flex-1 gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-[#020617] shadow-inner sm:h-[72px] sm:w-[72px]">
                              {modelo?.imagem_url ? (
                                <img
                                  src={modelo.imagem_url}
                                  alt={modelo.equipamento || "Equipamento"}
                                  className="h-full w-full object-contain bg-white p-1.5"
                                />
                              ) : (
                                <ImageIcon className="text-slate-600" size={24} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="break-words text-lg font-black leading-tight text-white sm:text-xl">
                                {modelo?.equipamento || "Modelo desconhecido"}
                              </h3>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {modelo?.marca && <Chip>{modelo.marca}</Chip>}
                                {modelo?.tipo && <Chip>{modelo.tipo}</Chip>}
                                {modelo?.uso && <Chip>{modelo.uso}</Chip>}
                                {modelo?.ano_recebimento && (
                                  <Chip>Lote {modelo.ano_recebimento}</Chip>
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                                <span>Finalidade: {modelo?.finalidade || "Não informada"}</span>
                                {item.created_at && (
                                  <>
                                    <span className="text-slate-700">•</span>
                                    <span>Registrado em {formatarDataHora(item.created_at)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[160px_minmax(0,1fr)] xl:w-[405px] xl:shrink-0">
                            <div className="flex min-h-[96px] flex-col items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-center shadow-inner shadow-blue-950/20">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300/80">
                                Quantidade
                              </p>
                              <p className="mt-2 text-4xl font-black leading-none text-white">
                                {numeroSeguro(item.quantidade_recebida)}
                              </p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                unidade(s)
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                              <button
                                type="button"
                                onClick={() => abrirModalEdit(item)}
                                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-blue-300 transition hover:border-blue-500/40 hover:bg-blue-500/20"
                                title="Editar quantidade"
                              >
                                <Edit2 size={15} />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => abrirModalDelete(item)}
                                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-red-300 transition hover:border-red-500/40 hover:bg-red-500/20"
                                title="Excluir registro"
                              >
                                <Trash2 size={15} />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Últimas alterações</h2>
                    <p className="text-xs font-medium text-slate-500">
                      Rastreabilidade da escola selecionada.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => carregarLogs(escolaSelecionada)}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 transition hover:text-cyan-300"
                  title="Atualizar histórico"
                >
                  <RefreshCw size={16} className={loadingLogs ? "animate-spin" : ""} />
                </button>
              </div>

              <HistoricoAlteracoes logs={logs} loading={loadingLogs} logsDisponiveis={logsDisponiveis} />
            </Panel>

            <Panel>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Integração com inventário</h2>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                    Esta base alimenta as páginas de inventário e visão geral. Evite excluir registros
                    já utilizados historicamente, salvo em caso de correção necessária.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5">
          <Panel>
            <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-slate-800 bg-slate-950 text-slate-500">
                <Search size={34} />
              </div>
              <h2 className="text-2xl font-black text-white">Selecione uma escola</h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
                Após selecionar a unidade, serão exibidos os recebimentos, indicadores e últimas
                alterações vinculadas à escola. Enquanto nenhuma escola estiver selecionada, o
                histórico abaixo exibe o panorama geral de registros recentes.
              </p>
            </div>
          </Panel>

          <Panel>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Alterações gerais</h2>
                  <p className="text-xs font-medium text-slate-500">
                    Últimos registros de rastreabilidade de todas as escolas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => carregarLogs("")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-cyan-300"
                title="Atualizar histórico geral"
              >
                <RefreshCw size={16} className={loadingLogs ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>

            <HistoricoAlteracoes logs={logs} loading={loadingLogs} logsDisponiveis={logsDisponiveis} variant="grid" />
          </Panel>
        </section>
      )}

      {modalAtivo === "modelo" && (
        <Modal title="Cadastrar Modelo Base" icon={<Laptop className="text-blue-400" />} onClose={fecharModais} maxWidth="max-w-3xl">
          <form onSubmit={handleSalvarNovoModelo} className="space-y-5">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm font-medium leading-relaxed text-blue-100/80">
              Cadastre a matriz do equipamento. Depois disso, o modelo poderá ser vinculado aos recebimentos das escolas.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome do equipamento *">
                <input value={novoModeloNome} onChange={(e) => setNovoModeloNome(e.target.value)} placeholder="Ex.: Notebook Ultra Multilaser" className="input-field" required />
              </Field>

              <Field label="Marca / Modelo">
                <input value={novoModeloMarca} onChange={(e) => setNovoModeloMarca(e.target.value)} placeholder="Ex.: Multilaser Ultra UB522" className="input-field" />
              </Field>

              <Field label="Finalidade">
                <input value={novoModeloFinalidade} onChange={(e) => setNovoModeloFinalidade(e.target.value)} placeholder="Ex.: Aluno, Professor, Carregamento" className="input-field" />
              </Field>

              <Field label="Ano / Lote">
                <input value={novoModeloAno} onChange={(e) => setNovoModeloAno(e.target.value)} placeholder="Ex.: 2024" inputMode="numeric" className="input-field" />
              </Field>

              <Field label="Uso">
                <input value={novoModeloUso} onChange={(e) => setNovoModeloUso(e.target.value)} placeholder="Ex.: Pedagógico" className="input-field" />
              </Field>

              <Field label="Tipo">
                <input value={novoModeloTipo} onChange={(e) => setNovoModeloTipo(e.target.value)} placeholder="Ex.: Notebook, Chromebook, Tablet" className="input-field" />
              </Field>

              <div className="md:col-span-2">
                <Field label="URL da imagem">
                  <input value={novoModeloImagem} onChange={(e) => setNovoModeloImagem(e.target.value)} placeholder="https://..." className="input-field" />
                </Field>
              </div>
            </div>

            <ModalActions onCancel={fecharModais} saving={salvando} submitLabel="Salvar modelo" />
          </form>
        </Modal>
      )}

      {modalAtivo === "novo" && (
        <Modal title="Registrar Recebimento" icon={<Plus className="text-blue-400" />} onClose={fecharModais} maxWidth="max-w-3xl">
          <form onSubmit={handleSalvarNovo} className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Unidade escolar *">
                <input
                  value={formEscola}
                  onChange={(e) => setFormEscola(e.target.value)}
                  list="lista-escolas-gestao-equipamentos"
                  placeholder="Digite ou selecione a escola..."
                  className="input-field"
                  required
                />
                <datalist id="lista-escolas-gestao-equipamentos">
                  {escolas.map((escola) => (
                    <option key={escola} value={escola} />
                  ))}
                </datalist>
              </Field>

              <Field label="Modelo do equipamento *">
                <select value={formModeloId} onChange={(e) => setFormModeloId(e.target.value)} className="input-field" required>
                  <option value="">Selecione o modelo cadastrado...</option>
                  {modelos.map((modelo) => (
                    <option key={modelo.id} value={modelo.id}>
                      {getModeloLabel(modelo)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Quantidade entregue *">
                <input
                  type="number"
                  min="1"
                  value={formQuantidade}
                  onChange={(e) => setFormQuantidade(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex.: 30"
                  className="input-field"
                  required
                />
              </Field>
            </div>

            <ModalActions onCancel={fecharModais} saving={salvando} submitLabel="Salvar recebimento" />
          </form>
        </Modal>
      )}

      {modalAtivo === "editar" && itemSelecionado && (
        <Modal title="Editar Quantidade" icon={<Edit2 className="text-blue-400" />} onClose={fecharModais} maxWidth="max-w-lg">
          <form onSubmit={handleSalvarEdicao} className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Registro selecionado</p>
              <p className="mt-2 font-black text-white">{getModeloLabel(getModelo(itemSelecionado))}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{itemSelecionado.escola_nome}</p>
            </div>

            <Field label="Nova quantidade">
              <input
                type="number"
                min="0"
                value={formQuantidade}
                onChange={(e) => setFormQuantidade(e.target.value === "" ? "" : Number(e.target.value))}
                className="input-field text-xl font-black"
                required
              />
            </Field>

            <ModalActions onCancel={fecharModais} saving={salvando} submitLabel="Atualizar quantidade" />
          </form>
        </Modal>
      )}

      {modalAtivo === "deletar" && itemSelecionado && (
        <Modal title="Confirmar Exclusão" icon={<Trash2 className="text-red-400" />} onClose={fecharModais} maxWidth="max-w-lg">
          <div className="space-y-5">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-medium leading-relaxed text-red-100/85">
              Esta ação remove o recebimento da base usada pelo inventário e visão geral. Use somente para correções necessárias.
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-black text-white">{getModeloLabel(getModelo(itemSelecionado))}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{itemSelecionado.escola_nome}</p>
              <p className="mt-3 text-2xl font-black text-red-300">{numeroSeguro(itemSelecionado.quantidade_recebida)} unidade(s)</p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={fecharModais} disabled={salvando} className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60">
                Cancelar
              </button>
              <button type="button" onClick={handleDeletar} disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-700">
                {salvando ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Sim, excluir
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input-field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(51 65 85 / 1);
          background: rgb(15 23 42 / 0.75);
          padding: 0.9rem 1rem;
          color: white;
          outline: none;
          font-size: 0.875rem;
          font-weight: 700;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .input-field:focus {
          border-color: rgb(59 130 246 / 0.7);
          box-shadow: 0 0 0 1px rgb(59 130 246 / 0.45);
          background: rgb(15 23 42 / 0.95);
        }
      `}</style>
    </div>
  )
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-xl shadow-slate-950/20 md:p-6 ${className}`}>
      {children}
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "blue" | "cyan" | "purple" | "emerald"
}) {
  const colors = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500",
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white md:text-3xl">{value}</p>
      <div className={`mt-3 h-1 rounded-full ${colors[tone]}`} />
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: number
  subtitle: string
  color: "blue" | "cyan" | "purple" | "emerald"
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  }

  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-xl ${styles[color]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{subtitle}</p>
    </div>
  )
}

function PanoramaAlteracoesCard({
  panorama,
  escolaSelecionada,
  loading,
  logsDisponiveis,
}: {
  panorama: PanoramaAlteracoes
  escolaSelecionada: string
  loading: boolean
  logsDisponiveis: boolean
}) {
  return (
    <Panel>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.15fr] xl:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/10 text-purple-300">
            <History size={22} />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
              Panorama de alterações
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              {escolaSelecionada ? "Panorama da escola selecionada" : "Panorama geral de todas as escolas"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
              {logsDisponiveis
                ? escolaSelecionada
                  ? `Indicadores consolidados das alterações registradas para ${escolaSelecionada}.`
                  : "Quando nenhuma escola está selecionada, o painel consolida as rastreabilidades gerais. Ao selecionar uma escola, os indicadores são filtrados automaticamente pela unidade."
                : "A tabela de rastreabilidade ainda não está disponível. Execute o SQL para ativar este painel."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <PanoramaMini label="Alterações" value={loading ? "..." : panorama.total} color="blue" />
          <PanoramaMini label="Criações" value={loading ? "..." : panorama.criacoes} color="emerald" />
          <PanoramaMini label="Incrementos" value={loading ? "..." : panorama.incrementos} color="cyan" />
          <PanoramaMini label="Edições" value={loading ? "..." : panorama.edicoes} color="purple" />
          <PanoramaMini label="Exclusões" value={loading ? "..." : panorama.exclusoes} color="red" />
          <PanoramaMini label="Saldo qtd." value={loading ? "..." : panorama.saldoQuantidade} color="emerald" />
          <PanoramaMini label="Escolas" value={loading ? "..." : panorama.escolas} color="cyan" />
          <PanoramaMini
            label="Última"
            value={loading ? "..." : panorama.ultimaAlteracao ? formatarDataHora(panorama.ultimaAlteracao) : "Sem registro"}
            color="slate"
            compact
          />
        </div>
      </div>
    </Panel>
  )
}

function PanoramaMini({
  label,
  value,
  color,
  compact = false,
}: {
  label: string
  value: string | number
  color: "blue" | "emerald" | "cyan" | "purple" | "red" | "slate"
  compact?: boolean
}) {
  const styles = {
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    slate: "border-slate-700 bg-slate-900/70 text-slate-300",
  }

  return (
    <div className={`rounded-2xl border p-4 ${styles[color]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className={`${compact ? "mt-2 text-[11px] leading-tight" : "mt-2 text-2xl"} font-black text-white`}>
        {value}
      </p>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {children}
    </span>
  )
}

function HistoricoAlteracoes({
  logs,
  loading,
  logsDisponiveis,
  variant = "stack",
}: {
  logs: EquipamentoLog[]
  loading: boolean
  logsDisponiveis: boolean
  variant?: "stack" | "grid"
}) {
  if (!logsDisponiveis) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-5 text-center text-sm font-medium text-slate-500">
        Execute o SQL de rastreabilidade para ativar o histórico persistente.
      </div>
    )
  }

  if (loading) {
    return <LoadingBox texto="Carregando últimas alterações..." compact />
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-5 text-center text-sm font-medium text-slate-500">
        Nenhuma alteração registrada para este recorte.
      </div>
    )
  }

  return (
    <div className={variant === "grid" ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
      {logs.map((log) => (
        <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getAcaoClass(log.acao)}`}>
              {getAcaoLabel(log.acao)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {formatarDataHora(log.created_at)}
            </span>
          </div>

          <p className="text-sm font-black text-white">
            {log.equipamento_nome || "Equipamento não informado"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {log.escola_nome || "Escola não informada"}
          </p>

          {(log.quantidade_anterior !== null || log.quantidade_nova !== null) && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <LogMini label="Antes" value={log.quantidade_anterior ?? "-"} />
              <LogMini label="Depois" value={log.quantidade_nova ?? "-"} />
              <LogMini label="Dif." value={log.diferenca ?? "-"} />
            </div>
          )}

          <p className="mt-3 text-[11px] font-semibold text-slate-600">
            Por {log.usuario_nome || log.usuario_email || "usuário não identificado"}
          </p>
        </div>
      ))}
    </div>
  )
}

function LogMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020617] p-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function LoadingBox({ texto, compact = false }: { texto: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 text-slate-400 ${compact ? "p-5" : "p-14"}`}>
      <Loader2 className="animate-spin text-blue-400" size={22} />
      <p className="text-sm font-bold">{texto}</p>
    </div>
  )
}

function EmptyBox({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-800 bg-slate-950 p-12 text-center">
      <AlertCircle className="mb-4 text-slate-600" size={42} />
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm font-medium text-slate-500">{description}</p>
    </div>
  )
}

function Modal({
  title,
  icon,
  onClose,
  children,
  maxWidth,
}: {
  title: string
  icon: ReactNode
  onClose: () => void
  children: ReactNode
  maxWidth: string
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
      <div className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-[2rem] border border-slate-700 bg-[#020617] shadow-2xl`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#020617]">
              {icon}
            </div>
            <h2 className="text-xl font-black text-white">{title}</h2>
          </div>

          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-84px)] overflow-y-auto p-5 md:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function ModalActions({
  onCancel,
  saving,
  submitLabel,
}: {
  onCancel: () => void
  saving: boolean
  submitLabel: string
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
        {saving ? "Salvando..." : submitLabel}
      </button>
    </div>
  )
}
