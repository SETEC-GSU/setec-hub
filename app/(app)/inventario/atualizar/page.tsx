import { createServerSupabase } from "@/lib/supabase-server"
import { getUser } from "@/lib/getUser"
import { salvarInventario } from "./actions"
import InventarioForm from "./InventarioForm"

type EquipamentoModelo = {
  id?: string | null
  equipamento: string | null
  imagem_url: string | null
  ano_recebimento: number | null
}

type EquipamentoRecebido = {
  id: string
  quantidade_recebida: number | null
  equipamentos_modelos:
    | EquipamentoModelo
    | EquipamentoModelo[]
    | null
}

const N1110_MODELO_32_ID = "0e1e7331-8550-41bd-b1e2-9ba37e6087eb"
const N1110_MODELO_64_ID = "80f610df-bb29-459e-a397-f58a13746fa8"

const N1110_32 = "Notebook Positivo N1110 - 32GB - LOTE 1"
const N1110_64_ANTIGO = "Notebook Positivo N1110 - 64GB - LOTE 1"
const N1110_64_ATUAL = "Notebook Positivo N1110 - 64GB - LOTE 2"

const N1110_CONSOLIDADO = "Notebook Positivo N1110 - LOTES 1 E 2"

function textoSeguro(value: unknown) {
  return String(value ?? "").trim()
}

function normalizar(value: unknown) {
  return textoSeguro(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function numeroSeguro(value: unknown) {
  const numero = Number(value || 0)
  return Number.isFinite(numero) ? Math.max(0, numero) : 0
}

function getModelo(item: EquipamentoRecebido): EquipamentoModelo | null {
  if (Array.isArray(item.equipamentos_modelos)) {
    return item.equipamentos_modelos[0] || null
  }

  return item.equipamentos_modelos || null
}

function ehN1110Consolidavel(modelo: EquipamentoModelo | null) {
  const modeloId = textoSeguro(modelo?.id)
  const nomeNormalizado = normalizar(modelo?.equipamento)

  // Regra principal: UUIDs fixos de equipamentos_modelos.
  if (
    modeloId === N1110_MODELO_32_ID ||
    modeloId === N1110_MODELO_64_ID
  ) {
    return true
  }

  // Fallback para manter compatibilidade antes/depois da correção do nome no Supabase.
  return (
    nomeNormalizado === normalizar(N1110_32) ||
    nomeNormalizado === normalizar(N1110_64_ANTIGO) ||
    nomeNormalizado === normalizar(N1110_64_ATUAL)
  )
}

function prioridadeN1110(modelo: EquipamentoModelo | null) {
  const modeloId = textoSeguro(modelo?.id)

  if (modeloId === N1110_MODELO_32_ID) return 0
  if (modeloId === N1110_MODELO_64_ID) return 1

  return normalizar(modelo?.equipamento) === normalizar(N1110_32) ? 0 : 1
}

/**
 * Consolida somente os dois N1110 definidos acima.
 *
 * Importante:
 * - não altera o banco;
 * - mantém um id REAL de equipamentos_recebidos como id canônico;
 * - soma apenas quantidade_recebida;
 * - os demais modelos continuam exatamente como vieram do Supabase.
 */
function consolidarEquipamentosInventario(
  equipamentos: EquipamentoRecebido[]
): EquipamentoRecebido[] {
  const resultado: EquipamentoRecebido[] = []

  let indiceGrupoN1110 = -1
  let prioridadeAtual = Number.POSITIVE_INFINITY

  equipamentos.forEach((item) => {
    const modelo = getModelo(item)

    if (!ehN1110Consolidavel(modelo)) {
      resultado.push(item)
      return
    }

    const quantidade = numeroSeguro(item.quantidade_recebida)
    const prioridade = prioridadeN1110(modelo)

    if (indiceGrupoN1110 === -1) {
      resultado.push({
        ...item,
        quantidade_recebida: quantidade,
        equipamentos_modelos: {
          id: modelo?.id || null,
          equipamento: N1110_CONSOLIDADO,
          imagem_url: modelo?.imagem_url || null,
          // Consolidado reúne 2021 e 2023; não atribuímos um único ano incorreto.
          ano_recebimento: null,
        },
      })

      indiceGrupoN1110 = resultado.length - 1
      prioridadeAtual = prioridade
      return
    }

    const atual = resultado[indiceGrupoN1110]
    const modeloAtual = getModelo(atual)

    resultado[indiceGrupoN1110] = {
      ...atual,
      // Preferimos o recebimento de 32GB como id canônico quando ele existir.
      id: prioridade < prioridadeAtual ? item.id : atual.id,
      quantidade_recebida:
        numeroSeguro(atual.quantidade_recebida) + quantidade,
      equipamentos_modelos: {
        id:
          prioridade < prioridadeAtual
            ? modelo?.id || modeloAtual?.id || null
            : modeloAtual?.id || modelo?.id || null,
        equipamento: N1110_CONSOLIDADO,
        imagem_url:
          prioridade < prioridadeAtual
            ? modelo?.imagem_url || modeloAtual?.imagem_url || null
            : modeloAtual?.imagem_url || modelo?.imagem_url || null,
        ano_recebimento: null,
      },
    }

    if (prioridade < prioridadeAtual) {
      prioridadeAtual = prioridade
    }
  })

  return resultado
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
        id,
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

  const equipamentosOriginais = (equipamentosRaw || []) as EquipamentoRecebido[]
  const equipamentos = consolidarEquipamentosInventario(equipamentosOriginais)

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
