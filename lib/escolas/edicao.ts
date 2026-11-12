export const CAMPOS_ESCOLA = [
  { id:"diretor", label:"Diretor(a)", tipo:"text", max:180 },
  { id:"telefone", label:"Telefone", tipo:"tel", max:120 },
  { id:"email", label:"E-mail da escola", tipo:"text", max:250 },
  { id:"endereco", label:"Endereço", tipo:"text", max:500 },
  { id:"tipo_ensino", label:"Tipo de ensino", tipo:"text", max:180 },
  { id:"periodo", label:"Período", tipo:"text", max:180 },
  { id:"horario_abertura", label:"Horário de abertura", tipo:"time", max:8 },
  { id:"horario_fechamento", label:"Horário de fechamento", tipo:"time", max:8 },
  { id:"latitude", label:"Latitude", tipo:"coordenada", max:30 },
  { id:"longitude", label:"Longitude", tipo:"coordenada", max:30 },
  { id:"total_alunos", label:"Total de alunos", tipo:"number", max:7 },
  { id:"qtd_salas", label:"Salas", tipo:"number", max:7 },
  { id:"aps_instalados", label:"APs instalados", tipo:"number", max:7 },
  { id:"status_conectividade", label:"Conectividade", tipo:"text", max:180 },
  { id:"observacoes", label:"Observações da escola", tipo:"textarea", max:10000 },
] as const
export const ROTULOS_ESCOLA: Record<string,string> = {nome_escola:"Nome da escola",cie:"CIE",...Object.fromEntries(CAMPOS_ESCOLA.map(c=>[c.id,c.label]))}
export function validarAlteracoesEscola(p: unknown) {
  if(!p||typeof p!=="object"||Array.isArray(p))throw new Error("Os dados da escola são inválidos.")
  const saida: Record<string,string|number|null>={}
  for(const [id,valor]of Object.entries(p)){
    const campo=CAMPOS_ESCOLA.find(c=>c.id===id)
    if(!campo)throw new Error("Há um campo que não pode ser alterado nesta tela.")
    if(valor!==null&&typeof valor!=="string"&&typeof valor!=="number")throw new Error(`Confira ${campo.label}.`)
    const v=String(valor??"").trim()
    if(v.length>campo.max)throw new Error(`${campo.label}: limite de ${campo.max} caracteres.`)
    if(!v){saida[id]=null;continue}
    if(campo.tipo==="number"||campo.tipo==="coordenada"){
      const n=Number(v.replace(",","."))
      if(!Number.isFinite(n)||(campo.tipo==="number"&&(!Number.isSafeInteger(n)||n<0||n>1000000)))throw new Error(`Confira ${campo.label}.`)
      if(id==="latitude"&&Math.abs(n)>85.05112878||id==="longitude"&&Math.abs(n)>180)throw new Error(`Confira ${campo.label}.`)
      saida[id]=n
    }else{
      if(campo.tipo==="time"&&!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v))throw new Error(`Confira ${campo.label}.`)
      if(id==="email"&&!v.split(/[,;]/).map(x=>x.trim()).filter(Boolean).every(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))throw new Error("Confira o e-mail da escola.")
      saida[id]=v
    }
  }
  if(!Object.keys(saida).length)throw new Error("Nenhuma alteração para salvar.")
  return saida
}
export type AlteracaoEscola = { id: string; created_at: string; usuario_id: string|null; usuario_nome: string; usuario_role: string; alteracoes: Record<string,{antes:unknown;depois:unknown}> }
