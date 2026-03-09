"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import dynamic from "next/dynamic"
import Link from "next/link"

const MapEscolas = dynamic(() => import("./MapEscolas"), { ssr: false })

function calcScore(e: any) {
  const salas = Number(e.qtd_salas || 0)
  const aps = Number(e.aps_instalados || 0)
  const alunos = Number(e.total_alunos || 0)

  const equip = Number(
    e.total_equipamentos_funcionando ||
    e.total_equipamentos_recebidos ||
    0
  )

  const wifiIdeal = salas / 2 || 1
  const equipIdeal = alunos / 3 || 1

  const indiceAP = Math.min(aps / wifiIdeal, 1)
  const indiceEquip = Math.min(equip / equipIdeal, 1)

  // ⭐ PESO INVERTIDO
  const score = indiceEquip * 0.6 + indiceAP * 0.4

  let criticidade = "saudavel"
  if (score < 0.5) criticidade = "critica"
  else if (score < 0.8) criticidade = "atencao"

  return { score, criticidade, indiceAP, indiceEquip }
}

export default function EscolasPage() {

  const supabase = createClient()

  const [escolas, setEscolas] = useState<any[]>([])
  const [filtrado, setFiltrado] = useState<any[]>([])
  const [busca, setBusca] = useState("")
  const [criticidadeFiltro, setCriticidadeFiltro] = useState("todas")
  const [selected, setSelected] = useState<any>(null)

  async function carregar() {

    const { data } = await supabase.from("escolas").select("*")

    const enriched =
      data?.map((e) => ({
        ...e,
        ...calcScore(e),
      })) || []

    enriched.sort((a, b) =>
      a.nome_escola.localeCompare(b.nome_escola, "pt-BR")
    )

    setEscolas(enriched)
    setFiltrado(enriched)

  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {

    let f = escolas.filter((e) =>
      e.nome_escola?.toLowerCase().includes(busca.toLowerCase())
    )

    if (criticidadeFiltro !== "todas") {
      f = f.filter((e) => e.criticidade === criticidadeFiltro)
    }

    setFiltrado(f)

  }, [busca, criticidadeFiltro, escolas])

  function badge(c: string) {
    if (c === "critica") return "bg-red-500/20 text-red-400"
    if (c === "atencao") return "bg-yellow-500/20 text-yellow-400"
    return "bg-green-500/20 text-green-400"
  }

  return (

    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">Unidades escolares</h1>
        <p className="text-slate-400 text-sm">
          Ranking de criticidade tecnológica
        </p>
      </div>

      <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4 flex gap-4">

        <input
          placeholder="Buscar escola..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-slate-800 rounded-xl px-4 py-2 w-full"
        />

        <select
          value={criticidadeFiltro}
          onChange={(e) => setCriticidadeFiltro(e.target.value)}
          className="bg-slate-800 rounded-xl px-4 py-2"
        >
          <option value="todas">Todas</option>
          <option value="critica">Críticas</option>
          <option value="atencao">Atenção</option>
          <option value="saudavel">Saudáveis</option>
        </select>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2 bg-[#020617] border border-slate-800 rounded-2xl h-[600px] overflow-hidden">
          <MapEscolas escolas={filtrado} selected={selected} onSelect={setSelected} />
        </div>

        <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4 overflow-auto h-[600px]">

          <div className="space-y-3">

            {filtrado.map((e) => (

              <div
                key={e.id}
                onClick={() => setSelected(e)}
                className="p-4 rounded-xl border bg-slate-900/40 border-slate-800 hover:bg-slate-800 cursor-pointer transition"
              >

                <div className="flex justify-between items-center">
                  <p className="font-semibold">{e.nome_escola}</p>
                  <span className={`px-2 py-1 rounded-lg text-xs ${badge(e.criticidade)}`}>
                    {e.criticidade}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{e.endereco}</p>

                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  <span>👨‍🎓 {e.total_alunos ?? 0}</span>
                  <span>💻 {e.total_equipamentos_funcionando ?? e.total_equipamentos_recebidos ?? 0}</span>
                  <span>📡 {e.aps_instalados ?? 0}</span>
                </div>

                <div className="text-xs text-blue-400 mt-1">
                  Score: {(e.score * 100).toFixed(0)}%
                </div>

                <Link
                  href={`/escolas/${e.id}`}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition shadow"
                >
                  Ver detalhes →
                </Link>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  )
}