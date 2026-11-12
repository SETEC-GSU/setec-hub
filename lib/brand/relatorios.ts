import { logoSetecDataUri, type TomMarca } from "./identidade";

/** A marca acompanha o HTML, inclusive na impressão local e no backup em lote. */
export function marcaDocumentoHtml(tom: TomMarca = "claro", largura = 190) {
  const width = Math.max(64, Math.min(400, largura));
  return `<img class="setec-document-brand" src="${logoSetecDataUri(tom)}" alt="SETEC Hub - URE Guarulhos Sul" width="${width}" height="${(width*224/1100).toFixed(2)}" style="display:block;width:${width}px;max-width:100%;height:auto;object-fit:contain"/>`;
}

/** O título é fixo no chamador; dados dinâmicos da identificação continuam escapados. */
export function cabecalhoTecnicoHtml(titulo: string, identificacaoHtml: string) {
  return `<header class="setec-document-header"><div class="setec-document-top">${marcaDocumentoHtml()}<div class="setec-document-meta">${identificacaoHtml}</div></div><div class="setec-document-title"><span>FIELDS / REGISTRO TÉCNICO</span><h1>${titulo}</h1></div></header>`;
}

/** Aplicado depois dos estilos existentes, sem alterar o conteúdo do atendimento. */
export const estilosDocumentoTecnico = `
  @page { size: A4; margin: 15mm 14mm 16mm; }
  html,body { font-size:11.5px; line-height:1.48; color:#172a42; }
  body { overflow-wrap:anywhere; }
  .setec-document-header { margin:0 0 18px; border-bottom:2px solid #176bff; padding-bottom:15px; break-inside:avoid; }
  .setec-document-top { display:flex; justify-content:space-between; align-items:center; gap:24px; min-height:48px; }
  .setec-document-meta { flex:0 1 220px; min-width:0; text-align:right; color:#526783; font-size:9px; line-height:1.6; }
  .setec-document-meta strong { color:#172a42; }
  .setec-document-title { margin-top:18px; }
  .setec-document-title>span { display:block; color:#526783; font-size:8px; font-weight:700; letter-spacing:1.3px; margin-bottom:5px; }
  .setec-document-title h1 { font-size:22px; line-height:1.2; letter-spacing:-.35px; color:#172a42; margin:0; }
  .headline { gap:12px; margin-bottom:14px; }
  .school-card,.service-card,.card,.summary-card { padding:13px; border-color:#d7e1ed; border-radius:8px; }
  .summary-card { margin-bottom:14px; }
  .summary-text { font-size:11px; line-height:1.6; font-weight:400; }
  .card-title { font-size:9px; margin-bottom:10px; padding-bottom:7px; }
  .info-grid { gap:10px 14px; }
  .label { font-size:8px; line-height:1.4; font-weight:700; margin-bottom:4px; }
  .value { font-size:10.5px; line-height:1.5; font-weight:600; }
  .metrics { gap:8px; margin-bottom:16px; }
  .metric { padding:11px 10px; border-radius:7px; min-height:65px; }
  .metric strong { font-size:21px; margin-bottom:7px; }
  .metric span { font-size:7.7px; line-height:1.4; }
  .section-title { margin:18px 0 10px; break-after:avoid; }
  .item { padding:14px; margin:0 0 14px; border-color:#d7e1ed; border-radius:8px; break-inside:auto; page-break-inside:auto; }
  .item.item-curto { break-inside:avoid; page-break-inside:avoid; }
  .item-top { margin-bottom:12px; padding-bottom:10px; break-inside:avoid; break-after:avoid; }
  .item-title { min-width:0; }
  .item-title h3 { font-size:14px; line-height:1.35; }
  .item-title p { font-size:10px; line-height:1.4; }
  .mini-grid { gap:8px; margin-bottom:10px; break-inside:avoid; }
  .mini-cell { padding:9px; border-radius:6px; }
  .text-grid { gap:9px; }
  .text-box,.observation { padding:10px 11px; border-radius:6px; font-size:11px; line-height:1.6; font-weight:400; }
  .text-box p,.observation p,.summary-text { orphans:3; widows:3; }
  .item-longo .text-grid { display:block; }
  .item-longo .text-box { margin-bottom:9px; }
  .item-longo .mini-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .bloco-longo { break-inside:auto !important; page-break-inside:auto !important; }
  .headline.bloco-longo { display:block; }
  .headline.bloco-longo>div { margin-bottom:12px; break-inside:auto; }
  .document-end { break-inside:avoid; page-break-inside:avoid; }
  .footer { margin-top:22px; padding-top:38px; column-gap:52px; }
  .signature { padding-top:9px; min-height:55px; font-size:10px; line-height:1.5; font-weight:600; }
  .note { font-size:8px; line-height:1.5; margin-top:12px; }
  @media screen { body { max-width:182mm; margin:24px auto; padding:0 16px; } }
  @media print { .item { break-inside:auto; page-break-inside:auto; } .item-curto { break-inside:avoid; page-break-inside:avoid; } }
`;

/** Autossuficiente para page.evaluate e para a janela de impressão. */
export function ajustarPaginacaoTecnica() {
  const alturaUtil = (297 - 15 - 16) * 96 / 25.4;
  document.querySelectorAll<HTMLElement>(".item").forEach(item => {
    item.classList.remove("item-curto", "item-longo");
    const longo = item.getBoundingClientRect().height > alturaUtil - 30;
    item.classList.add(longo ? "item-longo" : "item-curto");
  });
  document.querySelectorAll<HTMLElement>(".headline,.summary-card").forEach(bloco => {
    bloco.classList.toggle("bloco-longo", bloco.getBoundingClientRect().height > alturaUtil - 30);
  });
}

export function scriptImpressaoTecnica() {
  return `<script>window.addEventListener("load", function () {
    Promise.all([document.fonts ? document.fonts.ready : Promise.resolve()].concat(
      Array.from(document.images).map(function (img) { return img.complete ? Promise.resolve() : new Promise(function (resolve) { img.addEventListener("load",resolve,{once:true}); img.addEventListener("error",resolve,{once:true}); }); })
    )).then(function () { (${ajustarPaginacaoTecnica.toString()})(); setTimeout(function () { window.focus(); window.print(); }, 450); });
  }, {once:true});</script>`;
}

/** Usado nos cabeçalhos repetidos do Chromium. Sem JavaScript ou fontes externas. */
export function cabecalhoInstitucionalHtml(brasao: string) {
  return `<div style="box-sizing:border-box;width:100%;padding:0 15mm;color:#172a42"><div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #d7e1ed;padding-bottom:10px"><div style="width:104px;flex:none"><img src="${brasao}" alt="Brasão do Estado de São Paulo" style="display:block;width:48px;height:48px;margin:auto;object-fit:contain"/></div><div style="flex:1;text-align:center;font:700 9px/1.45 'Times New Roman',serif">GOVERNO DO ESTADO DE SÃO PAULO<br/>SECRETARIA DE ESTADO DA EDUCAÇÃO<br/>UNIDADE REGIONAL DE ENSINO GUARULHOS SUL<br/>SEINTEC - SERVIÇO DE INFORMAÇÕES EDUCACIONAIS E TECNOLOGIA<br/>SETEC - SEÇÃO DE TECNOLOGIA</div><div style="width:104px;flex:none;display:flex;justify-content:flex-end">${marcaDocumentoHtml("claro",94)}</div></div></div>`;
}

/** Ajustes comuns aos relatórios mensais/anuais, sem mexer nos indicadores. */
export const estilosRelatorioGerencial = `
  body { font-size:12px; line-height:1.55; }
  .titulo { border-top:4px solid #176bff; padding:17px 0 19px; margin-bottom:23px; }
  .titulo h1 { font-size:29px; line-height:1.2; margin:10px 0 14px; }
  .periodo { max-width:185px; min-width:145px; }
  .periodo strong { font-size:16px; line-height:1.35; overflow-wrap:anywhere; }
  .titulo-linha>div { min-width:0; }
  .secao-titulo { margin-top:25px; margin-bottom:15px; }
  .kpi { padding:12px 13px; border-radius:6px; }
  .kpi .eyebrow { font-size:8px; line-height:1.5; }
  .kpi span { font-size:9.5px; line-height:1.5; }
  .grafico { padding:16px; }
  .ponto { padding:14px 16px; }
  td { padding:9px; line-height:1.5; }
  th { padding:10px 9px; }
  .note { padding:12px 14px; line-height:1.6; }
  .texto-longo { font-size:11.5px; line-height:1.65; }
`;
