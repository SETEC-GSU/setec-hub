// Compartilhado por interface e API. A API também consulta o perfil no banco.
export function podeGerarRelatoriosHub(role: unknown) {
  return ["admin", "seintec"].includes(String(role ?? "").trim().toLowerCase());
}
