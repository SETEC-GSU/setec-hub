import FormularioChamadoEscola from "@/components/chamados/FormularioChamadoEscola"
import { carregarPerfilChamado } from "@/lib/chamados/perfil-servidor"

export default async function ChamadoEscolaPage() {
  const perfil = await carregarPerfilChamado("escola")
  return <FormularioChamadoEscola perfil={perfil} />
}
