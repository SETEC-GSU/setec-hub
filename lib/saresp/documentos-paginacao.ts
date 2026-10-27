/**
 * Pagina pelo tamanho real do A4, após o brasão e as fontes estarem prontos.
 * Cada bloco mantém seu próprio cabeçalho de tabela. Nenhum registro é cortado.
 */
export const paginacaoDocumentoSaresp = String.raw`<script>
(function () {
  function prepararDocumento() {
    var main = document.querySelector('main');
    var originais = Array.from(main.querySelectorAll('.pagina'));
    var botao = document.getElementById('imprimir-documento');
    var guia = document.body.classList.contains('guia');
    var altura = Number(main.dataset.altura) * 96 / 25.4 - 2;
    var paginas = [];
    var grupos = [];

    document.documentElement.style.setProperty('--altura-pagina', altura + 'px');

    originais.forEach(function (secao) {
      var chave = secao.dataset.bloco || 'principal';
      var grupo = grupos.find(function (g) { return g.chave === chave; });
      if (!grupo) {
        grupo = { chave: chave, secoes: [] };
        grupos.push(grupo);
      }
      grupo.secoes.push(secao);
    });

    main.replaceChildren();

    function excedeu(pagina) {
      return pagina.getBoundingClientRect().height > altura + 0.5;
    }

    function conferirPagina(pagina) {
      if (excedeu(pagina)) pagina.classList.add('pagina-densa');
      if (excedeu(pagina)) {
        throw new Error('Uma linha ou orientação é maior que a área da folha. Revise os textos muito extensos antes de imprimir.');
      }
    }

    grupos.forEach(function (grupo) {
      var primeira = grupo.secoes[0];
      var ultima = grupo.secoes[grupo.secoes.length - 1];
      var modelo = primeira.querySelector('table');
      var rodape = primeira.querySelector('footer');
      var linhas = grupo.secoes.flatMap(function (s) {
        return Array.from(s.querySelectorAll('tbody tr'));
      });
      var prefixo = [];
      var anterior = modelo.previousElementSibling;

      while (anterior) {
        prefixo.unshift(anterior.cloneNode(true));
        anterior = anterior.previousElementSibling;
      }

      var notas = document.createElement('div');
      notas.className = 'notas-impressao';
      [ultima.querySelector('.obs'), ultima.querySelector('.assinaturas')].forEach(function (el) {
        if (el) notas.appendChild(el.cloneNode(true));
      });

      function novaPagina(primeiraPagina, comTabela) {
        var pagina = document.createElement('section');
        pagina.className = primeiraPagina ? 'pagina' : 'pagina pagina-continuacao';
        pagina.dataset.bloco = grupo.chave;
        prefixo.forEach(function (el) {
          if (!guia && !primeiraPagina && el.classList.contains('resumo')) return;
          pagina.appendChild(el.cloneNode(true));
        });
        if (comTabela) {
          var tabela = modelo.cloneNode(true);
          tabela.querySelector('tbody').replaceChildren();
          pagina.appendChild(tabela);
        }
        if (guia && notas.childElementCount) pagina.appendChild(notas.cloneNode(true));
        pagina.appendChild(rodape.cloneNode(true));
        main.appendChild(pagina);
        paginas.push(pagina);
        return pagina;
      }

      var atual = novaPagina(true, true);
      linhas.forEach(function (linha) {
        var corpo = atual.querySelector('tbody');
        corpo.appendChild(linha.cloneNode(true));
        if (excedeu(atual) && corpo.rows.length > 1) {
          var transferida = corpo.lastElementChild;
          transferida.remove();
          atual = novaPagina(false, true);
          atual.querySelector('tbody').appendChild(transferida);
        }
        conferirPagina(atual);
      });

      if (!guia && notas.childElementCount) {
        atual.insertBefore(notas, atual.querySelector('footer'));
        if (excedeu(atual)) {
          notas.remove();
          var anteriorPagina = atual;
          var corpoAnterior = anteriorPagina.querySelector('tbody');
          var quantidade = Math.min(2, Math.max(corpoAnterior.rows.length - 1, 0));
          atual = novaPagina(false, quantidade > 0);
          atual.insertBefore(notas, atual.querySelector('footer'));

          // Leva apenas as linhas que realmente cabem junto das orientações.
          for (var i = 0; i < quantidade; i++) {
            var transferida = corpoAnterior.lastElementChild;
            var corpoNovo = atual.querySelector('tbody');
            corpoNovo.insertBefore(transferida, corpoNovo.firstChild);
            if (excedeu(atual)) {
              corpoAnterior.appendChild(transferida);
              break;
            }
          }
          if (atual.querySelector('tbody') && !atual.querySelector('tbody').rows.length) {
            atual.querySelector('table').remove();
          }
          conferirPagina(atual);
        }
      }
    });

    paginas.forEach(function (pagina, indice) {
      var rodape = pagina.querySelector('footer');
      rodape.lastElementChild.textContent = 'Página ' + (indice + 1) + ' de ' + paginas.length;
      if (guia) {
        var numeros = Array.from(pagina.querySelectorAll('tbody tr td:nth-child(3n+1)'))
          .map(function (el) { return Number(el.textContent); }).filter(Boolean);
        var titulo = pagina.querySelector('.titulo-secao');
        if (titulo && numeros.length) {
          titulo.textContent = 'Conferência dos equipamentos ' + Math.min.apply(null, numeros) + ' a ' + Math.max.apply(null, numeros);
        }
      }
      conferirPagina(pagina);
    });

    window.__sarespPaginado = true;
    botao.disabled = false;
    botao.textContent = 'Salvar em PDF / imprimir';
    document.getElementById('estado-documento').textContent = 'Documento pronto. Use papel A4 e desative os cabeçalhos e rodapés automáticos do navegador.';
  }

  window.addEventListener('load', function () {
    Promise.resolve(document.fonts ? document.fonts.ready : null)
      .then(function () { return new Promise(function (resolve) { requestAnimationFrame(resolve); }); })
      .then(prepararDocumento)
      .catch(function (erro) {
        var aviso = document.getElementById('aviso-impressao');
        aviso.style.display = 'block';
        aviso.textContent = 'Não foi possível preparar a paginação: ' + erro.message;
        document.getElementById('estado-documento').textContent = 'Revise a mensagem de formatação abaixo.';
        window.__sarespErro = erro.message;
      });
  }, { once: true });
})();
</script>`
