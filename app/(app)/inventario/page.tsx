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

  const { data: equipamentos } = await supabase
    .from("equipamentos_recebidos")
    .select(`
      id,
      quantidade_recebida,
      equipamentos_modelos (
        equipamento
      )
    `)
    .eq("escola_nome", escola)
    .gt("quantidade_recebida", 0)

  const { data: ultimaResposta } = await supabase
    .from("inventario_respostas")
    .select("id, created_at, responsavel_nome, responsavel_cargo")
    .eq("escola_nome", escola)
    .order("created_at", { ascending:false })
    .limit(1)
    .maybeSingle()

  let statusItens:any = []

  if(ultimaResposta){

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

  function statusModelo(modeloId:string){
    return statusItens.find((s:any)=> s.modelo_id === modeloId)
  }

  function formatarData(data:string){

    const date = new Date(data)

    const local = new Date(
      date.getTime() - (date.getTimezoneOffset() * 60000)
    )

    return local.toLocaleString("pt-BR",{
      timeZone:"America/Sao_Paulo"
    })
  }

  // TOTAIS

  let totalFuncionando = 0
  let totalGarantia = 0
  let totalDanificados = 0
  let totalNaoLocalizados = 0

  statusItens.forEach((item:any)=>{
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

  return (

    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-white">
        Inventário Tecnológico
      </h1>

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

        <div className="grid grid-cols-3 gap-4">

          {equipamentos?.map((item:any, i:number)=>{

            const status = statusModelo(item.id)

            let saude = 0

            if(status){

              const total =
                status.funcionando +
                status.aguardando_garantia +
                status.danificados_mau_uso +
                status.nao_localizado

              saude = Math.round(
                (status.funcionando / total) * 100
              )

            }

            return(

              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2"
              >

                <p className="text-sm font-bold text-white">
                  {item.equipamentos_modelos.equipamento}
                </p>

                <p className="text-2xl font-bold text-white">
                  {item.quantidade_recebida}
                </p>

                {status &&(

                  <div className="text-xs space-y-1 pt-2">

                    <p className="text-green-400">
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

            {/* CARDS RESUMO */}

            <div className="grid grid-cols-4 gap-4">

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