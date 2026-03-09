import { getUser } from "@/lib/getUser"

export default async function RoleBadge() {
  const user = await getUser()

  if (!user) return null

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    analista: "Analista",
    dirigente: "Dirigente",
    chefia_ure: "Chefia URE",
    gestao_escolas: "Gestão Escolas",
    seintec: "SEINTEC",
  }

  return (
    <div className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-sm">
      {roleLabel[user.role] ?? user.role}
    </div>
  )
}