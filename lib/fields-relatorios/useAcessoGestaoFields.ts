"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { podeGerirRelatoriosFields } from "./perfis";

export function useAcessoGestaoFields(supabase: SupabaseClient) {
  const [permitido, setPermitido] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const leitura = useRef<{ controller: AbortController; promessa: Promise<boolean> } | null>(null);
  const montado = useRef(false);
  const identidade = useRef<string | null | undefined>(undefined);
  const versao = useRef(0);
  const conferir = useCallback((): Promise<boolean> => {
    // Foco e renovação da mesma sessão compartilham a consulta em andamento.
    if (leitura.current) return leitura.current.promessa;
    const controller = new AbortController(), atual = versao.current;
    const executar = async () => {
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const { data, error } = await supabase.rpc("hub_fields_gestao_contexto").abortSignal(controller.signal);
        if (controller.signal.aborted || !montado.current || atual !== versao.current) return false;
        if (error) {
          if (error.code === "42501" || error.code === "PGRST301") setPermitido(false);
          return false;
        }
        const ok = data?.permitido === true && podeGerirRelatoriosFields(data?.role);
        setPermitido(ok);
        return ok;
      } catch {
        // Uma falha transitória não desmonta o modal. A API confere a permissão
        // novamente em cada prévia/PDF, e ações que chamam conferir recebem false.
        return false;
      } finally {
        clearTimeout(timer);
        if (leitura.current?.controller === controller) leitura.current = null;
      }
    };
    const promessa = executar(); leitura.current = { controller, promessa };
    return promessa;
  }, [supabase]);
  useEffect(() => {
    montado.current = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const agendar = () => {
      const timer = setTimeout(() => { timers.delete(timer); if (montado.current) void conferir(); }, 0);
      timers.add(timer);
    };
    const foco = () => { if (document.visibilityState !== "hidden") void conferir(); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null;
      if (event === "SIGNED_OUT" || (identidade.current !== undefined && identidade.current !== id)) {
        versao.current++; leitura.current?.controller.abort(); leitura.current = null;
        setPermitido(false);
      }
      identidade.current = id; setUsuarioId(id);
      // SIGNED_IN também ocorre ao voltar à aba. Só a troca real de usuário
      // ou saída acima limpa a permissão. Evita consultar dentro do lock do Auth.
      if (event !== "SIGNED_OUT") agendar();
    });
    void conferir(); window.addEventListener("focus", foco);
    return () => {
      montado.current = false; versao.current++; leitura.current?.controller.abort(); leitura.current = null;
      timers.forEach(clearTimeout); subscription.unsubscribe(); window.removeEventListener("focus", foco);
    };
  }, [conferir, supabase]);
  return { permitido, conferir, usuarioId };
}
