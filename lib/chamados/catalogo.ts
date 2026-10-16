export type OrigemChamado = "escola" | "ure";
export type PrioridadeChamado = "baixa" | "media" | "alta" | "critica";
export type CampoServico = { id: string; label: string; tipo?: "text" | "textarea" | "date" | "number" | "select"; opcoes?: readonly string[]; opcional?: boolean; dica?: string };
export type ServicoChamado = { id: string; label: string; categoria: string; subcategoria: string; origens: readonly OrigemChamado[];
  prioridade: PrioridadeChamado; sla: number; ajuda: string; palavras: readonly string[]; aliases: readonly string[]; campos: readonly CampoServico[] };
const ambos = ["escola", "ure"] as const, escola = ["escola"] as const, ure = ["ure"] as const;
export const CATEGORIAS_CHAMADOS = ["Contas e acessos", "Internet e conectividade", "Infraestrutura, redes e telefonia", "Equipamentos, software e impressão", "Sistemas e soluções digitais", "Reuniões, eventos e empréstimos", "Inventário e patrimônio", "Atendimento presencial FIELD", "Outra necessidade de tecnologia"] as const;
const usuario: CampoServico = { id: "usuario_afetado", label: "Usuário ou e-mail afetado", dica: "Informe a identificação institucional. Não informe senhas." };
const sistema: CampoServico = { id: "sistema", label: "Nome do sistema / Hub" };
const equipamento: CampoServico = { id: "equipamento", label: "Equipamento / modelo", dica: "Se disponível, informe também o patrimônio ou número de série." };
const local: CampoServico = { id: "local", label: "Local / ambiente afetado" };
const impacto: CampoServico = { id: "abrangencia", label: "Quem é afetado?", tipo: "select", opcoes: ["Uma pessoa ou equipamento", "Uma sala ou setor", "Vários ambientes", "Toda a unidade", "Não sei informar"] };
const data: CampoServico = { id: "data", label: "Data desejada", tipo: "date" };
const quantidade: CampoServico = { id: "quantidade", label: "Quantidade necessária", tipo: "number" };
function s(id: string, label: string, categoria: typeof CATEGORIAS_CHAMADOS[number], origens: readonly OrigemChamado[], prioridade: PrioridadeChamado, sla: number,
  campos: readonly CampoServico[], aliases: readonly string[] = [], palavras: readonly string[] = [], ajuda = "Descreva o que precisa, o resultado esperado e os testes já realizados."): ServicoChamado {
  return { id, label, categoria, subcategoria: label, origens, prioridade, sla, campos, aliases, palavras, ajuda };
}
export const CATALOGO_CHAMADOS: readonly ServicoChamado[] = [
  s("conta.senha", "Redefinir senha ou recuperar acesso", CATEGORIAS_CHAMADOS[0], ambos, "media", 24, [usuario], [], ["esqueci senha", "reset", "bloqueado", "login"]),
  s("conta.email", "Problema no e-mail institucional", CATEGORIAS_CHAMADOS[0], ambos, "media", 24, [usuario], [], ["email aluno", "e-mail aluno", "outlook", "office", "microsoft 365"]),
  s("conta.computador", "Não consigo acessar o computador", CATEGORIAS_CHAMADOS[0], ambos, "media", 24, [usuario, equipamento], [], ["login windows", "aluno computador", "conta bloqueada"]),
  s("conta.portalnet", "Solicitar ou ajustar perfil PortalNet", CATEGORIAS_CHAMADOS[0], escola, "baixa", 48, [usuario, { id: "perfil", label: "Perfil solicitado e justificativa" }], ["Solicitação para perfil PORTALNET", "Perfil PortalNet"], ["permissao", "portalnet"]),
  s("conta.vpn", "Solicitar ou corrigir acesso VPN", CATEGORIAS_CHAMADOS[0], ure, "media", 24, [usuario, equipamento], ["VPN"], ["remoto", "vpn"]),
  s("conta.rede", "Solicitar acesso a pasta ou recurso de rede", CATEGORIAS_CHAMADOS[0], ure, "baixa", 48, [usuario, { id: "recurso", label: "Pasta / recurso e justificativa do acesso" }], ["Perfil acesso rede corporativa", "Liberação de perfil rede corporativa"], ["permissao", "compartilhamento", "rede corporativa"]),
  s("internet.indisponivel", "Sem internet", CATEGORIAS_CHAMADOS[1], ambos, "critica", 4, [local, impacto], ["Queda link intragov", "Solicitação para queda de link Intragov"], ["intragov", "caiu", "queda", "offline"], "Informe quando começou e se o problema afeta toda a unidade ou apenas alguns ambientes."),
  s("internet.instavel", "Internet lenta ou instável", CATEGORIAS_CHAMADOS[1], ambos, "alta", 8, [local, impacto], [], ["lentidao", "oscilando", "quedas", "conexao"]),
  s("internet.wifi", "Wi-Fi não funciona ou apresenta falha", CATEGORIAS_CHAMADOS[1], ambos, "alta", 8, [local, impacto], [], ["wifi", "wi-fi", "wireless", "seduc", "professora internet"]),
  s("internet.sdwan", "Validar segundo link de internet (SD-WAN)", CATEGORIAS_CHAMADOS[1], escola, "critica", 4, [{ id: "operadora", label: "Operadora e velocidade contratada" }, { id: "conexao", label: "Situação da conexão com o FortiGate / WAN2", dica: "Se não souber, informe que precisa de orientação." }], ["Validação SDWAN", "Solicitação para validação de segundo link (SDWAN)"], ["sdwan", "sd-wan", "fortigate", "link secundario"]),
  s("infra.ap", "Solicitar instalação de AP Meraki", CATEGORIAS_CHAMADOS[2], escola, "media", 24, [local, quantidade], ["Instalação AP Meraki", "Solicitação para instalação de AP's - ACCESS POINTS MERAKI"], ["wifi novo", "access point", "ampliar cobertura"]),
  s("infra.ponto.novo", "Solicitar novo ponto de rede", CATEGORIAS_CHAMADOS[2], ambos, "media", 24, [local, quantidade], ["Ponto de rede", "Pontos lógicos", "Solicitação para instalação de pontos lógicos", "Manutenção ou instalação de ponto de rede"], ["cabeamento", "cabo", "ponto logico"]),
  s("infra.ponto.falha", "Reparar ponto de rede ou cabeamento", CATEGORIAS_CHAMADOS[2], ambos, "media", 24, [local, impacto], [], ["rack", "switch", "cabo quebrado", "ponto sem sinal"]),
  s("infra.dvr", "Solicitar espelhamento ou apoio de rede para câmeras", CATEGORIAS_CHAMADOS[2], escola, "alta", 8, [local, { id: "dvr", label: "DVR/NVR e situação atual da conexão", dica: "Informe o IP, se disponível." }], ["Espelhamento DVR", "Solicitação para espelhamento de DVRs (câmeras)"], ["dvr", "nvr", "cftv", "camera"]),
  s("infra.ramal", "Instalar ou alterar ramal", CATEGORIAS_CHAMADOS[2], ure, "baixa", 48, [local, { id: "ramal", label: "Ramal atual ou alteração desejada" }], ["Instalação/alteração de ramal", "Instalação ou alteração de ramal"], ["telefone", "telefonia"]),
  s("infra.telefone", "Problema na linha telefônica", CATEGORIAS_CHAMADOS[2], ambos, "media", 24, [local, { id: "linha", label: "Linha / número afetado" }], [], ["reparo telefone", "sem sinal", "telefonia"]),
  s("equipamento.falha", "Equipamento com defeito ou sem funcionar", CATEGORIAS_CHAMADOS[3], ambos, "media", 24, [equipamento, local], ["Manutenção de equipamentos"], ["notebook", "desktop", "computador", "tablet", "smartphone", "quebrado", "nao liga"]),
  s("equipamento.bateria", "Problema na bateria ou no carregamento", CATEGORIAS_CHAMADOS[3], ambos, "media", 24, [equipamento, { id: "sintoma", label: "O que acontece ao carregar ou usar a bateria?" }], [], ["notebook", "lenovo", "carregador", "nao carrega", "descarrega"]),
  s("equipamento.garantia", "Orientação ou acompanhamento de garantia", CATEGORIAS_CHAMADOS[3], ambos, "media", 24, [equipamento, { id: "protocolo", label: "Protocolo de garantia, se já houver", opcional: true }], [], ["positivo", "multilaser", "lenovo", "coleta", "reparo"], "A SETEC orientará o encaminhamento conforme o equipamento e o fluxo de garantia aplicável."),
  s("equipamento.software", "Instalar ou configurar programa", CATEGORIAS_CHAMADOS[3], ambos, "media", 24, [equipamento, { id: "programa", label: "Programa e finalidade de uso" }], [], ["software", "ensino tecnico", "aplicativo", "instalacao", "windows"]),
  s("equipamento.periferico", "Solicitar ou configurar periférico", CATEGORIAS_CHAMADOS[3], ure, "baixa", 48, [{ id: "periferico", label: "Periférico solicitado e finalidade" }, local], ["Periféricos", "Periféricos (câmera/fone/caixa de som)"], ["fone", "webcam", "caixa de som", "mouse", "teclado"]),
  s("equipamento.monitor", "Instalar ou ajustar segundo monitor", CATEGORIAS_CHAMADOS[3], ure, "baixa", 48, [equipamento, local], ["Segundo monitor", "Instalação de segundo monitor"], ["tela", "hdmi"]),
  s("equipamento.carrinho", "Apoio com carrinho ou plataforma de recarga", CATEGORIAS_CHAMADOS[3], escola, "media", 24, [local, { id: "situacao", label: "Situação do carrinho / plataforma de recarga" }], [], ["notebooks", "carregamento", "carrinhos", "tomadas"]),
  s("impressao.falha", "Impressora com problema", CATEGORIAS_CHAMADOS[3], ambos, "alta", 8, [equipamento, local], [], ["impressao falhando", "papel", "scanner", "digitalizacao"]),
  s("impressao.toner", "Solicitar troca de toner", CATEGORIAS_CHAMADOS[3], ure, "alta", 8, [equipamento, local], ["Impressora / toner", "Troca de toner ou manutenção impressora"], ["cartucho", "suprimento", "tinta"]),
  s("impressao.servico", "Solicitar impressão ou digitalização", CATEGORIAS_CHAMADOS[3], ure, "alta", 8, [quantidade, { id: "formato", label: "Formato, cor e finalidade" }], [], ["copia", "colorida", "copias", "imprimir"]),
  s("sistema.erro", "Erro ou dificuldade em sistema institucional", CATEGORIAS_CHAMADOS[4], ambos, "media", 24, [sistema, { id: "operacao", label: "Operação que apresenta dificuldade" }], ["Solicitação para suporte a sistemas", "Suporte a sistemas"], ["sed", "portal", "hub", "nao funciona"]),
  s("sistema.cadastro", "Solicitar correção ou ajuste de cadastro", CATEGORIAS_CHAMADOS[4], ambos, "media", 24, [sistema, { id: "registro", label: "Registro e alteração solicitada" }], [], ["setec hub", "ese hub", "prisma", "dados incorretos", "corrigir"]),
  s("sistema.exclusao", "Solicitar exclusão de registro em sistema", CATEGORIAS_CHAMADOS[4], ure, "media", 24, [sistema, { id: "registro", label: "Identificador do registro e justificativa da exclusão" }], [], ["ese hub", "setec hub", "prisma", "apagar", "excluir"], "A solicitação será analisada pela equipe responsável. Abrir o chamado não exclui o registro automaticamente."),
  s("digital.site", "Publicar ou atualizar conteúdo no site", CATEGORIAS_CHAMADOS[4], ambos, "alta", 8, [{ id: "conteudo", label: "Conteúdo / página e objetivo da publicação" }, data], ["Publicação no site", "Solicitação para publicação no site"], ["wordpress", "noticia", "corrigir site"]),
  s("digital.formulario", "Criar ou ajustar formulário", CATEGORIAS_CHAMADOS[4], ure, "media", 24, [{ id: "objetivo", label: "Objetivo e público do formulário" }, { id: "campos", label: "Perguntas / campos necessários" }], ["Criação de formulário"], ["forms", "google forms", "pesquisa"]),
  s("digital.painel", "Criar ou ajustar painel e relatório", CATEGORIAS_CHAMADOS[4], ure, "media", 24, [{ id: "objetivo", label: "Objetivo e indicadores necessários" }, { id: "base", label: "Base de dados disponível" }], ["Criação de dashboards"], ["power bi", "dashboard", "planilha", "indicadores"]),
  s("evento.teams", "Agendar ou configurar reunião Teams", CATEGORIAS_CHAMADOS[5], ure, "alta", 8, [data, { id: "horario", label: "Horário, público e responsável pela reunião" }], ["Agendamento reunião Microsoft Teams"], ["videoconferencia", "convite", "gravacao"]),
  s("evento.apoio", "Solicitar apoio técnico em evento", CATEGORIAS_CHAMADOS[5], ure, "critica", 4, [data, local, { id: "apoio", label: "Horário e apoio necessário" }], ["Apoio técnico em eventos"], ["formacao", "transmissao", "reuniao"]),
  s("evento.equipamento", "Solicitar equipamentos para evento", CATEGORIAS_CHAMADOS[5], ure, "critica", 4, [data, { id: "itens", label: "Equipamentos, quantidades e horário de utilização" }], ["Equipamentos para eventos internos/externos", "Equipamentos para eventos"], ["reserva", "projetor", "microfone", "notebook"], "Informe período e responsável. A reserva será confirmada pela SETEC conforme disponibilidade; o chamado não reserva o estoque automaticamente."),
  s("evento.emprestimo", "Solicitar empréstimo de equipamento", CATEGORIAS_CHAMADOS[5], ure, "media", 24, [equipamento, { id: "periodo", label: "Retirada, devolução e finalidade de uso" }], ["Empréstimo de equipamento", "Equipamento para uso externo (empréstimo)"], ["emprestar notebook", "emprestimo notebook", "uso externo"]),
  s("inventario.orientacao", "Orientação para atualização de inventário", CATEGORIAS_CHAMADOS[6], ambos, "media", 24, [{ id: "base", label: "Inventário / base que está atualizando" }], [], ["seduc", "levantamento", "equipamentos"]),
  s("inventario.divergencia", "Informar divergência de inventário ou patrimônio", CATEGORIAS_CHAMADOS[6], ambos, "media", 24, [equipamento, { id: "divergencia", label: "Divergência encontrada" }], [], ["nao localizado", "serial duplicado", "patrimonio"]),
  s("inventario.movimentacao", "Orientação sobre movimentação de equipamentos", CATEGORIAS_CHAMADOS[6], ambos, "baixa", 48, [equipamento, { id: "movimentacao", label: "Origem, destino e finalidade" }], [], ["remanejamento", "transferencia", "doacao"]),
  s("field.visita", "Solicitar agendamento de visita FIELD", CATEGORIAS_CHAMADOS[7], escola, "alta", 8, [data, { id: "motivo", label: "Motivo da visita, ambientes e horário de preferência" }], ["Visita FIELD", "Solicitação para agendamento de visita - Técnico de Campo (FIELD)"], ["tecnico de campo", "presencial", "agendar visita"], "Informe a necessidade técnica e o período desejado. A programação será confirmada pela equipe."),
  s("outra", "Não encontrei minha solicitação", CATEGORIAS_CHAMADOS[8], ambos, "media", 24, [{ id: "assunto", label: "Qual é o assunto da solicitação?" }, { id: "motivo_outros", label: "O que faltou nas opções disponíveis?" }], ["Outras solicitações"], ["outros", "outras", "orientacao"], "Confira as sugestões. Se nenhuma representar sua necessidade, descreva o assunto para triagem da SETEC."),
];
export const normalizarCatalogo = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
export function servicosDaOrigem(origem: OrigemChamado) { return CATALOGO_CHAMADOS.filter(s => s.origens.includes(origem)); }
export function encontrarServico(id: unknown, origem?: OrigemChamado) { return CATALOGO_CHAMADOS.find(s => s.id === id && (!origem || s.origens.includes(origem))) || null; }
export function servicoLegado(categoria: unknown, origem?: OrigemChamado) {
  const chave = normalizarCatalogo(categoria);
  return CATALOGO_CHAMADOS.find(s => (!origem || s.origens.includes(origem)) && s.aliases.some(a => normalizarCatalogo(a) === chave)) || null;
}
export type ChamadoClassificavel = { servico_id?: string | null; categoria?: string | null; subcategoria?: string | null; origem?: string | null; tipo?: string | null };
export function origemCatalogo(c: ChamadoClassificavel): OrigemChamado | undefined {
  const o = normalizarCatalogo(c.origem || c.tipo); return o === "escola" ? "escola" : ["ure", "sede"].includes(o) ? "ure" : undefined;
}
// Essas opções antigas reuniam mais de um serviço. Agrupa a família, mas mantém
// o assunto original até uma reclassificação humana; não inventa o detalhe.
const assuntosLegadosAmplos = new Set([
  "Impressora / toner", "Troca de toner ou manutenção impressora",
  "Ponto de rede", "Pontos lógicos", "Manutenção ou instalação de ponto de rede",
  "Solicitação para suporte a sistemas", "Suporte a sistemas",
].map(normalizarCatalogo));
export function classificacaoChamado(c: ChamadoClassificavel) {
  const s = encontrarServico(c.servico_id, origemCatalogo(c)) || (!c.servico_id ? servicoLegado(c.categoria, origemCatalogo(c)) : null);
  const amplo = !c.servico_id && assuntosLegadosAmplos.has(normalizarCatalogo(c.categoria));
  return { categoria: s?.categoria || c.categoria?.trim() || "Sem categoria", assunto: amplo ? c.categoria!.trim() : s?.label || c.subcategoria?.trim() || c.categoria?.trim() || "Sem assunto",
    servico: amplo ? null : s, legado: !c.servico_id, outra: s?.id === "outra" || normalizarCatalogo(c.categoria) === "outras solicitacoes" };
}
const ignorar = new Set(["de", "do", "da", "dos", "das", "a", "o", "e", "em", "para", "com", "nao", "no", "na", "um", "uma", "preciso", "solicitar", "solicitacao", "problema"]);
export function buscarServicos(termo: string, origem: OrigemChamado) {
  const tokens = normalizarCatalogo(termo).split(/[^a-z0-9]+/).filter(t => t && !ignorar.has(t));
  return servicosDaOrigem(origem).filter(s => { const texto = normalizarCatalogo([s.label, s.categoria, ...s.palavras, ...s.aliases].join(" ")); return tokens.every(t => texto.includes(t)); });
}
