import Card from "@/components/ui/Card"
import { createServerSupabase } from "@/lib/supabase-server"
import FiltroVisaoGeral from "@/components/ui/FiltroVisaoGeral"
import ExportInventarioButtons from "./ExportInventarioButtons"

type SearchParams = {
  escola?: string
  ano?: string
  modelo?: string
  status?: string
}

type EquipamentoModelo = {
  id?: string | null
  equipamento?: string | null
  finalidade?: string | null
  imagem_url?: string | null
  ano_recebimento?: number | string | null
  uso?: string | null
  tipo?: string | null
}

type EquipamentoRecebido = {
  id: string
  escola_nome: string | null
  quantidade_recebida: number | null
  equipamentos_modelos?: EquipamentoModelo | EquipamentoModelo[] | null
}

type InventarioItem = {
  modelo_id: string | null
  funcionando: number | null
  aguardando_garantia: number | null
  danificados_mau_uso: number | null
  nao_localizado: number | null
}

type InventarioResposta = {
  id: string
  escola_nome: string | null
  created_at: string
  responsavel_nome: string | null
  responsavel_cargo: string | null
  observacao: string | null
  inventario_itens?: InventarioItem[] | null
}

function getModelo(item: EquipamentoRecebido): EquipamentoModelo | null {
  if (Array.isArray(item.equipamentos_modelos)) {
    return item.equipamentos_modelos[0] || null
  }

  return item.equipamentos_modelos || null
}

function numeroSeguro(value: unknown) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function textoSeguro(value: unknown, fallback = "") {
  const text = String(value || "").trim()
  return text || fallback
}

function normalizar(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}


const N1110_MODELO_32_ID = "0e1e7331-8550-41bd-b1e2-9ba37e6087eb"
const N1110_MODELO_64_ID = "80f610df-bb29-459e-a397-f58a13746fa8"

const N1110_32 = "Notebook Positivo N1110 - 32GB - LOTE 1"
const N1110_64_ANTIGO = "Notebook Positivo N1110 - 64GB - LOTE 1"
const N1110_64_ATUAL = "Notebook Positivo N1110 - 64GB - LOTE 2"

const N1110_CONSOLIDADO = "Notebook Positivo N1110 - LOTES 1 E 2"

function ehN1110Consolidavel(modelo: EquipamentoModelo | null) {
  const modeloId = textoSeguro(modelo?.id)
  const nomeNormalizado = normalizar(modelo?.equipamento)

  if (
    modeloId === N1110_MODELO_32_ID ||
    modeloId === N1110_MODELO_64_ID
  ) {
    return true
  }

  return (
    nomeNormalizado === normalizar(N1110_32) ||
    nomeNormalizado === normalizar(N1110_64_ANTIGO) ||
    nomeNormalizado === normalizar(N1110_64_ATUAL)
  )
}

function nomeModeloInventario(modelo: EquipamentoModelo | null) {
  const nomeOriginal = textoSeguro(modelo?.equipamento)

  return ehN1110Consolidavel(modelo)
    ? N1110_CONSOLIDADO
    : nomeOriginal
}

function nomeFiltroModeloInventario(nome: string) {
  const nomeNormalizado = normalizar(nome)

  if (
    nomeNormalizado === normalizar(N1110_CONSOLIDADO) ||
    nomeNormalizado === normalizar(N1110_32) ||
    nomeNormalizado === normalizar(N1110_64_ANTIGO) ||
    nomeNormalizado === normalizar(N1110_64_ATUAL)
  ) {
    return N1110_CONSOLIDADO
  }

  return nome
}

function formatarData(dataIso: string) {
  if (!dataIso) return ""

  const data = new Date(dataIso)

  if (Number.isNaN(data.getTime())) return ""

  return data.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  })
}

export default async function DiretoriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createServerSupabase()

  const filters = await searchParams
  const escolaSelecionada = filters?.escola || ""
  const anoSelecionado = filters?.ano || ""
  const modeloSelecionado = filters?.modelo || ""
  const modeloSelecionadoEfetivo = nomeFiltroModeloInventario(modeloSelecionado)
  const statusSelecionado = filters?.status || ""

  const { data: equipamentosRaw, error: equipamentosError } = await supabase
    .from("equipamentos_recebidos")
    .select(`
      id,
      escola_nome,
      quantidade_recebida,
      equipamentos_modelos(
        id,
        equipamento,
        finalidade,
        imagem_url,
        ano_recebimento,
        uso,
        tipo
      )
    `)
    .gt("quantidade_recebida", 0)

  if (equipamentosError) {
    console.error("[Diretoria] Erro ao buscar equipamentos:", equipamentosError)
  }

  const equipamentos = (equipamentosRaw || []) as EquipamentoRecebido[]

  const { data: inventariosBrutosRaw, error: inventariosError } = await supabase
    .from("inventario_respostas")
    .select(`
      id,
      escola_nome,
      created_at,
      responsavel_nome,
      responsavel_cargo,
      observacao,
      inventario_itens (
        modelo_id,
        funcionando,
        aguardando_garantia,
        danificados_mau_uso,
        nao_localizado
      )
    `)
    .order("created_at", { ascending: false })

  if (inventariosError) {
    console.error("[Diretoria] Erro ao buscar inventários:", inventariosError)
  }

  const inventariosBrutos = (inventariosBrutosRaw || []) as InventarioResposta[]

  const ultimasRespostasMap = new Map<string, InventarioResposta>()

  inventariosBrutos.forEach((resp) => {
    const escola = textoSeguro(resp.escola_nome)

    if (!escola) return

    if (!ultimasRespostasMap.has(escola)) {
      ultimasRespostasMap.set(escola, resp)
    }
  })

  const inventariosValidos = Array.from(ultimasRespostasMap.values())

  const listaAnos = [
    ...new Set(
      equipamentos
        .map((e) => getModelo(e)?.ano_recebimento)
        .filter(Boolean)
        .map(String)
    ),
  ].sort()

  const listaEscolas = [
    ...new Set(equipamentos.map((e) => textoSeguro(e.escola_nome)).filter(Boolean)),
  ].sort()

  const listaModelos = [
    ...new Set(
      equipamentos
        .map((e) => nomeModeloInventario(getModelo(e)))
        .filter(Boolean)
        .map(String)
    ),
  ].sort()

  const equipamentosFiltrados = equipamentos.filter((e) => {
    const modelo = getModelo(e)

    const matchEscola = escolaSelecionada ? e.escola_nome === escolaSelecionada : true
    const matchAno = anoSelecionado
      ? String(modelo?.ano_recebimento) === anoSelecionado
      : true
    const matchModelo = modeloSelecionadoEfetivo
      ? nomeModeloInventario(modelo) === modeloSelecionadoEfetivo
      : true

    return matchEscola && matchAno && matchModelo
  })

  const respostasFiltradas = escolaSelecionada
    ? inventariosValidos.filter((r) => r.escola_nome === escolaSelecionada)
    : inventariosValidos

  const mapaEquipamentos: Record<
    string,
    {
      nome: string
      finalidade: string
      ano: string
    }
  > = {}

  equipamentos.forEach((item) => {
    const modelo = getModelo(item)

    mapaEquipamentos[String(item.id)] = {
      nome: nomeModeloInventario(modelo),
      finalidade: textoSeguro(modelo?.finalidade),
      ano: textoSeguro(modelo?.ano_recebimento),
    }
  })

  let totalPlataformasRespondidas = 0
  let totalGarantiaGeral = 0

  respostasFiltradas.forEach((resposta) => {
    resposta.inventario_itens?.forEach((item) => {
      const equipamentoBanco = mapaEquipamentos[String(item.modelo_id)]
      const finalidadeLimpa = normalizar(equipamentoBanco?.finalidade)

      if (anoSelecionado && String(equipamentoBanco?.ano) !== anoSelecionado) return
      if (modeloSelecionadoEfetivo && equipamentoBanco?.nome !== modeloSelecionadoEfetivo) return

      let func = numeroSeguro(item.funcionando)
      let gar = numeroSeguro(item.aguardando_garantia)
      let dan = numeroSeguro(item.danificados_mau_uso)
      let nloc = numeroSeguro(item.nao_localizado)

      if (statusSelecionado) {
        if (statusSelecionado !== "funcionando") func = 0
        if (statusSelecionado !== "aguardando_garantia") gar = 0
        if (statusSelecionado !== "danificados_mau_uso") dan = 0
        if (statusSelecionado !== "nao_localizado") nloc = 0
      }

      if (finalidadeLimpa.includes("carregamento")) {
        totalPlataformasRespondidas += func + gar + dan + nloc
      } else {
        totalGarantiaGeral += gar
      }
    })
  })

  let totalEquipamentos = 0
  let totalPlataformasRecebidas = 0

  const ranking: Record<string, number> = {}
  const modelosAgrupados: Record<string, any> = {}
  const saudeEscolasData: Record<
    string,
    {
      recebido: number
      funcionando: number
    }
  > = {}

  equipamentosFiltrados.forEach((item) => {
    const modelo = getModelo(item)

    const finalidade = textoSeguro(modelo?.finalidade)
    const modeloNome = nomeModeloInventario(modelo)
    const imagemUrl = textoSeguro(modelo?.imagem_url)
    const anoRecebimento = ehN1110Consolidavel(modelo)
      ? anoSelecionado || "2021 / 2023"
      : modelo?.ano_recebimento || ""
    const uso = textoSeguro(modelo?.uso)
    const tipo = textoSeguro(modelo?.tipo)
    const quantidade = numeroSeguro(item.quantidade_recebida)
    const escola = textoSeguro(item.escola_nome, "Escola não informada")

    const finalidadeLimpa = normalizar(finalidade)

    if (finalidadeLimpa.includes("carregamento")) {
      totalPlataformasRecebidas += quantidade
    } else {
      totalEquipamentos += quantidade

      if (!ranking[escola]) ranking[escola] = 0
      ranking[escola] += quantidade

      if (!saudeEscolasData[escola]) {
        saudeEscolasData[escola] = {
          recebido: 0,
          funcionando: 0,
        }
      }

      saudeEscolasData[escola].recebido += quantidade
    }

    if (modeloNome) {
      if (!modelosAgrupados[modeloNome]) {
        modelosAgrupados[modeloNome] = {
          recebido: 0,
          respondido: 0,
          funcionando: 0,
          garantia: 0,
          danificados: 0,
          nao_localizado: 0,
          imagem_url: imagemUrl,
          ano_recebimento: anoRecebimento,
          uso,
          tipo,
          finalidade,
        }
      }

      modelosAgrupados[modeloNome].recebido += quantidade
    }
  })

  respostasFiltradas.forEach((resposta) => {
    resposta.inventario_itens?.forEach((item) => {
      const equipamentoBanco = mapaEquipamentos[String(item.modelo_id)]
      const nomeModelo = equipamentoBanco?.nome

      if (anoSelecionado && String(equipamentoBanco?.ano) !== anoSelecionado) return
      if (modeloSelecionadoEfetivo && nomeModelo !== modeloSelecionadoEfetivo) return

      let func = numeroSeguro(item.funcionando)
      let gar = numeroSeguro(item.aguardando_garantia)
      let dan = numeroSeguro(item.danificados_mau_uso)
      let nloc = numeroSeguro(item.nao_localizado)

      if (statusSelecionado) {
        if (statusSelecionado !== "funcionando") func = 0
        if (statusSelecionado !== "aguardando_garantia") gar = 0
        if (statusSelecionado !== "danificados_mau_uso") dan = 0
        if (statusSelecionado !== "nao_localizado") nloc = 0
      }

      const finalidadeLimpa = normalizar(equipamentoBanco?.finalidade)

      if (!finalidadeLimpa.includes("carregamento") && func > 0) {
        const escola = textoSeguro(resposta.escola_nome)

        if (saudeEscolasData[escola]) {
          saudeEscolasData[escola].funcionando += func
        }
      }

      if (nomeModelo && modelosAgrupados[nomeModelo]) {
        const somaRespondida = func + gar + dan + nloc

        modelosAgrupados[nomeModelo].respondido += somaRespondida
        modelosAgrupados[nomeModelo].funcionando += func
        modelosAgrupados[nomeModelo].garantia += gar
        modelosAgrupados[nomeModelo].danificados += dan
        modelosAgrupados[nomeModelo].nao_localizado += nloc
      }
    })
  })

  const rankingOrdenado = Object.entries(ranking).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  )

  const maiorValorRanking =
    rankingOrdenado.length > 0 ? Number(rankingOrdenado[0][1]) : 1

  const escolasComEquipamentos = [
    ...new Set(
      equipamentos.map((e) => textoSeguro(e.escola_nome)).filter(Boolean)
    ),
  ]

  const dataCorte = new Date()
  dataCorte.setDate(dataCorte.getDate() - 90)

  const escolasEnviadasAtualizadas: {
    escola: string
    vencido: boolean
  }[] = []

  inventariosValidos.forEach((resp) => {
    const escola = textoSeguro(resp.escola_nome)
    if (!escola) return

    const dataResposta = new Date(resp.created_at)

    if (dataResposta > dataCorte) {
      escolasEnviadasAtualizadas.push({
        escola,
        vencido: false,
      })
    } else {
      escolasEnviadasAtualizadas.push({
        escola,
        vencido: true,
      })
    }
  })

  const escolasAtivas = escolasEnviadasAtualizadas
    .filter((e) => !e.vencido)
    .map((e) => e.escola)

  const escolasPendentesAtualizadas = escolasComEquipamentos.filter(
    (escola) => !escolasAtivas.includes(escola)
  )

  const totalEscolas = escolaSelecionada
    ? escolasComEquipamentos.includes(escolaSelecionada)
      ? 1
      : 0
    : escolasComEquipamentos.length

  const totalEnviados = escolaSelecionada
    ? escolasAtivas.includes(escolaSelecionada)
      ? 1
      : 0
    : escolasAtivas.length

  const progressoInventario =
    totalEscolas > 0 ? Math.round((totalEnviados / totalEscolas) * 100) : 0

  const dadosResponsavel =
    escolaSelecionada && respostasFiltradas.length > 0 ? respostasFiltradas[0] : null

  const percentualGarantia =
    totalEquipamentos > 0
      ? ((totalGarantiaGeral / totalEquipamentos) * 100).toFixed(1)
      : "0"

  const alertaGarantia = Number(percentualGarantia) >= 5

  const heatmapArray = Object.keys(saudeEscolasData)
    .map((escola) => {
      const data = saudeEscolasData[escola]
      const saude =
        data.recebido > 0 ? Math.round((data.funcionando / data.recebido) * 100) : 0

      return {
        escola,
        saude,
        recebido: data.recebido,
        funcionando: data.funcionando,
      }
    })
    .filter((e) => e.recebido > 0)
    .sort((a, b) => b.saude - a.saude)

  const modelosExportacao = Object.entries(modelosAgrupados)
    .map(([modelo, dados]: any) => ({
      modelo,
      recebido: numeroSeguro(dados.recebido),
      respondido: numeroSeguro(dados.respondido),
      funcionando: numeroSeguro(dados.funcionando),
      garantia: numeroSeguro(dados.garantia),
      danificados: numeroSeguro(dados.danificados),
      naoLocalizado: numeroSeguro(dados.nao_localizado),
      ano: textoSeguro(dados.ano_recebimento, "-"),
      uso: textoSeguro(dados.uso, "-"),
      tipo: textoSeguro(dados.tipo, "-"),
      finalidade: textoSeguro(dados.finalidade, "-"),
    }))
    .sort((a, b) => b.recebido - a.recebido)

  const rankingExportacao = rankingOrdenado.map(([escola, total], index) => ({
    posicao: index + 1,
    escola: String(escola),
    total: Number(total),
  }))

  const recertificacaoExportacao = escolasComEquipamentos
    .map((escola) => {
      const ativa = escolasAtivas.includes(escola)
      const vencida = escolasEnviadasAtualizadas.some(
        (item) => item.escola === escola && item.vencido
      )

      return {
        escola,
        status: ativa ? "Enviado" : vencida ? "Vencido" : "Pendente",
      }
    })
    .sort((a, b) => a.escola.localeCompare(b.escola))

  const responsavelExportacao = dadosResponsavel
    ? {
        escola: textoSeguro(dadosResponsavel.escola_nome, escolaSelecionada),
        responsavel: textoSeguro(dadosResponsavel.responsavel_nome, "Não informado"),
        cargo: textoSeguro(dadosResponsavel.responsavel_cargo, "Não informado"),
        dataEnvio: formatarData(dadosResponsavel.created_at),
        observacao: textoSeguro(dadosResponsavel.observacao, "Sem observações"),
      }
    : null

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1750px] flex-col gap-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#020617] p-5 shadow-2xl shadow-slate-950/20 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                Inventário Tecnológico
              </span>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Visão Executiva
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Visão Executiva da Rede
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-400">
              Panorama consolidado do parque tecnológico, recertificação das unidades,
              garantia e saúde dos equipamentos da rede.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto xl:min-w-[520px]">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-300/80">Equipamentos</p>
              <p className="mt-2 text-2xl font-black text-white">{totalEquipamentos}</p>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300/80">Plataformas</p>
              <p className="mt-2 text-2xl font-black text-white">{totalPlataformasRecebidas}</p>
            </div>

            <div className={`rounded-2xl border p-4 ${
              progressoInventario >= 80
                ? "border-emerald-500/20 bg-emerald-500/10"
                : progressoInventario >= 50
                  ? "border-yellow-500/20 bg-yellow-500/10"
                  : "border-red-500/20 bg-red-500/10"
            }`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Recertificação</p>
              <p className="mt-2 text-2xl font-black text-white">{progressoInventario}%</p>
            </div>

            <div className={`rounded-2xl border p-4 ${
              alertaGarantia
                ? "border-red-500/20 bg-red-500/10"
                : "border-emerald-500/20 bg-emerald-500/10"
            }`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Em garantia</p>
              <p className="mt-2 text-2xl font-black text-white">{totalGarantiaGeral}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-[#020617] p-4 shadow-xl shadow-slate-950/20 md:p-5">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
              Filtros da visão
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Refine a análise por lote, escola, modelo ou situação do equipamento.
            </p>
          </div>

          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            {escolaSelecionada || anoSelecionado || modeloSelecionado || statusSelecionado
              ? "Filtro aplicado"
              : "Visão consolidada"}
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-3 xl:flex-row xl:items-end xl:justify-between">
          <form
            method="GET"
            className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[170px_minmax(240px,1.35fr)_minmax(220px,1fr)_190px_auto]"
          >
            <select
              name="ano"
              defaultValue={anoSelecionado}
              className="min-h-[48px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
            >
              <option value="">Todo o Histórico</option>
              {listaAnos.map((ano) => (
                <option key={ano} value={ano}>
                  Lote {ano}
                </option>
              ))}
            </select>

            <select
              name="escola"
              defaultValue={escolaSelecionada}
              className="min-h-[48px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
            >
              <option value="">Todas as UEs</option>
              {listaEscolas.map((escola) => (
                <option key={escola} value={escola}>
                  {escola}
                </option>
              ))}
            </select>

            <select
              name="modelo"
              defaultValue={modeloSelecionadoEfetivo}
              className="min-h-[48px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
            >
              <option value="">Todos os Modelos</option>
              {listaModelos.map((modelo) => (
                <option key={modelo} value={modelo}>
                  {modelo}
                </option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={statusSelecionado}
              className="min-h-[48px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
            >
              <option value="">Todos os Status</option>
              <option value="funcionando">Funcionando</option>
              <option value="aguardando_garantia">Garantia</option>
              <option value="danificados_mau_uso">Mau Uso</option>
              <option value="nao_localizado">Não Localizado</option>
            </select>

            <button
              type="submit"
              className="min-h-[48px] rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500"
            >
              Aplicar filtros
            </button>
          </form>

          <div className="shrink-0">
            <ExportInventarioButtons
              resumo={{
                escolaSelecionada,
                anoSelecionado,
                modeloSelecionado: modeloSelecionadoEfetivo,
                statusSelecionado,
                totalEquipamentos,
                totalPlataformasRecebidas,
                totalPlataformasRespondidas,
                totalGarantiaGeral,
                percentualGarantia,
                totalEscolas,
                totalEnviados,
                progressoInventario,
              }}
              modelos={modelosExportacao}
              ranking={rankingExportacao}
              recertificacao={recertificacaoExportacao}
              saude={heatmapArray}
              responsavel={responsavelExportacao}
            />
          </div>
        </div>
      </section>

      {dadosResponsavel && (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/20 bg-[#020617] p-5 shadow-xl shadow-blue-950/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_35%)]" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 sm:flex">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  Inventário respondido por
                </p>
                <p className="mt-1 truncate text-lg font-black text-white">
                  {dadosResponsavel.responsavel_nome}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {dadosResponsavel.responsavel_cargo}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 sm:text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                Data de envio
              </p>
              <p className="mt-1 text-sm font-bold text-slate-300">
                {formatarData(dadosResponsavel.created_at)}
              </p>
            </div>
          </div>

          {dadosResponsavel.observacao &&
            dadosResponsavel.observacao.trim() !== "" && (
              <div className="relative z-10 mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                  Observações do responsável
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                  {dadosResponsavel.observacao}
                </p>
              </div>
            )}
        </div>
      )}

      <div className="[&_button[class*='bg-green']]:hidden [&_button[class*='bg-emerald']]:hidden [&_a[class*='bg-green']]:hidden [&_a[class*='bg-emerald']]:hidden">
        <FiltroVisaoGeral
          modelosAgrupados={modelosAgrupados}
          totalPlataformasRecebidas={totalPlataformasRecebidas}
          totalPlataformasRespondidas={totalPlataformasRespondidas}
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <div className="h-full">
          <Card className="h-full flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-3 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                  Distribuição
                </p>
                <h2 className="mt-1 text-lg font-black text-white md:text-xl">
                  Ranking de escolas com mais equipamentos
                </h2>
              </div>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                {rankingOrdenado.length} UEs
              </span>
            </div>

            <div className="min-h-0 h-96 w-full space-y-2.5 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:#475569_transparent] [scrollbar-width:thin]">
              {rankingOrdenado.map(([escola, total], i) => {
                const widthPercent = (Number(total) / maiorValorRanking) * 100

                return (
                  <div
                    key={String(escola)}
                    className="group relative flex min-h-[54px] shrink-0 items-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 transition hover:border-blue-500/30 hover:bg-slate-900"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600/25 to-cyan-500/5 transition-all duration-700"
                      style={{ width: `${widthPercent}%` }}
                    />

                    <div className="relative z-10 flex w-full items-center gap-3 px-4 py-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                        i === 0
                          ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                          : i === 1
                            ? "border-slate-600 bg-slate-800 text-slate-300"
                            : i === 2
                              ? "border-orange-500/25 bg-orange-500/10 text-orange-300"
                              : "border-blue-500/20 bg-blue-500/10 text-blue-300"
                      }`}>
                        {i + 1}
                      </span>

                      <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-300 group-hover:text-white" title={String(escola)}>
                        {String(escola)}
                      </p>

                      <p className="shrink-0 text-lg font-black text-white">
                        {Number(total)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="h-full">
          <Card className="h-full flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-3 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Recertificação
                </p>
                <h2 className="mt-1 text-lg font-black text-white md:text-xl">
                  Status do inventário — 90 dias
                </h2>
              </div>

              <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                progressoInventario >= 80
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : progressoInventario >= 50
                    ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
                    : "border-red-500/25 bg-red-500/10 text-red-300"
              }`}>
                {progressoInventario}%
              </span>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-400">
                  {totalEnviados} / {totalEscolas} escolas com inventário ativo
                </p>
                <p className="text-sm font-black text-white">{progressoInventario}%</p>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    progressoInventario >= 80
                      ? "bg-emerald-500"
                      : progressoInventario >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${progressoInventario}%` }}
                />
              </div>
            </div>

            <div className="mt-4 min-h-0 h-[20.5rem] w-full space-y-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:#475569_transparent] [scrollbar-width:thin]">
              {escolasAtivas.map((escola, i) => (
                <div
                  key={`env-${i}`}
                  className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-2.5"
                >
                  <p className="min-w-0 truncate text-sm font-bold text-slate-300">{escola}</p>
                  <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                    Em dia
                  </span>
                </div>
              ))}

              {escolasPendentesAtualizadas.map((escola, i) => {
                const isVencida = escolasEnviadasAtualizadas.some(
                  (e) => e.escola === escola && e.vencido
                )

                return (
                  <div
                    key={`pend-${i}`}
                    className={`flex shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
                      isVencida
                        ? "border-red-500/20 bg-red-500/[0.05]"
                        : "border-yellow-500/20 bg-yellow-500/[0.05]"
                    }`}
                  >
                    <p className="min-w-0 truncate text-sm font-bold text-slate-300">{escola}</p>

                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                      isVencida
                        ? "border-red-500/25 bg-red-500/10 text-red-300"
                        : "border-yellow-500/25 bg-yellow-500/10 text-yellow-300"
                    }`}>
                      {isVencida ? "Vencido" : "Pendente"}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 pt-1 lg:grid-cols-3">
        <div className="h-full lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                    Garantia
                  </p>
                  <h2 className="mt-1 text-base font-black text-white md:text-lg">
                    Gargalo de Garantia
                  </h2>
                </div>

                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                  alertaGarantia
                    ? "border-red-500/25 bg-red-500/10 text-red-300"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                }`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-5 flex items-end gap-3">
                <span className="text-5xl font-black tracking-tight text-white">
                  {totalGarantiaGeral}
                </span>
                <div className="pb-1">
                  <p className="text-sm font-bold text-slate-300">equipamentos parados</p>
                  <p className={`mt-0.5 text-xs font-black ${alertaGarantia ? "text-red-300" : "text-emerald-300"}`}>
                    {percentualGarantia}% do parque
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-5">
              {alertaGarantia ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
                  <p className="text-xs font-medium leading-relaxed text-red-300">
                    ⚠️ Alto volume de capital travado. Recomenda-se acionar SLAs das empresas contratadas.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                  <p className="text-xs font-medium leading-relaxed text-emerald-300">
                    ✔️ Volume de equipamentos parados dentro do tolerável.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="h-full lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="mb-4 flex flex-col gap-2 shrink-0 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  Saúde por unidade
                </p>
                <h2 className="mt-1 text-base font-black text-white md:text-lg">
                  Mapa de Calor: Saúde por UE
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">80–100%</span>
                <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-yellow-300">50–79%</span>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-red-300">0–49%</span>
              </div>
            </div>

            <div className="flex h-40 min-h-0 w-full flex-wrap content-start gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:#475569_transparent] [scrollbar-width:thin]">
              {heatmapArray.map((item) => {
                let colorClass =
                  "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"

                if (item.saude < 50) {
                  colorClass = "bg-red-500/10 text-red-300 border-red-500/25"
                } else if (item.saude < 80) {
                  colorClass =
                    "bg-yellow-500/10 text-yellow-300 border-yellow-500/25"
                }

                return (
                  <div
                    key={item.escola}
                    className={`flex h-20 w-24 shrink-0 cursor-help flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition hover:-translate-y-0.5 hover:brightness-125 ${colorClass}`}
                    title={`${item.escola}: ${item.saude}% (${item.recebido} recebidos)`}
                  >
                    <span className="w-full truncate text-[9px] font-black uppercase leading-tight">
                      {item.escola}
                    </span>
                    <span className="mt-1 text-lg font-black">
                      {item.saude}%
                    </span>
                    <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest opacity-60">
                      {item.funcionando}/{item.recebido}
                    </span>
                  </div>
                )
              })}

              {heatmapArray.length === 0 && (
                <p className="flex w-full flex-1 items-center justify-center py-4 text-center text-sm text-slate-500">
                  Aguardando dados das escolas para gerar mapa.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
