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

  // 1. EQUIPAMENTOS RECEBIDOS (🚀 ADICIONADO IMAGEM E ANO AQUI)
  const { data: equipamentos } = await supabase
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
        ano_recebimento
      )
    `)
    .gt("quantidade_recebida", 0)

  // 2. INVENTÁRIOS ENVIADOS COM SEUS ITENS + DADOS DO RESPONSÁVEL + OBSERVAÇÃO
  const { data: inventariosBrutos } = await supabase
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

  // --- MAPA DE CRUZAMENTO DE ID PARA FINALIDADE E NOME ---
  const mapaEquipamentos: Record<string, any> = {}
  equipamentos?.forEach((item: any) => {
    mapaEquipamentos[String(item.id)] = {
      nome: item.equipamentos_modelos?.equipamento,
      finalidade: item.equipamentos_modelos?.finalidade
    }
  })

  // --- CÁLCULO DE TOTAIS OPERACIONAIS (Ignorando Carregamento) ---
  let totalFuncionando = 0
  let totalGarantia = 0
  let totalDanificados = 0
  let totalNaoLocalizados = 0
  let totalPlataformasRespondidas = 0 // NOVO: Total de plataformas respondidas

  respostasFiltradas.forEach((resposta: any) => {
    resposta.inventario_itens?.forEach((item: any) => {
      
      const equipamentoBanco = mapaEquipamentos[String(item.modelo_id)]
      const finalidadeLimpa = equipamentoBanco?.finalidade ? String(equipamentoBanco.finalidade).toLowerCase() : ""
      
      const somaRespondidaItem = 
          (item.funcionando || 0) + 
          (item.aguardando_garantia || 0) + 
          (item.danificados_mau_uso || 0) + 
          (item.nao_localizado || 0)

      // Se FOR plataforma de carregamento, soma separado e NÃO ENTRA nos totais principais
      if (finalidadeLimpa.includes("carregamento")) {
        totalPlataformasRespondidas += somaRespondidaItem
        return // Sai da iteração deste item
      }

      // Se NÃO FOR plataforma, entra nos totais principais dos cards
      totalFuncionando += item.funcionando || 0
      totalGarantia += item.aguardando_garantia || 0
      totalDanificados += item.danificados_mau_uso || 0
      totalNaoLocalizados += item.nao_localizado || 0
    })
  })

  // --- BASE EQUIPAMENTOS & DISTRIBUIÇÃO POR MODELO ---
  let totalEquipamentos = 0
  let totalPlataformasRecebidas = 0 // Renomeado para ficar mais claro
  const ranking: any = {}
  const modelosAgrupados: Record<string, any> = {}

  // A. Processa o que foi RECEBIDO
  equipamentosFiltrados?.forEach((item: any) => {
    const finalidade = item.equipamentos_modelos?.finalidade
    const modeloNome = item.equipamentos_modelos?.equipamento
    const imagemUrl = item.equipamentos_modelos?.imagem_url // Pega a imagem
    const anoRecebimento = item.equipamentos_modelos?.ano_recebimento // Pega o ano
    const quantidade = item.quantidade_recebida || 0
    const escola = item.escola_nome

    const finalidadeLimpa = finalidade ? String(finalidade).toLowerCase() : ""

    if (finalidadeLimpa.includes("carregamento")) {
      totalPlataformasRecebidas += quantidade
    } else {
      totalEquipamentos += quantidade
    }

    if (!ranking[escola]) ranking[escola] = 0
    ranking[escola] += quantidade

    // Inicialização robusta do agrupador com os novos dados visuais
    if (modeloNome) {
      if (!modelosAgrupados[modeloNome]) {
        modelosAgrupados[modeloNome] = { 
          recebido: 0, 
          respondido: 0,
          funcionando: 0,
          garantia: 0,
          danificados: 0,
          nao_localizado: 0,
          imagem_url: imagemUrl, // Armazena a imagem
          ano_recebimento: anoRecebimento // Armazena o ano
        }
      }
      modelosAgrupados[modeloNome].recebido += quantidade
    }
  })

  // B. Processa o que foi RESPONDIDO (Para a distribuição por modelo)
  respostasFiltradas.forEach((resposta: any) => {
    resposta.inventario_itens?.forEach((item: any) => {
      const equipamentoBanco = mapaEquipamentos[String(item.modelo_id)]
      const nomeModelo = equipamentoBanco?.nome
      
      if (nomeModelo && modelosAgrupados[nomeModelo]) {
        const func = item.funcionando || 0
        const gar = item.aguardando_garantia || 0
        const dan = item.danificados_mau_uso || 0
        const nloc = item.nao_localizado || 0

        const somaRespondida = func + gar + dan + nloc
        
        modelosAgrupados[nomeModelo].respondido += somaRespondida
        modelosAgrupados[nomeModelo].funcionando += func
        modelosAgrupados[nomeModelo].garantia += gar
        modelosAgrupados[nomeModelo].danificados += dan
        modelosAgrupados[nomeModelo].nao_localizado += nloc
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

  // Pega os dados do responsável da escola selecionada (se houver filtro e se a escola enviou)
  const dadosResponsavel = escolaSelecionada && respostasFiltradas.length > 0 
    ? respostasFiltradas[0] 
    : null;

  // Função para formatar a data que vem do Supabase (Ajustado para forçar UTC e não perder 1 dia)
  const formatarData = (dataIso: string) => {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', { timeZone: "UTC" });
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER AJUSTADO PARA MOBILE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Visão Geral do Inventário das UEs</h1>
        <form method="GET" className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <select name="escola" defaultValue={escolaSelecionada} className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500">
            <option value="">Todas as Unidades Escolares</option>
            {listaEscolas.map((escola: any) => (<option key={escola} value={escola}>{escola}</option>))}
          </select>
          <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Filtrar</button>
        </form>
      </div>

      {/* NOVO BLOCO: DADOS DO RESPONSÁVEL COM OBSERVAÇÃO */}
      {dadosResponsavel && (
        <div className="bg-[#020617] border border-blue-900/50 rounded-xl p-4 flex flex-col gap-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-900/20 rounded-lg hidden sm:block">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-blue-400 font-semibold uppercase tracking-widest mb-1">Inventário respondido por</p>
                <p className="text-white text-base sm:text-lg font-bold">{dadosResponsavel.responsavel_nome}</p>
                <p className="text-slate-400 text-xs sm:text-sm">{dadosResponsavel.responsavel_cargo}</p>
              </div>
            </div>
            {/* AQUI ESTÁ A DATA */}
            <div className="sm:text-right border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 w-full sm:w-auto">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Data de Envio</p>
               <p className="text-slate-300 font-medium text-sm">{formatarData(dadosResponsavel.created_at)}</p>
            </div>
          </div>

          {/* SESSÃO DE OBSERVAÇÃO */}
          {dadosResponsavel.observacao && dadosResponsavel.observacao.trim() !== "" && (
            <div className="mt-2 bg-slate-900/80 border border-slate-800 rounded-lg p-3">
               <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">Observações do Responsável</p>
               <p className="text-sm text-slate-300 italic">"{dadosResponsavel.observacao}"</p>
            </div>
          )}

        </div>
      )}

      {/* CARDS DO TOPO (Equipamentos operacionais - Plataformas ignoradas) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card><p className="text-xs text-slate-400">Equipamentos recebidos</p><p className="text-2xl lg:text-3xl font-bold text-white truncate">{totalEquipamentos}</p></Card>
        <Card><p className="text-xs text-slate-400">Funcionando</p><p className="text-2xl lg:text-3xl font-bold text-green-400 truncate">{totalFuncionando}</p></Card>
        <Card><p className="text-xs text-slate-400">Garantia</p><p className="text-2xl lg:text-3xl font-bold text-yellow-400 truncate">{totalGarantia}</p></Card>
        <Card><p className="text-xs text-slate-400">Danificados</p><p className="text-2xl lg:text-3xl font-bold text-red-400 truncate">{totalDanificados}</p></Card>
        <Card><p className="text-[10px] lg:text-xs text-slate-400">Não localizados</p><p className="text-2xl lg:text-3xl font-bold text-gray-400 truncate">{totalNaoLocalizados}</p></Card>
      </div>

      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Saúde Operacional da Rede</h2>
        <div className="w-full bg-slate-800 rounded-full h-4">
          <div className="bg-cyan-400 h-4 rounded-full transition-all duration-1000" style={{ width: `${saudeGeral}%` }} />
        </div>
        <p className="text-sm text-cyan-300 mt-2">{saudeGeral}% do parque tecnológico operacional</p>
      </Card>

      {/* CARD DE PLATAFORMAS (Lado a Lado: Recebidos e Respondidos) */}
      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-6">Plataformas de carregamento</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Total Recebido</p>
            <p className="text-3xl md:text-4xl font-black text-blue-400">{totalPlataformasRecebidas}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Total Respondido</p>
            <p className="text-3xl md:text-4xl font-black text-emerald-400">{totalPlataformasRespondidas}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4 italic">Equipamentos de suporte logístico (não entram no cálculo geral de dispositivos de rede e saúde operacional).</p>
      </Card>

      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-6">Distribuição por modelo e status</h2>
        {/* 🚀 GRID DE MODELOS COM STATUS VISUAL ATUALIZADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(modelosAgrupados).map(([modelo, totais]: any) => (
            <div key={modelo} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
              
              <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-800 pb-4">
                
                {/* 🚀 LADO ESQUERDO: IMAGEM, TÍTULO E ANO */}
                <div className="flex items-start gap-3 flex-1">
                  {totais.imagem_url ? (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-white rounded-xl p-1.5 border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
                      <img
                        src={totais.imagem_url}
                        alt={modelo}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center">
                      <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold text-center px-1">Sem<br/>Imagem</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white leading-snug">
                      {modelo}
                    </p>
                    {totais.ano_recebimento && (
                      <span className="inline-block mt-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md tracking-wider">
                        ANO DE RECEBIMENTO: {totais.ano_recebimento}
                      </span>
                    )}
                  </div>
                </div>

                {/* 🚀 LADO DIREITO: TOTAL RECEBIDO */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Total Recebido</p>
                  <p className="text-2xl font-black text-white leading-none">{totais.recebido}</p>
                </div>
              </div>

              {totais.respondido > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-green-500 uppercase tracking-wider font-semibold">Funcionando</p>
                    <p className="text-lg font-bold text-green-400">{totais.funcionando}</p>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-yellow-500 uppercase tracking-wider font-semibold">Em Garantia</p>
                    <p className="text-lg font-bold text-yellow-400">{totais.garantia}</p>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    <p className="text-[10px] text-red-500 uppercase tracking-wider font-semibold">Danificados</p>
                    <p className="text-lg font-bold text-red-400">{totais.danificados}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Não Localizado</p>
                    <p className="text-lg font-bold text-slate-300">{totais.nao_localizado}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 bg-slate-900/50 rounded-lg border border-dashed border-slate-700 mt-2">
                   <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Aguardando Inventário</p>
                </div>
              )}
              
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Ranking de escolas com mais equipamentos</h2>
        <div className="space-y-2">
          {rankingOrdenado.map(([escola, total]: any, i: number) => (
            <div key={escola} className="flex justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 gap-2 items-center">
              <p className="text-slate-300 text-sm">{i + 1}º {escola}</p>
              <p className="text-white font-semibold">{total}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Status Inventários</h2>
        <p className="text-sm text-slate-400 mb-2">{totalEnviados} / {totalEscolas} escolas enviaram inventário</p>
        <div className="w-full bg-slate-800 rounded-full h-4 mb-6">
          <div className="bg-green-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressoInventario}%` }} />
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {escolasEnviadas.map((escola: any, i: number) => (
            <div key={`env-${i}`} className="flex justify-between bg-slate-900 border border-green-800/30 rounded-xl px-4 py-2 gap-2 items-center">
              <p className="text-green-300 text-sm truncate">{escola}</p>
              <p className="text-green-400 font-semibold text-xs sm:text-sm uppercase tracking-wide">Enviado</p>
            </div>
          ))}
          {escolasPendentes.map((escola: any, i: number) => (
            <div key={`pend-${i}`} className="flex justify-between bg-slate-900 border border-red-900/30 rounded-xl px-4 py-2 gap-2 items-center">
              <p className="text-red-300 text-sm truncate">{escola}</p>
              <p className="text-red-400 font-semibold text-xs sm:text-sm uppercase tracking-wide">Pendente</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}