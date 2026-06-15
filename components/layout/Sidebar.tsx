import { getUser } from "@/lib/getUser"
import { canAccess } from "@/lib/canAccess"
import SidebarClient, { type SidebarSection } from "./SidebarClient"

type CanAccessRole = Parameters<typeof canAccess>[0]
type CanAccessPermission = Parameters<typeof canAccess>[1]

type AppUserMinimal = {
  role: string
}

function getDevFallbackUser(): AppUserMinimal | null {
  if (process.env.NODE_ENV === "production") return null

  return {
    role: "admin",
  }
}

function safeCanAccess(role: string, permission: string) {
  try {
    return canAccess(
      role as CanAccessRole,
      permission as CanAccessPermission
    )
  } catch {
    return false
  }
}

export default async function Sidebar() {
  const user = (await getUser()) || getDevFallbackUser()

  if (!user?.role) return null

  const userRole = String(user.role || "")

  const sections: SidebarSection[] = [
    {
      title: "🎫 Chamados",
      items: [
        {
          href: "/chamados",
          label: "Abra um chamado",
          icon: "🎫",
          permission: "chamados.view",
        },
        {
          href: "/painel-chamados",
          label: "Painel de Chamados",
          icon: "📋",
          permission: "painel.chamados",
        },
      ],
    },
    {
      title: "📚 Apoio ao Usuário",
      items: [
        {
          href: "/apoio-usuario",
          label: "Base de Conhecimento",
          icon: "📚",
          permission: "apoio.usuario",
        },
        {
          href: "/tutoriais-populares",
          label: "Tutoriais Populares",
          icon: "📊",
          permission: "tutoriais.populares",
        },
      ],
    },
    {
      title: "🏫 Escolas",
      items: [
        {
          href: "/escolas",
          label: "Painel Escolar",
          icon: "🏫",
          permission: "escolas.view",
        },
        {
          href: "/dashboard-escolar",
          label: "Dashboard Escolar",
          icon: "📊",
          permission: "dashboard.escolar",
        },
      ],
    },
    {
      title: "💻 Equipamentos",
      items: [
        {
          href: "/inventario",
          label: "Inventário Tecnológico",
          icon: "🖥️",
          permission: "inventario.view",
        },
        {
          href: "/inventario/visao-geral",
          label: "Visão Geral",
          icon: "📈",
          permission: "inventario.vgeral",
        },
        {
          href: "/saresp",
          label: "SARESP Digital",
          icon: "📝",
          permission: "inventario.view",
        },
      ],
    },
    {
      title: "🛜 Conectividade",
      items: [
        {
          href: "/segundo-link",
          label: "Segundo Link",
          icon: "🔗",
          permission: "segundo.link",
        },
      ],
    },
    {
      title: "📡 Fields",
      items: [
        {
          href: "/fields",
          label: "Atendimento",
          icon: "🧑‍🔧",
          permission: "fields.view",
        },
        {
          href: "/fields/relatorio-tecnico",
          label: "Relatórios Técnicos",
          icon: "📋",
          permission: "fields.relatorio",
        },
        {
          href: "/fields/agenda-field",
          label: "Agenda",
          icon: "📅",
          permission: "agenda.field",
        },
        {
          href: "/fields/avaliacoes",
          label: "Avaliações",
          icon: "⭐",
          permission: "avaliacoes.field",
        },
        {
          href: "/fields/mapa-field",
          label: "Mapa",
          icon: "🗺️",
          permission: "fields.mapa",
        },
        {
          href: "/fields/painel-setorizacao",
          label: "Painel - Setorização",
          icon: "🚗",
          permission: "fields.mapa",
        },
        {
          href: "/fields/demandas",
          label: "Cadastro de Demandas",
          icon: "✅",
          permission: "fields.demandas",
        },
        {
          href: "/fields/credenciais-escolas",
          label: "Credenciais Escolares",
          icon: "🔐",
          permission: "credenciais.escolas.view",
        },
      ],
    },
    {
      title: "🖨️ Impressoras - URE",
      items: [
        {
          href: "/toners",
          label: "Painel Geral",
          icon: "🖨️",
          permission: "toners.view",
        },
        {
          href: "/toners/entrada",
          label: "Registrar Entrada",
          icon: "📦",
          permission: "toners.entrada",
        },
        {
          href: "/toners/saida",
          label: "Registrar Saída",
          icon: "➖",
          permission: "toners.saida",
        },
        {
          href: "/toners/movimentacoes",
          label: "Histórico de Toners",
          icon: "📜",
          permission: "toners.historico",
        },
      ],
    },
    {
      title: "⚙️ Gestão",
      items: [
        {
          href: "/gestao-escolas",
          label: "Gestão de Escolas",
          icon: "🏫",
          permission: "escolas.manage",
        },
        {
          href: "/usuarios",
          label: "Gestão de Usuários",
          icon: "👥",
          permission: "usuarios.view",
        },
        {
          href: "/gestao-chamados",
          label: "Gestão de Chamados",
          icon: "🛠️",
          permission: "gestaoChamados.view",
        },
        {
          href: "/gestao-equipamentos",
          label: "Gestão de Equipamentos",
          icon: "💻",
          permission: "gestao.equipamentos",
        },
        {
          href: "/saresp/gestao",
          label: "Gestão SARESP",
          icon: "📝",
          permission: "gestao.equipamentos",
        },
        {
          href: "/fields/credenciais-escolas/gestao",
          label: "Gestão de Credenciais",
          icon: "🔐",
          permission: "credenciais.escolas.manage",
        },
        {
          href: "/fields/setorizacao",
          label: "Setorização - FIELD",
          icon: "📋",
          permission: "fields.setorizacao",
        },
        {
          href: "/avisos",
          label: "Gestão de Avisos",
          icon: "⚠️",
          permission: "avisos.view",
        },
      ],
    },
    {
      title: "🧠 Visão Estratégica",
      items: [
        {
          href: "/relatorios",
          label: "SETEC DataHub",
          icon: "📈",
          permission: "relatorios.view",
        },
        {
          href: "/edumonitor",
          label: "EduMonitor",
          icon: "📊",
          permission: "edu.monitor",
        },
      ],
    },
  ]

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        safeCanAccess(userRole, String(item.permission || ""))
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <SidebarClient
      sections={filteredSections}
      showHome={safeCanAccess(userRole, "dashboard.view")}
      userRole={userRole}
    />
  )
}