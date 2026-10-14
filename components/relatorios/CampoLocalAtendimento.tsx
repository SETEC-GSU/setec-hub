"use client";

import type { LocalAtendimento } from "@/lib/relatorios/types";

export default function CampoLocalAtendimento({ id, value, onChange }: {
  id: string;
  value: LocalAtendimento;
  onChange: (value: LocalAtendimento) => void;
}) {
  const opcoes = [
    { value: "escola" as const, titulo: "Atendimento em escola", detalhe: "Com chamado FIELD vinculado", icone: "🏫" },
    { value: "ure" as const, titulo: "Atendimento na URE", detalhe: "Parecer interno · chamado opcional", icone: "🏢" },
  ];

  return <fieldset className="min-w-0 space-y-3">
    <legend className="text-xs font-black uppercase tracking-widest text-slate-400">Local do atendimento</legend>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {opcoes.map(opcao => <label key={opcao.value} htmlFor={`${id}-${opcao.value}`}
        className={`flex min-h-[72px] min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-cyan-400 ${value === opcao.value ? "border-cyan-400/50 bg-cyan-400/10" : "border-slate-700 bg-slate-900/50 hover:border-slate-500"}`}>
        <input id={`${id}-${opcao.value}`} type="radio" name={id} value={opcao.value}
          checked={value === opcao.value} onChange={() => onChange(opcao.value)}
          className="h-4 w-4 shrink-0 accent-cyan-400" />
        <span aria-hidden="true" className="text-xl">{opcao.icone}</span>
        <span className="min-w-0"><span className="block text-sm font-bold text-white">{opcao.titulo}</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-400">{opcao.detalhe}</span></span>
      </label>)}
    </div>
    {value === "ure" && <p className="rounded-xl border border-blue-400/20 bg-blue-500/5 px-4 py-3 text-xs leading-relaxed text-blue-200">
      O relatório será identificado como atendimento interno da URE. Ele fica disponível na Central e no backup, sem gerar uma pendência de chamado.
    </p>}
  </fieldset>;
}
