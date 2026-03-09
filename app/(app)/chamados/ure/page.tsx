"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"

const prioridadeMap: Record<string, string> = {
  "Agendamento reunião Microsoft Teams": "alta",
  "Equipamentos para eventos": "critica",
  "Equipamento para uso externo (empréstimo)": "media",
  "Apoio técnico em eventos": "critica",
  "Publicação no site": "alta",
  "Manutenção de equipamentos": "media",
  "VPN": "media",
  "Instalação ou alteração de ramal": "baixa",
  "Manutenção ou instalação de ponto de rede": "media",
  "Liberação de perfil rede corporativa": "baixa",
  "Troca de toner ou manutenção impressora": "alta",
  "Criação de formulário": "media",
  "Criação de dashboards": "media",
  "Instalação de segundo monitor": "baixa",
  "Periféricos (câmera/fone/caixa de som)": "baixa",
  "Outras solicitações": "media",
}

const categoriasComAnexo = [
  "Publicação no site",
  "Manutenção ou instalação de ponto de rede",
  "Manutenção de equipamentos",
]

const templatesDescricao: Record<string,string> = {

"Agendamento reunião Microsoft Teams":
`- TÍTULO DA REUNIÃO:
- ENVIAR CONVITE PARA:
- PÚBLICO ALVO:
- DATA E HORA:
- DESEJA GRAVAÇÃO? (SIM/NÃO):
- DESABILTAR LOBBY? (SIM/NÃO):`,

"Liberação de perfil rede corporativa":
`- NOME COMPLETO:
- LOGIN (E-MAIL INSTITUCIONAL):
- PASTA DA REDE QUE DESEJA TER ACESSO:`,

"VPN":
`- NOME COMPLETO:
- LOGIN (E-MAIL INSTITUCIONAL):
- JUSTIFICATIVA PARA USO:`,

"Publicação no site":
`- TÍTULO DA PUBLICAÇÃO:
- TEXTO DA PUBLICAÇÃO:
- OBSERVAÇÃO:`,

"Equipamentos para eventos":
`- INFORMAR EQUIPAMENTO QUE DESEJA UTILIZAR:
- DESCREVER QUANTIDADE DE CADA EQUIPAMENTO
- LOCAL DO EVENTO
- DATA E HORA DO EVENTO
- DATA DE RETIRADA:
- DATA DE DEVOLUÇÃO:`
}

export default function ChamadoUREPage() {

  const supabase = createClient()

  const [form, setForm] = useState({
    titulo: "",
    nome: "",
    setor: "",
    solicitacao: "",
    descricao: "",
  })

  const [arquivos,setArquivos] = useState<File[]>([])

  // ⭐ NOVA FUNÇÃO DE EMAIL (NÃO REMOVE NADA)
  async function enviarEmailChamado(email:string,titulo:string){

    try{

      console.log("📧 Tentando enviar email para:", email)

      await fetch("/api/email/chamado",{

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          email,
          assunto:"Chamado aberto - SETEC HUB",
          mensagem:`Seu chamado foi aberto com sucesso.

Título: ${titulo}

Nossa equipe da SETEC irá analisar sua solicitação em breve.`

        })

      })

      console.log("📧 Requisição de email enviada")

    }catch(err){

      console.error("Erro ao enviar email",err)

    }

  }

  async function abrirChamado() {

    const { data:{session} } = await supabase.auth.getSession()

    if (!session?.user) {
      alert("Usuário não autenticado")
      return
    }

    const prioridade = prioridadeMap[form.solicitacao] || "media"

    const { data,error } = await supabase
      .from("chamados")
      .insert({
        titulo: form.titulo,
        solicitante_nome: form.nome,
        setor: form.setor,
        categoria: form.solicitacao,
        descricao: form.descricao,
        tipo: "ure",
        origem: "ure",
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

    // ⭐ ENVIO DE EMAIL AUTOMÁTICO (ADICIONADO SEM QUEBRAR NADA)
    if(session.user.email){

      console.log("📧 Chamando função de email")

      await enviarEmailChamado(session.user.email,form.titulo)

    }

    alert("Chamado aberto 🚀")

    setForm({
      titulo: "",
      nome: "",
      setor: "",
      solicitacao: "",
      descricao: "",
    })

    setArquivos([])

  }

  return (
    <div className="w-full flex justify-center">

      <div className="w-full max-w-2xl space-y-6">

        <h1 className="text-3xl font-bold text-white text-center">
          Abra um chamado com a SETEC - Visão URE
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
            placeholder="Setor"
            value={form.setor}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e) => setForm({ ...form, setor: e.target.value })}
          />

          <select
            value={form.solicitacao}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white"
            onChange={(e) => {

              const categoria = e.target.value

              setForm({
                ...form,
                solicitacao: categoria,
                descricao: templatesDescricao[categoria] ?? ""
              })

            }}
          >

            <option value="">Selecione uma solicitação</option>
            <option>Agendamento reunião Microsoft Teams</option>
            <option>Equipamentos para eventos</option>
            <option>Equipamento para uso externo (empréstimo)</option>
            <option>Apoio técnico em eventos</option>
            <option>Publicação no site</option>
            <option>Manutenção de equipamentos</option>
            <option>VPN</option>
            <option>Instalação ou alteração de ramal</option>
            <option>Manutenção ou instalação de ponto de rede</option>
            <option>Liberação de perfil rede corporativa</option>
            <option>Troca de toner ou manutenção impressora</option>
            <option>Criação de formulário</option>
            <option>Criação de dashboards</option>
            <option>Instalação de segundo monitor</option>
            <option>Periféricos (câmera/fone/caixa de som)</option>
            <option>Outras solicitações</option>

          </select>

          {categoriasComAnexo.includes(form.solicitacao) && (

            <div className="bg-[#0B1120] border border-slate-700 rounded-xl p-4 space-y-2">

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
                file:bg-blue-500/20 file:text-blue-400
                hover:file:bg-blue-500/30"
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition"
          >
            Abrir chamado
          </button>

        </div>
      </div>
    </div>
  )
}