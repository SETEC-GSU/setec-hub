import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Browser } from "puppeteer-core"
import { cabecalhoInstitucionalHtml } from "@/lib/brand/relatorios"
import { logoSetecDataUri } from "@/lib/brand/identidade"
import { escaparEscolas } from "./relatorio-html"
export async function pdfRelatorioEscolar(browser:Browser,html:string,referencia:string,signal:AbortSignal){
  if(signal.aborted)throw new Error("Geração interrompida.")
  const [brasao,marca]=await Promise.all([readFile(path.join(process.cwd(),"public/brand/brasao-sp-relatorios.jpg")),readFile(path.join(process.cwd(),"public/brand/setec-hub-logo-horizontal-light.png"))]),page=await browser.newPage()
  // A versão PNG oficial tem a mesma geometria alinhada. O Chromium reutiliza
  // a imagem nas páginas, evitando repetir milhares de contornos vetoriais.
  const cabecalho=cabecalhoInstitucionalHtml(`data:image/jpeg;base64,${brasao.toString("base64")}`).replace(logoSetecDataUri("claro"),`data:image/png;base64,${marca.toString("base64")}`)
  const cancelar=()=>{void page.close().catch(()=>undefined)};signal.addEventListener("abort",cancelar,{once:true})
  try{
    await page.setViewport({width:Math.floor(180*96/25.4),height:1000,deviceScaleFactor:1})
    await page.setJavaScriptEnabled(false);await page.setRequestInterception(true)
    page.on("request",r=>{void(r.url().startsWith("data:")||r.url().startsWith("about:")?r.continue():r.abort()).catch(()=>undefined)})
    await page.emulateMediaType("print");await page.setContent(html,{waitUntil:"load",timeout:20000})
    return Buffer.from(await page.pdf({format:"A4",printBackground:true,timeout:35000,displayHeaderFooter:true,margin:{top:"35mm",bottom:"18mm",left:"15mm",right:"15mm"},headerTemplate:cabecalho,footerTemplate:`<div style="width:100%;padding:0 15mm;font:8px Arial;color:#64748b;display:flex;justify-content:space-between"><span>SETEC Hub · Escolas · ${escaparEscolas(referencia)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`}))
  }finally{signal.removeEventListener("abort",cancelar);await page.close().catch(()=>undefined)}
}
