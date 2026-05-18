import { getUser } from "@/lib/getUser"

function getGreetingMessage() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  )

  const hour = now.getHours()

  if (hour >= 5 && hour < 12) return "Bom dia"
  if (hour >= 12 && hour < 18) return "Boa tarde"

  return "Boa noite"
}

export default async function Greeting() {
  const user = await getUser()

  const message = getGreetingMessage()
  const nome = user?.nome || user?.setor || "SETEC - URE Guarulhos Sul"

  return (
    <div className="mt-1 truncate text-sm text-slate-400 sm:text-base md:text-lg">
      {message},{" "}
      <span className="font-semibold text-white">
        {nome}
      </span>
    </div>
  )
}