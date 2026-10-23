import type { NextConfig } from "next";

// Arquivos usados pelo gerador de PDF dentro das funções da Vercel.
const arquivosPdf = [
  "./node_modules/@sparticuz/chromium/bin/**/*",
  "./public/brand/brasao-sp-relatorios.jpg",
  "./public/brand/setec-hub-icon.png",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  outputFileTracingIncludes: {
    "/api/fields/relatorios/gerencial": arquivosPdf,
    "/api/chamados/relatorios/gerencial": arquivosPdf,
    "/api/fields/relatorios/documento": arquivosPdf,
    "/api/fields/relatorios/backup": arquivosPdf,
  },
};

export default nextConfig;
