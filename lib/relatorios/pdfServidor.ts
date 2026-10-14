import "server-only";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { montarHtmlPdf as htmlEquipamentos, type ParecerHistorico } from "./htmlEquipamentos";
import { montarHtmlPdf as htmlRedes, type RelatorioRedeHistorico } from "./htmlRedes";
import type { DetalheRelatorio } from "./types";
import { ErroApiRelatorios } from "./server";

async function chromeLocal() {
  if (process.env.RELATORIOS_CHROME_PATH) return process.env.RELATORIOS_CHROME_PATH;
  const candidatos = process.platform === "win32" ? [
    path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"),
  ] : process.platform === "darwin" ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] : [];
  for (const candidato of candidatos) { try { await access(candidato); return candidato; } catch { /* próximo navegador local */ } }
  return null;
}

export async function abrirRenderizador(): Promise<Browser> {
  const local = await chromeLocal();
  if (!local && process.platform !== "linux") throw new ErroApiRelatorios("Navegador de exportação não localizado. Instale Chrome/Edge ou configure RELATORIOS_CHROME_PATH no ambiente local.", 503);
  return puppeteer.launch({ executablePath: local || await chromium.executablePath(),
    args: local && process.platform !== "linux" ? [] : chromium.args, headless: local ? true : "shell" });
}

export async function htmlDocumento(detalhe: DetalheRelatorio) {
  let html = detalhe.tipo === "equipamentos"
    ? htmlEquipamentos(detalhe.relatorio as unknown as ParecerHistorico)
    : htmlRedes(detalhe.relatorio as unknown as RelatorioRedeHistorico);
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  // A mesma marca usada pelas páginas, incorporada no documento sem chamadas externas.
  try {
    const imagem = await readFile(path.join(process.cwd(), "public", "brand", "setec-hub-icon.png"));
    html = html.replaceAll('src="/brand/setec-hub-icon.png"', `src="data:image/png;base64,${imagem.toString("base64")}"`);
  } catch {
    // O acervo e o texto permanecem disponíveis quando a marca não está instalada.
    html = html.replace(/<img\b[^>]*src="\/brand\/setec-hub-icon.png"[^>]*>/g, '<strong style="color:#0e7490;font:900 13px Arial">SETEC Hub</strong>');
  }
  return html;
}

export async function renderizarPDF(browser: Browser, html: string, signal?: AbortSignal) {
  if (signal?.aborted) throw new ErroApiRelatorios("Exportação interrompida.", 499);
  const page = await browser.newPage();
  const cancelar = () => { void page.close().catch(() => undefined); };
  signal?.addEventListener("abort", cancelar, { once: true });
  try {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", request => { const url = request.url();
      const tarefa = url.startsWith("data:") || url.startsWith("about:") ? request.continue() : request.abort();
      void tarefa.catch(() => undefined); });
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: 20000 }));
  } finally {
    signal?.removeEventListener("abort", cancelar);
    await page.close().catch(() => undefined);
  }
}
