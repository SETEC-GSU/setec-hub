import { createServerSupabase } from "@/lib/supabase-server"
import { getUser } from "@/lib/getUser"
import { salvarInventario } from "./actions"
import InventarioForm from "./InventarioForm"

export default async function AtualizarInventario() {

  const supabase = await createServerSupabase()

  const user = await getUser()

  if (!user) return null

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("setor")
    .eq("id", user.id)
    .single()

  const escola = perfil?.setor

  // 🚀 ADICIONADO imagem_url e ano_recebimento NA QUERY
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

  return (

    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-white">
        Atualizar Inventário
      </h1>

      <InventarioForm
        equipamentos={equipamentos}
        salvarInventario={salvarInventario}
      />

    </div>

  )
}