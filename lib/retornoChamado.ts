export const LIMITE_RETORNO_CHAMADO = 10_000;
export const LIMITE_SEGURO_RETORNO_CHAMADO = 9_500;

export type ModoRetornoChamado = "compacto" | "completo";

type ItemRetornoChamado = {
  equipamento: string;
  marca_modelo?: string | null;
  patrimonio?: string | null;
  numero_serie?: string | null;
  problema_relatado?: string | null;
  acao_realizada?: string | null;
  resultado?: string | null;
};

export type DadosRetornoChamado = {
  id: string;
  escola_nome: string;
  tecnico_nome: string;
  chamado_referencia?: string | null;
  resumo_atendimento?: string | null;
  observacoes_gerais?: string | null;
  pareceres_tecnicos_itens?: readonly ItemRetornoChamado[];
};

export type DivisaoRetornoChamado = {
  partes: string[];
  erro: string | null;
};

function limparCampo(value: string | null | undefined) {
  return String(value || "")
    .replace(/\r\n|\r/g, "\n")
    .trim();
}

function emUmaLinha(value: string | null | undefined) {
  return limparCampo(value).replace(/\s+/g, " ");
}

// Contagem conservadora: considera CRLF e as unidades UTF-16 dos caracteres.
// Assim, colar em um sistema que converte as quebras não supera o limite.
export function contarCaracteresRetorno(texto: string) {
  return texto.replace(/\r\n|\r|\n/g, "\r\n").length;
}

export function obterTitulosEquipamentosRetorno(
  parecer: DadosRetornoChamado,
  modo: ModoRetornoChamado,
) {
  return (parecer.pareceres_tecnicos_itens || []).map((item, index) => {
    if (modo === "completo") {
      return `${index + 1}. ${item.equipamento || "Equipamento não informado"}`.split(
        /\r\n|\r|\n/,
      )[0];
    }

    const equipamento =
      emUmaLinha(item.equipamento) || "Equipamento não informado";
    const marcaModelo = emUmaLinha(item.marca_modelo);
    const complemento =
      marcaModelo &&
      marcaModelo.toLocaleLowerCase("pt-BR") !==
        equipamento.toLocaleLowerCase("pt-BR")
        ? ` | ${marcaModelo}`
        : "";
    return `${index + 1}. ${equipamento}${complemento}`;
  });
}

export function montarTextoRetornoCompacto(
  parecer: DadosRetornoChamado,
  dataFormatada: string,
) {
  const itens = parecer.pareceres_tecnicos_itens || [];
  const titulos = obterTitulosEquipamentosRetorno(parecer, "compacto");
  const referencia = limparCampo(parecer.chamado_referencia);
  const cabecalho = [
    `Atendimento: ${dataFormatada}`,
    `Escola: ${limparCampo(parecer.escola_nome) || "Não informada"}`,
    `Técnico: ${limparCampo(parecer.tecnico_nome) || "Não informado"}`,
    ...(referencia ? [`Chamado: ${referencia}`] : []),
    `Equipamentos: ${itens.length}`,
  ].join("\n");

  // Cada item conserva seu próprio bloco, mesmo quando os dados são iguais.
  const equipamentos = itens.length
    ? itens.map((item, index) => {
        const patrimonio = limparCampo(item.patrimonio);
        return [
          titulos[index],
          `S/N: ${limparCampo(item.numero_serie) || "Não informado"}${patrimonio ? ` | Pat.: ${patrimonio}` : ""}`,
          `Problema: ${limparCampo(item.problema_relatado) || "Não informado"}`,
          `Ação: ${limparCampo(item.acao_realizada) || "Não informada"}`,
          `Resultado: ${limparCampo(item.resultado) || "Não informado"}`,
        ].join("\n");
      })
    : ["Nenhum equipamento foi registrado neste relatório."];

  const resumo = limparCampo(parecer.resumo_atendimento);
  const observacoes = limparCampo(parecer.observacoes_gerais);
  const rodape = [
    ...(resumo ? [`Resumo: ${resumo}`] : []),
    ...(observacoes ? [`Obs.: ${observacoes}`] : []),
    `Relatório completo no SETEC Hub${parecer.id ? ` | ID: ${emUmaLinha(parecer.id)}` : ""}.`,
  ].join("\n\n");

  return [cabecalho, ...equipamentos, rodape].join("\n\n");
}

function localizarTituloUnico(texto: string, titulo: string) {
  let posicao = texto.indexOf(titulo);
  let encontrada = -1;

  while (posicao !== -1) {
    const anterior = texto[posicao - 1];
    const seguinte = texto[posicao + titulo.length];
    const inicioDeLinha =
      posicao === 0 || anterior === "\n" || anterior === "\r";
    const fimDeLinha =
      seguinte === undefined || seguinte === "\n" || seguinte === "\r";

    if (inicioDeLinha && fimDeLinha) {
      if (encontrada !== -1) return -1;
      encontrada = posicao;
    }
    posicao = texto.indexOf(titulo, posicao + titulo.length);
  }

  return encontrada;
}

function rotuloParte(indice: number, total: number, relatorioId: string) {
  return `Parte ${indice}/${total}${relatorioId ? ` | Relatório ${emUmaLinha(relatorioId)}` : ""}\n\n`;
}

export function dividirRetornoEmPartes(
  texto: string,
  titulosEquipamentos: readonly string[],
  relatorioId: string,
): DivisaoRetornoChamado {
  if (!texto.trim()) {
    return { partes: [], erro: "O texto do retorno está vazio." };
  }
  if (contarCaracteresRetorno(texto) <= LIMITE_SEGURO_RETORNO_CHAMADO) {
    return { partes: [texto], erro: null };
  }

  const posicoes: number[] = [];
  for (let i = 0; i < titulosEquipamentos.length; i++) {
    const posicao = localizarTituloUnico(texto, titulosEquipamentos[i]);
    if (posicao < 0 || (i > 0 && posicao <= posicoes[i - 1])) {
      return {
        partes: [],
        erro: `Não foi possível identificar com segurança o equipamento ${i + 1}. Preserve a linha numerada "${titulosEquipamentos[i]}" para dividir o texto. Seus ajustes foram mantidos.`,
      };
    }
    posicoes.push(posicao);
  }

  // Cortes apenas antes dos títulos numerados. Diagnósticos, ações, seriais
  // e o rodapé junto do último equipamento permanecem inteiros.
  const blocos: Array<{ texto: string; equipamento: number | null }> = [];
  if (posicoes.length) {
    if (posicoes[0] > 0) {
      blocos.push({ texto: texto.slice(0, posicoes[0]), equipamento: null });
    }
    posicoes.forEach((posicao, index) => {
      blocos.push({
        texto: texto.slice(posicao, posicoes[index + 1] ?? texto.length),
        equipamento: index + 1,
      });
    });
  } else {
    blocos.push({ texto, equipamento: null });
  }

  const maximoPartes = blocos.length;
  const reserva = contarCaracteresRetorno(
    rotuloParte(maximoPartes, maximoPartes, relatorioId),
  );
  const limiteConteudo = LIMITE_SEGURO_RETORNO_CHAMADO - reserva;
  if (limiteConteudo <= 0) {
    return {
      partes: [],
      erro: "A identificação do relatório excede o espaço de uma parte. Revise o retorno antes de copiar.",
    };
  }

  const conteudos: string[] = [];
  let atual = "";
  for (const bloco of blocos) {
    if (contarCaracteresRetorno(bloco.texto) > limiteConteudo) {
      const alvo = bloco.equipamento
        ? `O bloco do equipamento ${bloco.equipamento}`
        : "O cabeçalho ou texto geral";
      return {
        partes: [],
        erro: `${alvo} é maior que uma parte de 9.500 caracteres. Reduza esse trecho do retorno, mantendo os detalhes no relatório e no PDF. Nenhum texto foi cortado.`,
      };
    }
    if (
      atual &&
      contarCaracteresRetorno(atual + bloco.texto) > limiteConteudo
    ) {
      conteudos.push(atual);
      atual = "";
    }
    atual += bloco.texto;
  }
  if (atual) conteudos.push(atual);

  const partes = conteudos.map(
    (conteudo, index) =>
      rotuloParte(index + 1, conteudos.length, relatorioId) + conteudo,
  );
  if (
    partes.some(
      (parte) => contarCaracteresRetorno(parte) > LIMITE_SEGURO_RETORNO_CHAMADO,
    )
  ) {
    return {
      partes: [],
      erro: "Não foi possível preparar partes dentro do limite. Revise o texto do retorno antes de copiar.",
    };
  }
  return { partes, erro: null };
}
