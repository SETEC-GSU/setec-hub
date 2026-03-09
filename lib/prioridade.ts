type Prioridade = "baixa" | "media" | "alta" | "critica"

type Mapa = {
  prioridade: Prioridade
  sla: number
}

const mapa: Record<string, Mapa> = {
  // URE
  "Agendamento reunião Microsoft Teams": { prioridade: "alta", sla: 8 },
  "Equipamentos para eventos internos/externos": { prioridade: "critica", sla: 4 },
  "Empréstimo de equipamento": { prioridade: "media", sla: 24 },
  "Apoio técnico em eventos": { prioridade: "critica", sla: 4 },
  "Publicação no site": { prioridade: "alta", sla: 8 },
  "Manutenção de equipamentos": { prioridade: "media", sla: 24 },
  VPN: { prioridade: "media", sla: 24 },
  "Instalação/alteração de ramal": { prioridade: "baixa", sla: 48 },
  "Ponto de rede": { prioridade: "media", sla: 24 },
  "Perfil acesso rede corporativa": { prioridade: "baixa", sla: 48 },
  "Impressora / toner": { prioridade: "alta", sla: 8 },
  "Criação de formulário": { prioridade: "media", sla: 24 },
  "Segundo monitor": { prioridade: "baixa", sla: 48 },
  Periféricos: { prioridade: "baixa", sla: 48 },

  // ESCOLAS
  "Visita FIELD": { prioridade: "alta", sla: 8 },
  "Validação SDWAN": { prioridade: "critica", sla: 4 },
  "Queda link intragov": { prioridade: "critica", sla: 4 },
  "Instalação AP Meraki": { prioridade: "media", sla: 24 },
  "Pontos lógicos": { prioridade: "media", sla: 24 },
  "Espelhamento DVR": { prioridade: "alta", sla: 8 },

  "Outras solicitações": { prioridade: "media", sla: 24 },
}

export function definirPrioridade(categoria: string) {
  return mapa[categoria] ?? { prioridade: "media", sla: 24 }
}