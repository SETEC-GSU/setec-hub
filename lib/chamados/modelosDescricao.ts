import { encontrarServico, type OrigemChamado } from "./catalogo"

// Roteiros originais recuperados dos formulários enviados. São texto de apoio;
// não alteram as perguntas estruturadas, o catálogo ou as regras do banco.
const roteiros: Record<string, string> = {
  "ure:evento.teams": "- TÍTULO DA REUNIÃO:\n- ENVIAR CONVITE PARA:\n- PÚBLICO-ALVO:\n- DATA E HORÁRIO:\n- DESEJA GRAVAÇÃO? (SIM/NÃO):\n- DESABILITAR LOBBY? (SIM/NÃO):\n- OBSERVAÇÕES:",
  "ure:evento.equipamento": "- EQUIPAMENTO(S) SOLICITADO(S):\n- QUANTIDADE:\n- LOCAL DO EVENTO:\n- DATA E HORÁRIO DO EVENTO:\n- DATA DE RETIRADA:\n- DATA DE DEVOLUÇÃO:\n- RESPONSÁVEL PELA RETIRADA:\n- OBSERVAÇÕES:",
  "ure:evento.emprestimo": "- EQUIPAMENTO SOLICITADO:\n- FINALIDADE DO USO:\n- DATA DE RETIRADA:\n- DATA DE DEVOLUÇÃO:\n- RESPONSÁVEL PELO EQUIPAMENTO:\n- LOCAL DE USO:\n- OBSERVAÇÕES:",
  "ure:evento.apoio": "- NOME DO EVENTO:\n- LOCAL:\n- DATA E HORÁRIO:\n- TIPO DE APOIO NECESSÁRIO:\n- EQUIPAMENTOS ENVOLVIDOS:\n- RESPONSÁVEL PELO EVENTO:\n- OBSERVAÇÕES:",
  "ure:digital.site": "- TÍTULO DA PUBLICAÇÃO:\n- TEXTO DA PUBLICAÇÃO:\n- DATA DE PUBLICAÇÃO DESEJADA:\n- LINK(S), SE HOUVER:\n- OBSERVAÇÕES:",
  "ure:equipamento.falha": "- TIPO DE EQUIPAMENTO:\n- PATRIMÔNIO/SÉRIE, SE HOUVER:\n- LOCAL ONDE O EQUIPAMENTO ESTÁ:\n- PROBLEMA IDENTIFICADO:\n- TESTES JÁ REALIZADOS:\n- OBSERVAÇÕES:",
  "ure:conta.vpn": "- NOME COMPLETO:\n- LOGIN/E-MAIL INSTITUCIONAL:\n- SETOR:\n- JUSTIFICATIVA PARA USO:\n- EQUIPAMENTO UTILIZADO:\n- OBSERVAÇÕES:",
  "ure:infra.ramal": "- SETOR:\n- LOCAL/SALA:\n- RAMAL ATUAL, SE HOUVER:\n- SOLICITAÇÃO DESEJADA:\n- RESPONSÁVEL PELO SETOR:\n- OBSERVAÇÕES:",
  "ure:infra.ponto.novo": "- LOCAL/SALA:\n- QUANTIDADE DE PONTOS NECESSÁRIOS:\n- EXISTE PONTO PRÓXIMO? (SIM/NÃO):\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "ure:conta.rede": "- NOME COMPLETO:\n- LOGIN/E-MAIL INSTITUCIONAL:\n- SETOR:\n- PASTA/RECURSO QUE DESEJA ACESSO:\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "ure:impressao.toner": "- IMPRESSORA:\n- LOCAL/SETOR:\n- TIPO DE TONER, SE SOUBER:\n- PROBLEMA IDENTIFICADO:\n- NÚMERO DO CHAMADO, SE HOUVER:\n- OBSERVAÇÕES:",
  "ure:digital.formulario": "- OBJETIVO DO FORMULÁRIO:\n- PÚBLICO-ALVO:\n- CAMPOS/PERGUNTAS NECESSÁRIAS:\n- PRAZO DE UTILIZAÇÃO:\n- RESPONSÁVEL PELO ACOMPANHAMENTO:\n- OBSERVAÇÕES:",
  "ure:digital.painel": "- OBJETIVO DO DASHBOARD:\n- BASE DE DADOS DISPONÍVEL:\n- INDICADORES DESEJADOS:\n- PÚBLICO QUE UTILIZARÁ:\n- PRAZO DE ENTREGA DESEJADO:\n- OBSERVAÇÕES:",
  "ure:equipamento.monitor": "- SETOR:\n- ESTAÇÃO/USUÁRIO:\n- EQUIPAMENTO DISPONÍVEL? (SIM/NÃO):\n- FINALIDADE:\n- OBSERVAÇÕES:",
  "ure:equipamento.periferico": "- PERIFÉRICO SOLICITADO:\n- SETOR:\n- FINALIDADE:\n- EQUIPAMENTO ONDE SERÁ UTILIZADO:\n- OBSERVAÇÕES:",
  "ure:outra": "- DESCREVA A SOLICITAÇÃO:\n- SETOR ENVOLVIDO:\n- URGÊNCIA:\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "escola:field.visita": "- MOTIVO DA SOLICITAÇÃO:\n- DATA DESEJADA:\n- HORÁRIO DE PREFERÊNCIA:\n- EQUIPAMENTO(S) OU AMBIENTE(S) ENVOLVIDO(S):\n- OBSERVAÇÕES:",
  "escola:digital.site": "- TÍTULO DA PUBLICAÇÃO:\n- TEXTO DA PUBLICAÇÃO:\n- DATA DE PUBLICAÇÃO DESEJADA:\n- LINK(S), SE HOUVER:\n- OBSERVAÇÕES:",
  "escola:internet.sdwan": "- OPERADORA CONTRATADA:\n- VELOCIDADE CONTRATADA:\n- WI-FI DO MODEM/ROTEADOR ESTÁ DESABILITADO? (SIM/NÃO):\n- POSSUI IP PÚBLICO DEDICADO? (SIM/NÃO):\n- CONEXÃO COM O FIREWALL FORTIGATE REALIZADA NA PORTA WAN2? (SIM/NÃO):\n- OBSERVAÇÕES:",
  "escola:internet.indisponivel": "- DATA/HORÁRIO DO INÍCIO DO PROBLEMA:\n- A ESCOLA ESTÁ TOTALMENTE SEM INTERNET? (SIM/NÃO):\n- HOUVE QUEDA DE ENERGIA RECENTE? (SIM/NÃO):\n- EQUIPAMENTOS DO RACK ESTÃO ENERGIZADOS? (SIM/NÃO):\n- OBSERVAÇÕES:",
  "escola:infra.ap": "- QUANTIDADE DE APs SOLICITADOS:\n- LOCAL DESEJADO PARA INSTALAÇÃO:\n- O LOCAL JÁ POSSUI INFRAESTRUTURA DE AP? (SIM/NÃO):\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "escola:infra.ponto.novo": "- QUANTIDADE DE PONTOS NECESSÁRIOS:\n- QUANTIDADE DE PONTOS ELÉTRICOS, SE NECESSÁRIO:\n- LOCALIZAÇÃO DOS PONTOS SOLICITADOS:\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "escola:infra.dvr": "- QUANTIDADE DE DVRs PARA ESPELHAR:\n- DVR ESTÁ CONECTADO NA REDE INTRAGOV? (SIM/NÃO):\n- IP ATUAL DO DVR (MENU > REDES > TCP/IP):\n- LOCAL DO DVR:\n- OBSERVAÇÕES:",
  "escola:sistema.erro": "- SISTEMA:\n- PERFIL/USUÁRIO AFETADO:\n- DESCRIÇÃO DO PROBLEMA:\n- MENSAGEM DE ERRO, SE HOUVER:\n- TESTES JÁ REALIZADOS:\n- OBSERVAÇÕES:",
  "escola:conta.portalnet": "- ESCOLA:\n- NOME COMPLETO:\n- RG:\n- CPF:\n- PERFIS QUE DESEJA TER ACESSO:\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "escola:outra": "- DESCREVA A SOLICITAÇÃO:\n- AMBIENTE/EQUIPAMENTO ENVOLVIDO:\n- URGÊNCIA:\n- JUSTIFICATIVA:\n- OBSERVAÇÕES:",
  "ure:impressao.falha": "- IMPRESSORA:\n- LOCAL/SETOR:\n- TIPO DE TONER, SE SOUBER:\n- PROBLEMA IDENTIFICADO:\n- NÚMERO DO CHAMADO, SE HOUVER:\n- OBSERVAÇÕES:",
  "ure:infra.ponto.falha": "- LOCAL/SALA:\n- PONTO/IDENTIFICAÇÃO:\n- PROBLEMA APRESENTADO:\n- QUANDO COMEÇOU:\n- EQUIPAMENTOS AFETADOS:\n- TESTES JÁ REALIZADOS:\n- OBSERVAÇÕES:",
  "escola:infra.ponto.falha": "- LOCAL/SALA:\n- PONTO/IDENTIFICAÇÃO:\n- PROBLEMA APRESENTADO:\n- QUANDO COMEÇOU:\n- EQUIPAMENTOS AFETADOS:\n- TESTES JÁ REALIZADOS:\n- OBSERVAÇÕES:"
}

export function modeloDescricao(servicoId: string, origem?: OrigemChamado) {
  const chave = origem ? origem + ":" + servicoId : "ure:" + servicoId
  if (Object.prototype.hasOwnProperty.call(roteiros, chave)) return roteiros[chave]
  const servico = encontrarServico(servicoId)
  return servico ? [...servico.campos.map(c => "- " + c.label.toLocaleUpperCase("pt-BR") + ":"), "- DETALHES DA SOLICITAÇÃO:", "- OBSERVAÇÕES:"].join("\n") : ""
}
const normalizar = (texto: string) => texto.replace(/\r\n/g, "\n").trim()
export function descricaoSoModelo(servicoId: string, descricao: string, origem?: OrigemChamado) {
  const modelo = modeloDescricao(servicoId, origem)
  return Boolean(modelo) && normalizar(descricao) === normalizar(modelo)
}
export function contemRoteiro(servicoId: string, descricao: string, origem?: OrigemChamado) {
  const linhas = normalizar(descricao).split("\n").map(l => l.trim())
  return modeloDescricao(servicoId, origem).split("\n").filter(Boolean).every(l => linhas.some(atual => atual.startsWith(l.trim())))
}
export function adicionarRoteiro(servicoId: string, descricao: string, origem?: OrigemChamado) {
  const modelo = modeloDescricao(servicoId, origem)
  return !modelo || contemRoteiro(servicoId, descricao, origem) ? descricao : [descricao.trimEnd(), modelo].filter(Boolean).join("\n\n")
}
