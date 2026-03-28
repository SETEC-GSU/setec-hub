// page.tsx (Inventário)
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { createServerSupabase } from "@/lib/supabase-server"
import { getUser } from "@/lib/getUser"

export default async function InventarioPage() {

  const supabase = await createServerSupabase()
  const user = await getUser()

  if (!user) return null

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("setor")
    .eq("id", user.id)
    .single()

  const escola = perfil?.setor

  // 🚀 ADICIONADO imagem_url e ano_recebimento AQUI 👇
  const { data: equipamentos } = await supabase
    .from("equipamentos_recebidos")
    .select(`
      id,
      quantidade_recebida,
      equipamentos_modelos (
        equipamento,
        imagem_url,
        ano_recebimento
      )
    `)
    .eq("escola_nome", escola)
    .gt("quantidade_recebida", 0)

  // ADICIONADO "observacao" NO SELECT AQUI 👇
  const { data: ultimaResposta } = await supabase
    .from("inventario_respostas")
    .select("id, created_at, responsavel_nome, responsavel_cargo, observacao") 
    .eq("escola_nome", escola)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let statusItens: any = []

  if (ultimaResposta) {
    const { data } = await supabase
      .from("inventario_itens")
      .select(`
        modelo_id,
        funcionando,
        aguardando_garantia,
        danificados_mau_uso,
        nao_localizado
      `)
      .eq("inventario_id", ultimaResposta.id)

    statusItens = data || []
  }

  function statusModelo(modeloId: string) {
    return statusItens.find((s: any) => s.modelo_id === modeloId)
  }

  function formatarData(data: string) {
    const date = new Date(data)
    const local = new Date(
      date.getTime() - (date.getTimezoneOffset() * 60000)
    )
    return local.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    })
  }

  // TOTAIS
  let totalFuncionando = 0
  let totalGarantia = 0
  let totalDanificados = 0
  let totalNaoLocalizados = 0

  statusItens.forEach((item: any) => {
    totalFuncionando += item.funcionando || 0
    totalGarantia += item.aguardando_garantia || 0
    totalDanificados += item.danificados_mau_uso || 0
    totalNaoLocalizados += item.nao_localizado || 0
  })

  const totalEquipamentos =
    totalFuncionando +
    totalGarantia +
    totalDanificados +
    totalNaoLocalizados

  const saudeGeral =
    totalEquipamentos > 0
      ? Math.round((totalFuncionando / totalEquipamentos) * 100)
      : 0

  let diasDesatualizado = 0;
  const temData = !!ultimaResposta?.created_at;

  if (temData) {
    const dataUltima = new Date(ultimaResposta.created_at);
    const dataHoje = new Date();
    const diferencaTempo = dataHoje.getTime() - dataUltima.getTime();
    diasDesatualizado = Math.max(0, Math.floor(diferencaTempo / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8">

      {/* Título e Badge de Status */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">
          Inventário Tecnológico
        </h1>

        {/* ALERTA VISUAL */}
        <div>
          {!temData ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium">
              ⚠️ Nenhum inventário registrado anteriormente
            </div>
          ) : diasDesatualizado > 90 ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-pulse">
              ⚠️ Inventário desatualizado há {diasDesatualizado} dias
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              ✅ Inventário em dia {diasDesatualizado === 0 ? '(Atualizado hoje)' : `(Atualizado há ${diasDesatualizado} ${diasDesatualizado === 1 ? 'dia' : 'dias'})`}
            </div>
          )}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Equipamentos recebidos
          </h2>
          <a href="/inventario/atualizar">
            <Button className="text-sm px-5 py-2 whitespace-nowrap">
              Atualizar inventário
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipamentos?.map((item: any, i: number) => {
            const status = statusModelo(item.id)
            let saude = 0

            if (status) {
              const total =
                status.funcionando +
                status.aguardando_garantia +
                status.danificados_mau_uso +
                status.nao_localizado
              saude = Math.round((status.funcionando / total) * 100)
            }

            return (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
              >
                {/* 🚀 NOVO CABEÇALHO: Imagem e Título/Ano */}
                <div className="flex items-start gap-3">
                  {item.equipamentos_modelos.imagem_url ? (
                    <div className="w-16 h-16 shrink-0 bg-white rounded-xl p-1.5 border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
                      <img
                        src={item.equipamentos_modelos.imagem_url}
                        alt={item.equipamentos_modelos.equipamento}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 shrink-0 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center">
                      <span className="text-[9px] text-slate-500 uppercase font-bold text-center px-1">Sem<br/>Imagem</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white leading-snug">
                      {item.equipamentos_modelos.equipamento}
                    </p>
                    {item.equipamentos_modelos.ano_recebimento && (
                      <span className="inline-block mt-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md tracking-wider">
                        Ano de recebimento: {item.equipamentos_modelos.ano_recebimento}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3">
                   <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Total Recebido</p>
                   <p className="text-2xl font-bold text-white leading-none">
                     {item.quantidade_recebida}
                   </p>
                </div>

                {status && (
                  <div className="text-xs space-y-1 pt-2 border-t border-slate-800/60 mt-1">
                    <p className="text-green-400 mt-2">
                      Funcionando: {status.funcionando}
                    </p>
                    <p className="text-yellow-400">
                      Garantia: {status.aguardando_garantia}
                    </p>
                    <p className="text-red-400">
                      Danificados: {status.danificados_mau_uso}
                    </p>
                    <p className="text-gray-400">
                      Não localizados: {status.nao_localizado}
                    </p>
                    <p className="text-cyan-400 pt-1 font-semibold">
                      Saúde Operacional: {saude}%
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ÚLTIMA ATUALIZAÇÃO */}
      <Card>
        <h2 className="text-xl font-semibold mb-6">
          Última atualização registrada
        </h2>

        {ultimaResposta ? (
          <div className="space-y-8">
            <div className="text-slate-300 space-y-1">
              <p>
                Inventário enviado em{" "}
                <span className="font-semibold">
                  {formatarData(ultimaResposta.created_at)}
                </span>
              </p>
              <p className="text-sm text-slate-400">
                Responsável:{" "}
                <span className="text-white font-semibold">
                  {ultimaResposta.responsavel_nome}
                </span>{" "}
                ({ultimaResposta.responsavel_cargo})
              </p>
            </div>

            {/* AQUI ENTRA A EXIBIÇÃO DA NOVA OBSERVAÇÃO */}
            {ultimaResposta.observacao && ultimaResposta.observacao.trim() !== "" && (
              <div className="bg-slate-900 border-l-4 border-cyan-500 rounded-r-xl p-4 mt-2 shadow-sm">
                 <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-1">Observações do Responsável</p>
                 <p className="text-sm text-slate-300 italic">"{ultimaResposta.observacao}"</p>
              </div>
            )}

            {/* CARDS RESUMO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs text-slate-400">Funcionando</p>
                <p className="text-3xl font-bold text-green-400">
                  {totalFuncionando}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-slate-400">Garantia</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {totalGarantia}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-slate-400">Danificados</p>
                <p className="text-3xl font-bold text-red-400">
                  {totalDanificados}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-slate-400">Não localizados</p>
                <p className="text-3xl font-bold text-gray-400">
                  {totalNaoLocalizados}
                </p>
              </Card>
            </div>

            {/* SAÚDE OPERACIONAL GERAL */}
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Saúde Operacional Geral
              </p>
              <div className="w-full bg-slate-800 rounded-full h-3">
                <div
                  className="bg-cyan-400 h-3 rounded-full"
                  style={{ width: `${saudeGeral}%` }}
                />
              </div>
              <p className="text-xs text-cyan-300">
                {saudeGeral}% do parque tecnológico funcionando
              </p>
            </div>

            {/* ALERTA */}
            {totalDanificados > 10 && (
              <div className="text-red-400 text-sm font-semibold">
                ⚠️ Atenção: {totalDanificados} equipamentos danificados
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-400">
            Nenhum inventário enviado ainda.
          </p>
        )}
      </Card>
    </div>
  )
}