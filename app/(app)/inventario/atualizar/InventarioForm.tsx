"use client"

import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"

export default function InventarioForm({ equipamentos, salvarInventario }: any) {

  function atualizarContador(card: HTMLElement | null){

    if(!card) return

    const recebido = Number(card.getAttribute("data-recebido"))

    const inputs = card.querySelectorAll("input[type='number']")

    let soma = 0

    inputs.forEach((i:any)=>{
      soma += Number(i.value || 0)
    })

    const contador = card.querySelector(".contador") as HTMLElement | null

    if(contador){
      contador.textContent = `Preenchido: ${soma} / ${recebido}`
    }

  }

  function validarInventario(e:any){

    const cards = document.querySelectorAll("[data-recebido]")

    for(const card of cards){

      const recebido = Number(card.getAttribute("data-recebido"))

      const inputs = card.querySelectorAll("input[type='number']")

      let soma = 0

      inputs.forEach((i:any)=>{

        i.classList.remove("border-red-500")

        soma += Number(i.value || 0)

      })

      if(soma !== recebido){

        e.preventDefault()

        inputs.forEach((i:any)=>{
          i.classList.add("border-red-500")
        })

        alert(
          "Inventário incorreto. A soma dos campos deve ser igual à quantidade recebida."
        )

        return false
      }

    }

    return true
  }

  return (

    <form
      action={salvarInventario}
      className="space-y-6"
      onSubmit={validarInventario}
    >

      {equipamentos?.map((item:any) => (

        <div
          key={item.id}
          data-recebido={item.quantidade_recebida}
        >

          <Card>

            <div className="space-y-4">

              <div>

                <h2 className="text-lg font-semibold text-white">
                  {item.equipamentos_modelos.equipamento}
                </h2>

                <p className="text-sm text-slate-400">
                  Quantidade recebida: {item.quantidade_recebida}
                </p>

                <p className="text-xs text-cyan-400 contador">
                  Preenchido: 0 / {item.quantidade_recebida}
                </p>

              </div>

              {/* MODELO */}
              <input
                type="hidden"
                name={`modelo_${item.id}`}
                value={item.id}
              />

              {/* RECEBIDO */}
              <input
                type="hidden"
                name={`recebido_${item.id}`}
                value={item.quantidade_recebida}
              />

              <div className="grid grid-cols-4 gap-4">

                <div>

                  <label className="text-sm text-slate-400">
                    Funcionando
                  </label>

                  <input
                    type="number"
                    name={`funcionando_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />

                </div>

                <div>

                  <label className="text-sm text-slate-400">
                    Aguardando garantia
                  </label>

                  <input
                    type="number"
                    name={`garantia_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />

                </div>

                <div>

                  <label className="text-sm text-slate-400">
                    Danificados
                  </label>

                  <input
                    type="number"
                    name={`danificados_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />

                </div>

                <div>

                  <label className="text-sm text-slate-400">
                    Não localizados
                  </label>

                  <input
                    type="number"
                    name={`nao_localizados_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                  />

                </div>

              </div>

            </div>

          </Card>

        </div>

      ))}

      {/* RESPONSÁVEL */}

      <Card>

        <div className="space-y-4">

          <h2 className="text-lg font-semibold">
            Responsável pelo inventário
          </h2>

          <input
            name="responsavel_nome"
            placeholder="Nome completo"
            required
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white"
          />

          <input
            name="responsavel_cargo"
            placeholder="Cargo"
            required
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white"
          />

          <p className="text-xs text-slate-400">
            As informações declaradas neste inventário são de responsabilidade
            do servidor responsável pelo preenchimento.
          </p>

        </div>

      </Card>

      <Button type="submit">
        Enviar Inventário
      </Button>

    </form>

  )
}