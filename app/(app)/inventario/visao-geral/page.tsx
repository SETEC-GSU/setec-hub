import Card from "@/components/ui/Card"
import { createServerSupabase } from "@/lib/supabase-server"

export default async function DiretoriaPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ escola?: string }> 
}) {

  const supabase = await createServerSupabase()
  
  const filters = await searchParams
  const escolaSelecionada = filters?.escola || ""

  // 1. EQUIPAMENTOS RECEBIDOS (Agora buscando o ID da própria tabela para cruzar com o inventário)
  const { data: equipamentos } = await supabase
    .from("equipamentos_recebidos")
    .select(`
      id,
      escola_nome,
      quantidade_recebida,
      equipamentos_modelos(
        id,
        equipamento,
        finalidade
      )
    `)
    .gt("quantidade_recebida", 0)

  // 2. INVENTÁRIOS ENVIADOS COM SEUS ITENS
  const { data: inventariosBrutos } = await supabase
    .from("inventario_respostas")
    .select(`
      id,
      escola_nome,
      created_at,
      inventario_itens (
        modelo_id,
        funcionando,
        aguardando_garantia,
        danificados_mau_uso,
        nao_localizado
      )
    `)
    .order("created_at", { ascending: false })

  // --- LÓGICA DE DEDUPLICAÇÃO (Última resposta por escola) ---
  const ultimasRespostasMap = new Map()
  inventariosBrutos?.forEach((resp: any) => {
    if (!ultimasRespostasMap.has(resp.escola_nome)) {
      ultimasRespostasMap.set(resp.escola_nome, resp)
    }
  })
  const inventariosValidos = Array.from(ultimasRespostasMap.values())

  // --- FILTROS DE SEGMENTAÇÃO ---
  const equipamentosFiltrados = escolaSelecionada
    ? equipamentos?.filter((e: any) => e.escola_nome === escolaSelecionada)
    : equipamentos

  const respostasFiltradas = escolaSelecionada
    ? inventariosValidos.filter((r: any) => r.escola_nome === escolaSelecionada)
    : inventariosValidos

  const listaEscolas = [...new Set(equipamentos?.map((e: any) => e.escola_nome))].sort()

  // --- MAPA DE CRUZAMENTO (O segredo está aqui!) ---
  const mapaIdParaNome: any = {}
  equipamentos?.forEach((item: any) => {
    // Usamos o ID do recebido, que é o que está salvo no modelo_id do inventário
    mapaIdParaNome[String(item.id)] = item.equipamentos_modelos?.equipamento
  })

  // --- CÁLCULO DE TOTAIS OPERACIONAIS ---
  let totalFuncionando = 0
  let totalGarantia = 0
  let totalDanificados = 0
  let totalNaoLocalizados = 0

  respostasFiltradas.forEach((resposta: any) => {
    resposta.inventario_itens?.forEach((item: any) => {
      totalFuncionando += item.funcionando || 0
      totalGarantia += item.aguardando_garantia || 0
      totalDanificados += item.danificados_mau_uso || 0
      totalNaoLocalizados += item.nao_localizado || 0
    })
  })

  // --- BASE EQUIPAMENTOS & DISTRIBUIÇÃO POR MODELO ---
  let totalEquipamentos = 0
  let totalPlataformas = 0
  const ranking: any = {}
  const modelosAgrupados: any = {}

  // A. Processa o que foi RECEBIDO
  equipamentosFiltrados?.forEach((item: any) => {
    const finalidade = item.equipamentos_modelos?.finalidade
    const modeloNome = item.equipamentos_modelos?.equipamento
    const quantidade = item.quantidade_recebida || 0
    const escola = item.escola_nome

    const finalidadeLimpa = finalidade ? String(finalidade).toLowerCase() : ""

    if (finalidadeLimpa.includes("carregamento")) {
      totalPlataformas += quantidade
      return
    }

    totalEquipamentos += quantidade

    if (!ranking[escola]) ranking[escola] = 0
    ranking[escola] += quantidade

    if (!modelosAgrupados[modeloNome]) {
      modelosAgrupados[modeloNome] = { recebido: 0, respondido: 0 }
    }
    modelosAgrupados[modeloNome].recebido += quantidade
  })

  // B. Processa o que foi RESPONDIDO
  respostasFiltradas.forEach((resposta: any) => {
    resposta.inventario_itens?.forEach((item: any) => {
      const nomeModelo = mapaIdParaNome[String(item.modelo_id)]
      
      if (nomeModelo && modelosAgrupados[nomeModelo]) {
        const somaRespondida = 
          (item.funcionando || 0) + 
          (item.aguardando_garantia || 0) + 
          (item.danificados_mau_uso || 0) + 
          (item.nao_localizado || 0)
        
        modelosAgrupados[nomeModelo].respondido += somaRespondida
      }
    })
  })

  const saudeGeral = totalEquipamentos > 0 ? Math.round((totalFuncionando / totalEquipamentos) * 100) : 0
  const rankingOrdenado = Object.entries(ranking).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)
  const escolasComEquipamentos = [...new Set(equipamentos?.map((e: any) => e.escola_nome))]
  const escolasComInventario = [...new Set(inventariosValidos?.map((i: any) => i.escola_nome))]
  const escolasPendentes = escolasComEquipamentos.filter((escola: any) => !escolasComInventario.includes(escola))
  const escolasEnviadas = escolasComInventario
  const totalEscolas = escolaSelecionada ? (escolasComEquipamentos.includes(escolaSelecionada) ? 1 : 0) : escolasComEquipamentos.length
  const totalEnviados = escolaSelecionada ? (escolasComInventario.includes(escolaSelecionada) ? 1 : 0) : escolasEnviadas.length
  const progressoInventario = totalEscolas > 0 ? Math.round((totalEnviados / totalEscolas) * 100) : 0

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Visão Geral do Inventário das UEs</h1>
        <form method="GET" className="flex items-center gap-2">
          <select name="escola" defaultValue={escolaSelecionada} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500">
            <option value="">Todas as Unidades Escolares</option>
            {listaEscolas.map((escola: any) => (<option key={escola} value={escola}>{escola}</option>))}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Filtrar</button>
        </form>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card><p className="text-xs text-slate-400">Equipamentos</p><p className="text-3xl font-bold text-white">{totalEquipamentos}</p></Card>
        <Card><p className="text-xs text-slate-400">Funcionando</p><p className="text-3xl font-bold text-green-400">{totalFuncionando}</p></Card>
        <Card><p className="text-xs text-slate-400">Garantia</p><p className="text-3xl font-bold text-yellow-400">{totalGarantia}</p></Card>
        <Card><p className="text-xs text-slate-400">Danificados</p><p className="text-3xl font-bold text-red-400">{totalDanificados}</p></Card>
        <Card><p className="text-xs text-slate-400">Não localizados</p><p className="text-3xl font-bold text-gray-400">{totalNaoLocalizados}</p></Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Saúde Operacional da Rede</h2>
        <div className="w-full bg-slate-800 rounded-full h-4">
          <div className="bg-cyan-400 h-4 rounded-full transition-all duration-1000" style={{ width: `${saudeGeral}%` }} />
        </div>
        <p className="text-sm text-cyan-300 mt-2">{saudeGeral}% do parque tecnológico operacional</p>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Plataformas de carregamento recebidas</h2>
        <p className="text-3xl font-bold text-blue-400">{totalPlataformas}</p>
        <p className="text-xs text-slate-400">Equipamentos de suporte (não entram no cálculo de dispositivos de rede)</p>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Distribuição por modelo</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(modelosAgrupados).map(([modelo, totais]: any) => (
            <div key={modelo} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <p className="text-sm font-semibold text-slate-300 mb-4">{modelo}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recebidos</p>
                  <p className="text-2xl font-bold text-white">{totais.recebido}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Respondidos</p>
                  <p className="text-2xl font-bold text-blue-400">{totais.respondido > 0 ? totais.respondido : "-"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Ranking de escolas com mais equipamentos</h2>
        <div className="space-y-2">
          {rankingOrdenado.map(([escola, total]: any, i: number) => (
            <div key={escola} className="flex justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <p className="text-slate-300">{i + 1}º {escola}</p>
              <p className="text-white font-semibold">{total}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Status Inventários</h2>
        <p className="text-sm text-slate-400 mb-2">{totalEnviados} / {totalEscolas} escolas enviaram inventário</p>
        <div className="w-full bg-slate-800 rounded-full h-4 mb-6">
          <div className="bg-green-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressoInventario}%` }} />
        </div>
        <div className="space-y-2">
          {escolasEnviadas.map((escola: any, i: number) => (
            <div key={i} className="flex justify-between bg-slate-900 border border-green-800/30 rounded-xl px-4 py-2">
              <p className="text-green-300">{escola}</p>
              <p className="text-green-400 font-semibold">Enviado</p>
            </div>
          ))}
          {escolasPendentes.map((escola: any, i: number) => (
            <div key={i} className="flex justify-between bg-slate-900 border border-red-900/30 rounded-xl px-4 py-2">
              <p className="text-red-300">{escola}</p>
              <p className="text-red-400 font-semibold">Pendente</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}