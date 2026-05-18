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
  | "painel.chamados"
  | "avisos.view"
  | "toners.view"
  | "toners.entrada"
  | "toners.saida"
  | "toners.historico"
  | "edu.monitor"
  | "segundo.link"
  | "avaliacoes.field"
  | "gestao.equipamentos"
  | "fields.demandas"
  | "fields.setorizacao"
  | "fields.mapa"
  | "fields.painel"
  | "fields.relatorio"



  


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
    "tutoriais.populares",
    "painel.chamados",
    "avisos.view",
    "toners.view",
    "toners.entrada",
    "toners.saida",
    "toners.historico",
    "edu.monitor",
    "segundo.link",
    "avaliacoes.field",
    "gestao.equipamentos",
    "fields.demandas",
    "fields.setorizacao",
    "fields.mapa",
    "fields.painel",
    "fields.relatorio"

  ],

  analista: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "gestaoChamados.view",
    "relatorios.view",
    "escolas.manage",
    "escolas.view",
    "calendar.view",
    "fields.view",
    "dashboard.escolar",
    "agenda.field",
    "intoperacional.field",
    "inventario.view",
    "inventario.vgeral",
    "apoio.usuario",
    "tutoriais.populares",
    "painel.chamados",
    "avisos.view",
    "toners.view",
    "toners.entrada",
    "toners.saida",
    "toners.historico",
    "edu.monitor",
    "segundo.link",
    "fields.demandas",
    "fields.mapa",
    "fields.painel",
    "fields.relatorio"
  ],

  chefia_ure: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "escolas.view",
    "calendar.view",
    "dashboard.escolar",
    "agenda.field",
    "apoio.usuario",
    "painel.chamados",
    "toners.historico",
    "edu.monitor",
    "segundo.link",
    "fields.painel",
    "fields.mapa"
  ],

  gestao_escolas: [
    "dashboard.view",
    "chamados.view",
    "chamados.escola.create",
    "calendar.view",
    "agenda.field",
    "inventario.view",
    "apoio.usuario",
    "painel.chamados",
    "segundo.link",
    "fields.painel",
    "fields.mapa"
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
    "tutoriais.populares",
    "painel.chamados",
    "toners.view",
    "toners.historico",
    "edu.monitor",
    "segundo.link",
    "avaliacoes.field",
    "fields.painel",
    "fields.mapa"
  
  ],

  seintec: [
    "dashboard.view",
    "chamados.view",
    "chamados.ure.create",
    "gestaoChamados.view",
    "relatorios.view",
    "escolas.view",
    "escolas.manage",
    "calendar.view",
    "dashboard.escolar",
    "fields.view",
    "agenda.field",
    "intoperacional.field",
    "inventario.view",
    "inventario.vgeral",
    "apoio.usuario",
    "tutoriais.populares",
    "painel.chamados",
    "avisos.view",
    "toners.view",
    "toners.entrada",
    "toners.saida",
    "toners.historico",
    "edu.monitor",
    "segundo.link",
    "avaliacoes.field",
    "gestao.equipamentos",
    "fields.demandas",
    "fields.mapa",
    "fields.painel",
    "fields.relatorio"

  ],
}

export function can(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false
}