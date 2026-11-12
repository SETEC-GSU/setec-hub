import FormularioChamadoURE from "@/components/chamados/FormularioChamadoURE"
import { carregarPerfilChamado } from "@/lib/chamados/perfil-servidor"

export default async function ChamadoUREPage() {
  const perfil = await carregarPerfilChamado("ure")
  return <FormularioChamadoURE perfil={perfil} />
}
