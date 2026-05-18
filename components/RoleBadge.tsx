import { getUser } from "@/lib/getUser"

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  analista: "Analista",
  dirigente: "Dirigente",
  chefia_ure: "Chefia URE",
  gestao_escolas: "Gestão Escolas",
  seintec: "SEINTEC",
}

export default async function RoleBadge() {
  const user = await getUser()

  if (!user?.role) return null

  return (
    <div className="rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
      {roleLabel[user.role] ?? user.role}
    </div>
  )
}