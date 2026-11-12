"use client"
import FormularioChamado from "./FormularioChamado"
import type { DadosPerfilChamado } from "@/lib/chamados/perfil"
export default function FormularioChamadoEscola({ perfil }: { perfil: DadosPerfilChamado }) {
  return <FormularioChamado origem="escola" perfil={perfil} />
}
