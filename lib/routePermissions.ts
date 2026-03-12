import type { Permission } from "./permissions"

export const routePermissions: Record<string, Permission> = {
  "/": "dashboard.view",
  "/chamados": "chamados.view",
  "/chamados/ure": "chamados.ure.create",
  "/chamados/escola": "chamados.escola.create",
  "/gestao-chamados": "gestaoChamados.view",
  "/escolas": "escolas.view",
  "/usuarios": "usuarios.view",
  "/relatorios": "relatorios.view",
  "/gestao-escolas":"escolas.manage",
  "/dashboard-escolar":"dashboard.escolar",
  "/fields":"fields.view",
  "/fields/agenda-field":"agenda.field",
  "/fields/inteligencia-operacional":"intoperacional.field",
  "/inventario":"inventario.view",
  "/inventario/visao-geral":"inventario.vgeral",
  "/apoio-usuario":"apoio.usuario",
  "/tutoriais-populares":"tutoriais.populares"
}