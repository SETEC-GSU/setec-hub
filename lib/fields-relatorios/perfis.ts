export function podeGerirRelatoriosFields(role: unknown): boolean {
  return typeof role === "string" && ["admin", "seintec"].includes(role.trim().toLowerCase());
}
