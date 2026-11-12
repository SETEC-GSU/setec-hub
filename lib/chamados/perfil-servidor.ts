import "server-only"
import { getUser } from "@/lib/getUser"
import type { OrigemChamado } from "./catalogo"
import { dadosPerfilChamado } from "./perfil"

export async function carregarPerfilChamado(origem: OrigemChamado) {
  try {
    // getUser já deduplica a leitura na requisição do layout. Sem nova API,
    // polling, persistência no navegador ou cache compartilhado de usuários.
    return dadosPerfilChamado(await getUser(), origem)
  } catch {
    // Autopreenchimento é uma conveniência. O envio continua exigindo a sessão
    // válida e as permissões verificadas pela action original no servidor.
    return dadosPerfilChamado(null, origem)
  }
}
