/** Estilos exclusivos dos documentos. Não alteram a página do sistema. */
export const estilosDocumentoSaresp = `
  * { box-sizing: border-box; }

  :root {
    --tinta: #172a42;
    --azul: #163d6a;
    --linha: #d3dce6;
    --suave: #f5f8fb;
    --secundaria: #56677c;
  }

  body {
    margin: 0;
    background: #e8edf3;
    color: var(--tinta);
    font: 10pt/1.5 Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  main { margin: 28px auto; }

  .pagina {
    display: flex;
    flex-direction: column;
    min-height: var(--altura-pagina);
    padding: 0;
    background: #fff;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pagina > * { flex-shrink: 0; }
  .pagina + .pagina { margin-top: 28px; }

  /* Cabeçalho oficial, com a mesma identificação dos relatórios do Hub. */
  .cabecalho { margin: 0 0 16px; }
  .institucional {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) 54px;
    align-items: center;
    gap: 16px;
    padding: 0 0 14px;
    border-bottom: 1px solid var(--linha);
  }
  .brasao { display: block; width: 54px; height: 54px; object-fit: contain; }
  .institucional-texto {
    color: #151515;
    text-align: center;
    font: bold 7.5pt/1.35 "Times New Roman", Times, serif;
  }
  .institucional-texto p { margin: 0; }
  .titulo-documento { padding-top: 14px; }
  .sobretitulo {
    margin: 0 0 6px;
    color: var(--azul);
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }
  h1 { margin: 0; color: var(--azul); font-size: 18pt; line-height: 1.2; letter-spacing: -.35px; }
  .edicao { margin: 8px 0 0; color: var(--secundaria); font-size: 9pt; line-height: 1.5; }
  .edicao strong { color: var(--tinta); }
  .metaperiodo { display: inline-block; margin-left: 10px; }
  .pagina-continuacao .titulo-documento .sobretitulo { display: none; }
  .pagina-continuacao h1 { font-size: 16pt; }
  .pagina-continuacao .cabecalho { margin-bottom: 12px; }

  /* Os quatro indicadores têm o mesmo tamanho e separação. */
  .resumo {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 0 0 16px;
    break-inside: avoid;
  }
  .resumo > div { padding: 10px 12px; border: 1px solid var(--linha); border-top: 3px solid var(--azul); border-radius: 5px; background: var(--suave); }
  .resumo span { display: block; color: var(--secundaria); font-size: 7.5pt; line-height: 1.4; }
  .resumo strong { display: block; margin-top: 6px; font-size: 18pt; line-height: 1.1; }
  .resumo .texto-data { font-size: 10pt; line-height: 1.45; }

  .intro { margin: 0 0 15px; color: var(--secundaria); font-size: 9pt; line-height: 1.55; }
  .intro strong { color: var(--tinta); }
  .titulo-secao { margin: 0 0 11px; color: var(--azul); font-size: 11pt; line-height: 1.4; }

  table { width: 100%; margin: 0 0 18px; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th {
    padding: 10px 9px;
    border: 1px solid var(--azul);
    background: var(--azul);
    color: #fff;
    text-align: left;
    font-size: 8pt;
    font-weight: 700;
    line-height: 1.35;
    vertical-align: middle;
  }
  td {
    padding: 10px 9px;
    border: 1px solid var(--linha);
    color: var(--tinta);
    font-size: 9pt;
    line-height: 1.4;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  tr { break-inside: avoid; page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: #f7f9fc; }
  td strong { font-weight: 700; }
  small { display: block; margin-top: 5px; color: var(--secundaria); font-size: 7.5pt; line-height: 1.45; }
  .center { text-align: center; }
  .numero { text-align: center; font-variant-numeric: tabular-nums; }
  .numero strong { font-size: 11pt; }
  .falta { color: #a82320; font-weight: 700; }
  .coberto { color: #146249; font-weight: 700; }
  .vazio { padding: 20px; text-align: center; color: var(--secundaria); }
  .status { font-size: 8pt; font-weight: 700; }

  /* Orientações divididas em parágrafos, sem blocos de texto apertados. */
  .obs {
    margin: 0 0 18px;
    padding: 14px 16px;
    border: 1px solid var(--linha);
    border-left: 3px solid #487b9e;
    border-radius: 0 5px 5px 0;
    background: var(--suave);
    font-size: 8.5pt;
    line-height: 1.55;
    break-inside: avoid;
  }
  .obs h2 { margin: 0 0 9px; color: var(--azul); font-size: 10pt; }
  .obs p { margin: 0; }
  .obs p + p { margin-top: 9px; }
  .notas-impressao { display: flow-root; }
  .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin: 8mm 0 6mm; break-inside: avoid; }
  .assinatura { min-height: 32mm; padding-top: 18mm; text-align: center; }
  .assinatura strong { display: block; padding-top: 8px; border-top: 1px solid #7c8da1; font-size: 8.5pt; }
  .assinatura span { display: block; margin-top: 4px; color: var(--secundaria); font-size: 8pt; }

  footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 18px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--linha);
    color: var(--secundaria);
    font-size: 7pt;
    line-height: 1.4;
  }
  footer span:first-child { max-width: 70%; }
  footer span:last-child { text-align: right; white-space: nowrap; }

  /* Guia: espaço para escrever o número de série e o patrimônio à mão. */
  .ficha { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 0 17px; }
  .ficha > div { min-width: 0; padding: 13px 15px; border: 1px solid var(--linha); border-radius: 5px; }
  .ficha .rotulo { display: block; margin-bottom: 7px; color: var(--secundaria); font-size: 7.5pt; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .ficha strong { display: block; font-size: 10pt; line-height: 1.4; overflow-wrap: anywhere; }
  .referencia { display: flex; gap: 16px; justify-content: space-between; margin: 0 0 15px; font-size: 8pt; color: var(--secundaria); }
  .serial th { padding: 8px; }
  .serial td { height: 8mm; padding: 6px 8px; vertical-align: middle; font-size: 8pt; }

  /* Guia: cabeçalho compacto e 8 mm por linha para preenchimento manual. */
  .guia .institucional { grid-template-columns: 48px minmax(0,1fr) 48px; gap: 10px; }
  .guia .brasao { width: 48px; height: 48px; }
  .guia .metaperiodo { margin-left: 0; display: block; }
  .guia .resumo { gap: 8px; }
  .guia .assinaturas { gap: 18mm; }
  .guia .cabecalho { margin-bottom: 13px; }
  .guia .institucional { padding-bottom: 10px; }
  .guia .institucional-texto { font-size: 7pt; line-height: 1.25; }
  .guia .titulo-documento { padding-top: 12px; }
  .guia .sobretitulo { font-size: 6.8pt; margin-bottom: 4px; }
  .guia h1 { font-size: 14pt; }
  .guia .edicao { margin-top: 6px; font-size: 8pt; line-height: 1.3; }
  .guia .ficha { margin-bottom: 12px; }
  .guia .ficha > div { padding: 9px 11px; }
  .guia .ficha .rotulo { font-size: 7pt; margin-bottom: 4px; }
  .guia .ficha strong { font-size: 9.5pt; line-height: 1.35; }
  .guia .ficha small { margin-top: 3px; font-size: 7pt; }
  .guia .resumo { margin-bottom: 12px; }
  .guia .resumo > div { padding: 8px 10px; }
  .guia .resumo span { font-size: 7pt; }
  .guia .resumo strong { font-size: 15pt; margin-top: 4px; }
  .guia .resumo .texto-data { font-size: 8pt; line-height: 1.3; }
  .guia .referencia { font-size: 7.5pt; line-height: 1.4; margin-bottom: 10px; }
  .guia .titulo-secao { font-size: 10pt; margin-bottom: 8px; }
  .guia .obs { padding: 9px 11px; font-size: 7.5pt; line-height: 1.4; margin-bottom: 12px; }
  .guia .obs h2 { font-size: 9pt; margin-bottom: 6px; }
  .guia .obs p + p { margin-top: 6px; }
  .guia .assinaturas { margin: 6mm 0 5mm; }
  .guia .assinatura { min-height: 32mm; padding-top: 18mm; }
  .guia .assinatura strong { font-size: 8pt; line-height: 1.35; padding-top: 6px; }
  .guia .assinatura span { font-size: 7pt; line-height: 1.3; }
  .documento-curto .titulo-documento .sobretitulo { display: none; }
  .documento-curto .cabecalho { margin-bottom: 12px; }
  .documento-curto .obs { font-size: 8pt; line-height: 1.45; padding: 11px 13px; }
  .documento-curto .assinatura { min-height: 32mm; padding-top: 18mm; }

  .pagina-continuacao[data-bloco="conferencia"] .intro { display: none; }
  [data-bloco="conferencia"] td { padding: 9px; }
  [data-bloco="conferencia"] small { margin-top: 3px; }
  .status small { margin-top: 4px; font-weight: 400; }

  .pagina-densa td { padding-top: 7px; padding-bottom: 7px; font-size: 8.5pt; }
  .pagina-densa small { margin-top: 3px; font-size: 7pt; }

  .print-toolbar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px 18px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--linha);
    background: #fff;
    color: var(--secundaria);
    font-size: 10pt;
  }
  .print-toolbar button { padding: 11px 18px; border: 0; border-radius: 6px; background: var(--azul); color: #fff; font: bold 10pt Arial, sans-serif; cursor: pointer; }
  .print-toolbar button:disabled { opacity: .5; cursor: wait; }
  .aviso-impressao { display: none; margin: 12px; padding: 12px; border: 1px solid #b42318; color: #b42318; background: #fff; font-size: 10pt; }

  @media screen {
    main { box-shadow: 0 0 0 15mm white, 0 9px 45px #25364a1a; }
    .pagina + .pagina { border-top: 1px dashed #b7c6d7; }
  }

  @media print {
    body { background: #fff; }
    main { margin: 0; padding: 0; box-shadow: none; }
    .print-toolbar, .aviso-impressao { display: none !important; }
    .pagina + .pagina { margin-top: 0; break-before: page; page-break-before: always; }
    a { color: inherit; text-decoration: none; }
  }
`
