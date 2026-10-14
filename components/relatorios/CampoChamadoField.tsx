"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { erroFormatoChamado } from "@/lib/relatorios/chamado";
import type { ChamadoFieldVinculo } from "@/lib/relatorios/types";
import { leituraComPrazo } from "@/lib/relatorios/consulta";

export default function CampoChamadoField({ id, value, onChange, onSelect, obrigatorio = true }: {
  id: string; value: string; onChange: (value: string) => void;
  onSelect?: (vinculo: ChamadoFieldVinculo) => void;
  obrigatorio?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [resultados, setResultados] = useState<ChamadoFieldVinculo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const sequencia = useRef(0);
  const erro = erroFormatoChamado(value, obrigatorio);
  const selecionado = resultados.find(r => r.chamado === value.trim().toUpperCase());

  useEffect(() => {
    const seq = ++sequencia.current;
    const controller = new AbortController();
    setResultados([]); setFalha(null); setBuscando(false);
    if (value.trim().length < 8 || erro) return () => controller.abort();
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await leituraComPrazo(supabase.rpc("hub_relatorios_buscar_chamado", { p_busca: value.trim() }).abortSignal(controller.signal));
        if (seq !== sequencia.current || controller.signal.aborted) return;
        if (error) throw error;
        setResultados(Array.isArray(data) ? data as ChamadoFieldVinculo[] : []);
      } catch {
        if (!controller.signal.aborted && seq === sequencia.current) setFalha("A sincronização com a base FIELD está indisponível. Tente novamente ou contate a SETEC.");
      } finally {
        if (!controller.signal.aborted && seq === sequencia.current) setBuscando(false);
        controller.abort();
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, erro, supabase]);

  return <div className="space-y-2">
    <label htmlFor={id} className="block text-xs font-black uppercase tracking-widest text-slate-400">Chamado FIELD {obrigatorio ? <span className="text-red-300">*</span> : <span className="font-semibold normal-case tracking-normal text-blue-300">(opcional)</span>}</label>
    <input id={id} value={value} required={obrigatorio} maxLength={120} autoComplete="off" spellCheck={false}
      placeholder="STI-26/0000" onChange={event => onChange(event.target.value)}
      aria-describedby={`${id}-feedback`} aria-invalid={Boolean(value && (erro || (!buscando && !falha && !selecionado)))}
      className={`min-h-[48px] w-full rounded-2xl border bg-slate-900/60 px-4 py-3 text-base font-semibold text-white outline-none focus:ring-1 ${value && erro ? "border-red-500/60 focus:border-red-400 focus:ring-red-400" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500"}`} />
    <p id={`${id}-feedback`} aria-live="polite" className={`text-xs leading-relaxed ${value && erro ? "text-red-300" : selecionado ? "text-emerald-300" : "text-slate-400"}`}>
      {value && erro ? erro : buscando ? "Conferindo o chamado na base FIELD…" : falha || (selecionado ? `Vinculado: ${selecionado.escola} · ${selecionado.tecnico} · ${selecionado.status_field || "status não informado"}` : value.trim().length >= 8 ? "Selecione um resultado abaixo ou confira o número. Uma referência preenchida precisa existir na base FIELD." : obrigatorio ? "Obrigatório no padrão STI-26/. Busque pelo número cadastrado na base FIELD." : "Atendimento na URE: pode deixar em branco. Se houver chamado FIELD, informe o número no padrão STI-26/.")}
    </p>
    {resultados.length > 0 && <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-[#020617]">
      {resultados.map(r => <button key={r.chamado} type="button" onClick={() => { onChange(r.chamado); onSelect?.(r); }}
        className="block min-h-[48px] w-full border-b border-slate-800 px-3 py-3 text-left last:border-0 hover:bg-cyan-500/10">
        <span className="block text-sm font-bold text-cyan-300">{r.chamado}</span>
        <span className="block break-words text-xs text-slate-400">{r.escola} · {r.tecnico}</span>
      </button>)}
    </div>}
  </div>;
}
