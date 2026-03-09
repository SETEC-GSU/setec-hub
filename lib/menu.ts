import type { Role } from "./roles"

export type MenuItem = {
  label: string
  href: string
  permission: string
}

export const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/",
    permission: "dashboard.view",
  },
  {
    label: "Chamados",
    href: "/chamados",
    permission: "chamados.view",
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    permission: "relatorios.view",
  },
  {
    label: "Escolas",
    href: "/escolas",
    permission: "escolas.view",
  },
  {
    label: "Calendário",
    href: "/calendar",
    permission: "calendar.view",
  },
  {
    label: "Gestão Fields",
    href: "/fields",
    permission: "fields.view",
  },
  {
    label: "Usuários",
    href: "/usuarios",
    permission: "usuarios.view",
  },
]

