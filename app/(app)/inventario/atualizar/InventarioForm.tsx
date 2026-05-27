"use client"

import { useRef, useState } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"

type EquipamentoModelo = {
  equipamento?: string | null
  imagem_url?: string | null
  ano_recebimento?: number | null
}

type EquipamentoItem = {
  id: string
  quantidade_recebida: number | string | null
  equipamentos_modelos?: EquipamentoModelo | EquipamentoModelo[] | null
}

type InventarioFormProps = {
  equipamentos: EquipamentoItem[]
  salvarInventario: (formData: FormData) => Promise<void> | void
}

type SplashState = "enviando" | "sucesso" | null

function getModelo(item: EquipamentoItem): EquipamentoModelo | null {
  if (Array.isArray(item.equipamentos_modelos)) {
    return item.equipamentos_modelos[0] || null
  }

  return item.equipamentos_modelos || null
}

function numeroSeguro(value: unknown) {
  const numero = Number(value || 0)

  if (Number.isNaN(numero)) return 0

  return Math.max(0, Math.floor(numero))
}

function normalizarNumeroInput(input: HTMLInputElement) {
  if (input.value === "") return

  const max = Number(input.max || 0)
  let valor = Number(input.value)

  if (Number.isNaN(valor)) {
    input.value = "0"
    return
  }

  valor = Math.max(0, Math.floor(valor))

  if (max > 0) {
    valor = Math.min(valor, max)
  }

  input.value = String(valor)
}

export default function InventarioForm({
  equipamentos,
  salvarInventario,
}: InventarioFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const envioBloqueadoRef = useRef(false)

  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [splash, setSplash] = useState<SplashState>(null)

  function atualizarContador(card: HTMLElement | null) {
    if (!card) return

    const recebido = numeroSeguro(card.getAttribute("data-recebido"))
    const inputs = card.querySelectorAll<HTMLInputElement>("input[type='number']")

    let soma = 0

    inputs.forEach((input) => {
      soma += numeroSeguro(input.value)
    })

    const contador = card.querySelector(".contador") as HTMLElement | null

    if (!contador) return

    contador.textContent = `Preenchido: ${soma} / ${recebido}`

    contador.classList.remove(
      "text-cyan-400",
      "border-cyan-500/20",
      "bg-cyan-900/10",
      "text-green-400",
      "border-green-500/30",
      "bg-green-900/10",
      "text-red-400",
      "border-red-500/30",
      "bg-red-900/10"
    )

    if (soma === recebido) {
      contador.classList.add(
        "text-green-400",
        "border-green-500/30",
        "bg-green-900/10"
      )
    } else if (soma > recebido) {
      contador.classList.add(
        "text-red-400",
        "border-red-500/30",
        "bg-red-900/10"
      )
    } else {
      contador.classList.add(
        "text-cyan-400",
        "border-cyan-500/20",
        "bg-cyan-900/10"
      )
    }
  }

  function validarInventario() {
    setMensagemErro(null)

    const cards =
      formRef.current?.querySelectorAll<HTMLElement>("[data-recebido]") || []

    for (const card of Array.from(cards)) {
      const recebido = numeroSeguro(card.getAttribute("data-recebido"))
      const nomeEquipamento =
        card.getAttribute("data-equipamento") || "equipamento informado"

      const inputs = card.querySelectorAll<HTMLInputElement>("input[type='number']")

      let soma = 0

      inputs.forEach((input) => {
        input.classList.remove("border-red-500", "ring-1", "ring-red-500")

        normalizarNumeroInput(input)

        soma += numeroSeguro(input.value)
      })

      atualizarContador(card)

      if (soma !== recebido) {
        inputs.forEach((input) => {
          input.classList.add("border-red-500", "ring-1", "ring-red-500")
        })

        const mensagem = `Inventário incorreto no item "${nomeEquipamento}". A soma dos campos deve ser igual à quantidade recebida (${recebido}). Atualmente foi preenchido ${soma}.`

        setMensagemErro(mensagem)

        card.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })

        return false
      }
    }

    return true
  }

  async function enviarInventario(formData: FormData) {
    if (envioBloqueadoRef.current) return

    const valido = validarInventario()

    if (!valido) return

    envioBloqueadoRef.current = true
    setSplash("enviando")

    try {
      await salvarInventario(formData)

      setMensagemErro(null)
      setSplash("sucesso")
    } catch (error) {
      console.error("[Inventário] Erro ao enviar inventário:", error)

      envioBloqueadoRef.current = false
      setSplash(null)

      setMensagemErro(
        "Não foi possível enviar o inventário. Verifique a conexão e tente novamente."
      )
    }
  }

  function voltarParaInventario() {
    window.location.href = "/inventario"
  }

  return (
    <>
      {splash && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-700 bg-[#020617] p-6 text-center shadow-2xl">
            {splash === "enviando" ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-white">
                  Enviando inventário
                </h2>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  Aguarde enquanto as informações são registradas no SETEC Hub.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 text-3xl">
                  ✅
                </div>

                <h2 className="mt-5 text-2xl font-black text-white">
                  Inventário enviado
                </h2>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  As informações foram registradas com sucesso.
                </p>

                <button
                  type="button"
                  onClick={voltarParaInventario}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                >
                  Voltar para o inventário
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <form ref={formRef} action={enviarInventario} className="space-y-6">
        {mensagemErro && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
            {mensagemErro}
          </div>
        )}

        {equipamentos.map((item) => {
          const modelo = getModelo(item)
          const nomeEquipamento =
            modelo?.equipamento || "Equipamento não identificado"
          const imagemUrl = modelo?.imagem_url || ""
          const anoRecebimento = modelo?.ano_recebimento || null
          const quantidadeRecebida = numeroSeguro(item.quantidade_recebida)

          return (
            <div
              key={item.id}
              data-recebido={quantidadeRecebida}
              data-equipamento={nomeEquipamento}
            >
              <Card>
                <div className="space-y-6">
                  <div className="flex flex-col items-start gap-5 border-b border-slate-800/60 pb-5 sm:flex-row sm:items-center">
                    {imagemUrl ? (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-inner">
                        <img
                          src={imagemUrl}
                          alt={nomeEquipamento}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50">
                        <span className="px-2 text-center text-[10px] font-bold uppercase text-slate-500">
                          Sem
                          <br />
                          Imagem
                        </span>
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold leading-tight text-white">
                          {nomeEquipamento}
                        </h2>

                        {anoRecebimento && (
                          <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-400">
                            ANO DE RECEBIMENTO: {anoRecebimento}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-400">
                        Quantidade recebida:{" "}
                        <span className="ml-1 font-bold text-white">
                          {quantidadeRecebida}
                        </span>
                      </p>

                      <p className="contador inline-block rounded border border-cyan-500/20 bg-cyan-900/10 px-2 py-0.5 text-xs font-semibold text-cyan-400">
                        Preenchido: 0 / {quantidadeRecebida}
                      </p>
                    </div>
                  </div>

                  <input
                    type="hidden"
                    name={`modelo_${item.id}`}
                    value={item.id}
                  />

                  <input
                    type="hidden"
                    name={`recebido_${item.id}`}
                    value={quantidadeRecebida}
                  />

                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <CampoNumero
                      label="Funcionando"
                      name={`funcionando_${item.id}`}
                      color="text-green-400"
                      max={quantidadeRecebida}
                      onChange={(input) =>
                        atualizarContador(
                          input.closest("[data-recebido]") as HTMLElement
                        )
                      }
                    />

                    <CampoNumero
                      label="Aguardando garantia"
                      name={`garantia_${item.id}`}
                      color="text-yellow-400"
                      max={quantidadeRecebida}
                      onChange={(input) =>
                        atualizarContador(
                          input.closest("[data-recebido]") as HTMLElement
                        )
                      }
                    />

                    <CampoNumero
                      label="Danificados (SEM USO)"
                      name={`danificados_${item.id}`}
                      color="text-red-400"
                      max={quantidadeRecebida}
                      onChange={(input) =>
                        atualizarContador(
                          input.closest("[data-recebido]") as HTMLElement
                        )
                      }
                    />

                    <CampoNumero
                      label="Não localizados"
                      name={`nao_localizados_${item.id}`}
                      color="text-slate-400"
                      max={quantidadeRecebida}
                      onChange={(input) =>
                        atualizarContador(
                          input.closest("[data-recebido]") as HTMLElement
                        )
                      }
                    />
                  </div>
                </div>
              </Card>
            </div>
          )
        })}

        <Card>
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                👤 Responsável pelo inventário
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  name="responsavel_nome"
                  placeholder="Nome completo"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none transition-colors focus:border-blue-500"
                />

                <input
                  name="responsavel_cargo"
                  placeholder="Cargo"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white outline-none transition-colors focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-6">
              <h3 className="text-sm font-semibold text-slate-300">
                Observações Gerais (Opcional)
              </h3>

              <textarea
                name="observacao"
                placeholder="Relate aqui informações adicionais sobre os equipamentos (furtos, problemas crônicos, etc)..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-white outline-none transition-colors focus:border-blue-500"
              />
            </div>

            <p className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
              <span className="mt-0.5 text-yellow-500">⚠️</span>
              <span>
                As informações declaradas neste inventário são de
                responsabilidade do servidor ou funcionário responsável pelo
                preenchimento.
              </span>
            </p>
          </div>
        </Card>

        <div className="pb-8">
          <Button
            type="submit"
            className="w-full px-8 py-3.5 text-base font-bold shadow-lg shadow-blue-500/20 md:w-auto"
          >
            {splash === "enviando"
              ? "Enviando..."
              : "Enviar Inventário Definitivo"}
          </Button>
        </div>
      </form>
    </>
  )
}

function CampoNumero({
  label,
  name,
  color,
  max,
  onChange,
}: {
  label: string
  name: string
  color: string
  max: number
  onChange: (input: HTMLInputElement) => void
}) {
  return (
    <div>
      <label className={`mb-1 block text-sm font-medium ${color}`}>
        {label}
      </label>

      <input
        type="number"
        name={name}
        defaultValue={0}
        min={0}
        max={max}
        step={1}
        inputMode="numeric"
        onInput={(event) => {
          normalizarNumeroInput(event.currentTarget)
          onChange(event.currentTarget)
        }}
        className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 font-medium text-white outline-none transition-colors focus:border-blue-500"
      />
    </div>
  )
}