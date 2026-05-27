import { createServerSupabase } from "@/lib/supabase-server"
import { getUser } from "@/lib/getUser"
import { salvarInventario } from "./actions"
import InventarioForm from "./InventarioForm"

type EquipamentoRecebido = {
  id: string
  quantidade_recebida: number | null
  equipamentos_modelos:
    | {
        equipamento: string | null
        imagem_url: string | null
        ano_recebimento: number | null
      }
    | {
        equipamento: string | null
        imagem_url: string | null
        ano_recebimento: number | null
      }[]
    | null
}

export default async function AtualizarInventario() {
  const supabase = await createServerSupabase()
  const user = await getUser()

  if (!user) return null

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios")
    .select("setor")
    .eq("id", user.id)
    .single()

  if (perfilError) {
    console.error("[Inventário] Erro ao buscar perfil:", perfilError)
  }

  const escola = perfil?.setor || ""

  if (!escola) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">
          Atualizar Inventário
        </h1>

        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <h2 className="text-lg font-bold text-yellow-300">
            Unidade não identificada
          </h2>

          <p className="mt-2 text-sm text-yellow-100/80">
            Não foi possível identificar a escola vinculada ao seu perfil.
            Verifique o campo setor do usuário.
          </p>
        </div>
      </div>
    )
  }

  const { data: equipamentosRaw, error: equipamentosError } = await supabase
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

  if (equipamentosError) {
    console.error("[Inventário] Erro ao buscar equipamentos:", equipamentosError)
  }

  const equipamentos = (equipamentosRaw || []) as EquipamentoRecebido[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Atualizar Inventário
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Unidade vinculada:{" "}
          <span className="font-semibold text-white">{escola}</span>
        </p>
      </div>

      {equipamentos.length === 0 ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
          <h2 className="text-lg font-bold text-yellow-300">
            Nenhum equipamento localizado
          </h2>

          <p className="mt-2 text-sm text-yellow-100/80">
            Não há equipamentos recebidos com quantidade maior que zero
            vinculados a esta unidade.
          </p>
        </div>
      ) : (
        <InventarioForm
          equipamentos={equipamentos}
          salvarInventario={salvarInventario}
        />
      )}
    </div>
  )
}