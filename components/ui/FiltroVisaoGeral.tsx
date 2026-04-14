"use client"

import { useState } from "react"
import Card from "@/components/ui/Card" // Certifique-se de que este caminho está correto

interface FiltroVisaoGeralProps {
  modelosAgrupados: Record<string, any>;
  totalPlataformasRecebidas: number; // Recebe as plataformas separadas
  totalPlataformasRespondidas: number;
}

export default function FiltroVisaoGeral({ modelosAgrupados, totalPlataformasRecebidas, totalPlataformasRespondidas }: FiltroVisaoGeralProps) {
  const [filtroAtivo, setFiltroAtivo] = useState<"total" | "geral" | "prova" | "saresp" | "ensino">("total")

  // --- LÓGICA DO FILTRO ---
  const itemPassaNoFiltro = (modelo: any) => {
    const uso = modelo.uso ? String(modelo.uso).toLowerCase() : "";
    const tipo = modelo.tipo ? String(modelo.tipo).toLowerCase() : "";
    const finalidade = modelo.finalidade ? String(modelo.finalidade).toLowerCase() : "";

    // Se a finalidade for carregamento, ele SÓ aparece no filtro "Total"
    if (finalidade.includes("carregamento") && filtroAtivo !== "total") {
        return false;
    }

    switch (filtroAtivo) {
      case "total": 
        return true;
      case "geral":
        return uso.includes("pedagógico") || uso.includes("administrativo") || (!uso.includes("suporte operacional") && uso !== "");
      case "prova":
        return uso.includes("pedagógico");
      case "saresp":
        return tipo.includes("notebook") || tipo.includes("tablet") || tipo.includes("desktop ped");
      case "ensino":
        return finalidade.includes("profissionalizante");
      default:
        return true;
    }
  }

  // Aplica o filtro nos modelos
  const modelosFiltrados = Object.entries(modelosAgrupados).filter(([_, totais]: any) => itemPassaNoFiltro(totais));

  // --- RECALCULANDO OS TOTAIS DINAMICAMENTE ---
  let calcRecebidos = 0;
  let calcFuncionando = 0;
  let calcGarantia = 0;
  let calcDanificados = 0;
  let calcNaoLocalizados = 0;

  modelosFiltrados.forEach(([_, totais]: any) => {
    // Apenas ignora plataformas dos TOTAIS PRINCIPAIS (elas tem cards próprios)
    const finalidade = totais.finalidade ? String(totais.finalidade).toLowerCase() : "";
    if (!finalidade.includes("carregamento")) {
      calcRecebidos += totais.recebido || 0;
      calcFuncionando += totais.funcionando || 0;
      calcGarantia += totais.garantia || 0;
      calcDanificados += totais.danificados || 0;
      calcNaoLocalizados += totais.nao_localizado || 0;
    }
  });

  const saudeGeral = calcRecebidos > 0 ? Math.round((calcFuncionando / calcRecebidos) * 100) : 0;

  // --- LÓGICA DE EXPORTAÇÃO PARA EXCEL (CSV) ---
  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Cabeçalho do CSV
    csvContent += "Modelo,Finalidade,Uso,Tipo,Total Recebido,Funcionando,Em Garantia,Danificados,Não Localizados\n";

    modelosFiltrados.forEach(([modelo, totais]: any) => {
        const row = [
            `"${modelo}"`,
            `"${totais.finalidade || ''}"`,
            `"${totais.uso || ''}"`,
            `"${totais.tipo || ''}"`,
            totais.recebido || 0,
            totais.funcionando || 0,
            totais.garantia || 0,
            totais.danificados || 0,
            totais.nao_localizado || 0
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.setAttribute("download", `Relatorio_Inventario_${filtroAtivo.toUpperCase()}_${dataAtual}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      
      {/* 🚀 BOTÕES DE FILTRO MOVIDOS PARA O TOPO (Abaixo do Select de Escolas) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltroAtivo("total")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroAtivo === "total" ? "bg-white text-slate-900 shadow-lg shadow-white/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>Total (Geral)</button>
          <button onClick={() => setFiltroAtivo("geral")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroAtivo === "geral" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>Visão Geral (Exceto plataformas)</button>
          <button onClick={() => setFiltroAtivo("prova")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroAtivo === "prova" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>Prova Paulista</button>
          <button onClick={() => setFiltroAtivo("saresp")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroAtivo === "saresp" ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>SARESP</button>
          <button onClick={() => setFiltroAtivo("ensino")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtroAtivo === "ensino" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>Ensino Profiss.</button>
        </div>

        {/* 🚀 BOTÃO DE GERAR EXCEL */}
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          Exportar Excel
        </button>
      </div>

      {/* 🚀 CARDS DE TOTAIS DINÂMICOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card><p className="text-xs text-slate-400">Equipamentos recebidos</p><p className="text-2xl lg:text-3xl font-bold text-white truncate">{calcRecebidos}</p></Card>
        <Card><p className="text-xs text-slate-400">Funcionando</p><p className="text-2xl lg:text-3xl font-bold text-green-400 truncate">{calcFuncionando}</p></Card>
        <Card><p className="text-xs text-slate-400">Garantia</p><p className="text-2xl lg:text-3xl font-bold text-yellow-400 truncate">{calcGarantia}</p></Card>
        <Card><p className="text-xs text-slate-400">Danificados</p><p className="text-2xl lg:text-3xl font-bold text-red-400 truncate">{calcDanificados}</p></Card>
        <Card><p className="text-[10px] lg:text-xs text-slate-400">Não localizados</p><p className="text-2xl lg:text-3xl font-bold text-gray-400 truncate">{calcNaoLocalizados}</p></Card>
      </div>

      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Saúde Operacional ({filtroAtivo === 'total' ? 'Geral' : 'Filtrada'})</h2>
        <div className="w-full bg-slate-800 rounded-full h-4">
          <div className="bg-cyan-400 h-4 rounded-full transition-all duration-1000" style={{ width: `${saudeGeral}%` }} />
        </div>
        <p className="text-sm text-cyan-300 mt-2">{saudeGeral}% operacional nesta visão</p>
      </Card>

      {/* PLATAFORMAS DE CARREGAMENTO (Visíveis apenas no filtro Total) */}
      {filtroAtivo === "total" && (
        <Card>
          <h2 className="text-lg md:text-xl font-semibold mb-6">Plataformas de carregamento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Total Recebido</p>
              <p className="text-3xl md:text-4xl font-black text-blue-400">{totalPlataformasRecebidas}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Total Respondido</p>
              <p className="text-3xl md:text-4xl font-black text-emerald-400">{totalPlataformasRespondidas}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">Equipamentos de suporte logístico (não entram no cálculo geral de dispositivos de rede e saúde operacional).</p>
        </Card>
      )}

      {/* GRID DE MODELOS */}
      <Card>
        <h2 className="text-lg md:text-xl font-semibold mb-6">Distribuição por modelo e status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelosFiltrados.length > 0 ? (
            modelosFiltrados.map(([modelo, totais]: any) => (
              <div key={modelo} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                
                <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-800 pb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {totais.imagem_url ? (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-white rounded-xl p-1.5 border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
                        <img src={totais.imagem_url} alt={modelo} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center">
                        <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold text-center px-1">Sem<br/>Imagem</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white leading-snug">{modelo}</p>
                      {totais.ano_recebimento && (
                        <span className="inline-block mt-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md tracking-wider">
                          ANO DE RECEBIMENTO: {totais.ano_recebimento}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Total Recebido</p>
                    <p className="text-2xl font-black text-white leading-none">{totais.recebido}</p>
                  </div>
                </div>

                {totais.respondido > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                      <p className="text-[10px] text-green-500 uppercase tracking-wider font-semibold">Funcionando</p>
                      <p className="text-lg font-bold text-green-400">{totais.funcionando}</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                      <p className="text-[10px] text-yellow-500 uppercase tracking-wider font-semibold">Em Garantia</p>
                      <p className="text-lg font-bold text-yellow-400">{totais.garantia}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                      <p className="text-[10px] text-red-500 uppercase tracking-wider font-semibold">Danificados</p>
                      <p className="text-lg font-bold text-red-400">{totais.danificados}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Não Localizado</p>
                      <p className="text-lg font-bold text-slate-300">{totais.nao_localizado}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-900/50 rounded-lg border border-dashed border-slate-700 mt-2">
                     <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Aguardando Inventário</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
              <p className="text-slate-400 font-medium">Nenhum equipamento encontrado para esta visão.</p>
            </div>
          )}
        </div>
      </Card>

    </div>
  )
}