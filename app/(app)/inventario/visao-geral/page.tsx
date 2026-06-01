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
        .map((e) => getModelo(e)?.equipamento)
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
    const matchModelo = modeloSelecionado
      ? modelo?.equipamento === modeloSelecionado
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
      nome: textoSeguro(modelo?.equipamento),
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
      if (modeloSelecionado && equipamentoBanco?.nome !== modeloSelecionado) return

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
    const modeloNome = textoSeguro(modelo?.equipamento)
    const imagemUrl = textoSeguro(modelo?.imagem_url)
    const anoRecebimento = modelo?.ano_recebimento || ""
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
      if (modeloSelecionado && nomeModelo !== modeloSelecionado) return

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
    <div className="space-y-8 pb-8 min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Visão Executiva da Rede
        </h1>

        <div className="flex w-full flex-col items-stretch gap-3 lg:w-auto">
          <form
            method="GET"
            className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto justify-end"
          >
            <select
              name="ano"
              defaultValue={anoSelecionado}
              className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="">Todo o Histórico (Anos)</option>
              {listaAnos.map((ano) => (
                <option key={ano} value={ano}>
                  Lote {ano}
                </option>
              ))}
            </select>

            <select
              name="escola"
              defaultValue={escolaSelecionada}
              className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500"
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
              defaultValue={modeloSelecionado}
              className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500 max-w-[200px] truncate"
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
              className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="">Todos os Status</option>
              <option value="funcionando">Funcionando</option>
              <option value="aguardando_garantia">Garantia</option>
              <option value="danificados_mau_uso">Mau Uso</option>
              <option value="nao_localizado">Não Localizado</option>
            </select>

            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Filtrar
            </button>
          </form>

          <ExportInventarioButtons
            resumo={{
              escolaSelecionada,
              anoSelecionado,
              modeloSelecionado,
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

      {dadosResponsavel && (
        <div className="bg-[#020617] border border-blue-900/50 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-900/20 rounded-lg hidden sm:block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-blue-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs text-blue-400 font-semibold uppercase tracking-widest mb-1">
                  Inventário respondido por
                </p>
                <p className="text-white text-base sm:text-lg font-bold">
                  {dadosResponsavel.responsavel_nome}
                </p>
                <p className="text-slate-400 text-xs sm:text-sm">
                  {dadosResponsavel.responsavel_cargo}
                </p>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 w-full sm:w-auto">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                Data de Envio
              </p>
              <p className="text-slate-300 font-medium text-sm">
                {formatarData(dadosResponsavel.created_at)}
              </p>
            </div>
          </div>

          {dadosResponsavel.observacao &&
            dadosResponsavel.observacao.trim() !== "" && (
              <div className="mt-2 bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">
                  Observações do Responsável
                </p>
                <p className="text-sm text-slate-300 italic">
                  "{dadosResponsavel.observacao}"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="h-full">
          <Card className="h-full flex flex-col">
            <h2 className="text-lg md:text-xl font-semibold mb-4 shrink-0">
              Ranking de escolas com mais equipamentos
            </h2>

            <div className="space-y-3 h-96 overflow-y-auto pr-2 min-h-0 w-full">
              {rankingOrdenado.map(([escola, total], i) => {
                const widthPercent = (Number(total) / maiorValorRanking) * 100

                return (
                  <div
                    key={String(escola)}
                    className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-12 flex items-center shrink-0"
                  >
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-600/20 transition-all duration-1000"
                      style={{ width: `${widthPercent}%` }}
                    />

                    <div className="relative z-10 flex justify-between w-full px-4 gap-2 items-center">
                      <p className="text-slate-300 text-sm">
                        {i + 1}º {String(escola)}
                      </p>
                      <p className="text-white font-semibold">{Number(total)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="h-full">
          <Card className="h-full flex flex-col">
            <h2 className="text-lg md:text-xl font-semibold mb-4 shrink-0">
              Recertificação e Status (90 Dias)
            </h2>

            <div className="shrink-0">
              <p className="text-sm text-slate-400 mb-2">
                {totalEnviados} / {totalEscolas} escolas enviaram inventário ativo
              </p>

              <div className="w-full bg-slate-800 rounded-full h-4 mb-6">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${progressoInventario}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 h-[20.5rem] overflow-y-auto pr-2 min-h-0 w-full">
              {escolasAtivas.map((escola, i) => (
                <div
                  key={`env-${i}`}
                  className="flex justify-between bg-slate-900 border border-green-800/30 rounded-xl px-4 py-2 gap-2 items-center shrink-0"
                >
                  <p className="text-green-300 text-sm truncate">{escola}</p>
                  <p className="text-green-400 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                    Enviado
                  </p>
                </div>
              ))}

              {escolasPendentesAtualizadas.map((escola, i) => {
                const isVencida = escolasEnviadasAtualizadas.some(
                  (e) => e.escola === escola && e.vencido
                )

                return (
                  <div
                    key={`pend-${i}`}
                    className="flex justify-between bg-slate-900 border border-red-900/30 rounded-xl px-4 py-2 gap-2 items-center shrink-0"
                  >
                    <p className="text-red-300 text-sm truncate">{escola}</p>

                    <div className="flex gap-2 items-center">
                      {isVencida && (
                        <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-red-500/20">
                          Vencido
                        </span>
                      )}

                      <p className="text-red-400 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                        Pendente
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch pt-4">
        <div className="lg:col-span-1 h-full">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <h2 className="text-sm md:text-base font-semibold mb-1 flex items-center gap-2 text-slate-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                Gargalo de Garantia
              </h2>

              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-black text-white">
                  {totalGarantiaGeral}
                </span>
                <span className="text-sm text-slate-400 mb-1">
                  equipamentos parados ({percentualGarantia}%)
                </span>
              </div>
            </div>

            <div className="mt-auto pt-4">
              {alertaGarantia ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">
                    ⚠️ Alto volume de capital travado. Recomenda-se acionar SLAs
                    das empresas contratadas.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-green-400 font-medium">
                    ✔️ Volume de equipamentos parados dentro do tolerável.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 h-full">
          <Card className="h-full flex flex-col">
            <div className="flex justify-between items-end mb-4 shrink-0">
              <h2 className="text-sm md:text-base font-semibold text-slate-300">
                Mapa de Calor: Saúde por UE
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:block">
                Melhor para Pior
              </p>
            </div>

            <div className="flex flex-wrap gap-2 h-36 overflow-y-auto pr-2 content-start min-h-0 w-full">
              {heatmapArray.map((item) => {
                let colorClass =
                  "bg-green-500/10 text-green-400 border-green-500/30"

                if (item.saude < 50) {
                  colorClass = "bg-red-500/10 text-red-400 border-red-500/30"
                } else if (item.saude < 80) {
                  colorClass =
                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                }

                return (
                  <div
                    key={item.escola}
                    className={`px-2 py-1.5 rounded-lg border flex flex-col justify-center items-center cursor-help shrink-0 w-20 sm:w-24 h-16 sm:h-20 transition-colors hover:brightness-125 ${colorClass}`}
                    title={`${item.escola}: ${item.saude}% (${item.recebido} recebidos)`}
                  >
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold truncate w-full text-center leading-tight">
                      {item.escola}
                    </span>
                    <span className="text-sm sm:text-base font-black mt-0.5">
                      {item.saude}%
                    </span>
                  </div>
                )
              })}

              {heatmapArray.length === 0 && (
                <p className="text-sm text-slate-500 w-full text-center py-4 flex-1">
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