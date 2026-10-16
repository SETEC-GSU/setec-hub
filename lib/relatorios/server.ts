import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ContextoRelatorios } from "./types";
import { leituraComPrazo } from "./consulta";
import { podeVerCentralRelatorios } from "./acesso";

export class ErroApiRelatorios extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function acessoRelatoriosServidor(somenteLeitura = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ErroApiRelatorios("O serviço de relatórios está indisponível.", 503);
  const store = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => store.getAll(), setAll: values => {
      // Server Components consultam cookies; o middleware renova a sessão.
      if (somenteLeitura) return;
      values.forEach(({name, value, options}) => store.set(name, value, options));
    } },
  });
  const { data: { user }, error } = await leituraComPrazo(supabase.auth.getUser());
  if (error || !user) throw new ErroApiRelatorios("Sua sessão expirou. Entre novamente para exportar os relatórios.", 401);
  const controller = new AbortController();
  let resposta;
  try {
    resposta = await leituraComPrazo(supabase.rpc("hub_relatorios_contexto").abortSignal(controller.signal));
  } finally {
    controller.abort();
  }
  if (resposta.error?.code === "42501") throw new ErroApiRelatorios("Seu perfil não possui acesso aos relatórios.", 403);
  if (resposta.error) throw new ErroApiRelatorios("Não foi possível conferir o acesso à central. Tente novamente.", 503);
  const contexto = resposta.data as ContextoRelatorios | null;
  if (!contexto?.permitido || !podeVerCentralRelatorios(contexto.role)) throw new ErroApiRelatorios("Seu perfil não possui acesso à Central de Relatórios.", 403);
  return { supabase, contexto };
}
export async function clienteRelatoriosServidor() {
  return (await acessoRelatoriosServidor()).supabase;
}
export function nomeSeguro(valor: unknown) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0,100) || "NAO_INFORMADO";
}
export function celulaCSV(valor: unknown) {
  let texto = String(valor ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replaceAll('"', '""') + '"';
}
