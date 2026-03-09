"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"

const prioridadeMap: Record<string, string> = {
  "Solicitação para agendamento de visita - Técnico de Campo (FIELD)": "critica",
  "Solicitação para publicação no site": "media",
  "Solicitação para validação de segundo link (SDWAN)": "critica",
  "Solicitação para queda de link Intragov": "critica",
  "Solicitação para instalação de AP's - ACCESS POINTS MERAKI": "baixa",
  "Solicitação para instalação de pontos lógicos": "baixa",
  "Solicitação para espelhamento de DVRs (câmeras)": "alta",
  "Solicitação para suporte a sistemas": "media",
  "Solicitação para perfil PORTALNET": "baixa",
  "Outras solicitações": "media",
}

const categoriasComAnexo = [
  "Solicitação para publicação no site",
  "Solicitação para instalação de AP's - ACCESS POINTS MERAKI",
  "Solicitação para instalação de pontos lógicos",
  "Solicitação para validação de segundo link (SDWAN)",
]

const templatesDescricao: Record<string,string> = {

"Solicitação para perfil PORTALNET":
`- ESCOLA:
- NOME COMPLETO:
- RG:
- CPF
- PERFIS QUE DESEJA TER ACESSO:
- OBSERVAÇÕES:`,

"Solicitação para instalação de pontos lógicos":
`- Quantidade de pontos necessários
- Quantidade de pontos elétricos (se houver necessidade para ligar os computadores):
- Localização dos pontos solicitados:
- Justificativa:
- Observações:`,

"Solicitação para instalação de AP's - ACCESS POINTS MERAKI":
`- Quantidade de APs:
- Local desejado para instalação:
- Local já possui infraestrutura de AP? Em caso positivo, favor anexar fotos da infra:
- Justificativa:
- Observações:`,

"Solicitação para validação de segundo link (SDWAN)":
`- OPERADORA CONTRATADA:
- VELOCIDADE CONTRATADA:
- WI-FI DESABILITADO? (SIM/NÃO):
- CONEXÃO COM O FIREWALL FORTINET REALIZADA NA PORTA WAN2? (SIM/NÃO):`,

"Solicitação para agendamento de visita - Técnico de Campo (FIELD)":
`- MOTIVO DA SOLICITAÇÃO:
- DATA DESEJADA:
- HORÁRIO DE PREFERÊNCIA:
- OBSERVAÇÕES:`,

"Solicitação para espelhamento de DVRs (câmeras)":
`- QUANTIDADE DE DVRs PARA ESPELHAR:
- DVR ESTÁ CONECTADO NA REDE INTRAGOV? (SIM/NÃO):
- IP ATUAL DO DVR (MENU - REDES - TCP/IP):
- OBSERVAÇÕES:`
}

export default function ChamadoEscolaPage() {

  const supabase = createClient()

  const [form, setForm] = useState({
    titulo: "",
    nome: "",
    escola: "",
    solicitacao: "",
    subcategoria: "",
    descricao: "",
  })

  const [arquivos,setArquivos] = useState<File[]>([])

  async function abrirChamado() {

    const { data:{session} } = await supabase.auth.getSession()

    if (!session?.user) {
      alert("Usuário não autenticado")
      return
    }

    const prioridade = prioridadeMap[form.solicitacao] || "media"

    const { data, error } = await supabase
      .from("chamados")
      .insert({
        titulo: form.titulo,
        solicitante_nome: form.nome,
        escola: form.escola,
        categoria: form.solicitacao,
        subcategoria: form.subcategoria || null,
        descricao: form.descricao,
        tipo: "escola",
        origem: "escola",
        prioridade,
        status: "aberto",
        usuario_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    if(data && arquivos.length > 0){

      for(const file of arquivos){

        const path = `${data.id}/${Date.now()}_${file.name}`

        const { error:uploadError } =
        await supabase.storage
        .from("chamados-anexos")
        .upload(path,file)

        if(uploadError) continue

        const { data:urlData } =
        supabase.storage
        .from("chamados-anexos")
        .getPublicUrl(path)

        await supabase.from("chamados_anexos").insert({
          chamado_id: data.id,
          url: urlData.publicUrl,
          nome_arquivo: file.name
        })

      }

    }

    window.location.href = `/chamados/${data.id}`

  }

  return (
    <div className="w-full flex justify-center">

      <div className="w-full max-w-2xl space-y-6">

        <h1 className="text-3xl font-bold text-white text-center">
          Abra um chamado com a SETEC — Visão Escola
        </h1>

        <div className="bg-[#020617] p-8 rounded-2xl border border-slate-800 space-y-4">

          <input
            placeholder="Título"
            value={form.titulo}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />

          <input
            placeholder="Nome do solicitante"
            value={form.nome}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />

          <input
            placeholder="Escola"
            value={form.escola}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e) => setForm({ ...form, escola: e.target.value })}
          />

          <select
            value={form.solicitacao}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e)=>{

              const categoria = e.target.value

              setForm({
                ...form,
                solicitacao: categoria,
                subcategoria: "",
                descricao: templatesDescricao[categoria] ?? ""
              })

            }}
          >

            <option value="">Selecione uma solicitação</option>
            <option>Solicitação para agendamento de visita - Técnico de Campo (FIELD)</option>
            <option>Solicitação para publicação no site</option>
            <option>Solicitação para validação de segundo link (SDWAN)</option>
            <option>Solicitação para queda de link Intragov</option>
            <option>Solicitação para instalação de AP's - ACCESS POINTS MERAKI</option>
            <option>Solicitação para instalação de pontos lógicos</option>
            <option>Solicitação para espelhamento de DVRs (câmeras)</option>
            <option>Solicitação para suporte a sistemas</option>
            <option>Solicitação para perfil PORTALNET</option>
            <option>Outras solicitações</option>

          </select>

          {categoriasComAnexo.includes(form.solicitacao) && (

            <div className="bg-[#0B1120] border border-slate-700 rounded-xl p-4 space-y-3">

              <p className="text-sm text-slate-300 flex items-center gap-2">
                📎 Anexar arquivos (máx 3 • até 5MB)
              </p>

              <input
                type="file"
                multiple
                className="block w-full text-sm text-slate-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-500/20 file:text-purple-300
                hover:file:bg-purple-500/30"
                onChange={(e)=>{

                  const files = Array.from(e.target.files || [])

                  if(files.length > 3){
                    alert("Máximo 3 arquivos")
                    return
                  }

                  for(const f of files){
                    if(f.size > 5 * 1024 * 1024){
                      alert("Arquivo maior que 5MB")
                      return
                    }
                  }

                  setArquivos(files)

                }}
              />

              {arquivos.length > 0 && (
                <div className="text-xs text-slate-400 space-y-1">
                  {arquivos.map((a,i)=>(
                    <p key={i}>📄 {a.name}</p>
                  ))}
                </div>
              )}

            </div>

          )}

          <textarea
            placeholder="Descrição"
            rows={5}
            value={form.descricao}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />

          <button
            onClick={abrirChamado}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
          >
            Abrir chamado
          </button>

        </div>
      </div>
    </div>
  )
}