import Link from "next/link"
import { getUser } from "@/lib/getUser"
import { canAccess } from "@/lib/canAccess"

export default async function Sidebar() {

  const user = await getUser()

  if (!user) return null

  const sections = [

    {
      title: "🎫 Chamados",
      items: [
        { href: "/chamados", label: "Abra um chamado", icon: "🎫", permission: "chamados.view" },
        { href: "/painel-chamados", label: "Painel de Chamados", icon: "📋", permission: "painel.chamados" },
      ]
    },

    {
      title: "📚 Apoio ao Usuário",
      items: [
        { href: "/apoio-usuario", label: "Base de Conhecimento", icon: "📚", permission: "apoio.usuario" },
        { href: "/tutoriais-populares", label: "Tutoriais Populares", icon: "📊", permission: "tutoriais.populares" },
      ]
    },

    {
      title: "🏫 Escolas",
      items: [
        { href: "/escolas", label: "Painel Escolar", icon: "🏫", permission: "escolas.view" },
        { href: "/dashboard-escolar", label: "Dashboard Escolar", icon: "📊", permission: "dashboard.escolar" },
      ]
    },

    {
      title: "💻 Equipamentos",
      items: [
        { href: "/inventario", label: "Inventário Tecnológico", icon: "🖥️", permission: "inventario.view" },
        { href: "/inventario/visao-geral", label: "Visão Geral", icon: "📈", permission: "inventario.vgeral" },
      ]
    },

    {
      title: "🛜 Conectividade",
      items: [
        { href: "/segundo-link", label: "Segundo Link", icon: "🔗", permission: "segundo.link" },
      ]
    },

    {
      title: "📡 Fields",
      items: [
        { href: "/fields", label: "Atendimento", icon: "🧑‍🔧", permission: "fields.view" },
        { href: "/fields/agenda-field", label: "Agenda", icon: "📅", permission: "agenda.field" },
      ]
    },

    {
      title: "🖨️ Impressoras - URE",
      items: [
        { href: "/toners", label: "Painel Geral", icon: "🖨️", permission: "toners.view" },
        { href: "/toners/entrada", label: "Registrar Entrada", icon: "📦", permission: "toners.entrada" },
        { href: "/toners/saida", label: "Registrar Saída", icon: "➖", permission: "toners.saida" },
        { href: "/toners/movimentacoes", label: "Histórico de Toners", icon: "📜", permission: "toners.historico" }
      ]
    },

    {
      title: "⚙️ Gestão",
      items: [
        { href: "/gestao-escolas", label: "Gestão de Escolas", icon: "⚙️", permission: "escolas.manage" },
        { href: "/usuarios", label: "Gestão de Usuários", icon: "👥", permission: "usuarios.view" },
        { href: "/gestao-chamados", label: "Gestão de Chamados", icon: "🛠️", permission: "gestaoChamados.view" },
        { href: "/avisos", label: "Gestão de Avisos", icon: "⚠️", permission: "avisos.view" },
      ]
    },

    {
      title: "🧠 Visão Estratégica",
      items: [
        { href: "/relatorios", label: "SETEC DataHub", icon: "📈", permission: "relatorios.view" },
        { href: "/edumonitor", label: "EduMonitor", icon: "📊", permission: "edu.monitor" },
      ]
    }

  ]

  return (
    <aside className="w-72 bg-[#020617] border-r border-slate-800 flex flex-col justify-between overflow-y-auto h-full">

      <div>

        {/* LOGO MODERNIZADO E BLINDADO AQUI 👇 */}
        <div className="h-24 shrink-0 flex items-center px-6 border-b border-slate-800 sticky top-0 bg-[#020617]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/20">
              <span className="text-white font-black text-lg tracking-tight">SH</span>
            </div>
            <div className="flex flex-col leading-tight mt-1">
              <div className="text-2xl font-black tracking-tight flex items-baseline">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">SETEC</span>
                <span className="text-slate-200 ml-1 font-light">Hub</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 tracking-[0.2em] uppercase mt-0.5">URE GUARULHOS SUL</span>
            </div>
          </div>
        </div>
        {/* FIM DO LOGO MODERNIZADO 👆 */}

        <nav className="mt-6 px-4 space-y-4 pb-6">

          {/* HOME SOLTA */}

          {canAccess(user.role, "dashboard.view") && (

            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 transition-all hover:bg-slate-800 hover:text-white hover:translate-x-1 mb-6"
            >
              <span className="text-lg">🏠</span>
              Menu Principal
            </Link>

          )}

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

      <div className="p-6 border-t border-slate-800 text-xs text-slate-500 shrink-0 sticky bottom-0 bg-[#020617]">
        Plataforma interna<br/>
        URE Guarulhos Sul
      </div>

    </aside>
  )
}