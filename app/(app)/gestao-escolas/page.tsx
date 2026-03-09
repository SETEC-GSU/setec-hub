"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function TabelaGestaoEscolas() {

  const supabase = createClient()

  const [escolas, setEscolas] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [creating, setCreating] = useState(false)

  const columns = [
    "nome_escola",
    "cie",
    "telefone",
    "endereco",
    "diretor",
    "tipo_ensino",
    "periodo",
    "email",
    "latitude",
    "longitude",
    "horario_abertura",
    "horario_fechamento",
    "total_alunos",
    "qtd_salas",
    "total_equipamentos_recebidos",
    "total_equipamentos_funcionando",
    "aps_instalados",
  ]

  async function carregar() {

    const { data } = await supabase
      .from("escolas")
      .select("*")
      .order("nome_escola")

    setEscolas(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  function iniciarEdicao(row: any) {
    setEditingId(row.id)
    setForm(row)
  }

  function iniciarCriacao() {

    const empty: any = {}
    columns.forEach(col => (empty[col] = ""))

    setForm(empty)
    setCreating(true)
  }

  async function salvar() {

    if (creating) {
      await supabase.from("escolas").insert(form)
      setCreating(false)
    } else {
      await supabase.from("escolas").update(form).eq("id", editingId)
      setEditingId(null)
    }

    carregar()
  }

  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Escolas</h1>
          <p className="text-slate-400 text-sm">
            Central de gestão de dados das Unidades Escolares - URE GSU
          </p>
        </div>

        <button
          onClick={iniciarCriacao}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm"
        >
          Nova escola
        </button>

      </div>

      <div className="bg-[#020617] border border-slate-800 rounded-2xl overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="border-b border-slate-800 text-slate-400 sticky top-0 bg-[#020617]">
              <tr>

                {columns.map(col => (
                  <th key={col} className="p-4 text-left whitespace-nowrap">
                    {col.replaceAll("_", " ")}
                  </th>
                ))}

                <th className="p-4">Ações</th>

              </tr>
            </thead>

            <tbody>

              {creating && (

                <tr className="border-b border-slate-800 bg-slate-900/40">

                  {columns.map(col => (

                    <td key={col} className="p-4">

                      <input
                        value={form[col] || ""}
                        onChange={e => setForm({ ...form, [col]: e.target.value })}
                        className="bg-slate-800 rounded-lg px-3 py-1 w-full"
                      />

                    </td>

                  ))}

                  <td className="p-4">

                    <button
                      onClick={salvar}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs"
                    >
                      Salvar
                    </button>

                  </td>

                </tr>

              )}

              {escolas.map(row => (

                <tr
                  key={row.id}
                  className="border-b border-slate-800 hover:bg-slate-900/40"
                >

                  {columns.map(col => (

                    <td key={col} className="p-4 whitespace-nowrap">

                      {editingId === row.id ? (

                        <input
                          value={form[col] || ""}
                          onChange={e => setForm({ ...form, [col]: e.target.value })}
                          className="bg-slate-800 rounded-lg px-3 py-1 w-full"
                        />

                      ) : col === "nome_escola" ? (

                        <Link
                          href={`/escolas/${row.id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                        >
                          {row[col]}
                        </Link>

                      ) : (

                        row[col] || "-"

                      )}

                    </td>

                  ))}

                  <td className="p-4 flex gap-2">

                    {editingId === row.id ? (

                      <button
                        onClick={salvar}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs"
                      >
                        Salvar
                      </button>

                    ) : (

                      <button
                        onClick={() => iniciarEdicao(row)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs"
                      >
                        Alterar
                      </button>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}