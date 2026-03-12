import type { Role } from "./roles"

export type Permission =
  | "dashboard.view"
  | "usuarios.view"
  | "usuarios.create"
  | "chamados.view"
  | "chamados.ure.create"
  | "chamados.escola.create"
  | "gestaoChamados.view"
  | "relatorios.view"
  | "escolas.view"
  | "calendar.view"
  | "fields.view"
  | "escolas.manage"
  | "dashboard.escolar"
  | "agenda.field"
  | "intoperacional.field"
  | "inventario.view"
  | "inventario.vgeral"
  | "apoio.usuario"
  | "tutoriais.populares"


  


export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "dashboard.view",
    "usuarios.view",
    "usuarios.create",
    "chamados.view",
    "chamados.ure.create",
    "chamados.escola.create",
    "gestaoChamados.view",
    "relatorios.view",
    "escolas.view",
    "calendar.view",
    "fields.view",
    "escolas.manage",
    "dashboard.escolar",
    "agenda.field",
    "intoperacional.field",
    "inventario.view",
    "inventario.vgeral",
    "apoio.usuario",
    "tutoriais.populares"
  ],

  analista: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "gestaoChamados.view",
    "relatorios.view",
    "escolas.view",
    "calendar.view",
    "fields.view",
    "dashboard.escolar",
    "agenda.field",
    "intoperacional.field",
    "inventario.view",
    "inventario.vgeral",
    "apoio.usuario",
    "tutoriais.populares"
  ],

  chefia_ure: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "escolas.view",
    "calendar.view",
    "dashboard.escolar",
    "agenda.field",
    "apoio.usuario"
  ],

  gestao_escolas: [
    "dashboard.view",
    "chamados.view",
    "chamados.escola.create",
    "escolas.view",
    "calendar.view",
    "agenda.field",
    "inventario.view",
    "apoio.usuario"
  ],

  dirigente: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "relatorios.view",
    "escolas.view",
    "calendar.view",
    "dashboard.escolar",
    "fields.view",
    "agenda.field",
    "intoperacional.field",
    "inventario.view",
    "inventario.vgeral",
    "apoio.usuario",
    "tutoriais.populares"
  
  ],

  seintec: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "gestaoChamados.view",
    "relatorios.view",
    "escolas.view",
    "calendar.view",
    "dashboard.escolar",
    "fields.view",
    "agenda.field",
    "intoperacional.field",
    "inventario.view",
    "inventario.vgeral",
    "apoio.usuario",
    "tutoriais.populares"
  ],
}

export function can(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false
}