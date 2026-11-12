import type { OrigemChamado, ServicoChamado } from "./catalogo"
import { descricaoSoModelo, modeloDescricao } from "./modelosDescricao"

// Nestes pedidos, os campos específicos já descrevem a necessidade. Não pedir
// que o usuário repita as mesmas informações em uma descrição obrigatória.
const detalhesSuficientes = new Set([
  "conta.senha", "conta.portalnet", "conta.rede", "internet.sdwan", "infra.ap", "infra.ponto.novo", "infra.dvr", "infra.ramal",
  "equipamento.software", "equipamento.periferico", "impressao.toner", "impressao.servico", "sistema.cadastro", "sistema.exclusao",
  "digital.formulario", "digital.painel", "evento.teams", "evento.apoio", "evento.equipamento", "evento.emprestimo",
  "inventario.divergencia", "inventario.movimentacao", "field.visita",
])
export function descricaoObrigatoria(servicoId: string, versao = 2) {
  if (versao === 3 && ["equipamento.bateria", "equipamento.carrinho", "sistema.erro", "digital.site"].includes(servicoId)) return false
  return !detalhesSuficientes.has(servicoId)
}

// A versão 3 pergunta o problema uma única vez. Modelo, ambiente e outros
// detalhes de triagem continuam disponíveis, mas não impedem abrir o chamado.
// As versões anteriores mantêm suas regras e os IDs de serviço continuam estáveis.
const camposComplementares: Record<string, readonly string[]> = {
  "equipamento.falha": ["equipamento", "local"],
  "impressao.falha": ["equipamento", "local"],
  "conta.computador": ["equipamento"],
  "internet.indisponivel": ["local"], "internet.instavel": ["local"], "internet.wifi": ["local"],
  "infra.ponto.falha": ["local"], "infra.telefone": ["linha", "local"],
  "equipamento.bateria": ["equipamento"], "equipamento.carrinho": ["local"],
  "digital.site": ["data"], "field.visita": ["data"],
  "outra": ["assunto", "motivo_outros"],
}
export function servicoFormulario(servico: ServicoChamado, origem: OrigemChamado): ServicoChamado {
  return { ...servico, campos: servico.campos.map(campo => {
    const c = { ...campo, opcional: campo.opcional || camposComplementares[servico.id]?.includes(campo.id) || false }
    if (campo.id === "local") c.label = origem === "escola" ? "Local na escola" : "Local do atendimento"
    if (campo.id === "equipamento") { c.label = "Equipamento ou modelo"; c.dica = c.opcional ? "Informe somente se souber. Patrimônio e número de série são complementares." : "Informe o tipo de equipamento. Modelo, patrimônio e número de série são complementares." }
    if (servico.id === "evento.teams" && campo.id === "horario") c.label = "Horário da reunião"
    if (servico.id === "field.visita" && campo.id === "data") c.label = "Data de preferência"
    if (servico.id === "field.visita" && campo.id === "motivo") { c.label = "Qual atendimento a escola precisa?"; c.tipo = "textarea" }
    if (servico.id === "conta.portalnet" && campo.id === "perfil") { c.label = "Qual perfil de acesso precisa?"; c.dica = "Ex.: Diretor, GOE ou outro perfil necessário para a função."; c.tipo = "textarea" }
    if (servico.id === "conta.rede" && campo.id === "recurso") { c.label = "Pasta ou recurso e motivo do acesso"; c.tipo = "textarea" }
    if (servico.id === "sistema.erro" && campo.id === "operacao") { c.label = "Qual erro ou dificuldade aparece?"; c.tipo = "textarea" }
    if (["sintoma", "situacao", "conteudo"].includes(campo.id)) c.tipo = "textarea"
    return c
  }) }
}

// Roteiros curtos específicos. Tópicos já presentes nos campos principais não
// precisam ser respondidos novamente. As linhas opcionais vazias não são salvas.
const ROTEIROS_CURTOS: Readonly<Record<string, readonly string[]>> = {
  "conta.senha": ["Mensagem exibida, se houver:", "Sistema/conta do acesso, se necessário:"],
  "conta.email": ["O que acontece no e-mail:", "Desde quando ocorre:"],
  "conta.computador": ["Mensagem ao entrar no computador:", "Quando o acesso parou:"],
  "conta.portalnet": ["RG e CPF do usuário, se exigidos para o perfil:"],
  "conta.vpn": ["Para que precisa do acesso remoto:", "Mensagem de erro, se houver:"],
  "conta.rede": ["Permissão necessária (leitura/edição):", "Usuário de referência, se houver:"],
  "internet.indisponivel": ["Quando a conexão parou:", "Situação dos equipamentos do rack, se souber:"],
  "internet.instavel": ["Quando ocorre a lentidão/instabilidade:", "Testes já realizados, se houver:"],
  "internet.wifi": ["Mensagem ou falha no Wi-Fi:", "Desde quando ocorre:"],
  "internet.sdwan": ["IP público dedicado, se souber:", "Protocolo da operadora, se houver:"],
  "infra.ap": ["O local já possui infraestrutura de rede:", "Finalidade da instalação:"],
  "infra.ponto.novo": ["Há ponto elétrico próximo, se souber:", "Finalidade do novo ponto:"],
  "infra.ponto.falha": ["Falha identificada no ponto/cabeamento:", "Testes já realizados, se houver:"],
  "infra.dvr": ["IP ou referência do DVR/NVR, se souber:", "Orientações para acesso ao equipamento:"],
  "infra.ramal": ["Ponto de rede disponível para o telefone:", "Referência do aparelho, se souber:"],
  "infra.telefone": ["Falha no ramal/telefone VoIP:", "Desde quando acontece:", "Testes já realizados, se houver:"],
  "equipamento.falha": ["Problema apresentado:", "Testes já realizados, se houver:", "Desde quando ocorre, se souber:"],
  "equipamento.bateria": ["Tempo aproximado de autonomia:", "Comportamento com outro carregador, se testado:"],
  "equipamento.garantia": ["Qual orientação ou acompanhamento precisa:", "Contato/prazo da assistência, se houver:"],
  "equipamento.software": ["Versão/licença disponível, se souber:", "Link do instalador, se houver:"],
  "equipamento.periferico": ["Conexões disponíveis no computador:", "Equipamento já disponível ou solicitado:"],
  "equipamento.monitor": ["Finalidade do segundo monitor:", "Situação atual da conexão:"],
  "equipamento.carrinho": ["Quantidade de tomadas/baias afetadas, se souber:", "Identificação ou fotos, se disponíveis:"],
  "impressao.falha": ["Erro ou falha na impressão:", "Testes já realizados, se houver:"],
  "impressao.toner": ["Tipo/código do toner, se souber:", "Quantidade, se precisar de mais de um:"],
  "impressao.servico": ["Arquivo ou link do material:", "Orientações de entrega, se houver:"],
  "sistema.erro": ["Link ou tela de referência:", "Testes já realizados, se houver:"],
  "sistema.cadastro": ["Informação de referência para conferência:", "Motivo da correção, se necessário:"],
  "sistema.exclusao": ["Vínculos ou impactos conhecidos:", "Responsável que autorizou, se houver:"],
  "digital.site": ["Título da publicação:", "Link(s) ou material de referência:", "Orientações de divulgação, se houver:"],
  "digital.formulario": ["Destino das respostas:", "Quem acompanhará o formulário:", "Link de referência, se houver:"],
  "digital.painel": ["Quem vai utilizar o painel:", "Forma de atualização esperada:", "Referência visual, se houver:"],
  "evento.teams": ["Enviar convites para:", "Gravação, se houver orientação:", "Entrada dos participantes, se precisar de ajuste:"],
  "evento.apoio": ["Contato no local, se diferente do solicitante:", "Referência ou programação do evento:"],
  "evento.equipamento": ["Retirada e devolução previstas:", "Responsável pela retirada, se diferente:", "Cuidados ou acessórios necessários:"],
  "evento.emprestimo": ["Responsável pelo equipamento, se diferente:", "Acessórios necessários:", "Condições especiais, se houver:"],
  "inventario.orientacao": ["Qual dúvida impede a atualização:", "Tela/campo em que precisa de apoio:"],
  "inventario.divergencia": ["Registro/linha para conferência:", "Evidência ou documento de referência:"],
  "inventario.movimentacao": ["Previsão da movimentação, se houver:", "Documento ou autorização de referência:"],
  "field.visita": ["Horário de acesso à escola, se houver preferência:", "Contato para acompanhar o atendimento, se diferente:"],
  "outra": ["Descreva o que precisa:", "Resultado esperado:", "Prazo ou contexto, se houver:"],
}

const ROTEIROS_ANTERIORES: Readonly<Record<string, readonly string[]>> = {
  "ure:evento.teams": ["Convites, se houver:", "Gravação/acesso especial, se houver:"],
  "escola:conta.portalnet": ["RG e CPF do usuário afetado, se exigidos para o perfil solicitado:"],
  "ure:conta.rede": ["Permissão de leitura ou edição, se souber:"],
  "ure:conta.vpn": ["Para que precisa do acesso remoto:"],
  "escola:field.visita": ["Informações para acesso à escola, se houver:"],
  "escola:internet.sdwan": ["Protocolo ou contato da operadora, se houver:"],
  "escola:infra.dvr": ["IP ou referência do DVR/NVR, se souber:"],
}

export function roteiroObservacoes(servicoId: string, origem: OrigemChamado) {
  if (servicoId === "internet.indisponivel" && origem === "escola") {
    return "A escola ficou sem conexão desde:\nSituação dos equipamentos do rack, se souber:"
  }
  const linhas = ROTEIROS_CURTOS[servicoId] || (descricaoObrigatoria(servicoId, 3)
    ? [origem === "escola" ? "O que aconteceu ou precisa ser feito na escola:" : "O que aconteceu ou precisa ser feito:", "Desde quando, se souber:"]
    : ["Informações adicionais, se houver:"])
  return linhas.join("\n")
}
const chaveLinha = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/^[-•]\s*/, "").replace(/:$/, "").toLowerCase()
export function limparObservacoes(texto: string, servicoId: string, origem: OrigemChamado) {
  if (descricaoSoModelo(servicoId, texto, origem)) return { texto: "", conteudo: "" }
  const perguntas = new Set([
    ...roteiroObservacoes(servicoId, origem).split("\n"),
    ...(ROTEIROS_ANTERIORES[`${origem}:${servicoId}`] || []),
    ...modeloDescricao(servicoId, origem).split("\n"),
    "Informações adicionais, se houver:",
    "O que aconteceu ou precisa ser feito na escola:", "O que aconteceu ou precisa ser feito:", "Desde quando, se souber:",
  ].map(chaveLinha))
  const linhas: string[] = [], conteudo: string[] = []
  for (const linha of texto.split("\n")) {
    const i = linha.indexOf(":"), prefixo = i >= 0 ? linha.slice(0, i + 1) : linha
    if (perguntas.has(chaveLinha(prefixo))) {
      const resposta = i >= 0 ? linha.slice(i + 1).trim() : ""
      if (resposta) { linhas.push(linha.trim()); conteudo.push(resposta) }
    } else if (linha.trim()) { linhas.push(linha.trim()); conteudo.push(linha.trim()) }
  }
  return { texto: linhas.join("\n"), conteudo: conteudo.join("\n") }
}
