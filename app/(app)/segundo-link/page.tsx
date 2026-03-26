"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"

export default function SegundoLinkPage() {
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("") 
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false) 
  const [isMounted, setIsMounted] = useState(false) 

  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    async function carregar() {
      const { data, error } = await supabase
        .from("sdwan_status")
        .select("*")
        .order("escola", { ascending: true })

      if (data) setDados(data)
      setLoading(false)
    }
    carregar()
  }, [])

  const filtrados = dados.filter(d => {
    const matchBusca = d.escola.toLowerCase().includes(busca.toLowerCase()) || 
                       d.empresa_contratada.toLowerCase().includes(busca.toLowerCase());
    
    let matchStatus = true;
    if (filtroStatus) {
      if (filtroStatus === "Pendente Instalação") matchStatus = d.sdwan_instalada === "NÃO INSTALADA";
      else if (filtroStatus === "Homologado") matchStatus = d.validacao_fde === "Validado - FDE";
      else if (filtroStatus === "Aguardando FDE") matchStatus = d.validacao_fde === "Pendente";
      else if (filtroStatus === "Em Análise") matchStatus = d.sdwan_instalada !== "NÃO INSTALADA" && d.validacao_fde !== "Validado - FDE" && d.validacao_fde !== "Pendente";
    }

    return matchBusca && matchStatus;
  })

  // Cálculos para os Cards de Dashboard
  const totalEscolas = dados.length;
  const escolasInstaladas = dados.filter(d => d.sdwan_instalada === "INSTALADA").length;
  const escolasPendentes = totalEscolas - escolasInstaladas;
  const percentualInstalado = totalEscolas > 0 ? Math.round((escolasInstaladas / totalEscolas) * 100) : 0;

  const ultimaSync = isMounted && dados.length > 0 && dados[0].updated_at
    ? new Date(Math.max(...dados.map(d => new Date(d.updated_at).getTime()))).toLocaleString('pt-BR')
    : "Aguardando sincronização...";

  function BadgeStatus({ item }: { item: any }) {
    if (item.sdwan_instalada === "NÃO INSTALADA") {
      return (
        <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide shadow-sm whitespace-nowrap">
          Pendente Instalação
        </span>
      )
    }
    if (item.validacao_fde === "Validado - FDE") {
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide shadow-sm whitespace-nowrap">
          Homologado
        </span>
      )
    }
    if (item.validacao_fde === "Pendente") {
      return (
        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide shadow-sm whitespace-nowrap">
          Aguardando FDE
        </span>
      )
    }
    return (
      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide shadow-sm whitespace-nowrap">
        Em Análise
      </span>
    )
  }

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');

      const element = document.getElementById('pdf-print-template');
      if (!element) throw new Error("Template de impressão não encontrado.");

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Status_SDWAN_SETEC_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          width: 1120,
          backgroundColor: '#020617' 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      element.style.display = 'block';
      await new Promise(resolve => setTimeout(resolve, 200));
      await (window as any).html2pdf().set(opt).from(element).save();
      element.style.display = 'none';
      setExporting(false);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro na geração do relatório.');
      const element = document.getElementById('pdf-print-template');
      if (element) element.style.display = 'none';
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto px-4 sm:px-6 relative">
      
     {/* HEADER EXECUTIVO CORRIGIDO (AGORA COMPACTO) */}
      <div className="bg-gradient-to-br from-[#020617] to-slate-900/50 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 bg-blue-500"></div>
        
        <div className="relative z-10 flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest">
              Projeto SDWAN
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            Segundo Link de Internet
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-2 flex items-center gap-2 max-w-2xl">
            Acompanhamento e orientações técnicas para instalação do link de redundância nas Unidades Escolares - URE Guarulhos Sul.
          </p>
        </div>

        <div className="relative z-10 shrink-0 mt-3 xl:mt-0 flex flex-col sm:flex-row gap-3">
          <a href="https://midiasstoragesec.blob.core.windows.net/001/2026/03/documento-orientador-segundo-link-setec.pdf" target="_blank" rel="noopener noreferrer">
            <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg border border-slate-700 flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap">
              <span>📄</span> Doc. Orientador
            </button>
          </a>
          <a href="https://beta.simet.nic.br/" target="_blank" rel="noopener noreferrer">
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap">
              <span>🚀</span> Testar no SIMET
            </button>
          </a>
        </div>
      </div>
      {/* CARDS DE ORIENTAÇÃO TÉCNICA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 shadow-lg flex flex-col hover:border-blue-500/30 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 text-2xl mb-6">🎯</div>
          <h3 className="text-xl font-bold text-white mb-3">Objetivo e Contexto</h3>
          <p className="text-sm text-slate-400 leading-relaxed flex-1">
            Implementar a funcionalidade de <b>FAILOVER (redundância)</b>. Em caso de falhas do link principal (VIVO/Intragov), o segundo link garante a continuidade das rotinas administrativas e plataformas pedagógicas sem interrupção. <br/><br/>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">💰 Recurso autorizado via PIEC.</span>
          </p>
        </div>

        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 shadow-lg flex flex-col hover:border-yellow-500/30 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20 text-2xl mb-6">⚙️</div>
          <h3 className="text-xl font-bold text-white mb-3">Requisitos de Contratação</h3>
          <ul className="text-sm text-slate-400 space-y-3 flex-1">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">⚡</span> 
              <span>Banda mínima de <b>100 Mbps</b>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">⏱️</span> 
              <span>SLA de atendimento de até <b>72 horas</b>.</span>
            </li>
            <li className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg mt-2 text-red-300">
              <span className="text-red-400 mt-0.5">⚠️</span> 
              <span><b>Obrigatório:</b> O modem/roteador NÃO poderá ter Wi-Fi ativado para evitar conflitos na rede.</span>
            </li>
          </ul>
        </div>

        <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 shadow-lg flex flex-col hover:border-emerald-500/30 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 text-2xl mb-6">✅</div>
          <h3 className="text-xl font-bold text-white mb-3">Processo de Homologação</h3>
          <div className="text-sm text-slate-400 space-y-3 flex-1">
            <p className="flex items-center gap-2"><span className="bg-slate-800 text-slate-300 w-5 h-5 flex items-center justify-center rounded text-xs font-bold">1</span> Espetar cabo de rede no modem.</p>
            <p className="flex items-center gap-2"><span className="bg-slate-800 text-slate-300 w-5 h-5 flex items-center justify-center rounded text-xs font-bold">2</span> Medir velocidade no site oficial SIMET.</p>
            <p className="flex items-center gap-2"><span className="bg-slate-800 text-slate-300 w-5 h-5 flex items-center justify-center rounded text-xs font-bold">3</span> Comparar com a banda contratada.</p>
            <p className="flex items-center gap-2"><span className="bg-slate-800 text-slate-300 w-5 h-5 flex items-center justify-center rounded text-xs font-bold">4</span> Enviar print/PDF de evidência à SETEC.</p>
          </div>
        </div>

      </div>

      {/* SESSÃO DE INSTALAÇÃO FÍSICA */}
      <div className="bg-gradient-to-r from-[#020617] to-blue-950/20 border border-blue-900/50 rounded-3xl p-8 lg:p-10 shadow-[0_0_30px_rgba(37,99,235,0.05)] relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
        
        <div className="flex-1 relative z-10 space-y-5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-blue-500 text-3xl">🔌</span> Conexão Física: Porta WAN2
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            Para que o <b> Segundo Link</b> funcione perfeitamente, o cabo de rede que sai do modem da nova operadora contratada deve ser conectado <b>exclusivamente na porta designada - WAN 2,</b> localizada na parte traseira do firewall Fortigate 60F.
          </p>
          
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
            <p className="text-red-300 text-sm flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <span>
                <b>Atenção:</b> Em caso de dúvida, acione a equipe SETEC antes da instalação. A conexão sempre deve ser validada pela SETEC/FDE
              </span>
            </p>
          </div>
        </div>

        <div className="w-full md:w-[40%] relative z-10 flex justify-center">
          <div className="relative p-2 rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-900 shadow-2xl border border-slate-700 inline-flex items-center justify-center w-full">
             <img 
               src="/porta-fortigate.png" 
               alt="Visão traseira do Firewall Fortigate 60F" 
               className="rounded-xl w-full max-w-[600px] object-cover border border-slate-900 block m-0"
               onError={(e) => {
                 (e.target as HTMLImageElement).style.display = 'none';
                 (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
               }}
             />
             <div className="hidden text-center py-10 px-4">
               <span className="text-2xl">📸</span>
               <p className="text-xs text-slate-400 mt-2">Salve a foto do Fortigate como <b>porta-fortigate.png</b> na pasta <b>public</b>.</p>
             </div>
          </div>
        </div>

      </div>

      {/* DÚVIDAS FREQUENTES (FAQ) */}
      <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 lg:p-10 shadow-lg relative overflow-hidden">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-8">
          <span className="text-blue-500 text-3xl">💡</span> Dúvidas Frequentes (FAQ)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl hover:bg-slate-900 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 text-xl">📶</div>
              <div>
                <h4 className="text-white font-bold text-base mb-2">O link da SDWAN conflita com a rede Wi-Fi?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Não deveria, pois a rede Intragov atua de forma independente. No entanto, <b>recomenda-se que o Wi-Fi do link SDWAN não seja utilizado</b> para evitar possíveis interferências. A escola deve solicitar ao provedor a desativação da função Wi-Fi no modem.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl hover:bg-slate-900 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 text-xl">🚀</div>
              <div>
                <h4 className="text-white font-bold text-base mb-2">A SDWAN vai melhorar a velocidade da Intragov?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A SDWAN <b>não aumenta a velocidade</b> do link da Intragov. Sua principal função é atuar como <b>failover (contingência)</b> caso o link principal falhe. Ele gerencia o tráfego de forma inteligente, mas não soma as velocidades dos links.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl hover:bg-slate-900 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 text-xl">🔄</div>
              <div>
                <h4 className="text-white font-bold text-base mb-2">O que acontece se a Intragov cair?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A SDWAN <b>redireciona automaticamente</b> todo o tráfego para o segundo link. Isso garante que a escola não fique sem acesso à internet e mantenha suas rotinas sem interrupção.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl hover:bg-slate-900 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 text-xl">🏢</div>
              <div>
                <h4 className="text-white font-bold text-base mb-2">Podemos usar o link SDWAN apenas no administrativo?</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <b>Não.</b> A SDWAN gerencia toda a rede da escola, distribuindo o tráfego automaticamente conforme a necessidade, sem a possibilidade de separar as redes (administrativa / pedagógica) de forma manual.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD: CARDS DE RESUMO (NOVOS) */}
      {!loading && totalEscolas > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Progresso Geral (Verde) */}
          <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden shadow-lg">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
            <h3 className="text-slate-400 font-semibold mb-6 flex items-center gap-2">
              <span className="text-emerald-500 text-xl">📈</span> Progresso de Instalação nas Unidades Escolares
            </h3>
            
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-black text-white">{escolasInstaladas}</span>
              <span className="text-slate-500 font-medium pb-1">/ {totalEscolas} Escolas</span>
            </div>
            
            <div className="w-full bg-slate-900 rounded-full h-3 mb-2 border border-slate-800 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${percentualInstalado}%` }}
              >
                 <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
            <p className="text-right text-xs text-emerald-400 font-bold">{percentualInstalado}% Concluído</p>
          </div>

          {/* Card 2: Gráfico de Pizza (Verde/Vermelho) */}
          <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 flex items-center justify-between relative overflow-hidden shadow-lg gap-6">
             <div className="absolute left-0 bottom-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
             <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full"></div>
             
             <div className="flex-1 z-10">
               <h3 className="text-slate-400 font-semibold mb-6 flex items-center gap-2">
                 <span className="text-emerald-400 text-xl">📊</span> Status Atual
               </h3>
               
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                     <span className="text-slate-300 text-sm font-medium">Instaladas</span>
                   </div>
                   <span className="text-white font-bold">{escolasInstaladas}</span>
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
                     <span className="text-slate-400 text-sm font-medium">Pendentes</span>
                   </div>
                   <span className="text-slate-300 font-bold">{escolasPendentes}</span>
                 </div>
               </div>
             </div>

             {/* Gráfico Donut em CSS Puro (Verde e Vermelho) */}
             <div className="relative w-32 h-32 shrink-0 z-10 flex items-center justify-center">
               <div 
                 className="w-full h-full rounded-full absolute inset-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                 style={{
                   // Verde (#10b981) para instaladas e Vermelho (#ef4444) para pendentes
                   background: `conic-gradient(#10b981 ${percentualInstalado}%, #ef4444 ${percentualInstalado}%)`
                 }}
               ></div>
               {/* Furo do Donut */}
               <div className="w-24 h-24 bg-[#020617] rounded-full relative z-10 flex items-center justify-center shadow-inner">
                  <span className="text-white font-black text-xl">{percentualInstalado}%</span>
               </div>
             </div>
          </div>

        </div>
      )}

      {/* INTEGRAÇÃO ATIVA (VISUAL DO SITE) */}
      <div className="bg-[#020617] border border-slate-800 rounded-3xl p-8 lg:p-10 flex flex-col relative overflow-hidden mt-2">
        
        <div className="absolute top-0 right-0 bg-blue-500/10 border-b border-l border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-bl-2xl shadow-sm flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Sincronizado
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-800 pb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              📑 Status das Instalações nas UEs
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Painel sincronizado automaticamente com a base de dados de controle.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full sm:w-auto bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors cursor-pointer"
            >
              <option value="">Todos os Status</option>
              <option value="Homologado">Homologado</option>
              <option value="Aguardando FDE">Aguardando FDE</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Pendente Instalação">Pendente Instalação</option>
            </select>

            <input
              type="text"
              placeholder="🔎 Buscar Escola ou Operadora..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full sm:w-64 bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
            />

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={`${exporting ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap`}
            >
              {exporting ? (
                 <span className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 
                   Gerando...
                 </span>
              ) : (
                <><span>📄</span> Gerar PDF</>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/50 max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-900/90 border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Unidade Escolar</th>
                  <th className="px-6 py-4 font-semibold">Operadora / Vel.</th>
                  <th className="px-6 py-4 font-semibold text-center">SDWan Instalada</th>
                  <th className="px-6 py-4 font-semibold text-center">Online FW</th>
                  <th className="px-6 py-4 font-semibold text-center">Validação FDE</th>
                  <th className="px-6 py-4 font-semibold text-right">Status Geral</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/20">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-white font-medium whitespace-nowrap">
                        {item.escola}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-300">{item.empresa_contratada !== "-" ? item.empresa_contratada : "Não informada"}</span>
                          <span className="text-xs text-slate-500">{item.velocidade_link !== "-" ? item.velocidade_link : ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-semibold ${item.sdwan_instalada === 'INSTALADA' ? 'text-green-400' : 'text-slate-500'}`}>
                          {item.sdwan_instalada}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-bold ${item.online_fw === 'Sim' ? 'text-green-400' : 'text-red-400/70'}`}>
                          {item.online_fw}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400 text-xs">
                        {item.validacao_fde || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <BadgeStatus item={item} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center text-xs text-slate-500">
          <p>Mostrando {filtrados.length} escolas da base de dados.</p>
          <p>Última sincronização: {ultimaSync}</p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 👻 TEMPLATE FANTASMA PARA O PDF (Normal, sem fixed ou absolute malucos) */}
      {/* ========================================================================= */}
      <div id="pdf-print-template" style={{ display: 'none', width: '1120px', padding: '20px', backgroundColor: '#020617', color: 'white' }}>
        <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>📊 Relatório SDWAN - Unidades Escolares</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0 0 0' }}>Data da exportação: {isMounted ? new Date().toLocaleString('pt-BR') : ''}</p>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>Unidade Escolar</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>Operadora / Vel.</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'center' }}>SDWan Instalada</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'center' }}>Online FW</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'center' }}>Validação FDE</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'right' }}>Status Geral</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item: any, idx: number) => (
              <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#020617' : '#0f172a', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', color: 'white', fontWeight: '500' }}>{item.escola}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ color: '#cbd5e1' }}>{item.empresa_contratada !== "-" ? item.empresa_contratada : "Não informada"}</div>
                  <div style={{ color: '#64748b', fontSize: '10px' }}>{item.velocidade_link !== "-" ? item.velocidade_link : ""}</div>
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'center', color: item.sdwan_instalada === 'INSTALADA' ? '#60a5fa' : '#64748b' }}>{item.sdwan_instalada}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'center', color: item.online_fw === 'Sim' ? '#34d399' : '#f87171' }}>{item.online_fw}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'center', color: '#94a3b8' }}>{item.validacao_fde || "-"}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', textAlign: 'right' }}>
                   <span style={{ 
                     padding: '4px 12px', 
                     borderRadius: '999px', 
                     fontSize: '10px', 
                     fontWeight: 'bold', 
                     textTransform: 'uppercase',
                     backgroundColor: item.sdwan_instalada === "NÃO INSTALADA" ? '#1e293b' : item.validacao_fde === "Validado - FDE" ? 'rgba(16, 185, 129, 0.1)' : item.validacao_fde === "Pendente" ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                     color: item.sdwan_instalada === "NÃO INSTALADA" ? '#94a3b8' : item.validacao_fde === "Validado - FDE" ? '#34d399' : item.validacao_fde === "Pendente" ? '#fbbf24' : '#60a5fa',
                     border: `1px solid ${item.sdwan_instalada === "NÃO INSTALADA" ? '#334155' : item.validacao_fde === "Validado - FDE" ? 'rgba(16, 185, 129, 0.2)' : item.validacao_fde === "Pendente" ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                   }}>
                     {item.sdwan_instalada === "NÃO INSTALADA" ? "Pendente Instalação" : item.validacao_fde === "Validado - FDE" ? "Homologado" : item.validacao_fde === "Pendente" ? "Aguardando FDE" : "Em Análise"}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}