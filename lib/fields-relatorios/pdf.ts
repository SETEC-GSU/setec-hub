import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "puppeteer-core";
import { cabecalhoInstitucional, escapar } from "./html";

export async function pdfFields(browser: Browser, html: string, referencia: string, signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("Geração cancelada.");
  const bytes = await readFile(path.join(process.cwd(), "public", "brand", "brasao-sp-relatorios.jpg"));
  const page = await browser.newPage();
  const cancelar = () => { void page.close().catch(() => undefined); };
  signal?.addEventListener("abort", cancelar, { once: true });
  try {
    // Mede as fichas na mesma largura útil do A4 usado abaixo.
    const pxPorMm = 96 / 25.4, alturaUtil = (297 - 35 - 18) * pxPorMm;
    await page.setViewport({ width: Math.floor((210 - 15 - 15) * pxPorMm), height: Math.floor(alturaUtil), deviceScaleFactor: 1 });
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", r => { void (r.url().startsWith("data:") || r.url().startsWith("about:") ? r.continue() : r.abort()).catch(() => undefined); });
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    await page.evaluate((altura) => {
      const fichas = [...document.querySelectorAll<HTMLElement>(".anexo > .chamado")];
      const alturaExterna = (el: Element) => {
        const css = getComputedStyle(el);
        return el.getBoundingClientRect().height + (parseFloat(css.marginTop) || 0) + (parseFloat(css.marginBottom) || 0);
      };
      const intro = document.querySelector(".anexo > .manter");
      fichas.forEach((ficha, i) => {
        // Ficha curta fica inteira. Uma ficha longa precisa começar junto do
        // título do anexo e continuar nas próximas páginas sem bloquear a quebra.
        const reserva = i === 0 && intro ? alturaExterna(intro) + 22 : 0;
        ficha.classList.toggle("chamado-curto", alturaExterna(ficha) <= altura - reserva - 8);
      });
    }, alturaUtil);
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, timeout: 25000,
      margin: { top: "35mm", bottom: "18mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: cabecalhoInstitucional(`data:image/jpeg;base64,${bytes.toString("base64")}`),
      footerTemplate: `<div style="width:100%;padding:0 15mm;font:8px Arial;color:#64748b;display:flex;justify-content:space-between"><span>SETEC Hub · Fields · ${escapar(referencia)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    }));
  } finally { signal?.removeEventListener("abort", cancelar); await page.close().catch(() => undefined); }
}
