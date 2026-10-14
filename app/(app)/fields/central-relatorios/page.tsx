import Link from "next/link";
import CentralRelatorios from "@/components/relatorios/CentralRelatorios";
import { acessoRelatoriosServidor, ErroApiRelatorios } from "@/lib/relatorios/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CentralRelatoriosPage() {
  let acesso;
  try {
    acesso = await acessoRelatoriosServidor(true);
  } catch (error) {
    if (error instanceof ErroApiRelatorios && error.status === 401) {
      redirect("/login?redirectTo=%2Ffields%2Fcentral-relatorios");
    }
    if (error instanceof ErroApiRelatorios && error.status === 403) redirect("/");
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-[#020617] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">SETEC Hub · Fields</p>
        <h1 className="mt-3 text-2xl font-black text-white">Central de Relatórios</h1>
        <p role="alert" className="mt-4 text-sm leading-relaxed text-slate-300">Não foi possível abrir a central agora. Tente novamente em instantes. Os relatórios cadastrados permanecem salvos.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/fields/central-relatorios" prefetch={false} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950">Tentar novamente</Link>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200">Menu principal</Link>
        </div>
      </section>
    );
  }
  return <CentralRelatorios contextoInicial={acesso.contexto} />;
}
