import Link from "next/link"
import { getUser } from "@/lib/getUser"
import { canAccess } from "@/lib/canAccess"

export default async function Sidebar() {

  const user = await getUser()

  if (!user) return null

  const sections = [

    {
      title: "📊 Painel",
      items: [
        { href: "/", label: "Painel Geral", icon: "📊", permission: "dashboard.view" },
      ]
    },

    {
      title: "🎫 Chamados",
      items: [
        { href: "/chamados", label: "Abra um chamado", icon: "🎫", permission: "chamados.view" },
      ]
    },

    {
      title: "🏫 Escola",
      items: [
        { href: "/escolas", label: "Escolas", icon: "🏫", permission: "escolas.view" },
        { href: "/dashboard-escolar", label: "Dashboard Escolar", icon: "🧠", permission: "dashboard.escolar" },
      ]
    },

    {
      title: "💻 Equipamentos",
      items: [
        { href: "/inventario", label: "Inventário Tecnológico", icon: "🖥️", permission: "inventario.view" },
      ]
    },

    {
      title: "📡 Fields",
      items: [
        { href: "/fields", label: "Atendimento", icon: "🧑‍🔧", permission: "fields.view" },
        { href: "/fields/agenda-field", label: "Agenda", icon: "📅", permission: "agenda.field" },
        { href: "/fields/inteligencia-operacional", label: "Inteligência Operacional", icon: "🧠", permission: "intoperacional.field" }
      ]
    },

    {
      title: "⚙️ Gestão",
      items: [
        { href: "/gestao-escolas", label: "Gestão de Escolas", icon: "⚙️", permission: "escolas.manage" },
        { href: "/usuarios", label: "Gestão de Usuários", icon: "👥", permission: "usuarios.view" },
        { href: "/gestao-chamados", label: "Gestão de Chamados", icon: "🛠️", permission: "gestaoChamados.view" },
      ]
    },

    {
      title: "🧠 Visão Estratégica",
      items: [
        { href: "/relatorios", label: "SETEC DataHub", icon: "📈", permission: "relatorios.view" },
      ]
    }

  ]

  return (
    <aside className="w-72 bg-[#020617] border-r border-slate-800 flex flex-col justify-between">

      <div>

        <div className="h-24 flex items-center px-8 text-2xl font-bold border-b border-slate-800">
          <span className="text-blue-500">SETEC</span>
          <span className="ml-2 font-light">Hub</span>
        </div>

        <nav className="mt-6 px-4 space-y-4">

          {sections.map(section => {

            const filteredItems = section.items.filter(item =>
              canAccess(user.role, item.permission as any)
            )

            if (filteredItems.length === 0) return null

            return (

              <details key={section.title} className="group">

                <summary className="flex items-center gap-3 px-3 mb-3 cursor-pointer list-none">

                  <p className="text-sm text-slate-300 uppercase tracking-wide font-semibold">
                    {section.title}
                  </p>

                  <div className="flex-1 h-px bg-slate-800"></div>

                  <span className="text-slate-400 text-sm group-open:rotate-90 transition">
                    ▸
                  </span>

                </summary>

                <div className="space-y-2">

                  {filteredItems.map(item => (

                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 transition-all hover:bg-slate-800 hover:text-white hover:translate-x-1"
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>

                  ))}

                </div>

              </details>

            )

          })}

        </nav>

      </div>

      <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
        Plataforma interna<br/>
        URE Guarulhos Sul
      </div>

    </aside>
  )
}