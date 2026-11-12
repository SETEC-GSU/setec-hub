"use client"
import FormularioChamado from "./FormularioChamado"
import type { DadosPerfilChamado } from "@/lib/chamados/perfil"
export default function FormularioChamadoURE({ perfil }: { perfil: DadosPerfilChamado }) {
  return <FormularioChamado origem="ure" perfil={perfil} />
}
