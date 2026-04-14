"use client"

import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"

export default function InventarioForm({ equipamentos, salvarInventario }: any) {

  // LÓGICA 100% INTACTA
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

  // LÓGICA 100% INTACTA
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
            <div className="space-y-6"> {/* Espaçamento ajustado para separar cabeçalho dos inputs */}
              
              {/* 🚀 NOVO CABEÇALHO VISUAL: Imagem, Título e Ano */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-slate-800/60 pb-5">
                
                {/* Renderização da Imagem Padronizada */}
                {item.equipamentos_modelos.imagem_url ? (
                  <div className="w-24 h-24 shrink-0 bg-white rounded-2xl p-2 border border-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.equipamentos_modelos.imagem_url} 
                      alt={item.equipamentos_modelos.equipamento}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 shrink-0 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold text-center px-2">Sem<br/>Imagem</span>
                  </div>
                )}

                {/* Textos, Badge de Ano e Contador */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-white leading-tight">
                      {item.equipamentos_modelos.equipamento}
                    </h2>
                    {/* Badge do Ano de Recebimento */}
                    {item.equipamentos_modelos.ano_recebimento && (
                      <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] uppercase font-black px-2 py-1 rounded-md tracking-wider">
                        ANO DE RECEBIMENTO: {item.equipamentos_modelos.ano_recebimento}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-400 font-medium">
                    Quantidade recebida: <span className="text-white font-bold ml-1">{item.quantidade_recebida}</span>
                  </p>
                  
                  <p className="text-xs text-cyan-400 font-semibold contador bg-cyan-900/10 inline-block px-2 py-0.5 rounded border border-cyan-500/20">
                    Preenchido: 0 / {item.quantidade_recebida}
                  </p>
                </div>
              </div>

              {/* MODELO (Hidden original intocado) */}
              <input
                type="hidden"
                name={`modelo_${item.id}`}
                value={item.id}
              />

              {/* RECEBIDO (Hidden original intocado) */}
              <input
                type="hidden"
                name={`recebido_${item.id}`}
                value={item.quantidade_recebida}
              />

              {/* GRID DE INPUTS (Totalmente Intocado nas lógicas e names) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-green-400 font-medium mb-1 block">
                    Funcionando
                  </label>
                  <input
                    type="number"
                    name={`funcionando_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm text-yellow-400 font-medium mb-1 block">
                    Aguardando garantia
                  </label>
                  <input
                    type="number"
                    name={`garantia_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm text-red-400 font-medium mb-1 block">
                    Danificados (SEM USO)
                  </label>
                  <input
                    type="number"
                    name={`danificados_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 font-medium mb-1 block">
                    Não localizados
                  </label>
                  <input
                    type="number"
                    name={`nao_localizados_${item.id}`}
                    defaultValue={0}
                    onInput={(e)=>atualizarContador(e.currentTarget.closest("[data-recebido]") as HTMLElement)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-medium focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      ))}

      {/* RESPONSÁVEL E OBSERVAÇÕES */}
      <Card>
        <div className="space-y-6">
          
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              👤 Responsável pelo inventário
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="responsavel_nome"
                placeholder="Nome completo"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"
              />
              <input
                name="responsavel_cargo"
                placeholder="Cargo"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="space-y-2 border-t border-slate-800 pt-6">
             <h3 className="text-sm font-semibold text-slate-300">
               Observações Gerais (Opcional)
             </h3>
             <textarea
               name="observacao"
               placeholder="Relate aqui informações adicionais sobre os equipamentos (furtos, problemas crônicos, etc)..."
               rows={4}
               className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white resize-none outline-none focus:border-blue-500 transition-colors"
             />
          </div>

          <p className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5">⚠️</span> 
            <span>As informações declaradas neste inventário são de responsabilidade do servidor ou funcionário responsável pelo preenchimento.</span>
          </p>
        </div>
      </Card>

      <div className="pb-8">
        <Button type="submit" className="w-full md:w-auto py-3.5 px-8 text-base font-bold shadow-lg shadow-blue-500/20">
          Enviar Inventário Definitivo
        </Button>
      </div>

    </form>
  )
}