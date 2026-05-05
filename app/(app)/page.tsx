"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function Home() {
  const supabase = createClient()

  const [stats, setStats] = useState({
    chamados: 0,
    visitas: 0,
    equipamentos: 0,
    escolas: 0
  })

  const [tutoriais, setTutoriais] = useState<any[]>([])
  const [visitas, setVisitas] = useState<any[]>([])
  const [avisos, setAvisos] = useState<any[]>([])
  const [inventarioPendentes, setInventarioPendentes] = useState(0)
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Configuração: Quantos dias o inventário é considerado válido?
  const DIAS_DESATUALIZADO = 90;

  async function carregar() {
    const agoraTime = new Date().getTime()

    const { data: chamados } = await supabase
      .from("chamados")
      .select("id,status")

    const { data: visitasRealizadas } = await supabase
      .from("fields_visitas")
      .select("id,status")

    const { data: equipamentos } = await supabase
      .from("equipamentos_recebidos")
      .select("quantidade_recebida")

    const { data: escolas } = await supabase
      .from("escolas")
      .select("id,nome_escola")

    const totalEscolas = escolas?.length || 0

    // Lógica Dinâmica de Inventário
    const { data: inventarios } = await supabase
      .from("inventario_respostas")
      .select("escola_nome, created_at") 

    // Mapeia para guardar apenas a data mais recente de cada escola
    const ultimasAtualizacoes = new Map();
    inventarios?.forEach((inv: any) => {
      if (inv.escola_nome && inv.created_at) {
        const dataInv = new Date(inv.created_at).getTime();
        const atual = ultimasAtualizacoes.get(inv.escola_nome) || 0;
        if (dataInv > atual) {
          ultimasAtualizacoes.set(inv.escola_nome, dataInv);
        }
      }
    });

    // Calcula a data limite de corte
    const limiteTempo = agoraTime - (DIAS_DESATUALIZADO * 24 * 60 * 60 * 1000);
    let escolasAtualizadas = 0;

    ultimasAtualizacoes.forEach((dataUltima: number) => {
      if (dataUltima >= limiteTempo) {
        escolasAtualizadas++; // Inventário está dentro da validade
      }
    });

    setInventarioPendentes(totalEscolas - escolasAtualizadas);

    const { data: tutoriaisData } = await supabase
      .from("base_conhecimento")
      .select("*")
      .order("visualizacoes", { ascending: false })
      .limit(8)

    const { data: visitasData } = await supabase
      .from("fields_visitas")
      .select("*")
      .order("data_visita", { ascending: false })
      .limit(5)

    const { data: todosTecnicos } = await supabase
      .from("fields_visitas")
      .select("tecnico")

    const tecnicosUnicos = [
      ...new Set(
        todosTecnicos?.map((v: any) => v.tecnico).filter(Boolean)
      )
    ].sort()

    setTecnicos(tecnicosUnicos)

    // Avisos
    const { data: avisosData } = await supabase
      .from("avisos_setec")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false })

    const avisosValidos = (avisosData || []).filter(a => {
      const dtInicio = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
      const dtFim = a.data_fim ? new Date(a.data_fim).getTime() : Infinity;
      return dtInicio <= agoraTime && dtFim >= agoraTime;
    }).slice(0, 3);

    setStats({
      chamados: chamados?.filter(c => c.status === "resolvido").length || 0,
      visitas: visitasRealizadas?.filter(v => v.status === "REALIZADA").length || 0,
      equipamentos: equipamentos?.reduce((acc: any, item: any) => acc + item.quantidade_recebida, 0) || 0,
      escolas: totalEscolas
    })

    setTutoriais(tutoriaisData || [])
    setVisitas(visitasData || [])
    setAvisos(avisosValidos)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Central Operacional SETEC</h1>
        <p className="text-slate-400 text-sm">Painel de operação tecnológica</p>
      </div>

      {/* CARDS PRINCIPAIS RESTAURADOS PARA O DESIGN ORIGINAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card titulo="Chamados Atendidos" valor={stats.chamados} cor="green" />
        <Card titulo="Visitas Realizadas - FIELDs" valor={stats.visitas} cor="blue" />
        <Card titulo="Equipamentos Recebidos - Escolas" valor={stats.equipamentos} cor="purple" />
        <Card titulo="Escolas Cadastradas" valor={stats.escolas} cor="yellow" />
      </div>

      <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">
          🚨 Avisos Importantes - SETEC
        </h2>
        <div className="space-y-3">
          {avisos.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum aviso no momento.</p>
          ) : (
            avisos.map(a => (
              <div key={a.id} className="flex gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800/50">
                <span className="text-xl mt-0.5">{a.emoji}</span>
                <div>
                  <p className="text-white text-sm font-semibold flex items-center gap-2">
                    {a.titulo}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 uppercase font-bold tracking-wider">
                      {a.tipo}
                    </span>
                  </p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    {a.descricao}
                  </p>
                </div>
              </div>
            )))}
        </div>
      </div>

      <div>
        <h2 className="text-white font-semibold mb-4">
          ⚡ Acesso rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Quick href="/chamados" icon="🎫" label="Abrir Chamado com a SETEC" />
          <Quick href="/painel-chamados" icon="📊" label="Painel de Chamados" />
          <Quick href="/inventario" icon="💻" label="Inventário Tecnológico" />
          <Quick href="/apoio-usuario" icon="📚" label="Base de Conhecimento" />
          <Quick href="/fields/agenda-field" icon="📅" label="Agenda - FIELDs" />
          <Quick href="/dashboard-escolar" icon="🏫" label="Dashboard Escolar" />
        </div>
      </div>

      {inventarioPendentes > 0 ? (
        <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-red-400 font-semibold mb-1 flex items-center gap-2">
              <span>📋</span> Inventários Desatualizados
            </h2>
            <p className="text-white text-xl md:text-2xl font-bold">
              {inventarioPendentes} escolas precisam revisar o inventário
            </p>
          </div>
          <Link
            href="/inventario/atualizar"
            className="relative z-10 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors text-center whitespace-nowrap shadow-lg shadow-red-900/20"
          >
            ATUALIZAR MINHA ESCOLA
          </Link>
          <div className="absolute -right-10 -top-10 text-red-500/5 text-9xl blur-sm pointer-events-none">⚠</div>
        </div>
      ) : (
        <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-emerald-400 font-semibold mb-1 flex items-center gap-2">
              <span>✅</span> Inventários em dia
            </h2>
            <p className="text-white font-medium">Todas as escolas estão com o inventário atualizado.</p>
          </div>
        </div>
      )}

      {/* TROCA DE GRID PARA FLEX: Flexbox garante 100% de alinhamento de altura! */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        
        {/* CARD TUTORIAIS */}
        <div className="flex-1 bg-[#020617] border border-slate-800 rounded-2xl p-6 flex flex-col">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2 shrink-0">
            <span>📚</span> Tutoriais mais acessados
          </h2>
          <div className="space-y-1.5 flex-1">
            {tutoriais.length === 0 ? (
              <p className="text-slate-500 text-sm italic">Nenhum tutorial encontrado.</p>
            ) : (
              tutoriais.map(t => (
                <a 
                  key={t.id} 
                  href={t.arquivo_url} 
                  target="_blank"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors group"
                >
                  <span className="text-slate-600 group-hover:text-blue-400 transition-colors text-lg">📄</span>
                  <span className="text-sm text-slate-300 group-hover:text-white truncate flex-1 font-medium">
                    {t.titulo}
                  </span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-slate-400 font-semibold tracking-wider whitespace-nowrap">
                    {t.visualizacoes} VIEWS
                  </span>
                </a>
              ))
            )}
          </div>
        </div>

        {/* CARD TÉCNICOS */}
        <div className="flex-1 bg-[#020617] border border-slate-800 rounded-2xl p-6 flex flex-col">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2 shrink-0">
            <span>🧑‍🔧</span> Equipe Técnica FIELD
          </h2>
          {/* 🚀 AQUI: Mudado para flex flex-col para forçar uma lista reta e única */}
          <div className="flex flex-col gap-2 text-slate-300 text-sm flex-1">
            {tecnicos.length === 0 ? (
              <p className="text-slate-500 text-sm italic">Nenhum técnico localizado.</p>
            ) : (
              tecnicos.map((t: any, i: number) => (
                <Link 
                  href={`/fields/tecnico/${encodeURIComponent(t)}`} 
                  key={i}
                  className="flex items-center gap-3 p-2.5 hover:bg-slate-800/40 rounded-xl transition-colors group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 shrink-0"></span>
                  <span className="group-hover:text-white font-medium truncate">{t}</span>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>

      <a
        href="https://wa.me/551124422282?text=Olá%2C%20minha%20escola%20está%20sem%20rede%2C%20poderiam%20abrir%20um%20chamado%20com%20a%20FDE%3F"
        target="_blank"
        className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-500 text-white px-5 py-4 rounded-2xl shadow-xl shadow-red-900/20 text-sm font-semibold flex items-center gap-2 animate-bounce hover:animate-none transition-all z-50"
      >
        <span className="text-lg">📡</span> Minha escola está sem internet
      </a>
    </div>
  )
}

// CARD ORIGINAL RESTAURADO!
function Card({ titulo, valor, cor }: any) {
  const cores: any = {
    blue: "text-blue-400 border-blue-500/30",
    green: "text-green-400 border-green-500/30",
    purple: "text-purple-400 border-purple-500/30",
    yellow: "text-yellow-400 border-yellow-500/30"
  }

  return (
    <div className={`border p-4 rounded-xl ${cores[cor]}`}>
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="text-2xl font-bold">{valor}</p>
    </div>
  )
}

function Quick({ href, icon, label }: any) {
  return (
    <Link 
      href={href}
      className="bg-[#020617] border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-800/50 hover:border-slate-700 transition-all group shadow-sm hover:shadow-md"
    >
      <p className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</p>
      <p className="text-xs text-slate-400 group-hover:text-slate-200 font-medium leading-tight">{label}</p>
    </Link>
  )
}