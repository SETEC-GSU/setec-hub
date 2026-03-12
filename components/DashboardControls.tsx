"use client"

import { useState } from "react"
import html2pdf from "html2pdf.js"

export default function DashboardControls(){

const [exporting,setExporting] = useState(false)

const handleExportPDF = async () => {

try{

setExporting(true)

const element = document.getElementById("dashboard-print")

if(!element){
alert("Área do relatório não encontrada")
return
}

/* CLONAR DASHBOARD PARA EVITAR BUGS CSS */

const clone = element.cloneNode(true) as HTMLElement

clone.style.background = "white"
clone.style.color = "black"
clone.style.padding = "20px"
clone.style.width = "1200px"

/* remover filtros e blur que quebram html2canvas */

clone.querySelectorAll("*").forEach((el:any)=>{
el.style.backdropFilter = "none"
el.style.filter = "none"
})

document.body.appendChild(clone)

const opt = {

margin: 5,

filename:`Relatorio_SETEC_${new Date().toLocaleDateString()}.pdf`,

image:{ type:"jpeg", quality:1 },

html2canvas:{
scale:2,
useCORS:true
},

jsPDF:{
unit:"mm",
format:"a4",
orientation:"landscape"
}

}

await (html2pdf as any)().set(opt).from(clone).save()

document.body.removeChild(clone)

}catch(e){

console.error(e)
alert("Erro ao gerar PDF")

}finally{

setExporting(false)

}

}

return(

<button
onClick={handleExportPDF}
className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm"
>

{exporting ? "Gerando..." : "Exportar PDF"}

</button>

)

}