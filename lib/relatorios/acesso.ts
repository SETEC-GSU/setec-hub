import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

export const PERMISSAO_CENTRAL_RELATORIOS = "fields.central.view" as const;
export const PERFIS_CENTRAL_RELATORIOS = ["admin", "seintec", "dirigente"] as const;

export function podeVerCentralRelatorios(role: unknown) {
  if (typeof role !== "string") return false;
  const perfil = role.trim().toLowerCase();
  return PERFIS_CENTRAL_RELATORIOS.some(item => item === perfil) &&
    can(perfil as Role, PERMISSAO_CENTRAL_RELATORIOS);
}

export function rotaCentralRelatorios(pathname: string) {
  return ["/fields/central-relatorios", "/api/fields/relatorios/documento", "/api/fields/relatorios/backup"]
    .some(rota => pathname === rota || pathname.startsWith(`${rota}/`));
}
