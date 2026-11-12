"use client"

import { useId, useRef, useState, type DragEvent } from "react"
import { FileImage, FileText, Paperclip, Plus, Trash2, UploadCloud } from "lucide-react"
import { adicionarArquivos, MAX_ARQUIVOS, tamanhoArquivo } from "@/lib/chamados/anexos"

export default function AnexosChamado({ arquivos, alterar, disabled = false }: {
  arquivos: File[]
  alterar: (arquivos: File[]) => void
  disabled?: boolean
}) {
  const id = useId(), entrada = useRef<HTMLInputElement>(null), arrastos = useRef(0)
  const [arrastando, setArrastando] = useState(false), [erro, setErro] = useState("")
  function adicionar(novos: File[]) {
    if (disabled || !novos.length) return
    const resultado = adicionarArquivos(arquivos, novos)
    if (!resultado.ok) { setErro(resultado.erro); return }
    setErro(""); alterar(resultado.arquivos)
  }
  function entrar(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (disabled || !event.dataTransfer.types.includes("Files")) return
    arrastos.current++; setArrastando(true)
  }
  function sair(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); arrastos.current = Math.max(0, arrastos.current - 1)
    if (!arrastos.current) setArrastando(false)
  }
  function soltar(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); arrastos.current = 0; setArrastando(false)
    if (!disabled) adicionar(Array.from(event.dataTransfer.files))
  }
  const completo = arquivos.length >= MAX_ARQUIVOS
  return <section aria-labelledby={`${id}-titulo`} data-anexos-chamado className="min-w-0">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Paperclip size={17} aria-hidden="true"/>Anexos <span className="font-normal text-slate-400">(opcional)</span></h2>
      <span aria-live="polite" className="shrink-0 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{arquivos.length}/{MAX_ARQUIVOS}</span>
    </div>
    <div onDragEnter={entrar} onDragOver={event => event.preventDefault()} onDragLeave={sair} onDrop={soltar}
      className={`min-w-0 rounded-2xl border-2 border-dashed p-4 transition sm:p-5 ${arrastando && !disabled ? "border-cyan-300 bg-cyan-500/15 ring-2 ring-cyan-400/20" : "border-blue-400/30 bg-blue-500/5"} ${disabled ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-300"><UploadCloud size={26} aria-hidden="true"/></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-100">{arrastando ? "Solte os arquivos aqui" : "Fotos, documentos ou capturas de tela"}</p>
          <p id={`${id}-ajuda`} className="mt-1 text-xs leading-relaxed text-slate-400">Até {MAX_ARQUIVOS} arquivos, com 5 MB por arquivo.<span className="hidden sm:block">Você também pode arrastar os arquivos para esta área.</span></p>
        </div>
        <button type="button" disabled={disabled || completo} aria-controls={`${id}-arquivo`} aria-describedby={`${id}-ajuda`} onClick={() => entrada.current?.click()}
          className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-950/30 transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 sm:w-auto">
          <Plus size={18} aria-hidden="true"/>{completo ? "Limite de 3 arquivos" : arquivos.length ? "Adicionar mais" : "Anexar arquivos"}
        </button>
      </div>
      <input ref={entrada} id={`${id}-arquivo`} aria-label="Adicionar anexos" type="file" multiple disabled={disabled || completo} className="hidden"
        onChange={event => { adicionar(Array.from(event.target.files || [])); event.target.value = "" }}/>
    </div>
    {erro && <p role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{erro}</p>}
    {arquivos.length > 0 && <ul aria-label="Arquivos selecionados" className="mt-3 space-y-2">
      {arquivos.map((arquivo, index) => <li key={`${arquivo.name}:${arquivo.lastModified}:${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/45 px-3 py-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">{arquivo.type.startsWith("image/") ? <FileImage size={20} aria-hidden="true"/> : <FileText size={20} aria-hidden="true"/>}</span>
        <div className="min-w-0 flex-1"><p title={arquivo.name} className="truncate text-sm font-medium text-slate-200">{arquivo.name}</p><p className="mt-0.5 text-xs text-slate-400">{tamanhoArquivo(arquivo.size)} · Selecionado</p></div>
        <button type="button" disabled={disabled} aria-label={`Remover ${arquivo.name}`} title={`Remover ${arquivo.name}`} onClick={() => { if (!disabled) { setErro(""); alterar(arquivos.filter((_, i) => i !== index)) } }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40"><Trash2 size={18} aria-hidden="true"/></button>
      </li>)}
    </ul>}
    {completo && <p className="mt-2 text-xs text-slate-400">Remova um arquivo se precisar selecionar outro.</p>}
  </section>
}
